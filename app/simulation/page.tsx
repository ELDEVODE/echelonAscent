"use client";

import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import Navbar from "@/components/Navbar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ToastProvider } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";

interface Mission {
  id: string;
  name: string;
  codename: string;
  type: 'stealth' | 'combat' | 'hacking' | 'investigation' | 'rescue' | 'sabotage';
  difficulty: number;
  duration: string;
  clearanceLevel: number;
  description: string;
  objectives: string[];
  environment: string;
  rewards: {
    credits: number;
    xp: number;
    nftChance?: string;
    specialReward?: string;
  };
  status: 'available' | 'locked' | 'completed' | 'in-progress';
  completionRate?: number;
  bestScore?: number;
  firstClearBonus?: boolean;
  requirements?: {
    level: number;
    accuracy?: number;
    reflex?: number;
    cognition?: number;
  };
}

interface LoadoutItem {
  id: string;
  name: string;
  type: 'ability' | 'gadget';
  equipped: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Toast hook
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{id: string, title: string, message: string, type: string}>>([]);

  const mission = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'mission' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

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

  return { mission, success, warning, toasts };
};

export default function Simulation() {
  // Get Civic user data
  const userContext = useUser();
  const { user } = userContext;
  
  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">User not logged in</div>
          <div className="text-gray-400">Please authenticate to access simulation</div>
        </div>
      </div>
    );
  }

  // Check if user has a wallet, if not create one
  if (!userHasWallet(userContext)) {
    if ('createWallet' in userContext && 'walletCreationInProgress' in userContext && !userContext.walletCreationInProgress) {
      userContext.createWallet().catch(console.error);
    }
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">⚡</div>
          <div className="text-xl font-bold mb-2">Creating Wallet</div>
          <div className="text-gray-400">Setting up your secure Web3 wallet...</div>
          <div className="mt-4 w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Get wallet address from Solana wallet
  const walletAddress = userContext.solana.address;

  // Get real data from backend
  const playerData = useQuery(api.myFunctions.getAugmenteeProfile, {
    userWallet: walletAddress
  });
  const missions: Mission[] = useQuery(api.myFunctions.getSimulationMissions, {
    userWallet: walletAddress
  }) || [];
  const loadoutItems = useQuery(api.myFunctions.getPlayerLoadout, {
    userWallet: walletAddress
  }) || [];
  const startMissionMutation = useMutation(api.myFunctions.startMission);
  const completeMissionMutation = useMutation(api.myFunctions.completeMission);

  const [ascentCredits, setAscentCredits] = useState(0);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [missionFilter, setMissionFilter] = useState<string>('available');
  const [showLoadout, setShowLoadout] = useState(false);
  const [activeMission, setActiveMission] = useState<any>(null);
  const [missionProgress, setMissionProgress] = useState(0);
  const [missionStartTime, setMissionStartTime] = useState<number | null>(null);
  const { mission: showMission, success: showSuccess, warning: showWarning, toasts } = useToast();

  // Update credits when player data loads
  useEffect(() => {
    if (playerData) {
      setAscentCredits(playerData.ascentCredits);
    }
  }, [playerData]);

  // Loadout items now come from Convex backend

  const missionTypes = [
    { id: 'available', name: 'Available', count: missions.filter(m => m.status === 'available').length },
    { id: 'completed', name: 'Completed', count: missions.filter(m => m.status === 'completed').length },
    { id: 'locked', name: 'Locked', count: missions.filter(m => m.status === 'locked').length },
    { id: 'all', name: 'All Missions', count: missions.length }
  ];

  const filteredMissions = missionFilter === 'all' 
    ? missions 
    : missions.filter(mission => mission.status === missionFilter);

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (difficulty <= 4) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    return 'text-red-400 border-red-400/30 bg-red-400/10';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stealth': return '👤';
      case 'combat': return '⚔️';
      case 'hacking': return '🔓';
      case 'investigation': return '🔍';
      case 'rescue': return '🚁';
      case 'sabotage': return '💥';
      default: return '🎯';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400 border-gray-400/30';
      case 'rare': return 'text-blue-400 border-blue-400/30';
      case 'epic': return 'text-purple-400 border-purple-400/30';
      case 'legendary': return 'text-yellow-400 border-yellow-400/30';
      default: return 'text-gray-400 border-gray-400/30';
    }
  };

  const canStartMission = (mission: any) => {
    if (!playerData) return false;
    if (mission.status === 'locked' || mission.status === 'completed') return false;
    
    return (
      playerData.level >= mission.requirements.level &&
      (!mission.requirements.accuracy || playerData.accuracy >= mission.requirements.accuracy) &&
      (!mission.requirements.reflex || playerData.reflex >= mission.requirements.reflex) &&
      (!mission.requirements.cognition || playerData.cognition >= mission.requirements.cognition)
    );
  };

  const startMission = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    if (!canStartMission(mission)) {
      showWarning('Access Denied', 'Mission requirements not met.');
      return;
    }

    try {
      const result = await startMissionMutation({ 
        userWallet: walletAddress,
        missionId: missionId as any
      });

      setActiveMission(mission);
    setMissionProgress(0);
      setMissionStartTime(Date.now());
    setSelectedMission(null);
    
      showMission('Mission Initiated', result.message);
    
      // Simulate dynamic mission progress with realistic variations
    const progressInterval = setInterval(() => {
      setMissionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
            completeMission(missionId, mission);
          return 100;
        }
          
          // Variable progress speed based on mission difficulty
          const baseSpeed = mission.difficulty <= 2 ? 3 : mission.difficulty <= 4 ? 2 : 1.5;
          const randomFactor = Math.random() * 2 + 0.5;
          
          return Math.min(prev + (baseSpeed * randomFactor), 100);
        });
      }, 500);
    } catch (error: any) {
      console.error('Failed to start mission:', error);
      showWarning('Mission Failed', error.message || 'Unable to initiate mission. Please try again.');
    }
  };

  const completeMission = async (missionId: string, mission: any) => {
    if (!mission) return;
    
    const endTime = Date.now();
    const completionTimeSeconds = missionStartTime ? Math.floor((endTime - missionStartTime) / 1000) : 300;
    
    // Generate realistic performance metrics
    const baseEfficiency = 70 + Math.random() * 25; // 70-95%
    const stealthRating = mission.type === 'stealth' ? baseEfficiency + Math.random() * 10 : undefined;
    const combatRating = mission.type === 'combat' ? baseEfficiency + Math.random() * 15 : undefined;
    const score = Math.floor((baseEfficiency / 100) * 1000 + Math.random() * 200);
    
    try {
      const result = await completeMissionMutation({
        userWallet: walletAddress,
        missionId: missionId as any,
        score,
        creditsEarned: mission.rewards.credits,
        xpEarned: mission.rewards.xp,
        completionTime: completionTimeSeconds,
        efficiencyRating: Math.floor(baseEfficiency),
        stealthRating: stealthRating ? Math.floor(stealthRating) : undefined,
        combatRating: combatRating ? Math.floor(combatRating) : undefined,
      });
      
      setAscentCredits(prev => prev + result.rewards.credits);
      
      // Enhanced completion message with detailed rewards
      let rewardText = `+${result.rewards.credits} Credits, +${result.rewards.xp} XP`;
      
      if (result.rewards.bonusCredits > 0) {
        rewardText += ` | 🏆 Bonus: +${result.rewards.bonusCredits} Credits, +${result.rewards.bonusXP} XP`;
      }
      
      if (result.rewards.leveledUp) {
        rewardText += ` | 🎉 LEVEL UP! Now Level ${result.rewards.newLevel}!`;
      }
      
      // NFT discovery simulation
      const nftChance = parseFloat(mission.rewards.nftChance?.replace('%', '') || '0') / 100;
      const discoveredNFT = Math.random() < nftChance;
      
      if (discoveredNFT && mission.rewards.specialReward) {
        rewardText += ` | 🎯 NFT DISCOVERED: ${mission.rewards.specialReward}!`;
        showSuccess('Rare Discovery!', `Equipment "${mission.rewards.specialReward}" has been acquired!`);
      }
      
      showSuccess('Mission Complete', 
        `${mission.codename} | Score: ${score} | Efficiency: ${Math.floor(baseEfficiency)}% | ${rewardText}`);
      
    } catch (error: any) {
      console.error('Failed to complete mission:', error);
      showSuccess('Mission Complete', 
        `${mission.codename} | Score: ${score} | Efficiency: ${Math.floor(baseEfficiency)}%`);
    }
    
    setActiveMission(null);
    setMissionProgress(0);
    setMissionStartTime(null);
  };

  useEffect(() => {
    showMission('Simulation Bay Online', 'Mission protocols loaded. Select your operation.');
  }, []);

  return (
    <ToastProvider>
    <div className="h-screen w-full bg-black text-green-400 font-mono relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 z-0">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,197,94,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,197,94,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full opacity-15 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <Navbar ascentCredits={ascentCredits} />

      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-48">
        <div className="grid grid-cols-12 gap-6">
          {/* Header Section */}
          <div className="col-span-12 mb-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-wider mb-2 text-green-400">
                SIMULATION COMMAND CENTER
              </h2>
              <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
              <p className="text-lg text-green-300 opacity-80">
                Virtual Reality Mission Interface • Status: OPERATIONAL
              </p>
            </div>
          </div>

          {/* Mission Overview */}
          <div className="col-span-12 mb-6">
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse" />
                MISSION STATUS OVERVIEW
              </h3>
              <div className="grid grid-cols-5 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {missions.filter(m => m.status === 'available').length}
                  </div>
                  <div className="text-sm text-gray-400">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {missions.filter(m => m.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-400">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    {missions.filter((m: any) => m.status === 'in-progress').length}
                  </div>
                  <div className="text-sm text-gray-400">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400 mb-1">
                    {missions.filter(m => m.status === 'locked').length}
                  </div>
                  <div className="text-sm text-gray-400">Locked</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">92%</div>
                  <div className="text-sm text-gray-400">Success Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Filters */}
          <div className="col-span-12 mb-6">
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {missionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setMissionFilter(type.id)}
                  className={`px-4 py-2 rounded-lg border transition-all duration-300 whitespace-nowrap ${
                    missionFilter === type.id
                      ? 'bg-green-400/20 border-green-400 text-green-400'
                      : 'bg-black/40 border-green-400/30 text-gray-400 hover:border-green-400/60 hover:text-green-300'
                  }`}
                >
                  {type.name} ({type.count})
                </button>
              ))}
              
              <button
                onClick={() => setShowLoadout(!showLoadout)}
                className="ml-auto px-4 py-2 rounded-lg border bg-green-400/20 border-green-400 text-green-400 hover:bg-green-400/30 transition-all duration-300"
              >
                ⚙️ Loadout
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-8">
            {/* Active Mission Monitor */}
            {activeMission && (
              <div className="mb-6 bg-black/60 border border-green-400/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-3 animate-pulse" />
                  MISSION IN PROGRESS
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Active Mission</div>
                    <div className="text-green-400 font-bold">
                      {missions.find(m => m.id === activeMission.id)?.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Codename</div>
                    <div className="text-green-400 font-bold">
                      {missions.find(m => m.id === activeMission.id)?.codename}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Progress</div>
                    <div className="text-green-400 font-bold">{Math.floor(missionProgress)}%</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-300 h-3 rounded-full transition-all duration-200"
                      style={{ width: `${missionProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mission Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredMissions.map((mission) => (
                <div
                  key={mission.id}
                  className={`group relative border rounded-lg p-6 transition-all duration-300 cursor-pointer ${
                    mission.status === 'locked'
                      ? 'bg-black/40 border-red-400/30 hover:border-red-400/60'
                      : mission.status === 'completed'
                      ? 'bg-black/60 border-blue-400/30 hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                      : 'bg-black/60 border-green-400/30 hover:border-green-400/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                  }`}
                  onClick={() => setSelectedMission(selectedMission?.id === mission.id ? null : mission)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl">{getTypeIcon(mission.type)}</div>
                      <div className="flex items-center space-x-2">
                        {mission.firstClearBonus && mission.status !== 'completed' && (
                          <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded border border-yellow-400/30">
                            FIRST CLEAR
                          </div>
                        )}
                        {mission.status === 'completed' && (
                          <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                            COMPLETE
                          </div>
                        )}
                        {mission.status === 'locked' && (
                          <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                            🔒 LOCKED
                          </div>
                        )}
                        <div className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(mission.difficulty)}`}>
                          LEVEL {mission.difficulty}
                        </div>
                      </div>
                    </div>

                    {/* Mission Info */}
                    <h3 className="text-xl font-bold mb-1">{mission.name}</h3>
                    <div className="text-sm text-gray-400 mb-3">{mission.codename}</div>
                    <p className="text-sm text-gray-300 mb-4 line-clamp-2">{mission.description}</p>

                    {/* Requirements */}
                    {mission.requirements && (
                      <div className="mb-4 p-3 bg-black/40 rounded border border-gray-600/30">
                        <div className="text-xs text-gray-400 mb-2">MISSION REQUIREMENTS:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Level:</span>
                            <span className={`font-bold ${
                              playerData && playerData.level >= mission.requirements.level 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              {mission.requirements.level} {playerData && `(${playerData.level})`}
                            </span>
                          </div>
                          {mission.requirements.accuracy && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Accuracy:</span>
                              <span className={`font-bold ${
                                playerData && playerData.accuracy >= mission.requirements.accuracy 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {mission.requirements.accuracy} {playerData && `(${playerData.accuracy})`}
                              </span>
                            </div>
                          )}
                          {mission.requirements.reflex && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Reflex:</span>
                              <span className={`font-bold ${
                                playerData && playerData.reflex >= mission.requirements.reflex 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {mission.requirements.reflex} {playerData && `(${playerData.reflex})`}
                              </span>
                            </div>
                          )}
                          {mission.requirements.cognition && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cognition:</span>
                              <span className={`font-bold ${
                                playerData && playerData.cognition >= mission.requirements.cognition 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                              }`}>
                                {mission.requirements.cognition} {playerData && `(${playerData.cognition})`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                      <div>
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-green-400 ml-2">{mission.duration}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Environment:</span>
                        <span className="text-green-400 ml-2">{mission.environment}</span>
                      </div>
                    </div>

                    {/* Completion Stats */}
                    {mission.status === 'completed' && mission.completionRate && mission.completionRate > 0 && (
                      <div className="mb-4 p-3 bg-blue-400/5 rounded border border-blue-400/20">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Best Efficiency</span>
                          <span className="text-blue-400 font-bold">{mission.completionRate}%</span>
                        </div>
                        {mission.firstClearBonus === false && (
                          <div className="text-xs text-green-400">✓ First Clear Completed</div>
                        )}
                      </div>
                    )}

                    {/* First Clear Bonus */}
                    {mission.firstClearBonus && mission.status !== 'completed' && (
                      <div className="mb-4 p-2 bg-yellow-400/10 rounded border border-yellow-400/30">
                        <div className="text-xs text-yellow-400 font-bold">
                          🏆 FIRST CLEAR BONUS: +50% Rewards
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="mb-4 text-xs">
                      <div className="text-gray-400 mb-1">Rewards:</div>
                      <div className="text-green-400">
                        +{mission.rewards.credits} Credits, +{mission.rewards.xp} XP
                      </div>
                      {mission.rewards.nftChance && (
                        <div className="text-yellow-400">
                          NFT Drop Chance: {mission.rewards.nftChance}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startMission(mission.id);
                      }}
                      disabled={activeMission !== null || !canStartMission(mission)}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
                        !canStartMission(mission)
                          ? 'bg-red-400/20 text-red-400 border border-red-400/30 cursor-not-allowed'
                          : mission.status === 'completed'
                          ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30 hover:bg-blue-400/30'
                          : activeMission
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-green-400/20 text-green-400 border border-green-400/30 hover:bg-green-400/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                      }`}
                    >
                      {!canStartMission(mission) ? 
                        (mission.status === 'locked' ? 'Requirements Not Met' : 'Access Denied') :
                       mission.status === 'completed' ? 'Replay Mission' :
                       activeMission ? 'Mission in Progress...' : 'Deploy to Mission'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Selected Mission Details */}
            {selectedMission && (
              <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  MISSION BRIEFING
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Operation Name</div>
                    <div className="text-green-400 font-bold">{selectedMission.name}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Objectives</div>
                    <ul className="text-xs space-y-1">
                      {selectedMission.objectives.map((obj: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined, idx: Key | null | undefined) => (
                        <li key={idx} className="text-green-300 flex items-start">
                          <span className="text-green-400 mr-2">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedMission.rewards.specialReward && (
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Special Reward</div>
                      <div className="text-yellow-400 text-sm">{selectedMission.rewards.specialReward}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loadout Panel */}
            {showLoadout && (
              <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4">CURRENT LOADOUT</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">Abilities</div>
                    {loadoutItems.filter(item => item.type === 'ability').map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between text-xs p-2 rounded border ${
                          item.equipped 
                            ? `bg-green-400/10 border-green-400/30 ${getRarityColor(item.rarity)}`
                            : 'bg-gray-800/50 border-gray-600/30 text-gray-500'
                        }`}
                      >
                        <span>{item.name}</span>
                        <span className="text-xs opacity-60">{item.rarity.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Stats */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">AGENT STATISTICS</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Missions Completed</span>
                  <span className="text-green-400 font-bold">
                    {missions.filter(m => m.status === 'completed').length}/{missions.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-bold">92.3%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Credits Earned</span>
                  <span className="text-green-400 font-bold">4,750</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Average Mission Time</span>
                  <span className="text-green-400 font-bold">18:45</span>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">RECENT ACHIEVEMENTS</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-yellow-400">Stealth Master</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full" />
                  <span className="text-blue-400">Combat Veteran</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-green-400">Mission Specialist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-black/90 border border-green-400/50 rounded-lg p-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] backdrop-blur-sm animate-in slide-in-from-right-full duration-300"
            style={{ minWidth: '350px' }}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-3 h-3 rounded-full mt-1 animate-pulse ${
                toast.type === 'success' ? 'bg-green-400' :
                toast.type === 'warning' ? 'bg-yellow-400' :
                'bg-blue-400'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${
                  toast.type === 'success' ? 'text-green-400' :
                  toast.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {toast.title}
                </div>
                <div className="text-green-300 text-xs">
                  {toast.message}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full opacity-60 ${
                toast.type === 'success' ? 'bg-green-400' :
                toast.type === 'warning' ? 'bg-yellow-400' :
                'bg-blue-400'
              }`} />
            </div>
            <div className={`mt-2 h-px bg-gradient-to-r from-transparent to-transparent ${
              toast.type === 'success' ? 'via-green-400/50' :
              toast.type === 'warning' ? 'via-yellow-400/50' :
              'via-blue-400/50'
            }`} />
          </div>
        ))}
      </div>
      <ToastContainer />
         </div>
    </ToastProvider>
   );
 }