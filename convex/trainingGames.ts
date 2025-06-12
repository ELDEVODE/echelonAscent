import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Start a new training game session
export const startGameSession = mutation({
  args: {
    playerWallet: v.string(),
    drillId: v.id("trainingDrills"),
    gameType: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("trainingGameSessions", {
      playerWallet: args.playerWallet,
      drillId: args.drillId,
      gameType: args.gameType,
      startTime: Date.now(),
      isCompleted: false,
    });
    
    return sessionId;
  },
});

// Complete a training game session
export const completeGameSession = mutation({
  args: {
    sessionId: v.id("trainingGameSessions"),
    finalScore: v.number(),
    performance: v.object({
      accuracy: v.number(),
      reactionTime: v.number(),
      level: v.number(),
      perfectRounds: v.number(),
      totalRounds: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Get the drill to determine rewards
    const drill = await ctx.db.get(session.drillId);
    if (!drill) {
      throw new Error("Training drill not found");
    }

    // Calculate rewards based on performance
    const baseCredits = drill.rewards.credits;
    const baseXp = drill.rewards.xp;
    
    // Performance multipliers
    const accuracyMultiplier = 1 + (args.performance.accuracy / 100);
    const levelMultiplier = 1 + (args.performance.level * 0.1);
    
    const creditsEarned = Math.round(baseCredits * accuracyMultiplier * levelMultiplier);
    const xpEarned = Math.round(baseXp * accuracyMultiplier * levelMultiplier);

    // Update the session
    await ctx.db.patch(args.sessionId, {
      endTime: Date.now(),
      finalScore: args.finalScore,
      performance: args.performance,
      isCompleted: true,
      creditsEarned,
      xpEarned,
    });

    // Update player credits and XP
    const player = await ctx.db
      .query("augmentees")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", session.playerWallet))
      .first();

    if (player) {
      await ctx.db.patch(player._id, {
        ascentCredits: player.ascentCredits + creditsEarned,
        experiencePoints: player.experiencePoints + xpEarned,
      });
    }

    // Update leaderboard if this is a new high score
    await updateLeaderboard(ctx, {
      drillId: session.drillId,
      gameType: session.gameType,
      playerWallet: session.playerWallet,
      playerName: player?.displayName || "Anonymous",
      score: args.finalScore,
      performance: args.performance,
    });

    return {
      creditsEarned,
      xpEarned,
      sessionCompleted: true,
    };
  },
});

// Helper function to update leaderboard
const updateLeaderboard = async (
  ctx: any,
  data: {
    drillId: string;
    gameType: string;
    playerWallet: string;
    playerName: string;
    score: number;
    performance: {
      accuracy: number;
      reactionTime: number;
      level: number;
    };
  }
) => {
  // Check if player already has a leaderboard entry for this drill/game
  const existingEntry = await ctx.db
    .query("trainingLeaderboards")
    .withIndex("by_drill", (q: any) => q.eq("drillId", data.drillId))
    .filter((q: any) => 
      q.and(
        q.eq(q.field("gameType"), data.gameType),
        q.eq(q.field("playerWallet"), data.playerWallet)
      )
    )
    .first();

  if (existingEntry) {
    // Update if this is a new high score
    if (data.score > existingEntry.highScore) {
      await ctx.db.patch(existingEntry._id, {
        highScore: data.score,
        bestPerformance: {
          accuracy: data.performance.accuracy,
          reactionTime: data.performance.reactionTime,
          level: data.performance.level,
        },
        achievedAt: Date.now(),
      });
    }
  } else {
    // Create new leaderboard entry
    await ctx.db.insert("trainingLeaderboards", {
      drillId: data.drillId,
      gameType: data.gameType,
      playerWallet: data.playerWallet,
      playerName: data.playerName,
      highScore: data.score,
      bestPerformance: {
        accuracy: data.performance.accuracy,
        reactionTime: data.performance.reactionTime,
        level: data.performance.level,
      },
      achievedAt: Date.now(),
    });
  }
};

// Get game configuration for a specific drill
export const getGameConfig = query({
  args: {
    drillId: v.id("trainingDrills"),
  },
  handler: async (ctx, args) => {
    // Get the drill to determine its category
    const drill = await ctx.db.get(args.drillId);
    if (!drill) return null;

    // Determine game type based on drill category
    let gameType: string;
    switch (drill.category) {
      case "cognition":
        gameType = "pattern_matrix";
        break;
      case "reflex":
        gameType = "reaction_grid";
        break;
      case "accuracy":
        gameType = "precision_target";
        break;
      case "endurance":
        gameType = "stamina_rush";
        break;
      default:
        gameType = "pattern_matrix"; // fallback
    }

    const config = await ctx.db
      .query("trainingGameConfigs")
      .withIndex("by_drill", (q) => q.eq("drillId", args.drillId))
      .filter((q) => q.eq(q.field("gameType"), gameType))
      .first();

    if (config) {
      return {
        ...config.config,
        gameType: config.gameType,
        baseDifficulty: config.config.difficulty,
      };
    }

    // Default fallback config
    let defaultGridSize = 4;
    let defaultTimeLimit = 30;
    
    if (drill.category === "reflex") {
      defaultGridSize = 5;
      defaultTimeLimit = 30;
    } else if (drill.category === "accuracy") {
      defaultGridSize = 6;
      defaultTimeLimit = 45;
    } else if (drill.category === "endurance") {
      defaultGridSize = 6;
      defaultTimeLimit = 120; // 2 minutes for endurance
    }
    
    return {
      gridSize: defaultGridSize,
      timeLimit: defaultTimeLimit,
      baseDifficulty: drill.difficulty,
      lives: 3,
      gameType,
    };
  },
});

// Get leaderboard for a specific game
export const getLeaderboard = query({
  args: {
    drillId: v.id("trainingDrills"),
    gameType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const leaderboard = await ctx.db
      .query("trainingLeaderboards")
      .withIndex("by_drill", (q) => q.eq("drillId", args.drillId))
      .filter((q) => q.eq(q.field("gameType"), args.gameType))
      .order("desc")
      .take(limit);

    // Assign ranks
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});

// Get player's game history
export const getPlayerGameHistory = query({
  args: {
    playerWallet: v.string(),
    drillId: v.optional(v.id("trainingDrills")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    let query = ctx.db
      .query("trainingGameSessions")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.playerWallet));

    if (args.drillId) {
      query = query.filter((q) => q.eq(q.field("drillId"), args.drillId));
    }

    const sessions = await query
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .order("desc")
      .take(limit);

    return sessions;
  },
});

// Get player stats for a specific game type
export const getPlayerGameStats = query({
  args: {
    playerWallet: v.string(),
    gameType: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("trainingGameSessions")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.playerWallet))
      .filter((q) => 
        q.and(
          q.eq(q.field("gameType"), args.gameType),
          q.eq(q.field("isCompleted"), true)
        )
      )
      .collect();

    if (sessions.length === 0) {
      return {
        gamesPlayed: 0,
        averageScore: 0,
        bestScore: 0,
        averageAccuracy: 0,
        totalCreditsEarned: 0,
        totalXpEarned: 0,
      };
    }

    const totalScore = sessions.reduce((sum, session) => sum + (session.finalScore || 0), 0);
    const totalAccuracy = sessions.reduce((sum, session) => 
      sum + (session.performance?.accuracy || 0), 0);
    const bestScore = Math.max(...sessions.map(session => session.finalScore || 0));
    const totalCreditsEarned = sessions.reduce((sum, session) => sum + (session.creditsEarned || 0), 0);
    const totalXpEarned = sessions.reduce((sum, session) => sum + (session.xpEarned || 0), 0);

    return {
      gamesPlayed: sessions.length,
      averageScore: Math.round(totalScore / sessions.length),
      bestScore,
      averageAccuracy: Math.round(totalAccuracy / sessions.length),
      totalCreditsEarned,
      totalXpEarned,
    };
  },
}); 