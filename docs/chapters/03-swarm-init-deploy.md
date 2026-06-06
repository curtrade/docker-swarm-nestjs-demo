# Глава 03. swarm init и первый stack deploy

> Тег шага: `step-03` · Часть 1 (single-node)

## Цель

Перейти от `docker compose` к **Docker Swarm**: инициализировать кластер из одного
узла и развернуть приложение через `docker stack deploy`.

## compose против stack

| | `docker compose` | `docker stack deploy` |
|---|---|---|
| Где работает | один хост | кластер Swarm |
| Масштаб | контейнеры | сервисы и реплики (задачи) |
| Секция `deploy:` | игнорируется | используется (реплики, политики, placement) |
| Сборка образа | `build:` поддерживается | `build:` **игнорируется** — нужен готовый образ |

Главное отличие на практике: stack **не собирает образы**. Поэтому образ мы
собрали заранее (глава 02), а стек ссылается на него по имени.

## Инициализация Swarm

```bash
docker swarm init
docker node ls          # один узел с ролью Leader
```

`swarm init` превращает текущий Docker-демон в менеджер кластера из одного узла.
Отменить можно `docker swarm leave --force`.

## Stack-файл построчно

`deploy/stacks/stack.part1.yml` (состояние этого шага):

```yaml
version: '3.9'
services:
  api:
    image: swarm-demo-api:dev   # готовый образ (stack не собирает)
    networks: [appnet]
    ports:
      - target: 3000            # порт внутри контейнера
        published: 3000         # порт на узле
        mode: ingress           # через routing mesh Swarm
    environment:
      PORT: '3000'
      APP_VERSION: '1.0.0'
    deploy:
      replicas: 1               # пока одна реплика
      restart_policy:
        condition: on-failure   # перезапуск упавшей задачи
networks:
  appnet:
    driver: overlay             # overlay-сеть кластера
```

- **`mode: ingress`** — публикация через routing mesh: запрос на опубликованный
  порт любого узла маршрутизируется на одну из реплик сервиса.
- **`driver: overlay`** — сеть, работающая поверх всех узлов кластера (на одном
  узле — тоже overlay, чтобы код был готов к multi-node).
- **`restart_policy`** — Swarm сам пересоздаёт упавшую задачу.

## Деплой и проверка

```bash
docker stack deploy -c deploy/stacks/stack.part1.yml part1
docker stack services part1     # REPLICAS должно стать 1/1
docker service ps part1_api     # состояние задачи (Running)
curl -s localhost:3000          # {"hostname":"<id задачи>","version":"1.0.0"}
```

Удалить стек: `docker stack rm part1`.

> **Локальный образ на одном узле.** `docker stack deploy` по умолчанию пытается
> «прирезолвить» образ к digest'у через registry. Если образ собран локально и
> нигде не опубликован, эта проверка либо предупреждает, либо (без доступа к
> registry) подвешивает задачи в состоянии `Preparing`. Решение для single-node:
>
> ```bash
> docker stack deploy --resolve-image=never -c deploy/stacks/stack.part1.yml part1
> ```
>
> Это «костыль» именно для локального образа на одной машине. Правильное решение
> для нескольких узлов — registry, и мы введём его в Части 4 (глава 13).

## Best practices и анти-паттерны

- ✅ **Готовый образ + `image:`** в stack-файле — сборка отдельно от деплоя.
- ✅ **Overlay-сеть с самого начала** — код готов к нескольким узлам.
- ✅ **`restart_policy`** — самовосстановление задач.
- ❌ **Не** рассчитывай на `build:` в `stack deploy` — он игнорируется.
- ❌ **Не** публикуй порт в `mode: host`, если нужна балансировка по кластеру —
  это разберём в главе 04.

## Дальше

[Глава 04](04-scaling-and-balancing.md): масштабируем сервис и увидим балансировку.
