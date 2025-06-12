import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import Navbar from "./Navbar";
import { UserButton, useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: 'mission' | 'training' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
}

// Enhanced toast hook with visual notifications
const useToast = () => {
  const [toasts, setToasts] = useState<Array<{id: string, title: string, message: string, type: string}>>([]);

  const mission = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'mission' };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  return { mission, toasts };
};

export default function Dashboard() {
  // Get Civic user data
  const userContext = useUser();
  const { user } = userContext;
  console.log("user", user)
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [isLoaded, setIsLoaded] = useState(false);
  const [welcomeShown, setWelcomeShown] = useState(false);
  const { mission: showMissionToast, toasts } = useToast();

  // Mutations for user initialization
  const initializeUser = useMutation(api.myFunctions.getCurrentAugmentee);

  // Get wallet address from Solana wallet (use "skip" for conditional queries)
  const walletAddress = userHasWallet(userContext) ? userContext.solana.address : null;

  // Convex queries for real data (use "skip" when no wallet)
  const currentPlayer = useQuery(api.myFunctions.getAugmenteeProfile, 
    walletAddress ? { userWallet: walletAddress } : "skip"
  );
  const availableMissions = useQuery(api.myFunctions.getDashboardMissions);
  const playerStats = useQuery(api.myFunctions.getPlayerStats);
  const recentActivity = useQuery(api.myFunctions.getRecentActivity);

  // Initialize user data only once
  useEffect(() => {
    if (walletAddress && user?.name && !isLoaded) {
      initializeUser({ 
        userWallet: walletAddress, 
        userName: user.name 
      }).catch(console.error);
      setIsLoaded(true);
    }
  }, [walletAddress, user?.name, isLoaded, initializeUser]);

  // Show welcome message only once when player data loads
  useEffect(() => {
    if (!welcomeShown && (currentPlayer || (isLoaded && !currentPlayer))) {
      const welcomeTimer = setTimeout(() => {
        if (currentPlayer) {
          showMissionToast('Academy Online', `Welcome back, ${currentPlayer.displayName}. All systems operational.`);
        } else {
          showMissionToast('Academy Online', 'All systems operational. Neural link establishing...');
        }
        setWelcomeShown(true);
      }, 1500);

      return () => {
        clearTimeout(welcomeTimer);
      };
    }
  }, [currentPlayer, isLoaded, welcomeShown, showMissionToast]);
  
  // NOW we can do conditional returns after all hooks are called
  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">User not logged in</div>
          <div className="text-gray-400">Please authenticate to access the academy</div>
          <Link href="/login" className="block mt-4 px-6 py-2 bg-green-400/20 text-green-400 border border-green-400/40 rounded-lg hover:bg-green-400/30 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has a wallet, if not create one
  if (!userHasWallet(userContext)) {
    // Create wallet if not in progress
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

  // Hook variables are already declared above before conditional returns

  // Static fallback activity for demo
  const staticActivity: ActivityItem[] = [
    { id: '1', type: 'mission', title: 'Stealth Infiltration', description: 'Completed with 94% efficiency', timestamp: '2 hours ago' },
    { id: '2', type: 'training', title: 'Precision Aiming', description: 'Personal best: 847 points', timestamp: '4 hours ago' },
    { id: '3', type: 'achievement', title: 'Neural Sync Master', description: 'Achieved perfect synchronization', timestamp: '1 day ago' }
  ];

  // Use real data or fallback to demo data with Civic user name
  const playerData = currentPlayer || {
    displayName: user?.name || "RECRUIT_USER",
    level: 1,
    ascentCredits: 2847,
    totalMissionsCompleted: 0,
    accuracy: 0,
    reflex: 0,
    cognition: 0
  };

  const missionsData = availableMissions || [];
  const activityData = recentActivity || staticActivity;

  return (
    <div className="h-screen w-full bg-black text-green-400 font-mono relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
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
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full opacity-30 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      {/* Header Navigation */}
      <Navbar ascentCredits={playerData.ascentCredits} />


      {/* Main Content */}
      <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-28">
        <div className="grid grid-cols-12 gap-6">
          {/* Welcome Section */}
          <div className="col-span-12 mb-4">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-wider mb-2 text-green-400">
                WELCOME TO ECHELON ACADEMY
              </h2>
              <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
              <p className="text-lg text-green-300 opacity-80">
                Elite training facility for superhuman augmentation • Agent: {playerData.displayName} • Level {playerData.level}
              </p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="col-span-8">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3 animate-pulse" />
                ACADEMY SECTORS
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Training Drills Sector */}
              <Link href="/training">
              <div className="group relative bg-black/60 border border-green-400/30 rounded-lg p-6 hover:border-green-400/60 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-green-400/20 rounded-lg flex items-center justify-center group-hover:bg-green-400/30 transition-colors duration-300">
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-xs text-green-300 bg-green-400/10 px-2 py-1 rounded">
                      ACTIVE
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Training Drills</h3>
                  <p className="text-sm text-gray-400 flex-1">
                    Hone your augmented abilities through precision exercises and reflex training.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-400/20">
                    <div className="flex justify-between text-xs text-green-300">
                        <span>Accuracy Level</span>
                        <span className="font-bold">{playerData.accuracy}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Simulation Missions Sector */}
              <Link href="/simulation">
              <div className="group relative bg-black/60 border border-green-400/30 rounded-lg p-6 hover:border-green-400/60 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-green-400/20 rounded-lg flex items-center justify-center group-hover:bg-green-400/30 transition-colors duration-300">
                      <div className="w-8 h-8 border-2 border-green-400 rounded-lg relative">
                        <div className="absolute inset-1 bg-green-400 rounded-sm animate-pulse opacity-60" />
                      </div>
                    </div>
                    <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                        {missionsData.length > 0 ? 'NEW MISSION' : 'READY'}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Simulation Missions</h3>
                  <p className="text-sm text-gray-400 flex-1">
                    Test your skills in immersive virtual environments with real consequences.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-400/20">
                    <div className="flex justify-between text-xs text-green-300">
                      <span>Available Missions</span>
                        <span className="font-bold">{missionsData.length} Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Tech Lab Sector */}
              <Link href="/techlab">
              <div className="group relative bg-black/60 border border-green-400/30 rounded-lg p-6 hover:border-green-400/60 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-green-400/20 rounded-lg flex items-center justify-center group-hover:bg-green-400/30 transition-colors duration-300">
                      <div className="grid grid-cols-2 gap-1">
                        <div className="w-3 h-3 bg-green-400 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400/60 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400/60 rounded-sm" />
                        <div className="w-3 h-3 bg-green-400 rounded-sm" />
                      </div>
                    </div>
                    <div className="text-xs text-green-300 bg-green-400/10 px-2 py-1 rounded">
                      RESEARCH
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Tech Lab</h3>
                  <p className="text-sm text-gray-400 flex-1">
                    Upgrade your augmentations and craft advanced Chrono-Tech gadgets.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-400/20">
                    <div className="flex justify-between text-xs text-green-300">
                        <span>Augmentation Level</span>
                        <span className="font-bold">Level {playerData.level}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Marketplace Sector */}
              <Link href="/marketplace">
              <div className="group relative bg-black/60 border border-green-400/30 rounded-lg p-6 hover:border-green-400/60 transition-all duration-300 cursor-pointer hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/5 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-green-400/20 rounded-lg flex items-center justify-center group-hover:bg-green-400/30 transition-colors duration-300">
                      <div className="w-8 h-8 relative">
                        <div className="absolute inset-0 border border-green-400 rounded-full" />
                        <div className="absolute inset-2 bg-green-400 rounded-full animate-pulse" />
                      </div>
                    </div>
                    <div className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                      TRADING
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Marketplace</h3>
                  <p className="text-sm text-gray-400 flex-1">
                    Acquire rare schematics and trade augmentation modules with other agents.
                  </p>
                  <div className="mt-4 pt-4 border-t border-green-400/20">
                    <div className="flex justify-between text-xs text-green-300">
                        <span>Credits Available</span>
                        <span className="font-bold">{playerData.ascentCredits.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Sidebar - Recent Activity & Stats */}
          <div className="col-span-4 space-y-6 pb-10">
            {/* System Status */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                SYSTEM STATUS
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Academy Network</span>
                  <span className="text-green-400 font-bold">ONLINE</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Neural Link</span>
                  <span className="text-green-400 font-bold">STABLE</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Augmentation Level</span>
                  <span className="text-green-400 font-bold">LEVEL {playerData.level}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Mission Clearance</span>
                  <span className="text-yellow-400 font-bold">
                    {playerData.level >= 10 ? 'ELITE' : playerData.level >= 5 ? 'SPECIALIST' : 'ROOKIE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">RECENT ACTIVITY</h3>
              <div className="space-y-3">
                {activityData.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'mission' ? 'bg-blue-400' :
                      activity.type === 'training' ? 'bg-green-400' :
                      'bg-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <div className="text-green-300 font-medium">{activity.title}</div>
                      <div className="text-gray-400 text-xs">{activity.description}</div>
                      <div className="text-gray-500 text-xs mt-1">{activity.timestamp}</div>
                    </div>
                  </div>
                ))}
                {activityData.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No recent activity. Start training to see your progress here.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold mb-4">PERFORMANCE METRICS</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Missions Completed</span>
                  <span className="text-green-400 font-bold">{playerData.totalMissionsCompleted}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Accuracy Rating</span>
                  <span className="text-green-400 font-bold">{playerData.accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Reflex Score</span>
                  <span className="text-green-400 font-bold">{playerData.reflex}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cognition Level</span>
                  <span className="text-green-400 font-bold">{playerData.cognition}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/60 border border-green-400/30 rounded-lg p-4">
              <h3 className="text-lg font-bold mb-4">QUICK ACTIONS</h3>
              <div className="space-y-2">
                <Link href="/augmentee">
                  <button className="w-full bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 py-2 px-4 font-mono text-sm transition-all duration-200">
                    [VIEW] AUGMENTEE_PROFILE
                  </button>
                </Link>
                <Link href="/leaderboards">
                  <button className="w-full bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 py-2 px-4 font-mono text-sm transition-all duration-200">
                    [VIEW] GLOBAL_RANKINGS
                  </button>
                </Link>
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
              style={{ minWidth: '300px' }}
            >
              <div className="flex items-start space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full mt-1 animate-pulse" />
                <div className="flex-1">
                  <div className="text-green-400 font-bold text-sm mb-1">
                    {toast.title}
                  </div>
                  <div className="text-green-300 text-xs">
                    {toast.message}
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-400/60 rounded-full" />
              </div>
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent" />
            </div>
          ))}
        </div>
      </div>
    );
  }