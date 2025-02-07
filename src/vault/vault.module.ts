import { forwardRef, Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { RedisService } from 'src/redis/redis.service';
import { UserModule } from 'src/user/user.module';
import { BackupModule } from 'src/backup/backup.module';

@Module({
  imports: [
    (forwardRef(() => UserModule)),
    BackupModule
  ],
  controllers: [VaultController],
  providers: [VaultService, RedisService],
  exports: [VaultService],
})
export class VaultModule {}
