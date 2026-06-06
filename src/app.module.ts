import { Module } from '@nestjs/common';

/**
 * Корневой модуль приложения.
 *
 * На шаге step-00 он пустой — это чистый каркас. По мере прохождения курса
 * сюда подключаются модули наблюдаемости, конфигурации, общего состояния,
 * ресурса notes и т.д. Смотри главы в docs/chapters/.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
