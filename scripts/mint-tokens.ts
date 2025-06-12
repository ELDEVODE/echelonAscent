import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL,
  PublicKey 
} from '@solana/web3.js';
import { 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Token configuration
const TOKEN_DECIMALS = 6;
const TOKEN_MINT = '2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA';

// Mint amounts for different purposes
const MINT_AMOUNTS = {
  INITIAL_SUPPLY: 1_000_000, // 1M tokens for initial distribution
  GAME_REWARD: 100,          // 100 tokens per game completion
  ACHIEVEMENT: 250,          // 250 tokens per achievement
  LEADERBOARD_TOP: 1000,     // 1000 tokens for leaderboard top positions
  LEADERBOARD_MID: 500,      // 500 tokens for mid positions
  LEADERBOARD_LOW: 100,      // 100 tokens for participation
  DAILY_BONUS: 50,           // 50 tokens daily bonus
  STAKING_REWARD: 10         // 10 tokens per day staking reward base
};

async function parsePrivateKey(authorityKey: string): Promise<Uint8Array> {
  let keyBytes: Uint8Array;
  
  if (authorityKey.includes('[') && authorityKey.includes(']')) {
    // Array format: [1,2,3,...]
    const parsedArray = JSON.parse(authorityKey);
    keyBytes = new Uint8Array(parsedArray);
  } else if (authorityKey.length === 128) {
    // Hex format
    const hexBytes = authorityKey.match(/.{1,2}/g);
    if (!hexBytes) throw new Error('Invalid hex format');
    keyBytes = new Uint8Array(hexBytes.map(byte => parseInt(byte, 16)));
  } else if (authorityKey.length === 87 || authorityKey.length === 88) {
    // Base58 format
    keyBytes = bs58.decode(authorityKey);
  } else {
    // Try base64 format
    const decoded = Buffer.from(authorityKey, 'base64');
    keyBytes = new Uint8Array(decoded);
  }
  
  if (keyBytes.length !== 64) {
    throw new Error(`Invalid secret key length: expected 64 bytes, got ${keyBytes.length}`);
  }
  
  return keyBytes;
}

async function mintTokens(
  recipientAddress: string, 
  amount: number, 
  purpose: string = 'general'
) {
  try {
    console.log(`🪙 Minting ${amount} ASCENT tokens for: ${purpose}`);
    
    // Set up connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl);
    
    // Load authority private key
    const authorityKey = process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY;
    if (!authorityKey) {
      throw new Error('ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY not found in environment');
    }

    const keyBytes = await parsePrivateKey(authorityKey);
    const authority = Keypair.fromSecretKey(keyBytes);
    
    // Token mint public key
    const mint = new PublicKey(TOKEN_MINT);
    const recipient = new PublicKey(recipientAddress);
    
    console.log(`🏦 Recipient: ${recipientAddress}`);
    console.log(`🔑 Authority: ${authority.publicKey.toString()}`);
    
    // Check authority SOL balance
    const balance = await connection.getBalance(authority.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`💰 Authority SOL Balance: ${solBalance.toFixed(4)} SOL`);
    
    if (balance < LAMPORTS_PER_SOL * 0.01) {
      throw new Error('Insufficient SOL balance for transaction fees');
    }
    
    // Get or create associated token account for recipient
    console.log('🔍 Getting/creating recipient token account...');
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      authority,  // Payer
      mint,       // Token mint
      recipient   // Owner
    );
    
    console.log(`📦 Recipient Token Account: ${recipientTokenAccount.address.toString()}`);
    
    // Check current balance after ensuring account exists
    let currentBalance = 0;
    try {
      const accountInfo = await getAccount(connection, recipientTokenAccount.address);
      currentBalance = Number(accountInfo.amount) / Math.pow(10, TOKEN_DECIMALS);
    } catch (error) {
      // If account was just created, balance will be 0
      console.log('🆕 New token account created, starting balance: 0');
      currentBalance = 0;
    }
    
    console.log(`📊 Current Balance: ${currentBalance} ASCENT`);
    
    // Mint tokens
    const mintAmount = amount * Math.pow(10, TOKEN_DECIMALS);
    console.log('⚡ Minting tokens...');
    
    const signature = await mintTo(
      connection,
      authority,                    // Payer
      mint,                        // Token mint
      recipientTokenAccount.address, // Destination
      authority,                   // Mint authority
      mintAmount                   // Amount (with decimals)
    );
    
    console.log('✅ Tokens minted successfully!');
    console.log(`📝 Transaction: ${signature}`);
    console.log(`🎯 Amount: ${amount} ASCENT`);
    console.log(`📊 New Balance: ${currentBalance + amount} ASCENT`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return {
      signature,
      amount,
      recipient: recipientAddress,
      tokenAccount: recipientTokenAccount.address.toString(),
      previousBalance: currentBalance,
      newBalance: currentBalance + amount
    };
    
  } catch (error) {
    console.error('❌ Error minting tokens:', error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('💡 Usage Examples:');
    console.log('');
    console.log('🎮 Game Rewards:');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> game-completion');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> achievement');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> daily-bonus');
    console.log('');
    console.log('🏆 Leaderboard Rewards:');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> leaderboard-top');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> leaderboard-mid');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> leaderboard-low');
    console.log('');
    console.log('💎 Custom Amount:');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> custom <amount>');
    console.log('');
    console.log('🚀 Initial Distribution:');
    console.log('  npx tsx scripts/mint-tokens.ts <wallet> initial-supply');
    console.log('');
    console.log('Available reward types:', Object.keys(MINT_AMOUNTS).map(k => k.toLowerCase().replace(/_/g, '-')).join(', '));
    process.exit(1);
  }
  
  const [walletAddress, rewardType, customAmount] = args;
  
  let amount: number;
  let purpose: string;
  
  switch (rewardType.toLowerCase()) {
    case 'game-completion':
    case 'game-reward':
      amount = MINT_AMOUNTS.GAME_REWARD;
      purpose = 'Game Completion Reward';
      break;
      
    case 'achievement':
      amount = MINT_AMOUNTS.ACHIEVEMENT;
      purpose = 'Achievement Reward';
      break;
      
    case 'leaderboard-top':
      amount = MINT_AMOUNTS.LEADERBOARD_TOP;
      purpose = 'Top Leaderboard Reward';
      break;
      
    case 'leaderboard-mid':
      amount = MINT_AMOUNTS.LEADERBOARD_MID;
      purpose = 'Mid Leaderboard Reward';
      break;
      
    case 'leaderboard-low':
      amount = MINT_AMOUNTS.LEADERBOARD_LOW;
      purpose = 'Participation Reward';
      break;
      
    case 'daily-bonus':
      amount = MINT_AMOUNTS.DAILY_BONUS;
      purpose = 'Daily Bonus';
      break;
      
    case 'staking-reward':
      amount = MINT_AMOUNTS.STAKING_REWARD;
      purpose = 'Staking Reward';
      break;
      
    case 'initial-supply':
      amount = MINT_AMOUNTS.INITIAL_SUPPLY;
      purpose = 'Initial Token Distribution';
      break;
      
    case 'custom':
      if (!customAmount || isNaN(Number(customAmount))) {
        console.error('❌ Custom amount required and must be a number');
        process.exit(1);
      }
      amount = Number(customAmount);
      purpose = 'Custom Mint';
      break;
      
    default:
      console.error(`❌ Unknown reward type: ${rewardType}`);
      console.log('Available types:', Object.keys(MINT_AMOUNTS).map(k => k.toLowerCase().replace(/_/g, '-')).join(', '));
      process.exit(1);
  }
  
  try {
    await mintTokens(walletAddress, amount, purpose);
  } catch (error) {
    console.error('❌ Minting failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { mintTokens, MINT_AMOUNTS };

// Run if called directly
if (require.main === module) {
  main();
} 