import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// ========================================
// AUGMENTEE MANAGEMENT
// ========================================

/**
 * Create or get an augmentee profile for a wallet address
 */
export const createOrGetAugmentee = mutation({
  args: {
    walletAddress: v.string(),
    displayName: v.string(),
  },
  returns: v.id("augmentees"),
  handler: async (ctx, args) => {
    // Check if augmentee already exists
    const existing = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .unique();

    if (existing) {
      // Update login time
      await ctx.db.patch(existing._id, {
        lastLoginTime: Date.now(),
      });
      return existing._id;
    }

    // Create new augmentee with starter stats
    const newAugmenteeId = await ctx.db.insert("augmentees", {
      walletAddress: args.walletAddress,
      displayName: args.displayName,
      level: 1,
      experiencePoints: 0,
      ascentCredits: 1000, // Starting credits
      
      // Starting attributes
      accuracy: 1.0,
      reflex: 1.0,
      cognition: 1.0,
      
      // Progression
      totalMissionsCompleted: 0,
      reputationTechLab: 0,
      reputationSecurityWing: 0,
      reputationCommandCenter: 0,
      
      // Ascension
      ascensionLevel: 0,
      ascensionPoints: 0,
      
      // Activity
      lastLoginTime: Date.now(),
      dailyTrainingCompleted: false,
    });

    // Trigger welcome token airdrop for new users
    try {
      await ctx.scheduler.runAfter(0, api.tokens.airdropWelcomeTokens, {
        walletAddress: args.walletAddress,
        amount: 1000, // 1000 ASCENT welcome bonus
      });
      console.log(`🎁 Scheduled welcome airdrop for new user: ${args.walletAddress}`);
    } catch (error) {
      console.error('Failed to schedule welcome airdrop:', error);
      // Don't fail user creation if airdrop fails
    }

    return newAugmenteeId;
  },
});

/**
 * Get augmentee profile by wallet address
 */
