# Echelon Ascent - Tokenization System

This guide covers the implementation and testing of the ASCENT token system, which includes both on-chain SPL tokens and off-chain database balances for optimal gaming performance.

## 🚀 System Overview

The tokenization system consists of:

1. **ASCENT Token** - SPL token on Solana (6 decimals)
2. **Dual Balance System** - On-chain + Off-chain for performance
3. **Bridge System** - Move tokens between chains
4. **Reward System** - Earn tokens through gameplay
5. **Civic Wallet Integration** - Embedded wallet functionality

## 📋 Prerequisites

- Node.js 16+ 
- Solana CLI tools (optional)
- Valid `.env` configuration

## 🔧 Environment Setup

Your `.env` should contain:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:scrupulous-ox-308
NEXT_PUBLIC_CONVEX_URL=https://scrupulous-ox-308.convex.cloud

# Civic Auth
CIVIC_AUTH_CLIENT_ID=6cd784af-53b1-4fd6-bf9c-9c666f97f659

# Solana Configuration  
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_ASCENT_TOKEN_MINT=YOUR_TOKEN_MINT_ADDRESS
ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY=YOUR_AUTHORITY_PRIVATE_KEY
```

⚠️ **Security Note**: The authority private key should be a proper base58 encoded Solana private key, not the placeholder value shown in your environment.

## 🛠️ Setup Steps

### 1. Initialize Token Configuration

```bash
npm run init-token-config
```

This creates:
- Token reward configurations
- Bridge settings
- Economic parameters

### 2. Create ASCENT Token (Production)

```bash
npm run create-token
```

This will:
- Create the SPL token mint
- Set up Metaplex metadata
- Output the mint address

### 3. Update Environment

After token creation, update your `.env`:
```bash
NEXT_PUBLIC_ASCENT_TOKEN_MINT=<generated_mint_address>
```

### 4. Deploy Schema

```bash
npx convex dev
```

## 🎮 Features

### Dual Balance System

- **On-Chain Balance**: Real SPL tokens on Solana blockchain
- **Off-Chain Balance**: Fast database balance for gameplay
- **Total Balance**: Combined view for users

### Token Bridge

Move tokens between on-chain and off-chain:

```typescript
// Bridge to chain (off-chain → on-chain)
const requestId = await bridgeToChain(amount);

// Bridge from chain (on-chain → off-chain) 
const requestId = await bridgeFromChain(amount);
```

### Reward System

Players earn ASCENT tokens through:

- **Mission Completion**: 50-500 tokens (difficulty based)
- **Training Drills**: 10-100 tokens (score based)
- **Daily Login**: 25 tokens
- **Achievements**: 100-1000 tokens
- **Guild Contributions**: 20-200 tokens
- **Leaderboard Rankings**: 500-5000 tokens
- **First Clear Bonus**: 200 tokens
- **Perfect Score Bonus**: 75-150 tokens

### Civic Wallet Integration

- Automatic wallet creation
- Embedded authentication
- Seamless token management

## 🧪 Testing

### 1. Manual Testing

1. **Connect Wallet**
   - Visit the dashboard
   - Connect via Civic auth
   - Wallet auto-creates if needed

2. **View Balances**
   - Check token dashboard
   - Verify on-chain/off-chain split
   - Test refresh functionality

3. **Test Bridge**
   - Bridge small amounts between chains
   - Monitor transaction status
   - Verify balance updates

4. **Earn Rewards**
   - Complete training drills
   - Check token rewards
   - Verify transaction history

### 2. Admin Testing

Access admin functions for:
- Minting tokens to test wallets
- Processing bridge requests
- Viewing system statistics

### 3. Blockchain Verification

```bash
# Check token mint info
solana spl-token supply <token_mint_address> --url devnet

# Check wallet balance
solana spl-token balance <token_mint_address> --owner <wallet_address> --url devnet
```

## 📊 Database Schema

### Key Tables

- `tokenBalances` - Dual balance tracking
- `tokenTransactions` - Complete transaction history
- `tokenRewards` - Reward configuration
- `tokenBridgeRequests` - Bridge operation tracking
- `tokenConfig` - System configuration

## 🔍 Monitoring

### Dashboard Metrics

- Total token supply
- On-chain vs off-chain distribution
- Active holders
- Pending bridge operations
- Recent transactions

### Transaction Types

- `reward` - Gameplay earnings
- `bridge_to_chain` - Off-chain → On-chain
- `bridge_from_chain` - On-chain → Off-chain
- `transfer` - P2P transfers
- `spend` - In-game purchases
- `mint` - Token creation

## 🚨 Troubleshooting

### Common Issues

1. **"Token mint address not set"**
   - Ensure `NEXT_PUBLIC_ASCENT_TOKEN_MINT` is set
   - Verify token was created successfully

2. **"Authority keypair not available"**
   - Check `ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY` format
   - Ensure it's a valid Solana private key

3. **Bridge requests stuck**
   - Check admin panel for pending requests
   - Verify blockchain connectivity
   - Review error messages

4. **Balance not syncing**
   - Use refresh balance button
   - Check network connectivity
   - Verify token account exists

### Development Tips

1. **Use Devnet**
   - Always test on Solana devnet first
   - Get devnet SOL from faucet

2. **Monitor Console**
   - Check browser console for errors
   - Review Convex dashboard logs

3. **Start Small**
   - Test with small token amounts
   - Verify each step before proceeding

## 🔐 Security

### Best Practices

1. **Authority Key Management**
   - Store securely in production
   - Use environment variables
   - Never commit to version control

2. **Bridge Operations**
   - Implement rate limiting
   - Validate all requests
   - Monitor for unusual activity

3. **Reward System**
   - Set reasonable caps
   - Validate activity sources
   - Prevent duplicate rewards

## 🚀 Production Deployment

### Pre-Production Checklist

- [ ] Test all functionality on devnet
- [ ] Verify token metadata
- [ ] Test bridge operations
- [ ] Validate reward calculations
- [ ] Review security measures
- [ ] Test wallet integration
- [ ] Verify admin functions

### Mainnet Migration

1. Create production token on mainnet
2. Update environment variables
3. Deploy to production database
4. Monitor initial operations
5. Enable for all users

## 📚 API Reference

### Convex Functions

#### Queries
- `tokens.getPlayerBalance(walletAddress)` - Get player balances
- `tokens.getTransactionHistory(walletAddress, limit?)` - Get transaction history
- `tokens.getPendingBridgeRequests(walletAddress)` - Get pending bridges
- `tokens.getTokenRewards()` - Get reward configuration
- `tokens.getTokenStats()` - Get system statistics

#### Mutations
- `tokens.createTokenBalance(walletAddress)` - Initialize balance record
- `tokens.awardTokens(walletAddress, activityType, amount, description)` - Award tokens
- `tokens.requestBridgeToChain(walletAddress, amount)` - Request bridge to chain
- `tokens.requestBridgeFromChain(walletAddress, amount)` - Request bridge from chain

#### Actions
- `tokens.syncTokenBalance(walletAddress, onChainBalance)` - Sync blockchain balance

### Solana Functions

- `ascentTokenManager.getTokenBalance(walletAddress)` - Get on-chain balance
- `ascentTokenManager.createAscentToken()` - Create new token
- `ascentTokenManager.mintTokens(destinationWallet, amount)` - Mint tokens (admin)
- `ascentTokenManager.transferTokens(from, to, amount, keypair)` - Transfer tokens

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review console errors
3. Test on devnet
4. Check Convex dashboard
5. Verify environment configuration

---

🎮 **Happy Gaming with ASCENT Tokens!** 🚀 