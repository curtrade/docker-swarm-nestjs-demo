# Глава 06. Traefik: ingress и TLS

> Тег шага: `step-06` · Часть 1 (single-node)

## Цель

Поставить **Traefik** как точку входа (ingress) перед репликами приложения и
завершать TLS (self-signed) на нём. Заодно — понять разницу между встроенным
routing mesh и L7-маршрутизатором.

## Routing mesh (L4) против Traefik (L7)

- **Routing mesh Swarm** (главы 03–04) — это L4: публикуешь порт, и соединения
  раскидываются по репликам. Просто, но без маршрутизации по хостам/путям, без TLS,
  без middleware.
- **Traefik** — L7-обратный прокси: маршрутизация по `Host`/пути, terminate TLS,
  редиректы, middleware, дашборд. Для реальных приложений ingress обычно нужен.

Поэтому начиная с этого шага мы **перестаём публиковать порт приложения напрямую**
и пускаем весь трафик через Traefik.

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
- ✅ **TLS на ingress**, приложение остаётся на HTTP внутри сети.
- ✅ **Ключ как secret**, не bind-mount.
- ✅ **docker socket — только на чтение** (`:ro`).
- ✅ **Traefik на менеджере** (placement) — требование Swarm-провайдера.
- ❌ **Не** оставляй `--api.insecure=true` и дашборд `:8080` в проде — это только
   для обучения; в проде дашборд закрывают аутентификацией и TLS.
- ❌ **Не** используй self-signed в проде — там Let's Encrypt/корпоративный CA.

## Дальше

[Глава 07](07-healthcheck-rolling-update.md): healthcheck, restart policy и
обновление без даунтайма с автоматическим откатом.
