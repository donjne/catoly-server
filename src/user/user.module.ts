import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { VaultService } from 'src/vault/vault.service';
import { RedisService } from 'src/redis/redis.service';
import { VaultModule } from 'src/vault/vault.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  controllers: [UserController],
  providers: [UserService,],
  // providers: [UserService, VaultService, RedisService],
  imports: [
    MongooseModule.forFeature([
      {name: User.name, schema: UserSchema},
    ]),
    VaultModule,
    RedisModule,
    // AuthModule
  ],
  exports: [UserService]
})
export class UserModule {}
