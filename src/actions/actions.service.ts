import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AirdropCostEstimate, AirdropOptions, AirdropResponse, CollectionDeployment, CollectionOptions, FaucetResponse, ImageGenerationResponse, ImageSize, LendingResponse, MintCollectionNFTResponse, NFTListingResponse, NFTMetadata, PumpfunLaunchResponse, PumpFunTokenOptions, RPSGameResponse, StakeResponse, TipLinkResponse, TokenCheck, TokenDeploymentOptions, TokenDeploymentResponse, TradeResponse, TransferResponse } from './actions.types';
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
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getMint,
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
  getAccount,
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
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { TensorSwapSDK } from "@tensor-oss/tensorswap-sdk";


@Injectable()
export class ActionsService {
  private readonly heliusUrl: string;
  private readonly SOL_DECIMALS = 9;
  private readonly VOTE_PROGRAM_ID = new PublicKey('Vote111111111111111111111111111111111111111');
  private readonly openai: OpenAI;
  private readonly MINIMUM_SOL_BALANCE = 0.003 * LAMPORTS_PER_SOL;
  private readonly RUGCHECK_BASE_URL = 'https://api.rugcheck.xyz/v1';
  private readonly MAX_AIRDROP_RECIPIENTS = 1000;
  private readonly MAX_CONCURRENT_TXS = 30;
  private readonly LOOKUP_TABLE_ADDRESS = new PublicKey('9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ');
  private readonly TOKENS = {
    SOL: new PublicKey('So11111111111111111111111111111111111111112'),
    USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  };
  
  private readonly DEFAULT_OPTIONS = {
    SLIPPAGE_BPS: 300,
  };
  