export const getAugmenteeByWallet = query({
  args: {
    walletAddress: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("augmentees"),
      walletAddress: v.string(),
      displayName: v.string(),
      level: v.number(),
      experiencePoints: v.number(),
      ascentCredits: v.number(),
      accuracy: v.number(),
      reflex: v.number(),
      cognition: v.number(),
      totalMissionsCompleted: v.number(),
      reputationTechLab: v.number(),
      reputationSecurityWing: v.number(),
      reputationCommandCenter: v.number(),
      ascensionLevel: v.number(),
      ascensionPoints: v.number(),
      lastLoginTime: v.number(),
      dailyTrainingCompleted: v.boolean(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .unique();
  },
});

// ========================================
// TRAINING SYSTEM
// ========================================

/**
 * Complete a training drill and earn rewards
 */
export const completeTrainingDrill = mutation({
  args: {
    augmenteeId: v.id("augmentees"),
    drillType: v.union(
      v.literal("precision_aiming"), 
      v.literal("data_decryption"), 
      v.literal("kinetic_reflex")
    ),
    score: v.number(),
  },
  returns: v.object({
    creditsEarned: v.number(),
    experienceEarned: v.number(),
    attributeGained: v.number(),
    leveledUp: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const augmentee = await ctx.db.get(args.augmenteeId);
    if (!augmentee) {
      throw new Error("Augmentee not found");
    }

    // Calculate rewards based on score
    const baseCredits = 50;
    const baseExp = 25;
    const scoreMultiplier = Math.max(0.5, Math.min(2.0, args.score / 100));
    
    const creditsEarned = Math.floor(baseCredits * scoreMultiplier);
    const experienceEarned = Math.floor(baseExp * scoreMultiplier);
    
    // Attribute micro-gains (0.01 to 0.05 based on performance)
    const attributeGained = 0.01 + (Math.min(args.score, 100) / 100) * 0.04;

    // Update augmentee stats
    const newExperience = augmentee.experiencePoints + experienceEarned;
    const newCredits = augmentee.ascentCredits + creditsEarned;
    
    // Level up calculation (every 1000 XP)
    const newLevel = Math.floor(newExperience / 1000) + 1;
    const leveledUp = newLevel > augmentee.level;

    // Update specific attribute based on drill type
    const attributeUpdates: any = {
      experiencePoints: newExperience,
      ascentCredits: newCredits,
      level: newLevel,
    };

    switch (args.drillType) {
      case "precision_aiming":
        attributeUpdates.accuracy = augmentee.accuracy + attributeGained;
        break;
      case "kinetic_reflex":
        attributeUpdates.reflex = augmentee.reflex + attributeGained;
        break;
      case "data_decryption":
        attributeUpdates.cognition = augmentee.cognition + attributeGained;
        break;
    }

    await ctx.db.patch(args.augmenteeId, attributeUpdates);

    // Record training result
    await ctx.db.insert("trainingResults", {
      augmenteeId: args.augmenteeId,
      drillType: args.drillType,
      score: args.score,
      attributeGained,
      creditsEarned,
      experienceEarned,
      completedAt: Date.now(),
    });

    return {
      creditsEarned,
      experienceEarned,
      attributeGained,
      leveledUp,
    };
  },
});

/**
 * Get training history for an augmentee
 */
export const getTrainingHistory = query({
  args: {
    augmenteeId: v.id("augmentees"),
    limit: v.number(),
  },
  returns: v.array(v.object({
    _id: v.id("trainingResults"),
    drillType: v.union(
      v.literal("precision_aiming"), 
      v.literal("data_decryption"), 
      v.literal("kinetic_reflex")
    ),
    score: v.number(),
    attributeGained: v.number(),
    creditsEarned: v.number(),
    experienceEarned: v.number(),
    completedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainingResults")
      .withIndex("by_augmentee", (q) => q.eq("augmenteeId", args.augmenteeId))
      .order("desc")
      .take(args.limit);
  },
});

// ========================================
// MISSION SYSTEM
// ========================================

/**
 * Get available missions for an augmentee
 */
export const getAvailableMissions = query({
  args: {
    augmenteeId: v.id("augmentees"),
  },
  returns: v.array(v.object({
    _id: v.id("missions"),
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("rookie"), v.literal("specialist"), v.literal("elite")),
    missionType: v.union(v.literal("stealth"), v.literal("combat"), v.literal("hacking"), v.literal("rescue")),
    minimumLevel: v.number(),
    requiredAccuracy: v.optional(v.number()),
    requiredReflex: v.optional(v.number()),
    requiredCognition: v.optional(v.number()),
    baseCredits: v.number(),
    baseExperience: v.number(),
    canAttempt: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const augmentee = await ctx.db.get(args.augmenteeId);
    if (!augmentee) {
      throw new Error("Augmentee not found");
    }

    const missions = await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return missions.map(mission => {
      // Check if augmentee meets requirements
      const meetsLevel = augmentee.level >= mission.minimumLevel;
      const meetsAccuracy = !mission.requiredAccuracy || augmentee.accuracy >= mission.requiredAccuracy;
      const meetsReflex = !mission.requiredReflex || augmentee.reflex >= mission.requiredReflex;
      const meetsCognition = !mission.requiredCognition || augmentee.cognition >= mission.requiredCognition;
      
      const canAttempt = meetsLevel && meetsAccuracy && meetsReflex && meetsCognition;

    return {
        _id: mission._id,
        title: mission.title,
        description: mission.description,
        difficulty: mission.difficulty,
        missionType: mission.missionType,
        minimumLevel: mission.minimumLevel,
        requiredAccuracy: mission.requiredAccuracy,
        requiredReflex: mission.requiredReflex,
        requiredCognition: mission.requiredCognition,
        baseCredits: mission.baseCredits,
        baseExperience: mission.baseExperience,
        canAttempt,
      };
    });
  },
});

// ========================================
// LEADERBOARDS
// ========================================

/**
 * Get leaderboard data
 */
export const getLeaderboard = query({
  args: {
    sortBy: v.union(v.literal("level"), v.literal("ascension")),
    limit: v.number(),
  },
  returns: v.array(v.object({
    _id: v.id("augmentees"),
    displayName: v.string(),
    level: v.number(),
    ascensionLevel: v.number(),
    totalMissionsCompleted: v.number(),
  })),
  handler: async (ctx, args) => {
    const indexName = args.sortBy === "level" ? "by_level" : "by_ascension";
    
    const augmentees = await ctx.db
      .query("augmentees")
      .withIndex(indexName)
      .order("desc")
      .take(args.limit);

    return augmentees.map(aug => ({
      _id: aug._id,
      displayName: aug.displayName,
      level: aug.level,
      ascensionLevel: aug.ascensionLevel,
      totalMissionsCompleted: aug.totalMissionsCompleted,
    }));
  },
});

// ========================================
// LEGACY FUNCTION (for demo purposes)
// ========================================

export const listNumbers = query({
  args: {
    count: v.number(),
  },
  returns: v.object({
    viewer: v.optional(v.string()),
    numbers: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    // This is kept for compatibility with existing demo
    return {
      viewer: "Anonymous Augmentee",
      numbers: [1, 2, 3, 4, 5].slice(0, args.count),
    };
  },
});

export const addNumber = mutation({
  args: {
    value: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Legacy function - could be removed
    return null;
  },
});

// ========================================
// CLIENT DASHBOARD FUNCTIONS
// ========================================

/**
 * Get current augmentee for the authenticated user
 */
export const getCurrentAugmentee = mutation({
  args: {
    userWallet: v.string(),
    userName: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("augmentees"),
      walletAddress: v.string(),
      displayName: v.string(),
      level: v.number(),
      experiencePoints: v.number(),
      ascentCredits: v.number(),
      accuracy: v.number(),
      reflex: v.number(),
      cognition: v.number(),
      totalMissionsCompleted: v.number(),
      reputationTechLab: v.number(),
      reputationSecurityWing: v.number(),
      reputationCommandCenter: v.number(),
      ascensionLevel: v.number(),
      ascensionPoints: v.number(),
      lastLoginTime: v.number(),
      dailyTrainingCompleted: v.boolean(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Try to find existing augmentee by wallet
    let existing = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();

    if (existing) {
      // Update the display name if it has changed
      if (existing.displayName !== args.userName) {
        await ctx.db.patch(existing._id, {
          displayName: args.userName,
          lastLoginTime: Date.now(),
        });
        // Return updated record
        existing = await ctx.db.get(existing._id);
      }
      return existing;
    }

    // Create new augmentee if doesn't exist
    const newAugmenteeId = await ctx.db.insert("augmentees", {
      walletAddress: args.userWallet,
      displayName: args.userName,
      level: 1,
      experiencePoints: 0,
      ascentCredits: 1000, // Starting credits
      
      // Starting attributes
      accuracy: 1.0,
      reflex: 1.0,
      cognition: 1.0,
      
      // Progression
      totalMissionsCompleted: 0,
      reputationTechLab: 0,
      reputationSecurityWing: 0,
      reputationCommandCenter: 0,
      
      // Ascension
      ascensionLevel: 0,
      ascensionPoints: 0,
      
      // Activity
      lastLoginTime: Date.now(),
      dailyTrainingCompleted: false,
    });

    // Trigger welcome token airdrop for new users
    try {
      await ctx.scheduler.runAfter(0, api.tokens.airdropWelcomeTokens, {
        walletAddress: args.userWallet,
        amount: 1000, // 1000 ASCENT welcome bonus
      });
      console.log(`🎁 Scheduled welcome airdrop for new user: ${args.userWallet}`);
    } catch (error) {
      console.error('Failed to schedule welcome airdrop:', error);
      // Don't fail user creation if airdrop fails
    }

    return await ctx.db.get(newAugmenteeId);
  },
});

/**
 * Get missions for dashboard (simple version without requirements)
 */
export const getDashboardMissions = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("missions"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal("rookie"), v.literal("specialist"), v.literal("elite")),
    missionType: v.union(v.literal("stealth"), v.literal("combat"), v.literal("hacking"), v.literal("rescue")),
    minimumLevel: v.number(),
    baseCredits: v.number(),
    baseExperience: v.number(),
    isActive: v.boolean(),
    isGuildMission: v.optional(v.boolean()),
    isStoryMission: v.optional(v.boolean()),
    createdBy: v.optional(v.id("admins")),
    lastModifiedBy: v.optional(v.id("admins")),
    requiredAccuracy: v.optional(v.number()),
    requiredCognition: v.optional(v.number()),
    requiredReflex: v.optional(v.number()),
    commandCenterReputation: v.optional(v.number()),
    securityWingReputation: v.optional(v.number()),
    techLabReputation: v.optional(v.number()),
    lootTable: v.optional(v.array(v.any())),
  })),
  handler: async (ctx) => {
    return await ctx.db
      .query("missions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .take(10);
  },
});

/**
 * Get player stats for dashboard analytics
 */
export const getPlayerStats = query({
  args: {},
  returns: v.union(
    v.object({
      totalPlayers: v.number(),
      averageLevel: v.number(),
      totalMissionsCompleted: v.number(),
      totalCreditsInCirculation: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const players = await ctx.db.query("augmentees").collect();
    
    if (players.length === 0) {
      return null;
    }

    const totalPlayers = players.length;
    const averageLevel = players.reduce((sum, p) => sum + p.level, 0) / totalPlayers;
    const totalMissionsCompleted = players.reduce((sum, p) => sum + p.totalMissionsCompleted, 0);
    const totalCreditsInCirculation = players.reduce((sum, p) => sum + p.ascentCredits, 0);

    return {
      totalPlayers,
      averageLevel,
      totalMissionsCompleted,
      totalCreditsInCirculation,
    };
  },
});

/**
 * Get recent activity for dashboard
 */
export const getRecentActivity = query({
  args: {},
  returns: v.array(v.object({
    id: v.string(),
    type: v.union(v.literal("mission"), v.literal("training"), v.literal("achievement")),
    title: v.string(),
    description: v.string(),
    timestamp: v.string(),
  })),
  handler: async (ctx) => {
    // For now, return static data - in the future this could be from a activity log table
    const recentTraining = await ctx.db
      .query("trainingResults")
      .order("desc")
      .take(3);

    const activities = recentTraining.map((training, index) => ({
      id: training._id,
      type: "training" as const,
      title: `${training.drillType.replace('_', ' ').toUpperCase()} Training`,
      description: `Score: ${training.score} • Gained ${training.attributeGained.toFixed(2)} attribute points`,
      timestamp: new Date(training.completedAt).toLocaleString(),
    }));

    // Add some demo activities if no training data
    if (activities.length === 0) {
      return [
        {
          id: "demo1",
          type: "mission" as const,
          title: "Data Extraction",
          description: "Successfully infiltrated SecureCorp database",
          timestamp: "2 hours ago",
        },
        {
          id: "demo2", 
          type: "training" as const,
          title: "Neural Sync Training",
          description: "Improved reaction time by 15ms",
          timestamp: "4 hours ago",
        },
        {
          id: "demo3",
          type: "achievement" as const,
          title: "First Mission Complete",
          description: "Completed your first simulation mission",
          timestamp: "1 day ago",
        },
      ];
    }

    return activities;
  },
});

// ==================== TRAINING FUNCTIONS ====================

export const getTrainingDrills = query({
  args: {},
  handler: async (ctx) => {
    // Get all active training drills from database
    const drills = await ctx.db
      .query("trainingDrills")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Transform database drills to frontend format
    return drills.map(drill => ({
      id: drill._id,
      name: drill.name,
      category: drill.category,
      difficulty: drill.difficulty,
      duration: drill.duration,
      description: drill.description,
      rewards: drill.rewards,
      requirements: drill.requirements,
      icon: drill.icon
    }));
  },
});

export const getPlayerTrainingHistory = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // For now return empty array, could be expanded to track training history
    return [];
  },
});

export const submitTrainingResult = mutation({
  args: {
    userWallet: v.string(),
    drillId: v.string(),
    score: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Calculate rewards based on score (0-100)
    const baseCredits = 50;
    const baseXp = 25;
    const multiplier = Math.min(args.score / 100, 1.5); // Cap at 1.5x for exceptional performance

    const creditsEarned = Math.floor(baseCredits * multiplier);
    const xpEarned = Math.floor(baseXp * multiplier);

    // Update player stats
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits + creditsEarned,
      experiencePoints: currentPlayer.experiencePoints + xpEarned,
      level: Math.floor((currentPlayer.experiencePoints + xpEarned) / 100) + 1,
    });

    return { 
      success: true, 
      creditsEarned, 
      xpEarned, 
      message: `Training completed! +${creditsEarned} credits, +${xpEarned} XP` 
    };
  },
});

