// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrivyService } from './privy.service';
import { AuthController } from './auth.controller';
import { PrivyAuthGuard } from './privy.guard';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_TOKEN_SECRET,
      signOptions: { expiresIn: '3600s' }, // 15min
    }),
  ],
  controllers: [AuthController],
  providers: [PrivyService, PrivyAuthGuard, AuthService],
  exports: [PrivyService, PrivyAuthGuard, ],
})
export class AuthModule {}