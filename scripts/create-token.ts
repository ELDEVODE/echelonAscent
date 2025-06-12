#!/usr/bin/env ts-node

import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL,
  PublicKey 
} from '@solana/web3.js';
import { 
  createMint,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Token configuration
const TOKEN_NAME = "Ascent Token";
const TOKEN_SYMBOL = "ASCENT";
const TOKEN_DECIMALS = 6;

/**
 * Script to create the ASCENT token on Solana
 * Run with: npx ts-node scripts/create-token.ts
 */
async function createAscentToken() {
  try {
    console.log('🚀 Creating ASCENT Token...');
    
    // Set up connection
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl);
    console.log(`🌐 Connected to: ${rpcUrl}`);
    
    // Load authority private key
    const authorityKey = process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY;
    if (!authorityKey) {
      console.error('❌ ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY not found in .env.local');
      process.exit(1);
    }

    // Parse the private key (using same logic as before)
    let keyBytes: Uint8Array;
    
    if (authorityKey.includes('[') && authorityKey.includes(']')) {
      const parsedArray = JSON.parse(authorityKey);
      keyBytes = new Uint8Array(parsedArray);
    } else if (authorityKey.length === 128) {
      const hexBytes = authorityKey.match(/.{1,2}/g);
      if (!hexBytes) throw new Error('Invalid hex format');
      keyBytes = new Uint8Array(hexBytes.map(byte => parseInt(byte, 16)));
    } else if (authorityKey.length === 87 || authorityKey.length === 88) {
      keyBytes = bs58.decode(authorityKey);
    } else {
      const decoded = Buffer.from(authorityKey, 'base64');
      keyBytes = new Uint8Array(decoded);
    }
    
    if (keyBytes.length !== 64) {
      throw new Error(`Invalid secret key length: expected 64 bytes, got ${keyBytes.length}`);
    }
    
    // Create keypair
    const authority = Keypair.fromSecretKey(keyBytes);
    console.log(`🔑 Authority: ${authority.publicKey.toString()}`);
    
    // Check SOL balance
    const balance = await connection.getBalance(authority.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`💰 SOL Balance: ${solBalance.toFixed(4)} SOL`);
    
    if (balance < LAMPORTS_PER_SOL * 0.1) {
      console.error('❌ Insufficient SOL balance. Need at least 0.1 SOL to create token.');
      console.log('🔗 Please fund your address at: https://faucet.solana.com/');
      console.log(`📋 Address: ${authority.publicKey.toString()}`);
      process.exit(1);
    }
    
    // Check if token mint already exists
    const existingMint = process.env.NEXT_PUBLIC_ASCENT_TOKEN_MINT;
    if (existingMint && existingMint !== 'YOUR_TOKEN_MINT_ADDRESS') {
      console.log(`⚠️  Token mint already exists: ${existingMint}`);
      console.log('🔍 Verifying existing mint...');
      
      try {
        const mintPubkey = new PublicKey(existingMint);
        const mintInfo = await connection.getAccountInfo(mintPubkey);
        
        if (mintInfo) {
          console.log('✅ Existing token mint verified and accessible');
          console.log(`🏷️  Mint Address: ${existingMint}`);
          return;
        } else {
          console.log('❌ Existing mint address not found on chain, creating new one...');
        }
      } catch (error) {
        console.log('❌ Invalid existing mint address, creating new one...');
      }
    }
    
    // Get minimum balance for rent exemption
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    console.log(`💸 Rent exemption: ${(lamports / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    
    console.log('🏭 Creating token mint...');
    
    // Create the token mint
    const mint = await createMint(
      connection,
      authority,           // Payer of transaction fees
      authority.publicKey, // Mint authority
      authority.publicKey, // Freeze authority (can freeze token accounts)
      TOKEN_DECIMALS,      // Number of decimal places
      undefined,           // Keypair for mint account (undefined = new keypair)
      undefined,           // Confirmation options
      TOKEN_PROGRAM_ID     // SPL Token program ID
    );
    
    console.log('✅ Token mint created successfully!');
    console.log(`🎯 Mint Address: ${mint.toString()}`);
    console.log(`🏷️  Token Name: ${TOKEN_NAME}`);
    console.log(`🔤 Token Symbol: ${TOKEN_SYMBOL}`);
    console.log(`🔢 Decimals: ${TOKEN_DECIMALS}`);
    
    // Update .env.local file
    console.log('📝 Updating .env.local file...');
    
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Update or add the mint address
    const mintEnvVar = 'NEXT_PUBLIC_ASCENT_TOKEN_MINT';
    const mintRegex = new RegExp(`^${mintEnvVar}=.*$`, 'm');
    
    if (mintRegex.test(envContent)) {
      envContent = envContent.replace(mintRegex, `${mintEnvVar}=${mint.toString()}`);
    } else {
      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${mintEnvVar}=${mint.toString()}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Environment file updated');
    
    console.log('');
    console.log('🎉 ASCENT Token setup complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   Token Mint: ${mint.toString()}`);
    console.log(`   Authority: ${authority.publicKey.toString()}`);
    console.log(`   Network: ${rpcUrl}`);
    console.log(`   Balance: ${solBalance.toFixed(4)} SOL`);
    console.log('');
    console.log('🔗 View on Solana Explorer:');
    console.log(`   https://explorer.solana.com/address/${mint.toString()}?cluster=devnet`);
    
  } catch (error) {
    console.error('❌ Error creating token:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createAscentToken();
}

export { createAscentToken }; 