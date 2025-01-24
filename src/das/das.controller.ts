import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DasService } from './das.service';
import {
  BlockTransactionResponse,
  CNFTTransactionResponse,
  DomainResolveResponse,
  DomainResponse,
  EnrichedTransactionResponse,
  FormattedNativeBalance,
  NiftyAssetResponse,
  PortfolioSummary,
  PortfolioValue,
  RawTransactionResponse,
  SlotResponse,
  TLDResponse,
  TokenPriceResponse,
  TPSResponse,
  TransactionsResponse,
} from './das.types';

@Controller('das')
export class DasController {
  constructor(private readonly dasService: DasService) {}

  // Static routes first (no parameters)
  @Get('slot')
  async getCurrentSlot(
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<SlotResponse> {
    return this.dasService.getCurrentSlot({ network });
  }

  @Get('tlds')
  async getAllTLDs(
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<TLDResponse> {
    return this.dasService.getAllTLDs({ network });
  }

  @Get('tps')
  async getTPS(
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<TPSResponse> {
    return this.dasService.getTPS({ network });
  }

  @Get('token-balance')
  async getBalance(
    @Query('wallet') walletAddress: string,
    @Query('token') tokenAddress?: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<number> {
    return this.dasService.getTokenOrNativeBalance({
      walletAddress,
      tokenAddress,
      network,
    });
  }

  // Routes with one level of parameters
  @Get('owner/:address')
  async getAssetsByOwner(
    @Param('address') ownerAddress: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('network') network?: 'mainnet' | 'devnet',
  ) {
    return this.dasService.getAssetsByOwner({
      ownerAddress,
      page,
      limit,
      network,
    });
  }

  @Get('fungible/:address')
  async getFungibleTokensByOwner(
    @Param('address') ownerAddress: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ) {
    return this.dasService.getFungibleTokensByOwner({
      ownerAddress,
      page,
      limit,
      before,
      after,
      network,
    });
  }

  @Get('spl-portfolio/:address')
  async getPortfolioValue(
    @Param('address') ownerAddress: string,
    @Query('detailed', new DefaultValuePipe(false), ParseBoolPipe)
    detailed: boolean,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<PortfolioValue | PortfolioSummary> {
    return detailed
      ? this.dasService.getPortfolioAnalysis({ ownerAddress, network })
      : this.dasService.getWalletPortfolioValue({ ownerAddress, network });
  }

  @Get('native-balance/:address')
  async getNativeBalance(
    @Param('address') ownerAddress: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<FormattedNativeBalance> {
    return this.dasService.getNativeBalance({ ownerAddress, network });
  }

  @Get('portfolio/:address')
  async getCompleteBalance(
    @Param('address') ownerAddress: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ) {
    return this.dasService.getCompleteWalletBalance({ ownerAddress, network });
  }

  @Get('price/:tokenAddress')
  async getPrice(
    @Param('tokenAddress') tokenAddress: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<TokenPriceResponse> {
    return this.dasService.getTokenPrice({ tokenAddress, network });
  }

  @Get('block/:slot')
  async getBlockTransactions(
    @Param('slot', ParseIntPipe) slot: number,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<BlockTransactionResponse> {
    return this.dasService.getBlockTransactions({
      slot,
      cursor,
      limit,
      network,
    });
  }

  @Get('cnft/:assetId')
  async getCNFTTransactions(
    @Param('assetId') assetId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<CNFTTransactionResponse> {
    return this.dasService.getCNFTTransactions({
      assetId,
      page,
      limit,
      network,
    });
  }

  @Get('nifty/:address')
  async getNiftyAsset(
    @Param('address') assetAddress: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<NiftyAssetResponse> {
    return this.dasService.getNiftyAsset({ assetAddress, network });
  }

  @Get('transaction/:signature')
  async getRawTransaction(
    @Param('signature') signature: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<RawTransactionResponse> {
    return this.dasService.getRawTransaction({ signature, network });
  }

  @Get('enriched-transaction/:signature')
  async getEnrichedTransaction(
    @Param('signature') signature: string,
    @Query('account') account?: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<EnrichedTransactionResponse> {
    return this.dasService.getEnrichedTransaction({
      signature,
      account,
      network,
    });
  }

  // Domain-specific routes
  @Get('domain/:address')
  async getSolanaDomain(
    @Param('address') address: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<DomainResponse> {
    return this.dasService.getSolanaDomain({ address, network });
  }

  @Get('domain/resolve/all/:domain')
  async resolveAllDomains(
    @Param('domain') domain: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<DomainResolveResponse> {
    return this.dasService.resolveAllDomains({ domain, network });
  }

  @Get('domain/resolve/sol/:domain')
  async resolveSolDomain(
    @Param('domain') domain: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<DomainResolveResponse> {
    return this.dasService.resolveSolDomain({ domain, network });
  }

  // Account transactions route
  @Get('account-transactions/:account')
  async getAccountTransactions(
    @Param('account') account: string,
    @Query('cursor') cursor?: string,
    @Query('filter') filter?: string,
    @Query('user') user?: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ): Promise<TransactionsResponse> {
    console.log('Controller: getAccountTransactions called with:', {
      account,
      cursor,
      filter,
      user,
      network,
    });

    try {
      const result = await this.dasService.getAccountTransactions({
        account,
        options: { cursor, filter, user },
        network,
      });

      console.log(
        'Controller: Transaction fetch result status:',
        result.status,
      );
      return result;
    } catch (error) {
      console.error('Controller: Error in getAccountTransactions:', error);
      return {
        status: 'error',
        message: `Controller error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Catch-all route LAST
  @Get(':id')
  async getAsset(
    @Param('id') id: string,
    @Query('network') network?: 'mainnet' | 'devnet',
  ) {
    return this.dasService.getAsset({ id, network });
  }

  @Get('ownership/:address')
  async getOwnership(@Param('address') address: string) {
    return await this.dasService.checkAddressOwnership(address);
  }
}

// import {
//   Controller,
//   DefaultValuePipe,
//   Get,
//   Param,
//   ParseBoolPipe,
//   ParseIntPipe,
//   Query,
// } from '@nestjs/common';
// import { DasService } from './das.service';
// import {
//   BlockTransactionResponse,
//   CNFTTransactionResponse,
//   DomainResolveResponse,
//   DomainResponse,
//   EnrichedTransactionResponse,
//   FormattedNativeBalance,
//   // MerkleTreeResponse,
//   NiftyAssetResponse,
//   PortfolioSummary,
//   PortfolioValue,
//   RawTransactionResponse,
//   SlotResponse,
//   TLDResponse,
//   TokenPriceResponse,
//   TPSResponse,
//   TransactionsResponse,
// } from './das.types';

// @Controller('das')
// export class DasController {
//   constructor(private readonly dasService: DasService) {}

//   @Get(':id')
//   async getAsset(@Param('id') id: string) {
//     return this.dasService.getAsset({ id });
//   }

//   @Get('owner/:address')
//   async getAssetsByOwner(
//     @Param('address') ownerAddress: string,
//     @Query('page') page?: number,
//     @Query('limit') limit?: number,
//   ) {
//     return this.dasService.getAssetsByOwner({
//       ownerAddress,
//       page,
//       limit,
//     });
//   }

//   @Get('fungible/:address')
//   async getFungibleTokensByOwner(
//     @Param('address') ownerAddress: string,
//     @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
//     @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
//     @Query('before') before?: string,
//     @Query('after') after?: string,
//   ) {
//     return this.dasService.getFungibleTokensByOwner({
//       ownerAddress,
//       page,
//       limit,
//       before,
//       after,
//     });
//   }

//   @Get('spl-portfolio/:address')
//   async getPortfolioValue(
//     @Param('address') ownerAddress: string,
//     @Query('detailed', new DefaultValuePipe(false), ParseBoolPipe)
//     detailed: boolean,
//   ): Promise<PortfolioValue | PortfolioSummary> {
//     return detailed
//       ? this.dasService.getPortfolioAnalysis(ownerAddress)
//       : this.dasService.getWalletPortfolioValue(ownerAddress);
//   }

//   @Get('native-balance/:address')
//   async getNativeBalance(
//     @Param('address') ownerAddress: string,
//   ): Promise<FormattedNativeBalance> {
//     return this.dasService.getNativeBalance(ownerAddress);
//   }

//   @Get('portfolio/:address')
//   async getCompleteBalance(@Param('address') ownerAddress: string) {
//     return this.dasService.getCompleteWalletBalance(ownerAddress);
//   }

//   @Get('balance')
//   async getBalance(
//     @Param('wallet') walletAddress: string,
//     @Query('token') tokenAddress?: string,
//   ): Promise<number> {
//     return this.dasService.getTokenOrNativeBalance(walletAddress, tokenAddress);
//   }

//   @Get('price/:tokenAddress')
//   async getPrice(
//     @Param('tokenAddress') tokenAddress: string,
//   ): Promise<TokenPriceResponse> {
//     return this.dasService.getTokenPrice(tokenAddress);
//   }

//   @Get('tlds')
//   async getAllTLDs(): Promise<TLDResponse> {
//     return this.dasService.getAllTLDs();
//   }

//   @Get('block/:slot')
//   async getBlockTransactions(
//     @Param('slot', ParseIntPipe) slot: number,
//     @Query('cursor') cursor?: string,
//     @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
//   ): Promise<BlockTransactionResponse> {
//     return this.dasService.getBlockTransactions(slot, cursor, limit);
//   }

//   @Get('cnft/:assetId')
//   async getCNFTTransactions(
//     @Param('assetId') assetId: string,
//     @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
//     @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
//   ): Promise<CNFTTransactionResponse> {
//     return this.dasService.getCNFTTransactions(assetId, page, limit);
//   }

//   // @Get('merkle/:address')
//   // async getMerkleTree(
//   //   @Param('address') address: string,
//   // ): Promise<MerkleTreeResponse> {
//   //   return this.dasService.getMerkleTree(address);
//   // }

//   @Get('slot')
// async getCurrentSlot(): Promise<SlotResponse> {
//   return this.dasService.getCurrentSlot();
// }

//   @Get('transaction/:signature')
//   async getRawTransaction(
//     @Param('signature') signature: string,
//   ): Promise<RawTransactionResponse> {
//     return this.dasService.getRawTransaction(signature);
//   }

//   @Get('tps')
//   async getTPS(): Promise<TPSResponse> {
//     return this.dasService.getTPS();
//   }

//   @Get('enriched-transaction/:signature')
//   async getEnrichedTransaction(
//     @Param('signature') signature: string,
//     @Query('account') account?: string,
//   ): Promise<EnrichedTransactionResponse> {
//     return this.dasService.getEnrichedTransaction(signature, account);
//   }

//   @Get('account-transactions/:account')
//   async getAccountTransactions(
//     @Param('account') account: string,
//     @Query('cursor') cursor?: string,
//     @Query('filter') filter?: string,
//     @Query('user') user?: string,
//   ): Promise<TransactionsResponse> {
//     return this.dasService.getAccountTransactions(account, { cursor, filter, user });
//   }

//   @Get('nifty/:address')
// async getNiftyAsset(
//   @Param('address') address: string
// ): Promise<NiftyAssetResponse> {
//   return this.dasService.getNiftyAsset(address);
// }

//   @Get('domain/:address')
//   async getSolanaDomain(
//     @Param('address') address: string
//   ): Promise<DomainResponse> {
//     return this.dasService.getSolanaDomain(address);
//   }

//   @Get('domain/resolve/all/:domain')
//   async resolveAllDomains(
//     @Param('domain') domain: string
//   ): Promise<DomainResolveResponse> {
//     return this.dasService.resolveAllDomains(domain);
//   }

//   @Get('domain/resolve/sol/:domain')
//   async resolveSolDomain(
//     @Param('domain') domain: string
//   ): Promise<DomainResolveResponse> {
//     return this.dasService.resolveSolDomain(domain);
//   }
// }
