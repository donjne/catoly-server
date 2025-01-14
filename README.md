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

## DAS Endpoints

Base path: /das

### Get Asset

```bash
GET /das/:id
```

Retrieves a specific asset by its ID.

**Parameters:**

- `id` (path parameter, string): The unique identifier of the asset

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

**Response:** List of fungible tokens

### Get Portfolio Value

```bash
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

```bash
GET /das/native-balance/:address
```

Retrieves the native token balance for a wallet.

**Parameters:**

- `address` (path parameter, string): Wallet address

**Response:** FormattedNativeBalance

### Get Complete Balance

```bash
GET /das/portfolio/:address
```

Retrieves complete wallet balance including all assets.

**Parameters:**

- `address` (path parameter, string): Wallet address

**Response:** Complete wallet balance details

### Get Token Price

```bash
GET /das/price/:tokenAddress
```

Retrieves the current price for a specific token.

Parameters:

- tokenAddress (path parameter, string): The token's mint address

Response: TokenPriceResponse including price, symbol, and reference currency details

### Get Token Balance

```bash
GET /das/balance
```

Retrieves token or native SOL balance for a wallet.

Parameters:

- wallet (query parameter, string): Wallet address
- token (query parameter, string, optional): Token mint address. If not provided, returns SOL balance

Response: Balance in decimal form

### Get Block Transactions

```bash
GET /das/block/:slot
```

Retrieves transactions for a specific block.

Parameters:

- slot (path parameter, number): Block slot number
- cursor (query parameter, string, optional): Pagination cursor
- limit (query parameter, number, default: 100): Number of transactions to return

Response: BlockTransactionResponse including transaction details

### Get TLDs

```bash
GET /das/tlds
```

Retrieves all active top-level domains.

Response: List of available TLDs

### Get Current Slot

```bash
GET /das/slot
```

Purpose: Fetches the current slot of the Solana network. A slot represents a block in Solana's blockchain.

Response:
status: Indicates success or error.
slot: The current slot number when successful.

Details:
Uses the Helius API to send a getSlot request.
Returns an error if the API request fails or if there's an issue fetching the slot.

### Get Raw Transaction

```bash
GET /das/transaction/:signature
```

Purpose: Retrieves the raw transaction data for a given transaction signature.

Parameters:
signature (path parameter): The transaction signature to look up.
Response:
status: Indicates if the transaction was found or if there was an error.
transaction: The raw transaction data if found.

Details:
Checks if a signature is provided; otherwise, it throws a BAD_REQUEST exception.
Uses the Helius API to fetch transaction details.
If no transaction is found, it returns an error message.

### Get TPS

```bash
GET /das/tps
```

Purpose: Calculates and returns the current Transactions Per Second (TPS) on the Solana network.

Response:
status: Indicates if TPS calculation was successful or if there was an error.
tps: The calculated TPS value.

Details:
Queries recent performance samples from the Helius API.
TPS is computed by dividing the number of transactions by the sample period in seconds.
Throws exceptions for API failures or if no valid samples are available.

### Get Enriched Transaction

```bash
GET /das/enriched-transaction/:signature
```

Purpose: Retrieves an enriched version of the transaction, which might include additional context or decoded data.

Parameters:
signature (path parameter): The transaction signature to retrieve.
account (query parameter, optional): An account address relevant to the transaction.

Response:
status: Indicates success or error.
transaction: The enriched transaction data if found.

Details:
Uses the Helius API to get an enriched transaction. The enrichment could include metadata or additional details not in the raw transaction.

### Get Account Transactions

```bash
GET /das/account-transactions/:account
```

Purpose: Lists transactions associated with a specific account address.

Parameters:
account (path parameter): The account address to fetch transactions for.
cursor (query parameter, optional): To paginate through results.
filter (query parameter, optional): To filter transactions by type.
user (query parameter, optional): Additional user-specific filter (if applicable).

Response:
status: Indicates success or error.
oldest: The signature of the oldest transaction in the current result set.
result: An array of transactions.

### Domain Operations

#### Get Nifty Asset

GET /das/nifty/:address

Retrieves Nifty asset data.

Parameters:

- address (path parameter, string): Asset address

Response: NiftyAssetResponse with asset details

#### Get Solana Domain

GET /das/domain/:address

Retrieves Solana domain names for an address.

Parameters:

- address (path parameter, string): Wallet address

Response: DomainResponse with associated domains

#### Resolve All Domains

GET /das/domain/resolve/all/:domain

Resolves a domain across all TLDs.

Parameters:

- domain (path parameter, string): Domain name to resolve

Response: DomainResolveResponse with resolved address

#### Resolve .sol Domain

GET /das/domain/resolve/sol/:domain

Resolves a .sol domain name.

Parameters:

- domain (path parameter, string): .sol domain name

Response: DomainResolveResponse with resolved address

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

**Response:** OHLCV data for the specified pool

### Get Pool Trades

```bash
GET /gecko/pools/:poolAddress/trades
```

Retrieves the last trades in a day for a specific pool.

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

**Response:** Search results for trading pairs

### Get Token Chart

```bash
GET /gecko/chart/:tokenAddress/:timeframe
```

Retrieves chart data for a specific token.

**Parameters:**

- `tokenAddress` (path parameter, string): Token address
- `timeframe` (path parameter, enum): One of: 'day', 'hour', 'minute'

**Response:** OHLCV data for the specified token

## Actions Endpoints

Base path: /actions

### NFT Operations

#### List NFT for Sale

```bash
POST /actions/nft/list
```

Lists an NFT for sale on TensorSwap.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- nftMint (string): NFT mint address
- price (number): Price in SOL

Response: NFTListingResponse with transaction signature

#### Cancel NFT Listing

```bash
POST /actions/nft/cancel
```

Cancels an NFT listing on TensorSwap.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- nftMint (string): NFT mint address

Response: NFTListingResponse with transaction signature

### Trading Operations

#### Swap Tokens

```bash
POST /actions/trade/swap
```

Executes a token swap using Jupiter Exchange.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- outputMint (string): Target token mint address
- inputAmount (number): Amount to swap
- inputMint (string, optional): Source token mint (defaults to USDC)
- slippageBps (number, optional): Slippage tolerance in basis points

Response: TradeResponse with transaction signature

#### Transfer Tokens

```bash
POST /actions/transfer
```

Transfers SOL or SPL tokens to a recipient.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- recipient (string): Recipient's wallet address
- amount (number): Amount to transfer
- mintAddress (string, optional): Token mint address (if not provided, transfers SOL)

Response: TransferResponse with transaction signature

### Staking Operations

#### Stake with Jupiter

```bash
POST /actions/stake/jup
```

Stakes SOL with Jupiter's validator.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- amount (number): Amount of SOL to stake

Response: StakeResponse with transaction signature

#### Stake with Solayer

```bash
POST /actions/stake/solayer
```

Stakes SOL with Solayer.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- amount (number): Amount of SOL to stake

Response: StakeResponse with transaction signature

### Airdrop Operations

#### Get Airdrop Cost Estimate

```bash
GET /actions/airdrop/estimate
```

Estimates the cost of a compressed token airdrop.

Parameters:

- recipients (query parameter, number): Number of recipients
- priorityFee (query parameter, number): Priority fee in lamports

Response: AirdropCostEstimate with estimated cost

#### Send Compressed Airdrop

```bash
POST /actions/airdrop/compressed
```

Performs a compressed token airdrop to multiple recipients.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- options: AirdropOptions object including:
  - mintAddress (string): Token mint address
  - amount (number): Amount per recipient
  - recipients (array): List of recipient addresses
  - priorityFeeInLamports (number): Priority fee
  - shouldLog (boolean, optional): Enable progress logging

Response: AirdropResponse with transaction signatures

### Game Operations

#### Play Rock Paper Scissors

```bash
POST /actions/game/rps
```

Plays a game of Rock Paper Scissors with stakes.

Parameters (body):

- walletKeypair (string): Wallet keypair for signing
- amount (number): Amount to bet
- choice (string): One of: "rock", "paper", "scissors"

Response: RPSGameResponse with game outcome