  private readonly JUP_API = 'https://quote-api.jup.ag/v6';
  private readonly JUP_REFERRAL_ADDRESS = 'jrfva3S8qbHidkk5LuVa1YrCAkiEVNnxj5QkqyEkVBm';

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
    count: number = 1
  ): Promise<ImageGenerationResponse> {
    try {
      if (!prompt) {
        throw new HttpException(
          'Prompt is required',
          HttpStatus.BAD_REQUEST
        );
      }

      if (count < 1 || count > 10) {
        throw new HttpException(
          'Number of images must be between 1 and 10',
          HttpStatus.BAD_REQUEST
        );
      }

      const response = await this.openai.images.generate({
        prompt,
        n: count,
        size,
      });

      return {
        images: response.data.map(img => img.url),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof OpenAI.APIError) {
        throw new HttpException(
          error.message,
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async createTipLink(
    walletAddress: PublicKey,
    walletKeypair: Keypair,
    amount: number,
    splMintAddress?: string
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
          })
        );
  
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [walletKeypair],
          { commitment: 'confirmed' }
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
          walletAddress
        );
        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          tiplink.keypair.publicKey
        );
  
        const mintInfo = await getMint(connection, mintPubkey);
        const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);
  
        const transaction = new Transaction();
        
        // Add compute budget instruction
        transaction.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 5000,
          })
        );
  
        // Transfer minimum SOL for rent
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: walletAddress,
            toPubkey: tiplink.keypair.publicKey,
            lamports: this.MINIMUM_SOL_BALANCE,
          })
        );
  
        // Create ATA for recipient if needed
        transaction.add(
          createAssociatedTokenAccountInstruction(
            walletAddress,
            toAta,
            tiplink.keypair.publicKey,
            mintPubkey
          )
        );
  
        // Transfer tokens
        transaction.add(
          createTransferInstruction(
            fromAta,
            toAta,
            walletAddress,
            adjustedAmount
          )
        );
  
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [walletKeypair],
          { commitment: 'confirmed' }
        );
  
        return {
          url: tiplink.url.toString(),
          signature,
        };
      }
    } catch (error) {
      throw new HttpException(
        `Failed to create TipLink: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deployCollection(
    walletKeypair: Keypair,
    options: CollectionOptions
  ): Promise<CollectionDeployment> {
    try {
      // Initialize Umi with Helius endpoint
      const umi = createUmi(this.heliusUrl).use(mplCore());
      umi.use(keypairIdentity(fromWeb3JsKeypair(walletKeypair)));
  
      // Generate collection signer
      const collectionSigner = generateSigner(umi);
  
      // Format creators list
      const formattedCreators = options.creators?.map(creator => ({
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
        0
      );
      if (totalPercentage !== 100) {
        throw new HttpException(
          'Creator percentages must sum to 100',
          HttpStatus.BAD_REQUEST
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async deployToken(
    walletKeypair: Keypair,
    options: TokenDeploymentOptions
  ): Promise<TokenDeploymentResponse> {
    try {
      // Validate inputs
      if (!options.name || !options.uri || !options.symbol) {
        throw new HttpException(
          'Name, URI, and symbol are required',
          HttpStatus.BAD_REQUEST
        );
      }
  
      const decimals = options.decimals ?? 9;
      if (decimals < 0 || decimals > 9) {
        throw new HttpException(
          'Decimals must be between 0 and 9',
          HttpStatus.BAD_REQUEST
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
          identifier: "%",
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
        confirm: { commitment: 'finalized' } 
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
        HttpStatus.BAD_GATEWAY
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
        HttpStatus.BAD_GATEWAY
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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
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
          HttpStatus.BAD_REQUEST
        );
      }
  
      return signature;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
          HttpStatus.BAD_REQUEST
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
      const tx = VersionedTransaction.deserialize(new Uint8Array(transactionData));
      
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async lendAsset(
    walletKeypair: Keypair,
    amount: number
  ): Promise<LendingResponse> {
    try {
      // Input validation
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST
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
        }
      );
  
      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch transaction from Lulo',
          HttpStatus.BAD_GATEWAY
        );
      }
  
      const data = await response.json();
      
      // Create connection instance
      const connection = new Connection(this.heliusUrl, 'confirmed');
  
      // Deserialize and prepare transaction
      const luloTxn = VersionedTransaction.deserialize(
        Buffer.from(data.transaction, 'base64')
      );
  
      // Get and set recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
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
          HttpStatus.BAD_REQUEST
        );
      }
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Lending failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async mintCollectionNFT(
    walletKeypair: Keypair,
    collectionAddress: string,
    metadata: NFTMetadata,
    recipientAddress?: string
  ): Promise<MintCollectionNFTResponse> {
    try {
      // Validate inputs
      if (!metadata.name || !metadata.uri) {
        throw new HttpException(
          'Name and URI are required in metadata',
          HttpStatus.BAD_REQUEST
        );
      }
  
      // Validate collection address
      let collectionMint: PublicKey;
      try {
        collectionMint = new PublicKey(collectionAddress);
      } catch {
        throw new HttpException(
          'Invalid collection address',
          HttpStatus.BAD_REQUEST
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
            HttpStatus.BAD_REQUEST
          );
        }
      }
  
      // Validate creator shares if provided
      if (metadata.creators) {
        const totalShares = metadata.creators.reduce((sum, creator) => sum + creator.share, 0);
        if (totalShares !== 100) {
          throw new HttpException(
            'Creator shares must sum to 100',
            HttpStatus.BAD_REQUEST
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async requestFaucetFunds(
    walletKeypair: Keypair,
    amount: number = 5
  ): Promise<FaucetResponse> {
    try {
      const connection = new Connection(
        // Use devnet URL for faucet
        'https://api.devnet.solana.com',
        'confirmed'
      );
  
      const signature = await connection.requestAirdrop(
        walletKeypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );
  
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
  
      if (confirmation.value.err) {
        throw new HttpException(
          `Airdrop failed: ${confirmation.value.err}`,
          HttpStatus.BAD_REQUEST
        );
      }
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Faucet request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
          HttpStatus.BAD_REQUEST
        );
      }
  
      const response = await fetch(`${this.RUGCHECK_BASE_URL}/tokens/${mint}/report/summary`);
      
      if (!response.ok) {
        throw new HttpException(
          `RugCheck API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      }
  
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch token report summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
          HttpStatus.BAD_REQUEST
        );
      }
  
      const response = await fetch(`${this.RUGCHECK_BASE_URL}/tokens/${mint}/report`);
      
      if (!response.ok) {
        throw new HttpException(
          `RugCheck API error: ${response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      }
  
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch detailed token report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
      estimatedCost: perRecipientCompressedStateFee * numberOfRecipients + totalPriorityFees,
    };
  }
  
  private async processAirdropBatches(
    walletKeypair: Keypair,
    amount: number,
    mintAddress: PublicKey,
    recipients: PublicKey[],
    priorityFeeInLamports: number,
    shouldLog: boolean,
    connection: Connection
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
    for (let i = 0; i < recipients.length; i += maxRecipientsPerInstruction * maxIxs) {
      batches.push(recipients.slice(i, i + maxRecipientsPerInstruction * maxIxs));
    }
  
    const instructionSets = await Promise.all(
      batches.map(async (recipientBatch) => {
        const instructions: TransactionInstruction[] = [
          ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: calculateComputeUnitPrice(priorityFeeInLamports, 500_000),
          }),
        ];
  
        const compressIxPromises = [];
        for (let i = 0; i < recipientBatch.length; i += maxRecipientsPerInstruction) {
          const batch = recipientBatch.slice(i, i + maxRecipientsPerInstruction);
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
        HttpStatus.INTERNAL_SERVER_ERROR
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
            HttpStatus.BAD_GATEWAY
          );
        }
  
        const backoff = INITIAL_BACKOFF * Math.pow(2, attempt) * (0.5 + Math.random());
        await sleep(backoff);
      }
    }
  
    throw new Error('Unreachable');
  }
  
  async sendCompressedAirdrop(
    walletKeypair: Keypair,
    options: AirdropOptions
  ): Promise<AirdropResponse> {
    try {
      const mintAddress = new PublicKey(options.mintAddress);
      const recipients = options.recipients.map(r => new PublicKey(r.address));
  
      if (recipients.length > this.MAX_AIRDROP_RECIPIENTS) {
        throw new HttpException(
          `Max airdrop can be ${this.MAX_AIRDROP_RECIPIENTS} recipients at a time`,
          HttpStatus.BAD_REQUEST
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
        connection
      );
  
      return { signatures };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Airdrop failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async executeStakeTransaction(
    walletKeypair: Keypair,
    transactionData: string
  ): Promise<string> {
    const connection = new Connection(this.heliusUrl, 'confirmed');
  
    try {
      // Deserialize transaction
      const txn = VersionedTransaction.deserialize(
        Buffer.from(transactionData, 'base64')
      );
  
      // Get and set recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
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
          HttpStatus.BAD_REQUEST
        );
      }
  
      return signature;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async stakeWithJup(
    walletKeypair: Keypair,
    amount: number
  ): Promise<StakeResponse> {
    try {
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST
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
        }
      );
  
      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch transaction from Jupiter',
          HttpStatus.BAD_GATEWAY
        );
      }
  
      const data = await response.json();
      const signature = await this.executeStakeTransaction(
        walletKeypair,
        data.transaction
      );
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `jupSOL staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async stakeWithSolayer(
    walletKeypair: Keypair,
    amount: number
  ): Promise<StakeResponse> {
    try {
      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST
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
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          errorData.message || 'Failed to fetch transaction from Solayer',
          HttpStatus.BAD_GATEWAY
        );
      }
  
      const data = await response.json();
      const signature = await this.executeStakeTransaction(
        walletKeypair,
        data.transaction
      );
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Solayer sSOL staking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  // Add to actions.service.ts
  async listNFTForSale(
    walletKeypair: Keypair,
    nftMint: string,
    price: number
  ): Promise<NFTListingResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const mintPubkey = new PublicKey(nftMint);
  
      // Validate NFT mint
      if (!PublicKey.isOnCurve(mintPubkey)) {
        throw new HttpException(
          'Invalid NFT mint address',
          HttpStatus.BAD_REQUEST
        );
      }
  
      const mintInfo = await connection.getAccountInfo(mintPubkey);
      if (!mintInfo) {
        throw new HttpException(
          `NFT mint ${nftMint} does not exist`,
          HttpStatus.NOT_FOUND
        );
      }
  
      // Check ownership
      const ata = await getAssociatedTokenAddress(mintPubkey, walletKeypair.publicKey);
      try {
        const tokenAccount = await getAccount(connection, ata);
        if (!tokenAccount || tokenAccount.amount <= 0) {
          throw new HttpException(
            `You don't own this NFT (${nftMint})`,
            HttpStatus.BAD_REQUEST
          );
        }
      } catch (error) {
        throw new HttpException(
          `No token account found for mint ${nftMint}`,
          HttpStatus.NOT_FOUND
        );
      }
  
      // Create TensorSwap SDK instance
      const provider = new AnchorProvider(
        connection,
        new Wallet(walletKeypair),
        AnchorProvider.defaultOptions()
      );
      const tensorSwapSdk = new TensorSwapSDK({ provider });
  
      // Setup listing
      const priceInLamports = new BN(price * 1e9);
      const nftSource = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey
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
      const signature = await connection.sendTransaction(
        transaction,
        [walletKeypair, ...tx.extraSigners]
      );
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `NFT listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async cancelNFTListing(
    walletKeypair: Keypair,
    nftMint: string
  ): Promise<NFTListingResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const mintPubkey = new PublicKey(nftMint);
  
      const provider = new AnchorProvider(
        connection,
        new Wallet(walletKeypair),
        AnchorProvider.defaultOptions()
      );
  
      const tensorSwapSdk = new TensorSwapSDK({ provider });
      const nftDest = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey,
        false,
        TOKEN_PROGRAM_ID
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
      const signature = await connection.sendTransaction(
        transaction,
        [walletKeypair, ...tx.extraSigners]
      );
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `NFT listing cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async tradeTokens(
    walletKeypair: Keypair,
    outputMint: string,
    inputAmount: number,
    inputMint?: string,
    slippageBps: number = this.DEFAULT_OPTIONS.SLIPPAGE_BPS
  ): Promise<TradeResponse> {
    try {
      const connection = new Connection(this.heliusUrl, 'confirmed');
      const outputMintPubkey = new PublicKey(outputMint);
      const inputMintPubkey = inputMint ? new PublicKey(inputMint) : this.TOKENS.USDC;
  
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
          '&maxAccounts=20'
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
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  async transferTokens(
    walletKeypair: Keypair,
    recipient: string,
    amount: number,
    mintAddress?: string
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
          })
        );
  
        signature = await connection.sendTransaction(
          transaction,
          [walletKeypair]
        );
      } else {
        // Transfer SPL token
        const mintPubkey = new PublicKey(mintAddress);
        const fromAta = await getAssociatedTokenAddress(
          mintPubkey,
          walletKeypair.publicKey
        );
        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey
        );
  
        // Get decimals and adjust amount
        const mintInfo = await getMint(connection, mintPubkey);
        const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);
  
        const transaction = new Transaction().add(
          createTransferInstruction(
            fromAta,
            toAta,
            walletKeypair.publicKey,
            adjustedAmount
          )
        );
  
        signature = await connection.sendTransaction(
          transaction,
          [walletKeypair]
        );
      }
  
      return { signature };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async processRPSOutcome(
    walletKeypair: Keypair,
    signature: string,
    href: string
  ): Promise<string> {
    const res = await fetch(
      'https://rps.sendarcade.fun' + href,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: walletKeypair.publicKey.toBase58(),
          signature,
        }),
      }
    );
  
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
    href: string
  ): Promise<string> {
    // Process win transaction
    const res = await fetch(
      'https://rps.sendarcade.fun' + href,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: walletKeypair.publicKey.toBase58(),
        }),
      }
    );
  
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
    href: string
  ): Promise<string> {
    const res = await fetch(
      'https://rps.sendarcade.fun' + href,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account: walletKeypair.publicKey.toBase58(),
        }),
      }
    );
  
    const data = await res.json();
    return 'Prize claimed Successfully\n' + data.title;
  }
  
  async playRockPaperScissors(
    walletKeypair: Keypair,
    amount: number,
    choice: 'rock' | 'paper' | 'scissors'
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
        }
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
        { commitment: 'confirmed' }
      );
  
      const href = data.links?.next?.href;
      const outcome = await this.processRPSOutcome(walletKeypair, signature, href);
  
      return { outcome };
    } catch (error) {
      throw new HttpException(
        `RPS game failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}