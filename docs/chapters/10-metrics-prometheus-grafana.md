# Глава 10. Метрики: Prometheus и Grafana

> Тег шага: `step-10` · Часть 3 (single-node)

## Цель

Сделать кластер наблюдаемым по метрикам: приложение экспортирует `/metrics`,
Prometheus собирает их (плюс метрики Traefik, контейнеров и узлов), Grafana
рисует дашборды.

## Метрики приложения

`src/observability/metrics.service.ts` — свой `Registry` prom-client с дефолтными
метриками процесса Node и счётчиком `http_requests_total`:

```ts
this.httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Всего HTTP-запросов',
  labelNames: ['method', 'route', 'status'],
  registers: [this.registry],
});
```

`MetricsInterceptor` (глобальный) инкрементит счётчик на каждый запрос, а
`GET /metrics` отдаёт всё в text-формате Prometheus.

> Свой `Registry` (а не глобальный default prom-client) выбран специально — иначе
> несколько инстансов в тестах конфликтовали бы на одинаковых именах метрик.

## Prometheus

`deploy/prometheus/prometheus.yml` — ключевой приём для Swarm: скрейп **всех
реплик** через DNS Swarm `tasks.<service>`:

```yaml
- job_name: api
  metrics_path: /metrics
  dns_sd_configs:
    - names: ['tasks.api']    # A-записи ВСЕХ задач сервиса api
      type: A
      port: 3000
```

Так Prometheus сам находит новые реплики при масштабировании. Аналогично
скрейпятся `tasks.cadvisor` и `tasks.node-exporter` (глобальные агенты), а также
Traefik (`traefik:8082`, метрики включены флагами `--metrics.prometheus`).

## Grafana

Источник данных и дашборды настраиваются декларативно (provisioning), не кликами:

- `deploy/grafana/provisioning/datasources/datasources.yml` — datasource Prometheus.
- `deploy/grafana/provisioning/dashboards/dashboards.yml` — провайдер дашбордов.
- `deploy/grafana/dashboards/app-overview.json` — дашборд (rate запросов, число
  живых реплик `up{job="api"}`, CPU контейнеров из cAdvisor).

## Агенты cAdvisor и node-exporter

Развёрнуты в режиме `mode: global` — по одному экземпляру на каждый узел кластера
(в Части 4 это станет особенно важно). Им нужны host-маунты (`/sys`, `/proc`,
docker socket) — это нормально для агентов мониторинга.

## Проверка

```bash
bash deploy/traefik/certs/generate-cert.sh
cp deploy/secrets/db_password.txt.example deploy/secrets/db_password.txt
docker build -t swarm-demo-api:dev .
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part3.yml part3

# Метрики приложения:
curl -ks https://localhost/metrics | grep http_requests_total

# Prometheus: http://localhost:9090  -> Status/Targets: все таргеты UP
# Grafana:    http://localhost:3001  -> дашборд «Swarm Demo — обзор»
```

Юнит-тесты:

```bash
npm test  # MetricsService: счётчик, дефолтные метрики, content-type
```

## Best practices и анти-паттерны

- ✅ **Скрейп через `tasks.<service>`** — Prometheus видит все реплики, включая
   новые после масштабирования.
- ✅ **Provisioning Grafana** (datasource/дашборды как код), а не ручная настройка.
- ✅ **Глобальные агенты** (cAdvisor/node-exporter) — по одному на узел.
- ✅ **Свой Registry** в приложении — предсказуемо и тестируемо.
- ❌ **Не** оставляй `/metrics` открытым в интернет в проде — метрики раскрывают
   внутренности; ограничивай доступ.
- ❌ **Не** настраивай дашборды кликами в проде — они потеряются при пересоздании
   Grafana; держи их в provisioning под git.

## Дальше

[Глава 11](11-logs-and-diagnostics.md): добавим централизованные логи (Loki +
Promtail) и научимся диагностировать проблемы.
