# Catoly Digital Asset Service (DAS) and Actions API Documentation

## Table of Contents

- [DAS Endpoints](#das-endpoints)
  - [Get Asset](#get-asset)
  - [Get Assets by Owner](#get-assets-by-owner)
  - [Get Fungible Tokens](#get-fungible-tokens)
  - [Get Portfolio Value](#get-portfolio-value)
  - [Get Native Balance](#get-native-balance)
  - [Get Complete Balance](#get-complete-balance)
  - [Get Token Price](#get-token-price)
  - [Get Token Balance](#get-token-balance)
  - [Get Block Transactions](#get-block-transactions)
  - [Get TLDs](#get-tlds)
  - [Domain Operations](#domain-operations)
- [Gecko Endpoints](#gecko-endpoints)
  - [Get Solana DEXes](#get-solana-dexes)
  - [Get Token Pools](#get-token-pools)
  - [Get Pool OHLCV](#get-pool-ohlcv)
  - [Get Pool Trades](#get-pool-trades)
  - [Search Pairs](#search-pairs)
  - [Get Token Chart](#get-token-chart)
- [Actions Endpoints](#actions-endpoints)
  - [NFT Operations](#nft-operations)
  - [Trading Operations](#trading-operations)
  - [Staking Operations](#staking-operations)
  - [Airdrop Operations](#airdrop-operations)
  - [Game Operations](#game-operations)
  - [Generate Image](#generate-image)
  - [Create Tip Link](#create-tip-link)
  - [Deploy Collection](#deploy-collection)
  - [Launch PumpFun Token](#launch-pumpfun-token)
  - [Lend USDC](#lend-usdc)
  - [Mint Collection NFT](#mint-collection-nft)
  - [Request Faucet Funds](#request-faucet-funds)
  - [Check Token Summary](#check-token-summary)
  - [Check Token Detailed Report](#check-token-detailed-report)

## DAS Endpoints

Base path: /das

### Get Asset

```bash
GET /das/:id
```

Retrieves a specific asset by its ID.

**Parameters:**

- `id` (path parameter, string): The unique identifier of the asset
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** Asset details

### Get Assets by Owner

```bash
GET /das/owner/:address
```

Retrieves all assets owned by a specific address.

**Parameters:**

- `address` (path parameter, string): Owner's wallet address
- `page` (query parameter, number, optional): Page number for pagination
- `limit` (query parameter, number, optional): Number of items per page
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** List of assets owned by the address

### Get Fungible Tokens

```bash
GET /das/fungible/:address
```

Retrieves fungible tokens owned by a specific address.

**Parameters:**

- `address` (path parameter, string): Owner's wallet address
- `page` (query parameter, number, default: 1): Page number
- `limit` (query parameter, number, default: 100): Items per page
- `before` (query parameter, string, optional): Pagination cursor for items before
- `after` (query parameter, string, optional): Pagination cursor for items after
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** List of fungible tokens

### Get Portfolio Value

```bash
GET /das/spl-portfolio/:address
```

Retrieves portfolio value for a wallet address.

**Parameters:**

- `address` (path parameter, string): Wallet address
- `detailed` (query parameter, boolean, default: false): If true, returns detailed portfolio analysis
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- If detailed=false: PortfolioValue
- If detailed=true: PortfolioSummary

### Get Native Balance

```bash
GET /das/native-balance/:address
```

Retrieves the native token balance for a wallet.

**Parameters:**

- `address` (path parameter, string): Wallet address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** FormattedNativeBalance

### Get Complete Balance

```bash
GET /das/portfolio/:address
```

Retrieves complete wallet balance including all assets.

**Parameters:**

- `address` (path parameter, string): Wallet address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** Complete wallet balance details

### Get Token Price

```bash
GET /das/price/:tokenAddress
```

Retrieves the current price for a specific token.

**Parameters:**

- `tokenAddress` (path parameter, string): The token's mint address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** TokenPriceResponse including price, symbol, and reference currency details

### Get Token Balance

```bash
GET /das/balance
```

Retrieves token or native SOL balance for a wallet.

**Parameters:**

- `wallet` (query parameter, string): Wallet address
- `token` (query parameter, string, optional): Token mint address. If not provided, returns SOL balance
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** Balance in decimal form

### Get Block Transactions

```bash
GET /das/block/:slot
```

Retrieves transactions for a specific block.

**Parameters:**

- `slot` (path parameter, number): Block slot number
- `cursor` (query parameter, string, optional): Pagination cursor
- `limit` (query parameter, number, default: 100): Number of transactions to return
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** BlockTransactionResponse including transaction details

### Get TLDs

```bash
GET /das/tlds
```

Retrieves all active top-level domains.

**Parameters:**

- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** List of available TLDs

### Get Current Slot

```bash
GET /das/slot
```

Fetches the current slot of the Solana network.

**Parameters:**

- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- `status`: Indicates success or error
- `slot`: The current slot number

### Get Raw Transaction

```bash
GET /das/transaction/:signature
```

Retrieves the raw transaction data.

**Parameters:**

- `signature` (path parameter, string): Transaction signature
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- `status`: Success/error indicator
- `transaction`: Raw transaction data

### Get TPS

```bash
GET /das/tps
```

Gets current network Transactions Per Second.

**Parameters:**

- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- `status`: Success/error indicator
- `tps`: Current TPS value

### Get Enriched Transaction

```bash
GET /das/enriched-transaction/:signature
```

Gets enriched transaction details.

**Parameters:**

- `signature` (path parameter, string): Transaction signature
- `account` (query parameter, string, optional): Related account address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- `status`: Success/error indicator
- `transaction`: Enriched transaction data

### Get Account Transactions

```bash
GET /das/account-transactions/:account
```

Lists account transactions.

**Parameters:**

- `account` (path parameter, string): Account address
- `cursor` (query parameter, string, optional): Pagination cursor
- `filter` (query parameter, string, optional): Transaction type filter
- `user` (query parameter, string, optional): User filter
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:**

- `status`: Success/error indicator
- `oldest`: Oldest transaction signature
- `result`: Transaction list

### Domain Operations

#### Get Nifty Asset

```bash
GET /das/nifty/:address
```

Retrieves Nifty asset data.

**Parameters:**

- `address` (path parameter, string): Asset address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** NiftyAssetResponse

#### Get Solana Domain

```bash
GET /das/domain/:address
```

Gets Solana domains for an address.

**Parameters:**

- `address` (path parameter, string): Wallet address
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** DomainResponse

#### Resolve All Domains

```bash
GET /das/domain/resolve/all/:domain
```

Resolves domain across all TLDs.

**Parameters:**

- `domain` (path parameter, string): Domain name
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** DomainResolveResponse

#### Resolve .sol Domain

```bash
GET /das/domain/resolve/sol/:domain
```

Resolves .sol domain.

**Parameters:**

- `domain` (path parameter, string): Domain name
- `network` (query parameter, string, optional): 'mainnet' or 'devnet'

**Response:** DomainResolveResponse

## Gecko Endpoints

Base path: `/gecko`

### Get Solana DEXes

```bash
GET /gecko/solana/dexes
```

Retrieves a list of DEXes on Solana.

**Parameters:**

- `page` (query parameter, number, default: 1): Page number

**Response:** GeckoDexResponse

### Get Token Pools

```bash
GET /gecko/tokens/:tokenAddress/pools
```

Retrieves pools for a specific token.

**Parameters:**

- `tokenAddress` (path parameter, string): Token address
- `page` (query parameter, number, default: 1): Page number
- `include` (query parameter, string, optional): Additional data to include
- `sort` (query parameter, string, default: 'h24_volume_usd_liquidity_desc'): Sort criteria
- `detail` (query parameter, boolean, optional): If true, returns detailed pool information

**Response:**

- If detail=false: SimplifiedPool[]
- If detail=true: PoolResponse

### Get Pool OHLCV

```bash
GET /gecko/pools/:poolAddress/ohlcv/:timeframe
```

Retrieves OHLCV data for a specific pool.

**Parameters:**

- `poolAddress` (path parameter, string): Pool address
- `timeframe` (path parameter, enum): One of: 'day', 'hour', 'minute'
- `aggregate` (query parameter, string, optional): Aggregation period
- `beforeTimestamp` (query parameter, string, optional): Timestamp filter
- `limit` (query parameter, string, optional): Number of records to return
- `currency` (query parameter, enum, optional): 'usd' or 'token'
- `token` (query parameter, string, optional): 'base', 'quote', or token address

**Response:** OHLCV data

### Get Pool Trades

```bash
GET /gecko/pools/:poolAddress/trades
```

Retrieves recent pool trades.

**Parameters:**

- `poolAddress` (path parameter, string): Pool address
- `minVolume` (query parameter, number, optional): Minimum trade volume filter

**Response:** Recent trades data

### Search Pairs

```bash
GET /gecko/search
```

Searches for trading pairs.

**Parameters:**

- `q` (query parameter, string): Search query

**Response:** Search results

### Get Token Chart

```bash
GET /gecko/chart/:tokenAddress/:timeframe
```

Retrieves token chart data.

**Parameters:**

- `tokenAddress` (path parameter, string): Token address
- `timeframe` (path parameter, enum): 'day', 'hour', or 'minute'

**Response:** OHLCV data

## Actions Endpoints

Base path: /actions

### NFT Operations

#### List NFT for Sale

```bash
POST /actions/nft/list
```

Lists NFT on TensorSwap.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "nftMint": "string",
    "price": "number",
    "network": "string (optional)"
  }
}
```

**Response:** NFTListingResponse

#### Cancel NFT Listing

```bash
POST /actions/nft/cancel
```

Cancels TensorSwap listing.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "nftMint": "string",
    "network": "string (optional)"
  }
}
```

**Response:** NFTListingResponse

### Trading Operations

#### Swap Tokens

```bash
POST /actions/trade/swap
```

Executes Jupiter Exchange swap.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "outputMint": "string",
    "inputAmount": "number",
    "inputMint": "string (optional)",
    "slippageBps": "number (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** TradeResponse

#### Transfer Tokens

```bash
POST /actions/transfer
```

Transfers tokens.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "recipient": "string",
    "amount": "number",
    "mintAddress": "string (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** TransferResponse

### Staking Operations

#### Stake with Jupiter

```bash
POST /actions/stake/jup
```

Stakes with Jupiter.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "amount": "number",
    "network": "string (optional)"
  }
}
```

**Response:** StakeResponse

#### Stake with Solayer

```bash
POST /actions/stake/solayer
```

Stakes with Solayer.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "amount": "number",
    "network": "string (optional)"
  }
}
```

**Response:** StakeResponse

### Airdrop Operations

#### Get Airdrop Cost Estimate

```bash
GET /actions/airdrop/estimate
```

Estimates airdrop cost.

**Parameters:**

- `recipients` (query): Recipient count
- `priorityFee` (query): Priority fee in lamports

**Response:** AirdropCostEstimate

#### Send Compressed Airdrop

```bash
POST /actions/airdrop/compressed
```

Performs compressed token airdrop.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "mintAddress": "string",
    "amount": "number",
    "decimals": "number",
    "recipients": [
      {
        "address": "string"
      }
    ],
    "priorityFeeInLamports": "number",
    "shouldLog": "boolean (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** AirdropResponse

### Game Operations

#### Play Rock Paper Scissors

```bash
POST /actions/game/rps
```

Plays RPS game with stakes.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "amount": "number",
    "choice": "string ('rock', 'paper', 'scissors')",
    "network": "string (optional)"
  }
}
```

**Response:** RPSGameResponse

### Generate Image

```bash
POST /actions/create/image
```

Generates AI image.

**Parameters:**

- `prompt` (body): Image description
- `size` (query, optional): Image dimensions (default: '1024x1024')
- `count` (query, optional): Number of images (default: 1)

**Response:** ImageGenerationResponse

### Create Tip Link

```bash
POST /actions/create/tiplink
```

Creates token tip link.

**Request Body:**

```json
{
  "walletAddress": "string",
  "walletKeypair": "string",
  "options": {
    "amount": "number",
    "splMintAddress": "string (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** TipLinkResponse

### Deploy Collection

```bash
POST /actions/deploy/collection
```

Deploys NFT collection.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "name": "string",
    "uri": "string",
    "royaltyBasisPoints": "number (optional)",
    "creators": [
      {
        "address": "string",
        "percentage": "number"
      }
    ],
    "network": "string (optional)"
  }
}
```

**Response:** CollectionDeployment

### Launch PumpFun Token

```bash
POST /actions/launch/pumpfun
```

Launches token on Pump.fun.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "tokenName": "string",
    "tokenTicker": "string",
    "description": "string",
    "imageUrl": "string",
    "initialLiquiditySOL": "number (optional)",
    "slippageBps": "number (optional)",
    "priorityFee": "number (optional)",
    "twitter": "string (optional)",
    "telegram": "string (optional)",
    "website": "string (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** PumpfunLaunchResponse

### Lend USDC

```bash
POST /actions/lend/usdc
```

Lends USDC through Lulo.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "amount": "number",
    "network": "string (optional)"
  }
}
```

**Response:** LendingResponse

### Mint Collection NFT

```bash
POST /actions/mint/collection-nft
```

Mints NFT from collection.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "options": {
    "collectionAddress": "string",
    "metadata": {
      "name": "string",
      "uri": "string",
      "creators": [
        {
          "address": "string",
          "share": "number"
        }
      ]
    },
    "recipientAddress": "string (optional)",
    "network": "string (optional)"
  }
}
```

**Response:** MintCollectionNFTResponse

### Request Faucet Funds

```bash
POST /actions/faucet/request
```

Requests devnet funds.

**Request Body:**

```json
{
  "walletKeypair": "string",
  "amount": "number (optional)"
}
```

**Response:** FaucetResponse

### Check Token Summary

```bash
GET /actions/token/check/summary/:mint
```

Gets token summary report.

**Parameters:**

- `mint` (path): Token mint address

**Response:** TokenCheck with summary data

### Check Token Detailed Report

```bash
GET /actions/token/check/detailed/:mint
```

Gets detailed token report.

**Parameters:**

- `mint` (path): Token mint address

**Response:** TokenCheck with detailed data
