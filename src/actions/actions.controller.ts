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
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import {
  AirdropCostEstimate,
  AirdropOptions,
  AirdropResponse,
  CollectionDeployment,
  CollectionOptions,
  FaucetResponse,
  ImageGenerationResponse,
  ImageSize,
  LendingResponse,
  MintCollectionNFTResponse,
  NFTListingResponse,
  NFTMetadata,
  PumpfunLaunchResponse,
  PumpFunTokenOptions,
  RPSGameResponse,
  StakeResponse,
  TipLinkResponse,
  TokenCheck,
  TradeResponse,
  TransferResponse,
} from './actions.types';
import { Keypair, PublicKey } from '@solana/web3.js';
import { FEE_TIERS } from 'src/utils/fee_tiers';
import Decimal from 'decimal.js';
import { BNType } from './actions.types';
import { OrderParams } from './actions.types';

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
      amount: number;
      splMintAddress?: string;
    },
  ): Promise<TipLinkResponse> {
    const walletAddress = new PublicKey(body.walletAddress);
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.createTipLink(
      walletAddress,
      walletKeypair,
      body.amount,
      body.splMintAddress,
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
      walletKeypair: string;
      tokenName: string;
      tokenTicker: string;
      description: string;
      imageUrl: string;
      options?: PumpFunTokenOptions;
    },
  ): Promise<PumpfunLaunchResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.launchPumpFunToken(
      walletKeypair,
      body.tokenName,
      body.tokenTicker,
      body.description,
      body.imageUrl,
      body.options,
    );
  }

  @Post('lend/usdc')
  async lendAsset(
    @Body() body: { walletKeypair: string; amount: number },
  ): Promise<LendingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.lendAsset(walletKeypair, body.amount);
  }

  @Post('mint/collection-nft')
  async mintCollectionNFT(
    @Body()
    body: {
      walletKeypair: string;
      collectionAddress: string;
      metadata: NFTMetadata;
      recipientAddress?: string;
    },
  ): Promise<MintCollectionNFTResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.mintCollectionNFT(
      walletKeypair,
      body.collectionAddress,
      body.metadata,
      body.recipientAddress,
    );
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

  @Get('token/check/detailed/:mint')
  async getTokenDetailedReport(
    @Param('mint') mint: string,
  ): Promise<TokenCheck> {
    return this.actionsService.getTokenDetailedReport(mint);
  }
  b
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
    @Body() body: { walletKeypair: string; amount: number },
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.stakeWithJup(walletKeypair, body.amount);
  }

  @Post('stake/solayer')
  async stakeWithSolayer(
    @Body() body: { walletKeypair: string; amount: number },
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.stakeWithSolayer(walletKeypair, body.amount);
  }

  @Post('nft/list')
  async listNFTForSale(
    @Body() body: { walletKeypair: string; nftMint: string; price: number },
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.listNFTForSale(
      walletKeypair,
      body.nftMint,
      body.price,
    );
  }

  @Post('nft/cancel')
  async cancelNFTListing(
    @Body() body: { walletKeypair: string; nftMint: string },
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.cancelNFTListing(walletKeypair, body.nftMint);
  }

  @Post('trade/swap')
  async tradeTokens(
    @Body()
    body: {
      walletKeypair: string;
      outputMint: string;
      inputAmount: number;
      inputMint?: string;
      slippageBps?: number;
    },
  ): Promise<TradeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.tradeTokens(
      walletKeypair,
      body.outputMint,
      body.inputAmount,
      body.inputMint,
      body.slippageBps,
    );
  }

  @Post('transfer')
  async transferTokens(
    @Body()
    body: {
      walletKeypair: string;
      recipient: string;
      amount: number;
      mintAddress?: string;
    },
  ): Promise<TransferResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.transferTokens(
      walletKeypair,
      body.recipient,
      body.amount,
      body.mintAddress,
    );
  }

  @Post('game/rps')
  async playRockPaperScissors(
    @Body()
    body: {
      walletKeypair: string;
      amount: number;
      choice: 'rock' | 'paper' | 'scissors';
    },
  ): Promise<RPSGameResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );
    return this.actionsService.playRockPaperScissors(
      walletKeypair,
      body.amount,
      body.choice,
    );
  }

  @Post('orca/close-position')
  async orcaClosePosition(
    @Body() body: { walletKeypair: string; positionMintAddress: PublicKey },
  ): Promise<string> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.orcaClosePosition(
      walletKeypair,
      body.positionMintAddress,
    );
  }

  @Post('orca/create-clmm')
  async orcaCreateClMM(
    @Body() body: {
      walletKeypair: string;
      mintDeploy: PublicKey;
      mintPair: PublicKey;
      initialPrice: Decimal;
      feeTier: keyof typeof FEE_TIERS,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.orcaCreateCLMM(
      walletKeypair,
      body.mintDeploy,
      body.mintPair,
      body.initialPrice,
      body.feeTier
    );
  }

  @Post ('orca/create-single-sided-liquidity-pool')
  async orcaCreateSingleSidedLiquidityPool(
    @Body() body:{
      walletKeypair: string,
      depositTokenAmount: number,
      depositTokenMint: PublicKey,
      otherTokenMint: PublicKey,
      initialPrice: Decimal,
      maxPrice: Decimal,
      feeTierBps: keyof typeof FEE_TIERS,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.orcaCreateSingleSidedLiquidityPool(
      walletKeypair,
      body.depositTokenAmount,
      body.depositTokenMint,
      body.otherTokenMint,
      body.initialPrice,
      body.maxPrice,
      body.feeTierBps
    )

  }

  @Get('orca/fetch-positions')
  async orcaFetchPositions(
      @Query('wallet',) wallet: string,
  ){
    
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(wallet)),
    );

    return this.actionsService.orcaFetchPositions(
      walletKeypair,
    )
  }

  @Post('orca/open-centered-positions')
  async orcaOpenCenteredPositions(
      @Body() body:{
        walletKeypair: string,
        whirlpoolAddress: PublicKey,
        priceOffsetBps: number,
        inputTokenMint: PublicKey,
        inputAmount: Decimal,
      }
    ): Promise<string>{
      const walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(body.walletKeypair)),
      );

      return this.actionsService.orcaOpenCenteredPositionWithLiquidity(
        walletKeypair,
        body.whirlpoolAddress,
        body.priceOffsetBps,
        body.inputTokenMint,
        body.inputAmount,
      )
  }

  @Post('orca/open-single-sided-position')
  async orcaOpenSingleSidedPosition(
    @Body() body:{
      walletKeypair: string,
      whirlpoolAddress: PublicKey,
      distanceFromCurrentPriceBps: number,
      widthBps: number,
      inputTokenMint: PublicKey,
      inputAmount: Decimal,
    }
  ): Promise<string>{
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.orcaOpenSingleSidedPositionwithLiquidity(
      walletKeypair,
      body.whirlpoolAddress,
      body.distanceFromCurrentPriceBps,
      body.widthBps,
      body.inputTokenMint,
      body.inputAmount,
    )
  }

  @Post('raydium/create-amm-v4')
  async raydiumCreateAmmV4(
    @Body() body:{
      walletKeypair: string
      marketId: PublicKey,
      baseAmount: BNType,
      quoteAmount: BNType,
      startTime: BNType,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.raydiumCreateAmmV4(
      walletKeypair,
      body.marketId,
      body.baseAmount,
      body.quoteAmount,
      body.startTime
    )
  }

  @Post('raydium/create-clmm')
  async raydiumCreateCLMM(
    @Body() body:{
      walletKeypair:string,
      mint1: PublicKey,
      mint2: PublicKey,
      configId: PublicKey,
      initialPrice: Decimal,
      startTime: BNType,
    }
  ){

    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );
    
    return this.actionsService.raydiumCreateCLMM(
      walletKeypair,
      body.mint1,
      body.mint2,
      body.configId,
      body.initialPrice,
      body.startTime,
    )
  }

  @Post('raydium/create-cpmm')
  async raydiumCreateCPMM(
    @Body() body:{
      walletKeypair: string,
      mintA: PublicKey,
      mintB: PublicKey,
      configId: PublicKey,
      mintAAmount: BNType,
      mintBAmount: BNType,
      startTime: BNType,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.raydiumCreateCPMM(
      walletKeypair,
      body.mintA,
      body.mintB,
      body.configId,
      body.mintAAmount,
      body.mintBAmount,
      body.startTime
    )
    
  }

  @Post('/create-gibwork-task')
  async createGibworkTask(
    @Body() body:{
  walletKeypair: string,
  title: string,
  content: string,
  requirements: string,
  tags: string[],
  tokenMintAddress: PublicKey,
  tokenAmount: number,
  payer?: PublicKey,}
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.createGibworkTask(
      walletKeypair,
      body.title,
      body.content,
      body.requirements,
      body.tags,
      body.tokenMintAddress,
      body.tokenAmount,
      body.payer
    )
  }

  @Post('/manifest/create-market')
  async manifestCreateMarket(
    @Body() body:
    {
    walletKeypair: string,
    baseMint: PublicKey,
    quoteMint: PublicKey,}
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.manifestCreateMarket(
      walletKeypair,
      body.baseMint,
      body.quoteMint
    )
  }

  @Post('manifest/batch-order')
  async manifestBatchOrder(
    @Body() body:{
    walletKeypair: string,
    marketId: PublicKey,
    orders: OrderParams[],
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );
    
    return this.actionsService.manifestBatchOrder(
      walletKeypair,
      body.marketId,
      body.orders
    )
  }

  @Post('manifest/cancel-all-orders')
  async manifestCancelAllOrders(
    @Body() body:{
      walletKeypair: string,
      marketId: PublicKey,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.manifestCancelAllOrders(
      walletKeypair,
      body.marketId
    )
  }

  @Post('manifest/limit-order')
  async manifestLimitOrder(
    @Body() body:{
      walletKeypair: string
      marketId: PublicKey,
      quantity: number,
      side: string,
      price: number,
    }
  ){
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.manifestLimitOrder(
      walletKeypair,
      body.marketId,
      body.quantity,
      body.side,
      body.price
    )
  }

  @Post('/raydium/openbook-create-market')
  async raydiumOpenbookCreateMarket(
      @Body() body:{
        walletKeypair: string,
        baseMint: PublicKey,
        quoteMint: PublicKey,
        lotSize: number,
        tickSize: number ,
      }
    ){
      const walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(body.walletKeypair)),
      );

      return this.actionsService.raydiumOpenbookCreateMarket(
        walletKeypair,
        body.baseMint,
        body.quoteMint,
        body.lotSize,
        body.tickSize
      )
  }

}
