# Catoly Digital Asset Service (DAS) and Gecko API Documentation

## Table of Contents
- [DAS Endpoints](#das-endpoints)
  - [Get Asset](#get-asset)
  - [Get Assets by Owner](#get-assets-by-owner)
  - [Get Fungible Tokens](#get-fungible-tokens)
  - [Get Portfolio Value](#get-portfolio-value)
  - [Get Native Balance](#get-native-balance)
  - [Get Complete Balance](#get-complete-balance)
- [Gecko Endpoints](#gecko-endpoints)
  - [Get Solana DEXes](#get-solana-dexes)
  - [Get Token Pools](#get-token-pools)
  - [Get Pool OHLCV](#get-pool-ohlcv)
  - [Get Pool Trades](#get-pool-trades)
  - [Search Pairs](#search-pairs)
  - [Get Token Chart](#get-token-chart)

## DAS Endpoints

Base path: `/das`

### Get Asset
```
GET /das/:id
```
Retrieves a specific asset by its ID.

**Parameters:**
- `id` (path parameter, string): The unique identifier of the asset

**Response:** Asset details

### Get Assets by Owner
```
GET /das/owner/:address
```
Retrieves all assets owned by a specific address.

**Parameters:**
- `address` (path parameter, string): Owner's wallet address
- `page` (query parameter, number, optional): Page number for pagination
- `limit` (query parameter, number, optional): Number of items per page

**Response:** List of assets owned by the address

### Get Fungible Tokens
```
GET /das/fungible/:address
```
Retrieves fungible tokens owned by a specific address.

**Parameters:**
- `address` (path parameter, string): Owner's wallet address
- `page` (query parameter, number, default: 1): Page number
- `limit` (query parameter, number, default: 100): Items per page
- `before` (query parameter, string, optional): Pagination cursor for items before
- `after` (query parameter, string, optional): Pagination cursor for items after

**Response:** List of fungible tokens

### Get Portfolio Value
```
GET /das/spl-portfolio/:address
```
Retrieves portfolio value for a wallet address.

**Parameters:**
- `address` (path parameter, string): Wallet address
- `detailed` (query parameter, boolean, default: false): If true, returns detailed portfolio analysis

**Response:** 
- If detailed=false: PortfolioValue
- If detailed=true: PortfolioSummary

### Get Native Balance
```
GET /das/native-balance/:address
```
Retrieves the native token balance for a wallet.

**Parameters:**
- `address` (path parameter, string): Wallet address

**Response:** FormattedNativeBalance

### Get Complete Balance
```
GET /das/portfolio/:address
```
Retrieves complete wallet balance including all assets.

**Parameters:**
- `address` (path parameter, string): Wallet address

**Response:** Complete wallet balance details

## Gecko Endpoints

Base path: `/gecko`

### Get Solana DEXes
```
GET /gecko/solana/dexes
```
Retrieves a list of DEXes on Solana.

**Parameters:**
- `page` (query parameter, number, default: 1): Page number

**Response:** GeckoDexResponse

### Get Token Pools
```
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
```
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

**Response:** OHLCV data for the specified pool

### Get Pool Trades
```
GET /gecko/pools/:poolAddress/trades
```
Retrieves the last trades in a day for a specific pool.

**Parameters:**
- `poolAddress` (path parameter, string): Pool address
- `minVolume` (query parameter, number, optional): Minimum trade volume filter

**Response:** Recent trades data

### Search Pairs
```
GET /gecko/search
```
Searches for trading pairs.

**Parameters:**
- `q` (query parameter, string): Search query

**Response:** Search results for trading pairs

### Get Token Chart
```
GET /gecko/chart/:tokenAddress/:timeframe
```
Retrieves chart data for a specific token.

**Parameters:**
- `tokenAddress` (path parameter, string): Token address
- `timeframe` (path parameter, enum): One of: 'day', 'hour', 'minute'

**Response:** OHLCV data for the specified token