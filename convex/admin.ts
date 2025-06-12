import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Define allowed admin emails (in production, store this in environment variables)
const ALLOWED_ADMIN_EMAILS = [
  "admin@echelon-ascent.com",
  "gamemaster@echelon-ascent.com",
  // Add your email here for development
  "your-email@example.com"
];

// ========================================
// ADMIN AUTHENTICATION & MANAGEMENT
// ========================================

/**
 * Create or get admin user (with email validation)
 */
export const createOrGetAdmin = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("game_master"), v.literal("content_manager")),
  },
  returns: v.object({
    adminId: v.id("admins"),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate email is in allowed list
    if (!ALLOWED_ADMIN_EMAILS.includes(args.email.toLowerCase())) {
      throw new Error("Unauthorized: Email not in admin allowlist");
    }

    // Check if admin already exists
    const existing = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      // Verify password
      if (existing.password !== args.password) {
        throw new Error("Invalid password");
      }

      // Update login time
      await ctx.db.patch(existing._id, {
        lastLoginTime: Date.now(),
      });

      // Create new session
      const sessionToken = crypto.randomUUID();
      await ctx.db.insert("adminSessions", {
        adminId: existing._id,
        token: sessionToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return {
        adminId: existing._id,
        sessionToken,
      };
    }

    // Define permissions based on role
    let permissions: string[] = [];
    switch (args.role) {
      case "super_admin":
        permissions = ["manage_missions", "manage_players", "manage_economy", "manage_events", "manage_admins", "view_analytics"];
        break;
      case "game_master":
        permissions = ["manage_missions", "manage_players", "manage_events", "view_analytics"];
        break;
      case "content_manager":
        permissions = ["manage_missions", "manage_events"];
        break;
    }

    // Create new admin
    const adminId = await ctx.db.insert("admins", {
      email: args.email.toLowerCase(),
      name: args.name,
      password: args.password,
      role: args.role,
      permissions,
      isActive: true,
      lastLoginTime: Date.now(),
    });

    // Create session
    const sessionToken = crypto.randomUUID();
    await ctx.db.insert("adminSessions", {
      adminId,
      token: sessionToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    // Log the admin creation
    await ctx.db.insert("adminActions", {
      adminId,
      actionType: "admin_created",
      description: `New admin account created: ${args.name} (${args.email})`,
      timestamp: Date.now(),
    });

    return {
      adminId,
      sessionToken,
    };
  },
});

/**
 * Validate admin session
 */
export const validateSession = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.object({
    isValid: v.boolean(),
    admin: v.optional(v.object({
      _id: v.id("admins"),
      email: v.string(),
      name: v.string(),
      role: v.union(v.literal("super_admin"), v.literal("game_master"), v.literal("content_manager")),
      permissions: v.array(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { isValid: false };
    }

    const admin = await ctx.db.get(session.adminId);
    if (!admin || !admin.isActive) {
      return { isValid: false };
    }

    return {
      isValid: true,
      admin: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    };
  },
});

/**
 * Logout admin
 */
export const logoutAdmin = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return null;
  },
});

/**
 * Get admin by email
 */
export const getAdminByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("admins"),
      email: v.string(),
      name: v.string(),
      role: v.union(v.literal("super_admin"), v.literal("game_master"), v.literal("content_manager")),
      permissions: v.array(v.string()),
      isActive: v.boolean(),
      lastLoginTime: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
  },
});

/**
 * Validate admin access (security check)
 */
export const validateAdminAccess = query({
  args: {
    email: v.string(),
  },
  returns: v.object({
    isValidAdmin: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if email is in allowlist
    if (!ALLOWED_ADMIN_EMAILS.includes(args.email.toLowerCase())) {
      return {
        isValidAdmin: false,
        message: "Email not authorized for admin access",
      };
    }

    // Check if admin exists and is active
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!admin) {
      return {
        isValidAdmin: false,
        message: "Admin account not found. Contact system administrator.",
      };
    }

    if (!admin.isActive) {
      return {
        isValidAdmin: false,
        message: "Admin account is deactivated.",
      };
    }

    return {
      isValidAdmin: true,
      message: "Access granted",
    };
  },
});

// ========================================
// MISSION MANAGEMENT
// ========================================

/**
 * Create a new mission
 */
