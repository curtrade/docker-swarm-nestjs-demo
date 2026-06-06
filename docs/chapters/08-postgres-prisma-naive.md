# Глава 08. Postgres и Prisma (сначала «как не надо»)

> Тег шага: `step-08` · Часть 2 (single-node)

## Цель

Добавить базу данных (Postgres) и ORM (Prisma) с минимальным ресурсом `notes`.
Намеренно подключаем БД **наивно** — пароль в открытом виде через окружение —
чтобы в главе 09 увидеть проблему и исправить её через docker secret.

## Схема и слои

`prisma/schema.prisma` — модель `Note` (snake_case в БД через `@map`):

```prisma
model Note {
  id        String   @id @default(uuid())
  title     String
  content   String?
  createdAt DateTime @default(now()) @map("created_at")
  @@map("notes")
}
```

Слои (тонкий репозиторий → сервис → контроллер), как требует наш стандарт Prisma:

- `src/prisma/prisma.service.ts` — **единственный** `PrismaClient` (singleton),
  `onModuleInit → $connect`, `onModuleDestroy → $disconnect`.
- `src/prisma/prisma.module.ts` — `@Global()`, плюс глобальный
  `PrismaExceptionFilter` (P2002→409, P2025→404, P2003→400).
- `src/notes/notes.repository.ts` — только Prisma-вызовы.
- `src/notes/notes.service.ts` — бизнес-логика, маппинг в `NoteDto`
  (Prisma-типы **не** протекают наружу).
- `src/notes/notes.controller.ts` — HTTP: POST/GET `/notes`, GET `/notes/:id`.

В `main.ts` добавлен `app.enableShutdownHooks()` — корректное закрытие соединений
при rolling update (SIGTERM → `onModuleDestroy`).

## Миграции и Dockerfile

- Начальная миграция лежит в `prisma/migrations/` (создана через `prisma migrate
  diff` — без живой БД).
- Dockerfile генерирует Prisma-клиент (`prisma generate`) и на старте контейнера
  применяет миграции через entrypoint:

  ```sh
  npx prisma migrate deploy
  exec node dist/main.js
  ```

  `migrate deploy` безопасен при параллельном старте реплик — Prisma берёт
  advisory-lock в БД.

## Наивное подключение (анти-паттерн)

`stack.part2.yml` — Postgres и приложение получают пароль **в открытом виде**:

```yaml
postgres:
  environment:
    POSTGRES_PASSWORD: app_password        # ⚠️ в открытую
api:
  environment:
    DATABASE_URL: 'postgresql://app:app_password@postgres:5432/appdb?schema=public'  # ⚠️
```

Чем это плохо:

- Пароль виден в `docker service inspect`, в `docker stack config`, в логах при
  отладке, и в этом файле — **под git**.
- Любой, у кого есть доступ к API демона или к репозиторию, видит секрет.

## Проверка

```bash
bash deploy/traefik/certs/generate-cert.sh
docker build -t swarm-demo-api:dev .
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part2.yml part2

# CRUD заметок:
curl -ks -X POST https://localhost/notes -H 'Content-Type: application/json' \
  -d '{"title":"Первая","content":"привет"}'
curl -ks https://localhost/notes
curl -ks https://localhost/notes/<id>          # 200
curl -ks https://localhost/notes/nope -o /dev/null -w '%{http_code}\n'  # 404
curl -ks -X POST https://localhost/notes -H 'Content-Type: application/json' \
  -d '{}' -o /dev/null -w '%{http_code}\n'      # 400 (валидация DTO)

# Видно «протекающий» пароль (то, что чиним в главе 09):
docker service inspect part2_postgres --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
```

Юнит-тесты сервиса (репозиторий замокан):

```bash
npm test   # NotesService: create / findAll / findOne / 404
```

## Best practices и анти-паттерны

- ✅ **Один PrismaClient** (singleton-сервис) — не плодим пулы соединений.
- ✅ **Слои repository/service/controller**, Prisma-типы не наружу — маппинг в DTO.
- ✅ **Глобальный фильтр** ошибок Prisma вместо try/catch по сервисам.
- ✅ **Миграции через `migrate deploy`** на старте, `enableShutdownHooks` для
   чистого завершения.
- ❌ **Анти-паттерн этого шага:** пароль БД в открытом окружении/URL. Исправляем
   в следующей главе.
- ⚠️ В проде миграции часто выносят в отдельную one-shot задачу, а не в entrypoint
   каждой реплики (чтобы не гонять их при каждом масштабировании).

## Дальше

[Глава 09](09-secrets-and-configs.md): уносим пароль в docker secret, а конфиг —
в docker config.
