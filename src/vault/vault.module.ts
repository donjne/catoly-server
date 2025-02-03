import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { RedisService } from 'src/redis/redis.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [VaultController],
  providers: [VaultService, RedisService],
  exports: [VaultService],
})
export class VaultModule {}
