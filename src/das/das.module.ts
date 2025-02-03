import { Module } from '@nestjs/common';
import { DasService } from './das.service';
import { DasController } from './das.controller';
import { VaultService } from 'src/vault/vault.service';
import { RedisService } from 'src/redis/redis.service';
import { UserModule } from 'src/user/user.module';

@Module({
  providers: [DasService, VaultService, RedisService],
  controllers: [DasController],
  exports: [DasService],
  imports: [UserModule]
})

export class DasModule {}
