# syntax=docker/dockerfile:1

############################
# Стадия 1: сборка
############################
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma на alpine требует openssl, иначе не определяет libssl и не находит движок.
RUN apk add --no-cache openssl

# Сначала только манифесты — слой с зависимостями кэшируется.
COPY package*.json ./
RUN npm ci

# Prisma-клиент генерируется из схемы ДО компиляции (его типы нужны TS).
COPY prisma ./prisma
RUN npx prisma generate

# Затем исходники и компиляция (nest build -> dist/).
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

############################
# Стадия 2: рантайм
############################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Prisma на alpine требует openssl (для query- и schema-движков в рантайме).
RUN apk add --no-cache openssl

# Только production-зависимости (prisma и @prisma/client — в dependencies).
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Схема + повторная генерация клиента (node_modules здесь свежие).
COPY prisma ./prisma
RUN npx prisma generate

# Скомпилированный код и entrypoint.
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Каталоги Prisma должны принадлежать node: migrate deploy в entrypoint работает
# под non-root и может потребовать запись (кэш/временные файлы движка).
RUN chown -R node:node /app/node_modules/.prisma /app/node_modules/@prisma

USER node
EXPOSE 3000
# Entrypoint применяет миграции, затем запускает приложение.
ENTRYPOINT ["./docker-entrypoint.sh"]
