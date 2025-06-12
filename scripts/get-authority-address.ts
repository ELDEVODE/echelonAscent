import { ascentTokenManager } from '../lib/solana';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function getAuthorityAddress() {
  try {
    console.log('🔑 Getting authority address...');
    
    // Check if authority is properly initialized
    if (!ascentTokenManager.hasAuthority()) {
      console.error('❌ Authority keypair not initialized. Check your ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY in .env.local');
      process.exit(1);
    }

    // Get the public key
    const publicKey = ascentTokenManager.getAuthorityPublicKey();
    
    console.log('✅ Authority address found:');
    console.log(`🏦 Public Key: ${publicKey}`);
    console.log(`🌐 Network: ${process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'}`);
    console.log('');
    console.log('💰 To fund this address with SOL, visit:');
    console.log('🔗 https://faucet.solana.com/');
    console.log('');
    console.log('📋 Copy and paste this address in the faucet:');
    console.log(`   ${publicKey}`);
    
  } catch (error) {
    console.error('❌ Error getting authority address:', error);
    process.exit(1);
  }
}

getAuthorityAddress(); 