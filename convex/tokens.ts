import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// ========================================
// TOKEN BALANCE QUERIES
// ========================================

/**
 * Get combined token balance for a player
 */
export const getPlayerBalance = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    // Get token balance record
    const tokenBalance = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!tokenBalance) {
      // Return default values if no record exists
      const augmentee = await ctx.db
        .query("augmentees")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
        .first();

      return {
        onChainBalance: 0,
        offChainBalance: augmentee?.ascentCredits || 0,
        totalBalance: augmentee?.ascentCredits || 0,
        lastSyncedAt: Date.now(),
        syncInProgress: false,
        tokenAccountAddress: undefined,
      };
    }

    return {
      onChainBalance: tokenBalance.onChainBalance,
      offChainBalance: tokenBalance.offChainBalance,
      totalBalance: tokenBalance.totalBalance,
      lastSyncedAt: tokenBalance.lastSyncedAt,
      syncInProgress: tokenBalance.syncInProgress,
      tokenAccountAddress: tokenBalance.tokenAccountAddress,
    };
  },
});

/**
 * Create token balance record (mutation)
 */
export const createTokenBalance = mutation({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (existing) {
      return { success: true, id: existing._id };
    }

    // Get augmentee info
    const augmentee = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    const id = await ctx.db.insert("tokenBalances", {
      walletAddress: args.walletAddress,
      augmenteeId: augmentee?._id,
      onChainBalance: 0,
      offChainBalance: augmentee?.ascentCredits || 0,
      totalBalance: augmentee?.ascentCredits || 0,
      lastSyncedAt: Date.now(),
      syncInProgress: false,
    });

    return { success: true, id };
  },
});

/**
 * Get transaction history for a player
 */
export const getTransactionHistory = query({
  args: { 
    walletAddress: v.string(),
    limit: v.optional(v.number()),
    transactionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("tokenTransactions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .order("desc");

    if (args.transactionType) {
      query = ctx.db
        .query("tokenTransactions")
        .withIndex("by_type", (q) => q.eq("transactionType", args.transactionType as any))
        .filter((q) => q.eq(q.field("walletAddress"), args.walletAddress))
        .order("desc");
    }

    const transactions = await query.take(args.limit || 50);

    return transactions.map(tx => ({
      id: tx._id,
      type: tx.transactionType,
      amount: tx.amount,
      direction: tx.direction,
      description: tx.description,
      timestamp: tx.timestamp,
      transactionSignature: tx.transactionSignature,
      onChainBalanceAfter: tx.onChainBalanceAfter,
      offChainBalanceAfter: tx.offChainBalanceAfter,
    }));
  },
});

/**
 * Get pending bridge requests
 */
export const getPendingBridgeRequests = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("tokenBridgeRequests")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .order("desc")
      .collect();

    return requests.map(req => ({
      id: req._id,
      direction: req.direction,
      amount: req.amount,
      status: req.status,
      requestedAt: req.requestedAt,
      errorMessage: req.errorMessage,
    }));
  },
});

// ========================================
// TOKEN BALANCE MUTATIONS
// ========================================

/**
 * Sync on-chain token balance
 */
export const syncTokenBalance = action({
  args: { 
    walletAddress: v.string(),
    onChainBalance: v.number(),
    blockNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get current balance record
    const tokenBalance = await ctx.runQuery(api.tokens.getPlayerBalance, {
      walletAddress: args.walletAddress,
    });

    // Update balance
    await ctx.runMutation(api.tokens.updateTokenBalance, {
      walletAddress: args.walletAddress,
      onChainBalance: args.onChainBalance,
      lastSyncedBlock: args.blockNumber,
    });

    // If there's a difference, log it
    if (tokenBalance.onChainBalance !== args.onChainBalance) {
      await ctx.runMutation(api.tokens.recordTransaction, {
        walletAddress: args.walletAddress,
        transactionType: "mint",
        amount: args.onChainBalance - tokenBalance.onChainBalance,
        direction: args.onChainBalance > tokenBalance.onChainBalance ? "credit" : "debit",
        description: "On-chain balance sync",
        onChainBalanceAfter: args.onChainBalance,
        offChainBalanceAfter: tokenBalance.offChainBalance,
      });
    }

    return { success: true };
  },
});

/**
 * Update token balance (internal)
 */
export const updateTokenBalance = mutation({
  args: {
    walletAddress: v.string(),
    onChainBalance: v.optional(v.number()),
    offChainBalance: v.optional(v.number()),
    lastSyncedBlock: v.optional(v.number()),
    tokenAccountAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!existing) {
      throw new Error("Token balance record not found");
    }

    const onChainBalance = args.onChainBalance ?? existing.onChainBalance;
    const offChainBalance = args.offChainBalance ?? existing.offChainBalance;

    await ctx.db.patch(existing._id, {
      onChainBalance,
      offChainBalance,
      totalBalance: onChainBalance + offChainBalance,
      lastSyncedAt: Date.now(),
      lastSyncedBlock: args.lastSyncedBlock,
      syncInProgress: false,
      tokenAccountAddress: args.tokenAccountAddress,
    });

    return { success: true };
  },
});

