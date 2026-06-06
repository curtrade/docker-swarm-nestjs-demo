# Глава 07. Healthcheck и обновление без даунтайма

> Тег шага: `step-07` · Часть 1 (single-node) — завершает Часть 1

## Цель

Сделать обновление версии без даунтайма и с автоматическим откатом при сбое.
Для этого нужны три вещи: **healthcheck**, **restart policy** и **update/rollback
config**.

## Healthcheck

```yaml
healthcheck:
  test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/health']
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 10s
```

Swarm считает задачу **готовой** только когда `/health` отвечает. Это ключ к
zero-downtime: при `order: start-first` старая задача гасится лишь после того,
как новая стала healthy. (Вот зачем в главе 01 мы сделали `/health` лёгким и без
зависимостей — иначе временная недоступность Redis/БД валила бы healthcheck.)

## Restart policy

```yaml
restart_policy:
  condition: on-failure
  delay: 5s
  max_attempts: 3
  window: 30s
```

Swarm перезапускает упавшую задачу (до 3 попыток в окне 30s). Самовосстановление
на уровне оркестратора.

## Rolling update + rollback

```yaml
update_config:
  parallelism: 1          # по одной реплике за раз
  delay: 5s               # пауза между репликами
  order: start-first      # сперва поднять новую, потом погасить старую
  failure_action: rollback
  monitor: 15s            # сколько следить за «здоровьем» после обновления
  max_failure_ratio: 0.0  # любая неудачная задача = провал обновления
rollback_config:
  parallelism: 1
  delay: 5s
  order: start-first
```

- **`start-first`** + healthcheck = нулевой даунтайм.
- **`failure_action: rollback`** — если новая версия не становится healthy в окне
  `monitor`, Swarm сам откатывает на предыдущую.

## Лимиты ресурсов

```yaml
resources:
  limits:    { cpus: '0.50', memory: 256M }
  reservations: { cpus: '0.10', memory: 64M }
```

Лимиты не дают задаче «съесть» узел; резервации сообщают планировщику аппетит
(важно для placement в Части 4).

## Демонстрация zero-downtime

```bash
# Версия 1 уже развёрнута. Соберём «версию 2»:
docker build -t swarm-demo-api:dev .   # (поменяй APP_VERSION в стеке на 2.0.0)

# В одном терминале — непрерывные запросы:
while true; do curl -ks https://localhost/ | grep -o '"version":"[^"]*"'; sleep 0.3; done

# В другом — обновление:
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part1.yml part1
```

Ожидаемо: поток запросов **не прерывается** ошибками, `version` плавно
переключается с `1.0.0` на `2.0.0` по мере замены реплик.

## Демонстрация автоматического отката

Сымитируем «битую» версию — например, healthcheck, который всегда падает
(временно сломаем `/health` или укажем неверный порт healthcheck), и обновимся:

```bash
docker service update --update-failure-action rollback \
  --health-cmd 'wget -qO- http://localhost:9999/health' part1_api
```

Новая задача не станет healthy → по истечении `monitor` Swarm выполнит
**rollback** на предыдущую (рабочую) конфигурацию. Проверить:

```bash
docker service ps part1_api      # увидишь Shutdown «битых» и Running прежних
docker service inspect part1_api --format '{{.UpdateStatus.State}}'  # rollback_completed
```

## Best practices и анти-паттерны

- ✅ **Лёгкий healthcheck** без внешних зависимостей — условие готовности для
   start-first.
- ✅ **`order: start-first` + healthcheck** = обновление без даунтайма.
- ✅ **`failure_action: rollback`** — безопасные деплои по умолчанию.
- ✅ **Лимиты/резервы ресурсов** — предсказуемое поведение под нагрузкой.
- ❌ **Не** делай `order: stop-first` для пользовательских сервисов без нужды —
   это окно недоступности.
- ❌ **Не** ставь healthcheck, зависящий от БД/Redis, — мигающая зависимость
   будет вызывать ложные перезапуски и срывать обновления.

## Итог Части 1

Приложение разворачивается в Swarm, масштабируется, держит общее состояние в
Redis, ходит через Traefik по TLS и обновляется без даунтайма с откатом.
Дальше — **секреты**.

[Глава 08](08-postgres-prisma-naive.md): добавим Postgres и Prisma — сначала
«как не надо» (пароль в env).
