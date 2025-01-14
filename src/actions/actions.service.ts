import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
  TokenDeploymentOptions,
  TokenDeploymentResponse,
  TradeResponse,
  TransferResponse,
} from './actions.types';
import { TipLink } from '@tiplink/api';
import {
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  PublicKey,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  VersionedTransaction,
  AddressLookupTableAccount,
  TransactionInstruction,
  TransactionMessage,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  getAccount,
  MintLayout, 
} from '@solana/spl-token';
import {
  generateSigner,
  keypairIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import {
  create,
  createCollection,
  fetchCollection,
  mplCore,
  ruleSet,
} from '@metaplex-foundation/mpl-core';
import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createFungible,
  mintV1,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import {
  buildAndSignTx,
  calculateComputeUnitPrice,
  createRpc,
  Rpc,
  sendAndConfirmTx,
  sleep,
} from '@lightprotocol/stateless.js';
import {
  CompressedTokenProgram,
  createTokenPool,
} from '@lightprotocol/compressed-token';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { BN } from 'bn.js';
import { TensorSwapSDK } from '@tensor-oss/tensorswap-sdk';
import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  WhirlpoolContext,
  buildWhirlpoolClient,
  PDAUtil,
  PriceMath,
  PoolUtil,
  TickUtil,
  TokenExtensionContextForPool,
  NO_TOKEN_EXTENSION_CONTEXT,
  TokenExtensionUtil,
  WhirlpoolIx,
  IncreaseLiquidityQuoteParam,
  increaseLiquidityQuoteByInputTokenWithParams,
  getAllPositionAccountsByOwner,
  increaseLiquidityQuoteByInputToken
} from '@orca-so/whirlpools-sdk';
import { sendTx } from '.././utils/send_tx';
import {
  Percentage,
  resolveOrCreateATAs,
  TransactionBuilder,
} from "@orca-so/common-sdk";
import {
  increaseLiquidityIx,
  increaseLiquidityV2Ix,
  initTickArrayIx,
  openPositionWithTokenExtensionsIx,
} from "@orca-so/whirlpools-sdk/dist/instructions";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {Decimal} from 'decimal.js'
import { FEE_TIERS } from 'src/utils/fee_tiers';
import { PositionDataMap } from './actions.types';
import {
  AMM_V4,
  FEE_DESTINATION_ID,
  MARKET_STATE_LAYOUT_V3,
  OPEN_BOOK_PROGRAM,
  CLMM_PROGRAM_ID,
  CREATE_CPMM_POOL_FEE_ACC,
  CREATE_CPMM_POOL_PROGRAM,
  Raydium,
  TxVersion,
} from "@raydium-io/raydium-sdk-v2";
import { BNType } from './actions.types';
import { GibworkCreateTaskReponse } from './actions.types';
import { ManifestClient,WrapperPlaceOrderParamsExternal, OrderType } from "@cks-systems/manifest-sdk";
import { validateNoCrossedOrders } from 'src/utils/manifest';
import { OrderParams } from './actions.types';
// console.log(ORCA_WHIRLPOOL_PROGRAM_ID)

@Injectable()
export class ActionsService {
  private readonly heliusUrl: string;
  private readonly SOL_DECIMALS = 9;
  private readonly VOTE_PROGRAM_ID = new PublicKey(
    'Vote111111111111111111111111111111111111111',
  );
  private readonly openai: OpenAI;
  private readonly MINIMUM_SOL_BALANCE = 0.003 * LAMPORTS_PER_SOL;
  private readonly RUGCHECK_BASE_URL = 'https://api.rugcheck.xyz/v1';
  private readonly MAX_AIRDROP_RECIPIENTS = 1000;
  private readonly MAX_CONCURRENT_TXS = 30;
  private readonly LOOKUP_TABLE_ADDRESS = new PublicKey(
    '9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ',
  );
  private readonly TOKENS = {
    SOL: new PublicKey('So11111111111111111111111111111111111111112'),
    USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  };

  private readonly DEFAULT_OPTIONS = {
    SLIPPAGE_BPS: 300,
  };

  private readonly JUP_API = 'https://quote-api.jup.ag/v6';
  private readonly JUP_REFERRAL_ADDRESS =
    'jrfva3S8qbHidkk5LuVa1YrCAkiEVNnxj5QkqyEkVBm';

  constructor(private configService: ConfigService) {
    const heliusKey = this.configService.get<string>('HELIUS_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!heliusKey) {
      throw new Error('HELIUS_API_KEY is not defined in environment variables');
    }
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not defined in environment variables');
    }

