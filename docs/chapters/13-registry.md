# Глава 13. Registry для раздачи образов

> Тег шага: `step-13` · Часть 4 (capstone, multi-node)

## Цель

Понять, почему на multi-node не обойтись без registry, поднять его как сервис
Swarm и задеплоить полный стек, тянущий образ из registry.

## Почему registry обязателен

На одном узле локально собранный образ (`swarm-demo-api:dev`) сразу доступен
планировщику — мы даже обходились флагом `--resolve-image=never` (глава 03).

На **нескольких** узлах задача может попасть на worker, где этого образа **нет**.
Swarm не копирует образы между узлами — он их **тянет** на каждом узле. Значит,
нужно общее место, откуда тянуть, — **registry**.

## Registry как сервис

`stack.part4.yml` добавляет сервис:

```yaml
registry:
  image: registry:2
  volumes:
    - registry-data:/var/lib/registry
  ports:
    - { target: 5000, published: 5000, mode: ingress }
  deploy:
    placement:
      constraints: ['node.role == manager']   # данные registry — на менеджере
```

Узлы должны **доверять** этому registry (он без TLS). Это уже сделано в
`provision.sh` (`insecure-registries: ["<MANAGER_IP>:5000"]` на всех узлах).

## Сборка, push и деплой

На менеджере:

```bash
export REGISTRY=<MANAGER_IP>:5000

# 1) Запустить только registry (или весь стек — registry поднимется первым):
docker stack deploy -c deploy/stacks/stack.part4.yml part4

# 2) Собрать образ под адрес registry и запушить:
docker build -t $REGISTRY/swarm-demo-api:1.0.0 .
docker push $REGISTRY/swarm-demo-api:1.0.0

# 3) (Пере)деплой — api тянется из registry на всех узлах:
docker stack deploy -c deploy/stacks/stack.part4.yml part4
```

Стек ссылается на образ через переменную:

```yaml
api:
  image: ${REGISTRY:-127.0.0.1:5000}/swarm-demo-api:1.0.0
```

Проверка распределения:

```bash
docker service ps part4_api   # задачи на разных узлах (NODE: swarm-manager/worker1/...)
```

## Best practices и анти-паттерны

- ✅ **Образы — через registry** на multi-node (единый источник).
- ✅ **Версионируй теги** (`:1.0.0`), не `:latest` — предсказуемые деплои/откаты.
- ✅ **`--resolve-image=never` больше не нужен** — образ есть в registry.
- ❌ **Insecure registry — только для обучения.** В проде registry за TLS и с
   аутентификацией (или managed: ECR/GCR/Harbor).
- ⚠️ Данные registry на одном узле (менеджере) — для прода нужно надёжное/общее
   хранилище.

## Дальше

[Глава 14](14-placement-and-quorum.md): управляем размещением задач по узлам и
разбираемся с кворумом менеджеров.
