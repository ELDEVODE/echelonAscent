import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  mintTo,
  transfer,
  getAccount,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Try to load environment variables for Node.js contexts
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  try {
    // Load dotenv configuration
    dotenv.config({ path: path.join(process.cwd(), '.env.local') });
  } catch (error) {
    // Ignore if dotenv is not available
    console.warn('Could not load dotenv:', error);
  }
}

// Configuration
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const TOKEN_DECIMALS = 6;
export const TOKEN_NAME = 'Ascent Credits';
export const TOKEN_SYMBOL = 'ASCENT';

// Initialize connection
export const connection = new Connection(SOLANA_NETWORK, 'confirmed');

// Token utility functions
export class AscentTokenManager {
  private connection: Connection;
  private tokenMintAddress: PublicKey | null = null;
  private authorityKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
    
    // Initialize from environment each time for fresh instances
    this.initializeFromEnv();
  }

  private initializeFromEnv() {
    try {
      // Load token mint address
      const mintAddress = process.env.NEXT_PUBLIC_ASCENT_TOKEN_MINT;
      if (mintAddress && mintAddress !== 'YOUR_TOKEN_MINT_ADDRESS') {
        try {
          this.tokenMintAddress = new PublicKey(mintAddress);
        } catch (error) {
          console.warn('Invalid token mint address in environment:', error);
        }
      }

      // Load authority private key (server-side only)
      const authorityKey = process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY;
      if (authorityKey && typeof window === 'undefined') {
        try {
          // Handle different private key formats
          let keyBytes: Uint8Array;
          
          if (authorityKey.includes('[') && authorityKey.includes(']')) {
            // Array format: [1,2,3,...]
            const parsedArray = JSON.parse(authorityKey);
            if (!Array.isArray(parsedArray)) {
              throw new Error('Parsed authority key is not an array');
            }
            if (parsedArray.length !== 64) {
              throw new Error(`Invalid authority key length: expected 64 bytes, got ${parsedArray.length}`);
            }
            keyBytes = new Uint8Array(parsedArray);
          } else if (authorityKey.length === 128) {
            // Hex format
            const hexBytes = authorityKey.match(/.{1,2}/g);
            if (!hexBytes || hexBytes.length !== 64) {
              throw new Error('Invalid hex format for authority key');
            }
            keyBytes = new Uint8Array(hexBytes.map(byte => parseInt(byte, 16)));
          } else if (authorityKey.length === 87 || authorityKey.length === 88) {
            // Base58 format (typical Solana private key)
            try {
              keyBytes = bs58.decode(authorityKey);
              if (keyBytes.length !== 64) {
                throw new Error('Invalid base58 key length');
              }
            } catch (decodeError) {
              throw new Error('Failed to decode base58 private key');
            }
          } else {
            // Try base64 format
            const decoded = Buffer.from(authorityKey, 'base64');
            if (decoded.length !== 64) {
              throw new Error('Invalid key format or length');
            }
            keyBytes = new Uint8Array(decoded);
          }
          
          // Validate key length before creating keypair
          if (keyBytes.length !== 64) {
            throw new Error(`Invalid secret key length: expected 64 bytes, got ${keyBytes.length}`);
          }
          
          this.authorityKeypair = Keypair.fromSecretKey(keyBytes);
          console.log('Authority keypair initialized successfully');
        } catch (error) {
          console.warn('Invalid authority private key format:', error);
          // Set to null so app doesn't crash
          this.authorityKeypair = null;
        }
      }
    } catch (error) {
      console.warn('Error during Solana initialization:', error);
      // Ensure graceful degradation
      this.authorityKeypair = null;
      this.tokenMintAddress = null;
    }
  }

  // Add method to check if properly initialized
  isProperlyInitialized(): boolean {
    return this.authorityKeypair !== null && this.tokenMintAddress !== null;
  }

  // Add method to check if authority is available
  hasAuthority(): boolean {
    return this.authorityKeypair !== null;
  }

  // Add method to get authority public key
  getAuthorityPublicKey(): string {
    if (!this.authorityKeypair) {
      throw new Error('Authority keypair not available');
    }
    return this.authorityKeypair.publicKey.toString();
  }

  /**
   * Create a new ASCENT token mint (simplified without Metaplex metadata)
   */
  async createAscentToken(): Promise<{
    mintAddress: string;
    transactionSignature: string;
  }> {
    if (!this.authorityKeypair) {
      throw new Error('Authority keypair not available for token creation');
    }

    try {
      // Create the token mint
      const mintAddress = await createMint(
        this.connection,
        this.authorityKeypair, // Payer
        this.authorityKeypair.publicKey, // Mint authority
        this.authorityKeypair.publicKey, // Freeze authority
        TOKEN_DECIMALS
      );

      this.tokenMintAddress = mintAddress;

      console.log('Token created successfully:', {
        mint: mintAddress.toString(),
        decimals: TOKEN_DECIMALS,
        symbol: TOKEN_SYMBOL,
        name: TOKEN_NAME,
      });

      // Create mint transaction signature (simplified)
      return {
        mintAddress: mintAddress.toString(),
        transactionSignature: `token_created_${Date.now()}`,
      };
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Get or create associated token account for a wallet
   */
  async getOrCreateTokenAccount(walletAddress: string): Promise<{
    tokenAccount: string;
    isNewAccount: boolean;
  }> {
    if (!this.tokenMintAddress) {
      throw new Error('Token mint address not set');
    }

    const walletPubkey = new PublicKey(walletAddress);
    const associatedTokenAddress = await getAssociatedTokenAddress(
      this.tokenMintAddress,
      walletPubkey
    );

    try {
      // Try to get existing account
      await getAccount(this.connection, associatedTokenAddress);
      return {
        tokenAccount: associatedTokenAddress.toString(),
        isNewAccount: false,
      };
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        // Create new account
        if (!this.authorityKeypair) {
          throw new Error('Authority keypair required to create token accounts');
        }

        const tokenAccount = await createAssociatedTokenAccount(
          this.connection,
          this.authorityKeypair, // Payer
          this.tokenMintAddress,
          walletPubkey
        );

        return {
          tokenAccount: tokenAccount.toString(),
          isNewAccount: true,
        };
      }
      throw error;
    }
  }

  /**
   * Get token balance for a wallet
   */
  async getTokenBalance(walletAddress: string): Promise<number> {
    if (!this.tokenMintAddress) {
      return 0;
    }

    try {
      const walletPubkey = new PublicKey(walletAddress);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        this.tokenMintAddress,
        walletPubkey
      );

      const accountInfo = await getAccount(this.connection, associatedTokenAddress);
      return Number(accountInfo.amount) / Math.pow(10, TOKEN_DECIMALS);
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        return 0;
      }
      console.warn('Error getting token balance:', error);
      return 0;
    }
  }

  /**
   * Mint tokens to a wallet (admin function)
   */
  async mintTokens(
    destinationWallet: string,
    amount: number
  ): Promise<string> {
    if (!this.hasAuthority()) {
      throw new Error('Authority keypair not available - check your private key configuration');
    }
    
    if (!this.tokenMintAddress) {
      throw new Error('Token mint address not configured');
    }

    try {
      const { tokenAccount } = await this.getOrCreateTokenAccount(destinationWallet);
      const tokenAccountPubkey = new PublicKey(tokenAccount);
      const amountWithDecimals = BigInt(amount * Math.pow(10, TOKEN_DECIMALS));

      const signature = await mintTo(
        this.connection,
        this.authorityKeypair!,
        this.tokenMintAddress,
        tokenAccountPubkey,
        this.authorityKeypair!,
        amountWithDecimals
      );

      return signature;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens between wallets
   */
  async transferTokens(
    fromWallet: string,
    toWallet: string,
    amount: number,
    fromKeypair: Keypair
  ): Promise<string> {
    if (!this.tokenMintAddress) {
      throw new Error('Token mint address not set');
    }

    const fromPubkey = new PublicKey(fromWallet);

    const fromTokenAccount = await getAssociatedTokenAddress(
      this.tokenMintAddress,
      fromPubkey
    );

    const { tokenAccount: toTokenAccount } = await this.getOrCreateTokenAccount(toWallet);
    const toTokenAccountPubkey = new PublicKey(toTokenAccount);

    const amountWithDecimals = BigInt(amount * Math.pow(10, TOKEN_DECIMALS));

    const signature = await transfer(
      this.connection,
      fromKeypair,
      fromTokenAccount,
      toTokenAccountPubkey,
      fromKeypair,
      amountWithDecimals
    );

    return signature;
  }

  /**
   * Get all token accounts for a wallet
   */
  async getTokenAccounts(walletAddress: string) {
    const walletPubkey = new PublicKey(walletAddress);
    
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      {
        programId: TOKEN_PROGRAM_ID,
      }
    );

    return tokenAccounts.value.map(account => ({
      pubkey: account.pubkey.toString(),
      mint: account.account.data.parsed.info.mint,
      balance: account.account.data.parsed.info.tokenAmount.uiAmount,
      decimals: account.account.data.parsed.info.tokenAmount.decimals,
    }));
  }

  /**
   * Validate wallet address
   */
  static isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current token mint address
   */
  getTokenMintAddress(): string | null {
    return this.tokenMintAddress?.toString() || null;
  }

  /**
   * Set token mint address (for existing tokens)
   */
  setTokenMintAddress(mintAddress: string) {
    this.tokenMintAddress = new PublicKey(mintAddress);
  }
}

// Utility functions for easy access
export const getAscentBalance = (walletAddress: string) => {
  const manager = new AscentTokenManager();
  return manager.getTokenBalance(walletAddress);
};

export const createAscentTokenAccount = (walletAddress: string) => {
  const manager = new AscentTokenManager();
  return manager.getOrCreateTokenAccount(walletAddress);
};

export const mintAscentTokens = (destinationWallet: string, amount: number) => {
  const manager = new AscentTokenManager();
  return manager.mintTokens(destinationWallet, amount);
};

export const transferAscentTokens = (
  fromWallet: string,
  toWallet: string,
  amount: number,
  fromKeypair: Keypair
) => {
  const manager = new AscentTokenManager();
  return manager.transferTokens(fromWallet, toWallet, amount, fromKeypair);
}; 