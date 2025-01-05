import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  DexScreenerResponse,
  GeckoDexResponse,
  PoolResponse,
  SimplifiedPool,
  TradesResponse,
} from './gecko.types';
import axios from 'axios';
import { DasService } from 'src/das/das.service';

@Injectable()
export class GeckoService {
  private readonly baseUrl = 'https://api.geckoterminal.com/api/v2';
  private readonly dexscreener = 'https://api.dexscreener.com/latest/dex';
  constructor(
    private readonly httpService: HttpService,
    private readonly dasService: DasService,
  ) {}

  async getDexsOnSolana(page: number = 1): Promise<GeckoDexResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<GeckoDexResponse>(
          `${this.baseUrl}/networks/solana/dexes`,
          {
            params: { page },
            headers: {
              Accept: 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Failed to fetch Solana DEXes: ${error.response.data.message}`,
        );
      }
      throw new Error('Failed to fetch Solana DEXes');
    }
  }

  async getPoolsForToken(
    tokenAddress: string,
    page: number = 1,
    include?: string,
    sort: string = 'h24_volume_usd_liquidity_desc',
    detail: boolean | string = false,
  ): Promise<PoolResponse | SimplifiedPool[]> {
    const showDetail = detail === true || detail === 'true';

    try {
      const response = await firstValueFrom(
        this.httpService.get<PoolResponse>(
          `${this.baseUrl}/networks/solana/tokens/${tokenAddress}/pools`,
          {
            params: {
              page,
              include,
              sort,
            },
            headers: {
              Accept: 'application/json',
            },
          },
        ),
      );

      if (!showDetail) {
        return response.data.data.map((pool) => ({
          dex: pool.relationships.dex.data.id,
          address: pool.attributes.address,
          fdv_usd: pool.attributes.fdv_usd,
        }));
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Token not found for address ${tokenAddress}`);
      }
      throw new Error('Failed to fetch Solana token pools');
    }
  }

  async getPoolOhlcvs(
    poolAddress: string,
    timeframe: 'day' | 'hour' | 'minute' = 'day',
    aggregate?: string,
    beforeTimestamp?: string,
    limit?: string,
    currency: 'usd' | 'token' = 'usd',
    token: 'base' | 'quote' | string = 'base',
  ): Promise<PoolResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PoolResponse>(
          `${this.baseUrl}/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}`,
          {
            params: {
              aggregate,
              before_timestamp: beforeTimestamp,
              limit,
              currency,
              token,
            },
            headers: {
              Accept: 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        throw new Error('Pool with more than 2 tokens is not supported');
      }
      throw new Error('Failed to fetch OHLCV data');
    }
  }

  async getTheLastTradesInADay(
    poolAddress: string,
    tradeVolumeInUsdGreaterThan?: number,
  ): Promise<TradesResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TradesResponse>(
          `${this.baseUrl}/networks/solana/pools/${poolAddress}/trades`,
          {
            params: {
              trade_volume_in_usd_greater_than: tradeVolumeInUsdGreaterThan,
            },
            headers: {
              Accept: 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Pool not found');
      }
      throw new Error('Failed to fetch trades data');
    }
  }

  async searchPairs(query: string): Promise<DexScreenerResponse> {
    try {
      const response = await axios.get<DexScreenerResponse>(
        `${this.dexscreener}/search`,
        {
          params: { q: query },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch DEX pairs: ${error.message}`);
    }
  }

  async getOhlcvForToken(
    tokenAddress: string,
    timeframe?: 'day' | 'hour' | 'minute',
  ): Promise<any> {
    try {
      // Cast the response to SimplifiedPool[]
      const pools = (await this.getPoolsForToken(
        tokenAddress,
        1,
      )) as SimplifiedPool[];

      if (pools.length === 0) {
        throw new Error('No pools found for token');
      }

      return await this.getPoolOhlcvs(pools[0].address, timeframe);
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
