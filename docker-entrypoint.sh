#!/bin/sh
# Entrypoint контейнера: применяем миграции БД, затем запускаем приложение.
#
# Тонкость безопасности: prisma CLI читает DATABASE_URL из окружения, но мы НЕ
# хотим держать пароль в env долгоживущего node-процесса. Поэтому собираем
# DATABASE_URL из секрета только для подпроцесса migrate deploy, а само
# приложение читает пароль из файла-секрета (DB_PASSWORD_FILE) уже само.
set -e

ASSEMBLED_URL="$DATABASE_URL"
if [ -z "$ASSEMBLED_URL" ]; then
  if [ -n "$DB_PASSWORD_FILE" ] && [ -f "$DB_PASSWORD_FILE" ]; then
    PW="$(cat "$DB_PASSWORD_FILE")"
  else
    PW="$DB_PASSWORD"
  fi
  ASSEMBLED_URL="postgresql://${DB_USER:-app}:${PW}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-appdb}?schema=public"
fi

echo "[entrypoint] prisma migrate deploy..."
# DATABASE_URL виден только этой команде, не экспортируется в node-процесс.
DATABASE_URL="$ASSEMBLED_URL" npx prisma migrate deploy

echo "[entrypoint] starting app..."
exec node dist/main.js
