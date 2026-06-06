import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Единственный PrismaClient в приложении (singleton).
 * Никогда не создаём `new PrismaClient()` где-либо ещё — это плодит пулы
 * соединений и исчерпывает БД.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma подключена к БД');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
