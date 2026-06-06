# syntax=docker/dockerfile:1

############################
# Стадия 1: сборка
############################
FROM node:22-alpine AS builder
WORKDIR /app

# Сначала только манифесты — слой с зависимостями кэшируется и не
# пересобирается при правке исходников.
COPY package*.json ./
RUN npm ci

# Затем исходники и компиляция (nest build -> dist/)
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

############################
# Стадия 2: рантайм
############################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Только production-зависимости — образ меньше и без тулинга сборки.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Скомпилированный код из стадии сборки.
COPY --from=builder /app/dist ./dist

# Запуск под непривилегированным пользователем (есть в официальном образе node).
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
