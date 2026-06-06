import { Configuration, Value } from '@itgorillaz/configify';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { existsSync, readFileSync } from 'fs';

/**
 * Читает содержимое файла-секрета (docker secret монтирует его в контейнер).
 * Если путь задан, но файла нет — падаем с понятной ошибкой (fail fast), а не
 * уходим в невнятную ошибку авторизации БД позже.
 */
export function readSecretFile(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`Secret file not found: ${path}`);
  }
  return readFileSync(path, 'utf8').trim();
}

/**
 * Конфигурация БД — только простые @Value-поля (configify их валидирует на старте).
 * Пароль в Swarm хранится не в открытом виде, а как ПУТЬ к файлу-секрету
 * (DB_PASSWORD_FILE). Сборка URL и чтение файла — в buildDatabaseUrl().
 */
@Configuration()
export class DatabaseConfiguration {
  // Полный URL — приоритетен (удобно локально через .env).
  @Value('DATABASE_URL', { default: '' })
  @IsString()
  directUrl: string;

  @Value('DB_HOST', { default: 'localhost' })
  @IsString()
  host: string;

  @Value('DB_PORT', { parse: parseInt, default: 5432 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @Value('DB_USER', { default: 'app' })
  @IsString()
  user: string;

  @Value('DB_NAME', { default: 'appdb' })
  @IsString()
  name: string;

  // ПУТЬ к docker secret (не содержимое). Файл читается в buildDatabaseUrl().
  @Value('DB_PASSWORD_FILE', { default: '' })
  @IsString()
  passwordFile: string;

  // Фолбэк для локальной разработки без секрет-файла.
  @Value('DB_PASSWORD', { default: '' })
  @IsString()
  passwordFromEnv: string;
}

/**
 * Собирает строку подключения. Пароль берётся из файла-секрета (если задан путь),
 * иначе из env-пароля. directUrl (полный DATABASE_URL) имеет приоритет.
 */
export function buildDatabaseUrl(cfg: DatabaseConfiguration): string {
  if (cfg.directUrl) {
    return cfg.directUrl;
  }
  const password = cfg.passwordFile ? readSecretFile(cfg.passwordFile) : cfg.passwordFromEnv;
  return `postgresql://${cfg.user}:${encodeURIComponent(password)}@${cfg.host}:${cfg.port}/${cfg.name}?schema=public`;
}