// ==================== SIMULATION/MISSIONS FUNCTIONS ====================

export const getSimulationMissions = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get player data to check requirements and completion status
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();

    // Get all active missions from database
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get player's mission completion records
    const completedMissions = currentPlayer ? await ctx.db
      .query("missionCompletions")
      .withIndex("by_augmentee", (q) => q.eq("augmenteeId", currentPlayer._id))
      .collect() : [];

    // Transform database missions to frontend format with dynamic status
    return missions.map(mission => {
      const playerLevel = currentPlayer?.level || 1;
      const playerAccuracy = currentPlayer?.accuracy || 1;
      const playerReflex = currentPlayer?.reflex || 1;
      const playerCognition = currentPlayer?.cognition || 1;

      // Check if mission is completed
      const completion = completedMissions.find(c => c.missionId === mission._id);
      const isCompleted = !!completion;

      // Check if mission requirements are met
      let status: 'available' | 'locked' | 'completed' | 'in-progress' = 'available';
      
      if (isCompleted) {
        status = 'completed';
      } else if (
        playerLevel < mission.minimumLevel ||
        (mission.requiredAccuracy && playerAccuracy < mission.requiredAccuracy) ||
        (mission.requiredReflex && playerReflex < mission.requiredReflex) ||
        (mission.requiredCognition && playerCognition < mission.requiredCognition)
      ) {
        status = 'locked';
      }

      // Generate dynamic objectives based on mission type
      const generateObjectives = (type: string) => {
        const baseObjectives = ['Complete primary objectives', 'Extract within time limit'];
        
        switch (type) {
          case 'stealth':
            return [...baseObjectives, 'Maintain stealth rating above 80%', 'No alarms triggered'];
          case 'combat':
            return [...baseObjectives, 'Eliminate all hostiles', 'Maintain accuracy above 75%'];
          case 'hacking':
            return [...baseObjectives, 'Decrypt all data nodes', 'Remain undetected in cyberspace'];
          case 'rescue':
            return [...baseObjectives, 'Secure all civilians', 'No casualties'];
          default:
            return [...baseObjectives, 'Complete all secondary objectives'];
        }
      };

      return {
        id: mission._id,
        name: mission.title,
        codename: `Operation: ${mission.title}`,
        type: mission.missionType,
        difficulty: mission.difficulty === 'rookie' ? 2 : mission.difficulty === 'specialist' ? 4 : 6,
        duration: mission.difficulty === 'rookie' ? '30 minutes' : mission.difficulty === 'specialist' ? '45 minutes' : '60 minutes',
        clearanceLevel: mission.minimumLevel,
        description: mission.description,
        objectives: generateObjectives(mission.missionType),
        environment: `${mission.difficulty.toUpperCase()} Simulation Environment`,
        rewards: {
          credits: mission.baseCredits,
          xp: mission.baseExperience,
          nftChance: mission.difficulty === 'elite' ? '15%' : mission.difficulty === 'specialist' ? '8%' : '3%',
          specialReward: mission.firstClearReward || 'Advanced Equipment'
        },
        status,
        completionRate: completion?.efficiencyRating || 0,
        bestScore: completion ? Math.max(completion.completionTime || 0) : 0,
        firstClearBonus: !!mission.firstClearReward && !isCompleted,
        requirements: {
          level: mission.minimumLevel,
          accuracy: mission.requiredAccuracy,
          reflex: mission.requiredReflex,
          cognition: mission.requiredCognition,
        }
      };
    });
  },
});

