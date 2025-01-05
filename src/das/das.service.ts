import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Asset,
  FormattedNativeBalance,
  GetAssetParams,
  GetAssetsByOwnerParams,
  GetAssetsByOwnerResponse,
  HeliusResponse,
  NativeBalanceResponse,
  PortfolioSummary,
  PortfolioValue,
} from './das.types';

@Injectable()
export class DasService {
  private readonly heliusUrl: string;
  private readonly SOL_DECIMALS = 9; // Solana uses 9 decimals

  constructor(private configService: ConfigService) {
    const apikey = this.configService.get<string>('HELIUS_API_KEY');

    if (!apikey) {
      throw new Error('HELIUS_API_KEY is not defined in environment variables');
    }
    this.heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apikey}`;
  }

  private calculateTokenValue(asset: Asset): {
    name: string;
    image: string;
    symbol: string;
    balance: number;
    decimals: number;
    pricePerToken: number;
    value: number;
    currency: string;
  } | null {
    try {
      const tokenInfo = asset.token_info;
      if (!tokenInfo?.price_info) return null;

      const balance = tokenInfo.balance;
      const decimals = tokenInfo.decimals;
      const pricePerToken = tokenInfo.price_info.price_per_token;
      const currency = tokenInfo.price_info.currency;

      // Calculate actual balance with decimals
      const actualBalance = balance / Math.pow(10, decimals);

      // Calculate value
      const value = actualBalance * pricePerToken;

      return {
        name: asset.content.metadata.name,
        image: asset.content.links.image,
        symbol: asset.content.metadata.symbol,
        balance: actualBalance,
        decimals,
        pricePerToken,
        value,
        currency,
      };
    } catch (error) {
      console.error(
        `Error calculating value for token ${asset.content?.metadata?.symbol}:`,
        error,
      );
      return null;
    }
  }

  async getNativeBalance(
    ownerAddress: string,
  ): Promise<FormattedNativeBalance> {
    try {
      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page: 1,
            limit: 1,
            options: {
              showNativeBalance: true,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch native balance from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as NativeBalanceResponse;

      console.log(data);

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch native balance',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Safely access the native balance data
      const nativeBalanceData = data.result?.nativeBalance;

      if (!nativeBalanceData) {
        throw new HttpException(
          'Native balance data not found in response',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Calculate SOL balance from lamports
      const balanceInSol =
        nativeBalanceData.lamports / Math.pow(10, this.SOL_DECIMALS);

      // Safely get price information
      const pricePerSol = nativeBalanceData.price_per_sol || null;
      const valueInUsd = nativeBalanceData.total_price || null;

      return {
        balance: balanceInSol,
        balanceFormatted: `${balanceInSol.toFixed(4)} SOL`,
        valueInUsd: valueInUsd ? Number(valueInUsd.toFixed(2)) : null,
        pricePerSol: pricePerSol ? Number(pricePerSol.toFixed(2)) : null,
      };
    } catch (error) {
      console.error('Error fetching native balance:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to fetch native balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAsset(params: GetAssetParams) {
    try {
      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAsset',
          params: {
            id: params.id,
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch asset from Helius',
          HttpStatus.NOT_FOUND,
        );
      }

      const data = (await response.json()) as HeliusResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch asset',
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAssetsByOwner(params: GetAssetsByOwnerParams) {
    try {
      const { ownerAddress, page = 1, limit = 100 } = params;

      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page,
            limit,
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch assets from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as GetAssetsByOwnerResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch assets',
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFungibleTokensByOwner(params: GetAssetsByOwnerParams) {
    try {
      const { ownerAddress, page = 1, limit = 100, before, after } = params;

      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Request a larger limit to account for filtering
      const requestLimit = Math.min(1000, limit * 2);
      const validatedPage = Math.max(1, Math.floor(Number(page)));

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page: validatedPage,
            limit: requestLimit,
            before,
            after,
            options: {
              showUnverifiedCollections: false,
              showCollectionMetadata: false,
              showGrandTotal: true,
              showFungible: true,
              showNativeBalance: false,
              showInscription: false,
              showZeroBalance: false,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch fungible tokens from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as GetAssetsByOwnerResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch fungible tokens',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Filter to only include FungibleToken interface
      const fungibleTokens = data.result.items.filter(
        (asset) => asset.interface === 'FungibleToken',
      );

      // Apply the original limit after filtering
      const limitedTokens = fungibleTokens.slice(0, limit);

      return {
        ...data.result,
        items: limitedTokens,
        total: fungibleTokens.length,
        limit: limit,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWalletPortfolioValue(ownerAddress: string): Promise<PortfolioValue> {
    try {
      // Get all fungible tokens
      const response = await this.getFungibleTokensByOwner({
        ownerAddress,
        limit: 1000, // Get maximum tokens to ensure we don't miss any
      });

      // Calculate values for all tokens using reduce for optimal performance
      const { totalValue, tokens } = response.items.reduce(
        (acc, asset) => {
          if (asset.interface !== 'FungibleToken') return acc;

          const tokenValue = this.calculateTokenValue(asset);
          if (!tokenValue) return acc;

          return {
            totalValue: acc.totalValue + tokenValue.value,
            tokens: [...acc.tokens, tokenValue],
          };
        },
        {
          totalValue: 0,
          tokens: [] as Array<ReturnType<typeof this.calculateTokenValue>>,
        },
      );

      return {
        totalValue: Number(totalValue.toFixed(2)), // Round to 2 decimal places
        tokens: tokens.filter(Boolean).sort((a, b) => b!.value - a!.value), // Sort by value descending
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPortfolioAnalysis(ownerAddress: string): Promise<PortfolioSummary> {
    try {
      const portfolio = await this.getWalletPortfolioValue(ownerAddress);

      return {
        summary: {
          totalValue: portfolio.totalValue,
          tokenCount: portfolio.tokens.length,
          primaryCurrency: portfolio.tokens[0]?.currency || 'USDC',
        },
        detail: {
          tokens: portfolio.tokens.map((token) => ({
            ...token,
            percentOfPortfolio:
              ((token.value / portfolio.totalValue) * 100).toFixed(2) + '%',
          })),
        },
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCompleteWalletBalance(ownerAddress: string): Promise<{
    nativeBalance: FormattedNativeBalance;
    tokenPortfolio: PortfolioValue;
    totalValueUsd: number;
  }> {
    try {
      const [nativeBalance, tokenPortfolio] = await Promise.all([
        this.getNativeBalance(ownerAddress),
        this.getWalletPortfolioValue(ownerAddress),
      ]);

      return {
        nativeBalance,
        tokenPortfolio,
        totalValueUsd: Number(
          (nativeBalance.valueInUsd + tokenPortfolio.totalValue).toFixed(2),
        ),
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
