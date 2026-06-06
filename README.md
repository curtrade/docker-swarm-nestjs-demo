# NestJS + Docker Swarm — учебный проект

Пошаговый курс: как развернуть NestJS-приложение в **Docker Swarm** и довести его
до production-grade состояния. От простого к сложному, с разбором каждой строки
stack-файлов и блоками best practices.

> **Предпосылки:** ты знаешь Docker и `docker compose`. Здесь фокус на оркестрации.

## Содержание

Главы лежат в [`docs/chapters/`](docs/chapters/) и проходятся по порядку. Каждый
завершённый шаг отмечен git-тегом `step-NN`.

**Часть 1 — Деплой и обновления без даунтайма** (single-node)
- [00. Введение и устройство курса](docs/chapters/00-introduction.md)
- [01. Приложение и endpoint'ы](docs/chapters/01-app-and-endpoints.md)
- [02. Dockerfile и локальный compose](docs/chapters/02-dockerfile-and-compose.md)
- [03. swarm init и первый stack deploy](docs/chapters/03-swarm-init-deploy.md)
- [04. Масштабирование и балансировка](docs/chapters/04-scaling-and-balancing.md)
- [05. Redis как общее состояние](docs/chapters/05-redis-shared-state.md)
- [06. Traefik: ingress и TLS](docs/chapters/06-traefik-ingress-tls.md)
- [07. Healthcheck и rolling update](docs/chapters/07-healthcheck-rolling-update.md)

**Часть 2 — Секреты и конфиги** (single-node)
- [08. Postgres и Prisma (наивно)](docs/chapters/08-postgres-prisma-naive.md)
- [09. Docker secrets и configs](docs/chapters/09-secrets-and-configs.md)

**Часть 3 — Наблюдаемость** (single-node)
- [10. Метрики: Prometheus и Grafana](docs/chapters/10-metrics-prometheus-grafana.md)
- [11. Логи (Loki) и диагностика](docs/chapters/11-logs-and-diagnostics.md)

**Часть 4 — Кластер (capstone)** (multi-node, VM)
- [12. Multi-node кластер](docs/chapters/12-multinode-cluster.md)
- [13. Registry для раздачи образов](docs/chapters/13-registry.md)
- [14. Placement и кворум](docs/chapters/14-placement-and-quorum.md)
- [15. Failover и drain](docs/chapters/15-failover-and-drain.md)
- [16. Полный стек на кластере](docs/chapters/16-full-stack-on-cluster.md)

## Локальный запуск приложения

```bash
npm install
npm run start:dev      # http://localhost:3000
npm run lint
npm test
```

## Навигация по шагам

```bash
git tag                       # список шагов
git checkout step-04          # состояние кода на шаге 04
git diff step-03 step-04      # что изменилось между шагами
git switch -                  # вернуться к актуальной ветке
```

## Стек

NestJS 10 · TypeScript · Prisma (Postgres) · Redis · Traefik · Prometheus · Grafana · Loki · Docker Swarm

## Лицензия

MIT