export const createMission = mutation({
  args: {
    adminId: v.id("admins"),
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
    techLabReputation: v.number(),
    securityWingReputation: v.number(),
    commandCenterReputation: v.number(),
    isStoryMission: v.boolean(),
  },
  returns: v.id("missions"),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_missions")) {
      throw new Error("Insufficient permissions");
    }

    const missionId = await ctx.db.insert("missions", {
      title: args.title,
      description: args.description,
      difficulty: args.difficulty,
      missionType: args.missionType,
      minimumLevel: args.minimumLevel,
      requiredAccuracy: args.requiredAccuracy,
      requiredReflex: args.requiredReflex,
      requiredCognition: args.requiredCognition,
      baseCredits: args.baseCredits,
      baseExperience: args.baseExperience,
      techLabReputation: args.techLabReputation,
      securityWingReputation: args.securityWingReputation,
      commandCenterReputation: args.commandCenterReputation,
      lootTable: [], // Empty loot table for now
      isActive: true,
      isStoryMission: args.isStoryMission,
      isGuildMission: false, // Default to false
      createdBy: args.adminId,
      lastModifiedBy: args.adminId,
    });

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: "create_mission",
      targetType: "mission",
      targetId: missionId,
      description: `Created mission: ${args.title}`,
      timestamp: Date.now(),
    });

    return missionId;
  },
});

/**
 * Update a mission
 */
export const updateMission = mutation({
  args: {
    adminId: v.id("admins"),
    missionId: v.id("missions"),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      difficulty: v.optional(v.union(v.literal("rookie"), v.literal("specialist"), v.literal("elite"))),
      missionType: v.optional(v.union(v.literal("stealth"), v.literal("combat"), v.literal("hacking"), v.literal("rescue"))),
      minimumLevel: v.optional(v.number()),
      requiredAccuracy: v.optional(v.number()),
      requiredReflex: v.optional(v.number()),
      requiredCognition: v.optional(v.number()),
      baseCredits: v.optional(v.number()),
      baseExperience: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_missions")) {
      throw new Error("Insufficient permissions");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }

    await ctx.db.patch(args.missionId, {
      ...args.updates,
      lastModifiedBy: args.adminId,
    });

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: "update_mission",
      targetType: "mission",
      targetId: args.missionId,
      description: `Updated mission: ${mission.title}`,
      timestamp: Date.now(),
    });

    return null;
  },
});

/**
 * Get all missions for admin management
 */
export const getAllMissions = query({
  args: {
    adminId: v.id("admins"),
  },
  returns: v.array(v.object({
    _id: v.id("missions"),
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
    firstClearReward: v.optional(v.string()),
    
    // Admin tracking
    createdBy: v.optional(v.id("admins")),
    lastModifiedBy: v.optional(v.id("admins")),
    
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_missions")) {
      throw new Error("Insufficient permissions");
    }

    return await ctx.db.query("missions").collect();
  },
});

/**
 * Toggle mission active status
 */
export const toggleMissionStatus = mutation({
  args: {
    adminId: v.id("admins"),
    missionId: v.id("missions"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_missions")) {
      throw new Error("Insufficient permissions");
    }

    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      throw new Error("Mission not found");
    }

    const newStatus = !mission.isActive;
    await ctx.db.patch(args.missionId, {
      isActive: newStatus,
      lastModifiedBy: args.adminId,
    });

    // Log action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: newStatus ? "activate_mission" : "deactivate_mission",
      targetType: "mission",
      targetId: args.missionId,
      description: `${newStatus ? "Activated" : "Deactivated"} mission: ${mission.title}`,
      timestamp: Date.now(),
    });

    return newStatus;
  },
});

// ========================================
// PLAYER MANAGEMENT
// ========================================

/**
 * Get all players with admin controls
 */
export const getAllPlayers = query({
  args: {
    adminId: v.id("admins"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("augmentees"),
    walletAddress: v.string(),
    displayName: v.string(),
    level: v.number(),
    experiencePoints: v.number(),
    ascentCredits: v.number(),
    
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
    banReason: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    
    _creationTime: v.number(),
  })),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_players")) {
      throw new Error("Insufficient permissions");
    }

    return await ctx.db
      .query("augmentees")
      .order("desc")
      .take(args.limit || 100);
  },
});

/**
 * Ban/unban a player
 */
