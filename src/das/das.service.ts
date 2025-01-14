import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Asset,
  FormattedNativeBalance,
  GetAssetParams,
  GetAssetsByOwnerParams,
  GetAssetsByOwnerResponse,
  HeliusResponse,
  NativeBalanceResponse,
  ParsedTokenAccountData,
  PortfolioSummary,
  PortfolioValue,
  JupiterPriceResponse,
  TokenPriceResponse,
  TLDResponse,
  BlockTransaction,
  BlockTransactionResponse,
  SignaturesResponse,
  CNFTTransactionResponse,
  // MerkleTreeResponse,
  SlotResponse,
  RawTransactionResponse,
  TransactionsResponse,
  EnrichedTransactionResponse,
  TPSResponse,
  DomainResolveResponse,
  Username,
  DomainResponse,
  NiftyAssetResponse
} from './das.types';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAllTld, TldParser } from "@onsol/tldparser";
// import { ConcurrentMerkleTreeAccount } from '../../node_modules/@solana/spl-account-compression';
import { getInternalAssetAccountDataSerializer } from '@nifty-oss/asset';
import { resolve } from '@bonfida/spl-name-service';

@Injectable()
export class DasService {
  private readonly heliusUrl: string;
  private readonly SOL_DECIMALS = 9; // Solana uses 9 decimals
  private readonly VOTE_PROGRAM_ID = new PublicKey('Vote111111111111111111111111111111111111111');


