---
date: 2026-06-07
topic: course-docs-verification-findings
status: completed
plan: docs/plans/2026-06-07-001-fix-course-docs-step-verification-plan.md
origin: docs/brainstorms/course-docs-verification-requirements.md
---

# Проверка шагов курса — находки и результат

Работа по плану `docs/plans/2026-06-07-001-fix-course-docs-step-verification-plan.md`.
Вся история курса перестроена: шаги 01–11 проверены вживую (single-node Swarm),
12–16 вычитаны (без запуска multi-node). `main` и теги `step-00..16` переустановлены
на исправленную цепочку и опубликованы (force-push). Бэкап оригинала — ветки
`backup/main` / `backup/feat`.

## Что проверено вживую (01–11)

| Шаг | Проверка | Итог |
|---|---|---|
| 01 | npm/build/lint/test/e2e, `/` и `/health` | ✅ AE2 |
| 02 | docker build, compose, `version=compose-dev` | ✅ |
| 03 | swarm init, stack deploy 1/1 | ✅ |
| 04 | масштаб 3/3, балансировка по hostname | ✅ AE1 |
| 05 | Redis, общий счётчик на 3 репликах | ✅ |
| 06 | Traefik ingress + self-signed TLS, HTTP→HTTPS | ✅ |
| 07 | healthcheck (пересоздание), zero-downtime rolling update, авто-rollback | ✅ AE2/AE3 |
| 08 | Postgres/Prisma, notes CRUD, наивный env-пароль виден | ✅ |
| 09 | docker secrets: пароль не виден в env/inspect/логах | ✅ AE4 |
| 10 | `/metrics`, Prometheus targets UP, Grafana | ✅ |
| 11 | Loki+Promtail: логи всех сервисов, Grafana datasources | ✅ |
| 12–16 | вычитка: файлы существуют, part4 — валидный YAML, фиксы вложены | ✅ AE4(review) |

## Исправленные баги курса

1. **Дрейф версий configify** — пин `^1.3.2` (v1) против v4-API в коде. Фикс: `^4.1.2`
   (вложен в `step-01`, распространяется вперёд). Корневая причина исходной поломки.
2. **Traefik swarm-провайдер ↔ Docker 28+** — `traefik:v3.1` (и v3.7.x) шлёт Docker API 1.24,
   демон требует ≥1.40 → провайдер не видит сервисы. Фикс: **`traefik:v3.6.20`** — применён
   во ВСЕХ стек-файлах (part1/part2/part2.secrets/part3/part4), т.к. каждый — отдельный файл.
3. **Prisma на alpine** — `migrate deploy` под non-root падал: нет `openssl`, нет musl-движка,
   нет прав на запись. Фикс в `step-08`: `binaryTargets=["native","linux-musl-openssl-3.0.x"]`
   в schema + `apk add openssl` (обе стадии) + `chown` каталогов Prisma на `node`.
4. **Хвостовой fix-коммит `b9f4057`** — был свален в конец вместо «родных» шагов.
   Перераспределён: коммент tsconfig → step-01, лог Prisma-ошибок → step-08,
   учёт 4xx/5xx + кардинальность меток (+ e2e на 400) → step-10. Сам `b9f4057` растворён.

## Особенности среды (НЕ баги курса — документированные команды верны)

- **BuildKit RUN-сеть** в песочнице рвёт длинный `npm ci` → собирали legacy-сборщиком
  `DOCKER_BUILDKIT=0 docker build`. На обычной машине `docker build` работает.
- **`curl localhost`** зависает (localhost→IPv6, ingress отдаёт IPv4) → проверяли по
  `127.0.0.1` / `--resolve localhost:443:127.0.0.1`. На обычной машине `localhost` работает.
- **`--resolve-image=never`** требует, чтобы сторонние образы (prometheus/grafana/loki/...)
  были предзагружены (`docker pull`) — иначе «No such image». Предзагружали вручную.
- **cadvisor (`gcr.io`)** недоступен из этой среды (gcr.io отдаёт 403 даже на публичные образы).
  Образ валиден; на машине с доступом к gcr.io подтянется. Один вспомогательный таргет метрик.

## Замечания для возможного улучшения курса (не блокеры)

- Главы 10–11: добавить шаг предзагрузки сторонних образов перед `stack deploy --resolve-image=never`.
- Глава 11: при обновлении уже запущенного `part3` со step-10 swarm-конфиги иммутабельны
  («only updates to Labels are allowed») — нужен `docker stack rm part3` перед повторным деплоем
  (или версионирование имён конфигов).

## История git

- `main` = `feat/nestjs-docker-swarm-tutorial` = `origin/main` переустановлены на перестроенную
  цепочку; теги `step-00..16` указывают на исправленные коммиты; опубликовано force-push.
- **Откат:** ветки `backup/main` / `backup/feat` хранят оригинал (`b9f4057`) до подтверждения целостности.
- Инцидент: в ходе работы повреждались loose-объекты git (пустые файлы, сбой ФС под нагрузкой) —
  восстановлено без потерь (перестроенная цепочка и бэкапы были целы, fsck чист).
