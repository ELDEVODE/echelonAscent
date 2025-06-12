# 🚀 ASCENT Token Registry Submission Guide

## Overview
This guide will help you submit your ASCENT token to the **Solana Token Registry**, which will make it appear properly on **all** Solana explorers, DEXs, and wallets.

## ✅ Your Token Details
- **Token Address**: `2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA`
- **Symbol**: ASCENT
- **Name**: Ascent Token
- **Decimals**: 6
- **Logo**: ✅ Ready (GitHub hosted)
- **Website**: ✅ Ready (Vercel hosted)

## 📋 Step-by-Step Submission Process

### Option 1: Solana Token Registry (Recommended)

1. **Fork the Repository**
   ```bash
   # Go to: https://github.com/solana-labs/token-list
   # Click "Fork" to create your own copy
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/token-list.git
   cd token-list
   ```

3. **Add Your Token**
   - Open `src/tokens/solana.tokenlist.json` (for mainnet) or
   - Open `src/tokens/solana.devnet.tokenlist.json` (for devnet)
   - Add your token entry (see below)

4. **Token Entry to Add**
   ```json
   {
     "chainId": 103,
     "address": "2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA",
     "symbol": "ASCENT",
     "name": "Ascent Token",
     "decimals": 6,
     "logoURI": "https://raw.githubusercontent.com/ELDEVODE/Ecas/refs/heads/main/Gemini_Generated_Image_91z3m491z.png",
     "tags": [
       "gaming",
       "utility",
       "training",
       "rewards"
     ],
     "extensions": {
       "website": "https://echelon-ascent.vercel.app",
       "description": "Official token of Echelon Ascent gaming platform. Earn ASCENT tokens by completing training missions, achieving high scores, and participating in competitive leaderboards."
     }
   }
   ```

5. **Submit Pull Request**
   - Commit your changes
   - Push to your fork
   - Create PR to the main repository
   - Include verification proof (transaction signature, website link)

### Option 2: Jupiter Token Registry (Alternative)

1. **Visit**: https://github.com/jup-ag/token-list
2. **Fork and Clone** (same process as above)
3. **Add to**: `src/tokens/solana-devnet.tokenlist.json`
4. **Submit PR** with same token details

### Option 3: Direct Explorer Submission

**Solscan**
- Email: contact@solscan.io
- Include: Token address, metadata, logo, website
- Attach verification proof

**Solana Explorer**
- GitHub: https://github.com/solana-labs/explorer
- Submit issue with token details

## 🖼️ Logo Requirements

✅ **Your logo is ready!**
- **URL**: `https://raw.githubusercontent.com/ELDEVODE/Ecas/refs/heads/main/Gemini_Generated_Image_91z3m491z.png`
- **Format**: PNG (recommended)
- **Size**: Should be square (200x200px ideal)
- **Hosting**: GitHub (permanent and reliable)

## 📝 Verification Requirements

When submitting, include:
1. **Token mint transaction**: Your token creation signature
2. **Website verification**: Link to your live website
3. **Authority proof**: Show you control the token mint authority
4. **Project legitimacy**: Brief description of your gaming platform

## ⚡ Quick Commands

```bash
# Check your token on explorers
echo "Devnet: https://solscan.io/token/2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA?cluster=devnet"
echo "Explorer: https://explorer.solana.com/address/2CnhMRkyUuhuHZoU1ri2ogfojyXfc9qPHwjeEuREH8fA?cluster=devnet"

# Your authority address for verification
echo "Authority: 4f69VCRrfxQrPDz88vMj7iqUgixr8YHzf4WXhxhetzkH"
```

## 🎯 Expected Results

After approval (usually 1-2 weeks):
- ✅ Token shows as "Ascent Token" instead of "Unknown Token"
- ✅ Your logo appears on all explorers
- ✅ Proper metadata on DEXs (Jupiter, Raydium, etc.)
- ✅ Wallet recognition (Phantom, Solflare, etc.)
- ✅ Enhanced credibility and professionalism

## 🔄 Alternative: Quick Manual Solutions

While waiting for registry approval:

1. **Contact Solscan directly** - Often fastest for devnet tokens
2. **Use CoinGecko/CoinMarketCap** - For additional visibility
3. **Social media promotion** - Help users recognize your token

## 📞 Support Contacts

- **Solana Token Registry**: GitHub issues on the repo
- **Solscan Support**: contact@solscan.io
- **Jupiter Support**: Discord - https://discord.gg/jup

---

**Next Step**: Fork the Solana Token Registry and submit your entry! 🚀 