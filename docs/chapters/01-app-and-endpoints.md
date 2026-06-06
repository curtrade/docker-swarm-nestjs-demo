# Глава 01. Приложение и endpoint'ы

> Тег шага: `step-01` · Часть 1 (single-node)

## Цель

Собрать минимальный NestJS-сервис с поверхностью, по которой дальше будет видно
поведение Swarm. Нам нужны всего два endpoint'а:

- `GET /` — возвращает **hostname контейнера** и **версию**. Когда сервис
  масштабируется до нескольких реплик, разные hostname в ответах покажут
  балансировку.
- `GET /health` — лёгкая liveness-проба для будущего healthcheck в Swarm.

Конфигурация — через типизированный `@itgorillaz/configify` (а не голый
`process.env`).

## Что делаем

### Endpoint'ы

`src/observability/observability.controller.ts` — корневой `GET /`:

```ts
@Controller()
export class ObservabilityController {
  constructor(private readonly config: AppConfiguration) {}

  @Get()
  root(): { hostname: string; version: string } {
    return { hostname: hostname(), version: this.config.version };
  }
}
```

`src/health/health.controller.ts` — `GET /health`, намеренно без обращений к БД
или Redis: проба отвечает «жив ли процесс», а не «здоровы ли зависимости».

### Конфигурация через Configify

`src/config/app.config.ts`:

```ts
@Configuration()
export class AppConfiguration {
  @Value('PORT', { parse: parseInt, default: 3000 })
  @IsInt() @Min(1) @Max(65535)
  port: number;

  @Value('APP_VERSION', { default: 'dev' })
  @IsNotEmpty()
  version: string;
}
```

- `@Configuration()`-класс **авто-обнаруживается** configify — его не нужно
  добавлять в `providers`.
- `parse: parseInt` обязателен: значения окружения — строки, без `parse` в `port`
  лежала бы строка `"3000"`.
- class-validator (`@IsInt`, `@Min`, `@Max`) валидирует конфиг **на старте**:
  неверный `PORT` уронит приложение при загрузке, а не на первом запросе.

В `app.module.ts` подключаем `ConfigifyModule.forRootAsync()`, а в `main.ts`
берём порт из конфига:

```ts
const config = app.get(AppConfiguration);
await app.listen(config.port);
```

> **Почему `strictPropertyInitialization: false` в `tsconfig.json`.** configify
> заполняет `@Value()`-поля в рантайме (через reflection), а не в конструкторе.
> При включённом флаге TS ругался бы «has no initializer». Альтернатива —
> `@RequiredArgsConstructor()`, но мы выбрали более простой путь.

## Проверка

```bash
npm install
npm run start:dev
curl -s localhost:3000        # {"hostname":"...","version":"dev"}
curl -s localhost:3000/health # {"status":"ok"}

npm test          # unit: HealthController
npm run test:e2e  # e2e: / и /health
npm run lint
```

## Best practices и анти-паттерны

- ✅ **Типизированный конфиг** вместо `process.env` в бизнес-логике: значения
  валидируются на старте, типы известны компилятору.
- ✅ **Лёгкий `/health`** без зависимостей — healthcheck не должен каскадно
  валить реплики из-за временной недоступности БД (это разберём в главе 07).
- ✅ **hostname в ответе** — дешёвый и наглядный индикатор балансировки.
- ❌ **Не** читаем `process.env.PORT` по всему коду — единственное «сырое» чтение
  было на `step-00`, и мы его убрали.
- ❌ **Не** делаем «умную» liveness-пробу, которая ходит в БД, — для этого есть
  readiness, и это отдельная тема.

## Дальше

[Глава 02](02-dockerfile-and-compose.md): упакуем сервис в multi-stage Docker-образ
и поднимем локально через docker compose.
