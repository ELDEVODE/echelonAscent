import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Player profiles and progression
  augmentees: defineTable({
    walletAddress: v.string(),
    displayName: v.string(),
    level: v.number(),
    experiencePoints: v.number(),
    ascentCredits: v.number(), // Off-chain balance for fast gameplay
    
    // Bionic Attributes
    accuracy: v.number(),
    reflex: v.number(),
    cognition: v.number(),
    
    // Progression tracking
    totalMissionsCompleted: v.number(),
    reputationTechLab: v.number(),
    reputationSecurityWing: v.number(),
    reputationCommandCenter: v.number(),
    
    // Ascension system
    ascensionLevel: v.number(),
    ascensionPoints: v.number(),
    
    // Activity tracking
    lastLoginTime: v.number(),
    dailyTrainingCompleted: v.boolean(),
    
    // Admin moderation
    isBanned: v.optional(v.boolean()),
    
    _creationTime: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_level", ["level"])
    .index("by_ascension", ["ascensionLevel"]),

  // Guild system
  guilds: defineTable({
    name: v.string(),
    description: v.string(),
    leaderWallet: v.string(),
    memberCount: v.number(),
    guildLevel: v.number(),
    guildExperience: v.number(),
    bankCredits: v.number(),
    
    // Seasonal competition
    seasonalRanking: v.number(),
    ownedSector: v.optional(v.string()), // Academy sector they own
    
    _creationTime: v.number(),
  })
    .index("by_leader", ["leaderWallet"])
    .index("by_ranking", ["seasonalRanking"]),

  // Guild membership
  guildMembers: defineTable({
    guildId: v.id("guilds"),
    augmenteeId: v.id("augmentees"),
    role: v.union(v.literal("leader"), v.literal("officer"), v.literal("member")),
    joinedAt: v.number(),
    contributionPoints: v.number(),
  })
    .index("by_guild", ["guildId"])
    .index("by_augmentee", ["augmenteeId"]),

  // Training sessions and results
  trainingSessionResults: defineTable({
    augmenteeId: v.id("augmentees"),
    drillType: v.union(
      v.literal("precision_aiming"), 
      v.literal("data_decryption"), 
      v.literal("kinetic_reflex")
    ),
    score: v.number(),
    attributeGained: v.number(), // Micro-gains earned
    creditsEarned: v.number(),
    experienceEarned: v.number(),
    completedAt: v.number(),
  })
    .index("by_augmentee", ["augmenteeId"])
    .index("by_drill_type", ["drillType"])
    .index("by_completion_time", ["completedAt"]),

  // Mission system
  missions: defineTable({
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("rookie"), v.literal("specialist"), v.literal("elite")),
    missionType: v.union(v.literal("stealth"), v.literal("combat"), v.literal("hacking"), v.literal("rescue")),
    
    // Requirements
    minimumLevel: v.number(),
    requiredAccuracy: v.optional(v.number()),
    requiredReflex: v.optional(v.number()),
    requiredCognition: v.optional(v.number()),
    
    // Rewards
    baseCredits: v.number(),
    baseExperience: v.number(),
    
    // Faction rewards
    techLabReputation: v.number(),
    securityWingReputation: v.number(),
    commandCenterReputation: v.number(),
    
    // Loot generation
    lootTable: v.array(v.object({
      itemType: v.string(),
      rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
      dropChance: v.number(),
    })),
    
    // Content management
    isActive: v.boolean(),
    isStoryMission: v.boolean(),
    isGuildMission: v.boolean(),
    firstClearReward: v.optional(v.string()), // Special NFT for first clear
    
    // Admin tracking fields
    createdBy: v.optional(v.id("admins")),
    lastModifiedBy: v.optional(v.id("admins")),
    
    _creationTime: v.number(),
  })
    .index("by_difficulty", ["difficulty"])
    .index("by_active", ["isActive"])
    .index("by_guild_mission", ["isGuildMission"]),

  // Mission completion records
  missionCompletions: defineTable({
    missionId: v.id("missions"),
    augmenteeId: v.id("augmentees"),
    guildId: v.optional(v.id("guilds")),
    
    // Performance metrics
    completionTime: v.number(), // seconds taken
    efficiencyRating: v.number(), // 0-100%
    stealthRating: v.optional(v.number()),
    combatRating: v.optional(v.number()),
    
    // Rewards earned
    creditsEarned: v.number(),
    experienceEarned: v.number(),
    lootGenerated: v.array(v.object({
      itemType: v.string(),
      rarity: v.string(),
      nftMinted: v.boolean(),
      nftAddress: v.optional(v.string()),
    })),
    
    // Rankings
    isFirstClear: v.boolean(),
    
    completedAt: v.number(),
  })
    .index("by_mission", ["missionId"])
    .index("by_augmentee", ["augmenteeId"])
    .index("by_completion_time", ["completionTime"])
    .index("by_guild", ["guildId"]),

  // NFT Asset Registry (mirrors on-chain state)
  nftAssets: defineTable({
    ownerWallet: v.string(),
    ownerAugmenteeId: v.optional(v.id("augmentees")),
    
    // On-chain data
    nftAddress: v.string(),
    collectionAddress: v.string(),
    
    // Asset metadata
    assetType: v.union(
      v.literal("chrono_tech_gadget_schematic"),
      v.literal("augmented_ability_module"),
      v.literal("suit_modification"),
      v.literal("cosmetic_enhancement")
    ),
    
    // Game-specific attributes
    name: v.string(),
    description: v.string(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    powerLevel: v.number(),
    
    // Gadget-specific properties (if applicable)
    gadgetType: v.optional(v.union(
      v.literal("stealth_cloak"),
      v.literal("neural_enhancer"),
      v.literal("kinetic_amplifier"),
      v.literal("data_siphon")
    )),
    
    // Marketplace data
    isListed: v.boolean(),
    listPrice: v.optional(v.number()),
    listedAt: v.optional(v.number()),
    
    // Acquisition tracking
    sourceType: v.union(v.literal("mission_loot"), v.literal("tech_lab_craft"), v.literal("marketplace_purchase")),
    sourceId: v.optional(v.string()),
    
    mintedAt: v.number(),
    _creationTime: v.number(),
  })
    .index("by_owner", ["ownerWallet"])
    .index("by_asset_type", ["assetType"])
    .index("by_rarity", ["rarity"])
    .index("by_marketplace", ["isListed"])
    .index("by_nft_address", ["nftAddress"]),

  // Marketplace transactions
  marketplaceTransactions: defineTable({
    nftAssetId: v.id("nftAssets"),
    nftAddress: v.string(),
    
    sellerWallet: v.string(),
    buyerWallet: v.string(),
    salePrice: v.number(),
    
    // Transaction details
    transactionSignature: v.string(),
    academyFee: v.number(), // Percentage taken by the academy
    
    completedAt: v.number(),
  })
    .index("by_seller", ["sellerWallet"])
    .index("by_buyer", ["buyerWallet"])
    .index("by_nft", ["nftAssetId"])
    .index("by_transaction_time", ["completedAt"]),

  // Crafting and upgrading records
  techLabActivities: defineTable({
    augmenteeId: v.id("augmentees"),
    activityType: v.union(v.literal("craft_gadget"), v.literal("upgrade_module")),
    
    // Crafting details
    resultAssetId: v.optional(v.id("nftAssets")),
    schematicUsed: v.optional(v.id("nftAssets")),
    
    // Resource costs
    creditsSpent: v.number(),
    materialsUsed: v.array(v.object({
      materialType: v.string(),
      quantity: v.number(),
    })),
    
    // Results
    success: v.boolean(),
    powerLevelGained: v.optional(v.number()),
    
    completedAt: v.number(),
  })
    .index("by_augmentee", ["augmenteeId"])
    .index("by_activity_type", ["activityType"])
    .index("by_completion_time", ["completedAt"]),

  // System-wide game state
  gameState: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    lastUpdated: v.number(),
  })
    .index("by_key", ["key"]),

  // Seasonal competition tracking
  seasonalRankings: defineTable({
    season: v.number(),
    guildId: v.id("guilds"),
    guildName: v.string(),
    totalPoints: v.number(),
    rank: v.number(),
    sectorAwarded: v.optional(v.string()),
    
    seasonEndTime: v.number(),
  })
    .index("by_season", ["season"])
    .index("by_rank", ["rank"])
    .index("by_guild", ["guildId"]),

  // Event log for admin monitoring and analytics
  activityLog: defineTable({
    augmenteeId: v.optional(v.id("augmentees")),
    eventType: v.string(),
    eventData: v.object({}), // Flexible JSON for different event types
    timestamp: v.number(),
  })
    .index("by_augmentee", ["augmenteeId"])
    .index("by_event_type", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  // Admin system
  admins: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("game_master"), v.literal("content_manager")),
    permissions: v.array(v.string()),
    isActive: v.boolean(),
    lastLoginTime: v.optional(v.number()),
    password: v.string(), // Hashed password
  })
    .index("by_email", ["email"]),

  // Admin session management
  adminSessions: defineTable({
    adminId: v.id("admins"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_admin", ["adminId"]),

  // Admin action logging
  adminActions: defineTable({
    adminId: v.id("admins"),
    actionType: v.string(),
    description: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_timestamp", ["timestamp"]),

  // Game configuration
  gameConfig: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.string(),
    category: v.union(v.literal("economy"), v.literal("gameplay"), v.literal("events"), v.literal("system")),
    lastUpdatedAt: v.number(),
    lastUpdatedBy: v.optional(v.id("admins")),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // Training results (alias for trainingSessionResults for backward compatibility)
  trainingResults: defineTable({
    augmenteeId: v.id("augmentees"),
    drillType: v.union(
      v.literal("precision_aiming"), 
      v.literal("data_decryption"), 
      v.literal("kinetic_reflex")
    ),
    score: v.number(),
    attributeGained: v.number(), // Micro-gains earned
    creditsEarned: v.number(),
    experienceEarned: v.number(),
    completedAt: v.number(),
  })
    .index("by_augmentee", ["augmenteeId"])
    .index("by_drill_type", ["drillType"])
    .index("by_completion_time", ["completedAt"]),

  // Training drills database
  trainingDrills: defineTable({
    name: v.string(),
    category: v.union(v.literal("cognition"), v.literal("reflex"), v.literal("accuracy"), v.literal("endurance")),
    difficulty: v.number(),
    duration: v.number(), // in seconds
    description: v.string(),
    icon: v.string(),
    rewards: v.object({
      credits: v.number(),
      xp: v.number(),
    }),
    requirements: v.object({
      level: v.number(),
    }),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("admins")),
    _creationTime: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Marketplace items database
  marketplaceItems: defineTable({
    name: v.string(),
    category: v.string(),
    price: v.number(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    description: v.string(),
    icon: v.string(),
    inStock: v.number(),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("admins")),
    _creationTime: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_rarity", ["rarity"])
    .index("by_active", ["isActive"]),

  // Player loadout items
  loadoutItems: defineTable({
    playerWallet: v.string(),
    itemName: v.string(),
    itemType: v.union(v.literal("ability"), v.literal("gadget")),
    equipped: v.boolean(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    description: v.string(),
    properties: v.any(), // Flexible JSON for item-specific properties
    acquiredAt: v.number(),
  })
    .index("by_player", ["playerWallet"])
    .index("by_type", ["itemType"])
    .index("by_equipped", ["equipped"]),

  // Player materials inventory
  playerMaterials: defineTable({
    playerWallet: v.string(),
    materialName: v.string(),
    quantity: v.number(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    description: v.string(),
    category: v.string(),
  })
    .index("by_player", ["playerWallet"])
    .index("by_material", ["materialName"]),

  // Crafting schematics
  craftingSchematics: defineTable({
    name: v.string(),
    category: v.union(v.literal("weapon"), v.literal("armor"), v.literal("augmentation"), v.literal("utility")),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    description: v.string(),
    craftingCost: v.object({
      credits: v.number(),
      materials: v.array(v.object({
        materialId: v.string(),
        quantity: v.number(),
      })),
    }),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("admins")),
    _creationTime: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // Upgradeable items
  upgradeableItems: defineTable({
    name: v.string(),
    itemType: v.union(v.literal("ability"), v.literal("gadget")),
    maxLevel: v.number(),
    rarity: v.union(v.literal("common"), v.literal("rare"), v.literal("epic"), v.literal("legendary")),
    description: v.string(),
    upgradeCost: v.object({
      credits: v.number(),
      materials: v.array(v.object({
        materialId: v.string(),
        quantity: v.number(),
      })),
    }),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("admins")),
    _creationTime: v.number(),
  })
    .index("by_type", ["itemType"])
    .index("by_active", ["isActive"]),

  // Player upgradeable item progress
  playerUpgrades: defineTable({
    playerWallet: v.string(),
    itemId: v.id("upgradeableItems"),
    currentLevel: v.number(),
    lastUpgraded: v.number(),
  })
    .index("by_player", ["playerWallet"])
    .index("by_item", ["itemId"]),

  // Training game configurations
  trainingGameConfigs: defineTable({
    drillId: v.id("trainingDrills"),
    gameType: v.union(
      // Cognition games
      v.literal("pattern_matrix"),
      v.literal("data_decryption"),
      v.literal("neural_sync"),
      v.literal("memory_bank"),
      // Reflex games
      v.literal("reaction_grid"),
      v.literal("sequence_rush"),
      v.literal("reflex_chain"),
      v.literal("combat_simulator"),
      // Accuracy games
      v.literal("precision_target"),
      v.literal("trajectory_hunter"),
      v.literal("sniper_training"),
      v.literal("targeting_matrix"),
      // Endurance games
      v.literal("stamina_test"),
      v.literal("endurance_trial"),
      v.literal("marathon_mode"),
      v.literal("persistence_challenge"),
      v.literal("stamina_rush")
    ),
    config: v.object({
      gridSize: v.optional(v.number()),
      timeLimit: v.optional(v.number()),
      difficulty: v.optional(v.number()),
      lives: v.optional(v.number()),
      targetCount: v.optional(v.number()),
      speed: v.optional(v.number()),
      precision: v.optional(v.number()),
    }),
    isActive: v.boolean(),
  })
    .index("by_drill", ["drillId"])
    .index("by_game_type", ["gameType"]),

  // Training game sessions for tracking gameplay
  trainingGameSessions: defineTable({
    playerWallet: v.string(),
    drillId: v.id("trainingDrills"),
    gameType: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    finalScore: v.optional(v.number()),
    performance: v.optional(v.object({
      accuracy: v.number(),
      reactionTime: v.number(),
      level: v.number(),
      perfectRounds: v.number(),
      totalRounds: v.number(),
    })),
    isCompleted: v.boolean(),
    creditsEarned: v.optional(v.number()),
    xpEarned: v.optional(v.number()),
  })
    .index("by_player", ["playerWallet"])
    .index("by_drill", ["drillId"])
    .index("by_start_time", ["startTime"]),

  // Training leaderboards
  trainingLeaderboards: defineTable({
    drillId: v.id("trainingDrills"),
    gameType: v.string(),
    playerWallet: v.string(),
    playerName: v.string(),
    highScore: v.number(),
    bestPerformance: v.object({
      accuracy: v.number(),
      reactionTime: v.number(),
      level: v.number(),
    }),
    achievedAt: v.number(),
    rank: v.optional(v.number()),
  })
    .index("by_drill", ["drillId"])
    .index("by_game_type", ["gameType"])
    .index("by_score", ["highScore"])
    .index("by_player", ["playerWallet"]),

  // Token balances - tracks both on-chain and off-chain ASCENT tokens
  tokenBalances: defineTable({
    walletAddress: v.string(),
    augmenteeId: v.optional(v.id("augmentees")),
    
    // Balance tracking
    onChainBalance: v.number(), // Actual SPL token balance
    offChainBalance: v.number(), // Fast gameplay balance (mirrors ascentCredits)
    totalBalance: v.number(), // Combined balance for display
    
    // Synchronization
    lastSyncedAt: v.number(),
    lastSyncedBlock: v.optional(v.number()),
    syncInProgress: v.boolean(),
    
    // Token account info
    tokenAccountAddress: v.optional(v.string()),
    
    _creationTime: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_augmentee", ["augmenteeId"])
    .index("by_last_synced", ["lastSyncedAt"]),

  // Token transactions - comprehensive transaction history
  tokenTransactions: defineTable({
    walletAddress: v.string(),
    augmenteeId: v.optional(v.id("augmentees")),
    
    // Transaction details
    transactionType: v.union(
      v.literal("reward"), // Earned from gameplay
      v.literal("bridge_to_chain"), // Off-chain to on-chain
      v.literal("bridge_from_chain"), // On-chain to off-chain
      v.literal("transfer"), // P2P transfer
      v.literal("spend"), // Purchase/upgrade
      v.literal("mint"), // Initial token creation
      v.literal("burn") // Token destruction
    ),
    
    amount: v.number(),
    direction: v.union(v.literal("credit"), v.literal("debit")),
    
    // Balances after transaction
    onChainBalanceAfter: v.number(),
    offChainBalanceAfter: v.number(),
    
    // Transaction metadata
    description: v.string(),
    sourceType: v.optional(v.string()), // e.g., "mission_completion", "training_drill"
    sourceId: v.optional(v.string()),
    
    // Blockchain data (if applicable)
    transactionSignature: v.optional(v.string()),
    blockNumber: v.optional(v.number()),
    
    // Related addresses
    fromWallet: v.optional(v.string()),
    toWallet: v.optional(v.string()),
    
    timestamp: v.number(),
    _creationTime: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_type", ["transactionType"])
    .index("by_timestamp", ["timestamp"])
    .index("by_signature", ["transactionSignature"]),

  // Token rewards configuration - defines how tokens are earned
  tokenRewards: defineTable({
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
    
    // Reward calculation
    baseAmount: v.number(),
    multiplierField: v.optional(v.string()), // Field to multiply by (e.g., "score", "difficulty")
    maxAmount: v.optional(v.number()),
    
    // Conditions
    minimumLevel: v.optional(v.number()),
    difficultyMultiplier: v.object({
      rookie: v.number(),
      specialist: v.number(),
      elite: v.number(),
    }),
    
    // Configuration
    isActive: v.boolean(),
    description: v.string(),
    
    // Admin tracking
    lastModifiedBy: v.optional(v.id("admins")),
    _creationTime: v.number(),
  })
    .index("by_activity", ["activityType"])
    .index("by_active", ["isActive"]),

  // Token bridge requests - manages transfers between on-chain and off-chain
  tokenBridgeRequests: defineTable({
    walletAddress: v.string(),
    augmenteeId: v.optional(v.id("augmentees")),
    
    // Bridge details
    direction: v.union(v.literal("to_chain"), v.literal("from_chain")),
    amount: v.number(),
    
    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    
    // Transaction info
    requestId: v.string(), // Unique identifier
    transactionSignature: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    
    // Timing
    requestedAt: v.number(),
    processedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    
    // Balance snapshots
    balanceBeforeBridge: v.object({
      onChain: v.number(),
      offChain: v.number(),
    }),
    balanceAfterBridge: v.optional(v.object({
      onChain: v.number(),
      offChain: v.number(),
    })),
    
    _creationTime: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_status", ["status"])
    .index("by_direction", ["direction"])
    .index("by_request_id", ["requestId"])
    .index("by_requested_at", ["requestedAt"]),

  // Token configuration - system-wide token settings
  tokenConfig: defineTable({
    key: v.string(), // e.g., "mint_address", "decimals", "total_supply"
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.string(),
    category: v.union(
      v.literal("contract"), // Smart contract addresses
      v.literal("economics"), // Token economics settings
      v.literal("bridge"), // Bridge configuration
      v.literal("rewards") // Reward system settings
    ),
    lastUpdatedAt: v.number(),
    lastUpdatedBy: v.optional(v.id("admins")),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),
});