export const moderatePlayer = mutation({
  args: {
    adminId: v.id("admins"),
    playerId: v.id("augmentees"),
    action: v.union(v.literal("ban"), v.literal("unban")),
    reason: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_players")) {
      throw new Error("Insufficient permissions");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const updates: any = {
      adminNotes: args.adminNotes,
    };

    if (args.action === "ban") {
      updates.isBanned = true;
      updates.banReason = args.reason;
    } else {
      updates.isBanned = false;
      updates.banReason = undefined;
    }

    await ctx.db.patch(args.playerId, updates);

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: `${args.action}_player`,
      targetType: "player",
      targetId: args.playerId,
      description: `${args.action === "ban" ? "Banned" : "Unbanned"} player: ${player.displayName}`,
      timestamp: Date.now(),
    });

    return null;
  },
});

/**
 * Adjust player credits (for customer support, events, etc.)
 */
export const adjustPlayerCredits = mutation({
  args: {
    adminId: v.id("admins"),
    playerId: v.id("augmentees"),
    creditAdjustment: v.number(), // Can be positive or negative
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("manage_economy")) {
      throw new Error("Insufficient permissions");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const newCredits = Math.max(0, player.ascentCredits + args.creditAdjustment);
    await ctx.db.patch(args.playerId, {
      ascentCredits: newCredits,
    });

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: "adjust_credits",
      targetType: "player",
      targetId: args.playerId,
      description: `Adjusted credits for ${player.displayName}: ${args.creditAdjustment > 0 ? "+" : ""}${args.creditAdjustment}`,
      timestamp: Date.now(),
    });

    return null;
  },
});

// ========================================
// GAME CONFIGURATION
// ========================================

/**
 * Update game configuration
 */
export const updateGameConfig = mutation({
  args: {
    adminId: v.id("admins"),
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.string(),
    category: v.union(v.literal("economy"), v.literal("gameplay"), v.literal("events"), v.literal("system")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify admin permissions (super_admin only for system configs)
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      throw new Error("Admin not found");
    }

    if (args.category === "system" && admin.role !== "super_admin") {
      throw new Error("Super admin required for system configuration");
    }

    // Check if config exists
    const existing = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        description: args.description,
        lastUpdatedBy: args.adminId,
        lastUpdatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameConfig", {
        key: args.key,
        value: args.value,
        description: args.description,
        category: args.category,
        lastUpdatedBy: args.adminId,
        lastUpdatedAt: Date.now(),
      });
    }

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: args.adminId,
      actionType: "update_config",
      targetType: "config",
      targetId: args.key,
      description: `Updated config: ${args.key} = ${args.value}`,
      timestamp: Date.now(),
    });

    return null;
  },
});

/**
 * Get game configuration
 */
