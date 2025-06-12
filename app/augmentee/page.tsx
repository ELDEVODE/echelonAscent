"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ToastProvider } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";

interface AugmentedAbility {
  id: string;
  name: string;
  type: 'offensive' | 'defensive' | 'utility';
  powerLevel: number;
  maxPowerLevel: number;
  description: string;
  equipped: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  cost: number;
  requiredLevel: number;
  bonuses: { [key: string]: number };
}

interface PlayerAchievement {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'stealth' | 'progression' | 'special';
  icon: string;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

interface ChronoTechGadget {
  id: string;
  name: string;
  category: 'tactical' | 'stealth' | 'support';
  description: string;
  equipped: boolean;
  durability: number;
  maxDurability: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface SuitModification {
  id: string;
  name: string;
  slot: 'helmet' | 'chest' | 'arms' | 'legs' | 'effect';
  description: string;
  equipped: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Enhanced toast hook
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{id: string, title: string, message: string, type: string}>>([]);

  const success = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'success' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const warning = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'warning' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const info = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'info' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  return { success, warning, info, toasts };
};

export default function Augmentee() {
  const userContext = useUser();
  const { user } = userContext;
  
  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">Neural Interface Locked</div>
          <div className="text-gray-400">Authentication required for augmentee access</div>
        </div>
      </div>
    );
  }

