// actions.controller.ts
import {
  Controller,
  Post,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Get,
  Param,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import {
  AirdropCostEstimate,
  AirdropOptions,
  AirdropResponse,
  BaseOptions,
  CollectionDeployment,
  CollectionOptions,
  FaucetResponse,
  ImageGenerationResponse,
  ImageSize,
  LendingOptions,
  LendingResponse,
  MintCollectionNFTResponse,
  MintNFTOptions,
  NFTListingOptions,
  NFTListingResponse,
  PumpfunLaunchResponse,
  PumpFunTokenOptions,
  RPSGameOptions,
  RPSGameResponse,
  StakeOptions,
  StakeResponse,
  TipLinkOptions,
  TipLinkResponse,
  TokenCheck,
  TradeOptions,
  TradeResponse,
  TransferOptions,
  TransferResponse,
} from './actions.types';
import { Keypair, PublicKey } from '@solana/web3.js';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post('create/image')
  async generateImage(
    @Body('prompt') prompt: string,
    @Query('size') size: ImageSize = '1024x1024',
    @Query('count', new DefaultValuePipe(1), ParseIntPipe) count: number,
  ): Promise<ImageGenerationResponse> {
    return this.actionsService.generateImage(prompt, size, count);
  }

  @Post('create/tiplink')
  async createTipLink(
    @Body()
    body: {
      walletAddress: string;
      walletKeypair: string;
      options: TipLinkOptions;
    },
  ): Promise<TipLinkResponse> {
    const walletAddress = new PublicKey(body.walletAddress);
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.createTipLink(
      walletAddress,
      walletKeypair,
      body.options,
    );
  }

  @Post('deploy/collection')
  async deployCollection(
    @Body() body: { walletKeypair: string; options: CollectionOptions },
  ): Promise<CollectionDeployment> {
    // Convert JSON string to Keypair
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.deployCollection(walletKeypair, body.options);
  }

  @Post('launch/pumpfun')
  async launchPumpFunToken(
    @Body()
    body: {
      tokenName: string;
      tokenTicker: string;
      description: string;
      createAndBuy: boolean;
    },
  ): Promise<any> {
    //validate user sesh
    return {
      tokenName: body.tokenName,
      tokenTicker: body.tokenTicker,
      creatAndBuy: body.createAndBuy,
      description: body.description,
    };
  }

  @Post('launch/pumpfun/tx')
  async launchPumpFunTokenTx(
    @Body()
    body: {
      user: string;
      options: {
        tokenName: string;
        tokenTicker: string;
        description: string;
        imageUrl: string;
      } & PumpFunTokenOptions;
    },
  ): Promise<PumpfunLaunchResponse> {
    //validate user sesh
    return this.actionsService.launchPumpFunToken(body.user, body.options);
  }

  @Post('lend/usdc')
  async lendAsset(@Body() body: LendingOptions): Promise<any> {
    return {
      amount: body.amount,
    };
  }

  @Post('lend/usdc/tx')
  async lendAssetTx(
    @Body() body: { user: string; options: LendingOptions },
  ): Promise<LendingResponse> {
    return this.actionsService.lendAsset(body.user, body.options);
  }

  @Post('mint/collection-nft')
  async mintCollectionNFT(
    @Body() body: { walletKeypair: string; options: MintNFTOptions },
  ): Promise<MintCollectionNFTResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.mintCollectionNFT(walletKeypair, body.options);
  }

  @Post('faucet/request')
  async requestFaucetFunds(
    @Body() body: { walletKeypair: string; amount?: number },
  ): Promise<FaucetResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.requestFaucetFunds(walletKeypair, body.amount);
  }

  @Get('token/check/summary/:mint')
  async getTokenReportSummary(
    @Param('mint') mint: string,
  ): Promise<TokenCheck> {
    return this.actionsService.getTokenReportSummary(mint);
  }

  @Get('token/check/detailed/:mint?/:symbol?')
  async getTokenDetailedReport(
    @Param('mint') mint: string,
    @Param('symbol') symbol?: string,
  ): Promise<TokenCheck> {
    if (!mint && !symbol) {
      throw new HttpException(
        'Either mint address or symbol must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.actionsService.getTokenDetailedReport(mint, symbol);
  }

  @Post('airdrop/compressed')
  async sendCompressedAirdrop(
    @Body() body: { walletKeypair: string; options: AirdropOptions },
  ): Promise<AirdropResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.sendCompressedAirdrop(
      walletKeypair,
      body.options,
    );
  }

  @Get('airdrop/estimate')
  getAirdropCostEstimate(
    @Query('recipients', ParseIntPipe) numberOfRecipients: number,
    @Query('priorityFee', ParseIntPipe) priorityFeeInLamports: number,
  ): AirdropCostEstimate {
    return this.actionsService.getAirdropCostEstimate(
      numberOfRecipients,
      priorityFeeInLamports,
    );
  }

  @Post('stake/jup')
  async stakeWithJup(
    @Body() body: { walletKeypair: string; options: StakeOptions },
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.stakeWithJup(walletKeypair, body.options);
  }

  @Post('stake/solayer')
  async stakeWithSolayer(
    @Body() body: { walletKeypair: string; options: StakeOptions },
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.stakeWithSolayer(walletKeypair, body.options);
  }

  @Post('nft/list')
  async listNFTForSale(
    @Body() body: { walletKeypair: string; options: NFTListingOptions },
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.listNFTForSale(walletKeypair, body.options);
  }

  @Post('nft/cancel')
  async cancelNFTListing(
    @Body()
    body: {
      walletKeypair: string;
      options: { nftMint: string } & BaseOptions;
    },
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.cancelNFTListing(walletKeypair, body.options);
  }

  @Post('trade/swap')
  async tradeTokens(@Body() tradeData: TradeOptions): Promise<any> {
    return {
      outputMint: tradeData.outputMint,
      inputMint: tradeData.inputMint,
      inputAmount: tradeData.inputAmount,
    };
  }

  @Post('trade/swap/tx')
  async tradeTokensTx(
    @Body() body: { user: string; options: TradeOptions },
  ): Promise<TradeResponse> {
    return this.actionsService.tradeTokensTx(body.user, body.options);
  }

  @Post('transfer')
  async transferTokens(@Body() body: TransferOptions): Promise<any> {
    return {
      recipient: body.recipient,
      mintAddress: body.mintAddress,
      amount: body.amount,
    };
  }

  @Post('transfer/tx')
  async transferTokensTx(
    @Body() body: { user: string; options: TransferOptions },
  ): Promise<TransferResponse> {
    return this.actionsService.transferTokens(body.user, body.options);
  }

  @Post('game/rps')
  async playRockPaperScissors(
    @Body() body: { walletKeypair: string; options: RPSGameOptions },
  ): Promise<RPSGameResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.playRockPaperScissors(
      walletKeypair,
      body.options,
    );
  }
}
