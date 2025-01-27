import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException({
        success: false,
        message: 'Unauthenticated',
      });
    }

    try {
      const user = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
      request.user = user;
      return true; 

    } catch (err) {
      throw new UnauthorizedException({
        success: false,
        error: 'access token expired',
        message: 'Access token has expired, please use refresh token.',
      });
    }
  }
}
