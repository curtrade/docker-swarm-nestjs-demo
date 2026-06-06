# Глава 09. Docker secrets и configs

> Тег шага: `step-09` · Часть 2 (single-node) — завершает Часть 2

## Цель

Убрать пароль БД из открытого вида: перенести его в **docker secret**, а
несекретную конфигурацию — в **docker config**. После этого пароля нет ни в
stack-файле, ни в `service inspect`, ни в окружении долгоживущего процесса.

## Что меняем

### Пароль БД → docker secret

```yaml
secrets:
  db_password:
    file: ../secrets/db_password.txt   # docker CLI читает файл при деплое
```

И монтируем в сервисы как файл:

```yaml
api:
  environment:
    DB_PASSWORD_FILE: '/run/secrets/db_password'   # путь, не пароль
  secrets:
    - source: db_password
      target: db_password               # -> /run/secrets/db_password
postgres:
  environment:
    POSTGRES_PASSWORD_FILE: '/run/secrets/db_password'  # официальный образ это умеет
  secrets:
    - source: db_password
      target: db_password
```

### Несекретная конфигурация → docker config

```yaml
configs:
  app_env:
    file: ../configs/app.env            # APP_VERSION=2.0.0-secrets
api:
  configs:
    - source: app_env
      target: /app/.env                 # configify подхватит /app/.env
```

### Приложение читает секрет из файла

`src/config/database.config.ts` — пароль читается из файла лениво, при сборке URL:

```ts
@Value('DB_PASSWORD_FILE', { default: '' })
@IsString()
passwordFile: string;            // ПУТЬ, не содержимое

export function buildDatabaseUrl(cfg: DatabaseConfiguration): string {
  if (cfg.directUrl) return cfg.directUrl;
  const password = cfg.passwordFile ? readSecretFile(cfg.passwordFile) : cfg.passwordFromEnv;
  return `postgresql://${cfg.user}:${encodeURIComponent(password)}@${cfg.host}:${cfg.port}/${cfg.name}?schema=public`;
}
```

`PrismaService` собирает URL через `buildDatabaseUrl()` и передаёт его в
`datasourceUrl` — пароль не обязан жить в переменной `DATABASE_URL`.

> **Тонкость:** `readSecretFile` бросает понятную ошибку, если путь задан, но
> файла нет (fail fast). А ещё: сборку URL мы вынесли из класса в функцию, потому
> что configify валидирует @Configuration через class-validator, и (а) классу
> нужен хотя бы один валидатор, иначе class-validator бросает `unknownValue`;
> (б) геттеры на конфиг-классе ломают валидацию.

### Миграции и пароль

`prisma migrate deploy` (CLI) читает `DATABASE_URL` из env. Чтобы не держать
пароль в env node-процесса, entrypoint собирает URL из секрета **только для
подпроцесса миграции**:

```sh
DATABASE_URL="$ASSEMBLED_URL" npx prisma migrate deploy   # видно только этой команде
exec node dist/main.js                                    # node читает секрет сам
```

## Проверка

```bash
bash deploy/traefik/certs/generate-cert.sh
cp deploy/secrets/db_password.txt.example deploy/secrets/db_password.txt   # впиши пароль
docker build -t swarm-demo-api:dev .
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part2.secrets.yml part2

# CRUD работает как раньше:
curl -ks -X POST https://localhost/notes -H 'Content-Type: application/json' -d '{"title":"t"}'
curl -ks https://localhost/notes

# А теперь пароля НЕТ в открытом виде:
docker service inspect part2_api --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
#  -> увидишь DB_PASSWORD_FILE=/run/secrets/db_password, но не сам пароль
docker service inspect part2_postgres --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'
#  -> POSTGRES_PASSWORD_FILE, не пароль
```

Юнит-тесты:

```bash
npm test  # buildDatabaseUrl + readSecretFile: чтение из файла, приоритеты, ошибка
```

## Принцип минимальной экспозиции

- Секрет `db_password` получают **только** `api` и `postgres` — кто реально в нём
  нуждается. Traefik, Redis его не видят.
- Несекретное (версия, хост, порт) — в config/env; секретное — только в secrets.

> **Ротация секретов** — за рамками курса. В Swarm секрет иммутабелен: ротация
> делается созданием нового секрета и обновлением сервиса (`docker service update
> --secret-rm/--secret-add`). Это направление «дальше».

## Best practices и анти-паттерны

- ✅ **Пароль как файл-секрет**, не env/URL.
- ✅ **`*_FILE`-переменные** (`DB_PASSWORD_FILE`, `POSTGRES_PASSWORD_FILE`) —
   стандартный паттерн «секрет через файл».
- ✅ **Минимальная экспозиция** — секрет только тем сервисам, кому нужен.
- ✅ **Пароль не в env долгоживущего процесса** — только транзитом в миграции.
- ❌ **Не** клади секреты в образ, stack-файл, env или git.
- ❌ **Не** логируй собранный `DATABASE_URL` целиком — там пароль.

## Итог Части 2

БД подключена, ресурс `notes` работает, а пароль безопасно живёт в docker secret.
Дальше — **наблюдаемость**: метрики, дашборды и логи.

[Глава 10](10-metrics-prometheus-grafana.md): метрики приложения, Prometheus и Grafana.
