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
import bs58 from 'bs58';

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
      instruction: `This is a request to launch a token on Pump | PumpFun | Pumpdotfun. For this request users must provide the token ticker and the token name but description is optional, they must also indicate whether they want to just create or create and buy. If all the info is provided, direct the user to sign the transaction on the Launch token UI generated`,
      tokenName: body.tokenName,
      tokenTicker: body.tokenTicker,
      description: body.description,
    };
  }

  @Post('launch/pumpfun/tx')
  async launchPumpFunTokenTx(
    @Body()
    body: {
      walletKeypair: string;
      options: {
        tokenName: string;
        tokenTicker: string;
        description: string;
        imageUrl: string;
      } & PumpFunTokenOptions;
    },
  ): Promise<PumpfunLaunchResponse> {
    //validate user sesh
    return this.actionsService.launchPumpFunToken(
      body.walletKeypair,
      body.options,
    );
  }

  @Post('lend/usdc')
  async lendAsset(
    @Body() body: { walletKeypair: string; options: LendingOptions },
  ): Promise<LendingResponse> {
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(body.walletKeypair)),
    );

    return this.actionsService.lendAsset(walletKeypair, body.options);
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

  @Get('token/check/detailed/:mint')
  async getTokenDetailedReport(
    @Param('mint') mint: string,
  ): Promise<TokenCheck> {
    return this.actionsService.getTokenDetailedReport(mint);
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
      instruction: `This the a request to for a swap on Jupiter,  if the user askes to swap tokens both inputMint and outputMint that are not USDC or SOL, please ask the for the mint, the input amount is required and is of type float make sure its valid. OutputMint: is the amount you are swaping to and InputMint is the token you have and want to swap from. If every works well, direct the user to sign the transaction on the Swap UI generated`,
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
    console.log(body);
    return {
      instructions: `This is the request for a transfer of any SPL token, typically SOL or USDC. if the user askes to transfer the tokens, the required information is the amount to be transferred, the recipient's solana publickey and finally the token(mint) to transfer, if you don't know the token by mint you can request for the mint address of the token from the user.`,
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
