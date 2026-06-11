# Глава 06. Ingress: Traefik vs Nginx vs Routing mesh, и TLS

> Тег шага: `step-06` · Часть 1 (single-node)

## Цель

Поставить единую точку входа (ingress) перед репликами приложения и завершать
TLS (self-signed) на ней. По пути — разобраться в двух вопросах выбора:
зачем вообще L7-прокси, если у Swarm есть routing mesh, и почему в этом курсе
ingress'ом будет **Traefik**, а не классический **Nginx**.

## Routing mesh (L4) против L7-прокси

- **Routing mesh Swarm** (главы 03–04) — это L4: публикуешь порт, и соединения
  раскидываются по репликам. Просто, но без маршрутизации по хостам/путям, без TLS,
  без middleware.
- **L7-обратный прокси** (Traefik, Nginx) — маршрутизация по `Host`/пути,
  terminate TLS, редиректы, middleware. Для реальных приложений ingress обычно нужен.

Поэтому начиная с этого шага мы **перестаём публиковать порт приложения напрямую**
и пускаем весь трафик через ingress.

## Nginx vs Traefik: что выбрать для Swarm

Оба — зрелые L7-прокси, и оба умеют закрыть нашу задачу. Разница — в том,
**откуда берётся конфигурация** и насколько она дружит с динамикой кластера.

|                            | Nginx                                              | Traefik                                              |
|----------------------------|----------------------------------------------------|------------------------------------------------------|
| Конфигурация               | статический `nginx.conf`, reload при изменениях    | динамическая: читает Swarm API, метки сервисов       |
| Обнаружение сервисов       | нет; вручную / docker-gen / DNS-имена Swarm        | встроенное: новый сервис с метками виден сам         |
| Реакция на scale/redeploy  | нужен reload или DNS-resolver с TTL                | автоматическая                                       |
| TLS / Let's Encrypt        | отдельно (certbot + автоматизация руками)          | встроенный ACME                                      |
| Производительность         | эталонная: статика, кэш, тонкий тюнинг             | ниже в синтетике; для типового API некритично        |
| Гибкость / экосистема      | максимальная (кэширование, rate limit, Lua/njs)    | middleware из коробки, но настраиваемого меньше      |
| Цена удобства              | руки + обвязка вокруг конфига                      | доступ к docker socket, обязан жить на manager-ноде  |
| Дашборд / observability    | нет из коробки (stub_status, сторонние экспортеры) | дашборд и метрики из коробки                         |

Ключевая боль Nginx именно в Swarm — **динамика**. Реплики приходят и уходят,
сервисы передеплоиваются, а `nginx.conf` об этом не знает. Рабочие обходы есть,
но каждый — компромисс:

```nginx
# Вариант "Nginx в Swarm" через встроенный DNS Docker (127.0.0.11):
# tasks.<service> резолвится в IP всех реплик.
server {
    listen 443 ssl;
    resolver 127.0.0.11 valid=10s;     # без resolver nginx закэширует IP на старте
    set $upstream http://tasks.api:3000; # имя в переменной => резолв на каждый запрос
    location / {
        proxy_pass $upstream;
    }
}
```

Это работает, но: балансировку делает DNS (без health-aware логики), переменная в
`proxy_pass` отключает часть оптимизаций, а TLS-сертификаты всё ещё надо
выпускать и подкладывать самому. Альтернатива — генерировать конфиг из событий
Docker (docker-gen, nginx-proxy) и делать reload, то есть собирать руками то,
что в Traefik уже встроено.