export const getGameConfig = query({
  args: {
    adminId: v.id("admins"),
    category: v.optional(v.union(v.literal("economy"), v.literal("gameplay"), v.literal("events"), v.literal("system"))),
  },
  returns: v.array(v.object({
    _id: v.id("gameConfig"),
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.string(),
    category: v.union(v.literal("economy"), v.literal("gameplay"), v.literal("events"), v.literal("system")),
    lastUpdatedBy: v.optional(v.id("admins")),
    lastUpdatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      throw new Error("Admin not found");
    }

    if (args.category) {
      return await ctx.db
        .query("gameConfig")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      return await ctx.db.query("gameConfig").collect();
    }
  },
});

// ========================================
// ANALYTICS & REPORTING
// ========================================

/**
 * Get player analytics
 */
export const getPlayerAnalytics = query({
  args: {
    adminId: v.id("admins"),
  },
  returns: v.object({
    totalPlayers: v.number(),
    activePlayersToday: v.number(),
    activePlayersWeek: v.number(),
    newPlayersToday: v.number(),
    totalCreditsInCirculation: v.number(),
    averageLevel: v.number(),
    bannedPlayers: v.number(),
  }),
  handler: async (ctx, args) => {
    // Verify admin permissions
    const admin = await ctx.db.get(args.adminId);
    if (!admin || !admin.permissions.includes("view_analytics")) {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const allPlayers = await ctx.db.query("augmentees").collect();

    const totalPlayers = allPlayers.length;
    const activePlayersToday = allPlayers.filter(p => p.lastLoginTime > oneDayAgo).length;
    const activePlayersWeek = allPlayers.filter(p => p.lastLoginTime > oneWeekAgo).length;
    const newPlayersToday = allPlayers.filter(p => p._creationTime > oneDayAgo).length;
    const totalCreditsInCirculation = allPlayers.reduce((sum, p) => sum + p.ascentCredits, 0);
    const averageLevel = totalPlayers > 0 ? allPlayers.reduce((sum, p) => sum + p.level, 0) / totalPlayers : 0;
    const bannedPlayers = allPlayers.filter(p => p.isBanned).length;

    return {
      totalPlayers,
      activePlayersToday,
      activePlayersWeek,
      newPlayersToday,
      totalCreditsInCirculation,
      averageLevel: Math.round(averageLevel * 100) / 100,
      bannedPlayers,
    };
  },
});

/**
 * Get admin activity log
 */
export const getAdminActivityLog = query({
  args: {
    adminId: v.id("admins"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { adminId, limit = 50 }) => {
    // Validate admin access
    const admin = await ctx.db.get(adminId);
    if (!admin || !admin.isActive) {
      throw new Error("Admin not found or inactive");
    }

          return await ctx.db
        .query("adminActions")
        .withIndex("by_admin", (q) => q.eq("adminId", adminId))
        .order("desc")
        .take(limit);
    },
  });

// System Monitoring Functions
export const getSystemStats = query({
  args: {
    adminId: v.id("admins"),
  },
  handler: async (ctx, { adminId }) => {
    // Validate admin access
    const admin = await ctx.db.get(adminId);
    if (!admin || !admin.isActive) {
      throw new Error("Admin not found or inactive");
    }

    // Get all players
    const allPlayers = await ctx.db.query("augmentees").collect();
    
    // Get active players (logged in within last 24 hours)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    const activePlayers = allPlayers.filter(player => 
      player.lastLoginTime && player.lastLoginTime > twentyFourHoursAgo
    );

    // Get all missions
    const allMissions = await ctx.db.query("missions").collect();
    
    // Calculate total credits in circulation
    const totalCredits = allPlayers.reduce((sum, player) => sum + (player.ascentCredits || 0), 0);
    
    // Calculate average player level
    const averageLevel = allPlayers.length > 0 
      ? allPlayers.reduce((sum, player) => sum + (player.level || 1), 0) / allPlayers.length 
      : 0;

    // Get mission completions from last 24 hours
    const recentMissionCompletions = await ctx.db
      .query("missionCompletions")
      .filter((q) => q.gt(q.field("completedAt"), twentyFourHoursAgo))
      .collect();

    return {
      totalPlayers: allPlayers.length,
      activeToday: activePlayers.length,
      totalMissions: allMissions.length,
      totalCreditsInCirculation: totalCredits,
      averagePlayerLevel: Math.round(averageLevel * 10) / 10,
      recentMissionCompletions: recentMissionCompletions.length,
      serverUptime: "72h 35m", // This would come from actual server metrics
    };
  },
});

export const getContentStats = query({
  args: {
    adminId: v.id("admins"),
  },
  handler: async (ctx, { adminId }) => {
    // Validate admin access
    const admin = await ctx.db.get(adminId);
    if (!admin || !admin.isActive) {
      throw new Error("Admin not found or inactive");
    }

    // Get content statistics
    const trainingDrills = await ctx.db.query("trainingDrills").collect();
    const marketplaceItems = await ctx.db.query("marketplaceItems").collect();
    const upgradeItems = await ctx.db.query("upgradeableItems").collect();
    const missions = await ctx.db.query("missions").collect();

    return {
      trainingDrills: {
        total: trainingDrills.length,
        byCategory: {
          cognition: trainingDrills.filter(d => d.category === "cognition").length,
          reflex: trainingDrills.filter(d => d.category === "reflex").length,
          accuracy: trainingDrills.filter(d => d.category === "accuracy").length,
          endurance: trainingDrills.filter(d => d.category === "endurance").length,
        }
      },
      marketplaceItems: {
        total: marketplaceItems.length,
        byRarity: {
          common: marketplaceItems.filter(i => i.rarity === "common").length,
          rare: marketplaceItems.filter(i => i.rarity === "rare").length,
          epic: marketplaceItems.filter(i => i.rarity === "epic").length,
          legendary: marketplaceItems.filter(i => i.rarity === "legendary").length,
        }
      },
      upgradeItems: {
        total: upgradeItems.length,
      },
      missions: {
        total: missions.length,
        active: missions.filter(m => m.isActive).length,
        byDifficulty: {
          rookie: missions.filter(m => m.difficulty === "rookie").length,
          specialist: missions.filter(m => m.difficulty === "specialist").length,
          elite: missions.filter(m => m.difficulty === "elite").length,
        }
      }
    };
  },
});
