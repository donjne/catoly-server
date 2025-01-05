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
  FormattedNativeBalance,
  PortfolioSummary,
  PortfolioValue,
} from './das.types';

@Controller('das')
export class DasController {
  constructor(private readonly dasService: DasService) {}

  @Get(':id')
  async getAsset(@Param('id') id: string) {
    return this.dasService.getAsset({ id });
  }

  @Get('owner/:address')
  async getAssetsByOwner(
    @Param('address') ownerAddress: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.dasService.getAssetsByOwner({
      ownerAddress,
      page,
      limit,
    });
  }

  @Get('fungible/:address')
  async getFungibleTokensByOwner(
    @Param('address') ownerAddress: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.dasService.getFungibleTokensByOwner({
      ownerAddress,
      page,
      limit,
      before,
      after,
    });
  }

  @Get('spl-portfolio/:address')
  async getPortfolioValue(
    @Param('address') ownerAddress: string,
    @Query('detailed', new DefaultValuePipe(false), ParseBoolPipe)
    detailed: boolean,
  ): Promise<PortfolioValue | PortfolioSummary> {
    return detailed
      ? this.dasService.getPortfolioAnalysis(ownerAddress)
      : this.dasService.getWalletPortfolioValue(ownerAddress);
  }

  @Get('native-balance/:address')
  async getNativeBalance(
    @Param('address') ownerAddress: string,
  ): Promise<FormattedNativeBalance> {
    return this.dasService.getNativeBalance(ownerAddress);
  }

  @Get('portfolio/:address')
  async getCompleteBalance(@Param('address') ownerAddress: string) {
    return this.dasService.getCompleteWalletBalance(ownerAddress);
  }
}