  if (!userHasWallet(userContext)) {
    if ('createWallet' in userContext && 'walletCreationInProgress' in userContext && !userContext.walletCreationInProgress) {
      userContext.createWallet().catch(console.error);
    }
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">⚡</div>
          <div className="text-xl font-bold mb-2">Initializing Neural Wallet</div>
          <div className="text-gray-400">Establishing secure blockchain connection...</div>
          <div className="mt-4 w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const walletAddress = userContext.solana.address;

  // Enhanced data fetching
  const playerData = useQuery(api.myFunctions.getAugmenteeProfile, {
    userWallet: walletAddress
  });
  const loadoutItems = useQuery(api.myFunctions.getPlayerLoadout, {
    userWallet: walletAddress
  }) || [];
  const missions = useQuery(api.myFunctions.getSimulationMissions, {
    userWallet: walletAddress
  }) || [];
  const trainingHistory = useQuery(api.myFunctions.getPlayerTrainingHistory, {
    userWallet: walletAddress
  }) || [];
  
  const upgradeAugmentation = useMutation(api.myFunctions.upgradeAugmentation);
  const updateProfile = useMutation(api.myFunctions.updateAugmenteeProfile);

  const [ascentCredits, setAscentCredits] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'abilities' | 'equipment' | 'achievements' | 'stats'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const { success: showSuccess, warning: showWarning, info: showInfo, toasts } = useToast();

  useEffect(() => {
    if (playerData) {
      setAscentCredits(playerData.ascentCredits);
      setProfileName(playerData.displayName || 'Unnamed Agent');
    }
  }, [playerData]);

  // Enhanced stats calculations
  const playerStats = {
    level: playerData?.level || 1,
    totalXP: playerData?.experiencePoints || 0,
    nextLevelXP: ((playerData?.level || 1) + 1) * 100,
    accuracy: playerData?.accuracy || 1,
    reflex: playerData?.reflex || 1,
    cognition: playerData?.cognition || 1,
    missionsCompleted: playerData?.totalMissionsCompleted || 0,
    trainingSessionsCompleted: trainingHistory.length,
    totalCreditsEarned: (playerData?.totalMissionsCompleted || 0) * 150 + trainingHistory.length * 50,
    averageTrainingScore: trainingHistory.length > 0 
      ? Math.round(trainingHistory.reduce((sum: any, session: any) => sum + (session.score || 0), 0) / trainingHistory.length)
      : 0,
    rank: calculateRank(playerData?.level || 1, playerData?.totalMissionsCompleted || 0),
    overallRating: Math.floor(((playerData?.accuracy || 1) + (playerData?.reflex || 1) + (playerData?.cognition || 1)) / 3 * 10),
  };

  function calculateRank(level: number, missions: number): string {
    const totalScore = level * 10 + missions * 5;
    if (totalScore >= 500) return 'Elite Operative';
    if (totalScore >= 300) return 'Senior Agent';
    if (totalScore >= 150) return 'Field Agent';
    if (totalScore >= 50) return 'Junior Agent';
    return 'Recruit';
  }

  // Enhanced abilities with progression
  const abilities: AugmentedAbility[] = [
    {
      id: 'accuracy',
      name: 'Precision Targeting',
      type: 'offensive',
      powerLevel: playerStats.accuracy,
      maxPowerLevel: 10,
      description: 'Neural targeting system with predictive aim assist and bullet-time perception',
      equipped: playerStats.accuracy > 1,
      rarity: playerStats.accuracy > 7 ? 'legendary' : playerStats.accuracy > 5 ? 'epic' : playerStats.accuracy > 3 ? 'rare' : 'common',
      cost: Math.floor(100 * Math.pow(1.5, playerStats.accuracy - 1)),
      requiredLevel: Math.max(1, (playerStats.accuracy - 1) * 2),
      bonuses: {
        'Critical Hit Chance': playerStats.accuracy * 5,
        'Aim Stability': playerStats.accuracy * 10,
        'Headshot Damage': playerStats.accuracy * 15,
      }
    },
    {
      id: 'reflex',
      name: 'Neural Reflexes',
      type: 'defensive',
      powerLevel: playerStats.reflex,
      maxPowerLevel: 10,
      description: 'Enhanced reaction time through synaptic acceleration and muscle memory optimization',
      equipped: playerStats.reflex > 1,
      rarity: playerStats.reflex > 7 ? 'legendary' : playerStats.reflex > 5 ? 'epic' : playerStats.reflex > 3 ? 'rare' : 'common',
      cost: Math.floor(100 * Math.pow(1.5, playerStats.reflex - 1)),
      requiredLevel: Math.max(1, (playerStats.reflex - 1) * 2),
      bonuses: {
        'Dodge Chance': playerStats.reflex * 8,
        'Movement Speed': playerStats.reflex * 6,
        'Counter Attack': playerStats.reflex * 12,
      }
    },
    {
      id: 'cognition',
      name: 'Cognitive Enhancement',
      type: 'utility',
      powerLevel: playerStats.cognition,
      maxPowerLevel: 10,
      description: 'Advanced processing power, pattern recognition, and tactical analysis',
      equipped: playerStats.cognition > 1,
      rarity: playerStats.cognition > 7 ? 'legendary' : playerStats.cognition > 5 ? 'epic' : playerStats.cognition > 3 ? 'rare' : 'common',
      cost: Math.floor(100 * Math.pow(1.5, playerStats.cognition - 1)),
      requiredLevel: Math.max(1, (playerStats.cognition - 1) * 2),
      bonuses: {
        'Hack Speed': playerStats.cognition * 12,
        'XP Bonus': playerStats.cognition * 3,
        'Puzzle Solving': playerStats.cognition * 20,
      }
    }
  ];

  // Dynamic achievements
  const achievements: PlayerAchievement[] = [
    {
      id: 'first_mission',
      name: 'First Assignment',
      description: 'Complete your first mission',
      category: 'progression',
      icon: '🎯',
      unlockedAt: playerStats.missionsCompleted >= 1 ? Date.now() - 86400000 : undefined,
      progress: Math.min(playerStats.missionsCompleted, 1),
      maxProgress: 1,
    },
    {
      id: 'mission_veteran',
      name: 'Mission Veteran',
      description: 'Complete 10 missions',
      category: 'progression',
      icon: '🏆',
      unlockedAt: playerStats.missionsCompleted >= 10 ? Date.now() - 86400000 : undefined,
      progress: Math.min(playerStats.missionsCompleted, 10),
      maxProgress: 10,
    },
    {
      id: 'training_dedication',
      name: 'Training Dedication',
      description: 'Complete 25 training sessions',
      category: 'progression',
      icon: '💪',
      unlockedAt: playerStats.trainingSessionsCompleted >= 25 ? Date.now() - 86400000 : undefined,
      progress: Math.min(playerStats.trainingSessionsCompleted, 25),
      maxProgress: 25,
    },
    {
      id: 'augmentation_expert',
      name: 'Augmentation Expert',
      description: 'Upgrade all abilities to level 5+',
      category: 'progression',
      icon: '🧠',
      unlockedAt: abilities.every(a => a.powerLevel >= 5) ? Date.now() - 86400000 : undefined,
      progress: abilities.filter(a => a.powerLevel >= 5).length,
      maxProgress: abilities.length,
    },
    {
      id: 'elite_status',
      name: 'Elite Status',
      description: 'Achieve Elite Operative rank',
      category: 'special',
      icon: '⭐',
      unlockedAt: playerStats.rank === 'Elite Operative' ? Date.now() - 86400000 : undefined,
      progress: playerStats.rank === 'Elite Operative' ? 1 : 0,
      maxProgress: 1,
    }
  ];

  const handleUpgrade = async (ability: AugmentedAbility) => {
    if (ascentCredits < ability.cost) {
      showWarning('Insufficient Credits', `Need ${ability.cost} credits for this neural enhancement`);
      return;
    }

    if (playerStats.level < ability.requiredLevel) {
      showWarning('Level Requirement', `Reach level ${ability.requiredLevel} to unlock this upgrade`);
      return;
    }

    try {
      await upgradeAugmentation({ 
        userWallet: walletAddress,
        augmentationType: ability.id as 'accuracy' | 'reflex' | 'cognition', 
        cost: ability.cost
      });
      setAscentCredits(prev => prev - ability.cost);
      showSuccess('Neural Enhancement Complete', `${ability.name} upgraded to level ${ability.powerLevel + 1}`);
    } catch (error) {
      showWarning('Enhancement Failed', 'Neural interface interference detected');
    }
  };

  const handleProfileSave = async () => {
    if (!playerData) return;
    
    try {
      await updateProfile({
        playerId: playerData._id,
        updates: { displayName: profileName }
      });
      setIsEditing(false);
      showSuccess('Profile Updated', 'Agent designation synchronized to neural matrix');
    } catch (error) {
      showWarning('Update Failed', 'Unable to synchronize profile data');
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400/30';
      case 'rare': return 'text-blue-400 border-blue-400/30';
      case 'epic': return 'text-purple-400 border-purple-400/30';
      case 'legendary': return 'text-yellow-400 border-yellow-400/30';
      default: return 'text-green-400 border-green-400/30';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-400/10';
      case 'rare': return 'bg-blue-400/10';
      case 'epic': return 'bg-purple-400/10';
      case 'legendary': return 'bg-yellow-400/10';
      default: return 'bg-green-400/10';
    }
  };

  const getAbilityIcon = (type: string) => {
    switch (type) {
      case 'offensive': return '🎯';
      case 'defensive': return '🛡️';
      case 'utility': return '🧠';
      default: return '⚡';
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Elite Operative': return 'text-yellow-400';
      case 'Senior Agent': return 'text-purple-400';
      case 'Field Agent': return 'text-blue-400';
      case 'Junior Agent': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const toggleEquip = (type: string, id: string) => {
    // Placeholder for equipment toggle functionality
    showInfo('Equipment System', 'Equipment management coming soon');
  };

  return (
    <ToastProvider>
    <div className="h-screen w-full bg-black text-green-400 font-mono relative overflow-hidden">
      {/* Enhanced Neural Grid Background */}
      <div className="absolute inset-0 opacity-10 z-0">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,197,94,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,197,94,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Neural Activity Particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

      {/* Scanning Lines */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-pulse" 
             style={{ top: '15%', animationDuration: '4s' }} />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-pulse" 
             style={{ top: '65%', animationDuration: '5s', animationDelay: '1.5s' }} />
      </div>

      <Navbar ascentCredits={ascentCredits} />

      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-42">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Enhanced Profile Header */}
          <div className="bg-black/70 border border-green-400/40 rounded-lg p-8 backdrop-blur-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-8">
                {/* Neural Avatar */}
                <div className="relative group">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-400/30 to-green-600/50 rounded-lg border-2 border-green-400/60 flex items-center justify-center overflow-hidden">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400/40 to-green-500/60 rounded-lg flex items-center justify-center">
                      <div className="w-16 h-16 bg-green-400 rounded-lg opacity-90 flex items-center justify-center text-black font-bold text-2xl">
                        {profileName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-green-400 rounded-full border-3 border-black flex items-center justify-center">
                    <div className="w-3 h-3 bg-black rounded-full animate-pulse" />
                  </div>
                  {/* Rank Badge */}
                  <div className={`absolute -top-2 -left-2 px-2 py-1 rounded text-xs font-bold border ${getRankColor(playerStats.rank)} bg-black/80 border-current/30`}>
                    {playerStats.rank.split(' ')[0]}
                  </div>
                </div>
                
                {/* Agent Info */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="bg-black/60 border border-green-400/40 rounded px-3 py-2 text-green-400 font-bold text-2xl"
                          placeholder="Agent Name"
                        />
                        <button
                          onClick={handleProfileSave}
                          className="px-3 py-2 bg-green-400/20 border border-green-400/40 rounded text-green-400 hover:bg-green-400/30"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-2 bg-red-400/20 border border-red-400/40 rounded text-red-400 hover:bg-red-400/30"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <h1 className="text-3xl font-bold">{profileName}</h1>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-gray-400 hover:text-green-400 text-xl"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-green-300 text-lg">Neural ID: {user.id.slice(0, 12)}...</p>
                    <p className={`text-lg font-bold ${getRankColor(playerStats.rank)}`}>{playerStats.rank}</p>
                    <p className="text-gray-400">Overall Rating: <span className="text-green-400 font-bold">{playerStats.overallRating}/100</span></p>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{playerStats.missionsCompleted}</div>
                      <div className="text-gray-400">Missions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{playerStats.trainingSessionsCompleted}</div>
                      <div className="text-gray-400">Training</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{achievements.filter(a => a.unlockedAt).length}</div>
                      <div className="text-gray-400">Achievements</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Level Progression */}
              <div className="text-right space-y-3">
                <div className="text-3xl font-bold mb-2">Level {playerStats.level}</div>
                <div className="w-64 h-4 bg-black/60 border border-green-400/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(playerStats.totalXP / playerStats.nextLevelXP) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400">{playerStats.totalXP} / {playerStats.nextLevelXP} XP</p>
                <div className="text-xs text-green-300">
                  {playerStats.nextLevelXP - playerStats.totalXP} XP to next level
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-2">
            <div className="flex space-x-2">
              {[
                { id: 'overview', label: 'Neural Overview', icon: '🧬' },
                { id: 'abilities', label: 'Augmentations', icon: '⚡', count: abilities.filter(a => a.equipped).length },
                { id: 'equipment', label: 'Equipment', icon: '🔧', count: loadoutItems.length },
                { id: 'achievements', label: 'Achievements', icon: '🏆', count: achievements.filter(a => a.unlockedAt).length },
                { id: 'stats', label: 'Analytics', icon: '📊' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-green-400/20 text-green-400 border border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                      : 'text-gray-400 hover:text-green-300 hover:bg-green-400/10'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-green-400/30' : 'bg-gray-400/20'
                  }`}>
                    {tab.count}
                  </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Neural Status */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="text-green-400">🧠</span>
                    <span className="ml-2">Neural Status Matrix</span>
                  </h3>
                  <div className="space-y-4">
                    {[
                      { name: 'Accuracy', level: playerStats.accuracy, color: 'text-red-400' },
                      { name: 'Reflex', level: playerStats.reflex, color: 'text-blue-400' },
                      { name: 'Cognition', level: playerStats.cognition, color: 'text-purple-400' }
                    ].map((stat) => (
                      <div key={stat.name} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{stat.name}</span>
                          <span className={`font-bold ${stat.color}`}>Level {stat.level}</span>
                        </div>
                        <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${(stat.level / 10) * 100}%`,
                              backgroundColor: stat.color.includes('red') ? '#ef4444' : 
                                               stat.color.includes('blue') ? '#3b82f6' : '#a855f7'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="text-green-400">⚡</span>
                    <span className="ml-2">Recent Activity</span>
                  </h3>
                  <div className="space-y-3">
                    {trainingHistory.slice(0, 5).map((session: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-black/40 rounded border border-green-400/20">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center">
                            <span className="text-green-400 text-sm">🎯</span>
                          </div>
                          <div>
                            <div className="text-green-400 font-bold text-sm">{session.drillType}</div>
                            <div className="text-gray-400 text-xs">Training Session</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">{session.score || 0}</div>
                          <div className="text-gray-400 text-xs">Score</div>
                        </div>
                      </div>
                    ))}
                    {trainingHistory.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No recent activity. Start training to see your progress here.
                      </div>
                    )}
                  </div>
                </div>

                {/* Mission Progress */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="text-green-400">🎯</span>
                    <span className="ml-2">Mission Progress</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Completed</span>
                      <span className="text-green-400 font-bold">{missions.filter(m => m.status === 'completed').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Available</span>
                      <span className="text-blue-400 font-bold">{missions.filter(m => m.status === 'available').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Locked</span>
                      <span className="text-red-400 font-bold">{missions.filter(m => m.status === 'locked').length}</span>
                    </div>
                    <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden mt-4">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(missions.filter(m => m.status === 'completed').length / Math.max(missions.length, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-center text-sm text-gray-400">
                      {Math.round((missions.filter(m => m.status === 'completed').length / Math.max(missions.length, 1)) * 100)}% Complete
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <span className="text-green-400">⚙️</span>
                    <span className="ml-2">Quick Actions</span>
                  </h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('abilities')}
                      className="w-full p-3 bg-green-400/10 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-400/20 transition-all duration-200"
                    >
                      🧠 Upgrade Abilities
                    </button>
                    <button 
                      onClick={() => setActiveTab('achievements')}
                      className="w-full p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-yellow-400 hover:bg-yellow-400/20 transition-all duration-200"
                    >
                      🏆 View Achievements
                    </button>
                    <button 
                      onClick={() => setActiveTab('stats')}
                      className="w-full p-3 bg-blue-400/10 border border-blue-400/30 rounded-lg text-blue-400 hover:bg-blue-400/20 transition-all duration-200"
                    >
                      📊 Analyze Performance
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Abilities Tab */}
            {activeTab === 'abilities' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {abilities.map((ability) => (
                    <div key={ability.id} className={`group relative bg-black/60 border rounded-lg p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] ${getRarityColor(ability.rarity)}`}>
                    <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getRarityBg(ability.rarity)}`} />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${getRarityBg(ability.rarity)}`}>
                          {ability.rarity}
                        </div>
                          <div className="text-2xl">{getAbilityIcon(ability.type)}</div>
                      </div>
                      
                        <h3 className="text-xl font-bold mb-2">{ability.name}</h3>
                        <p className="text-sm text-gray-400 mb-4">{ability.description}</p>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Enhancement Level</span>
                            <span className="font-bold text-green-400">{ability.powerLevel}/{ability.maxPowerLevel}</span>
                        </div>
                          <div className="w-full h-3 bg-black/60 border border-green-400/20 rounded-full overflow-hidden">
                          <div 
                              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${(ability.powerLevel / ability.maxPowerLevel) * 100}%` }}
                          />
                        </div>

                          {/* Ability Bonuses */}
                          <div className="bg-black/40 rounded p-3 space-y-1">
                            <div className="text-xs text-gray-400 font-bold">ACTIVE BONUSES:</div>
                            {Object.entries(ability.bonuses).map(([bonus, value]) => (
                              <div key={bonus} className="flex justify-between text-xs">
                                <span className="text-gray-300">{bonus}</span>
                                <span className="text-green-400">+{value}%</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Upgrade Button */}
                          <button
                            onClick={() => handleUpgrade(ability)}
                            disabled={ability.powerLevel >= ability.maxPowerLevel || ascentCredits < ability.cost || playerStats.level < ability.requiredLevel}
                            className={`w-full py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                              ability.powerLevel >= ability.maxPowerLevel
                                ? 'bg-gray-400/20 text-gray-400 border border-gray-400/40 cursor-not-allowed'
                                : playerStats.level < ability.requiredLevel
                                ? 'bg-red-400/20 text-red-400 border border-red-400/40 cursor-not-allowed'
                                : ascentCredits >= ability.cost
                                ? 'bg-green-400/20 text-green-400 border border-green-400/40 hover:bg-green-400/30'
                                : 'bg-red-400/20 text-red-400 border border-red-400/40 cursor-not-allowed'
                            }`}
                          >
                            {ability.powerLevel >= ability.maxPowerLevel ? 'MAX LEVEL' : 
                             playerStats.level < ability.requiredLevel ? `LEVEL ${ability.requiredLevel} REQUIRED` :
                             ascentCredits >= ability.cost ? `UPGRADE (${ability.cost} Credits)` : 'INSUFFICIENT CREDITS'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhancement Matrix Info */}
                <div className="bg-black/40 border border-green-400/20 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4 text-green-400">NEURAL ENHANCEMENT MATRIX</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="text-center p-4 bg-black/40 rounded border border-red-400/30">
                      <div className="text-3xl font-bold text-red-400">{playerStats.accuracy}</div>
                      <div className="text-gray-400 mb-2">Accuracy Rating</div>
                      <div className="text-xs text-red-300">Combat precision and targeting systems</div>
                    </div>
                    <div className="text-center p-4 bg-black/40 rounded border border-blue-400/30">
                      <div className="text-3xl font-bold text-blue-400">{playerStats.reflex}</div>
                      <div className="text-gray-400 mb-2">Reflex Rating</div>
                      <div className="text-xs text-blue-300">Reaction time and evasive capabilities</div>
                    </div>
                    <div className="text-center p-4 bg-black/40 rounded border border-purple-400/30">
                      <div className="text-3xl font-bold text-purple-400">{playerStats.cognition}</div>
                      <div className="text-gray-400 mb-2">Cognition Rating</div>
                      <div className="text-xs text-purple-300">Processing power and tactical analysis</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <div>
                {loadoutItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loadoutItems.map((item) => (
                      <div key={item.id} className={`group relative bg-black/60 border rounded-lg p-6 transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] ${getRarityColor(item.rarity)}`}>
                        <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getRarityBg(item.rarity)}`} />
                    <div className="relative z-10">
                          <div className="flex items-center justify-between mb-4">
                            <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${getRarityBg(item.rarity)}`}>
                              {item.rarity}
                            </div>
                            <div className="text-2xl">{item.type === 'gadget' ? '🔧' : '⚡'}</div>
                          </div>
                          
                          <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                          <p className="text-sm text-gray-400 mb-4">{item.description}</p>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Status</span>
                              <span className={`font-bold ${item.equipped ? 'text-green-400' : 'text-gray-400'}`}>
                                {item.equipped ? 'EQUIPPED' : 'AVAILABLE'}
                              </span>
                            </div>
                            
                            {/* Properties display */}
                            {(item as any).properties && Object.keys((item as any).properties).length > 0 && (
                              <div className="text-xs text-gray-400 bg-black/40 rounded p-2">
                                <div className="font-bold mb-1">PROPERTIES:</div>
                                {Object.entries((item as any).properties).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key}:</span>
                                    <span className="text-green-400">{String(value)}</span>
                                  </div>
                                ))}
                        </div>
                            )}
                            
                            {/* Toggle Button */}
                        <button
                              onClick={() => toggleEquip('equipment', item.id)}
                              className={`w-full py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                                item.equipped
                                  ? 'bg-red-400/20 text-red-400 border border-red-400/40 hover:bg-red-400/30'
                                  : 'bg-green-400/20 text-green-400 border border-green-400/40 hover:bg-green-400/30'
                              }`}
                            >
                              {item.equipped ? 'UNEQUIP' : 'EQUIP'}
                        </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">🔧</div>
                    <div className="text-2xl font-bold mb-4 text-green-400">NO EQUIPMENT AVAILABLE</div>
                    <div className="text-gray-400 mb-8 max-w-md mx-auto">
                      Complete missions and training to acquire advanced equipment and gear
                    </div>
                    <div className="bg-black/40 border border-green-400/20 rounded-lg p-6 max-w-lg mx-auto">
                      <div className="text-sm text-gray-400">
                        Equipment includes weapons, tactical gear, and specialized tools that enhance your capabilities during missions.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className={`group relative border rounded-lg p-6 transition-all duration-300 ${
                    achievement.unlockedAt 
                      ? 'bg-green-400/10 border-green-400/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                      : 'bg-black/40 border-gray-600/30'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className={`text-4xl ${achievement.unlockedAt ? 'opacity-100' : 'opacity-30 grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold mb-2 ${achievement.unlockedAt ? 'text-green-400' : 'text-gray-400'}`}>
                          {achievement.name}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">{achievement.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Progress</span>
                            <span className={achievement.unlockedAt ? 'text-green-400' : 'text-gray-400'}>
                              {achievement.progress}/{achievement.maxProgress}
                            </span>
                        </div>
                          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                achievement.unlockedAt ? 'bg-green-400' : 'bg-gray-600'
                              }`}
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          />
                        </div>
                          {achievement.unlockedAt && (
                            <div className="text-xs text-green-300 mt-2">
                              ✓ Unlocked
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-6 text-green-400">Performance Analytics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between p-3 bg-black/40 rounded">
                      <span className="text-gray-400">Overall Rating</span>
                      <span className="text-green-400 font-bold">{playerStats.overallRating}/100</span>
                    </div>
                    <div className="flex justify-between p-3 bg-black/40 rounded">
                      <span className="text-gray-400">Missions Completed</span>
                      <span className="text-blue-400 font-bold">{playerStats.missionsCompleted}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-black/40 rounded">
                      <span className="text-gray-400">Training Sessions</span>
                      <span className="text-purple-400 font-bold">{playerStats.trainingSessionsCompleted}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-black/40 rounded">
                      <span className="text-gray-400">Average Training Score</span>
                      <span className="text-yellow-400 font-bold">{playerStats.averageTrainingScore}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-black/40 rounded">
                      <span className="text-gray-400">Total Credits Earned</span>
                      <span className="text-green-400 font-bold">{playerStats.totalCreditsEarned}</span>
                    </div>
                  </div>
                </div>

                {/* Capability Breakdown */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-6 text-green-400">Capability Matrix</h3>
                  <div className="space-y-6">
                    {[
                      { name: 'Accuracy', value: playerStats.accuracy, max: 10, color: 'bg-red-400' },
                      { name: 'Reflex', value: playerStats.reflex, max: 10, color: 'bg-blue-400' },
                      { name: 'Cognition', value: playerStats.cognition, max: 10, color: 'bg-purple-400' }
                    ].map((stat) => (
                      <div key={stat.name} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold">{stat.name}</span>
                          <span className="text-green-400 font-bold">{stat.value}/{stat.max}</span>
                        </div>
                        <div className="w-full h-4 bg-black/60 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${stat.color} rounded-full transition-all duration-1000`}
                            style={{ width: `${(stat.value / stat.max) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.round((stat.value / stat.max) * 100)}% of maximum potential
                        </div>
                      </div>
                    ))}
                  </div>
                      </div>
                      
                {/* Mission Statistics */}
                <div className="bg-black/60 border border-green-400/30 rounded-lg p-6 lg:col-span-2">
                  <h3 className="text-xl font-bold mb-6 text-green-400">Mission Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-green-400/10 rounded border border-green-400/30">
                      <div className="text-3xl font-bold text-green-400">{missions.filter(m => m.status === 'completed').length}</div>
                      <div className="text-sm text-gray-400">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-blue-400/10 rounded border border-blue-400/30">
                      <div className="text-3xl font-bold text-blue-400">{missions.filter(m => m.status === 'available').length}</div>
                      <div className="text-sm text-gray-400">Available</div>
                    </div>
                    <div className="text-center p-4 bg-red-400/10 rounded border border-red-400/30">
                      <div className="text-3xl font-bold text-red-400">{missions.filter(m => m.status === 'locked').length}</div>
                      <div className="text-sm text-gray-400">Locked</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-400/10 rounded border border-yellow-400/30">
                      <div className="text-3xl font-bold text-yellow-400">
                        {missions.length > 0 ? Math.round((missions.filter(m => m.status === 'completed').length / missions.length) * 100) : 0}%
                      </div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Enhanced Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-black/90 border border-green-400/60 rounded-lg p-4 shadow-[0_0_30px_rgba(34,197,94,0.4)] backdrop-blur-sm animate-in slide-in-from-right-full duration-500"
            style={{ minWidth: '320px' }}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-3 h-3 rounded-full mt-1 animate-pulse ${
                toast.type === 'success' ? 'bg-green-400' :
                toast.type === 'warning' ? 'bg-yellow-400' :
                toast.type === 'info' ? 'bg-blue-400' : 'bg-green-400'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${
                  toast.type === 'success' ? 'text-green-400' :
                  toast.type === 'warning' ? 'text-yellow-400' :
                  toast.type === 'info' ? 'text-blue-400' : 'text-green-400'
                }`}>
                  {toast.title}
                </div>
                <div className="text-gray-300 text-xs">
                  {toast.message}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-green-400/60' :
                toast.type === 'warning' ? 'bg-yellow-400/60' :
                toast.type === 'info' ? 'bg-blue-400/60' : 'bg-green-400/60'
              }`} />
            </div>
            <div className={`mt-3 h-px bg-gradient-to-r from-transparent to-transparent ${
              toast.type === 'success' ? 'via-green-400/50' :
              toast.type === 'warning' ? 'via-yellow-400/50' :
              toast.type === 'info' ? 'via-blue-400/50' : 'via-green-400/50'
            }`} />
          </div>
        ))}
      </div>
      
      <ToastContainer />
    </div>
    </ToastProvider>
  );
}