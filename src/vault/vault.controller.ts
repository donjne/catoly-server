import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { VaultService } from './vault.service';
import { VaultResponse, WebhookEvent } from './vault.types';

interface WebhookPayload {
  eventId: string;
  webhookId: string;
  environmentId: string;
  data: {
    chain: string;
    walletPublicKey: string;
    provider: string;
    walletName: string;
    // ... other data fields
  };
  eventName: string;
  userId: string;
  timestamp: string;
}

function isRegularWebhookPayload(
  payload: WebhookPayload | WebhookEvent,
): payload is WebhookPayload {
  return 'walletPublicKey' in (payload.data as any);
}

@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post('webhook')
  async webhook(@Body() payload: WebhookPayload | WebhookEvent): Promise<any> {
    try {
      const hasVerifiedCredentials = 'verifiedCredentials' in payload.data;

      const webhookData = {
        eventName: payload.eventName,
        userId: payload.userId,
        publicKey: isRegularWebhookPayload(payload)
          ? payload.data.walletPublicKey
          : payload.data.verifiedCredentials[0]?.address || null,
        newUser: hasVerifiedCredentials,
      };

      // should also check if its redelivery
      if (webhookData.newUser && webhookData.publicKey) {
        return this.vaultService.storeWalletKey(webhookData.publicKey);
      }

      return {
        status: 'success',
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('Error processing webhook:', error);

      // You might want to add specific error handling based on error types
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid webhook payload');
      }

      if (error.message.includes('Vault')) {
        // Handle vault-specific errors
        throw new ServiceUnavailableException(
          'Unable to process wallet storage',
        );
      }

      // For unexpected errors, throw an internal server error
      throw new InternalServerErrorException('Failed to process webhook');
    }
  }

  @Get('secrets/:path')
  async readSecret(@Param('path') path: string): Promise<VaultResponse> {
    return this.vaultService.readSecret(path);
  }

  @Delete('secrets/:path')
  async deleteSecret(@Param('path') path: string): Promise<VaultResponse> {
    return this.vaultService.deleteSecret(path);
  }

  @Get('secrets')
  async listSecrets(@Query('path') path?: string): Promise<VaultResponse> {
    return this.vaultService.listSecrets(path);
  }
}
