# Глава 05. Redis как общее состояние

> Тег шага: `step-05` · Часть 1 (single-node)

## Цель

Показать, почему состояние в памяти реплики ломается при масштабировании, и
вынести его в Redis — общий для всех реплик.

## Проблема: состояние в памяти

Представим счётчик в памяти процесса (`let counter = 0`). С одной репликой всё
работает. Но с тремя репликами каждый запрос балансируется на случайную реплику,
а у каждой — **свой** счётчик. Значение «прыгает» и зависит от того, кто ответил.
Это типичная ошибка при горизонтальном масштабировании stateless-сервиса.

## Решение: вынести состояние в Redis

`src/shared-state/shared-state.service.ts` — счётчик живёт в Redis:

```ts
async increment(): Promise<number> {
  return this.redis.incr('counter'); // атомарный INCR
}
async current(): Promise<number> {
  const v = await this.redis.get('counter');
  return v ? parseInt(v, 10) : 0;
}
```

`src/shared-state/shared-state.controller.ts` — endpoint возвращает значение
счётчика **и** hostname обслужившей реплики:

```ts
@Get()
async increment() {
  return { counter: await this.sharedState.increment(), servedBy: hostname() };
}
```

`src/shared-state/redis.client.ts` — ioredis как Nest-провайдер:

```ts
@Injectable()
export class RedisClient extends Redis implements OnModuleDestroy {
  constructor(config: RedisConfiguration) {
    super(config.url, { lazyConnect: true, maxRetriesPerRequest: 2 });
  }
  onModuleDestroy() { this.disconnect(); }
}
```

- **`lazyConnect: true`** — соединение открывается на первой команде, а не при
  старте. Иначе загрузка модуля (и тесты без поднятого Redis) висла бы на коннекте.
- **`onModuleDestroy`** — закрываем соединение при остановке, чтобы не было
  «висящих» хендлов.

Адрес Redis — из конфига (`REDIS_URL`), по умолчанию `redis://localhost:6379`,
в Swarm — `redis://redis:6379` (имя сервиса).

## Redis в стеке

`deploy/stacks/stack.part1.yml` получает сервис `redis` и переменную `REDIS_URL`
у `api`:

```yaml
  redis:
    image: redis:7-alpine
    networks: [appnet]
    volumes:
      - redis-data:/data    # данные переживают перезапуск
volumes:
  redis-data:
```

Redis **не публикует порт наружу** — он доступен только внутри overlay-сети.

## Проверка

```bash
docker build -t swarm-demo-api:dev .
docker stack deploy --resolve-image=never -c deploy/stacks/stack.part1.yml part1

# Счётчик растёт монотонно, hostname меняется — состояние общее:
for i in $(seq 1 6); do curl -s localhost:3000/counter; echo; done
```

Ожидаемо: `counter` идёт 1,2,3,4,5,6 (не сбрасывается между репликами), а
`servedBy` чередуется.

Юнит-тесты сервиса (Redis замокан):

```bash
npm test  # SharedStateService: increment/current/ошибка недоступности
```

## Best practices и анти-паттерны

- ✅ **Состояние вне процесса** (Redis) — реплики остаются stateless и
  взаимозаменяемыми.
- ✅ **Атомарные операции Redis** (`INCR`) вместо read-modify-write гонок.
- ✅ **`lazyConnect` + закрытие соединения** — чистый жизненный цикл клиента.
- ✅ **Redis без публикации порта** — доступен только внутри кластера.
- ❌ **Не** держи сессии/счётчики/кеш в памяти реплики — при масштабировании они
   рассинхронизируются.
- ⚠️ Пароль Redis и постоянство данных — отдельная тема; здесь Redis без пароля
   во внутренней сети. Секреты разберём в Части 2.

## Дальше

[Глава 06](06-traefik-ingress-tls.md): поставим Traefik как ingress с TLS.