  constructor(private configService: ConfigService) {
    const apikey = this.configService.get<string>('HELIUS_API_KEY');

    if (!apikey) {
      throw new Error('HELIUS_API_KEY is not defined in environment variables');
    }
    this.heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apikey}`;
  }

  private calculateTokenValue(asset: Asset): {
    name: string;
    image: string;
    symbol: string;
    balance: number;
    decimals: number;
    pricePerToken: number;
    value: number;
    currency: string;
  } | null {
    try {
      const tokenInfo = asset.token_info;
      if (!tokenInfo?.price_info) return null;

      const balance = tokenInfo.balance;
      const decimals = tokenInfo.decimals;
      const pricePerToken = tokenInfo.price_info.price_per_token;
      const currency = tokenInfo.price_info.currency;

      // Calculate actual balance with decimals
      const actualBalance = balance / Math.pow(10, decimals);

      // Calculate value
      const value = actualBalance * pricePerToken;

      return {
        name: asset.content.metadata.name,
        image: asset.content.links.image,
        symbol: asset.content.metadata.symbol,
        balance: actualBalance,
        decimals,
        pricePerToken,
        value,
        currency,
      };
    } catch (error) {
      console.error(
        `Error calculating value for token ${asset.content?.metadata?.symbol}:`,
        error,
      );
      return null;
    }
  }

  async getNativeBalance(
    ownerAddress: string,
  ): Promise<FormattedNativeBalance> {
    try {
      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page: 1,
            limit: 1,
            options: {
              showNativeBalance: true,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch native balance from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as NativeBalanceResponse;

      console.log(data);

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch native balance',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Safely access the native balance data
      const nativeBalanceData = data.result?.nativeBalance;

      if (!nativeBalanceData) {
        throw new HttpException(
          'Native balance data not found in response',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Calculate SOL balance from lamports
      const balanceInSol =
        nativeBalanceData.lamports / Math.pow(10, this.SOL_DECIMALS);

      // Safely get price information
      const pricePerSol = nativeBalanceData.price_per_sol || null;
      const valueInUsd = nativeBalanceData.total_price || null;

      return {
        balance: balanceInSol,
        balanceFormatted: `${balanceInSol.toFixed(4)} SOL`,
        valueInUsd: valueInUsd ? Number(valueInUsd.toFixed(2)) : null,
        pricePerSol: pricePerSol ? Number(pricePerSol.toFixed(2)) : null,
      };
    } catch (error) {
      console.error('Error fetching native balance:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to fetch native balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAsset(params: GetAssetParams) {
    try {
      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAsset',
          params: {
            id: params.id,
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch asset from Helius',
          HttpStatus.NOT_FOUND,
        );
      }

      const data = (await response.json()) as HeliusResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch asset',
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAssetsByOwner(params: GetAssetsByOwnerParams) {
    try {
      const { ownerAddress, page = 1, limit = 100 } = params;

      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page,
            limit,
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch assets from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as GetAssetsByOwnerResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch assets',
          HttpStatus.BAD_REQUEST,
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFungibleTokensByOwner(params: GetAssetsByOwnerParams) {
    try {
      const { ownerAddress, page = 1, limit = 100, before, after } = params;

      if (!ownerAddress) {
        throw new HttpException(
          'Owner address is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Request a larger limit to account for filtering
      const requestLimit = Math.min(1000, limit * 2);
      const validatedPage = Math.max(1, Math.floor(Number(page)));

      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress,
            page: validatedPage,
            limit: requestLimit,
            before,
            after,
            options: {
              showUnverifiedCollections: false,
              showCollectionMetadata: false,
              showGrandTotal: true,
              showFungible: true,
              showNativeBalance: false,
              showInscription: false,
              showZeroBalance: false,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch fungible tokens from Helius',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as GetAssetsByOwnerResponse;

      if ('error' in data) {
        throw new HttpException(
          data.error || 'Failed to fetch fungible tokens',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Filter to only include FungibleToken interface
      const fungibleTokens = data.result.items.filter(
        (asset) => asset.interface === 'FungibleToken',
      );

      // Apply the original limit after filtering
      const limitedTokens = fungibleTokens.slice(0, limit);

      return {
        ...data.result,
        items: limitedTokens,
        total: fungibleTokens.length,
        limit: limit,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getWalletPortfolioValue(ownerAddress: string): Promise<PortfolioValue> {
    try {
      // Get all fungible tokens
      const response = await this.getFungibleTokensByOwner({
        ownerAddress,
        limit: 1000, // Get maximum tokens to ensure we don't miss any
      });

      // Calculate values for all tokens using reduce for optimal performance
      const { totalValue, tokens } = response.items.reduce(
        (acc, asset) => {
          if (asset.interface !== 'FungibleToken') return acc;

          const tokenValue = this.calculateTokenValue(asset);
          if (!tokenValue) return acc;

          return {
            totalValue: acc.totalValue + tokenValue.value,
            tokens: [...acc.tokens, tokenValue],
          };
        },
        {
          totalValue: 0,
          tokens: [] as Array<ReturnType<typeof this.calculateTokenValue>>,
        },
      );

      return {
        totalValue: Number(totalValue.toFixed(2)), // Round to 2 decimal places
        tokens: tokens.filter(Boolean).sort((a, b) => b!.value - a!.value), // Sort by value descending
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPortfolioAnalysis(ownerAddress: string): Promise<PortfolioSummary> {
    try {
      const portfolio = await this.getWalletPortfolioValue(ownerAddress);

      return {
        summary: {
          totalValue: portfolio.totalValue,
          tokenCount: portfolio.tokens.length,
          primaryCurrency: portfolio.tokens[0]?.currency || 'USDC',
        },
        detail: {
          tokens: portfolio.tokens.map((token) => ({
            ...token,
            percentOfPortfolio:
              ((token.value / portfolio.totalValue) * 100).toFixed(2) + '%',
          })),
        },
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCompleteWalletBalance(ownerAddress: string): Promise<{
    nativeBalance: FormattedNativeBalance;
    tokenPortfolio: PortfolioValue;
    totalValueUsd: number;
  }> {
    try {
      const [nativeBalance, tokenPortfolio] = await Promise.all([
        this.getNativeBalance(ownerAddress),
        this.getWalletPortfolioValue(ownerAddress),
      ]);

      return {
        nativeBalance,
        tokenPortfolio,
        totalValueUsd: Number(
          (nativeBalance.valueInUsd + tokenPortfolio.totalValue).toFixed(2),
        ),
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTokenOrNativeBalance(
    walletAddress: string,  // Make walletAddress required instead of optional
    tokenAddress?: string,
  ): Promise<number> {
    try {
      if (!walletAddress) {
        throw new HttpException(
          'Wallet address is required',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      // If no token address, get SOL balance
      if (!tokenAddress) {
        const response = await fetch(this.heliusUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'helius-das',
            method: 'getBalance',
            params: [walletAddress],
          }),
        });
  
        if (!response.ok) {
          throw new HttpException(
            'Failed to fetch SOL balance',
            HttpStatus.BAD_GATEWAY,
          );
        }
  
        const data = await response.json();
        return data.result / Math.pow(10, this.SOL_DECIMALS);
      }
  
      // Get token accounts for SPL token
      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            {
              mint: tokenAddress,
            },
            {
              encoding: 'jsonParsed',
            },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch token accounts',
          HttpStatus.BAD_GATEWAY,
        );
      }
  
      const data = await response.json();
      
      if (data.result.value.length === 0) {
        console.warn(
          `No token accounts found for wallet ${walletAddress} and token ${tokenAddress}`,
        );
        return 0;
      }
  
      const tokenAccount = data.result.value[0];
      const parsedData = tokenAccount.account.data as ParsedTokenAccountData;
      
      return parsedData.parsed.info.tokenAmount.uiAmount || 0;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error fetching balance: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchTokenPrice(tokenAddress: string): Promise<TokenPriceResponse> {
    try {
      const response = await fetch(`https://api.jup.ag/price/v2?ids=${tokenAddress}`);
      
