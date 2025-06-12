import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Seed the database with initial missions (run once)
 */
export const seedMissions = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if missions already exist
    const existingMissions = await ctx.db.query("missions").take(1);
    if (existingMissions.length > 0) {
      return null; // Already seeded
    }

    // Create initial missions
    await ctx.db.insert("missions", {
      title: "System Breach",
      description: "Infiltrate the corporate network and extract valuable data.",
      difficulty: "rookie",
      missionType: "hacking",
      minimumLevel: 1,
      requiredCognition: 5,
      baseCredits: 100,
      baseExperience: 50,
      techLabReputation: 10,
      securityWingReputation: 0,
      commandCenterReputation: 0,
      lootTable: [
        { itemType: "data_chip", rarity: "common", dropChance: 0.8 },
        { itemType: "neural_interface", rarity: "rare", dropChance: 0.2 },
      ],
      isActive: true,
      isStoryMission: true,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "Silent Infiltration",
      description: "Sneak into the secure facility undetected.",
      difficulty: "rookie",
      missionType: "stealth",
      minimumLevel: 1,
      requiredReflex: 5,
      baseCredits: 100,
      baseExperience: 50,
      techLabReputation: 0,
      securityWingReputation: 10,
      commandCenterReputation: 0,
      lootTable: [
        { itemType: "cloaking_device", rarity: "common", dropChance: 0.7 },
        { itemType: "silent_boots", rarity: "rare", dropChance: 0.3 },
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    // Rookie missions
    await ctx.db.insert("missions", {
      title: "Data Recovery Protocol",
      description: "Infiltrate a simulated corporate server and retrieve classified neural enhancement data. Perfect for testing your hacking abilities.",
      difficulty: "rookie",
      missionType: "hacking",
      minimumLevel: 1,
      requiredCognition: 1.0,
      baseCredits: 200,
      baseExperience: 150,
      techLabReputation: 10,
      securityWingReputation: 0,
      commandCenterReputation: 5,
      lootTable: [
        { itemType: "data_fragment", rarity: "common", dropChance: 0.8 },
        { itemType: "neural_chip", rarity: "rare", dropChance: 0.2 }
      ],
      isActive: true,
      isStoryMission: true,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "Stealth Infiltration Training",
      description: "Navigate through a heavily monitored facility without triggering alarms. Your reflex training will be crucial.",
      difficulty: "rookie",
      missionType: "stealth",
      minimumLevel: 1,
      requiredReflex: 1.0,
      baseCredits: 180,
      baseExperience: 140,
      techLabReputation: 0,
      securityWingReputation: 15,
      commandCenterReputation: 5,
      lootTable: [
        { itemType: "stealth_kit", rarity: "common", dropChance: 0.7 },
        { itemType: "optical_camo", rarity: "rare", dropChance: 0.2 }
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "Combat Simulation Alpha",
      description: "Face off against automated training drones. Test your accuracy and reflexes in combat scenarios.",
      difficulty: "rookie",
      missionType: "combat",
      minimumLevel: 2,
      requiredAccuracy: 1.2,
      baseCredits: 220,
      baseExperience: 160,
      techLabReputation: 5,
      securityWingReputation: 10,
      commandCenterReputation: 10,
      lootTable: [
        { itemType: "targeting_system", rarity: "common", dropChance: 0.6 },
        { itemType: "combat_stims", rarity: "rare", dropChance: 0.3 }
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    // Specialist missions
    await ctx.db.insert("missions", {
      title: "Neural Sync Disruption",
      description: "Disable enemy augmentation systems while maintaining your own neural integrity. Requires precise accuracy and advanced cognition.",
      difficulty: "specialist",
      missionType: "hacking",
      minimumLevel: 5,
      requiredAccuracy: 1.5,
      requiredCognition: 1.5,
      baseCredits: 500,
      baseExperience: 400,
      techLabReputation: 25,
      securityWingReputation: 10,
      commandCenterReputation: 15,
      lootTable: [
        { itemType: "neural_scrambler", rarity: "rare", dropChance: 0.4 },
        { itemType: "sync_disruptor", rarity: "epic", dropChance: 0.1 }
      ],
      isActive: true,
      isStoryMission: true,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "High-Value Target Extraction",
      description: "Extract a compromised agent from hostile territory. Combat skills and quick reflexes essential.",
      difficulty: "specialist",
      missionType: "rescue",
      minimumLevel: 8,
      requiredReflex: 2.0,
      baseCredits: 600,
      baseExperience: 450,
      techLabReputation: 5,
      securityWingReputation: 20,
      commandCenterReputation: 25,
      lootTable: [
        { itemType: "extraction_kit", rarity: "rare", dropChance: 0.5 },
        { itemType: "shield_generator", rarity: "epic", dropChance: 0.15 }
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "Corporate Espionage",
      description: "Infiltrate a rival corporation's data centers. Advanced stealth and hacking required.",
      difficulty: "specialist",
      missionType: "stealth",
      minimumLevel: 10,
      requiredCognition: 2.0,
      requiredReflex: 1.8,
      baseCredits: 750,
      baseExperience: 500,
      techLabReputation: 20,
      securityWingReputation: 15,
      commandCenterReputation: 20,
      lootTable: [
        { itemType: "corporate_data", rarity: "rare", dropChance: 0.6 },
        { itemType: "encryption_key", rarity: "epic", dropChance: 0.2 }
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    // Elite missions
    await ctx.db.insert("missions", {
      title: "Echelon Protocol Breach",
      description: "The ultimate test. Infiltrate the Echelon mainframe and prove your worth as a true agent. All attributes will be tested.",
      difficulty: "elite",
      missionType: "stealth",
      minimumLevel: 15,
      requiredAccuracy: 3.0,
      requiredReflex: 3.0,
      requiredCognition: 3.0,
      baseCredits: 1500,
      baseExperience: 1000,
      techLabReputation: 50,
      securityWingReputation: 50,
      commandCenterReputation: 50,
      lootTable: [
        { itemType: "echelon_access", rarity: "legendary", dropChance: 0.1 },
        { itemType: "master_key", rarity: "epic", dropChance: 0.3 }
      ],
      isActive: true,
      isStoryMission: true,
      isGuildMission: false,
    });

    await ctx.db.insert("missions", {
      title: "Shadow Operative",
      description: "Become the academy's top stealth operative. Eliminate targets without leaving a trace.",
      difficulty: "elite",
      missionType: "stealth",
      minimumLevel: 20,
      requiredAccuracy: 4.0,
      requiredReflex: 3.5,
      requiredCognition: 3.5,
      baseCredits: 2000,
      baseExperience: 1200,
      techLabReputation: 30,
      securityWingReputation: 60,
      commandCenterReputation: 40,
      lootTable: [
        { itemType: "shadow_cloak", rarity: "legendary", dropChance: 0.05 },
        { itemType: "assassin_blade", rarity: "epic", dropChance: 0.25 }
      ],
      isActive: true,
      isStoryMission: false,
      isGuildMission: false,
    });

    console.log("✅ Missions seeded successfully");
    return null;
  },
});

/**
 * Create initial admin accounts
 */
export const seedAdmins = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if admins already exist
    const existingAdmins = await ctx.db.query("admins").take(1);
    if (existingAdmins.length > 0) {
      return null; // Already seeded
    }

    // Create super admin
    await ctx.db.insert("admins", {
      email: "admin@echelon-ascent.com",
      name: "Echelon Administrator",
      password: "admin123", // In production, use proper password hashing
      role: "super_admin",
      permissions: ["manage_missions", "manage_players", "manage_economy", "manage_events", "manage_admins", "view_analytics"],
      isActive: true,
      lastLoginTime: Date.now(),
    });

    // Create game master
    await ctx.db.insert("admins", {
      email: "gamemaster@echelon-ascent.com",
      name: "Game Master",
      password: "gamemaster123", // In production, use proper password hashing
      role: "game_master",
      permissions: ["manage_missions", "manage_players", "manage_events", "view_analytics"],
      isActive: true,
      lastLoginTime: Date.now(),
    });

    console.log("✅ Admin accounts seeded successfully");
    return null;
  },
});

/**
 * Reset all data (development only)
 */
export const resetDatabase = mutation({
  args: {
    confirmReset: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.confirmReset) {
      throw new Error("Reset not confirmed");
    }

    // Delete all data (be careful with this!)
    const collections = ["missions", "augmentees", "trainingResults", "missionCompletions", "nftAssets", "adminActions", "gameEvents", "playerReports"];
    
    for (const collection of collections) {
      try {
        const items = await ctx.db.query(collection as any).collect();
        for (const item of items) {
          await ctx.db.delete(item._id);
        }
      } catch (error) {
        // Collection might not exist yet, skip
        console.log(`Skipped ${collection}: ${error}`);
      }
    }

    console.log("🗑️ Database reset complete");
    return null;
  },
});

/**
 * Seed training drills
 */
export const seedTrainingDrills = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if training drills already exist
    const existingDrills = await ctx.db.query("trainingDrills").take(1);
    if (existingDrills.length > 0) {
      return null; // Already seeded
    }

    // Seed training drills
    await ctx.db.insert("trainingDrills", {
      name: "Neural Synchronization",
      category: "cognition",
      difficulty: 2,
      duration: 120,
      description: "Enhance neural pathway efficiency through synchronized brainwave training",
      icon: "🧠",
      rewards: { credits: 75, xp: 50 },
      requirements: { level: 1 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Reflex Matrix Training",
      category: "reflex",
      difficulty: 3,
      duration: 90,
      description: "High-speed reaction training using holographic targets",
      icon: "⚡",
      rewards: { credits: 80, xp: 55 },
      requirements: { level: 2 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Precision Targeting Protocol",
      category: "accuracy",
      difficulty: 4,
      duration: 150,
      description: "Advanced targeting systems calibration and muscle memory enhancement",
      icon: "🎯",
      rewards: { credits: 90, xp: 65 },
      requirements: { level: 3 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Endurance Protocol Alpha",
      category: "endurance",
      difficulty: 3,
      duration: 180,
      description: "Stamina and recovery optimization through controlled stress simulation",
      icon: "💪",
      rewards: { credits: 85, xp: 60 },
      requirements: { level: 2 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Data Encryption Challenge",
      category: "cognition",
      difficulty: 5,
      duration: 200,
      description: "Advanced cryptographic puzzles and data manipulation exercises",
      icon: "🔐",
      rewards: { credits: 120, xp: 80 },
      requirements: { level: 5 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Stealth Movement Simulation",
      category: "reflex",
      difficulty: 4,
      duration: 160,
      description: "Practice silent movement and evasion techniques in virtual environments",
      icon: "👤",
      rewards: { credits: 95, xp: 70 },
      requirements: { level: 4 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Combat Reflex Enhancement",
      category: "reflex",
      difficulty: 5,
      duration: 140,
      description: "High-intensity combat scenarios to improve reaction speed",
      icon: "⚔️",
      rewards: { credits: 110, xp: 75 },
      requirements: { level: 6 },
      isActive: true,
    });

    await ctx.db.insert("trainingDrills", {
      name: "Elite Marksman Training",
      category: "accuracy",
      difficulty: 6,
      duration: 180,
      description: "Extreme long-range targeting and precision under pressure",
      icon: "🏹",
      rewards: { credits: 130, xp: 85 },
      requirements: { level: 7 },
      isActive: true,
    });

    console.log("✅ Training drills seeded successfully");
    return null;
  },
});

/**
 * Seed training game configurations
 */
export const seedTrainingGameConfigs = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if training game configs already exist
    const existingConfigs = await ctx.db.query("trainingGameConfigs").take(1);
    if (existingConfigs.length > 0) {
      return null; // Already seeded
    }

    // Get all cognition drills to add game configs for them
    const cognitionDrills = await ctx.db
      .query("trainingDrills")
      .withIndex("by_category", (q) => q.eq("category", "cognition"))
      .collect();

    for (const drill of cognitionDrills) {
      // Add Pattern Matrix game configuration for all cognition drills
      await ctx.db.insert("trainingGameConfigs", {
        drillId: drill._id,
        gameType: "pattern_matrix",
        config: {
          gridSize: 4,
          timeLimit: 30,
          difficulty: drill.difficulty,
          lives: 3,
        },
        isActive: true,
      });
    }

    // Get all reflex drills to add game configs for them
    const reflexDrills = await ctx.db
      .query("trainingDrills")
      .withIndex("by_category", (q) => q.eq("category", "reflex"))
      .collect();

    for (const drill of reflexDrills) {
      // Add Reaction Grid game configuration for all reflex drills
      await ctx.db.insert("trainingGameConfigs", {
        drillId: drill._id,
        gameType: "reaction_grid",
        config: {
          gridSize: 5,
          timeLimit: 30,
          difficulty: drill.difficulty,
          lives: 3,
        },
        isActive: true,
      });
    }

    // Get all accuracy drills to add game configs for them
    const accuracyDrills = await ctx.db
      .query("trainingDrills")
      .withIndex("by_category", (q) => q.eq("category", "accuracy"))
      .collect();

    for (const drill of accuracyDrills) {
      // Add Precision Targets game configuration for all accuracy drills
      await ctx.db.insert("trainingGameConfigs", {
        drillId: drill._id,
        gameType: "precision_target",
        config: {
          gridSize: 6,
          timeLimit: 45,
          difficulty: drill.difficulty,
          lives: 3,
        },
        isActive: true,
      });
    }

    // Get all endurance drills to add game configs for them
    const enduranceDrills = await ctx.db
      .query("trainingDrills")
      .withIndex("by_category", (q) => q.eq("category", "endurance"))
      .collect();

    for (const drill of enduranceDrills) {
      // Add Stamina Rush game configuration for all endurance drills
      await ctx.db.insert("trainingGameConfigs", {
        drillId: drill._id,
        gameType: "stamina_rush",
        config: {
          gridSize: 6,
          timeLimit: 120, // 2 minutes for endurance
          difficulty: drill.difficulty,
          lives: 3,
        },
        isActive: true,
      });
    }

    console.log("✅ Training game configurations seeded successfully");
    return null;
  },
});

/**
 * Seed marketplace items
 */
export const seedMarketplaceItems = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if marketplace items already exist
    const existingItems = await ctx.db.query("marketplaceItems").take(1);
    if (existingItems.length > 0) {
      return null; // Already seeded
    }

    // Seed marketplace items
    await ctx.db.insert("marketplaceItems", {
      name: "Neural Processing Enhancer",
      category: "augmentation",
      price: 1200,
      rarity: "epic",
      description: "Boost cognitive processing speed by 25%",
      icon: "🧠",
      inStock: 5,
      isActive: true,
    });

    await ctx.db.insert("marketplaceItems", {
      name: "Kinetic Reflex Booster",
      category: "augmentation",
      price: 800,
      rarity: "rare",
      description: "Increase reaction time by 20%",
      icon: "⚡",
      inStock: 12,
      isActive: true,
    });

    await ctx.db.insert("marketplaceItems", {
      name: "Precision Targeting Module",
      category: "augmentation",
      price: 950,
      rarity: "rare",
      description: "Enhance targeting accuracy by 18%",
      icon: "🎯",
      inStock: 8,
      isActive: true,
    });

    await ctx.db.insert("marketplaceItems", {
      name: "Quantum Stealth Suit",
      category: "equipment",
      price: 2500,
      rarity: "legendary",
      description: "Advanced cloaking technology for stealth missions",
      icon: "👤",
      inStock: 2,
      isActive: true,
    });

    await ctx.db.insert("marketplaceItems", {
      name: "Quantum Data Scanner",
      category: "equipment",
      price: 600,
      rarity: "common",
      description: "Decrypt and analyze data streams efficiently",
      icon: "📡",
      inStock: 25,
      isActive: true,
    });

    console.log("✅ Marketplace items seeded successfully");
    return null;
  },
});

/**
 * Seed crafting schematics
 */
export const seedCraftingSchematics = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if crafting schematics already exist
    const existingSchematics = await ctx.db.query("craftingSchematics").take(1);
    if (existingSchematics.length > 0) {
      return null; // Already seeded
    }

    // Seed crafting schematics
    await ctx.db.insert("craftingSchematics", {
      name: "Enhanced Reflex Augmentation",
      category: "augmentation",
      rarity: "rare",
      description: "Boost neural reaction speed by 25%",
      craftingCost: {
        credits: 500,
        materials: [
          { materialId: "neural-chips", quantity: 1 },
          { materialId: "bio-mesh", quantity: 2 }
        ]
      },
      isActive: true,
    });

    await ctx.db.insert("craftingSchematics", {
      name: "Plasma Rifle Mark II",
      category: "weapon",
      rarity: "epic",
      description: "High-powered energy weapon with improved cooling",
      craftingCost: {
        credits: 1200,
        materials: [
          { materialId: "plasma-cells", quantity: 3 },
          { materialId: "quantum-core", quantity: 1 },
          { materialId: "nano-fibers", quantity: 5 }
        ]
      },
      isActive: true,
    });

    await ctx.db.insert("craftingSchematics", {
      name: "Adaptive Stealth Armor",
      category: "armor",
      rarity: "legendary",
      description: "Light-bending adaptive camouflage system",
      craftingCost: {
        credits: 2500,
        materials: [
          { materialId: "quantum-core", quantity: 2 },
          { materialId: "bio-mesh", quantity: 4 },
          { materialId: "nano-fibers", quantity: 10 }
        ]
      },
      isActive: true,
    });

    console.log("✅ Crafting schematics seeded successfully");
    return null;
  },
});

