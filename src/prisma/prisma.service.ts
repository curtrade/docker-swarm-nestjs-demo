import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { buildDatabaseUrl, DatabaseConfiguration } from '../config/database.config';

/**
 * Единственный PrismaClient в приложении (singleton).
 *
 * URL подключения собирается в DatabaseConfiguration, где пароль берётся из
 * файла-секрета (а не из открытого env). Передаём готовый URL через datasourceUrl —
 * так пароль не обязан жить в переменной DATABASE_URL.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(dbConfig: DatabaseConfiguration) {
    super({ datasourceUrl: buildDatabaseUrl(dbConfig) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma подключена к БД');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
