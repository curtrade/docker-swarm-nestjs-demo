#!/bin/sh
# Entrypoint контейнера: применяем миграции БД, затем запускаем приложение.
# migrate deploy безопасен при параллельном запуске нескольких реплик —
# Prisma берёт advisory-lock в БД и сериализует применение.
set -e

echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] starting app..."
exec node dist/main.js
