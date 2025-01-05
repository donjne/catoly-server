import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DasService } from 'src/das/das.service';

interface TrendingPool {
  tokenName: string;
  address: string;
  marketCap: number;
  price_change_in_m5: number;
  image?: string;
}

@Injectable()
export class TrendingPoolsService implements OnModuleInit {
  private readonly CACHE_KEY = 'trending_pools';
  private readonly baseUrl = 'https://api.geckoterminal.com/api/v2';
  private isUpdating = false;
  private lastUpdateTime = 0;
  private inMemoryCache: TrendingPool[] | null = null; // Add in-memory cache

  constructor(
    private readonly httpService: HttpService,
    private readonly dasService: DasService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async onModuleInit() {
    console.log('[Init] Starting initial cache population');
    await this.updateCacheInBackground();
    console.log('[Init] Completed initial cache population');
  }

  @Interval(1800000)
  private async scheduledCacheUpdate() {
    const now = Date.now();
    if (this.isUpdating) {
      // console.log('[Schedule] Update already in progress, skipping');
      return;
    }
    if (now - this.lastUpdateTime < 9000) {
      // console.log('[Schedule] Too soon for next update, skipping');
      return;
    }
    // console.log('[Schedule] Starting scheduled update');
    await this.updateCacheInBackground();
  }

  private async updateCacheInBackground() {
    if (this.isUpdating) return;

    try {
      this.isUpdating = true;
      const startTime = Date.now();
      // console.log('[Update] Starting cache update');

      const newData = await this.fetchTrendingPools();
      // console.log('[Update] Fetched new data, getting images');

      const withImages = await this.addImagesForPools(newData);
      // console.log('[Update] Added images, updating cache');

      // Update both caches
      this.inMemoryCache = withImages;
      await this.cache.set(this.CACHE_KEY, withImages, 30000);

      this.lastUpdateTime = Date.now();
      console.log(
        `[Update] Cache update completed in ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      console.error('[Update] Cache update failed:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  async getTrendingPools(): Promise<TrendingPool[]> {
    const startTime = Date.now();
    // console.log('[Get] Starting getTrendingPools request');

    // Tr in-memory cache first
    if (this.inMemoryCache) {
      console.log(
        `[Get] Returning from in-memory cache in ${Date.now() - startTime}ms`,
      );
      return this.inMemoryCache;
    }

    // Try memory cache next
    const cached = await this.cache.get<TrendingPool[]>(this.CACHE_KEY);
    if (cached) {
      this.inMemoryCache = cached; // Update in-memory cache
      // console.log(
      //   `[Get] Returning from cache manager in ${Date.now() - startTime}ms`,
      // );
      return cached;
    }

    // If no cache available and no update in progress, trigger update
    if (!this.isUpdating) {
      // console.log('[Get] Cache miss, triggering background update');
      this.updateCacheInBackground().catch(console.error);
    }

    // Return empty array rather than waiting
    // console.log(
    //   `[Get] No cache available, returning empty in ${Date.now() - startTime}ms`,
    // );
    return [];
  }

  private async fetchTrendingPools(): Promise<TrendingPool[]> {
    const startTime = Date.now();
    // console.log('[Fetch] Starting pool fetch');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/networks/solana/trending_pools`, {
          params: { page: '1' },
        }),
      );

      const pools = response.data?.data.map((pool) => ({
        tokenName: pool.attributes.name,
        address: pool.relationships.base_token.data.id.slice(7),
        marketCap: pool.attributes.fdv_usd,
        price_change_in_m5: pool.attributes.price_change_percentage.m5,
      }));

      console.log(`[Fetch] Completed in ${Date.now() - startTime}ms`);
      return pools;
    } catch (error) {
      console.error('[Fetch] Failed:', error);
      throw error;
    }
  }

  private async addImagesForPools(
    pools: TrendingPool[],
  ): Promise<TrendingPool[]> {
    const startTime = Date.now();
    // console.log('[Images] Starting image fetching');

    const batchSize = 3;
    const results: TrendingPool[] = [];

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      // console.log(`[Images] Processing batch ${Math.floor(i / batchSize) + 1}`);

      const batchResults = await Promise.all(
        batch.map(async (pool) => {
          try {
            const asset = await this.dasService.getAsset({ id: pool.address });
            return { ...pool, image: asset.content?.links?.image || null };
          } catch (error) {
            console.error(`[Images] Failed for ${pool.tokenName}:`, error);
            return pool;
          }
        }),
      );

      results.push(...batchResults);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`[Images] Completed in ${Date.now() - startTime}ms`);
    return results;
  }
}