    this.heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
    this.openai = new OpenAI({
      apiKey: openaiKey,
    });
  }

  async generateImage(
    prompt: string,
    size: ImageSize = '1024x1024',
    count: number = 1,
  ): Promise<ImageGenerationResponse> {
    try {
      if (!prompt) {
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      if (count < 1 || count > 10) {
        throw new HttpException(
          'Number of images must be between 1 and 10',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await this.openai.images.generate({
        prompt,
        n: count,
        size,
      });

      return {
        images: response.data.map((img) => img.url),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof OpenAI.APIError) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }

      throw new HttpException(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTipLink(
    walletAddress: PublicKey,
    walletKeypair: Keypair,
    amount: number,
    splMintAddress?: string,
  ): Promise<TipLinkResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const tiplink = await TipLink.create();

      if (!splMintAddress) {
        // Handle SOL transfer
        const transaction = new Transaction();
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: walletAddress,
            toPubkey: tiplink.keypair.publicKey,
            lamports: amount * LAMPORTS_PER_SOL,
          }),
        );

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [walletKeypair],
          { commitment: 'confirmed' },
        );

        return {
          url: tiplink.url.toString(),
          signature,
        };
      } else {
        // Handle SPL token transfer
        const mintPubkey = new PublicKey(splMintAddress);
        const fromAta = await getAssociatedTokenAddress(
          mintPubkey,
          walletAddress,
        );
        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          tiplink.keypair.publicKey,
        );

        const mintInfo = await getMint(connection, mintPubkey);
        const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);

        const transaction = new Transaction();

        // Add compute budget instruction
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 5000,
          }),
        );

        // Transfer minimum SOL for rent
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: walletAddress,
            toPubkey: tiplink.keypair.publicKey,
            lamports: this.MINIMUM_SOL_BALANCE,
          }),
        );

        // Create ATA for recipient if needed
        transaction.add(
          createAssociatedTokenAccountInstruction(
            walletAddress,
            toAta,
            tiplink.keypair.publicKey,
            mintPubkey,
          ),
        );

        // Transfer tokens
        transaction.add(
          createTransferInstruction(
            fromAta,
            toAta,
            walletAddress,
            adjustedAmount,
          ),
        );

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [walletKeypair],
          { commitment: 'confirmed' },
        );

        return {
          url: tiplink.url.toString(),
          signature,
        };
      }
    } catch (error) {
      console.error('TipLink Creation Error Details:', {
        error,
        message: error.message,
        stack: error.stack,
        walletAddress: walletAddress.toString(),
        amount,
        splMintAddress: splMintAddress || 'none',
      });

      throw new HttpException(
        `Failed to create TipLink: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deployCollection(
    walletKeypair: Keypair,
    options: CollectionOptions,
  ): Promise<CollectionDeployment> {
    try {
      // Initialize Umi with Helius endpoint
      const umi = createUmi(this.heliusUrl).use(mplCore());
      umi.use(keypairIdentity(fromWeb3JsKeypair(walletKeypair)));

      // Generate collection signer
      const collectionSigner = generateSigner(umi);

      // Format creators list
      const formattedCreators = options.creators?.map((creator) => ({
        address: publicKey(creator.address),
        percentage: creator.percentage,
      })) || [
        {
          address: publicKey(walletKeypair.publicKey.toString()),
          percentage: 100,
        },
      ];

      // Validate total percentage equals 100
      const totalPercentage = formattedCreators.reduce(
        (sum, creator) => sum + creator.percentage,
        0,
      );
      if (totalPercentage !== 100) {
        throw new HttpException(
          'Creator percentages must sum to 100',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create collection
      const tx = await createCollection(umi, {
        collection: collectionSigner,
        name: options.name,
        uri: options.uri,
        plugins: [
          {
            type: 'Royalties',
            basisPoints: options.royaltyBasisPoints || 500, // Default 5%
            creators: formattedCreators,
            ruleSet: ruleSet('None'), // Compatibility rule set
          },
        ],
      }).sendAndConfirm(umi);

      return {
        collectionAddress: toWeb3JsPublicKey(collectionSigner.publicKey),
        signature: tx.signature.toString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Collection deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deployToken(
    walletKeypair: Keypair,
    options: TokenDeploymentOptions,
  ): Promise<TokenDeploymentResponse> {
    try {
      // Validate inputs
      if (!options.name || !options.uri || !options.symbol) {
        throw new HttpException(
          'Name, URI, and symbol are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const decimals = options.decimals ?? 9;
      if (decimals < 0 || decimals > 9) {
        throw new HttpException(
          'Decimals must be between 0 and 9',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Initialize Umi
      const umi = createUmi(this.heliusUrl).use(mplToolbox());
      umi.use(keypairIdentity(fromWeb3JsKeypair(walletKeypair)));

      // Generate mint signer
      const mint = generateSigner(umi);

      // Create token builder
      let builder = createFungible(umi, {
        name: options.name,
        uri: options.uri,
        symbol: options.symbol,
        sellerFeeBasisPoints: {
          basisPoints: 0n,
          identifier: '%',
          decimals: 2,
        },
        decimals,
        mint,
      });

      // Add initial supply mint instruction if specified
      if (options.initialSupply) {
        builder = builder.add(
          mintV1(umi, {
            mint: mint.publicKey,
            tokenStandard: TokenStandard.Fungible,
            tokenOwner: fromWeb3JsPublicKey(walletKeypair.publicKey),
            amount: options.initialSupply * Math.pow(10, decimals),
          }),
        );
      }

      // Send and confirm transaction
      await builder.sendAndConfirm(umi, {
        confirm: { commitment: 'finalized' },
      });

      return {
        mint: toWeb3JsPublicKey(mint.publicKey),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Token deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async uploadPumpMetadata(
    tokenName: string,
    tokenTicker: string,
    description: string,
    imageUrl: string,
    options?: PumpFunTokenOptions,
  ): Promise<any> {
    const formData = new URLSearchParams();
    formData.append('name', tokenName);
    formData.append('symbol', tokenTicker);
    formData.append('description', description);
    formData.append('showName', 'true');

    if (options?.twitter) formData.append('twitter', options.twitter);
    if (options?.telegram) formData.append('telegram', options.telegram);
    if (options?.website) formData.append('website', options.website);

    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const files = {
      file: new File([imageBlob], 'token_image.png', { type: 'image/png' }),
    };

    const finalFormData = new FormData();
    for (const [key, value] of formData.entries()) {
      finalFormData.append(key, value);
    }
    if (files?.file) {
      finalFormData.append('file', files.file);
    }

    const metadataResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: finalFormData,
    });

    if (!metadataResponse.ok) {
      throw new HttpException(
        `Metadata upload failed: ${metadataResponse.statusText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return await metadataResponse.json();
  }

  private async createPumpTokenTransaction(
    walletAddress: PublicKey,
    mintKeypair: Keypair,
    metadataResponse: any,
    options?: PumpFunTokenOptions,
  ) {
    const payload = {
      publicKey: walletAddress.toBase58(),
      action: 'create',
      tokenMetadata: {
        name: metadataResponse.metadata.name,
        symbol: metadataResponse.metadata.symbol,
        uri: metadataResponse.metadataUri,
      },
      mint: mintKeypair.publicKey.toBase58(),
      denominatedInSol: 'true',
      amount: options?.initialLiquiditySOL || 0.0001,
      slippage: options?.slippageBps || 5,
      priorityFee: options?.priorityFee || 0.00005,
      pool: 'pump',
    };

    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpException(
        `Transaction creation failed: ${response.status} - ${errorText}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return response;
  }

  private async signAndSendPumpTransaction(
    mintKeypair: Keypair,
    walletKeypair: Keypair,
    tx: VersionedTransaction,
  ): Promise<string> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      tx.message.recentBlockhash = blockhash;
      tx.sign([mintKeypair, walletKeypair]);

      const signature = await connection.sendTransaction(tx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
      });

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new HttpException(
          `Transaction failed: ${confirmation.value.err}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return signature;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async launchPumpFunToken(
    walletKeypair: Keypair,
    tokenName: string,
    tokenTicker: string,
    description: string,
    imageUrl: string,
    options?: PumpFunTokenOptions,
  ): Promise<PumpfunLaunchResponse> {
    try {
      // Input validation
      if (!tokenName || !tokenTicker || !description || !imageUrl) {
        throw new HttpException(
          'Token name, ticker, description, and image URL are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const mintKeypair = Keypair.generate();

      // Upload metadata
      const metadataResponse = await this.uploadPumpMetadata(
        tokenName,
        tokenTicker,
        description,
        imageUrl,
        options,
      );

      // Create transaction
      const response = await this.createPumpTokenTransaction(
        walletKeypair.publicKey,
        mintKeypair,
        metadataResponse,
        options,
      );

      // Process and sign transaction
      const transactionData = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(
        new Uint8Array(transactionData),
      );

      // Sign and send
      const signature = await this.signAndSendPumpTransaction(
        mintKeypair,
        walletKeypair,
        tx,
      );

      return {
        signature,
        mint: mintKeypair.publicKey.toBase58(),
        metadataUri: metadataResponse.metadataUri,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to launch token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async lendAsset(
    walletKeypair: Keypair,
    amount: number,
  ): Promise<LendingResponse> {
    try {
      // Input validation
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Fetch transaction data from Lulo
      const response = await fetch(
        `https://blink.lulo.fi/actions?amount=${amount}&symbol=USDC`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: walletKeypair.publicKey.toBase58(),
          }),
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch transaction from Lulo',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      // Create connection instance
      const connection = new Connection(this.heliusUrl, 'confirmed');

      // Deserialize and prepare transaction
      const luloTxn = VersionedTransaction.deserialize(
        Buffer.from(data.transaction, 'base64'),
      );

      // Get and set recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      luloTxn.message.recentBlockhash = blockhash;

      // Sign transaction
      luloTxn.sign([walletKeypair]);

      // Send transaction
      const signature = await connection.sendTransaction(luloTxn, {
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new HttpException(
          `Transaction failed: ${confirmation.value.err}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Lending failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async mintCollectionNFT(
    walletKeypair: Keypair,
    collectionAddress: string,
    metadata: NFTMetadata,
    recipientAddress?: string,
  ): Promise<MintCollectionNFTResponse> {
    try {
      // Validate inputs
      if (!metadata.name || !metadata.uri) {
        throw new HttpException(
          'Name and URI are required in metadata',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate collection address
      let collectionMint: PublicKey;
      try {
        collectionMint = new PublicKey(collectionAddress);
      } catch {
        throw new HttpException(
          'Invalid collection address',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate recipient address if provided
      let recipient: PublicKey | undefined;
      if (recipientAddress) {
        try {
          recipient = new PublicKey(recipientAddress);
        } catch {
          throw new HttpException(
            'Invalid recipient address',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Validate creator shares if provided
      if (metadata.creators) {
        const totalShares = metadata.creators.reduce(
          (sum, creator) => sum + creator.share,
          0,
        );
        if (totalShares !== 100) {
          throw new HttpException(
            'Creator shares must sum to 100',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Initialize Umi
      const umi = createUmi(this.heliusUrl).use(mplCore());
      umi.use(keypairIdentity(fromWeb3JsKeypair(walletKeypair)));

      // Convert collection mint to UMI format
      const umiCollectionMint = fromWeb3JsPublicKey(collectionMint);

      // Fetch the collection
      const collection = await fetchCollection(umi, umiCollectionMint);

      // Generate new NFT signer
      const assetSigner = generateSigner(umi);

      // Create the NFT
      await create(umi, {
        asset: assetSigner,
        collection: collection,
        name: metadata.name,
        uri: metadata.uri,
        owner: fromWeb3JsPublicKey(recipient ?? walletKeypair.publicKey),
      }).sendAndConfirm(umi);

      return {
        mint: toWeb3JsPublicKey(assetSigner.publicKey),
        metadata: toWeb3JsPublicKey(assetSigner.publicKey),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `NFT minting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async requestFaucetFunds(
    walletKeypair: Keypair,
    amount: number = 5,
  ): Promise<FaucetResponse> {
    try {
      const connection = new Connection(
        // Use devnet URL for faucet
        'https://api.devnet.solana.com',
        'confirmed',
      );

      const signature = await connection.requestAirdrop(
        walletKeypair.publicKey,
        amount * LAMPORTS_PER_SOL,
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new HttpException(
          `Airdrop failed: ${confirmation.value.err}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Faucet request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTokenReportSummary(mint: string): Promise<TokenCheck> {
    try {
      // Validate mint address format
      try {
        new PublicKey(mint);
      } catch {
        throw new HttpException(
          'Invalid mint address format',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(
        `${this.RUGCHECK_BASE_URL}/tokens/${mint}/report/summary`,
      );

      if (!response.ok) {
        throw new HttpException(
          `RugCheck API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch token report summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTokenDetailedReport(mint: string): Promise<TokenCheck> {
    try {
      // Validate mint address format
      try {
        new PublicKey(mint);
      } catch {
        throw new HttpException(
          'Invalid mint address format',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(
        `${this.RUGCHECK_BASE_URL}/tokens/${mint}/report`,
      );

      if (!response.ok) {
        throw new HttpException(
          `RugCheck API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch detailed token report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getAirdropCostEstimate(
    numberOfRecipients: number,
    priorityFeeInLamports: number,
  ): AirdropCostEstimate {
    const baseFee = 5000;
    const perRecipientCompressedStateFee = 300;

    const txsNeeded = Math.ceil(numberOfRecipients / 15);
    const totalPriorityFees = txsNeeded * (baseFee + priorityFeeInLamports);

    return {
      estimatedCost:
        perRecipientCompressedStateFee * numberOfRecipients + totalPriorityFees,
    };
  }

  private async processAirdropBatches(
    walletKeypair: Keypair,
    amount: number,
    mintAddress: PublicKey,
    recipients: PublicKey[],
    priorityFeeInLamports: number,
    shouldLog: boolean,
    connection: Connection,
  ): Promise<string[]> {
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      walletKeypair,
      mintAddress,
      walletKeypair.publicKey,
    );

    const maxRecipientsPerInstruction = 5;
    const maxIxs = 3;

    const lookupTableAccount = (
      await connection.getAddressLookupTable(this.LOOKUP_TABLE_ADDRESS)
    ).value!;

    const batches: PublicKey[][] = [];
    for (
      let i = 0;
      i < recipients.length;
      i += maxRecipientsPerInstruction * maxIxs
    ) {
      batches.push(
        recipients.slice(i, i + maxRecipientsPerInstruction * maxIxs),
      );
    }

    const instructionSets = await Promise.all(
      batches.map(async (recipientBatch) => {
        const instructions: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: calculateComputeUnitPrice(
              priorityFeeInLamports,
              500_000,
            ),
          }),
        ];

        const compressIxPromises = [];
        for (
          let i = 0;
          i < recipientBatch.length;
          i += maxRecipientsPerInstruction
        ) {
          const batch = recipientBatch.slice(
            i,
            i + maxRecipientsPerInstruction,
          );
          compressIxPromises.push(
            CompressedTokenProgram.compress({
              payer: walletKeypair.publicKey,
              owner: walletKeypair.publicKey,
              source: sourceTokenAccount.address,
              toAddress: batch,
              amount: batch.map(() => amount),
              mint: mintAddress,
            }),
          );
        }

        const compressIxs = await Promise.all(compressIxPromises);
        return [...instructions, ...compressIxs];
      }),
    );

    const rpc = createRpc(this.heliusUrl, this.heliusUrl, this.heliusUrl);

    const results = [];
    let confirmedCount = 0;
    const totalBatches = instructionSets.length;

    for (let i = 0; i < instructionSets.length; i += this.MAX_CONCURRENT_TXS) {
      const batchPromises = instructionSets
        .slice(i, i + this.MAX_CONCURRENT_TXS)
        .map((instructions, idx) =>
          this.sendTransactionWithRetry(
            rpc,
            instructions,
            walletKeypair,
            lookupTableAccount,
            i + idx,
          ).then((signature) => {
            confirmedCount++;
            if (shouldLog) {
              console.log(`Processed batch ${confirmedCount}/${totalBatches}`);
            }
            return signature;
          }),
        );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    const failures = results
      .filter((r) => r.status === 'rejected')
      .map((r, idx) => ({
        index: idx,
        error: (r as PromiseRejectedResult).reason,
      }));

    if (failures.length > 0) {
      throw new HttpException(
        `Failed to process ${failures.length} batches: ${failures.map((f) => f.error).join(', ')}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return results.map((r) => (r as PromiseFulfilledResult<string>).value);
  }

  private async sendTransactionWithRetry(
    connection: Rpc,
    instructions: TransactionInstruction[],
    payer: Keypair,
    lookupTableAccount: AddressLookupTableAccount,
    batchIndex: number,
  ): Promise<string> {
    const MAX_RETRIES = 3;
    const INITIAL_BACKOFF = 500;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        const tx = buildAndSignTx(
          instructions,
          payer,
          blockhash,
          [],
          [lookupTableAccount],
        );

        return await sendAndConfirmTx(connection, tx);
      } catch (error) {
        const isRetryable =
          error instanceof Error &&
          (error.message?.includes('blockhash not found') ||
            error.message?.includes('timeout') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('too many requests'));

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          throw new HttpException(
            `Batch ${batchIndex} failed after ${attempt + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            HttpStatus.BAD_GATEWAY,
          );
        }

        const backoff =
          INITIAL_BACKOFF * Math.pow(2, attempt) * (0.5 + Math.random());
        await sleep(backoff);
      }
    }

    throw new Error('Unreachable');
  }

  async sendCompressedAirdrop(
    walletKeypair: Keypair,
    options: AirdropOptions,
  ): Promise<AirdropResponse> {
    try {
      const mintAddress = new PublicKey(options.mintAddress);
      const recipients = options.recipients.map(
        (r) => new PublicKey(r.address),
      );

      if (recipients.length > this.MAX_AIRDROP_RECIPIENTS) {
        throw new HttpException(
          `Max airdrop can be ${this.MAX_AIRDROP_RECIPIENTS} recipients at a time`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const connection = new Connection(this.heliusUrl, 'confirmed');

      // Create token pool if needed
      try {
        await createTokenPool(
          connection as unknown as Rpc,
          walletKeypair,
          mintAddress,
        );
      } catch (error: any) {
        if (!error.message?.includes('already in use')) {
          throw error;
        }
      }

      const signatures = await this.processAirdropBatches(
        walletKeypair,
        options.amount * Math.pow(10, options.decimals),
        mintAddress,
        recipients,
        options.priorityFeeInLamports,
        options.shouldLog || false,
        connection,
      );

      return { signatures };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Airdrop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async executeStakeTransaction(
    walletKeypair: Keypair,
    transactionData: string,
  ): Promise<string> {
    const connection = new Connection(this.heliusUrl, 'confirmed');

    try {
      // Deserialize transaction
      const txn = VersionedTransaction.deserialize(
        Buffer.from(transactionData, 'base64'),
      );

      // Get and set recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      txn.message.recentBlockhash = blockhash;

      // Sign transaction
      txn.sign([walletKeypair]);

      // Send transaction
      const signature = await connection.sendTransaction(txn, {
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new HttpException(
          `Transaction failed: ${confirmation.value.err}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return signature;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async stakeWithJup(
    walletKeypair: Keypair,
    amount: number,
  ): Promise<StakeResponse> {
    try {
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(
        `https://worker.jup.ag/blinks/swap/So11111111111111111111111111111111111111112/jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v/${amount}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: walletKeypair.publicKey.toBase58(),
          }),
        },
      );

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch transaction from Jupiter',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();
      const signature = await this.executeStakeTransaction(
        walletKeypair,
        data.transaction,
      );

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `jupSOL staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async stakeWithSolayer(
    walletKeypair: Keypair,
    amount: number,
  ): Promise<StakeResponse> {
    try {
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(
        `https://app.solayer.org/api/action/restake/ssol?amount=${amount}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: walletKeypair.publicKey.toBase58(),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          errorData.message || 'Failed to fetch transaction from Solayer',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();
      const signature = await this.executeStakeTransaction(
        walletKeypair,
        data.transaction,
      );

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Solayer sSOL staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add to actions.service.ts
  async listNFTForSale(
    walletKeypair: Keypair,
    nftMint: string,
    price: number,
  ): Promise<NFTListingResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const mintPubkey = new PublicKey(nftMint);

      // Validate NFT mint
      if (!PublicKey.isOnCurve(mintPubkey)) {
        throw new HttpException(
          'Invalid NFT mint address',
          HttpStatus.BAD_REQUEST,
        );
      }

      const mintInfo = await connection.getAccountInfo(mintPubkey);
      if (!mintInfo) {
        throw new HttpException(
          `NFT mint ${nftMint} does not exist`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Check ownership
      const ata = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey,
      );
      try {
        const tokenAccount = await getAccount(connection, ata);
        if (!tokenAccount || tokenAccount.amount <= 0) {
          throw new HttpException(
            `You don't own this NFT (${nftMint})`,
            HttpStatus.BAD_REQUEST,
          );
        }
      } catch (error) {
        throw new HttpException(
          `No token account found for mint ${nftMint}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Create TensorSwap SDK instance
      const provider = new AnchorProvider(
        connection,
        new Wallet(walletKeypair),
        AnchorProvider.defaultOptions(),
      );
      const tensorSwapSdk = new TensorSwapSDK({ provider });

      // Setup listing
      const priceInLamports = new BN(price * 1e9);
      const nftSource = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey,
      );

      // Create listing
      const { tx } = await tensorSwapSdk.list({
        nftMint: mintPubkey,
        nftSource,
        owner: walletKeypair.publicKey,
        price: priceInLamports,
        tokenProgram: TOKEN_PROGRAM_ID,
        payer: walletKeypair.publicKey,
      });

      // Send transaction
      const transaction = new Transaction();
      transaction.add(...tx.ixs);
      const signature = await connection.sendTransaction(transaction, [
        walletKeypair,
        ...tx.extraSigners,
      ]);

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `NFT listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancelNFTListing(
    walletKeypair: Keypair,
    nftMint: string,
  ): Promise<NFTListingResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const mintPubkey = new PublicKey(nftMint);

      const provider = new AnchorProvider(
        connection,
        new Wallet(walletKeypair),
        AnchorProvider.defaultOptions(),
      );

      const tensorSwapSdk = new TensorSwapSDK({ provider });
      const nftDest = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey,
        false,
        TOKEN_PROGRAM_ID,
      );

      const { tx } = await tensorSwapSdk.delist({
        nftMint: mintPubkey,
        nftDest,
        owner: walletKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        payer: walletKeypair.publicKey,
        authData: null,
      });

      const transaction = new Transaction();
      transaction.add(...tx.ixs);
      const signature = await connection.sendTransaction(transaction, [
        walletKeypair,
        ...tx.extraSigners,
      ]);

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `NFT listing cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async tradeTokens(
    walletKeypair: Keypair,
    outputMint: string,
    inputAmount: number,
    inputMint?: string,
    slippageBps: number = this.DEFAULT_OPTIONS.SLIPPAGE_BPS,
  ): Promise<TradeResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const outputMintPubkey = new PublicKey(outputMint);
      const inputMintPubkey = inputMint
        ? new PublicKey(inputMint)
        : this.TOKENS.USDC;

      // Check if input token is native SOL
      const isNativeSol = inputMintPubkey.equals(this.TOKENS.SOL);
      const inputDecimals = isNativeSol
        ? 9
        : (await getMint(connection, inputMintPubkey)).decimals;

      // Calculate scaled amount
      const scaledAmount = inputAmount * Math.pow(10, inputDecimals);

      // Get quote
      const quoteResponse = await (
        await fetch(
          `${this.JUP_API}/quote?` +
            `inputMint=${isNativeSol ? this.TOKENS.SOL.toString() : inputMintPubkey.toString()}` +
            `&outputMint=${outputMintPubkey.toString()}` +
            `&amount=${scaledAmount}` +
            `&slippageBps=${slippageBps}` +
            '&onlyDirectRoutes=true' +
            '&maxAccounts=20',
        )
      ).json();

      // Get swap transaction
      const { swapTransaction } = await (
        await fetch(`${this.JUP_API}/swap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteResponse,
            userPublicKey: walletKeypair.publicKey.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
          }),
        })
      ).json();

      // Execute swap
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([walletKeypair]);

      const signature = await connection.sendTransaction(transaction);

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Token swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async transferTokens(
    walletKeypair: Keypair,
    recipient: string,
    amount: number,
    mintAddress?: string,
  ): Promise<TransferResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const recipientPubkey = new PublicKey(recipient);

      let signature: string;

      if (!mintAddress) {
        // Transfer native SOL
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: walletKeypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: amount * LAMPORTS_PER_SOL,
          }),
        );

        signature = await connection.sendTransaction(transaction, [
          walletKeypair,
        ]);
      } else {
        // Transfer SPL token
        const mintPubkey = new PublicKey(mintAddress);
        const fromAta = await getAssociatedTokenAddress(
          mintPubkey,
          walletKeypair.publicKey,
        );
        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey,
        );

        // Get decimals and adjust amount
        const mintInfo = await getMint(connection, mintPubkey);
        const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);

        const transaction = new Transaction().add(
          createTransferInstruction(
            fromAta,
            toAta,
            walletKeypair.publicKey,
            adjustedAmount,
          ),
        );

        signature = await connection.sendTransaction(transaction, [
          walletKeypair,
        ]);
      }

      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async processRPSOutcome(
    walletKeypair: Keypair,
    signature: string,
    href: string,
  ): Promise<string> {
    const res = await fetch('https://rps.sendarcade.fun' + href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletKeypair.publicKey.toBase58(),
        signature,
      }),
    });

    const data = await res.json();
    const title = data.title;

    if (title.startsWith('You lost')) {
      return title;
    }

    const nextHref = data.links?.actions?.[0]?.href;
    return title + '\n' + (await this.processWin(walletKeypair, nextHref));
  }

  private async processWin(
    walletKeypair: Keypair,
    href: string,
  ): Promise<string> {
    // Process win transaction
    const res = await fetch('https://rps.sendarcade.fun' + href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletKeypair.publicKey.toBase58(),
      }),
    });

    const data = await res.json();
    if (data.transaction) {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const txn = Transaction.from(Buffer.from(data.transaction, 'base64'));
      txn.partialSign(walletKeypair);
      await connection.sendRawTransaction(txn.serialize(), {
        preflightCommitment: 'confirmed',
      });
    }

    const nextHref = data.links?.next?.href;
    return await this.processPostWin(walletKeypair, nextHref);
  }

  private async processPostWin(
    walletKeypair: Keypair,
    href: string,
  ): Promise<string> {
    const res = await fetch('https://rps.sendarcade.fun' + href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account: walletKeypair.publicKey.toBase58(),
      }),
    });

    const data = await res.json();
    return 'Prize claimed Successfully\n' + data.title;
  }

  async playRockPaperScissors(
    walletKeypair: Keypair,
    amount: number,
    choice: 'rock' | 'paper' | 'scissors',
  ): Promise<RPSGameResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');

      const res = await fetch(
        `https://rps.sendarcade.fun/api/actions/bot?amount=${amount}&choice=${choice}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account: walletKeypair.publicKey.toBase58(),
          }),
        },
      );

      if (!res.ok) {
        throw new HttpException('Failed to start game', HttpStatus.BAD_GATEWAY);
      }

      const data = await res.json();

      if (!data.transaction) {
        return { outcome: 'failed' };
      }

      const txn = Transaction.from(Buffer.from(data.transaction, 'base64'));
      txn.sign(walletKeypair);
      txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signature = await sendAndConfirmTransaction(
        connection,
        txn,
        [walletKeypair],
        { commitment: 'confirmed' },
      );

      const href = data.links?.next?.href;
      const outcome = await this.processRPSOutcome(
        walletKeypair,
        signature,
        href,
      );

      return { outcome };
    } catch (error) {
      throw new HttpException(
        `RPS game failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async orcaClosePosition(
    walletKeypair: Keypair,
    positionMintAddress: PublicKey,
  ): Promise<string> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const wallet = new Wallet(walletKeypair);
      const ctx = WhirlpoolContext.from(
        connection,
        wallet,
        ORCA_WHIRLPOOL_PROGRAM_ID,
      );
      const client = buildWhirlpoolClient(ctx);

      const positionAddress = PDAUtil.getPosition(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        positionMintAddress,
      );
      const position = await client.getPosition(positionAddress.publicKey);
      const whirlpoolAddress = position.getData().whirlpool;
      const whirlpool = await client.getPool(whirlpoolAddress);
      const txBuilder = await whirlpool.closePosition(
        positionAddress.publicKey,
        Percentage.fromFraction(1, 100),
      );
      const txPayload = await txBuilder[0].build();
      const txPayloadDecompiled = TransactionMessage.decompile(
        (txPayload.transaction as VersionedTransaction).message,
      );
      const instructions = txPayloadDecompiled.instructions;
      const signers = txPayload.signers as Keypair[];

      const txId = await sendTx(
        connection,
        walletKeypair,
        instructions,
        signers,
      );
      return txId;
    } catch (error) {
      throw new HttpException(
        `Closing position failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async orcaCreateCLMM(
    walletKeypair: Keypair,
    mintDeploy: PublicKey,
    mintPair: PublicKey,
    initialPrice: Decimal,
    feeTier: keyof typeof FEE_TIERS,
  ): Promise<string> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      let whirlpoolsConfigAddress: PublicKey;
      if (connection.rpcEndpoint.includes("mainnet")) {
        whirlpoolsConfigAddress = new PublicKey(
          "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ",
        );
      } else if (connection.rpcEndpoint.includes("devnet")) {
        whirlpoolsConfigAddress = new PublicKey(
          "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR",
        );
      } else {
        throw new Error("Unsupported network");
      }
      
      const wallet = new Wallet(walletKeypair);
      const ctx = WhirlpoolContext.from(
        connection,
        wallet,
        ORCA_WHIRLPOOL_PROGRAM_ID,
      );
      const fetcher = ctx.fetcher;
      const client = buildWhirlpoolClient(ctx);
  
      const correctTokenOrder = PoolUtil.orderMints(mintDeploy, mintPair).map(
        (addr) => addr.toString(),
      );
      const isCorrectMintOrder = correctTokenOrder[0] === mintDeploy.toString();
      let mintA;
      let mintB;
      if (!isCorrectMintOrder) {
        [mintA, mintB] = [mintPair, mintDeploy];
        initialPrice = new Decimal(1 / initialPrice.toNumber());
      } else {
        [mintA, mintB] = [mintDeploy, mintPair];
      }
      const mintAAccount = await fetcher.getMintInfo(mintA);
      const mintBAccount = await fetcher.getMintInfo(mintB);
      if (mintAAccount === null || mintBAccount === null) {
        throw Error("Mint account not found");
      }
  
      const tickSpacing = FEE_TIERS[feeTier];
      const initialTick = PriceMath.priceToInitializableTickIndex(
        initialPrice,
        mintAAccount.decimals,
        mintBAccount.decimals,
        tickSpacing,
      );
      const { poolKey, tx: txBuilder } = await client.createPool(
        whirlpoolsConfigAddress,
        mintA,
        mintB,
        tickSpacing,
        initialTick,
        walletKeypair.publicKey,
      );
  
      const txPayload = await txBuilder.build();
      const txPayloadDecompiled = TransactionMessage.decompile(
        (txPayload.transaction as VersionedTransaction).message,
      );
      const instructions = txPayloadDecompiled.instructions;
  
      const txId = await sendTx(
        connection,
        walletKeypair,
        instructions,
        txPayload.signers as Keypair[],
      );
      return JSON.stringify({
        transactionId: txId,
        whirlpoolAddress: poolKey.toString(),
      });
    } catch (error) {
      throw new HttpException(
        `Create CLMM failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
}
  async orcaCreateSingleSidedLiquidityPool(
    walletKeypair: Keypair,
      depositTokenAmount: number,
      depositTokenMint: PublicKey,
      otherTokenMint: PublicKey,
      initialPrice: Decimal,
      maxPrice: Decimal,
      feeTierBps: keyof typeof FEE_TIERS,
  ): Promise<string>{
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      let whirlpoolsConfigAddress: PublicKey;
      if (connection.rpcEndpoint.includes("mainnet")) {
        whirlpoolsConfigAddress = new PublicKey(
          "2LecshUwdy9xi7meFgHtFJQNSKk4KdTrcpvaB56dP2NQ",
        );
      } else if (connection.rpcEndpoint.includes("devnet")) {
        whirlpoolsConfigAddress = new PublicKey(
          "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR",
        );
      } else {
        throw new Error("Unsupported network");
      }
      
      const wallet = new Wallet(walletKeypair);
      const ctx = WhirlpoolContext.from(
        connection,
        wallet,
        ORCA_WHIRLPOOL_PROGRAM_ID,
      );
      const fetcher = ctx.fetcher;
  
      const correctTokenOrder = PoolUtil.orderMints(
        otherTokenMint,
        depositTokenMint,
      ).map((addr) => addr.toString());
      const isCorrectMintOrder =
        correctTokenOrder[0] === depositTokenMint.toString();
      let mintA, mintB;
      if (isCorrectMintOrder) {
        [mintA, mintB] = [depositTokenMint, otherTokenMint];
      } else {
        [mintA, mintB] = [otherTokenMint, depositTokenMint];
        initialPrice = new Decimal(1 / initialPrice.toNumber());
        maxPrice = new Decimal(1 / maxPrice.toNumber());
      }
      const mintAAccount = await fetcher.getMintInfo(mintA);
      const mintBAccount = await fetcher.getMintInfo(mintB);
      if (mintAAccount === null || mintBAccount === null) {
        throw Error("Mint account not found");
      }
      const tickSpacing = FEE_TIERS[feeTierBps];
      const tickIndex = PriceMath.priceToTickIndex(
        initialPrice,
        mintAAccount.decimals,
        mintBAccount.decimals,
      );
      const initialTick = TickUtil.getInitializableTickIndex(
        tickIndex,
        tickSpacing,
      );
  
      const tokenExtensionCtx: TokenExtensionContextForPool = {
        ...NO_TOKEN_EXTENSION_CONTEXT,
        tokenMintWithProgramA: mintAAccount,
        tokenMintWithProgramB: mintBAccount,
      };
      const feeTierKey = PDAUtil.getFeeTier(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolsConfigAddress,
        tickSpacing,
      ).publicKey;
      const initSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(initialTick);
      const tokenVaultAKeypair = Keypair.generate();
      const tokenVaultBKeypair = Keypair.generate();
      const whirlpoolPda = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolsConfigAddress,
        mintA,
        mintB,
        FEE_TIERS[feeTierBps],
      );
      const tokenBadgeA = PDAUtil.getTokenBadge(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolsConfigAddress,
        mintA,
      ).publicKey;
      const tokenBadgeB = PDAUtil.getTokenBadge(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        whirlpoolsConfigAddress,
        mintB,
      ).publicKey;
      const baseParamsPool = {
        initSqrtPrice,
        whirlpoolsConfig: whirlpoolsConfigAddress,
        whirlpoolPda,
        tokenMintA: mintA,
        tokenMintB: mintB,
        tokenVaultAKeypair,
        tokenVaultBKeypair,
        feeTierKey,
        tickSpacing: tickSpacing,
        funder: walletKeypair.publicKey,
      };
      const initPoolIx = !TokenExtensionUtil.isV2IxRequiredPool(tokenExtensionCtx)
        ? WhirlpoolIx.initializePoolIx(ctx.program, baseParamsPool)
        : WhirlpoolIx.initializePoolV2Ix(ctx.program, {
            ...baseParamsPool,
            tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
            tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
            tokenBadgeA,
            tokenBadgeB,
          });
      const initialTickArrayStartTick = TickUtil.getStartTickIndex(
        initialTick,
        tickSpacing,
      );
      const initialTickArrayPda = PDAUtil.getTickArray(
        ctx.program.programId,
        whirlpoolPda.publicKey,
        initialTickArrayStartTick,
      );
  
      const txBuilder = new TransactionBuilder(
        ctx.provider.connection,
        ctx.provider.wallet,
        ctx.txBuilderOpts,
      );
      txBuilder.addInstruction(initPoolIx);
      txBuilder.addInstruction(
        initTickArrayIx(ctx.program, {
          startTick: initialTickArrayStartTick,
          tickArrayPda: initialTickArrayPda,
          whirlpool: whirlpoolPda.publicKey,
          funder: walletKeypair.publicKey,
        }),
      );
  
      let tickLowerIndex, tickUpperIndex;
      if (isCorrectMintOrder) {
        tickLowerIndex = initialTick;
        tickUpperIndex = PriceMath.priceToTickIndex(
          maxPrice,
          mintAAccount.decimals,
          mintBAccount.decimals,
        );
      } else {
        tickLowerIndex = PriceMath.priceToTickIndex(
          maxPrice,
          mintAAccount.decimals,
          mintBAccount.decimals,
        );
        tickUpperIndex = initialTick;
      }
      const tickLowerInitializableIndex = TickUtil.getInitializableTickIndex(
        tickLowerIndex,
        tickSpacing,
      );
      const tickUpperInitializableIndex = TickUtil.getInitializableTickIndex(
        tickUpperIndex,
        tickSpacing,
      );
      if (
        !TickUtil.checkTickInBounds(tickLowerInitializableIndex) ||
        !TickUtil.checkTickInBounds(tickUpperInitializableIndex)
      ) {
        throw Error("Prices out of bounds");
      }
      depositTokenAmount = isCorrectMintOrder
        ? depositTokenAmount * Math.pow(10, mintAAccount.decimals)
        : depositTokenAmount * Math.pow(10, mintBAccount.decimals);
      const increasLiquidityQuoteParam: IncreaseLiquidityQuoteParam = {
        inputTokenAmount: new BN(depositTokenAmount),
        inputTokenMint: depositTokenMint,
        tokenMintA: mintA,
        tokenMintB: mintB,
        tickCurrentIndex: initialTick,
        sqrtPrice: initSqrtPrice,
        tickLowerIndex: tickLowerInitializableIndex,
        tickUpperIndex: tickUpperInitializableIndex,
        tokenExtensionCtx: tokenExtensionCtx,
        slippageTolerance: Percentage.fromFraction(0, 100),
      };
      const liquidityInput = increaseLiquidityQuoteByInputTokenWithParams(
        increasLiquidityQuoteParam,
      );
      const { liquidityAmount: liquidity, tokenMaxA, tokenMaxB } = liquidityInput;
  
      const positionMintKeypair = Keypair.generate();
      const positionMintPubkey = positionMintKeypair.publicKey;
      const positionPda = PDAUtil.getPosition(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        positionMintPubkey,
      );
      const positionTokenAccountAddress = getAssociatedTokenAddressSync(
        positionMintPubkey,
        walletKeypair.publicKey,
        ctx.accountResolverOpts.allowPDAOwnerAddress,
        TOKEN_2022_PROGRAM_ID,
      );
      const params = {
        funder: walletKeypair.publicKey,
        owner: walletKeypair.publicKey,
        positionPda,
        positionTokenAccount: positionTokenAccountAddress,
        whirlpool: whirlpoolPda.publicKey,
        tickLowerIndex: tickLowerInitializableIndex,
        tickUpperIndex: tickUpperInitializableIndex,
      };
      const positionIx = openPositionWithTokenExtensionsIx(ctx.program, {
        ...params,
        positionMint: positionMintPubkey,
        withTokenMetadataExtension: true,
      });
  
      txBuilder.addInstruction(positionIx);
      txBuilder.addSigner(positionMintKeypair);
  
      const [ataA, ataB] = await resolveOrCreateATAs(
        ctx.connection,
        walletKeypair.publicKey,
        [
          { tokenMint: mintA, wrappedSolAmountIn: tokenMaxA },
          { tokenMint: mintB, wrappedSolAmountIn: tokenMaxB },
        ],
        () => ctx.fetcher.getAccountRentExempt(),
        walletKeypair.publicKey,
        undefined,
        ctx.accountResolverOpts.allowPDAOwnerAddress,
        "ata",
      );
      const { address: tokenOwnerAccountA, ...tokenOwnerAccountAIx } = ataA;
      const { address: tokenOwnerAccountB, ...tokenOwnerAccountBIx } = ataB;
  
      txBuilder.addInstruction(tokenOwnerAccountAIx);
      txBuilder.addInstruction(tokenOwnerAccountBIx);
  
      const tickArrayLowerStartIndex = TickUtil.getStartTickIndex(
        tickLowerInitializableIndex,
        tickSpacing,
      );
      const tickArrayUpperStartIndex = TickUtil.getStartTickIndex(
        tickUpperInitializableIndex,
        tickSpacing,
      );
      const tickArrayLowerPda = PDAUtil.getTickArray(
        ctx.program.programId,
        whirlpoolPda.publicKey,
        tickArrayLowerStartIndex,
      );
      const tickArrayUpperPda = PDAUtil.getTickArray(
        ctx.program.programId,
        whirlpoolPda.publicKey,
        tickArrayUpperStartIndex,
      );
      if (tickArrayUpperStartIndex !== tickArrayLowerStartIndex) {
        if (isCorrectMintOrder) {
          txBuilder.addInstruction(
            initTickArrayIx(ctx.program, {
              startTick: tickArrayUpperStartIndex,
              tickArrayPda: tickArrayUpperPda,
              whirlpool: whirlpoolPda.publicKey,
              funder: walletKeypair.publicKey,
            }),
          );
        } else {
          txBuilder.addInstruction(
            initTickArrayIx(ctx.program, {
              startTick: tickArrayLowerStartIndex,
              tickArrayPda: tickArrayLowerPda,
              whirlpool: whirlpoolPda.publicKey,
              funder: walletKeypair.publicKey,
            }),
          );
        }
      }
  
      const baseParamsLiquidity = {
        liquidityAmount: liquidity,
        tokenMaxA,
        tokenMaxB,
        whirlpool: whirlpoolPda.publicKey,
        positionAuthority: walletKeypair.publicKey,
        position: positionPda.publicKey,
        positionTokenAccount: positionTokenAccountAddress,
        tokenOwnerAccountA,
        tokenOwnerAccountB,
        tokenVaultA: tokenVaultAKeypair.publicKey,
        tokenVaultB: tokenVaultBKeypair.publicKey,
        tickArrayLower: tickArrayLowerPda.publicKey,
        tickArrayUpper: tickArrayUpperPda.publicKey,
      };
  
      const liquidityIx = !TokenExtensionUtil.isV2IxRequiredPool(
        tokenExtensionCtx,
      )
        ? increaseLiquidityIx(ctx.program, baseParamsLiquidity)
        : increaseLiquidityV2Ix(ctx.program, {
            ...baseParamsLiquidity,
            tokenMintA: mintA,
            tokenMintB: mintB,
            tokenProgramA: tokenExtensionCtx.tokenMintWithProgramA.tokenProgram,
            tokenProgramB: tokenExtensionCtx.tokenMintWithProgramB.tokenProgram,
          });
      txBuilder.addInstruction(liquidityIx);
  
      const txPayload = await txBuilder.build();
      const instructions = TransactionMessage.decompile(
        (txPayload.transaction as VersionedTransaction).message,
      ).instructions;
  
      const txId = await sendTx(connection, walletKeypair, instructions, [
        positionMintKeypair,
        tokenVaultAKeypair,
        tokenVaultBKeypair,
      ]);
      return txId;
    } catch (error) {
      throw new HttpException(
        `Create Single Sided Liquidity Pool failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async orcaFetchPositions(
    walletKeypair,
  ): Promise<string>{
    try{
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const ctx = WhirlpoolContext.from(
      connection,
      walletKeypair.publicKey,
      ORCA_WHIRLPOOL_PROGRAM_ID,
    );
    const client = buildWhirlpoolClient(ctx);

    const positions = await getAllPositionAccountsByOwner({
      ctx,
      owner: walletKeypair.publicKey,
    });
    const positionDatas = [
      ...positions.positions.entries(),
      ...positions.positionsWithTokenExtensions.entries(),
    ];
    const result: PositionDataMap = {};
    for (const [, positionData] of positionDatas) {
      const positionMintAddress = positionData.positionMint;
      const whirlpoolAddress = positionData.whirlpool;
      const whirlpool = await client.getPool(whirlpoolAddress);
      const whirlpoolData = whirlpool.getData();
      const sqrtPrice = whirlpoolData.sqrtPrice;
      const currentTick = whirlpoolData.tickCurrentIndex;
      const mintA = whirlpool.getTokenAInfo();
      const mintB = whirlpool.getTokenBInfo();
      const currentPrice = PriceMath.sqrtPriceX64ToPrice(
        sqrtPrice,
        mintA.decimals,
        mintB.decimals,
      );
      const lowerTick = positionData.tickLowerIndex;
      const upperTick = positionData.tickUpperIndex;
      const lowerPrice = PriceMath.tickIndexToPrice(
        lowerTick,
        mintA.decimals,
        mintB.decimals,
      );
      const upperPrice = PriceMath.tickIndexToPrice(
        upperTick,
        mintA.decimals,
        mintB.decimals,
      );
      const centerPosition = lowerPrice.add(upperPrice).div(2);

      const positionInRange =
        currentTick > lowerTick && currentTick < upperTick ? true : false;
      const distanceFromCenterBps = Math.ceil(
        currentPrice
          .sub(centerPosition)
          .abs()
          .div(centerPosition)
          .mul(10000)
          .toNumber(),
      );

      result[positionMintAddress.toString()] = {
        whirlpoolAddress: whirlpoolAddress.toString(),
        positionInRange,
        distanceFromCenterBps,
      };
    }
    return JSON.stringify(result);
  } catch (error) {
    console.log(error)
    throw new HttpException(
      `Fetch Positions failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  }
  
  async orcaOpenCenteredPositionWithLiquidity(
    walletKeypair: Keypair,
    whirlpoolAddress: PublicKey,
    priceOffsetBps: number,
    inputTokenMint: PublicKey,
    inputAmount: Decimal,
  ): Promise<string> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const wallet = new Wallet(walletKeypair);
      const ctx = WhirlpoolContext.from(
        connection,
        wallet,
        ORCA_WHIRLPOOL_PROGRAM_ID,
      );
      const client = buildWhirlpoolClient(ctx);
  
      const whirlpool = await client.getPool(whirlpoolAddress);
      const whirlpoolData = whirlpool.getData();
      const mintInfoA = whirlpool.getTokenAInfo();
      const mintInfoB = whirlpool.getTokenBInfo();
      const price = PriceMath.sqrtPriceX64ToPrice(
        whirlpoolData.sqrtPrice,
        mintInfoA.decimals,
        mintInfoB.decimals,
      );
  
      const lowerPrice = price.mul(1 - priceOffsetBps / 10000);
      const upperPrice = price.mul(1 + priceOffsetBps / 10000);
      const lowerTick = PriceMath.priceToInitializableTickIndex(
        lowerPrice,
        mintInfoA.decimals,
        mintInfoB.decimals,
        whirlpoolData.tickSpacing,
      );
      const upperTick = PriceMath.priceToInitializableTickIndex(
        upperPrice,
        mintInfoA.decimals,
        mintInfoB.decimals,
        whirlpoolData.tickSpacing,
      );
  
      const txBuilderTickArrays = await whirlpool.initTickArrayForTicks([
        lowerTick,
        upperTick,
      ]);
      let instructions: TransactionInstruction[] = [];
      let signers: Keypair[] = [];
      if (txBuilderTickArrays !== null) {
        const txPayloadTickArrays = await txBuilderTickArrays.build();
        const txPayloadTickArraysDecompiled = TransactionMessage.decompile(
          (txPayloadTickArrays.transaction as VersionedTransaction).message,
        );
        const instructionsTickArrays = txPayloadTickArraysDecompiled.instructions;
        instructions = instructions.concat(instructionsTickArrays);
        signers = signers.concat(txPayloadTickArrays.signers as Keypair[]);
      }
  
      const tokenExtensionCtx: TokenExtensionContextForPool = {
        ...NO_TOKEN_EXTENSION_CONTEXT,
        tokenMintWithProgramA: mintInfoA,
        tokenMintWithProgramB: mintInfoB,
      };
      const increaseLiquiditQuote = increaseLiquidityQuoteByInputToken(
        inputTokenMint,
        inputAmount,
        lowerTick,
        upperTick,
        Percentage.fromFraction(1, 100),
        whirlpool,
        tokenExtensionCtx,
      );
      const { positionMint, tx: txBuilder } =
        await whirlpool.openPositionWithMetadata(
          lowerTick,
          upperTick,
          increaseLiquiditQuote,
          undefined,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID,
        );
  
      const txPayload = await txBuilder.build();
      const txPayloadDecompiled = TransactionMessage.decompile(
        (txPayload.transaction as VersionedTransaction).message,
      );
      instructions = instructions.concat(txPayloadDecompiled.instructions);
      signers = signers.concat(txPayload.signers as Keypair[]);
  
      const txId = await sendTx(connection, walletKeypair, instructions, signers);
      return JSON.stringify({
        transactionId: txId,
        positionMint: positionMint.toString(),
      });
    } catch (error) {
      throw new HttpException(
        `Create Open Centered Position with Liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async orcaOpenSingleSidedPositionwithLiquidity(
  walletKeypair: Keypair,
  whirlpoolAddress: PublicKey,
  distanceFromCurrentPriceBps: number,
  widthBps: number,
  inputTokenMint: PublicKey,
  inputAmount: Decimal,
  ):Promise<string>{
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const wallet = new Wallet(walletKeypair);
      const ctx = WhirlpoolContext.from(
        connection,
        wallet,
        ORCA_WHIRLPOOL_PROGRAM_ID,
      );
      const client = buildWhirlpoolClient(ctx);
  
      const whirlpool = await client.getPool(whirlpoolAddress);
      const whirlpoolData = whirlpool.getData();
      const mintInfoA = whirlpool.getTokenAInfo();
      const mintInfoB = whirlpool.getTokenBInfo();
      const price = PriceMath.sqrtPriceX64ToPrice(
        whirlpoolData.sqrtPrice,
        mintInfoA.decimals,
        mintInfoB.decimals,
      );
  
      const isTokenA = inputTokenMint.equals(mintInfoA.mint);
      let lowerBoundPrice;
      let upperBoundPrice;
      let lowerTick;
      let upperTick;
      if (isTokenA) {
        lowerBoundPrice = price.mul(1 + distanceFromCurrentPriceBps / 10000);
        upperBoundPrice = lowerBoundPrice.mul(1 + widthBps / 10000);
        upperTick = PriceMath.priceToInitializableTickIndex(
          upperBoundPrice,
          mintInfoA.decimals,
          mintInfoB.decimals,
          whirlpoolData.tickSpacing,
        );
        lowerTick = PriceMath.priceToInitializableTickIndex(
          lowerBoundPrice,
          mintInfoA.decimals,
          mintInfoB.decimals,
          whirlpoolData.tickSpacing,
        );
      } else {
        lowerBoundPrice = price.mul(1 - distanceFromCurrentPriceBps / 10000);
        upperBoundPrice = lowerBoundPrice.mul(1 - widthBps / 10000);
        lowerTick = PriceMath.priceToInitializableTickIndex(
          upperBoundPrice,
          mintInfoA.decimals,
          mintInfoB.decimals,
          whirlpoolData.tickSpacing,
        );
        upperTick = PriceMath.priceToInitializableTickIndex(
          lowerBoundPrice,
          mintInfoA.decimals,
          mintInfoB.decimals,
          whirlpoolData.tickSpacing,
        );
      }
  
      const txBuilderTickArrays = await whirlpool.initTickArrayForTicks([
        lowerTick,
        upperTick,
      ]);
      let txIds: string = "";
      if (txBuilderTickArrays !== null) {
        const txPayloadTickArrays = await txBuilderTickArrays.build();
        const txPayloadTickArraysDecompiled = TransactionMessage.decompile(
          (txPayloadTickArrays.transaction as VersionedTransaction).message,
        );
        const instructions = txPayloadTickArraysDecompiled.instructions;
        const signers = txPayloadTickArrays.signers as Keypair[];
  
        const tickArrayTxId = await sendTx(connection, walletKeypair, instructions, signers);
        txIds += tickArrayTxId + ",";
      }
  
      const tokenExtensionCtx: TokenExtensionContextForPool = {
        ...NO_TOKEN_EXTENSION_CONTEXT,
        tokenMintWithProgramA: mintInfoA,
        tokenMintWithProgramB: mintInfoB,
      };
      const increaseLiquiditQuote = increaseLiquidityQuoteByInputToken(
        inputTokenMint,
        inputAmount,
        lowerTick,
        upperTick,
        Percentage.fromFraction(1, 100),
        whirlpool,
        tokenExtensionCtx,
      );
      const { positionMint, tx: txBuilder } =
        await whirlpool.openPositionWithMetadata(
          lowerTick,
          upperTick,
          increaseLiquiditQuote,
          undefined,
          undefined,
          undefined,
          TOKEN_2022_PROGRAM_ID,
        );
  
      const txPayload = await txBuilder.build();
      const txPayloadDecompiled = TransactionMessage.decompile(
        (txPayload.transaction as VersionedTransaction).message,
      );
      const instructions = txPayloadDecompiled.instructions;
      const signers = txPayload.signers as Keypair[];
  
      const positionTxId = await sendTx(connection, walletKeypair, instructions, signers);
      txIds += positionTxId;
  
      return JSON.stringify({
        transactionIds: txIds,
        positionMint: positionMint.toString(),
      });
    } catch (error) {
      throw new HttpException(
        `Open Single Sided Position with Liquidity failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  

   async raydiumCreateAmmV4(
    walletKeypair: Keypair,
    marketId: PublicKey,
    baseAmount: BNType,
    quoteAmount: BNType,
    startTime: BNType,
  ): Promise<string> {
    try{
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const raydium = await Raydium.load({
        owner: walletKeypair,
        connection: connection,
      });
    
      const marketBufferInfo = await connection.getAccountInfo(
        new PublicKey(marketId),
      );
      const { baseMint, quoteMint } = MARKET_STATE_LAYOUT_V3.decode(
        marketBufferInfo!.data,
      );
    
      const baseMintInfo = await connection.getAccountInfo(baseMint);
      const quoteMintInfo = await connection.getAccountInfo(quoteMint);
    
      if (
        baseMintInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toBase58() ||
        quoteMintInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toBase58()
      ) {
        throw new Error(
          "amm pools with openbook market only support TOKEN_PROGRAM_ID mints, if you want to create pool with token-2022, please create cpmm pool instead",
        );
      }
    
      if (
        baseAmount
          .mul(quoteAmount)
          .lte(
            new BN(1)
              .mul(new BN(10 ** MintLayout.decode(baseMintInfo.data).decimals))
              .pow(new BN(2)),
          )
      ) {
        throw new BadRequestException(
          "initial liquidity too low, try adding more baseAmount/quoteAmount",
        );
      }
    
      const { execute } = await raydium.liquidity.createPoolV4({
        programId: AMM_V4,
        marketInfo: {
          marketId,
          programId: OPEN_BOOK_PROGRAM,
        },
        baseMintInfo: {
          mint: baseMint,
          decimals: MintLayout.decode(baseMintInfo.data).decimals,
        },
        quoteMintInfo: {
          mint: quoteMint,
          decimals: MintLayout.decode(quoteMintInfo.data).decimals,
        },
        baseAmount,
        quoteAmount,
    
        startTime,
        ownerInfo: {
          useSOLBalance: true,
        },
        associatedOnly: false,
        txVersion: TxVersion.V0,
        feeDestinationId: FEE_DESTINATION_ID,
      });
    
      const { txId } = await execute({ sendAndConfirm: true });
    
      return txId;
    }catch(error){
      throw new HttpException(
      `Create AMMV4 failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async raydiumCreateCLMM(
  walletKeypair:Keypair,
  mint1: PublicKey,
  mint2: PublicKey,
  configId: PublicKey,
  initialPrice: Decimal,
  startTime: BNType,
){
  const connection = new Connection(this.heliusUrl, 'confirmed');
  const raydium = await Raydium.load({
    owner: walletKeypair,
    connection: connection,
  });

  const [mintInfo1, mintInfo2] = await connection.getMultipleAccountsInfo(
    [mint1, mint2],
  );
  if (mintInfo1 === null || mintInfo2 === null) {
    throw Error("fetch mint info error");
  }

  const mintDecodeInfo1 = MintLayout.decode(mintInfo1.data);
  const mintDecodeInfo2 = MintLayout.decode(mintInfo2.data);

  const mintFormatInfo1 = {
    chainId: 101,
    address: mint1.toString(),
    programId: mintInfo1.owner.toString(),
    logoURI: "",
    symbol: "",
    name: "",
    decimals: mintDecodeInfo1.decimals,
    tags: [],
    extensions: {},
  };
  const mintFormatInfo2 = {
    chainId: 101,
    address: mint2.toString(),
    programId: mintInfo2.owner.toString(),
    logoURI: "",
    symbol: "",
    name: "",
    decimals: mintDecodeInfo2.decimals,
    tags: [],
    extensions: {},
  };

  const { execute } = await raydium.clmm.createPool({
    programId: CLMM_PROGRAM_ID,
    // programId: DEVNET_PROGRAM_ID.CLMM,
    mint1: mintFormatInfo1,
    mint2: mintFormatInfo2,
    //// @ts-expect-error sdk bug
    ammConfig: { id: configId },
    initialPrice,
    startTime,
    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  });

  const { txId } = await execute({ sendAndConfirm: true });

  return txId;
}

async raydiumCreateCPMM(
  walletKeypair: Keypair,
  mintA: PublicKey,
  mintB: PublicKey,
  configId: PublicKey,
  mintAAmount: BNType,
  mintBAmount: BNType,
  startTime: BNType,
){
  const connection = new Connection(this.heliusUrl, 'confirmed');
  const raydium = await Raydium.load({
    owner: walletKeypair,
    connection: connection,
  });

  const [mintInfoA, mintInfoB] = await connection.getMultipleAccountsInfo(
    [mintA, mintB],
  );
  if (mintInfoA === null || mintInfoB === null) {
    throw Error("fetch mint info error");
  }

  const mintDecodeInfoA = MintLayout.decode(mintInfoA.data);
  const mintDecodeInfoB = MintLayout.decode(mintInfoB.data);

  const mintFormatInfoA = {
    chainId: 101,
    address: mintA.toString(),
    programId: mintInfoA.owner.toString(),
    logoURI: "",
    symbol: "",
    name: "",
    decimals: mintDecodeInfoA.decimals,
    tags: [],
    extensions: {},
  };
  const mintFormatInfoB = {
    chainId: 101,
    address: mintB.toString(),
    programId: mintInfoB.owner.toString(),
    logoURI: "",
    symbol: "",
    name: "",
    decimals: mintDecodeInfoB.decimals,
    tags: [],
    extensions: {},
  };

  const { execute } = await raydium.cpmm.createPool({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA: mintFormatInfoA,
    mintB: mintFormatInfoB,
    mintAAmount,
    mintBAmount,
    startTime,
   ////@ts-expect-error sdk bug
    feeConfig: { id: configId.toString() },
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  });

  const { txId } = await execute({ sendAndConfirm: true });

  return txId;
}

 async  createGibworkTask(
  walletKeypair: Keypair,
  title: string,
  content: string,
  requirements: string,
  tags: string[],
  tokenMintAddress: PublicKey,
  tokenAmount: number,
  payer?: PublicKey,
): Promise<GibworkCreateTaskReponse> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const apiResponse = await fetch(
      "https://api2.gib.work/tasks/public/transaction",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          content: content,
          requirements: requirements,
          tags: tags,
          payer: payer?.toBase58() || walletKeypair.publicKey.toBase58(),
          token: {
            mintAddress: tokenMintAddress.toBase58(),
            amount: tokenAmount,
          },
        }),
      },
    );

    const responseData = await apiResponse.json();
    if (!responseData.taskId && !responseData.serializedTransaction) {
      throw new Error(`${responseData.message}`);
    }

    const serializedTransaction = Buffer.from(
      responseData.serializedTransaction,
      "base64",
    );
    const tx = VersionedTransaction.deserialize(serializedTransaction);

    tx.sign([walletKeypair]);
    const signature = await connection.sendTransaction(tx, {
      preflightCommitment: "confirmed",
      maxRetries: 3,
    });

    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    return {
      status: "success",
      taskId: responseData.taskId,
      signature: signature,
    };
  } catch (error) {
    throw new HttpException(
      `Create Gibwork Task failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async manifestCreateMarket(
  walletKeypair: Keypair,
  baseMint: PublicKey,
  quoteMint: PublicKey,
): Promise<string[]>{
  try{
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const marketKeypair: Keypair = Keypair.generate();
    const FIXED_MANIFEST_HEADER_SIZE: number = 256;
    const createAccountIx: TransactionInstruction = SystemProgram.createAccount({
      fromPubkey: walletKeypair.publicKey,
      newAccountPubkey: marketKeypair.publicKey,
      space: FIXED_MANIFEST_HEADER_SIZE,
      lamports: await connection.getMinimumBalanceForRentExemption(
        FIXED_MANIFEST_HEADER_SIZE,
      ),
      programId: new PublicKey("MNFSTqtC93rEfYHB6hF82sKdZpUDFWkViLByLd1k1Ms"),
    });
    const createMarketIx = ManifestClient["createMarketIx"](
      walletKeypair.publicKey,
      baseMint,
      quoteMint,
      marketKeypair.publicKey,
    );
  
    const tx: Transaction = new Transaction();
    tx.add(createAccountIx);
    tx.add(createMarketIx);
    const signature = await sendAndConfirmTransaction(connection, tx, [
      walletKeypair,
      marketKeypair,
    ]);
    return [signature, marketKeypair.publicKey.toBase58()];
  }catch(error){
    throw new HttpException(
      `Create Manifest Market failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

 async manifestBatchOrder(
  walletKeypair: Keypair,
  marketId: PublicKey,
  orders: OrderParams[],
): Promise<string> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    validateNoCrossedOrders(orders);

    const mfxClient = await ManifestClient.getClientForMarket(
      connection,
      marketId,
      walletKeypair,
    );

    const placeParams: WrapperPlaceOrderParamsExternal[] = orders.map(
      (order) => ({
        numBaseTokens: order.quantity,
        tokenPrice: order.price,
        isBid: order.side === "Buy",
        lastValidSlot: 0,
        orderType: OrderType.Limit,
        clientOrderId: Number(Math.random() * 10000),
      }),
    );

    const batchOrderIx: TransactionInstruction = await mfxClient.batchUpdateIx(
      placeParams,
      [],
      true,
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(batchOrderIx),
      [walletKeypair],
    );

    return signature;
  } catch (error) {
    throw new HttpException(
      `Batch Order failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
 async manifestCancelAllOrders(
  walletKeypair: Keypair,
  marketId: PublicKey,
): Promise<string> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const mfxClient = await ManifestClient.getClientForMarket(
      connection,
      marketId,
      walletKeypair,
    );

    const cancelAllOrdersIx = await mfxClient.cancelAllIx();
    const signature = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(cancelAllOrdersIx),
      [walletKeypair],
    );

    return signature;
  } catch (error) {
    throw new HttpException(
      `Cancel all orders failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  async manifestLimitOrder(
  walletKeypair: Keypair,
  marketId: PublicKey,
  quantity: number,
  side: string,
  price: number,
): Promise<string> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const mfxClient = await ManifestClient.getClientForMarket(
      connection,
      marketId,
      walletKeypair,
    );

    const orderParams: WrapperPlaceOrderParamsExternal = {
      numBaseTokens: quantity,
      tokenPrice: price,
      isBid: side === "Buy",
      lastValidSlot: 0,
      orderType: OrderType.Limit,
      clientOrderId: Number(Math.random() * 1000),
    };

    const depositPlaceOrderIx: TransactionInstruction[] =
      await mfxClient.placeOrderWithRequiredDepositIx(
        walletKeypair.publicKey,
        orderParams,
      );
    const signature = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(...depositPlaceOrderIx),
      [walletKeypair],
    );

    return signature;
  } catch (error) {
    throw new HttpException(
      `Limit order failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async openbookCreateMarket(
  walletKeypair: Keypair,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  lotSize: number = 1,
  tickSize: number = 0.01,
): Promise<string[]> {
  const connection = new Connection(this.heliusUrl, 'confirmed');
  const raydium = await Raydium.load({
    owner: walletKeypair,
    connection: connection,
  });

  const baseMintInfo = await connection.getAccountInfo(baseMint);
  const quoteMintInfo = await connection.getAccountInfo(quoteMint);

  if (
    baseMintInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toBase58() ||
    quoteMintInfo?.owner.toString() !== TOKEN_PROGRAM_ID.toBase58()
  ) {
    throw new Error(
      "openbook market only support TOKEN_PROGRAM_ID mints, if you want to create pool with token-2022, please create raydium cpmm pool instead",
    );
  }

  const { execute } = await raydium.marketV2.create({
    baseInfo: {
      mint: baseMint,
      decimals: MintLayout.decode(baseMintInfo.data).decimals,
    },
    quoteInfo: {
      mint: quoteMint,
      decimals: MintLayout.decode(quoteMintInfo.data).decimals,
    },
    lotSize,
    tickSize,
    dexProgramId: OPEN_BOOK_PROGRAM,

    txVersion: TxVersion.V0,
  });

  const { txIds } = await execute({ sequentially: true });

  return txIds;
}
}