# Глава 16. Полный стек на кластере

> Тег шага: `step-16` · Часть 4 (capstone, multi-node) — финал курса

## Цель

Собрать всё вместе: развернуть полный стек (приложение, БД с секретами, Redis,
Traefik, наблюдаемость) на многоузловом кластере и убедиться, что всё работает.

## Полный деплой с нуля

```bash
# 1) Кластер
bash deploy/vms/provision.sh
multipass shell swarm-manager           # дальше — на менеджере; код туда перенести (git/transfer)

# 2) Подготовка секрета и сертификата
bash deploy/traefik/certs/generate-cert.sh
cp deploy/secrets/db_password.txt.example deploy/secrets/db_password.txt   # впиши пароль

# 3) Образ в registry
export REGISTRY=<MANAGER_IP>:5000
docker build -t $REGISTRY/swarm-demo-api:1.0.0 .
docker push $REGISTRY/swarm-demo-api:1.0.0

# 4) Полный стек
docker stack deploy -c deploy/stacks/stack.part4.yml part4
```

## Проверка «всё на месте»

```bash
docker stack services part4         # все сервисы, реплики сошлись
docker service ps part4_api --format '{{.Node}}'   # api распределён по узлам

# Приложение (через Traefik, HTTPS):
curl -ks https://localhost/                # hostname + версия
curl -ks https://localhost/counter         # Redis: общий счётчик
curl -ks -X POST https://localhost/notes -H 'Content-Type: application/json' -d '{"title":"on cluster"}'
curl -ks https://localhost/notes           # Postgres за секрет-паролём

# Секреты не в открытом виде:
docker service inspect part4_postgres --format '{{json .Spec.TaskTemplate.ContainerSpec.Env}}'

# Наблюдаемость:
#  Prometheus http://<MANAGER_IP>:9090  -> Targets: api/cadvisor/node-exporter по ВСЕМ узлам UP
#  Grafana    http://<MANAGER_IP>:3001  -> дашборд + Explore по Loki ({service="part4_api"})
```

cAdvisor и node-exporter (глобальные) дают метрики **каждого** узла; Promtail
собирает логи со всех узлов в Loki — наблюдаемость покрывает весь кластер.

## Чеклист production-hardening (что сделано)

- ✅ Multi-stage образ, non-root.
- ✅ Healthcheck + restart policy + rolling update с автооткатом (zero-downtime).
- ✅ Лимиты/резервы ресурсов.
- ✅ Секреты как docker secret (не в env/git); конфиг как docker config.
- ✅ TLS на ingress (Traefik).
- ✅ Метрики (Prometheus/Grafana) и логи (Loki) по всему кластеру.
- ✅ Placement: stateful закреплён, stateless распределён; кворум менеджеров.
- ✅ Отказоустойчивость (failover) и обслуживание (drain).

## Что осталось за рамками курса (направления «дальше»)

- CI/CD-пайплайн сборки и публикации образов.
- Реальный публичный TLS (Let's Encrypt) вместо self-signed.
- Бэкап/восстановление и репликация БД; вынос stateful за пределы Swarm или
  сетевые тома.
- Ротация секретов.
- Защита Prometheus/Grafana/Traefik-дашборда и registry (TLS + auth).
- Автоскейлинг (в Swarm нет «из коробки» — внешние решения).

## Итог

Ты прошёл путь от одного контейнера до отказоустойчивого многоузлового кластера с
секретами и наблюдаемостью, разобрав каждую строку конфигурации. Теперь у тебя
есть рабочий шаблон и понимание, как и почему всё устроено.

Спасибо за прохождение курса! Ревизию любого шага можно посмотреть через
`git checkout step-NN` и `git diff step-XX step-YY`.
