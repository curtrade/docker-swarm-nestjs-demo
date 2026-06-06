import { Module } from '@nestjs/common';
import { RedisClient } from './redis.client';
import { SharedStateController } from './shared-state.controller';
import { SharedStateService } from './shared-state.service';

@Module({
  controllers: [SharedStateController],
  providers: [RedisClient, SharedStateService],
  exports: [SharedStateService],
})
export class SharedStateModule {}
