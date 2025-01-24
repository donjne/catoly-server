import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { userJwtData } from 'src/user/dto/user.dto';
import { ACCESS_TOKEN, ACCESS_TOKEN_ENV, REFRESH_TOKEN, REFRESH_TOKEN_ENV } from './costant';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) {}

    async verifyJwt(token: string, secret = ACCESS_TOKEN_ENV): Promise<userJwtData> {
        return await this.jwtService.verifyAsync(
            token,
            {
              secret: this.configService.get<string>(secret)
            }
          );
    }
}