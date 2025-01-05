// Define types for the response
export interface HeliusResponse {
  jsonrpc: string;
  result: {
    id: string;
    content: any;
    authorities: string[];
    compression: any;
    ownership: any;
    supply: any;
    creators: any[];
    grouping: any[];
    royalty: any;
    mutable: boolean;
    burnt: boolean;
    [key: string]: any;
  };
  id: string;
}

export interface PriceInfo {
  price_per_token: number;
  total_price: number;
  currency: string;
}

export interface TokenInfo {
  symbol: string;
  balance: number;
  supply: number;
  decimals: number;
  token_program: string;
  associated_token_address: string;
  price_info?: PriceInfo;
}

export interface Asset {
  interface: 'V1_NFT' | 'FungibleToken' | string;
  id: string;
  content: any;
  authorities: string[];
  compression: any;
  ownership: any;
  supply: any;
  creators: any[];
  grouping: any[];
  royalty: any;
  mutable: boolean;
  burnt: boolean;
  token_info?: TokenInfo;
  [key: string]: any;
}

export interface GetAssetsByOwnerResponse {
  jsonrpc: string;
  result: {
    total: number;
    limit: number;
    page: number;
    before: string | null;
    after: string | null;
    items: Array<Asset>;
  };
  id: string;
}

export interface AssetsByOwnerOptions {
  showUnverifiedCollections?: boolean;
  showCollectionMetadata?: boolean;
  showGrandTotal?: boolean;
  showFungible?: boolean;
  showNativeBalance?: boolean;
  showInscription?: boolean;
  showZeroBalance?: boolean;
}

export interface GetAssetParams {
  id: string;
}

export interface GetAssetsByOwnerParams {
  ownerAddress: string;
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
  options?: AssetsByOwnerOptions;
}

export interface PortfolioValue {
  totalValue: number;
  tokens: Array<{
    symbol: string;
    balance: number;
    decimals: number;
    pricePerToken: number;
    value: number;
    currency: string;
  }>;
}

export interface TokenValue {
  symbol: string;
  balance: number;
  decimals: number;
  pricePerToken: number;
  value: number;
  currency: string;
}

export interface PortfolioSummary {
  summary: {
    totalValue: number;
    tokenCount: number;
    primaryCurrency: string;
  };
  detail: {
    tokens: Array<TokenValue & { percentOfPortfolio: string }>;
  };
}

export interface NativeBalanceResponse {
  jsonrpc: string;
  result: {
    items: any[];
    nativeBalance: {
      lamports: number;
      price_per_sol?: number;
      total_price?: number;
    };
  };
  id: string;
}

export interface FormattedNativeBalance {
  balance: number;
  balanceFormatted: string;
  valueInUsd: number | null;
  pricePerSol: number | null;
}
