import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { BackupModule } from 'src/backup/backup.module';

@Module({
  providers: [RedisService],
  controllers: [RedisController],
  imports: [
    BackupModule
  ],
  exports: [RedisService]
})
export class RedisModule {}