/**
 * Seed upgradeable items
 */
export const seedUpgradeableItems = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if upgradeable items already exist
    const existingItems = await ctx.db.query("upgradeableItems").take(1);
    if (existingItems.length > 0) {
      return null; // Already seeded
    }

    // Seed upgradeable items
    await ctx.db.insert("upgradeableItems", {
      name: "Neural Processing Unit",
      itemType: "ability",
      maxLevel: 5,
      rarity: "rare",
      description: "Enhance cognitive processing and data analysis capabilities",
      upgradeCost: {
        credits: 300,
        materials: [
          { materialId: "neural-chips", quantity: 1 },
          { materialId: "quantum-core", quantity: 1 }
        ]
      },
      isActive: true,
    });

    await ctx.db.insert("upgradeableItems", {
      name: "Kinetic Force Amplifier",
      itemType: "ability",
      maxLevel: 5,
      rarity: "epic",
      description: "Multiply physical force output through energy manipulation",
      upgradeCost: {
        credits: 450,
        materials: [
          { materialId: "plasma-cells", quantity: 2 },
          { materialId: "nano-fibers", quantity: 3 }
        ]
      },
      isActive: true,
    });

    await ctx.db.insert("upgradeableItems", {
      name: "Tactical Environment Scanner",
      itemType: "gadget",
      maxLevel: 3,
      rarity: "common",
      description: "Advanced environmental analysis and threat detection",
      upgradeCost: {
        credits: 200,
        materials: [
          { materialId: "neural-chips", quantity: 1 }
        ]
      },
      isActive: true,
    });

    console.log("✅ Upgradeable items seeded successfully");
    return null;
  },
});