export const startMission = mutation({
  args: {
    userWallet: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Get mission details
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }

    // Check requirements
    if (currentPlayer.level < mission.minimumLevel) {
      throw new Error(`Insufficient clearance level. Level ${mission.minimumLevel} required.`);
    }

    if (mission.requiredAccuracy && currentPlayer.accuracy < mission.requiredAccuracy) {
      throw new Error(`Insufficient accuracy. ${mission.requiredAccuracy} accuracy required.`);
    }

    if (mission.requiredReflex && currentPlayer.reflex < mission.requiredReflex) {
      throw new Error(`Insufficient reflex. ${mission.requiredReflex} reflex required.`);
    }

    if (mission.requiredCognition && currentPlayer.cognition < mission.requiredCognition) {
      throw new Error(`Insufficient cognition. ${mission.requiredCognition} cognition required.`);
    }

    // Log mission start (could be used for analytics or tracking)
    console.log(`Mission ${mission.title} started by player ${currentPlayer.displayName}`);

    return { 
      success: true, 
      message: `Mission "${mission.title}" initiated. Neural interface synchronized.`,
      estimatedDuration: mission.difficulty === 'rookie' ? 1800 : mission.difficulty === 'specialist' ? 2700 : 3600 // seconds
    };
  },
});

export const completeMission = mutation({
  args: {
    userWallet: v.string(),
    missionId: v.id("missions"),
    score: v.number(),
    creditsEarned: v.number(),
    xpEarned: v.number(),
    completionTime: v.optional(v.number()),
    efficiencyRating: v.optional(v.number()),
    stealthRating: v.optional(v.number()),
    combatRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Get mission details
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }

    // Check if this is first clear
    const existingCompletion = await ctx.db
      .query("missionCompletions")
      .withIndex("by_augmentee", (q) => q.eq("augmenteeId", currentPlayer._id))
      .filter((q) => q.eq(q.field("missionId"), args.missionId))
      .unique();

    const isFirstClear = !existingCompletion;
    
    // Calculate bonus rewards for performance
    let bonusCredits = 0;
    let bonusXP = 0;
    
    // Efficiency bonus
    const efficiency = args.efficiencyRating || 80;
    if (efficiency >= 95) {
      bonusCredits += Math.floor(args.creditsEarned * 0.3);
      bonusXP += Math.floor(args.xpEarned * 0.2);
    } else if (efficiency >= 90) {
      bonusCredits += Math.floor(args.creditsEarned * 0.15);
      bonusXP += Math.floor(args.xpEarned * 0.1);
    }

    // First clear bonus
    if (isFirstClear && mission.firstClearReward) {
      bonusCredits += Math.floor(args.creditsEarned * 0.5);
      bonusXP += Math.floor(args.xpEarned * 0.3);
    }

    const totalCredits = args.creditsEarned + bonusCredits;
    const totalXP = args.xpEarned + bonusXP;

    // Update player with mission rewards
    const newXP = currentPlayer.experiencePoints + totalXP;
    const newLevel = Math.floor(newXP / 100) + 1;
    
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits + totalCredits,
      experiencePoints: newXP,
      level: newLevel,
      totalMissionsCompleted: currentPlayer.totalMissionsCompleted + 1,
    });

    // Record mission completion
    await ctx.db.insert("missionCompletions", {
      missionId: args.missionId,
      augmenteeId: currentPlayer._id,
      completionTime: args.completionTime || 300, // Default 5 minutes if not provided
      efficiencyRating: efficiency,
      stealthRating: args.stealthRating,
      combatRating: args.combatRating,
      creditsEarned: totalCredits,
      experienceEarned: totalXP,
      lootGenerated: [], // Could be populated with random loot
      isFirstClear,
      completedAt: Date.now(),
    });

    return { 
      success: true, 
      message: `Mission "${mission.title}" completed successfully!`,
      rewards: {
        credits: totalCredits,
        xp: totalXP,
        bonusCredits,
        bonusXP,
        leveledUp: newLevel > currentPlayer.level,
        newLevel
      }
    };
  },
});

