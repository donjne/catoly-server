import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserPayload, responseObect } from './dto/user.dto';
import { Response } from 'express';
import { VaultService } from 'src/vault/vault.service';
import { WalletResponse } from 'src/vault/vault.types';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private vaultService: VaultService,
  ) {}

  @Post('sign-in')
  async signInUser(
    @Body() loginUserPayload: CreateUserPayload,
    @Res({ passthrough: true }) response: Response,
  ): Promise<responseObect> {
    try {
      const data = await this.userService.loginUser(loginUserPayload);
      const payload = {
        id: data['_id'],
        address: data.address,
        email: data.email,
      };

      const { accessToken, refreshToken } =
        await this.userService.signUserdataWithJwt(payload);

      response.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        maxAge: 60 * 1000, //15mins
        // maxAge: 60 * 15 * 1000, //15mins
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      return { message: 'Login Successful', data: { ...data, accessToken } };
    } catch (error) {
      throw error;
    }
  }

  @Get('inAppWallet/:name')
  async inAppWallet(
    @Param('name') name: string,
  ): Promise<{ success: boolean; publicKey?: string; error?: string }> {
    return this.vaultService.getWalletPublicKey(name);
  }

  @Post('createNewWallet/:name')
  async createNewWallet(@Param('name') name: string): Promise<WalletResponse> {
    // First check if wallet exists
    const walletStatus = await this.vaultService.checkWalletExists(name);
    if (walletStatus.exists) {
      return {
        success: false,
        error: `Wallet already exists`,
      };
    }

    // If wallet doesn't exist, create it
    return this.vaultService.storeWalletKey(name);
  }
}
