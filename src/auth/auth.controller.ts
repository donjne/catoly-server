import { Controller, Get, InternalServerErrorException, Logger, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { responseObect } from 'src/user/dto/user.dto';
import { AuthService } from './auth.service';
import { ACCESS_TOKEN, REFRESH_TOKEN, REFRESH_TOKEN_ENV } from './costant';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
    constructor(
      private authService: AuthService,
      private jwtService: JwtService,
    ){}

    @Get('status')
    async checkUserAuth(@Req() request: Request): Promise<responseObect> {
        try {
            const token = (request.get(REFRESH_TOKEN) && decodeURIComponent(request.get(REFRESH_TOKEN))) || request.cookies[REFRESH_TOKEN]
            if(!token) throw new UnauthorizedException()
            const claims = await this.authService.verifyJwt(token, REFRESH_TOKEN_ENV)
            const accessToken = await this.jwtService.signAsync(
              {
                id: claims.id,
                address: claims.address,
                inAppWallet: claims?.inAppWallet || '',
                email: claims.email
              }
            )
            return { message: "User Authenticated", data: { ...claims, accessToken}, }
        } catch (error) {
            throw new UnauthorizedException('User session expired')
        }
    }

    @Get('logout')
    async logout(@Res({ passthrough: true }) response: Response): Promise<responseObect> {
        try {
            response.cookie(REFRESH_TOKEN, "", { maxAge: 0 })
            return { message: 'Successfully logged out' }
        } catch (error) {
            throw new InternalServerErrorException('Failed to logout')
        }
    }

}