// ==================== AUGMENTEE FUNCTIONS ====================

export const getAugmenteeProfile = query({
  args: { 
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get augmentee by wallet address
    const existing = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();

    return existing;
  },
});

export const updateAugmenteeProfile = mutation({
  args: {
    playerId: v.id("augmentees"),
    updates: v.object({
      displayName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { playerId, updates } = args;
    await ctx.db.patch(playerId, updates);
    return { success: true };
  },
});

export const upgradeAugmentation = mutation({
  args: {
    userWallet: v.string(),
    augmentationType: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current player by wallet
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    if (currentPlayer.ascentCredits < args.cost) {
      throw new Error("Insufficient credits");
    }

    // Update augmentation level and deduct credits
    const updates: any = { ascentCredits: currentPlayer.ascentCredits - args.cost };
    
    switch (args.augmentationType) {
      case 'accuracy':
        updates.accuracy = Math.min((currentPlayer.accuracy || 1) + 1, 10);
        break;
      case 'reflex':
        updates.reflex = Math.min((currentPlayer.reflex || 1) + 1, 10);
        break;
      case 'cognition':
        updates.cognition = Math.min((currentPlayer.cognition || 1) + 1, 10);
        break;
    }

    await ctx.db.patch(currentPlayer._id, updates);
    return { success: true };
  },
});

// ==================== MARKETPLACE FUNCTIONS ====================

export const getMarketplaceItems = query({
  args: {},
  handler: async (ctx) => {
    // Get all active marketplace items from database
    const marketplaceItems = await ctx.db
      .query("marketplaceItems")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // If no items in database, return some default items
    if (marketplaceItems.length === 0) {
      return [
        {
          id: "neural-boost-1",
          name: "Neural Enhancement Booster",
          category: "enhancement",
          price: 250,
          rarity: "rare",
          description: "Temporarily increases cognitive performance by 15%",
          icon: "🧠",
          inStock: 5
        },
        {
          id: "precision-mod-1", 
          name: "Precision Targeting Module",
          category: "mod",
          price: 180,
          rarity: "common",
          description: "Improves accuracy in combat scenarios",
          icon: "🎯",
          inStock: 12
        },
        {
          id: "quantum-core-1",
          name: "Quantum Processing Core",
          category: "schematic",
          price: 500,
          rarity: "legendary",
          description: "Advanced neural processing enhancement",
          icon: "⚡",
          inStock: 2
        },
        {
          id: "reflex-enhancer-1",
          name: "Reflex Enhancement Chip",
          category: "mod",
          price: 300,
          rarity: "epic",
          description: "Increases neural response time by 25%",
          icon: "⚡",
          inStock: 3
        },
        {
          id: "memory-core-1",
          name: "Memory Core Upgrade",
          category: "enhancement",
          price: 400,
          rarity: "epic",
          description: "Expands neural storage capacity significantly",
          icon: "💾",
          inStock: 4
        },
        {
          id: "tactical-scanner-1",
          name: "Tactical Environment Scanner",
          category: "schematic",
          price: 350,
          rarity: "rare",
          description: "Advanced environmental analysis tool",
          icon: "📡",
          inStock: 8
        },
        {
          id: "energy-cell-1",
          name: "High-Energy Cell",
          category: "material",
          price: 75,
          rarity: "common",
          description: "Power source for neural augmentations",
          icon: "🔋",
          inStock: 25
        },
        {
          id: "nano-circuits-1",
          name: "Nano Circuit Array",
          category: "material",
          price: 120,
          rarity: "rare",
          description: "Microscopic processing components",
          icon: "🔌",
          inStock: 15
        },
        {
          id: "training-bundle-1",
          name: "Neural Training Bundle",
          category: "bundle",
          price: 800,
          rarity: "epic",
          description: "Complete training enhancement package",
          icon: "📦",
          inStock: 3
        },
        {
          id: "starter-pack-1",
          name: "Augmentee Starter Pack",
          category: "bundle",
          price: 150,
          rarity: "common",
          description: "Essential items for new academy members",
          icon: "🎁",
          inStock: 50
        }
      ];
    }

    // Transform database items to frontend format
    return marketplaceItems.map(item => ({
      id: item._id,
      name: item.name,
      category: item.category,
      price: item.price,
      rarity: item.rarity,
      description: item.description,
      icon: item.icon,
      inStock: item.inStock
    }));
  },
});

export const purchaseItem = mutation({
  args: {
    userWallet: v.string(),
    itemId: v.string(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current player by wallet
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    if (currentPlayer.ascentCredits < args.price) {
      throw new Error("Insufficient credits");
    }

    // Deduct credits
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits - args.price,
    });

    return { success: true, message: `Item ${args.itemId} purchased successfully` };
  },
});

// ==================== LEADERBOARDS FUNCTIONS ====================

export const getLeaderboards = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db.query("augmentees").collect();
    
    // Return complete player data for comprehensive leaderboards with calculated rank change
    return players.map(player => {
      // Calculate rank change based on recent activity (simplified)
      const recentActivity = (player.lastLoginTime || 0) > Date.now() - 24 * 60 * 60 * 1000; // Active in last 24h
      const performanceScore = (player.level || 1) + (player.totalMissionsCompleted || 0) + (player.experiencePoints || 0) / 1000;
      
      let rankChange = 0;
      if (recentActivity && performanceScore > 10) rankChange = 1; // Going up
      else if (!recentActivity && performanceScore < 5) rankChange = -1; // Going down
      
      return {
        _id: player._id,
        displayName: player.displayName,
        level: player.level || 1,
        ascentCredits: player.ascentCredits || 0,
        experiencePoints: player.experiencePoints || 0,
        totalMissionsCompleted: player.totalMissionsCompleted || 0,
        accuracy: player.accuracy || 1,
        reflex: player.reflex || 1,
        cognition: player.cognition || 1,
        reputationTechLab: player.reputationTechLab || 0,
        reputationSecurityWing: player.reputationSecurityWing || 0,
        reputationCommandCenter: player.reputationCommandCenter || 0,
        lastLoginTime: player.lastLoginTime || player._creationTime,
        _creationTime: player._creationTime,
        rankChange: rankChange,
      };
    });
  },
});

