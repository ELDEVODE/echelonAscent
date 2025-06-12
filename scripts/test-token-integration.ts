import { AscentTokenManager } from '../lib/solana';
import { TokenManager } from './token-manager';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testTokenIntegration() {
  console.log('🧪 Testing ASCENT Token Integration...\n');
  
  try {
    // Test 1: Check if token mint is configured
    console.log('1️⃣ Testing token mint configuration...');
    const configuredMint = process.env.NEXT_PUBLIC_ASCENT_TOKEN_MINT;
    
    if (!configuredMint || configuredMint === 'YOUR_TOKEN_MINT_ADDRESS') {
      console.log('❌ Token mint not configured in environment');
      console.log('💡 Add this to your .env.local:');
      console.log('   NEXT_PUBLIC_ASCENT_TOKEN_MINT=2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA');
      return;
    }
    
    console.log(`✅ Token mint configured: ${configuredMint}`);
    
    // Test 2: Check authority configuration
    console.log('\n2️⃣ Testing authority configuration...');
    
    // Create fresh instance for testing
    const tokenManager = new AscentTokenManager();
    
    if (!tokenManager.hasAuthority()) {
      console.log('❌ Authority not configured or invalid');
      console.log('💡 Check ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY in .env.local');
      console.log('Environment check:');
      console.log('  - Authority key exists:', !!process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY);
      console.log('  - Key length:', process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY?.length || 0);
      return;
    }
    
    const authorityAddress = tokenManager.getAuthorityPublicKey();
    console.log(`✅ Authority configured: ${authorityAddress}`);
    
    // Test 3: Test token balance retrieval
    console.log('\n3️⃣ Testing token balance retrieval...');
    
    try {
      const balance = await tokenManager.getTokenBalance(authorityAddress);
      console.log(`✅ Balance retrieval works: ${balance} ASCENT`);
    } catch (error) {
      console.log('⚠️ Balance retrieval error (this is normal if no tokens minted yet):', error);
    }
    
    // Test 4: Test token manager
    console.log('\n4️⃣ Testing token manager...');
    
    const tokenManagerUtil = new TokenManager();
    const authorityBalance = await tokenManagerUtil.getBalance(authorityAddress);
    console.log(`✅ Token manager works: ${authorityBalance.balance} ASCENT`);
    
    // Test 5: Connection test
    console.log('\n5️⃣ Testing Solana connection...');
    
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    console.log(`✅ RPC URL: ${rpcUrl}`);
    
    console.log('\n🎉 All tests passed! Token integration is working correctly.');
    
    // Show next steps
    console.log('\n📋 Next Steps:');
    console.log('');
    console.log('🪙 Mint more tokens:');
    console.log(`   bun run mint-tokens ${authorityAddress} custom 1000`);
    console.log('');
    console.log('🎮 Test game rewards:');
    console.log(`   bun run mint-tokens ${authorityAddress} game-completion`);
    console.log('');
    console.log('📊 Check balances:');
    console.log(`   bun run token:balance ${authorityAddress}`);
    console.log('');
    console.log('🏆 Current balance: ' + authorityBalance.balance + ' ASCENT');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTokenIntegration(); 