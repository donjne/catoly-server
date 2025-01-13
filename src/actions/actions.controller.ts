// actions.controller.ts
import { Controller, Post, Body, Query, DefaultValuePipe, ParseIntPipe, Get, Param } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { AirdropCostEstimate, AirdropOptions, AirdropResponse, CollectionDeployment, CollectionOptions, FaucetResponse, ImageGenerationResponse, ImageSize, LendingResponse, MintCollectionNFTResponse, NFTListingResponse, NFTMetadata, PumpfunLaunchResponse, PumpFunTokenOptions, StakeResponse, TipLinkResponse, TokenCheck, TradeResponse, TransferResponse } from './actions.types';
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
    @Body() body: {
      walletAddress: string;
      walletKeypair: string;
      amount: number;
      splMintAddress?: string;
    }
  ): Promise<TipLinkResponse> {
    const walletAddress = new PublicKey(body.walletAddress);
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );
    
    return this.actionsService.createTipLink(
      walletAddress,
      walletKeypair,
      body.amount,
      body.splMintAddress
    );
  }

  @Post('deploy/collection')
  async deployCollection(
    @Body() body: {
      walletKeypair: string;
      options: CollectionOptions;
    }
  ): Promise<CollectionDeployment> {
    // Convert JSON string to Keypair
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.deployCollection(
      walletKeypair,
      body.options
    );
  }

  @Post('launch/pumpfun')
async launchPumpFunToken(
  @Body() body: {
    walletKeypair: string;
    tokenName: string;
    tokenTicker: string;
    description: string;
    imageUrl: string;
    options?: PumpFunTokenOptions;
  }
): Promise<PumpfunLaunchResponse> {
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(body.walletKeypair))
  );

  return this.actionsService.launchPumpFunToken(
    walletKeypair,
    body.tokenName,
    body.tokenTicker,
    body.description,
    body.imageUrl,
    body.options
  );
}

  @Post('lend/usdc')
  async lendAsset(
    @Body() body: {
      walletKeypair: string;
      amount: number;
    }
  ): Promise<LendingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.lendAsset(
      walletKeypair,
      body.amount
    );
  }

  @Post('mint/collection-nft')
  async mintCollectionNFT(
    @Body() body: {
      walletKeypair: string;
      collectionAddress: string;
      metadata: NFTMetadata;
      recipientAddress?: string;
    }
  ): Promise<MintCollectionNFTResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.mintCollectionNFT(
      walletKeypair,
      body.collectionAddress,
      body.metadata,
      body.recipientAddress
    );
  }

  @Post('faucet/request')
  async requestFaucetFunds(
    @Body() body: {
      walletKeypair: string;
      amount?: number;
    }
  ): Promise<FaucetResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.requestFaucetFunds(
      walletKeypair,
      body.amount
    );
  }

  @Get('token/check/summary/:mint')
  async getTokenReportSummary(
    @Param('mint') mint: string
  ): Promise<TokenCheck> {
    return this.actionsService.getTokenReportSummary(mint);
  }

  @Get('token/check/detailed/:mint')
  async getTokenDetailedReport(
    @Param('mint') mint: string
  ): Promise<TokenCheck> {
    return this.actionsService.getTokenDetailedReport(mint);
  }

  @Post('airdrop/compressed')
  async sendCompressedAirdrop(
    @Body() body: {
      walletKeypair: string;
      options: AirdropOptions;
    }
  ): Promise<AirdropResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.sendCompressedAirdrop(
      walletKeypair,
      body.options
    );
  }

  @Get('airdrop/estimate')
  getAirdropCostEstimate(
    @Query('recipients', ParseIntPipe) numberOfRecipients: number,
    @Query('priorityFee', ParseIntPipe) priorityFeeInLamports: number,
  ): AirdropCostEstimate {
    return this.actionsService.getAirdropCostEstimate(
      numberOfRecipients,
      priorityFeeInLamports
    );
  }

  @Post('stake/jup')
  async stakeWithJup(
    @Body() body: {
      walletKeypair: string;
      amount: number;
    }
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.stakeWithJup(
      walletKeypair,
      body.amount
    );
  }

  @Post('stake/solayer')
  async stakeWithSolayer(
    @Body() body: {
      walletKeypair: string;
      amount: number;
    }
  ): Promise<StakeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.stakeWithSolayer(
      walletKeypair,
      body.amount
    );
  }

  @Post('nft/list')
  async listNFTForSale(
    @Body() body: {
      walletKeypair: string;
      nftMint: string;
      price: number;
    }
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.listNFTForSale(
      walletKeypair,
      body.nftMint,
      body.price
    );
  }

  @Post('nft/cancel')
  async cancelNFTListing(
    @Body() body: {
      walletKeypair: string;
      nftMint: string;
    }
  ): Promise<NFTListingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.cancelNFTListing(
      walletKeypair,
      body.nftMint
    );
  }

  @Post('trade/swap')
  async tradeTokens(
    @Body() body: {
      walletKeypair: string;
      outputMint: string;
      inputAmount: number;
      inputMint?: string;
      slippageBps?: number;
    }
  ): Promise<TradeResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.tradeTokens(
      walletKeypair,
      body.outputMint,
      body.inputAmount,
      body.inputMint,
      body.slippageBps
    );
  }

  @Post('transfer')
  async transferTokens(
    @Body() body: {
      walletKeypair: string;
      recipient: string;
      amount: number;
      mintAddress?: string;
    }
  ): Promise<TransferResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair))
    );

    return this.actionsService.transferTokens(
      walletKeypair,
      body.recipient,
      body.amount,
      body.mintAddress
    );
  }
}