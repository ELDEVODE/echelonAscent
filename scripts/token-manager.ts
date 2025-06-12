import { 
  Connection, 
  PublicKey 
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { mintTokens, MINT_AMOUNTS } from './mint-tokens';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const TOKEN_DECIMALS = 6;
const TOKEN_MINT = '2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA';

interface WalletBalance {
  address: string;
  balance: number;
  tokenAccount?: string;
}

interface RewardDistribution {
  wallet: string;
  amount: number;
  type: string;
  reason: string;
}

class TokenManager {
  private connection: Connection;
  private tokenMint: PublicKey;

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl);
    this.tokenMint = new PublicKey(TOKEN_MINT);
  }

  /**
   * Get token balance for a wallet
   */
  async getBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        this.tokenMint,
        walletPubkey
      );

      try {
        const accountInfo = await getAccount(this.connection, associatedTokenAddress);
        const balance = Number(accountInfo.amount) / Math.pow(10, TOKEN_DECIMALS);
        
        return {
          address: walletAddress,
          balance,
          tokenAccount: associatedTokenAddress.toString()
        };
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          return {
            address: walletAddress,
            balance: 0
          };
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error getting balance for ${walletAddress}:`, error);
      return {
        address: walletAddress,
        balance: 0
      };
    }
  }

  /**
   * Get balances for multiple wallets
   */
  async getBatchBalances(walletAddresses: string[]): Promise<WalletBalance[]> {
    console.log(`📊 Checking balances for ${walletAddresses.length} wallets...`);
    
    const promises = walletAddresses.map(address => this.getBalance(address));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to get balance for ${walletAddresses[index]}:`, result.reason);
        return {
          address: walletAddresses[index],
          balance: 0
        };
      }
    });
  }

  /**
   * Distribute rewards to multiple wallets
   */
  async distributeRewards(distributions: RewardDistribution[]): Promise<void> {
    console.log(`🎁 Distributing rewards to ${distributions.length} recipients...`);
    
    for (let i = 0; i < distributions.length; i++) {
      const dist = distributions[i];
      console.log(`\n[${i + 1}/${distributions.length}] Processing: ${dist.wallet}`);
      
      try {
        await mintTokens(dist.wallet, dist.amount, `${dist.type}: ${dist.reason}`);
        console.log(`✅ Success: ${dist.amount} ASCENT to ${dist.wallet}`);
        
        // Add small delay between transactions
        if (i < distributions.length - 1) {
          console.log('⏳ Waiting 2 seconds...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`❌ Failed: ${dist.wallet}`, error);
      }
    }
    
    console.log('\n🎉 Reward distribution complete!');
  }

  /**
   * Display wallet balances in a formatted table
   */
  displayBalances(balances: WalletBalance[]): void {
    console.log('\n📊 ASCENT Token Balances:');
    console.log('─'.repeat(80));
    console.log('Wallet Address'.padEnd(45) + 'Balance'.padStart(15) + 'Token Account'.padStart(20));
    console.log('─'.repeat(80));
    
    let totalBalance = 0;
    
    balances.forEach(balance => {
      const addressShort = `${balance.address.slice(0, 6)}...${balance.address.slice(-6)}`;
      const balanceStr = `${balance.balance.toLocaleString()} ASCENT`;
      const tokenAccountShort = balance.tokenAccount 
        ? `${balance.tokenAccount.slice(0, 6)}...${balance.tokenAccount.slice(-6)}`
        : 'No Account';
      
      console.log(
        addressShort.padEnd(45) + 
        balanceStr.padStart(15) + 
        tokenAccountShort.padStart(20)
      );
      
      totalBalance += balance.balance;
    });
    
    console.log('─'.repeat(80));
    console.log(`Total Balance: ${totalBalance.toLocaleString()} ASCENT`);
    console.log('─'.repeat(80));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const tokenManager = new TokenManager();
  
  switch (command) {
    case 'balance':
      if (args.length < 2) {
        console.log('Usage: npx tsx scripts/token-manager.ts balance <wallet-address>');
        process.exit(1);
      }
      
      const balance = await tokenManager.getBalance(args[1]);
      console.log(`\n💰 Balance for ${args[1]}:`);
      console.log(`   ${balance.balance} ASCENT`);
      if (balance.tokenAccount) {
        console.log(`   Token Account: ${balance.tokenAccount}`);
      }
      break;
      
    case 'batch-balance':
      if (args.length < 2) {
        console.log('Usage: npx tsx scripts/token-manager.ts batch-balance <wallet1> <wallet2> ...');
        process.exit(1);
      }
      
      const wallets = args.slice(1);
      const balances = await tokenManager.getBatchBalances(wallets);
      tokenManager.displayBalances(balances);
      break;
      
    case 'reward-leaderboard':
      // Example: Reward top 10 leaderboard players
      if (args.length < 2) {
        console.log('Usage: npx tsx scripts/token-manager.ts reward-leaderboard <wallet1> <wallet2> ...');
        console.log('Rewards: 1st=1000, 2nd=750, 3rd=500, 4th-10th=250 ASCENT');
        process.exit(1);
      }
      
      const leaderboardWallets = args.slice(1);
      const leaderboardRewards: RewardDistribution[] = leaderboardWallets.map((wallet, index) => {
        const position = index + 1;
        let amount: number;
        
        if (position === 1) amount = 1000;
        else if (position === 2) amount = 750;
        else if (position === 3) amount = 500;
        else if (position <= 10) amount = 250;
        else amount = 100; // Participation reward
        
        return {
          wallet,
          amount,
          type: 'Leaderboard',
          reason: `Position #${position}`
        };
      });
      
      await tokenManager.distributeRewards(leaderboardRewards);
      break;
      
    case 'daily-rewards':
      // Distribute daily login rewards
      if (args.length < 2) {
        console.log('Usage: npx tsx scripts/token-manager.ts daily-rewards <wallet1> <wallet2> ...');
        process.exit(1);
      }
      
      const dailyWallets = args.slice(1);
      const dailyRewards: RewardDistribution[] = dailyWallets.map(wallet => ({
        wallet,
        amount: MINT_AMOUNTS.DAILY_BONUS,
        type: 'Daily Bonus',
        reason: 'Daily Login Reward'
      }));
      
      await tokenManager.distributeRewards(dailyRewards);
      break;
      
    default:
      console.log('🔧 Token Manager Commands:');
      console.log('');
      console.log('📊 Balance Commands:');
      console.log('  balance <wallet>              - Check single wallet balance');
      console.log('  batch-balance <wallet1...>    - Check multiple wallet balances');
      console.log('');
      console.log('🎁 Reward Commands:');
      console.log('  reward-leaderboard <wallets>  - Distribute leaderboard rewards');
      console.log('  daily-rewards <wallets>       - Distribute daily login rewards');
      console.log('');
      console.log('💡 Individual Minting:');
      console.log('  Use: npx tsx scripts/mint-tokens.ts <wallet> <type>');
      console.log('');
      console.log('🏆 Available Reward Amounts:');
      Object.entries(MINT_AMOUNTS).forEach(([key, value]) => {
        const displayKey = key.toLowerCase().replace(/_/g, '-');
        console.log(`  ${displayKey.padEnd(20)} ${value.toLocaleString()} ASCENT`);
      });
      break;
  }
}

// Export for use in other scripts
export { TokenManager };

// Run if called directly
if (require.main === module) {
  main();
} 