// actions.module.ts
import { Module } from '@nestjs/common';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { VaultService } from 'src/vault/vault.service';
import { RedisService } from 'src/redis/redis.service';
import { DasService } from 'src/das/das.service';
import { UserModule } from 'src/user/user.module';
import { BackupModule } from 'src/backup/backup.module';

@Module({
  controllers: [ActionsController],
  providers: [ActionsService, VaultService, RedisService, DasService],
  exports: [ActionsService],
  imports: [UserModule, BackupModule],
})
export class ActionsModule {}