**Когда Nginx — правильный выбор:** конфигурация стабильна (фиксированный набор
upstream'ов), нужны его сильные стороны — отдача статики, кэширование ответов,
тонкий rate limiting, выжимание максимума RPS — или он уже стоит на краю
инфраструктуры и Swarm живёт за ним.

**Когда Traefik:** сервисы в кластере появляются/масштабируются динамически, и
ты хочешь, чтобы прокси узнавал об этом сам, плюс TLS без ручной обвязки.

Для учебного кластера, где мы будем постоянно скейлить и передеплоивать сервисы,
выбор очевиден — **Traefik**. Дальше — как он устроен.

## Как Traefik находит сервис

В Swarm Traefik читает сервисы через Swarm API (docker socket) и конфигурируется
**метками сервиса**. В Swarm-режиме метки живут в `deploy.labels`:

```yaml
api:
  deploy:
    labels:
      - traefik.enable=true
      - traefik.http.routers.api.rule=Host(`localhost`)
      - traefik.http.routers.api.entrypoints=websecure
      - traefik.http.routers.api.tls=true
      - traefik.http.services.api.loadbalancer.server.port=3000
```

Сравни с Nginx-подходом выше: вместо правки конфига прокси мы описываем
маршрутизацию **рядом с самим сервисом**, и прокси подхватывает её сам.

## Сам Traefik

Конфигурируем флагами `command:` (без отдельного статического файла):

```yaml
command:
  - --providers.swarm=true
  - --providers.swarm.network=part1_appnet
  - --providers.file.directory=/etc/traefik/dynamic   # TLS-конфиг
  - --entrypoints.web.address=:80
  - --entrypoints.web.http.redirections.entryPoint.to=websecure  # 80 -> 443
  - --entrypoints.websecure.address=:443
  - --api.dashboard=true
  - --api.insecure=true        # дашборд :8080 — только для обучения
```

- Монтируем docker socket (только чтение) — иначе Traefik не увидит сервисы.
  Это и есть «цена удобства» из таблицы: у прокси появляется доступ к Docker API,
  поэтому socket — строго `:ro`, а в проде ещё и socket-proxy.
- `placement.constraints: node.role == manager` — Traefik читает Swarm API, это
  умеет только менеджер.

## TLS через Swarm configs/secrets

Вместо bind-mount (ненадёжного в Swarm) подаём cert/ключ как **Swarm config/secret** —
docker CLI читает файлы при деплое и рассылает их в кластер:

```yaml
configs:
  traefik_dynamic: { file: ../traefik/dynamic/tls.yml }
  traefik_cert:    { file: ../traefik/certs/local.crt }
secrets:
  traefik_key:     { file: ../traefik/certs/local.key }
```

`tls.yml` указывает Traefik на `/certs/local.crt` и `/certs/local.key`. Это уже
маленький шаг к Части 2: ключ — это **secret**, а не bind-mount файла.

## Проверка

```bash
# 1) Сгенерировать self-signed сертификат (один раз)
bash deploy/traefik/certs/generate-cert.sh

# 2) Собрать образ и задеплоить
docker build -t swarm-demo-api:dev .
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part1.yml part1

# 3) Через Traefik по HTTPS (флаг -k — игнорировать self-signed):
curl -ks https://localhost/         # {"hostname":"...","version":"1.0.0"}
curl -ks https://localhost/counter  # балансировка + общий счётчик
curl -s  http://localhost/ -I       # 301/308 редирект на https
# Дашборд Traefik: http://localhost:8080/dashboard/
```

## Best practices и анти-паттерны

- ✅ **Единый ingress** (Traefik) вместо прямой публикации каждого сервиса.
- ✅ **Выбор прокси — от динамики**: статичная топология — Nginx, динамический
   кластер — Traefik; «по привычке» — не аргумент ни в одну сторону.
- ✅ **TLS на ingress**, приложение остаётся на HTTP внутри сети.
- ✅ **Ключ как secret**, не bind-mount.
- ✅ **docker socket — только на чтение** (`:ro`).
- ✅ **Traefik на менеджере** (placement) — требование Swarm-провайдера.
- ❌ **Не** оставляй `--api.insecure=true` и дашборд `:8080` в проде — это только
   для обучения; в проде дашборд закрывают аутентификацией и TLS.
- ❌ **Не** используй self-signed в проде — там Let's Encrypt/корпоративный CA.
- ❌ **Не** тащи Nginx в динамический Swarm без docker-gen/resolver-обвязки —
   получишь прокси, который молча шлёт трафик на мёртвые IP после redeploy.

## Дальше

[Глава 07](07-healthcheck-rolling-update.md): healthcheck, restart policy и
обновление без даунтайма с автоматическим откатом.