// ==================== TECHLAB FUNCTIONS ====================

export const getTechLabItems = query({
  args: {},
  handler: async (ctx) => {
    // Get research projects/tech lab activities
    const techLabActivities = await ctx.db
      .query("techLabActivities")
      .order("desc")
      .take(10);

    // Return recent tech lab research projects as items
    return techLabActivities.map(activity => ({
      id: activity._id,
      name: `${activity.activityType.replace('_', ' ').toUpperCase()} Project`,
      type: activity.activityType,
      cost: activity.creditsSpent,
      description: `Research project: ${activity.activityType}`,
      progress: activity.success ? 100 : Math.floor(Math.random() * 80) + 10, // Random progress for ongoing
      timeRemaining: activity.success ? 0 : Math.floor(Math.random() * 300) + 60, // Random time remaining
    }));
  },
});

export const startResearch = mutation({
  args: {
    userWallet: v.string(),
    projectId: v.string(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current player by wallet
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    if (currentPlayer.ascentCredits < args.cost) {
      throw new Error("Insufficient credits");
    }

    // Deduct credits
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits - args.cost,
    });

    // Log tech lab activity
    await ctx.db.insert("techLabActivities", {
      augmenteeId: currentPlayer._id,
      activityType: "craft_gadget", // Default activity type
      creditsSpent: args.cost,
      materialsUsed: [],
      success: true,
      completedAt: Date.now(),
    });

    return { success: true, message: `Research ${args.projectId} started successfully` };
  },
});

// ==================== CRAFTING FUNCTIONS ====================

export const craftItem = mutation({
  args: {
    userWallet: v.string(),
    schematicId: v.id("craftingSchematics"),
  },
  handler: async (ctx, args) => {
    // Get current player by wallet
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Get schematic details
    const schematic = await ctx.db.get(args.schematicId);
    if (!schematic) {
      throw new Error("Schematic not found");
    }

    // Check if player has enough credits
    if (currentPlayer.ascentCredits < schematic.craftingCost.credits) {
      throw new Error("Insufficient credits");
    }

    // Check if player has required materials
    const playerMaterials = await ctx.db
      .query("playerMaterials")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    for (const requiredMaterial of schematic.craftingCost.materials) {
      const playerMaterial = playerMaterials.find(m => 
        m.materialName.toLowerCase().includes(requiredMaterial.materialId.replace('-', ' ')) ||
        requiredMaterial.materialId.includes(m.materialName.toLowerCase().replace(' ', '-'))
      );
      
      if (!playerMaterial || playerMaterial.quantity < requiredMaterial.quantity) {
        throw new Error(`Insufficient materials: ${requiredMaterial.materialId}`);
      }
    }

    // Deduct credits
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits - schematic.craftingCost.credits,
    });

    // Deduct materials
    for (const requiredMaterial of schematic.craftingCost.materials) {
      const playerMaterial = playerMaterials.find(m => 
        m.materialName.toLowerCase().includes(requiredMaterial.materialId.replace('-', ' ')) ||
        requiredMaterial.materialId.includes(m.materialName.toLowerCase().replace(' ', '-'))
      );
      
      if (playerMaterial) {
        await ctx.db.patch(playerMaterial._id, {
          quantity: playerMaterial.quantity - requiredMaterial.quantity,
        });
      }
    }

    // Add crafted item to player's loadout
    await ctx.db.insert("loadoutItems", {
      playerWallet: args.userWallet,
      itemName: schematic.name,
      itemType: schematic.category === "weapon" ? "gadget" : "ability",
      equipped: false,
      rarity: schematic.rarity,
      description: schematic.description,
      properties: {},
      acquiredAt: Date.now(),
    });

    // Log crafting activity
    await ctx.db.insert("techLabActivities", {
      augmenteeId: currentPlayer._id,
      activityType: "craft_gadget",
      creditsSpent: schematic.craftingCost.credits,
      materialsUsed: schematic.craftingCost.materials.map((m: any) => ({
        materialType: m.materialId,
        quantity: m.quantity,
      })),
      success: true,
      completedAt: Date.now(),
    });

    return { success: true, message: `${schematic.name} crafted successfully!` };
  },
});