/**
 * Seed initial player data for testing (creates loadout items and materials for a test wallet)
 */
export const seedPlayerData = mutation({
  args: {
    testWallet: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if player data already exists
    const existingLoadout = await ctx.db
      .query("loadoutItems")
      .withIndex("by_player", (q) => q.eq("playerWallet", args.testWallet))
      .take(1);
    
    if (existingLoadout.length > 0) {
      return null; // Already seeded
    }

    // Seed loadout items
    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Kinetic Burst",
      itemType: "ability",
      equipped: true,
      rarity: "rare",
      description: "Unleash a powerful kinetic shockwave",
      properties: { cooldown: 45, energyCost: 30 },
      acquiredAt: Date.now(),
    });

    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Neural Link",
      itemType: "ability",
      equipped: true,
      rarity: "common",
      description: "Enhance information processing speed",
      properties: { cooldown: 20, energyCost: 15 },
      acquiredAt: Date.now(),
    });

    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Grav-Boots",
      itemType: "gadget",
      equipped: true,
      rarity: "rare",
      description: "Magnetic boots for enhanced mobility",
      properties: { durability: 95, weight: 2.5 },
      acquiredAt: Date.now(),
    });

    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Data Slicer",
      itemType: "gadget",
      equipped: false,
      rarity: "common",
      description: "Advanced hacking and decryption tool",
      properties: { durability: 100, weight: 0.5 },
      acquiredAt: Date.now(),
    });

    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Plasma Shield",
      itemType: "ability",
      equipped: false,
      rarity: "epic",
      description: "Generate temporary energy barrier",
      properties: { cooldown: 60, energyCost: 40 },
      acquiredAt: Date.now(),
    });

    await ctx.db.insert("loadoutItems", {
      playerWallet: args.testWallet,
      itemName: "Invisi-Suit Proto",
      itemType: "gadget",
      equipped: false,
      rarity: "legendary",
      description: "Prototype optical camouflage system",
      properties: { durability: 80, weight: 5.0 },
      acquiredAt: Date.now(),
    });

    // Seed materials
    await ctx.db.insert("playerMaterials", {
      playerWallet: args.testWallet,
      materialName: "Quantum Processing Core",
      quantity: 3,
      rarity: "epic",
      description: "High-energy quantum computing component",
      category: "electronics",
    });

    await ctx.db.insert("playerMaterials", {
      playerWallet: args.testWallet,
      materialName: "Bio-Neural Mesh",
      quantity: 7,
      rarity: "rare",
      description: "Organic-synthetic hybrid neural interface material",
      category: "biotech",
    });

    await ctx.db.insert("playerMaterials", {
      playerWallet: args.testWallet,
      materialName: "Carbon Nano-Fibers",
      quantity: 15,
      rarity: "common",
      description: "Ultra-strong lightweight structural material",
      category: "materials",
    });

    await ctx.db.insert("playerMaterials", {
      playerWallet: args.testWallet,
      materialName: "Plasma Energy Cells",
      quantity: 5,
      rarity: "rare",
      description: "Compact high-energy storage units",
      category: "energy",
    });

    await ctx.db.insert("playerMaterials", {
      playerWallet: args.testWallet,
      materialName: "Neural Processing Chips",
      quantity: 2,
      rarity: "epic",
      description: "Advanced neural interface processors",
      category: "electronics",
    });

    console.log(`✅ Player data seeded for wallet: ${args.testWallet}`);
    return null;
  },
});

 