/**
 * Record a token transaction
 */
export const recordTransaction = mutation({
  args: {
    walletAddress: v.string(),
    transactionType: v.union(
      v.literal("reward"),
      v.literal("bridge_to_chain"),
      v.literal("bridge_from_chain"),
      v.literal("transfer"),
      v.literal("spend"),
      v.literal("mint"),
      v.literal("burn")
    ),
    amount: v.number(),
    direction: v.union(v.literal("credit"), v.literal("debit")),
    description: v.string(),
    onChainBalanceAfter: v.number(),
    offChainBalanceAfter: v.number(),
    sourceType: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    transactionSignature: v.optional(v.string()),
    blockNumber: v.optional(v.number()),
    fromWallet: v.optional(v.string()),
    toWallet: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const augmentee = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    await ctx.db.insert("tokenTransactions", {
      walletAddress: args.walletAddress,
      augmenteeId: augmentee?._id,
      transactionType: args.transactionType,
      amount: args.amount,
      direction: args.direction,
      onChainBalanceAfter: args.onChainBalanceAfter,
      offChainBalanceAfter: args.offChainBalanceAfter,
      description: args.description,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      transactionSignature: args.transactionSignature,
      blockNumber: args.blockNumber,
      fromWallet: args.fromWallet,
      toWallet: args.toWallet,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ========================================
// BRIDGE OPERATIONS
// ========================================

/**
 * Request bridge tokens to chain
 */
export const requestBridgeToChain = mutation({
  args: {
    walletAddress: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Check off-chain balance
    const balance = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!balance || balance.offChainBalance < args.amount) {
      throw new Error("Insufficient off-chain balance");
    }

    // Create bridge request
    const requestId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await ctx.db.insert("tokenBridgeRequests", {
      walletAddress: args.walletAddress,
      augmenteeId: balance.augmenteeId,
      direction: "to_chain",
      amount: args.amount,
      status: "pending",
      requestId,
      requestedAt: Date.now(),
      balanceBeforeBridge: {
        onChain: balance.onChainBalance,
        offChain: balance.offChainBalance,
      },
    });

    return { requestId, status: "pending" };
  },
});

/**
 * Request bridge tokens from chain
 */
export const requestBridgeFromChain = mutation({
  args: {
    walletAddress: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // Check on-chain balance
    const balance = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!balance || balance.onChainBalance < args.amount) {
      throw new Error("Insufficient on-chain balance");
    }

    // Create bridge request
    const requestId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await ctx.db.insert("tokenBridgeRequests", {
      walletAddress: args.walletAddress,
      augmenteeId: balance.augmenteeId,
      direction: "from_chain",
      amount: args.amount,
      status: "pending",
      requestId,
      requestedAt: Date.now(),
      balanceBeforeBridge: {
        onChain: balance.onChainBalance,
        offChain: balance.offChainBalance,
      },
    });

    return { requestId, status: "pending" };
  },
});

/**
 * Process bridge request (admin function)
 */
export const processBridgeRequest = mutation({
  args: {
    requestId: v.string(),
    transactionSignature: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("tokenBridgeRequests")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!request) {
      throw new Error("Bridge request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request is not pending");
    }

    if (args.success) {
      // Update balances
      const currentBalance = await ctx.db
        .query("tokenBalances")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", request.walletAddress))
        .first();

      if (!currentBalance) {
        throw new Error("Balance record not found");
      }

      let newOnChain = currentBalance.onChainBalance;
      let newOffChain = currentBalance.offChainBalance;

      if (request.direction === "to_chain") {
        newOnChain += request.amount;
        newOffChain -= request.amount;
      } else {
        newOnChain -= request.amount;
        newOffChain += request.amount;
      }

      // Update balance
      await ctx.db.patch(currentBalance._id, {
        onChainBalance: newOnChain,
        offChainBalance: newOffChain,
        totalBalance: newOnChain + newOffChain,
        lastSyncedAt: Date.now(),
      });

      // Update augmentee credits if needed
      if (request.direction === "from_chain") {
        const augmentee = await ctx.db
          .query("augmentees")
          .withIndex("by_wallet", (q) => q.eq("walletAddress", request.walletAddress))
          .first();

        if (augmentee) {
          await ctx.db.patch(augmentee._id, {
            ascentCredits: newOffChain,
          });
        }
      }

      // Record transaction
      await ctx.db.insert("tokenTransactions", {
        walletAddress: request.walletAddress,
        augmenteeId: request.augmenteeId,
        transactionType: request.direction === "to_chain" ? "bridge_to_chain" : "bridge_from_chain",
        amount: request.amount,
        direction: "credit",
        onChainBalanceAfter: newOnChain,
        offChainBalanceAfter: newOffChain,
        description: `Bridge ${request.direction === "to_chain" ? "to" : "from"} chain`,
        transactionSignature: args.transactionSignature,
        timestamp: Date.now(),
      });

      // Update request
      await ctx.db.patch(request._id, {
        status: "completed",
        transactionSignature: args.transactionSignature,
        processedAt: Date.now(),
        completedAt: Date.now(),
        balanceAfterBridge: {
          onChain: newOnChain,
          offChain: newOffChain,
        },
      });
    } else {
      // Mark as failed
      await ctx.db.patch(request._id, {
        status: "failed",
        errorMessage: args.errorMessage,
        processedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// ========================================
// REWARD SYSTEM
// ========================================

/**
 * Award tokens for gameplay activities
 */
export const awardTokens = mutation({
  args: {
    walletAddress: v.string(),
    activityType: v.union(
      v.literal("mission_completion"),
      v.literal("training_drill"),
      v.literal("achievement"),
      v.literal("daily_login"),
      v.literal("guild_contribution"),
      v.literal("leaderboard_rank"),
      v.literal("first_clear"),
      v.literal("perfect_score")
    ),
    amount: v.number(),
    sourceId: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Get or create balance record
    let balance = await ctx.db
      .query("tokenBalances")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (!balance) {
      const augmentee = await ctx.db
        .query("augmentees")
        .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
        .first();

      const balanceId = await ctx.db.insert("tokenBalances", {
        walletAddress: args.walletAddress,
        augmenteeId: augmentee?._id,
        onChainBalance: 0,
        offChainBalance: 0,
        totalBalance: 0,
        lastSyncedAt: Date.now(),
        syncInProgress: false,
      });

      balance = await ctx.db.get(balanceId);
    }

    if (!balance) {
      throw new Error("Failed to create balance record");
    }

    // Update off-chain balance
    const newOffChainBalance = balance.offChainBalance + args.amount;
    await ctx.db.patch(balance._id, {
      offChainBalance: newOffChainBalance,
      totalBalance: balance.onChainBalance + newOffChainBalance,
      lastSyncedAt: Date.now(),
    });

    // Update augmentee credits
    const augmentee = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    if (augmentee) {
      await ctx.db.patch(augmentee._id, {
        ascentCredits: newOffChainBalance,
      });
    }

    // Record transaction
    await ctx.db.insert("tokenTransactions", {
      walletAddress: args.walletAddress,
      augmenteeId: balance.augmenteeId,
      transactionType: "reward",
      amount: args.amount,
      direction: "credit",
      onChainBalanceAfter: balance.onChainBalance,
      offChainBalanceAfter: newOffChainBalance,
      description: args.description,
      sourceType: args.activityType,
      sourceId: args.sourceId,
      timestamp: Date.now(),
    });

    return { 
      success: true, 
      newBalance: newOffChainBalance,
      totalBalance: balance.onChainBalance + newOffChainBalance,
    };
  },
});

/**
 * Create token reward configuration (admin)
 */
export const createTokenReward = mutation({
  args: {
    activityType: v.union(
      v.literal("mission_completion"),
      v.literal("training_drill"),
      v.literal("achievement"),
      v.literal("daily_login"),
      v.literal("guild_contribution"),
      v.literal("leaderboard_rank"),
      v.literal("first_clear"),
      v.literal("perfect_score")
    ),
    baseAmount: v.number(),
    multiplierField: v.optional(v.string()),
    maxAmount: v.optional(v.number()),
    minimumLevel: v.optional(v.number()),
    difficultyMultiplier: v.object({
      rookie: v.number(),
      specialist: v.number(),
      elite: v.number(),
    }),
    isActive: v.boolean(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tokenRewards", {
      activityType: args.activityType,
      baseAmount: args.baseAmount,
      multiplierField: args.multiplierField,
      maxAmount: args.maxAmount,
      minimumLevel: args.minimumLevel,
      difficultyMultiplier: args.difficultyMultiplier,
      isActive: args.isActive,
      description: args.description,
    });

    return { success: true, id };
  },
});

/**
 * Get token reward configuration
 */
export const getTokenRewards = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tokenRewards")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// ========================================
// ADMIN FUNCTIONS
// ========================================

/**
 * Get token statistics (admin)
 */
export const getTokenStats = query({
  args: {},
  handler: async (ctx) => {
    const balances = await ctx.db.query("tokenBalances").collect();
    
    const totalOnChain = balances.reduce((sum, b) => sum + b.onChainBalance, 0);
    const totalOffChain = balances.reduce((sum, b) => sum + b.offChainBalance, 0);
    
    const recentTransactions = await ctx.db
      .query("tokenTransactions")
      .order("desc")
      .take(10);

    const pendingBridges = await ctx.db
      .query("tokenBridgeRequests")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return {
      totalSupply: totalOnChain + totalOffChain,
      totalOnChain,
      totalOffChain,
      totalHolders: balances.length,
      recentTransactions: recentTransactions.length,
      pendingBridges: pendingBridges.length,
    };
  },
});

// ========================================
// AIRDROP SYSTEM
// ========================================

/**
 * Airdrop tokens to new users (server action)
 */
export const airdropWelcomeTokens = action({
  args: { 
    walletAddress: v.string(),
    amount: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    amount: v.optional(v.number()),
    signature: v.optional(v.string()),
    balance: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    amount?: number;
    signature?: string;
    balance?: number;
    error?: string;
  }> => {
    const airdropAmount = args.amount || 1000; // Default 1000 ASCENT welcome bonus
    
    try {
      // Check if user already received welcome airdrop
      const existingBalance: {
        onChainBalance: number;
        offChainBalance: number;
        totalBalance: number;
        lastSyncedAt: number;
        syncInProgress: boolean;
        tokenAccountAddress: string | undefined;
      } = await ctx.runQuery(api.tokens.getPlayerBalance, {
        walletAddress: args.walletAddress
      });
      
      // If they already have on-chain tokens, skip airdrop
      if (existingBalance.onChainBalance > 0) {
        console.log(`User ${args.walletAddress} already has tokens, skipping airdrop`);
        return { 
          success: false, 
          message: "User already has tokens",
          balance: existingBalance.onChainBalance 
        };
      }

      // Check environment configuration
      const tokenMint = process.env.NEXT_PUBLIC_ASCENT_TOKEN_MINT;
      const authorityKey = process.env.ASCENT_TOKEN_AUTHORITY_PRIVATE_KEY;
      
      if (!tokenMint || !authorityKey) {
        console.error('Token configuration missing');
        return { 
          success: false, 
          message: "Token system not configured" 
        };
      }

      // Import required dependencies
      const { Connection, PublicKey, Keypair } = await import('@solana/web3.js');
      const { 
        getAssociatedTokenAddress, 
        createAssociatedTokenAccount, 
        mintTo, 
        getAccount,
        TokenAccountNotFoundError 
      } = await import('@solana/spl-token');

      // Set up connection
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl);
      
      // Parse authority private key
      let keyBytes: Uint8Array;
      
      if (authorityKey.includes('[') && authorityKey.includes(']')) {
        const parsedArray = JSON.parse(authorityKey);
        keyBytes = new Uint8Array(parsedArray);
      } else {
        // Try other formats if needed
        throw new Error('Invalid authority key format');
      }
      
      if (keyBytes.length !== 64) {
        throw new Error(`Invalid secret key length: expected 64 bytes, got ${keyBytes.length}`);
      }
      
      const authority = Keypair.fromSecretKey(keyBytes);
      const mint = new PublicKey(tokenMint);
      const recipient = new PublicKey(args.walletAddress);
      
      // Get or create token account
      const associatedTokenAddress = await getAssociatedTokenAddress(mint, recipient);
      
      let tokenAccount;
      try {
        await getAccount(connection, associatedTokenAddress);
        tokenAccount = associatedTokenAddress;
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          // Create new token account
          tokenAccount = await createAssociatedTokenAccount(
            connection,
            authority,
            mint,
            recipient
          );
        } else {
          throw error;
        }
      }
      
      // Mint tokens
      const amountWithDecimals = BigInt(airdropAmount * Math.pow(10, 6)); // 6 decimals
      const signature = await mintTo(
        connection,
        authority,
        mint,
        tokenAccount,
        authority,
        amountWithDecimals
      );
      
      // Update database balance
      await ctx.runMutation(api.tokens.createTokenBalance, {
        walletAddress: args.walletAddress,
      });
      
      // Record transaction
      await ctx.runMutation(api.tokens.awardTokens, {
        walletAddress: args.walletAddress,
        activityType: "daily_login",
        amount: 0, // Don't double-count, this is just for record keeping
        description: `Welcome Airdrop: ${airdropAmount} ASCENT tokens`,
      });
      
      console.log(`✅ Airdropped ${airdropAmount} ASCENT to ${args.walletAddress}`);
      console.log(`🔗 Transaction: ${signature}`);
      
      return { 
        success: true, 
        amount: airdropAmount,
        signature,
        message: `Welcome! ${airdropAmount} ASCENT tokens sent to your wallet` 
      };
      
    } catch (error) {
      console.error('Airdrop failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error",
        error: String(error)
      };
    }
  },
}); 