export const upgradeItem = mutation({
  args: {
    userWallet: v.string(),
    itemId: v.id("upgradeableItems"),
  },
  handler: async (ctx, args) => {
    // Get current player by wallet
    const currentPlayer = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.userWallet))
      .unique();
    
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Get upgradeable item details
    const upgradeableItem = await ctx.db.get(args.itemId);
    if (!upgradeableItem) {
      throw new Error("Upgradeable item not found");
    }

    // Get player's current upgrade progress
    const playerUpgrade = await ctx.db
      .query("playerUpgrades")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .filter((q) => q.eq(q.field("itemId"), args.itemId))
      .unique();

    const currentLevel = playerUpgrade?.currentLevel || 1;

    if (currentLevel >= upgradeableItem.maxLevel) {
      throw new Error("Item already at maximum level");
    }

    // Check if player has enough credits
    if (currentPlayer.ascentCredits < upgradeableItem.upgradeCost.credits) {
      throw new Error("Insufficient credits");
    }

    // Check materials (simplified check)
    const playerMaterials = await ctx.db
      .query("playerMaterials")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    for (const requiredMaterial of upgradeableItem.upgradeCost.materials) {
      const playerMaterial = playerMaterials.find(m => 
        m.materialName.toLowerCase().includes(requiredMaterial.materialId.replace('-', ' ')) ||
        requiredMaterial.materialId.includes(m.materialName.toLowerCase().replace(' ', '-'))
      );
      
      if (!playerMaterial || playerMaterial.quantity < requiredMaterial.quantity) {
        throw new Error(`Insufficient materials: ${requiredMaterial.materialId}`);
      }
    }

    // Deduct credits
    await ctx.db.patch(currentPlayer._id, {
      ascentCredits: currentPlayer.ascentCredits - upgradeableItem.upgradeCost.credits,
    });

    // Deduct materials
    for (const requiredMaterial of upgradeableItem.upgradeCost.materials) {
      const playerMaterial = playerMaterials.find(m => 
        m.materialName.toLowerCase().includes(requiredMaterial.materialId.replace('-', ' ')) ||
        requiredMaterial.materialId.includes(m.materialName.toLowerCase().replace(' ', '-'))
      );
      
      if (playerMaterial) {
        await ctx.db.patch(playerMaterial._id, {
          quantity: playerMaterial.quantity - requiredMaterial.quantity,
        });
      }
    }

    // Update or create player upgrade progress
    if (playerUpgrade) {
      await ctx.db.patch(playerUpgrade._id, {
        currentLevel: currentLevel + 1,
        lastUpgraded: Date.now(),
      });
    } else {
      await ctx.db.insert("playerUpgrades", {
        playerWallet: args.userWallet,
        itemId: args.itemId,
        currentLevel: 2,
        lastUpgraded: Date.now(),
      });
    }

    // Log upgrade activity
    await ctx.db.insert("techLabActivities", {
      augmenteeId: currentPlayer._id,
      activityType: "upgrade_module",
      creditsSpent: upgradeableItem.upgradeCost.credits,
      materialsUsed: upgradeableItem.upgradeCost.materials.map((m: any) => ({
        materialType: m.materialId,
        quantity: m.quantity,
      })),
      success: true,
      powerLevelGained: 0.1, // Small power increase
      completedAt: Date.now(),
    });

    return { 
      success: true, 
      message: `${upgradeableItem.name} upgraded to level ${currentLevel + 1}!`,
      newLevel: currentLevel + 1,
    };
  },
});

// ==================== LOADOUT FUNCTIONS (MISSING) ====================

export const getPlayerLoadout = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get player's loadout items from database
    const loadoutItems = await ctx.db
      .query("loadoutItems")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    // Transform database items to frontend format
    return loadoutItems.map(item => ({
      id: item._id,
      name: item.itemName,
      type: item.itemType,
      equipped: item.equipped,
      rarity: item.rarity,
      description: item.description,
      ...item.properties // Spread any additional properties like cooldown, energyCost, etc.
    }));
  },
});

export const updateLoadout = mutation({
  args: {
    userWallet: v.string(),
    itemId: v.string(),
    equipped: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Loadout update logic would go here
    return { success: true, message: `Loadout updated for item ${args.itemId}` };
  },
});

// ==================== MATERIALS AND CRAFTING FUNCTIONS ====================

export const getPlayerMaterials = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get player's materials from database
    const materials = await ctx.db
      .query("playerMaterials")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    // Transform database materials to frontend format
    return materials.map(material => ({
      id: material._id,
      name: material.materialName,
      quantity: material.quantity,
      rarity: material.rarity,
      description: material.description,
      category: material.category
    }));
  },
});

export const getCraftingSchematics = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx) => {
    // Get all active crafting schematics from database
    const schematics = await ctx.db
      .query("craftingSchematics")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Transform database schematics to frontend format
    return schematics.map(schematic => ({
      id: schematic._id,
      name: schematic.name,
      category: schematic.category,
      rarity: schematic.rarity,
      description: schematic.description,
      craftingCost: schematic.craftingCost
    }));
  },
});

export const getUpgradeableItems = query({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all active upgradeable items from database
    const upgradeableItems = await ctx.db
      .query("upgradeableItems")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get player's current upgrade progress for these items
    const playerUpgrades = await ctx.db
      .query("playerUpgrades")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    // Transform to frontend format with current levels
    return upgradeableItems.map(item => {
      const playerProgress = playerUpgrades.find(upgrade => upgrade.itemId === item._id);
      return {
        id: item._id,
        name: item.name,
        type: item.itemType,
        currentLevel: playerProgress?.currentLevel || 1,
        maxLevel: item.maxLevel,
        rarity: item.rarity,
        description: item.description,
        upgradeCost: item.upgradeCost
      };
    });
  },
});

// ==================== INITIALIZE UPGRADE ITEMS ====================

