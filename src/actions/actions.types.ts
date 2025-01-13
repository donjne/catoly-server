import { PublicKey } from "@solana/web3.js";

export type ImageSize = '256x256' | '512x512' | '1024x1024';

export interface ImageGenerationResponse {
  images: string[];
}

export interface TipLinkResponse {
    url: string;
    signature: string;
  }

  export interface Creator {
    address: string;
    percentage: number;
  }
  
  export interface CollectionOptions {
    name: string;
    uri: string;
    royaltyBasisPoints?: number;
    creators?: Creator[];
  }
  
  export interface CollectionDeployment {
    collectionAddress: PublicKey;
    signature: string;
  }

  export interface TokenDeploymentOptions {
    name: string;
    uri: string;
    symbol: string;
    decimals?: number;
    initialSupply?: number;
  }
  
  export interface TokenDeploymentResponse {
    mint: PublicKey;
  }

  export interface PumpFunTokenOptions {
    twitter?: string;
    telegram?: string;
    website?: string;
    initialLiquiditySOL?: number;
    slippageBps?: number;
    priorityFee?: number;
  }
  
  export interface PumpfunLaunchResponse {
    signature: string;
    mint: string;
    metadataUri: string;
  }

  export interface LendingResponse {
    signature: string;
  }

  export interface NFTMetadata {
    name: string;
    uri: string;
    sellerFeeBasisPoints?: number;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  }
  
  export interface MintCollectionNFTResponse {
    mint: PublicKey;
    metadata: PublicKey;
  }

  export interface FaucetResponse {
    signature: string;
  }
  
  export interface TokenCheck {
    // Add the specific fields from your TokenCheck type
    [key: string]: any;
  }

  export interface AirdropRecipient {
    address: string;
  }
  
  export interface AirdropOptions {
    mintAddress: string;
    amount: number;
    decimals: number;
    recipients: AirdropRecipient[];
    priorityFeeInLamports: number;
    shouldLog?: boolean;
  }
  
  export interface AirdropCostEstimate {
    estimatedCost: number;
  }
  
  export interface AirdropResponse {
    signatures: string[];
  }

  export interface StakeResponse {
    signature: string;
  }

  export interface NFTListingResponse {
    signature: string;
  }
  
  export interface TradeResponse {
    signature: string;
  }
  
  export interface TransferResponse {
    signature: string;
  }

  export interface RPSGameResponse {
    outcome: string;
  }
  