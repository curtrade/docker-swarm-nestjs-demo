import { Configuration, Value } from '@itgorillaz/configify';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

/**
 * Типизированная конфигурация приложения через @itgorillaz/configify.
 *
 * Значения берутся из окружения (а в Части 2 — частично из секрет-файлов).
 * class-validator проверяет их на старте: неверный конфиг роняет приложение
 * при загрузке, а не на первом запросе.
 *
 * Класс авто-обнаруживается configify по декоратору @Configuration() —
 * НЕ добавляем его в providers модулей.
 */
@Configuration()
export class AppConfiguration {
  @Value('PORT', { parse: parseInt, default: 3000 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @Value('APP_VERSION', { default: 'dev' })
  @IsNotEmpty()
  version: string;
}
