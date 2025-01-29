import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { RedisService } from 'src/redis/redis.service';

@Module({
  imports: [],
  controllers: [VaultController],
  providers: [VaultService, RedisService],
  exports: [VaultService],
})
export class VaultModule {}
