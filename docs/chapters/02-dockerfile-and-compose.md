# Глава 02. Dockerfile и локальный compose

> Тег шага: `step-02` · Часть 1 (single-node)

## Цель

Упаковать приложение в **multi-stage** Docker-образ по best practices и поднять
его локально через `docker compose` — это «база» перед переходом к Swarm.

## Dockerfile построчно

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder        # (1) стадия сборки
WORKDIR /app
COPY package*.json ./                 # (2) сначала только манифесты
RUN npm ci                            # (3) кэшируемый слой зависимостей
COPY tsconfig*.json nest-cli.json ./  # (4) затем конфиги сборки
COPY src ./src                        # (5) и исходники
RUN npm run build                     # (6) nest build -> dist/

FROM node:22-alpine AS runtime        # (7) чистая стадия рантайма
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force  # (8) только прод-зависимости
COPY --from=builder /app/dist ./dist  # (9) забираем только собранное
USER node                             # (10) непривилегированный пользователь
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Ключевые решения:

1. **Две стадии.** В финальный образ не попадают devDependencies, тулчейн TypeScript
   и исходники — только `dist/` и прод-зависимости. Образ меньше и безопаснее.
2–3. **Манифесты копируем до исходников.** Слой `npm ci` пересобирается только при
   изменении `package*.json`, а не при каждой правке кода — быстрее сборки.
8. **`--omit=dev`** в рантайме: никакого `@nestjs/cli`, `typescript`, `eslint` в образе.
9. **`COPY --from=builder`** переносит только артефакт сборки.
10. **`USER node`** — не запускаем процесс под root (пользователь `node` есть в
   официальном образе).

## Локальный compose

`deploy/compose/docker-compose.yml` — один сервис, обычный compose (Swarm ещё нет):

```yaml
services:
  api:
    build:
      context: ../..        # корень репозитория
      dockerfile: Dockerfile
    image: swarm-demo-api:dev
    ports:
      - '3000:3000'
    environment:
      PORT: '3000'
      APP_VERSION: 'compose-dev'
```

## Проверка

```bash
# Сборка образа
docker build -t swarm-demo-api:dev .

# Запуск через compose
docker compose -f deploy/compose/docker-compose.yml up --build

# В другом терминале:
curl -s localhost:3000        # {"hostname":"<id контейнера>","version":"compose-dev"}
curl -s localhost:3000/health # {"status":"ok"}
```

`hostname` в ответе — это id контейнера. Пока контейнер один, он всегда один и
тот же; в главе 04, после масштабирования, мы увидим разные id.

> **Если `npm ci` в сборке падает с сетевой ошибкой** (CI/песочница без сети у
> buildkit) — добавь `--network=host`: `docker build --network=host -t swarm-demo-api:dev .`
> В обычном окружении флаг не нужен.

## Best practices и анти-паттерны

- ✅ **Multi-stage build** — финальный образ без тулчейна сборки.
- ✅ **`COPY package*.json` до кода** — эффективное кэширование слоёв.
- ✅ **`USER node`** — процесс не под root.
- ✅ **`.dockerignore`** исключает `node_modules`, `dist`, `.git`, `.env` из контекста.
- ❌ **Не** `COPY . .` целиком в один слой — это ломает кэш и тащит лишнее (включая
   возможные секреты).
- ❌ **Не** оставляем `latest`-теги без необходимости. Здесь `node:22-alpine`;
   в проде стоит пинить дайджест (`node:22-alpine@sha256:...`) для воспроизводимости.

## Дальше

[Глава 03](03-swarm-init-deploy.md): инициализируем Swarm и сделаем первый
`docker stack deploy`.
