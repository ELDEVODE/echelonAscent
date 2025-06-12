"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";

interface LeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  level: number;
  ascentCredits: number;
  experiencePoints: number;
  totalMissionsCompleted: number;
  accuracy: number;
  reflex: number;
  cognition: number;
  overallRating: number;
  isCurrentPlayer: boolean;
  rankChange?: number; // +1 for up, -1 for down, 0 for same
}

interface LeaderboardCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  sortField: keyof LeaderboardEntry;
  color: string;
}

export default function Leaderboards() {
  const userContext = useUser();
  const { user } = userContext;
  
  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">Neural Interface Locked</div>
          <div className="text-gray-400">Authentication required to access leaderboards</div>
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
          <div className="text-xl font-bold mb-2">Initializing Neural Network</div>
          <div className="text-gray-400">Connecting to global ranking system...</div>
          <div className="mt-4 w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const walletAddress = userContext.solana.address;

  // Get real data from backend
  const playerData = useQuery(api.myFunctions.getAugmenteeProfile, {
    userWallet: walletAddress
  });
  const leaderboardsDataQuery = useQuery(api.myFunctions.getLeaderboards);
  const leaderboardsData = leaderboardsDataQuery || [];

  const [activeCategory, setActiveCategory] = useState('overall');
  const [viewMode, setViewMode] = useState<'global' | 'friends' | 'academy'>('global');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Define leaderboard categories
  const categories: LeaderboardCategory[] = [
    {
      id: 'overall',
      name: 'Overall Ranking',
      icon: '👑',
      description: 'Combined performance across all metrics',
      sortField: 'overallRating',
      color: 'text-yellow-400'
    },
    {
      id: 'level',
      name: 'Level Rankings',
      icon: '⭐',
      description: 'Agent progression and experience',
      sortField: 'level',
      color: 'text-green-400'
    },
    {
      id: 'missions',
      name: 'Mission Masters',
      icon: '🎯',
      description: 'Mission completion excellence',
      sortField: 'totalMissionsCompleted',
      color: 'text-blue-400'
    },
    {
      id: 'credits',
      name: 'Credit Leaders',
      icon: '💰',
      description: 'Ascent credits accumulated',
      sortField: 'ascentCredits',
      color: 'text-green-400'
    },
    {
      id: 'accuracy',
      name: 'Precision Elite',
      icon: '🎯',
      description: 'Targeting accuracy specialists',
      sortField: 'accuracy',
      color: 'text-red-400'
    },
    {
      id: 'reflex',
      name: 'Reflex Champions',
      icon: '⚡',
      description: 'Neural response time leaders',
      sortField: 'reflex',
      color: 'text-blue-400'
    },
    {
      id: 'cognition',
      name: 'Cognitive Masters',
      icon: '🧠',
      description: 'Advanced processing elite',
      sortField: 'cognition',
      color: 'text-purple-400'
    }
  ];

  // Transform leaderboard data
  const processLeaderboardData = (category: LeaderboardCategory): LeaderboardEntry[] => {
    if (!leaderboardsData || !Array.isArray(leaderboardsData) || leaderboardsData.length === 0) {
      // Return empty array if no real data available - no more sample data
      return [];
    }

    const sortedData: LeaderboardEntry[] = [...leaderboardsData]
      .map((player: any) => ({
        id: player._id || 'unknown',
        displayName: player.displayName ?? 'Anonymous Agent',
        level: player.level || 1,
        ascentCredits: player.ascentCredits || 0,
        experiencePoints: player.experiencePoints || 0,
        totalMissionsCompleted: player.totalMissionsCompleted || 0,
        accuracy: player.accuracy || 1,
        reflex: player.reflex || 1,
        cognition: player.cognition || 1,
        overallRating: Math.floor(((player.accuracy || 1) + (player.reflex || 1) + (player.cognition || 1)) / 3 * 10),
        isCurrentPlayer: playerData?._id === player._id,
        rankChange: player.rankChange || 0, // Real rank change from backend
        rank: 0
      }))
      .sort((a, b) => {
        // Safe access to the sort field
        const aVal = a[category.sortField] as number || 0;
        const bVal = b[category.sortField] as number || 0;
        return bVal - aVal;
      })
      .map((player, index) => ({ ...player, rank: index + 1 }));

    return sortedData;
  };



  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];
  const leaderboardEntries = processLeaderboardData(currentCategory);
  const currentPlayerEntry = leaderboardEntries.find(entry => entry.isCurrentPlayer);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🔸';
    }
  };

  const getRankChangeIcon = (change?: number) => {
    if (change === undefined) return '';
    if (change > 0) return '📈';
    if (change < 0) return '📉';
    return '➖';
  };

  const getRankChangeColor = (change?: number) => {
    if (change === undefined) return 'text-gray-400';
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatValue = (value: number, field: keyof LeaderboardEntry) => {
    switch (field) {
      case 'ascentCredits':
        return value.toLocaleString();
      case 'experiencePoints':
        return value.toLocaleString();
      case 'overallRating':
        return `${value}/100`;
      default:
        return value.toString();
    }
  };

  return (
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
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Competition Particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${5 + Math.random() * 8}s`
            }}
          />
        ))}
      </div>

      {/* Competitive Scanning Lines */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-pulse" 
             style={{ top: '25%', animationDuration: '3s' }} />
        <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-pulse" 
             style={{ top: '75%', animationDuration: '4s', animationDelay: '1s' }} />
      </div>

      <Navbar ascentCredits={playerData?.ascentCredits || 0} />

      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-42">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Enhanced Header */}
        <div className="text-center mb-8">
            <h2 className="text-5xl font-bold tracking-wider mb-4 text-green-400">
            ECHELON LEADERBOARDS
          </h2>
          <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
            <p className="text-xl text-green-300 opacity-90">
              Global Academy Rankings • Elite Performance Metrics • Neural Supremacy
          </p>
        </div>

          {/* Current Player Quick Stats */}
          {currentPlayerEntry && (
            <div className="bg-black/70 border border-green-400/40 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-4xl">{getRankIcon(currentPlayerEntry.rank)}</div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-400">Your Ranking</h3>
                    <p className="text-gray-400">Neural ID: {user.id.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-green-400">#{currentPlayerEntry.rank}</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{currentCategory.name}</span>
                    <span className={getRankChangeColor(currentPlayerEntry.rankChange)}>
                      {getRankChangeIcon(currentPlayerEntry.rankChange)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Mode Selector */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-2">
            <div className="flex space-x-2">
              {[
                { id: 'global', label: 'Global Rankings', icon: '🌍' },
                { id: 'academy', label: 'Academy Elites', icon: '🏛️' },
                { id: 'friends', label: 'Neural Network', icon: '👥' }
              ].map((mode) => (
              <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all duration-300 ${
                    viewMode === mode.id
                    ? 'bg-green-400/20 text-green-400 border border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                      : 'text-gray-400 hover:text-green-300 hover:bg-green-400/10'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>{mode.icon}</span>
                    <span>{mode.label}</span>
                  </div>
              </button>
            ))}
          </div>
        </div>

          {/* Category Tabs */}
          <div className="bg-black/50 border border-green-400/30 rounded-lg p-2">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-3 py-4 rounded-lg font-bold transition-all duration-300 text-center ${
                    activeCategory === category.id
                      ? `bg-black/60 ${category.color} border border-current/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]`
                      : 'text-gray-400 hover:text-green-300 hover:bg-green-400/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-sm font-bold">{category.name}</div>
                  <div className="text-xs opacity-60 mt-1">{category.description}</div>
                </button>
              ))}
            </div>
        </div>

        {/* Leaderboard Table */}
          <div className="bg-black/60 border border-green-400/30 rounded-lg overflow-hidden">
            <div className="bg-black/80 border-b border-green-400/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-2xl font-bold ${currentCategory.color}`}>
                  {currentCategory.icon} {currentCategory.name}
                </h3>
                <div className="text-sm text-gray-400">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/40 border-b border-green-400/20">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-gray-400 font-bold">Rank</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Agent</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Level</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Score</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Missions</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Rating</th>
                    <th className="px-6 py-4 text-gray-400 font-bold">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardEntries.slice(0, 50).map((entry, index) => (
                    <tr 
                      key={entry.id}
                      className={`border-b border-green-400/10 transition-all duration-200 ${
                        entry.isCurrentPlayer 
                          ? 'bg-green-400/10 border-green-400/30' 
                          : 'hover:bg-green-400/5'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{getRankIcon(entry.rank)}</div>
                          <div className={`text-xl font-bold ${
                            entry.rank <= 3 ? 'text-green-400' : 'text-green-400'
                          }`}>
                            #{entry.rank}
                      </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                            entry.isCurrentPlayer ? 'border-green-400 bg-green-400/20' : 'border-green-400 bg-green-400/20'
                          }`}>
                            <span className="font-bold">
                              {entry.displayName.charAt(0).toUpperCase()}
                            </span>
                    </div>
                          <div>
                            <div className={`font-bold ${entry.isCurrentPlayer ? 'text-green-400' : 'text-green-400'}`}>
                              {entry.displayName}
                              {entry.isCurrentPlayer && <span className="text-xs ml-2">(You)</span>}
                      </div>
                            <div className="text-xs text-gray-400">Neural Agent</div>
                      </div>
                    </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-blue-400 font-bold">{entry.level}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${currentCategory.color}`}>
                          {formatValue(entry[currentCategory.sortField] as number, currentCategory.sortField)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-purple-400 font-bold">{entry.totalMissionsCompleted}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-bold">{entry.overallRating}/100</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xl ${getRankChangeColor(entry.rankChange)}`}>
                          {getRankChangeIcon(entry.rankChange)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Empty State */}
              {leaderboardEntries.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <div className="text-xl font-bold mb-2 text-green-400">Loading Neural Rankings</div>
                  <div className="text-gray-400">
                    {leaderboardsDataQuery === undefined ? 
                      'Connecting to academy database...' : 
                      'No players found. Be the first to join the academy!'
                    }
                      </div>
                    </div>
              )}
                      </div>
                    </div>

          {/* Achievement Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
              <h4 className="text-lg font-bold text-green-400 mb-4">🏆 Top Performer</h4>
              {leaderboardEntries[0] && (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-400/20 border border-green-400/40 rounded-full flex items-center justify-center">
                    <span className="text-green-400 font-bold">
                      {leaderboardEntries[0].displayName.charAt(0)}
                    </span>
                      </div>
                  <div>
                    <div className="font-bold text-green-400">{leaderboardEntries[0].displayName}</div>
                    <div className="text-sm text-gray-400">
                      {formatValue(leaderboardEntries[0][currentCategory.sortField] as number, currentCategory.sortField)} {currentCategory.name.toLowerCase()}
                    </div>
                  </div>
                </div>
              )}
          </div>

            <div className="bg-black/60 border border-green-400/30 rounded-lg p-6">
              <h4 className="text-lg font-bold text-green-400 mb-4">📈 Rising Star</h4>
              {leaderboardEntries.find(e => e.rankChange && e.rankChange > 0) && (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-400/20 border border-green-400/40 rounded-full flex items-center justify-center">
                    <span className="text-green-400 text-xl">📈</span>
                </div>
                  <div>
                    <div className="font-bold text-green-400">
                      {leaderboardEntries.find(e => e.rankChange && e.rankChange > 0)?.displayName}
                </div>
                    <div className="text-sm text-gray-400">Climbing the ranks rapidly</div>
              </div>
                </div>
              )}
                </div>

            <div className="bg-black/60 border border-blue-400/30 rounded-lg p-6">
              <h4 className="text-lg font-bold text-blue-400 mb-4">⚡ Most Active</h4>
              {leaderboardEntries.sort((a, b) => b.totalMissionsCompleted - a.totalMissionsCompleted)[0] && (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-400/20 border border-blue-400/40 rounded-full flex items-center justify-center">
                    <span className="text-blue-400 text-xl">⚡</span>
              </div>
                  <div>
                    <div className="font-bold text-blue-400">
                      {leaderboardEntries.sort((a, b) => b.totalMissionsCompleted - a.totalMissionsCompleted)[0].displayName}
                </div>
                    <div className="text-sm text-gray-400">
                      {leaderboardEntries.sort((a, b) => b.totalMissionsCompleted - a.totalMissionsCompleted)[0].totalMissionsCompleted} missions completed
                </div>
              </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}