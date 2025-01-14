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

export interface TokenBalance {
  amount: number;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export interface ParsedTokenAccountData {
  program: string;
  parsed: {
    info: {
      mint: string;
      owner: string;
      state: string;
      tokenAmount: TokenBalance;
    };
    type: string;
  };
}

export interface JupiterPriceResponse {
  data: {
    [key: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: string;
    };
  };
}

export interface TokenPriceResponse {
  price: string;
  symbol?: string;
  vsToken: string;
  vsTokenSymbol: string;
}

export interface TLDResponse {
  tlds: string[];
}

export interface BlockTransaction {
  index: number;
  signature?: string;
  meta: any;
  invocations: Map<string, number>;
}

export interface BlockTransactionResponse {
  status: 'success' | 'error';
  oldest?: string;
  result?: any[];
  message?: string;
}

export interface SignaturesResponse {
  jsonrpc: string;
  result: {
    total: number;
    limit: number;
    page: number;
    items: string[][];
  };
  id: string;
}

export interface CNFTTransactionResponse {
  status: 'success' | 'error';
  oldest?: string;
  result?: any[];
  message?: string;
}

// export interface MerkleTreeResult {
//   authority: string;
//   canopyDepth: number;
//   creationSlot: number;
//   maxBufferSize: number;
//   rightMostIndex: number;
//   root: string;
//   seq: string;
//   treeHeight: number;
// }

// export interface MerkleTreeResponse {
//   status: 'success' | 'error';
//   result?: MerkleTreeResult;
//   message?: string;
// }

export interface SlotResponse {
  status: 'success' | 'error';
  slot?: number;
  message?: string;
}

export interface RawTransactionResponse {
  status: 'success' | 'error';
  transaction?: any;
  message?: string;
}

export interface EnrichedTransactionResponse {
  status: 'success' | 'error';
  transaction?: any;
  message?: string;
}

export interface TransactionsResponse {
  status: 'success' | 'error';
  oldest?: string;
  result?: any[];
  message?: string;
}

export interface TPSResponse {
  status: 'success' | 'error';
  tps?: number;
  message?: string;
}

export interface Username {
  type: string;
  username: string;
}

export interface NiftyAssetResponse {
  status: 'success' | 'error';
  assetData?: any;
  message?: string;
}

export interface DomainResponse {
  status: 'success' | 'error';
  usernames?: Username[];
  message?: string;
}

export interface DomainResolveResponse {
  address?: string;
  message?: string;
}