export const initializeUpgradeableItems = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if any items exist
    const existingItems = await ctx.db
      .query("upgradeableItems")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    if (existingItems.length === 0) {
      const sampleItems = [
        {
          name: "Neural Enhancement Protocol",
          itemType: "ability" as const,
          maxLevel: 5,
          rarity: "epic" as const,
          description: "Advanced neural augmentation system that enhances cognitive processing speed and memory retention.",
          upgradeCost: {
            credits: 250,
            materials: [
              { materialId: "quantum-circuits", quantity: 2 },
              { materialId: "neural-fibers", quantity: 1 }
            ]
          },
          isActive: true,
          _creationTime: Date.now(),
        },
        {
          name: "Reflex Amplification Matrix",
          itemType: "ability" as const,
          maxLevel: 4,
          rarity: "rare" as const,
          description: "Cybernetic enhancement that dramatically improves reaction times and muscle memory.",
          upgradeCost: {
            credits: 150,
            materials: [
              { materialId: "bio-conductors", quantity: 3 },
              { materialId: "memory-crystals", quantity: 1 }
            ]
          },
          isActive: true,
          _creationTime: Date.now(),
        },
        {
          name: "Precision Targeting System",
          itemType: "gadget" as const,
          maxLevel: 6,
          rarity: "legendary" as const,
          description: "Military-grade targeting assistance with predictive algorithms and wind compensation.",
          upgradeCost: {
            credits: 500,
            materials: [
              { materialId: "targeting-chips", quantity: 1 },
              { materialId: "quantum-circuits", quantity: 3 }
            ]
          },
          isActive: true,
          _creationTime: Date.now(),
        },
        {
          name: "Stealth Field Generator",
          itemType: "gadget" as const,
          maxLevel: 3,
          rarity: "epic" as const,
          description: "Portable cloaking device that bends light around the user for temporary invisibility.",
          upgradeCost: {
            credits: 300,
            materials: [
              { materialId: "photon-emitters", quantity: 2 },
              { materialId: "power-cells", quantity: 2 }
            ]
          },
          isActive: true,
          _creationTime: Date.now(),
        },
        {
          name: "Combat Simulation Engine",
          itemType: "ability" as const,
          maxLevel: 5,
          rarity: "rare" as const,
          description: "Real-time combat prediction system that analyzes enemy patterns and suggests optimal responses.",
          upgradeCost: {
            credits: 200,
            materials: [
              { materialId: "data-cores", quantity: 2 },
              { materialId: "bio-conductors", quantity: 1 }
            ]
          },
          isActive: true,
          _creationTime: Date.now(),
        }
      ];

      for (const item of sampleItems) {
        await ctx.db.insert("upgradeableItems", item);
      }

      return { success: true, message: "Upgradeable items initialized!" };
    }

    return { success: true, message: "Upgradeable items already exist" };
  },
});

// ==================== INITIALIZE SAMPLE DATA ====================

export const initializeTechLabData = mutation({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if player has materials, if not create some
    const existingMaterials = await ctx.db
      .query("playerMaterials")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    if (existingMaterials.length === 0) {
      const sampleMaterials = [
        {
          playerWallet: args.userWallet,
          materialName: "Quantum Circuits",
          quantity: 5,
          rarity: "epic" as const,
          description: "Advanced quantum processing units used in high-end augmentations.",
          category: "Electronics"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Neural Fibers",
          quantity: 3,
          rarity: "rare" as const,
          description: "Bio-compatible neural interface components.",
          category: "Bio-tech"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Bio Conductors",
          quantity: 8,
          rarity: "common" as const,
          description: "Standard bio-electrical conductors for basic augmentations.",
          category: "Bio-tech"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Memory Crystals",
          quantity: 4,
          rarity: "rare" as const,
          description: "Crystalline data storage units for neural memory enhancement.",
          category: "Data Storage"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Targeting Chips",
          quantity: 2,
          rarity: "legendary" as const,
          description: "Military-grade targeting processors with AI assistance.",
          category: "Combat Tech"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Photon Emitters",
          quantity: 6,
          rarity: "epic" as const,
          description: "Light-bending components for stealth applications.",
          category: "Optics"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Power Cells",
          quantity: 10,
          rarity: "common" as const,
          description: "High-capacity energy storage for gadgets and implants.",
          category: "Power"
        },
        {
          playerWallet: args.userWallet,
          materialName: "Data Cores",
          quantity: 3,
          rarity: "rare" as const,
          description: "Advanced processing cores for complex AI operations.",
          category: "Computing"
        }
      ];

      for (const material of sampleMaterials) {
        await ctx.db.insert("playerMaterials", material);
      }

      return { success: true, message: "TechLab materials initialized!" };
    }

    return { success: true, message: "TechLab data already exists" };
  },
});

// ==================== ENSURE MATERIALS FOR EXISTING ITEMS ====================

export const ensureMaterialsForUpgrades = mutation({
  args: {
    userWallet: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all existing upgradeable items
    const upgradeableItems = await ctx.db
      .query("upgradeableItems")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get player's existing materials
    const existingMaterials = await ctx.db
      .query("playerMaterials")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.userWallet))
      .collect();

    // Collect all required material IDs from upgradeable items
    const requiredMaterials = new Set<string>();
    upgradeableItems.forEach(item => {
      item.upgradeCost.materials.forEach(mat => {
        requiredMaterials.add(mat.materialId);
      });
    });

    // Create missing materials
    for (const materialId of requiredMaterials) {
      const materialExists = existingMaterials.find(m => 
        m.materialName.toLowerCase().includes(materialId.replace('-', ' ').toLowerCase()) ||
        m.materialName.toLowerCase().includes(materialId.replace('_', ' ').toLowerCase()) ||
        materialId.toLowerCase().includes(m.materialName.toLowerCase().replace(' ', '-')) ||
        materialId.toLowerCase().includes(m.materialName.toLowerCase().replace(' ', '_'))
      );

      if (!materialExists) {
        // Create the missing material with a sensible name and quantity
        const materialName = materialId
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        await ctx.db.insert("playerMaterials", {
          playerWallet: args.userWallet,
          materialName: materialName,
          quantity: 10, // Give plenty for testing
          rarity: "common" as const,
          description: `Material for upgrades: ${materialName}`,
          category: "General"
        });
      }
    }

    return { success: true, message: "Materials ensured for all upgradeable items" };
  },
});
