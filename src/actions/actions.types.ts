import { PublicKey } from "@solana/web3.js";

export type ImageSize = '256x256' | '512x512' | '1024x1024';

export interface BaseOptions {
  network?: 'mainnet' | 'devnet';
}

export interface ImageGenerationResponse {
  images: string[];
}

export interface TipLinkOptions extends BaseOptions {
  amount: number;
  splMintAddress?: string;
}

export interface TipLinkResponse {
  url: string;
  signature: string;
}

export interface Creator {
  address: string;
  percentage: number;
}

export interface CollectionOptions extends BaseOptions {
  name: string;
  uri: string;
  royaltyBasisPoints?: number;
  creators?: Creator[];
}

export interface CollectionDeployment {
  collectionAddress: PublicKey;
  signature: string;
}

export interface TokenDeploymentOptions extends BaseOptions {
  name: string;
  uri: string;
  symbol: string;
  decimals?: number;
  initialSupply?: number;
}

export interface TokenDeploymentResponse {
  mint: PublicKey;
}

export interface PumpFunTokenOptions extends BaseOptions {
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

export interface LendingOptions extends BaseOptions {
  amount: number;
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

export interface MintNFTOptions extends BaseOptions {
  collectionAddress: string;
  metadata: NFTMetadata;
  recipientAddress?: string;
}

export interface MintCollectionNFTResponse {
  mint: PublicKey;
  metadata: PublicKey;
}

export interface FaucetOptions extends BaseOptions {
  amount?: number;
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

export interface AirdropOptions extends BaseOptions {
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

export interface StakeOptions extends BaseOptions {
  amount: number;
}

export interface StakeResponse {
  signature: string;
}

export interface NFTListingOptions extends BaseOptions {
  nftMint: string;
  price: number;
}

export interface NFTListingResponse {
  signature: string;
}

export interface TradeOptions extends BaseOptions {
  outputMint: string;
  inputAmount: number;
  inputMint?: string;
  slippageBps?: number;
}

export interface TradeResponse {
  signature: string;
}

export interface TransferOptions extends BaseOptions {
  recipient: string;
  amount: number;
  mintAddress?: string;
}

export interface TransferResponse {
  signature: string;
}

export interface RPSGameOptions extends BaseOptions {
  amount: number;
  choice: 'rock' | 'paper' | 'scissors';
}

export interface RPSGameResponse {
  outcome: string;
}