      if (!response.ok) {
        throw new HttpException(
          `Failed to fetch price: ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      
      const data = (await response.json()) as JupiterPriceResponse;
      const priceData = data.data[tokenAddress];
      
      if (!priceData || !priceData.price) {
        throw new HttpException(
          'Price data not available for the given token',
          HttpStatus.NOT_FOUND,
        );
      }
      
      return {
        price: priceData.price,
        symbol: priceData.mintSymbol,
        vsToken: priceData.vsToken,
        vsTokenSymbol: priceData.vsTokenSymbol,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Price fetch failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
  async getTokenPrice(tokenAddress: string): Promise<TokenPriceResponse> {
    if (!tokenAddress) {
      throw new HttpException(
        'Token address is required',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    try {
      // Validate that the token address is a valid Solana public key
      try {
        new PublicKey(tokenAddress);
      } catch {
        throw new HttpException(
          'Invalid token address format',
          HttpStatus.BAD_REQUEST,
        );
      }
  
      return await this.fetchTokenPrice(tokenAddress);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get token price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllTLDs(): Promise<TLDResponse> {
    try {
      // Create connection from Helius URL
      const connection = new Connection(this.heliusUrl);
      
      // Fetch TLDs using the parser
      const tlds = await getAllTld(connection);
      
      // Map and return the TLD strings
      return {
        tlds: tlds.map((tld) => String(tld.tld))
      };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch TLDs: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getBlockTransactions(
    slot: number,
    cursor?: string,
    limit: number = 100,
  ): Promise<BlockTransactionResponse> {
    const invokedPrograms = new Map<string, number>();
  
    try {
      // Get block data
      const response = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getBlock',
          params: [
            slot,
            {
              maxSupportedTransactionVersion: 0,
            },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new HttpException('Failed to fetch block data', HttpStatus.BAD_GATEWAY);
      }
  
      const data = await response.json();
      const block = data.result;
  
      if (!block?.transactions || block.transactions.length === 0) {
        return {
          status: 'success',
          oldest: "",
          result: [],
        };
      }
  
      // Process transactions
      const transactions: BlockTransaction[] = block.transactions.map((tx: any, index: number) => {
        let signature: string | undefined;
        if (tx.transaction.signatures.length > 0) {
          signature = tx.transaction.signatures[0];
        }
  
        const programIndexes = 
          tx.transaction.message.compiledInstructions
            .map((ix: any) => ix.programIdIndex)
            .concat(
              tx.meta?.innerInstructions?.flatMap((ix: any) => {
                return ix.instructions.map((ix: any) => ix.programIdIndex);
              }) || []
            );
  
        const invocations = programIndexes.reduce(
          (acc: Map<string, number>, programIndex: number) => {
            const programId = tx.transaction.message.accountKeys[programIndex];
            
            const programTransactionCount = invokedPrograms.get(programId) || 0;
            invokedPrograms.set(programId, programTransactionCount + 1);
  
            const count = acc.get(programId) || 0;
            acc.set(programId, count + 1);
  
            return acc;
          },
          new Map<string, number>()
        );
  
        return {
          index,
          signature,
          meta: tx.meta,
          invocations,
        };
      });
  
      // Filter and process signatures
      let signatureList = transactions
        .filter(({ invocations }) => 
          !(invocations.has(this.VOTE_PROGRAM_ID.toBase58()) && invocations.size === 1)
        )
        .map(({ signature }) => signature)
        .filter((sig): sig is string => sig !== undefined);
  
      if (!signatureList.length) {
        return {
          status: 'success',
          oldest: "",
          result: [],
        };
      }
  
      // Handle cursor pagination
      if (cursor) {
        const lastTransactionIndex = signatureList.indexOf(cursor);
        if (lastTransactionIndex >= 0) {
          signatureList = signatureList.slice(lastTransactionIndex + 1);
        }
      }
  
      signatureList = signatureList.slice(0, limit);
  
      // Get enriched transaction data
      const enrichedResponse = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getEnrichedTransactions',
          params: { transactions: signatureList }
        }),
      });
  
      if (!enrichedResponse.ok) {
        throw new HttpException('Failed to fetch enriched transactions', HttpStatus.BAD_GATEWAY);
      }
  
      const enrichedData = await enrichedResponse.json();
      const result = enrichedData.result || [];
  
      return {
        status: 'success',
        oldest: signatureList[signatureList.length - 1] || "",
        result,
      };
  
    } catch (error) {
      return {
        status: 'error',
        message: `Error fetching block transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async getCNFTTransactions(
    assetId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<CNFTTransactionResponse> {
    try {
      // Get signatures for the asset
      const signaturesResponse = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getSignaturesForAsset',
          params: {
            id: assetId,
            page,
            limit
          },
        }),
      });
  
      if (!signaturesResponse.ok) {
        throw new HttpException(
          'Failed to fetch signatures',
          HttpStatus.BAD_GATEWAY
        );
      }
  
      const data = (await signaturesResponse.json()) as SignaturesResponse;
      const signatures = data.result.items.map(([signature]) => signature);
  
      if (!signatures || signatures.length === 0) {
        return {
          status: 'success',
          oldest: "",
          result: [],
        };
      }
  
      // Get enriched transactions
      const transactionsResponse = await fetch(this.heliusUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-das',
          method: 'getEnrichedTransactions',
          params: { transactions: signatures }
        }),
      });
  
      if (!transactionsResponse.ok) {
        throw new HttpException(
          'Failed to fetch transactions',
          HttpStatus.BAD_GATEWAY
        );
      }
  
      const transactionsData = await transactionsResponse.json();
      const result = transactionsData.result || [];
  
      return {
        status: 'success',
        oldest: signatures[signatures.length - 1],
        result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      return {
        status: 'error',
        message: `Error fetching CNFT transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  
// async getMerkleTree(address: string): Promise<MerkleTreeResponse> {
//   try {
//     // Validate address format
//     let pubkey: PublicKey;
//     try {
//       pubkey = new PublicKey(address);
//     } catch {
//       throw new HttpException(
//         'Invalid Merkle Tree address format',
//         HttpStatus.BAD_REQUEST
//       );
//     }

//     // Create connection using Helius URL
//     const connection = new Connection(this.heliusUrl, 'confirmed');

//     // Fetch and process Merkle Tree data
//     const merkleTree = await ConcurrentMerkleTreeAccount.fromAccountAddress(
//       connection,
//       pubkey
//     );

//     const result = {
//       authority: merkleTree.getAuthority().toBase58(),
//       canopyDepth: merkleTree.getCanopyDepth(),
//       creationSlot: merkleTree.getCreationSlot().toNumber(),
//       maxBufferSize: merkleTree.getMaxBufferSize(),
//       rightMostIndex: merkleTree.tree.rightMostPath.index,
//       root: merkleTree.getCurrentRoot().toString('hex'),
//       seq: merkleTree.getCurrentSeq().toString(),
//       treeHeight: merkleTree.getMaxDepth(),
//     };

//     return {
//       status: 'success',
//       result,
//     };
//   } catch (error) {
//     if (error instanceof HttpException) {
//       throw error;
//     }
//     return {
//       status: 'error',
//       message: `Error fetching Merkle Tree details: ${error instanceof Error ? error.message : 'Unknown error'}`,
//     };
//   }
// }

async getCurrentSlot(): Promise<SlotResponse> {
  try {
    const response = await fetch(this.heliusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-das',
        method: 'getSlot',
      }),
    });

    if (!response.ok) {
      throw new HttpException(
        'Failed to fetch current slot',
        HttpStatus.BAD_GATEWAY
      );
    }

    const data = await response.json();
    
    return {
      status: 'success',
      slot: data.result,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    return {
      status: 'error',
      message: `Error fetching current slot: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getRawTransaction(signature: string): Promise<RawTransactionResponse> {
  try {
    if (!signature) {
      throw new HttpException(
        'Transaction signature is required',
        HttpStatus.BAD_REQUEST
      );
    }

    const response = await fetch(this.heliusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-das',
        method: 'getTransaction',
        params: [
          signature,
          {
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new HttpException(
        'Failed to fetch transaction',
        HttpStatus.BAD_GATEWAY
      );
    }

    const data = await response.json();

    if (!data.result) {
      return {
        status: 'error',
        message: 'Raw transaction not found',
      };
    }

    return {
      status: 'success',
      transaction: data.result,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    return {
      status: 'error',
      message: `Error fetching raw transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getTPS(): Promise<TPSResponse> {
  try {
    const response = await fetch(this.heliusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-das',
        method: 'getRecentPerformanceSamples',
      }),
    });

    if (!response.ok) {
      throw new HttpException(
        'Failed to fetch performance samples',
        HttpStatus.BAD_GATEWAY
      );
    }

    const data = await response.json();
    const perfSamples = data.result;

    if (!perfSamples?.length || 
        !perfSamples[0]?.numTransactions || 
        !perfSamples[0]?.samplePeriodSecs) {
      throw new HttpException(
        'No performance samples available',
        HttpStatus.NOT_FOUND
      );
    }

    const tps = perfSamples[0].numTransactions / perfSamples[0].samplePeriodSecs;

    return {
      status: 'success',
      tps,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    return {
      status: 'error',
      message: `Error fetching TPS: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getEnrichedTransaction(
  signature: string,
  account?: string,
): Promise<EnrichedTransactionResponse> {
  try {
    const response = await fetch(this.heliusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-das',
        method: 'getEnrichedTransaction',
        params: { signature },
      }),
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: 'Transaction not found',
      };
    }

    const data = await response.json();
    const transaction = data.result;

    if (!transaction) {
      return {
        status: 'error',
        message: 'Transaction not found',
      };
    }

    return {
      status: 'success',
      transaction,
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Error fetching transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getAccountTransactions(
  account: string,
  options: {
    cursor?: string;
    filter?: string;
    user?: string;
  } = {}
): Promise<TransactionsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (options.filter) queryParams.append('type', options.filter);
    if (options.cursor) queryParams.append('before', options.cursor);

    const response = await fetch(this.heliusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-das',
        method: 'getAddressTransactions',
        params: [
          account,
          { queryParams: queryParams.toString() }
        ],
      }),
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: 'Failed to fetch transactions',
      };
    }

    const data = await response.json();
    const transactions = data.result || [];

    return {
      status: 'success',
      oldest: transactions[transactions.length - 1]?.signature || '',
      result: transactions,
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Error fetching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getNiftyAsset(assetAddress: string): Promise<NiftyAssetResponse> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const pubKey = new PublicKey(assetAddress);
    
    const accountInfo = await connection.getAccountInfo(pubKey);
    if (accountInfo) {
      const assetData = getInternalAssetAccountDataSerializer().deserialize(accountInfo.data);
      return {
        status: 'success',
        assetData,
      };
    }
    
    return {
      status: 'success',
      assetData: null,
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Error fetching Nifty asset data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async getSolanaDomain(address?: string): Promise<DomainResponse> {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${address}/names?api-key=${this.configService.get('HELIUS_API_KEY')}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new HttpException('Failed to fetch domain names', HttpStatus.BAD_GATEWAY);
    }

    const data = await response.json();
    
    if (data?.domainNames) {
      const usernames: Username[] = data.domainNames.map((domain: string) => ({
        type: 'bonfida',
        username: `${domain}.sol`,
      }));
      
      return {
        status: 'success',
        usernames,
      };
    }
    
    return {
      status: 'success',
      usernames: [],
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Error fetching domain names: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async resolveAllDomains(domain: string): Promise<DomainResolveResponse> {
  try {
    const connection = new Connection(this.heliusUrl, 'confirmed');
    const parser = new TldParser(connection);
    const resolvedAddress = await parser.getOwnerFromDomainTld(domain);
    
    return {
      address: resolvedAddress?.toBase58(),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot read properties of undefined')) {
      return { message: 'Domain not found' };
    }
    return {
      message: `Domain resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async resolveSolDomain(domain: string): Promise<DomainResolveResponse> {
  try {
    if (!domain || typeof domain !== 'string') {
      throw new HttpException(
        'Invalid domain. Expected a non-empty string',
        HttpStatus.BAD_REQUEST
      );
    }

    const connection = new Connection(this.heliusUrl, 'confirmed');
    const resolvedAddress = await resolve(connection, domain);
    
    return {
      address: resolvedAddress.toBase58(),
    };
  } catch (error) {
    return {
      message: `Failed to resolve domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
}