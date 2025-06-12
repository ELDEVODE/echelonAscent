"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ToastProvider } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";
import TrainingGameModal from "@/components/games/TrainingGameModal";

// Toast hook
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{id: string, title: string, message: string, type: string}>>([]);

  const success = useCallback((title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'success' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  const training = useCallback((title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'training' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  }, []);

  return { success, training, toasts };
};

export default function Training() {
  // Get Civic user data
  const userContext = useUser();
  const { user } = userContext;
  
  // Get wallet address (or null if not available)
  const walletAddress = userContext && 'solana' in userContext ? userContext.solana?.address || null : null;
  
  // Always call hooks in the same order - use "skip" for conditional queries
  const playerData = useQuery(api.myFunctions.getAugmenteeProfile, 
    walletAddress ? { userWallet: walletAddress } : "skip"
  );
  const trainingDrills = useQuery(api.myFunctions.getTrainingDrills) || [];
  const trainingHistory = useQuery(api.myFunctions.getPlayerTrainingHistory, 
    walletAddress ? { userWallet: walletAddress } : "skip"
  ) || [];
  const submitTraining = useMutation(api.myFunctions.submitTrainingResult);

  // Training game mutations
  const startGameSession = useMutation(api.trainingGames.startGameSession);
  const completeGameSession = useMutation(api.trainingGames.completeGameSession);

  // All useState hooks must be called before any conditional returns
  const [ascentCredits, setAscentCredits] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<any>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  
  // Custom hooks must also be called before conditional returns
  const { success: showSuccess, training: showTraining, toasts } = useToast();

  // All useEffect hooks must be called before conditional returns
  useEffect(() => {
    if (playerData) {
      setAscentCredits(playerData.ascentCredits);
    }
  }, [playerData]);

  // Show initial training message when component mounts
  useEffect(() => {
    showTraining('Training Bay Online', 'All systems ready. Select your training protocol.');
  }, []); // Empty dependency array to run only once

  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">User not logged in</div>
          <div className="text-gray-400">Please authenticate to access training</div>
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

  // Convert training history to recent sessions format (empty for now)
  const recentSessions: Array<{
    id: string;
    drillId: string;
    score: number;
    efficiency: number;
    timestamp: string;
    creditsEarned: number;
    xpEarned: number;
  }> = [];

  const categories = [
    { id: 'all', name: 'All Drills', count: trainingDrills.length },
    { id: 'reflex', name: 'Reflex Training', count: trainingDrills.filter(d => d.category === 'reflex').length },
    { id: 'accuracy', name: 'Accuracy Training', count: trainingDrills.filter(d => d.category === 'accuracy').length },
    { id: 'cognition', name: 'Cognitive Enhancement', count: trainingDrills.filter(d => d.category === 'cognition').length },
    { id: 'endurance', name: 'Endurance Protocols', count: trainingDrills.filter(d => d.category === 'endurance').length }
  ];

  const filteredDrills = selectedCategory === 'all' 
    ? trainingDrills 
    : trainingDrills.filter(drill => drill.category === selectedCategory);

  // Calculate daily progress from existing trainingHistory  
  const completedToday = trainingHistory?.filter((session: any) => {
    const today = new Date().toDateString();
    const sessionDate = new Date(session.completedAt).toDateString();
    return today === sessionDate;
  }).length || 0;
  
  const totalDrills = trainingDrills.length;
  const dailyProgress = totalDrills ? (completedToday / totalDrills) * 100 : 0;

  const startTrainingSession = async (drillId: string) => {
    const drill = trainingDrills.find(d => d.id === drillId);
    if (!drill) return;
    
    // For cognition, reflex, accuracy, and endurance drills, start a game session and open the game modal
    if (drill.category === 'cognition' || drill.category === 'reflex' || drill.category === 'accuracy' || drill.category === 'endurance') {
      try {
        let gameType = 'pattern_matrix';
        if (drill.category === 'cognition') gameType = 'pattern_matrix';
        else if (drill.category === 'reflex') gameType = 'reaction_grid';
        else if (drill.category === 'accuracy') gameType = 'precision_target';
        else if (drill.category === 'endurance') gameType = 'stamina_rush';
        const sessionId = await startGameSession({
          playerWallet: walletAddress!,
          drillId: drill.id,
          gameType: gameType,
        });
        setGameSessionId(sessionId);
        setSelectedDrill(drill);
        setIsGameModalOpen(true);
      } catch (error) {
        console.error('Failed to start game session:', error);
        showTraining('Error', 'Failed to initialize training session');
      }
      return;
    }
    
    // For other categories, use the old simulation system for now
    setActiveSession(drillId);
    setIsSessionActive(true);
    setSessionProgress(0);
    
    showTraining('Training Initiated', 'Neural interface synchronized. Begin when ready.');
    
    // Simulate training progress
    const progressInterval = setInterval(() => {
      setSessionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          completeSession(drillId);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 200);
  };

  const handleGameComplete = async (score: number, performance: any) => {
    if (!selectedDrill || !walletAddress || !gameSessionId) return;
    
    try {
      // Complete the game session using the new training games system
      const result = await completeGameSession({
        sessionId: gameSessionId as any, // Convert string to proper ID type
        finalScore: score,
        performance: {
          accuracy: performance.accuracy,
          reactionTime: performance.reactionTime,
          level: performance.level,
          perfectRounds: performance.perfectRounds || performance.perfectHits || 0,
          totalRounds: performance.totalRounds || performance.totalTargets || 0,
        },
      });
      
      // Update local state (this will be synced from backend automatically)
      setAscentCredits(prev => prev + (result.creditsEarned || 0));
      
      showSuccess('Training Complete', 
        `Score: ${score} | Accuracy: ${Math.round(performance.accuracy)}% | +${result.creditsEarned} Credits | +${result.xpEarned} XP`);
    } catch (error) {
      console.error('Training submission failed:', error);
      const estimatedCredits = selectedDrill.rewards?.credits || 50;
      showSuccess('Training Complete', 
        `Score: ${score} | Accuracy: ${Math.round(performance.accuracy)}% | +${estimatedCredits} Credits (offline mode)`);
    }
    
    // Close modal and reset session
    setIsGameModalOpen(false);
    setSelectedDrill(null);
    setGameSessionId(null);
  };

  const closeGameModal = () => {
    setIsGameModalOpen(false);
    setSelectedDrill(null);
    setGameSessionId(null);
  };

  const completeSession = async (drillId: string) => {
    const drill = trainingDrills.find(d => d.id === drillId);
    if (drill) {
      const score = Math.floor(Math.random() * 300) + 700;
      const efficiency = Math.floor(Math.random() * 30) + 70;
      
      try {
        // Submit to backend
        await submitTraining({
          userWallet: walletAddress!,
          drillId,
          score,
          duration: drill.duration || 120, // duration in seconds
        });
        
        const estimatedCredits = drill.rewards?.credits || 50;
        setAscentCredits(prev => prev + estimatedCredits);
      
      showSuccess('Training Complete', 
          `Score: ${score} | Efficiency: ${efficiency}% | +${estimatedCredits} Credits`);
      } catch (error) {
        console.error('Training submission failed:', error);
        const estimatedCredits = drill.rewards?.credits || 50;
        showSuccess('Training Complete', 
          `Score: ${score} | Efficiency: ${efficiency}% | +${estimatedCredits} Credits`);
      }
    }
    
    setIsSessionActive(false);
    setActiveSession(null);
    setSessionProgress(0);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-400 border-green-400/30';
    if (difficulty <= 3) return 'text-yellow-400 border-yellow-400/30';
    return 'text-red-400 border-red-400/30';
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'all': return '⚡';
      case 'reflex': return '🏃';
      case 'accuracy': return '🎯';
      case 'cognition': return '🧠';
      case 'endurance': return '💪';
      default: return '⚙️';
    }
  };

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

      <Navbar ascentCredits={ascentCredits} />

      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-48">
        <div className="grid grid-cols-12 gap-6">
          {/* Header Section */}
          <div className="col-span-12 mb-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-wider mb-2 text-green-400">
                TRAINING BAY ALPHA
              </h2>
              <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
              <p className="text-lg text-green-300 opacity-80">
                Augmentee Neural Enhancement Facility • Status: OPERATIONAL
              </p>
            </div>
          </div>

          {/* Training Drills Grid */}
          <div className="col-span-8">
            <div className="grid grid-cols-2 gap-4">
              {filteredDrills.map((drill) => (
                <div
                  key={drill.id}
                  className="group relative bg-black/60 border border-green-400/30 rounded-lg p-6 hover:border-green-400/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl">{drill.icon}</div>
                      <div className="flex items-center space-x-2">
                        <div className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(drill.difficulty)}`}>
                          LEVEL {drill.difficulty}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-2">{drill.name}</h3>
                    <p className="text-sm text-gray-400 mb-4">{drill.description}</p>

                    {/* Rewards */}
                    <div className="mb-4 flex justify-between text-xs text-gray-400">
                      <span>Rewards:</span>
                        <span className="text-green-400">+{drill.rewards?.credits || 50} Credits, +{drill.rewards?.xp || 25} XP</span>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => startTrainingSession(drill.id)}
                      disabled={isSessionActive}
                      className={`w-full py-3 rounded-lg font-bold transition-all duration-300 ${
                          isSessionActive
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-green-400/20 text-green-400 border border-green-400/30 hover:bg-green-400/30 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                      }`}
                    >
                        {isSessionActive ? 'Training in Progress...' : 'Begin Training'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Active Session */}
            {isSessionActive && activeSession && (
              <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  ACTIVE SESSION
                </h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <div className="text-gray-400 mb-1">Current Drill</div>
                    <div className="text-green-400 font-bold">
                      {trainingDrills.find(d => d.id === activeSession)?.name}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-green-400">{Math.floor(sessionProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-300 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${sessionProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">RECENT SESSIONS</h3>
              <div className="space-y-3">
                  {recentSessions.length > 0 ? recentSessions.map((session) => {
                  const drill = trainingDrills.find(d => d.id === session.drillId);
                  return (
                    <div key={session.id} className="border-l-2 border-green-400/30 pl-3">
                      <div className="text-sm font-bold text-green-300">
                          {drill?.name || session.drillId}
                      </div>
                      <div className="text-xs text-gray-400 mb-1">
                        Score: {session.score} • Efficiency: {session.efficiency}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.timestamp} • +{session.creditsEarned} Credits
                      </div>
                    </div>
                  );
                  }) : (
                    <div className="text-sm text-gray-400 text-center py-4">
                      No recent training sessions
                    </div>
                  )}
              </div>
            </div>

            {/* Training Statistics */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">TRAINING STATS</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Sessions</span>
                    <span className="text-green-400 font-bold">{trainingHistory.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Credits Earned</span>
                    <span className="text-green-400 font-bold">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Experience Points</span>
                    <span className="text-green-400 font-bold">0</span>
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
            className={`bg-black/90 border rounded-lg p-4 backdrop-blur-sm animate-in slide-in-from-right-full duration-300 ${
              toast.type === 'success' 
                ? 'border-green-400/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                : 'border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            }`}
            style={{ minWidth: '300px' }}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-3 h-3 rounded-full mt-1 animate-pulse ${
                toast.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${
                  toast.type === 'success' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {toast.title}
                </div>
                <div className="text-green-300 text-xs">
                  {toast.message}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                toast.type === 'success' ? 'bg-green-400/60' : 'bg-blue-400/60'
              }`} />
            </div>
            <div className={`mt-2 h-px bg-gradient-to-r from-transparent to-transparent ${
              toast.type === 'success' ? 'via-green-400/50' : 'via-blue-400/50'
            }`} />
          </div>
        ))}
      </div>
        <ToastContainer />

      {/* Training Game Modal */}
      {selectedDrill && (
        <TrainingGameModal
          isOpen={isGameModalOpen}
          onClose={closeGameModal}
          drill={selectedDrill}
          onGameComplete={handleGameComplete}
        />
      )}
    </div>
    </ToastProvider>
  );
}