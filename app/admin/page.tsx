"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

interface AdminUser {
  _id: Id<"admins">;
  email: string;
  name: string;
  role: "super_admin" | "game_master" | "content_manager";
  permissions: string[];
  isActive?: boolean;
}

interface AdminAction {
  _id: Id<"adminActions">;
  adminId: Id<"admins">;
  actionType: string;
  description: string;
  timestamp: number;
}

interface Player {
  _id: Id<"augmentees">;
  walletAddress: string;
  displayName: string;
  level: number;
  experiencePoints: number;
  ascentCredits: number;
  accuracy: number;
  reflex: number;
  cognition: number;
  totalMissionsCompleted: number;
  reputationTechLab: number;
  reputationSecurityWing: number;
  reputationCommandCenter: number;
  ascensionLevel: number;
  ascensionPoints: number;
  lastLoginTime: number;
  dailyTrainingCompleted: boolean;
  isBanned?: boolean;
  banReason?: string;
  adminNotes?: string;
  _creationTime: number;
}

interface Mission {
  _id: Id<"missions">;
  title: string;
  description: string;
  difficulty: "rookie" | "specialist" | "elite";
  missionType: "stealth" | "combat" | "hacking" | "rescue";
  minimumLevel: number;
  requiredAccuracy?: number;
  requiredReflex?: number;
  requiredCognition?: number;
  baseCredits: number;
  baseExperience: number;
  techLabReputation: number;
  securityWingReputation: number;
  commandCenterReputation: number;
  lootTable: Array<{
    itemType: string;
    rarity: "common" | "rare" | "epic" | "legendary";
    dropChance: number;
  }>;
  isActive: boolean;
  isStoryMission: boolean;
  isGuildMission: boolean;
  firstClearReward?: string;
  createdBy?: Id<"admins">;
  lastModifiedBy?: Id<"admins">;
  _creationTime: number;
}

export default function AdminDashboard() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "missions" | "players" | "analytics" | "content" | "economy" | "system" | "settings">("overview");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Modal states
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showEconomyModal, setShowEconomyModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Content management states
  const [contentType, setContentType] = useState<"training_drill" | "marketplace_item" | "upgrade_item">("training_drill");
  const [trainingDrillForm, setTrainingDrillForm] = useState({
    name: "",
    category: "cognition" as "cognition" | "reflex" | "accuracy" | "endurance",
    difficulty: 1,
    duration: 120,
    description: "",
    icon: "🧠",
    credits: 50,
    xp: 25,
    level: 1,
  });

  const [marketplaceItemForm, setMarketplaceItemForm] = useState({
    name: "",
    category: "",
    price: 100,
    rarity: "common" as "common" | "rare" | "epic" | "legendary",
    description: "",
    icon: "🔹",
    inStock: 10,
  });

  // Economy management states
  const [economyAction, setEconomyAction] = useState<"adjust_credits" | "adjust_materials" | "market_adjustment">("adjust_credits");
  const [bulkCreditForm, setBulkCreditForm] = useState({
    targetType: "all" as "all" | "level_range" | "specific_players",
    minLevel: 1,
    maxLevel: 100,
    creditAdjustment: 0,
    reason: "",
    playerIds: [] as string[],
  });

  // System monitoring states - using query instead of state

  // Form states
  const [missionForm, setMissionForm] = useState({
    title: "",
    description: "",
    difficulty: "rookie" as "rookie" | "specialist" | "elite",
    missionType: "combat" as "stealth" | "combat" | "hacking" | "rescue",
    minimumLevel: 1,
    requiredAccuracy: 0,
    requiredReflex: 0,
    requiredCognition: 0,
    baseCredits: 100,
    baseExperience: 50,
    techLabReputation: 0,
    securityWingReputation: 0,
    commandCenterReputation: 0,
    isStoryMission: false,
  });

  const [playerModerationForm, setPlayerModerationForm] = useState({
    action: "ban" as "ban" | "unban",
    reason: "",
    adminNotes: "",
  });

  const [creditAdjustmentForm, setCreditAdjustmentForm] = useState({
    adjustment: 0,
    reason: "",
  });

  const [configForm, setConfigForm] = useState({
    key: "",
    value: "",
    description: "",
    category: "gameplay" as "economy" | "gameplay" | "events" | "system",
  });

  // Admin authentication
  const createOrGetAdmin = useMutation(api.admin.createOrGetAdmin);
  const validateSession = useQuery(api.admin.validateSession, 
    sessionToken ? { sessionToken } : "skip"
  );
  const logoutAdmin = useMutation(api.admin.logoutAdmin);

  // Data queries
  const missions = useQuery(api.admin.getAllMissions, 
    currentAdmin ? { adminId: currentAdmin._id } : "skip"
  );
  const players = useQuery(api.admin.getAllPlayers, 
    currentAdmin ? { adminId: currentAdmin._id, limit: 50 } : "skip"
  );
  const analytics = useQuery(api.admin.getPlayerAnalytics, 
    currentAdmin ? { adminId: currentAdmin._id } : "skip"
  );
  const activityLog = useQuery(api.admin.getAdminActivityLog, 
    currentAdmin ? { adminId: currentAdmin._id, limit: 20 } : "skip"
  );

  // Mutations
  const toggleMissionStatus = useMutation(api.admin.toggleMissionStatus);
  const createMission = useMutation(api.admin.createMission);
  const updateMission = useMutation(api.admin.updateMission);
  const moderatePlayer = useMutation(api.admin.moderatePlayer);
  const adjustPlayerCredits = useMutation(api.admin.adjustPlayerCredits);
  const updateGameConfig = useMutation(api.admin.updateGameConfig);
  
  // Simplified admin mutations - removed complex ones due to schema conflicts
  
  // New admin queries
  const systemStats = useQuery(api.admin.getSystemStats, 
    currentAdmin ? { adminId: currentAdmin._id } : "skip"
  );
  const contentStats = useQuery(api.admin.getContentStats, 
    currentAdmin ? { adminId: currentAdmin._id } : "skip"
  );

  // Check session on load
  useEffect(() => {
    const storedSession = localStorage.getItem("adminSession");
    if (storedSession) {
      setSessionToken(storedSession);
    }
  }, []);

  // Handle session validation
  useEffect(() => {
    if (validateSession?.isValid && validateSession.admin) {
      setCurrentAdmin(validateSession.admin);
      setIsAuthenticated(true);
      setLoginError(null);
    } else if (validateSession?.isValid === false) {
      localStorage.removeItem("adminSession");
      setSessionToken(null);
      setCurrentAdmin(null);
      setIsAuthenticated(false);
    }
  }, [validateSession]);

  const handleLogin = async () => {
    if (!loginEmail || !loginName || !loginPassword) {
      setLoginError("Please fill in all fields");
      return;
    }
    
    try {
      const result = await createOrGetAdmin({
        email: loginEmail,
        name: loginName,
        password: loginPassword,
        role: "game_master",
      });
      
      localStorage.setItem("adminSession", result.sessionToken);
      setSessionToken(result.sessionToken);
      setLoginEmail("");
      setLoginName("");
      setLoginPassword("");
      setLoginError(null);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError((error as Error).message);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await logoutAdmin({ sessionToken });
      localStorage.removeItem("adminSession");
      setSessionToken(null);
      setCurrentAdmin(null);
      setIsAuthenticated(false);
    }
  };

  const handleToggleMission = async (missionId: Id<"missions">) => {
    if (!currentAdmin) return;
    
    try {
      await toggleMissionStatus({
        adminId: currentAdmin._id,
        missionId,
      });
    } catch (error) {
      console.error("Failed to toggle mission:", error);
    }
  };

  const handleCreateMission = async () => {
    if (!currentAdmin) return;
    
    try {
      await createMission({
        adminId: currentAdmin._id,
        ...missionForm,
      });
      setShowMissionModal(false);
      resetMissionForm();
    } catch (error) {
      console.error("Failed to create mission:", error);
    }
  };

  const handleUpdateMission = async () => {
    if (!currentAdmin || !editingMission) return;
    
    try {
      await updateMission({
        adminId: currentAdmin._id,
        missionId: editingMission._id,
        updates: missionForm,
      });
      setShowMissionModal(false);
      setEditingMission(null);
      resetMissionForm();
    } catch (error) {
      console.error("Failed to update mission:", error);
    }
  };

  const handleModeratePlayer = async () => {
    if (!currentAdmin || !editingPlayer) return;
    
    try {
      await moderatePlayer({
        adminId: currentAdmin._id,
        playerId: editingPlayer._id,
        ...playerModerationForm,
      });
      setShowPlayerModal(false);
      setEditingPlayer(null);
    } catch (error) {
      console.error("Failed to moderate player:", error);
    }
  };

  const handleAdjustCredits = async () => {
    if (!currentAdmin || !editingPlayer) return;
    
    try {
      await adjustPlayerCredits({
        adminId: currentAdmin._id,
        playerId: editingPlayer._id,
        creditAdjustment: creditAdjustmentForm.adjustment,
        reason: creditAdjustmentForm.reason,
      });
      setShowPlayerModal(false);
      setEditingPlayer(null);
      setCreditAdjustmentForm({ adjustment: 0, reason: "" });
    } catch (error) {
      console.error("Failed to adjust credits:", error);
    }
  };

  const handleUpdateConfig = async () => {
    if (!currentAdmin) return;
    
    try {
      let value: string | number | boolean = configForm.value;
      
      // Try to parse as number or boolean
      if (!isNaN(Number(value))) {
        value = Number(value);
      } else if (value === "true" || value === "false") {
        value = value === "true";
      }
      
      await updateGameConfig({
        adminId: currentAdmin._id,
        key: configForm.key,
        value,
        description: configForm.description,
        category: configForm.category,
      });
      setShowConfigModal(false);
      setConfigForm({ key: "", value: "", description: "", category: "gameplay" });
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  };

  const resetMissionForm = () => {
    setMissionForm({
      title: "",
      description: "",
      difficulty: "rookie",
      missionType: "combat",
      minimumLevel: 1,
      requiredAccuracy: 0,
      requiredReflex: 0,
      requiredCognition: 0,
      baseCredits: 100,
      baseExperience: 50,
      techLabReputation: 0,
      securityWingReputation: 0,
      commandCenterReputation: 0,
      isStoryMission: false,
    });
  };

  const openEditMissionModal = (mission: Mission) => {
    setEditingMission(mission);
    setMissionForm({
      title: mission.title,
      description: mission.description,
      difficulty: mission.difficulty,
      missionType: mission.missionType,
      minimumLevel: mission.minimumLevel,
      requiredAccuracy: mission.requiredAccuracy || 0,
      requiredReflex: mission.requiredReflex || 0,
      requiredCognition: mission.requiredCognition || 0,
      baseCredits: mission.baseCredits,
      baseExperience: mission.baseExperience,
      techLabReputation: mission.techLabReputation,
      securityWingReputation: mission.securityWingReputation,
      commandCenterReputation: mission.commandCenterReputation,
      isStoryMission: mission.isStoryMission,
    });
    setShowMissionModal(true);
  };

  const openPlayerModal = (player: Player) => {
    setEditingPlayer(player);
    setPlayerModerationForm({
      action: player.isBanned ? "unban" : "ban",
      reason: player.banReason || "",
      adminNotes: player.adminNotes || "",
    });
    setShowPlayerModal(true);
  };

  // Placeholder admin handlers - content creation will be added in future update
  const handleCreateContent = async (type: string) => {
    if (!currentAdmin) return;
    console.log(`Creating ${type} - feature coming soon!`);
    setShowContentModal(false);
  };

  if (!isAuthenticated || !currentAdmin) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono relative overflow-hidden">
        {/* Terminal grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_98%,rgba(34,197,94,0.1)_100%)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_98%,rgba(34,197,94,0.1)_100%)] bg-[length:50px_50px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(34,197,94,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="bg-black/90 border-2 border-green-400/30 rounded-none p-8 max-w-md w-full shadow-2xl shadow-green-400/20 relative">
            {/* Terminal header */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-green-400/10 border-b border-green-400/30 flex items-center px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 text-center text-xs text-green-400/60">ADMIN_CONSOLE.exe</div>
            </div>

            <div className="mt-8 text-center mb-8">
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <div className="w-full h-full bg-green-400/20 border border-green-400/50 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-12 h-12 text-green-400 fill-current">
                      <polygon points="50,10 80,35 80,50 65,50 65,40 50,28 35,40 35,50 20,50 20,35" />
                      <polygon points="50,28 65,40 65,55 55,55 55,45 50,40 45,45 45,55 35,55 35,40" />
                      <circle cx="15" cy="60" r="2" />
                      <circle cx="25" cy="70" r="2" />
                      <circle cx="35" cy="80" r="2" />
                      <circle cx="85" cy="60" r="2" />
                      <circle cx="75" cy="70" r="2" />
                      <circle cx="65" cy="80" r="2" />
                      <path d="M15,60 L25,70 M25,70 L35,80 M85,60 L75,70 M75,70 L65,80" stroke="currentColor" strokeWidth="1" fill="none" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-green-400 text-xs opacity-60">&gt; INITIALIZING...</div>
                  <h1 className="text-2xl font-bold text-green-400 tracking-wider">
                    ECHELON_ASCENT
                  </h1>
                  <div className="text-green-400 text-xs opacity-60">&gt; ADMIN_TERMINAL_v2.1.0</div>
                </div>
              </div>
              <div className="h-px bg-green-400/30 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
              </div>
            </div>

            {loginError && (
              <div className="mb-6 p-3 bg-red-900/30 border border-red-400/50 text-red-300 text-sm font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-red-400">[ERROR]</span>
                  <span>{loginError}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider">ADMIN_EMAIL:</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-600/50 focus:border-green-400 focus:outline-none font-mono text-sm"
                  placeholder="admin@echelon-ascent.com"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider">USERNAME:</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-600/50 focus:border-green-400 focus:outline-none font-mono text-sm"
                  placeholder="gamemaster"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider">PASSWORD:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black border border-green-400/50 px-3 py-2 text-green-400 placeholder-green-600/50 focus:border-green-400 focus:outline-none font-mono text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={!loginEmail || !loginName || !loginPassword}
                className="w-full bg-green-900/30 hover:bg-green-800/40 disabled:bg-gray-900/30 border border-green-400/50 hover:border-green-400 disabled:border-gray-600/50 text-green-400 disabled:text-gray-600 font-mono py-3 px-4 transition-all duration-200 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-green-400/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center space-x-2 text-sm tracking-wider">
                  <span>&gt;</span>
                  <span>INITIATE_ACCESS_PROTOCOL</span>
                  <span>&lt;</span>
                </span>
              </button>
              
              <div className="text-center text-xs text-green-400/40 font-mono mt-4">
                &gt; AWAITING_CREDENTIALS...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono relative">
      {/* Terminal background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_98%,rgba(34,197,94,0.05)_100%)] bg-[length:50px_50px]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_98%,rgba(34,197,94,0.05)_100%)] bg-[length:50px_50px]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(34,197,94,0.01)_50%)] bg-[length:100%_2px] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 bg-black/90 border-b-2 border-green-400/30 px-4 lg:px-6 py-3 sticky top-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-400/20 border border-green-400/50 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-5 h-5 lg:w-6 lg:h-6 text-green-400 fill-current">
                <polygon points="50,10 80,35 80,50 65,50 65,40 50,28 35,40 35,50 20,50 20,35" />
                <polygon points="50,28 65,40 65,55 55,55 55,45 50,40 45,45 45,55 35,55 35,40" />
                <circle cx="15" cy="60" r="2" />
                <circle cx="25" cy="70" r="2" />
                <circle cx="35" cy="80" r="2" />
                <circle cx="85" cy="60" r="2" />
                <circle cx="75" cy="70" r="2" />
                <circle cx="65" cy="80" r="2" />
                <path d="M15,60 L25,70 M25,70 L35,80 M85,60 L75,70 M75,70 L65,80" stroke="currentColor" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-green-400 tracking-wider">
                ECHELON_ASCENT
              </h1>
              <p className="text-xs lg:text-sm text-green-400/70">
                <span className="text-green-300">ADMIN:</span> {currentAdmin.name} | 
                <span className="text-green-300 ml-1 uppercase">{currentAdmin.role.replace('_', '_')}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button
              onClick={handleLogout}
              className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-2 lg:px-4 py-1 lg:py-2 border border-red-400/50 hover:border-red-400 transition-all duration-200 flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm"
            >
              <span>[X]</span>
              <span className="hidden lg:inline">LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 bg-black/70 border-b border-green-400/20 px-2 lg:px-6 sticky top-[65px] lg:top-[73px]">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {[
            { id: "overview", label: "OVERVIEW", icon: "[█]" },
            { id: "missions", label: "MISSIONS", icon: "[◊]" },
            { id: "players", label: "PLAYERS", icon: "[●]" },
            { id: "analytics", label: "ANALYTICS", icon: "[▲]" },
            { id: "content", label: "CONTENT", icon: "[⚡]" },
            { id: "economy", label: "ECONOMY", icon: "[₿]" },
            { id: "system", label: "SYSTEM", icon: "[⚙]" },
            { id: "settings", label: "SETTINGS", icon: "[⚙]" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1 lg:space-x-2 py-2 lg:py-3 px-2 lg:px-4 border-b-2 transition-all duration-200 whitespace-nowrap text-xs lg:text-sm font-mono ${
                activeTab === tab.id
                  ? "border-green-400 text-green-400 bg-green-400/10"
                  : "border-transparent text-green-400/60 hover:text-green-400 hover:bg-green-400/5"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium tracking-wider">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 p-3 lg:p-6">
        {activeTab === "overview" && (
          <div className="space-y-6 lg:space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-2 lg:space-y-0">
              <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; SYSTEM_OVERVIEW</h2>
              <div className="flex items-center space-x-2 text-xs lg:text-sm text-green-400/60 font-mono">
                <span>[STATUS]</span>
                <span>ONLINE</span>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 hover:border-green-400/50 transition-all duration-300 group relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 h-8 lg:w-12 lg:h-12 bg-green-400/20 border border-green-400/50 flex items-center justify-center">
                    <span className="text-sm lg:text-xl font-mono">[●]</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-green-400 font-mono">{players?.length || 0}</div>
                    <div className="text-xs text-green-300/60 font-mono">ACTIVE</div>
                  </div>
                </div>
                <h3 className="text-sm lg:text-lg font-semibold text-green-400 mb-1 font-mono">PLAYERS</h3>
                <p className="text-xs lg:text-sm text-green-400/60 font-mono">TOTAL_REGISTERED</p>
              </div>
              
              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 hover:border-green-400/50 transition-all duration-300 group relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 h-8 lg:w-12 lg:h-12 bg-green-400/20 border border-green-400/50 flex items-center justify-center">
                    <span className="text-sm lg:text-xl font-mono">[◊]</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-green-400 font-mono">{missions?.filter(m => m.isActive).length || 0}</div>
                    <div className="text-xs text-green-300/60 font-mono">/{missions?.length || 0} TOTAL</div>
                  </div>
                </div>
                <h3 className="text-sm lg:text-lg font-semibold text-green-400 mb-1 font-mono">MISSIONS</h3>
                <p className="text-xs lg:text-sm text-green-400/60 font-mono">ACTIVE_QUEUE</p>
              </div>

              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 hover:border-green-400/50 transition-all duration-300 group relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <div className="flex items-center justify-between mb-3 lg:mb-4">
                  <div className="w-8 h-8 lg:w-12 lg:h-12 bg-green-400/20 border border-green-400/50 flex items-center justify-center">
                    <span className="text-sm lg:text-xl font-mono">[$]</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg lg:text-2xl font-bold text-green-400 font-mono">
                      {players?.reduce((sum, p) => sum + p.ascentCredits, 0).toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-green-300/60 font-mono">CREDITS</div>
                  </div>
                </div>
                <h3 className="text-sm lg:text-lg font-semibold text-green-400 mb-1 font-mono">ECONOMY</h3>
                <p className="text-xs lg:text-sm text-green-400/60 font-mono">TOTAL_BALANCE</p>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-green-400 flex items-center space-x-2 font-mono">
                    <span>[LOG]</span>
                    <span>RECENT_ACTIVITY</span>
                  </h3>
                  <button className="text-xs text-green-400/60 hover:text-green-400 transition-colors font-mono">
                    [VIEW_ALL]
                  </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {activityLog?.map((action: AdminAction) => (
                    <div key={action._id} className="flex items-start space-x-3 p-3 bg-green-400/5 border border-green-400/20">
                      <div className="w-2 h-2 bg-green-400 mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-green-400 font-mono">{action.description}</p>
                        <p className="text-xs text-green-400/50 mt-1 font-mono">
                          {new Date(action.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!activityLog?.length && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl font-mono">[?]</span>
                      </div>
                      <p className="text-green-400/60 font-mono">NO_RECENT_ACTIVITY</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-green-400 flex items-center space-x-2 font-mono">
                    <span>[STAT]</span>
                    <span>QUICK_METRICS</span>
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "AVG_PLAYER_LEVEL", value: analytics?.averageLevel?.toFixed(1) || "0", trend: "+2.3%" },
                    { label: "DAILY_ACTIVE_USERS", value: analytics?.activePlayersToday?.toString() || "0", trend: "+5.7%" },
                    { label: "NEW_PLAYERS_TODAY", value: analytics?.newPlayersToday?.toString() || "0", trend: "+1.2%" },
                    { label: "BANNED_PLAYERS", value: analytics?.bannedPlayers?.toString() || "0", trend: "-3.1%" },
                  ].map((stat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-400/5 border border-green-400/20">
                      <span className="text-sm text-green-400/80 font-mono">{stat.label}:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-green-400 font-mono">{stat.value}</span>
                        <span className={`text-xs px-2 py-1 font-mono ${
                          stat.trend.startsWith('+') ? 'text-green-300 bg-green-400/20' : 'text-red-300 bg-red-400/20'
                        }`}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "missions" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; MISSION_CONTROL</h2>
              <button
                onClick={() => {
                  setEditingMission(null);
                  resetMissionForm();
                  setShowMissionModal(true);
                }}
                className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
              >
                [+] CREATE_MISSION
              </button>
            </div>
            
            <div className="bg-black/60 border-2 border-green-400/30 overflow-hidden">
              {missions?.length ? (
                <div className="divide-y divide-green-400/20">
                  {missions.map((mission: Mission) => (
                    <div key={mission._id} className="p-4 lg:p-6 hover:bg-green-400/5 transition-all duration-200">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="text-lg font-mono">
                              {mission.missionType === "stealth" ? "[S]" : 
                               mission.missionType === "combat" ? "[C]" : 
                               mission.missionType === "hacking" ? "[H]" : "[R]"}
                            </span>
                            <div>
                              <h3 className="text-lg font-bold text-green-400 font-mono">{mission.title}</h3>
                              <p className="text-sm text-green-400/60 font-mono">{mission.description}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                            <div>
                              <div className="text-green-400/50">TYPE:</div>
                              <div className="text-green-400 uppercase">{mission.missionType}</div>
                            </div>
                            <div>
                              <div className="text-green-400/50">DIFFICULTY:</div>
                              <div className={`uppercase ${
                                mission.difficulty === "rookie" ? "text-green-300" :
                                mission.difficulty === "specialist" ? "text-yellow-300" :
                                "text-red-300"
                              }`}>
                                {mission.difficulty}
                              </div>
                            </div>
                            <div>
                              <div className="text-green-400/50">MIN_LEVEL:</div>
                              <div className="text-green-400">{mission.minimumLevel}</div>
                            </div>
                            <div>
                              <div className="text-green-400/50">REWARD:</div>
                              <div className="text-green-400">{mission.baseCredits}c</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-3">
                          <span className={`px-2 py-1 font-mono text-xs ${
                            mission.isActive ? "bg-green-400/20 text-green-300 border border-green-400/50" : "bg-red-400/20 text-red-300 border border-red-400/50"
                          }`}>
                            {mission.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditMissionModal(mission)}
                              className="bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 border border-blue-400/50 hover:border-blue-400 px-2 py-1 font-mono text-xs transition-all duration-200"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleToggleMission(mission._id)}
                              className={`px-2 py-1 font-mono text-xs transition-all duration-200 border ${
                                mission.isActive 
                                  ? "bg-red-900/30 hover:bg-red-800/40 text-red-300 border-red-400/50 hover:border-red-400"
                                  : "bg-green-900/30 hover:bg-green-800/40 text-green-300 border-green-400/50 hover:border-green-400"
                              }`}
                            >
                              {mission.isActive ? "OFF" : "ON"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl font-mono">[◊]</span>
                  </div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2 font-mono">NO_MISSIONS_FOUND</h3>
                  <p className="text-green-400/60 mb-6 font-mono">CREATE_FIRST_MISSION_TO_BEGIN</p>
                  <button
                    onClick={() => {
                      setEditingMission(null);
                      resetMissionForm();
                      setShowMissionModal(true);
                    }}
                    className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-6 py-3 font-mono"
                  >
                    [+] CREATE_MISSION
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; PLAYER_DATABASE</h2>
            
            <div className="bg-black/60 border-2 border-green-400/30 overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead className="bg-green-400/10 border-b border-green-400/30">
                  <tr>
                    <th className="text-left p-4 text-green-400">PLAYER_ID</th>
                    <th className="text-left p-4 text-green-400">LEVEL</th>
                    <th className="text-left p-4 text-green-400">CREDITS</th>
                    <th className="text-left p-4 text-green-400">MISSIONS</th>
                    <th className="text-left p-4 text-green-400">STATUS</th>
                    <th className="text-left p-4 text-green-400">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-400/20">
                  {players?.map((player: Player) => (
                    <tr key={player._id} className="hover:bg-green-400/5">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-green-400">{player.displayName}</div>
                          <div className="text-xs text-green-400/60">{player.walletAddress.slice(0, 12)}...</div>
                        </div>
                      </td>
                      <td className="p-4 text-green-400">{player.level}</td>
                      <td className="p-4 text-green-400">{player.ascentCredits.toLocaleString()}</td>
                      <td className="p-4 text-green-400">{player.totalMissionsCompleted}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs border ${
                          player.isBanned === true ? "bg-red-400/20 text-red-400 border-red-400/50" : "bg-green-400/20 text-green-400 border-green-400/50"
                        }`}>
                          {player.isBanned === true ? "BANNED" : "ACTIVE"}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openPlayerModal(player)}
                          className="bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 border border-blue-400/50 hover:border-blue-400 px-3 py-1 font-mono text-xs transition-all duration-200"
                        >
                          MANAGE
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!players?.length && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-green-400/60">
                        NO_PLAYERS_REGISTERED
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; ANALYTICS_MODULE</h2>
            
            <div className="space-y-6">
              {/* Player Level Distribution */}
              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">PLAYER_LEVEL_DISTRIBUTION</h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: ['1-10', '11-20', '21-30', '31-40', '41-50', '51+'],
                      datasets: [
                        {
                          label: 'Players',
                          data: players ? [
                            players.filter(p => p.level >= 1 && p.level <= 10).length,
                            players.filter(p => p.level >= 11 && p.level <= 20).length,
                            players.filter(p => p.level >= 21 && p.level <= 30).length,
                            players.filter(p => p.level >= 31 && p.level <= 40).length,
                            players.filter(p => p.level >= 41 && p.level <= 50).length,
                            players.filter(p => p.level >= 51).length,
                          ] : [0, 0, 0, 0, 0, 0],
                          backgroundColor: 'rgba(34, 197, 94, 0.2)',
                          borderColor: '#22c55e',
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                        },
                        title: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                          grid: {
                            color: 'rgba(34, 197, 94, 0.1)',
                          },
                        },
                        x: {
                          ticks: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                          grid: {
                            color: 'rgba(34, 197, 94, 0.1)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mission Completion by Type */}
                <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                  
                  <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">MISSION_TYPES</h3>
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels: ['Combat', 'Stealth', 'Hacking', 'Rescue'],
                        datasets: [
                          {
                            data: missions ? [
                              missions.filter(m => m.missionType === 'combat').length,
                              missions.filter(m => m.missionType === 'stealth').length,
                              missions.filter(m => m.missionType === 'hacking').length,
                              missions.filter(m => m.missionType === 'rescue').length,
                            ] : [0, 0, 0, 0],
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.8)',
                              'rgba(34, 197, 94, 0.6)',
                              'rgba(34, 197, 94, 0.4)',
                              'rgba(34, 197, 94, 0.2)',
                            ],
                            borderColor: '#22c55e',
                            borderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              color: '#22c55e',
                              font: { family: 'monospace', size: 12 },
                              padding: 15,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Player Activity Timeline */}
                <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                  
                  <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">PLAYER_ACTIVITY</h3>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: ['7 days ago', '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
                        datasets: [
                          {
                            label: 'Active Players',
                            data: [45, 52, 48, 61, 55, 67, 43, 58],
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#22c55e',
                            pointBorderColor: '#000000',
                            pointBorderWidth: 2,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: '#22c55e',
                              font: { family: 'monospace' },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              color: '#22c55e',
                              font: { family: 'monospace' },
                            },
                            grid: {
                              color: 'rgba(34, 197, 94, 0.1)',
                            },
                          },
                          x: {
                            ticks: {
                              color: '#22c55e',
                              font: { family: 'monospace', size: 10 },
                            },
                            grid: {
                              color: 'rgba(34, 197, 94, 0.1)',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Economic Overview */}
              <div className="bg-black/60 border-2 border-green-400/30 p-4 lg:p-6 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
                
                <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">ECONOMIC_OVERVIEW</h3>
                <div className="h-80">
                  <Bar
                    data={{
                      labels: ['0-1K', '1K-5K', '5K-10K', '10K-25K', '25K-50K', '50K+'],
                      datasets: [
                        {
                          label: 'Players by Credit Balance',
                          data: players ? [
                            players.filter(p => p.ascentCredits >= 0 && p.ascentCredits < 1000).length,
                            players.filter(p => p.ascentCredits >= 1000 && p.ascentCredits < 5000).length,
                            players.filter(p => p.ascentCredits >= 5000 && p.ascentCredits < 10000).length,
                            players.filter(p => p.ascentCredits >= 10000 && p.ascentCredits < 25000).length,
                            players.filter(p => p.ascentCredits >= 25000 && p.ascentCredits < 50000).length,
                            players.filter(p => p.ascentCredits >= 50000).length,
                          ] : [0, 0, 0, 0, 0, 0],
                          backgroundColor: 'rgba(34, 197, 94, 0.3)',
                          borderColor: '#22c55e',
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                          grid: {
                            color: 'rgba(34, 197, 94, 0.1)',
                          },
                        },
                        x: {
                          ticks: {
                            color: '#22c55e',
                            font: { family: 'monospace' },
                          },
                          grid: {
                            color: 'rgba(34, 197, 94, 0.1)',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

                 {activeTab === "content" && (
           <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
               <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; CONTENT_MANAGEMENT</h2>
               <div className="flex flex-wrap gap-2">
                 <button
                   onClick={() => {
                     setContentType("training_drill");
                     setShowContentModal(true);
                   }}
                   className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
                 >
                   [+] ADD_TRAINING_DRILL
                 </button>
                 <button
                   onClick={() => {
                     setContentType("marketplace_item");
                     setShowContentModal(true);
                   }}
                   className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
                 >
                   [+] ADD_MARKETPLACE_ITEM
                 </button>
                 <button
                   onClick={() => {
                     setContentType("upgrade_item");
                     setShowContentModal(true);
                   }}
                   className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
                 >
                   [+] ADD_UPGRADE_ITEM
                 </button>
               </div>
             </div>
             
             {contentStats && (
               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                 <div className="bg-black/60 border border-green-400/30 p-4">
                   <h3 className="text-lg font-bold text-green-400 mb-3 font-mono">TRAINING_DRILLS</h3>
                   <div className="space-y-2 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>TOTAL:</span>
                       <span className="text-green-300">{contentStats.trainingDrills.total}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>COGNITION:</span>
                       <span className="text-green-300">{contentStats.trainingDrills.byCategory.cognition}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>REFLEX:</span>
                       <span className="text-green-300">{contentStats.trainingDrills.byCategory.reflex}</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-black/60 border border-green-400/30 p-4">
                   <h3 className="text-lg font-bold text-green-400 mb-3 font-mono">MARKETPLACE</h3>
                   <div className="space-y-2 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>TOTAL:</span>
                       <span className="text-green-300">{contentStats.marketplaceItems.total}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>LEGENDARY:</span>
                       <span className="text-yellow-400">{contentStats.marketplaceItems.byRarity.legendary}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>EPIC:</span>
                       <span className="text-purple-400">{contentStats.marketplaceItems.byRarity.epic}</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-black/60 border border-green-400/30 p-4">
                   <h3 className="text-lg font-bold text-green-400 mb-3 font-mono">UPGRADES</h3>
                   <div className="space-y-2 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>TOTAL:</span>
                       <span className="text-green-300">{contentStats.upgradeItems.total}</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-black/60 border border-green-400/30 p-4">
                   <h3 className="text-lg font-bold text-green-400 mb-3 font-mono">MISSIONS</h3>
                   <div className="space-y-2 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>TOTAL:</span>
                       <span className="text-green-300">{contentStats.missions.total}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>ACTIVE:</span>
                       <span className="text-green-300">{contentStats.missions.active}</span>
                     </div>
                   </div>
                 </div>
               </div>
             )}
           </div>
         )}

        {activeTab === "economy" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; ECONOMY_MANAGEMENT</h2>
              <button
                onClick={() => {
                  setEconomyAction("adjust_credits");
                  setShowEconomyModal(true);
                }}
                className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
              >
                [+] ADJUST_CREDITS
              </button>
              <button
                onClick={() => {
                  setEconomyAction("adjust_materials");
                  setShowEconomyModal(true);
                }}
                className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
              >
                [+] ADJUST_MATERIALS
              </button>
              <button
                onClick={() => {
                  setEconomyAction("market_adjustment");
                  setShowEconomyModal(true);
                }}
                className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
              >
                [+] MARKET_ADJUSTMENT
              </button>
            </div>
            
            <div className="bg-black/60 border-2 border-green-400/30 p-6 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
              
              <div className="text-center py-8 text-green-400/60 font-mono">
                ECONOMY_MANAGEMENT_TOOLS<br/>
                USE [ADJUST_CREDITS], [ADJUST_MATERIALS], AND [MARKET_ADJUSTMENT] TO MANAGE THE ECONOMY
              </div>
            </div>
          </div>
        )}

                 {activeTab === "system" && (
           <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
               <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; SYSTEM_MONITORING</h2>
               <button
                 onClick={() => {
                   setShowBulkModal(true);
                 }}
                 className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
               >
                 [⚡] BULK_OPERATIONS
               </button>
             </div>
             
             {systemStats && (
               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                 <div className="bg-black/60 border border-green-400/30 p-6">
                   <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">PLAYER_METRICS</h3>
                   <div className="space-y-3 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>TOTAL_PLAYERS:</span>
                       <span className="text-green-300">{systemStats.totalPlayers}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>ACTIVE_TODAY:</span>
                       <span className="text-green-300">{systemStats.activeToday}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>AVG_LEVEL:</span>
                       <span className="text-green-300">{systemStats.averagePlayerLevel}</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-black/60 border border-green-400/30 p-6">
                   <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">GAME_ECONOMY</h3>
                   <div className="space-y-3 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>CREDITS_CIRCULATION:</span>
                       <span className="text-green-300">{systemStats.totalCreditsInCirculation.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>RECENT_MISSIONS:</span>
                       <span className="text-green-300">{systemStats.recentMissionCompletions}</span>
                     </div>
                   </div>
                 </div>

                 <div className="bg-black/60 border border-green-400/30 p-6">
                   <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">SYSTEM_STATUS</h3>
                   <div className="space-y-3 text-sm font-mono">
                     <div className="flex justify-between">
                       <span>SERVER_UPTIME:</span>
                       <span className="text-green-300">{systemStats.serverUptime}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>STATUS:</span>
                       <span className="text-green-300">ONLINE</span>
                     </div>
                   </div>
                 </div>
               </div>
             )}

             <div className="bg-black/60 border border-green-400/30 p-6">
               <h3 className="text-lg font-bold text-green-400 mb-4 font-mono">ADMINISTRATIVE_TOOLS</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <button className="bg-yellow-900/30 hover:bg-yellow-800/40 border border-yellow-400/50 hover:border-yellow-400 text-yellow-400 px-4 py-3 font-mono text-sm transition-all duration-200">
                   [!] RESET_DAILY_TRAINING
                 </button>
                 <button className="bg-blue-900/30 hover:bg-blue-800/40 border border-blue-400/50 hover:border-blue-400 text-blue-400 px-4 py-3 font-mono text-sm transition-all duration-200">
                   [⚡] CLEAR_CACHE
                 </button>
                 <button className="bg-purple-900/30 hover:bg-purple-800/40 border border-purple-400/50 hover:border-purple-400 text-purple-400 px-4 py-3 font-mono text-sm transition-all duration-200">
                   [💾] BACKUP_DATA
                 </button>
                 <button className="bg-red-900/30 hover:bg-red-800/40 border border-red-400/50 hover:border-red-400 text-red-400 px-4 py-3 font-mono text-sm transition-all duration-200">
                   [⚠] RESET_LEADERBOARDS
                 </button>
               </div>
             </div>
           </div>
         )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-xl lg:text-2xl font-bold text-green-400 font-mono tracking-wider">&gt; GAME_CONFIGURATION</h2>
              <button
                onClick={() => setShowConfigModal(true)}
                className="bg-green-900/30 hover:bg-green-800/40 border border-green-400/50 hover:border-green-400 text-green-400 px-4 py-2 font-mono text-sm transition-all duration-200"
              >
                [+] ADD_CONFIG
              </button>
            </div>
            
            <div className="bg-black/60 border-2 border-green-400/30 p-6 relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-green-400/50"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-green-400/50"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-green-400/50"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-green-400/50"></div>
              
              <div className="text-center py-8 text-green-400/60 font-mono">
                GAME_CONFIGURATION_MANAGEMENT<br/>
                USE [ADD_CONFIG] TO CREATE NEW SETTINGS
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mission Modal */}
      {showMissionModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-black border-2 border-green-400/50 w-full max-w-2xl max-h-[95vh] overflow-y-auto relative">
            {/* Terminal window header */}
            <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm font-mono text-green-400">
                  {editingMission ? "MISSION_EDITOR.exe" : "MISSION_CREATOR.exe"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowMissionModal(false);
                  setEditingMission(null);
                  resetMissionForm();
                }}
                className="text-green-400 hover:text-red-400 transition-colors font-mono"
              >
                [X]
              </button>
            </div>

            <div className="p-4 lg:p-6">
              <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                &gt; {editingMission ? "EDIT_MISSION_PROTOCOL" : "CREATE_MISSION_PROTOCOL"}
              </h3>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MISSION_TITLE:</label>
                    <input
                      type="text"
                      value={missionForm.title}
                      onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MIN_LEVEL:</label>
                    <input
                      type="number"
                      value={missionForm.minimumLevel}
                      onChange={(e) => setMissionForm({ ...missionForm, minimumLevel: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DESCRIPTION:</label>
                  <textarea
                    value={missionForm.description}
                    onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DIFFICULTY:</label>
                    <select
                      value={missionForm.difficulty}
                      onChange={(e) => setMissionForm({ ...missionForm, difficulty: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="rookie">ROOKIE</option>
                      <option value="specialist">SPECIALIST</option>
                      <option value="elite">ELITE</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TYPE:</label>
                    <select
                      value={missionForm.missionType}
                      onChange={(e) => setMissionForm({ ...missionForm, missionType: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="combat">COMBAT</option>
                      <option value="stealth">STEALTH</option>
                      <option value="hacking">HACKING</option>
                      <option value="rescue">RESCUE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_ACCURACY:</label>
                    <input
                      type="number"
                      value={missionForm.requiredAccuracy}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredAccuracy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_REFLEX:</label>
                    <input
                      type="number"
                      value={missionForm.requiredReflex}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredReflex: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_COGNITION:</label>
                    <input
                      type="number"
                      value={missionForm.requiredCognition}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredCognition: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CREDITS:</label>
                    <input
                      type="number"
                      value={missionForm.baseCredits}
                      onChange={(e) => setMissionForm({ ...missionForm, baseCredits: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">EXPERIENCE:</label>
                    <input
                      type="number"
                      value={missionForm.baseExperience}
                      onChange={(e) => setMissionForm({ ...missionForm, baseExperience: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TECH_LAB_REP:</label>
                    <input
                      type="number"
                      value={missionForm.techLabReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, techLabReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">SECURITY_REP:</label>
                    <input
                      type="number"
                      value={missionForm.securityWingReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, securityWingReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">COMMAND_REP:</label>
                    <input
                      type="number"
                      value={missionForm.commandCenterReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, commandCenterReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={missionForm.isStoryMission}
                      onChange={(e) => setMissionForm({ ...missionForm, isStoryMission: e.target.checked })}
                      className="text-green-400"
                    />
                    <span className="text-green-400 font-mono">STORY_MISSION</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowMissionModal(false);
                      setEditingMission(null);
                      resetMissionForm();
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CANCEL
                  </button>
                  <button
                    onClick={editingMission ? handleUpdateMission : handleCreateMission}
                    className="bg-green-900/30 hover:bg-green-800/40 text-green-400 px-4 py-2 border border-green-400/50 hover:border-green-400 font-mono text-sm transition-all duration-200"
                  >
                    [ENTER] {editingMission ? "UPDATE" : "CREATE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Management Modal */}
      {showPlayerModal && editingPlayer && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-black border-2 border-green-400/50 w-full max-w-lg max-h-[95vh] overflow-y-auto relative">
            <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm font-mono text-green-400">PLAYER_MANAGER.exe</span>
              </div>
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setEditingPlayer(null);
                }}
                className="text-green-400 hover:text-red-400 transition-colors font-mono"
              >
                [X]
              </button>
            </div>

            <div className="p-4 lg:p-6">
              <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                &gt; MANAGE_PLAYER: {editingPlayer.displayName}
              </h3>
              
              <div className="space-y-6">
                {/* Player Info */}
                <div className="bg-green-400/10 border border-green-400/30 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div>
                      <span className="text-green-400/80">LEVEL:</span> {editingPlayer.level}
                    </div>
                    <div>
                      <span className="text-green-400/80">CREDITS:</span> {editingPlayer.ascentCredits.toLocaleString()}
                    </div>
                    <div>
                      <span className="text-green-400/80">MISSIONS:</span> {editingPlayer.totalMissionsCompleted}
                    </div>
                    <div>
                      <span className="text-green-400/80">STATUS:</span> 
                      <span className={editingPlayer.isBanned ? "text-red-400" : "text-green-400"}>
                        {editingPlayer.isBanned ? " BANNED" : " ACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Moderation Section */}
                <div>
                  <h4 className="text-green-400 font-bold mb-4 font-mono">MODERATION_CONTROLS</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">ACTION:</label>
                      <select
                        value={playerModerationForm.action}
                        onChange={(e) => setPlayerModerationForm({ ...playerModerationForm, action: e.target.value as any })}
                        className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                      >
                        <option value="ban">BAN_PLAYER</option>
                        <option value="unban">UNBAN_PLAYER</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REASON:</label>
                      <input
                        type="text"
                        value={playerModerationForm.reason}
                        onChange={(e) => setPlayerModerationForm({ ...playerModerationForm, reason: e.target.value })}
                        className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                        placeholder="REASON_FOR_ACTION..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">ADMIN_NOTES:</label>
                      <textarea
                        value={playerModerationForm.adminNotes}
                        onChange={(e) => setPlayerModerationForm({ ...playerModerationForm, adminNotes: e.target.value })}
                        className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                        placeholder="INTERNAL_ADMIN_NOTES..."
                      />
                    </div>
                    
                    <button
                      onClick={handleModeratePlayer}
                      className="w-full bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                    >
                      [EXECUTE] MODERATION_ACTION
                    </button>
                  </div>
                </div>

                {/* Credit Adjustment Section */}
                <div>
                  <h4 className="text-green-400 font-bold mb-4 font-mono">CREDIT_ADJUSTMENT</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">ADJUSTMENT:</label>
                      <input
                        type="number"
                        value={creditAdjustmentForm.adjustment}
                        onChange={(e) => setCreditAdjustmentForm({ ...creditAdjustmentForm, adjustment: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                        placeholder="POSITIVE_OR_NEGATIVE_AMOUNT..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REASON:</label>
                      <input
                        type="text"
                        value={creditAdjustmentForm.reason}
                        onChange={(e) => setCreditAdjustmentForm({ ...creditAdjustmentForm, reason: e.target.value })}
                        className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                        placeholder="REASON_FOR_ADJUSTMENT..."
                      />
                    </div>
                    
                    <button
                      onClick={handleAdjustCredits}
                      className="w-full bg-yellow-900/30 hover:bg-yellow-800/40 text-yellow-300 px-4 py-2 border border-yellow-400/50 hover:border-yellow-400 font-mono text-sm transition-all duration-200"
                    >
                      [EXECUTE] CREDIT_ADJUSTMENT
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowPlayerModal(false);
                      setEditingPlayer(null);
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CLOSE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-black border-2 border-green-400/50 w-full max-w-md max-h-[95vh] overflow-y-auto relative">
            <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm font-mono text-green-400">CONFIG_EDITOR.exe</span>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigForm({ key: "", value: "", description: "", category: "gameplay" });
                }}
                className="text-green-400 hover:text-red-400 transition-colors font-mono"
              >
                [X]
              </button>
            </div>

            <div className="p-4 lg:p-6">
              <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                &gt; ADD_GAME_CONFIGURATION
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CONFIG_KEY:</label>
                  <input
                    type="text"
                    value={configForm.key}
                    onChange={(e) => setConfigForm({ ...configForm, key: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    placeholder="e.g., MAX_DAILY_MISSIONS"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">VALUE:</label>
                  <input
                    type="text"
                    value={configForm.value}
                    onChange={(e) => setConfigForm({ ...configForm, value: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    placeholder="CONFIGURATION_VALUE"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CATEGORY:</label>
                  <select
                    value={configForm.category}
                    onChange={(e) => setConfigForm({ ...configForm, category: e.target.value as any })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                  >
                    <option value="gameplay">GAMEPLAY</option>
                    <option value="economy">ECONOMY</option>
                    <option value="events">EVENTS</option>
                    <option value="system">SYSTEM</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DESCRIPTION:</label>
                  <textarea
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                    placeholder="DESCRIBE_CONFIGURATION_PURPOSE..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowConfigModal(false);
                      setConfigForm({ key: "", value: "", description: "", category: "gameplay" });
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CANCEL
                  </button>
                  <button
                    onClick={handleUpdateConfig}
                    className="bg-green-900/30 hover:bg-green-800/40 text-green-400 px-4 py-2 border border-green-400/50 hover:border-green-400 font-mono text-sm transition-all duration-200"
                  >
                    [ENTER] ADD_CONFIG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

             {/* Content Management Modal */}
       {showContentModal && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
           <div className="bg-black border-2 border-green-400/50 w-full max-w-2xl max-h-[95vh] overflow-y-auto relative">
             {/* Terminal window header */}
             <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <div className="flex space-x-1">
                   <div className="w-3 h-3 rounded-full bg-red-400"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                   <div className="w-3 h-3 rounded-full bg-green-400"></div>
                 </div>
                 <span className="text-sm font-mono text-green-400">
                   CONTENT_CREATOR.exe
                 </span>
               </div>
               <button
                 onClick={() => {
                   setShowContentModal(false);
                 }}
                 className="text-green-400 hover:text-red-400 transition-colors font-mono"
               >
                 [X]
               </button>
             </div>

             <div className="p-4 lg:p-6">
               <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                 &gt; CREATE_{contentType.toUpperCase()}_PROTOCOL
               </h3>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MISSION_TITLE:</label>
                    <input
                      type="text"
                      value={missionForm.title}
                      onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MIN_LEVEL:</label>
                    <input
                      type="number"
                      value={missionForm.minimumLevel}
                      onChange={(e) => setMissionForm({ ...missionForm, minimumLevel: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DESCRIPTION:</label>
                  <textarea
                    value={missionForm.description}
                    onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DIFFICULTY:</label>
                    <select
                      value={missionForm.difficulty}
                      onChange={(e) => setMissionForm({ ...missionForm, difficulty: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="rookie">ROOKIE</option>
                      <option value="specialist">SPECIALIST</option>
                      <option value="elite">ELITE</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TYPE:</label>
                    <select
                      value={missionForm.missionType}
                      onChange={(e) => setMissionForm({ ...missionForm, missionType: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="combat">COMBAT</option>
                      <option value="stealth">STEALTH</option>
                      <option value="hacking">HACKING</option>
                      <option value="rescue">RESCUE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_ACCURACY:</label>
                    <input
                      type="number"
                      value={missionForm.requiredAccuracy}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredAccuracy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_REFLEX:</label>
                    <input
                      type="number"
                      value={missionForm.requiredReflex}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredReflex: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_COGNITION:</label>
                    <input
                      type="number"
                      value={missionForm.requiredCognition}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredCognition: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CREDITS:</label>
                    <input
                      type="number"
                      value={missionForm.baseCredits}
                      onChange={(e) => setMissionForm({ ...missionForm, baseCredits: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">EXPERIENCE:</label>
                    <input
                      type="number"
                      value={missionForm.baseExperience}
                      onChange={(e) => setMissionForm({ ...missionForm, baseExperience: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TECH_LAB_REP:</label>
                    <input
                      type="number"
                      value={missionForm.techLabReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, techLabReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">SECURITY_REP:</label>
                    <input
                      type="number"
                      value={missionForm.securityWingReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, securityWingReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">COMMAND_REP:</label>
                    <input
                      type="number"
                      value={missionForm.commandCenterReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, commandCenterReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={missionForm.isStoryMission}
                      onChange={(e) => setMissionForm({ ...missionForm, isStoryMission: e.target.checked })}
                      className="text-green-400"
                    />
                    <span className="text-green-400 font-mono">STORY_MISSION</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowContentModal(false);
                      setEditingMission(null);
                      resetMissionForm();
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CANCEL
                  </button>
                  <button
                    onClick={editingMission ? handleUpdateMission : handleCreateMission}
                    className="bg-green-900/30 hover:bg-green-800/40 text-green-400 px-4 py-2 border border-green-400/50 hover:border-green-400 font-mono text-sm transition-all duration-200"
                  >
                    [ENTER] {editingMission ? "UPDATE" : "CREATE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Economy Management Modal */}
      {showEconomyModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-black border-2 border-green-400/50 w-full max-w-2xl max-h-[95vh] overflow-y-auto relative">
            {/* Terminal window header */}
            <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm font-mono text-green-400">
                  {editingMission ? "MISSION_EDITOR.exe" : "MISSION_CREATOR.exe"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowEconomyModal(false);
                  setEditingMission(null);
                  resetMissionForm();
                }}
                className="text-green-400 hover:text-red-400 transition-colors font-mono"
              >
                [X]
              </button>
            </div>

            <div className="p-4 lg:p-6">
              <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                &gt; {editingMission ? "EDIT_MISSION_PROTOCOL" : "CREATE_MISSION_PROTOCOL"}
              </h3>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MISSION_TITLE:</label>
                    <input
                      type="text"
                      value={missionForm.title}
                      onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MIN_LEVEL:</label>
                    <input
                      type="number"
                      value={missionForm.minimumLevel}
                      onChange={(e) => setMissionForm({ ...missionForm, minimumLevel: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DESCRIPTION:</label>
                  <textarea
                    value={missionForm.description}
                    onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DIFFICULTY:</label>
                    <select
                      value={missionForm.difficulty}
                      onChange={(e) => setMissionForm({ ...missionForm, difficulty: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="rookie">ROOKIE</option>
                      <option value="specialist">SPECIALIST</option>
                      <option value="elite">ELITE</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TYPE:</label>
                    <select
                      value={missionForm.missionType}
                      onChange={(e) => setMissionForm({ ...missionForm, missionType: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="combat">COMBAT</option>
                      <option value="stealth">STEALTH</option>
                      <option value="hacking">HACKING</option>
                      <option value="rescue">RESCUE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_ACCURACY:</label>
                    <input
                      type="number"
                      value={missionForm.requiredAccuracy}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredAccuracy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_REFLEX:</label>
                    <input
                      type="number"
                      value={missionForm.requiredReflex}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredReflex: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_COGNITION:</label>
                    <input
                      type="number"
                      value={missionForm.requiredCognition}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredCognition: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CREDITS:</label>
                    <input
                      type="number"
                      value={missionForm.baseCredits}
                      onChange={(e) => setMissionForm({ ...missionForm, baseCredits: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">EXPERIENCE:</label>
                    <input
                      type="number"
                      value={missionForm.baseExperience}
                      onChange={(e) => setMissionForm({ ...missionForm, baseExperience: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TECH_LAB_REP:</label>
                    <input
                      type="number"
                      value={missionForm.techLabReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, techLabReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">SECURITY_REP:</label>
                    <input
                      type="number"
                      value={missionForm.securityWingReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, securityWingReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">COMMAND_REP:</label>
                    <input
                      type="number"
                      value={missionForm.commandCenterReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, commandCenterReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={missionForm.isStoryMission}
                      onChange={(e) => setMissionForm({ ...missionForm, isStoryMission: e.target.checked })}
                      className="text-green-400"
                    />
                    <span className="text-green-400 font-mono">STORY_MISSION</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowEconomyModal(false);
                      setEditingMission(null);
                      resetMissionForm();
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CANCEL
                  </button>
                  <button
                    onClick={editingMission ? handleUpdateMission : handleCreateMission}
                    className="bg-green-900/30 hover:bg-green-800/40 text-green-400 px-4 py-2 border border-green-400/50 hover:border-green-400 font-mono text-sm transition-all duration-200"
                  >
                    [ENTER] {editingMission ? "UPDATE" : "CREATE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-2 lg:p-4">
          <div className="bg-black border-2 border-green-400/50 w-full max-w-2xl max-h-[95vh] overflow-y-auto relative">
            {/* Terminal window header */}
            <div className="bg-green-400/10 border-b-2 border-green-400/30 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm font-mono text-green-400">
                  {editingMission ? "MISSION_EDITOR.exe" : "MISSION_CREATOR.exe"}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setEditingMission(null);
                  resetMissionForm();
                }}
                className="text-green-400 hover:text-red-400 transition-colors font-mono"
              >
                [X]
              </button>
            </div>

            <div className="p-4 lg:p-6">
              <h3 className="text-lg font-bold text-green-400 mb-6 font-mono tracking-wider">
                &gt; {editingMission ? "EDIT_MISSION_PROTOCOL" : "CREATE_MISSION_PROTOCOL"}
              </h3>
              
              <div className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MISSION_TITLE:</label>
                    <input
                      type="text"
                      value={missionForm.title}
                      onChange={(e) => setMissionForm({ ...missionForm, title: e.target.value })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">MIN_LEVEL:</label>
                    <input
                      type="number"
                      value={missionForm.minimumLevel}
                      onChange={(e) => setMissionForm({ ...missionForm, minimumLevel: parseInt(e.target.value) || 1 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DESCRIPTION:</label>
                  <textarea
                    value={missionForm.description}
                    onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                    className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono h-20 focus:border-green-400 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">DIFFICULTY:</label>
                    <select
                      value={missionForm.difficulty}
                      onChange={(e) => setMissionForm({ ...missionForm, difficulty: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="rookie">ROOKIE</option>
                      <option value="specialist">SPECIALIST</option>
                      <option value="elite">ELITE</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TYPE:</label>
                    <select
                      value={missionForm.missionType}
                      onChange={(e) => setMissionForm({ ...missionForm, missionType: e.target.value as any })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    >
                      <option value="combat">COMBAT</option>
                      <option value="stealth">STEALTH</option>
                      <option value="hacking">HACKING</option>
                      <option value="rescue">RESCUE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_ACCURACY:</label>
                    <input
                      type="number"
                      value={missionForm.requiredAccuracy}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredAccuracy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_REFLEX:</label>
                    <input
                      type="number"
                      value={missionForm.requiredReflex}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredReflex: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">REQ_COGNITION:</label>
                    <input
                      type="number"
                      value={missionForm.requiredCognition}
                      onChange={(e) => setMissionForm({ ...missionForm, requiredCognition: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">CREDITS:</label>
                    <input
                      type="number"
                      value={missionForm.baseCredits}
                      onChange={(e) => setMissionForm({ ...missionForm, baseCredits: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">EXPERIENCE:</label>
                    <input
                      type="number"
                      value={missionForm.baseExperience}
                      onChange={(e) => setMissionForm({ ...missionForm, baseExperience: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">TECH_LAB_REP:</label>
                    <input
                      type="number"
                      value={missionForm.techLabReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, techLabReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">SECURITY_REP:</label>
                    <input
                      type="number"
                      value={missionForm.securityWingReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, securityWingReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-mono text-green-400/80 uppercase tracking-wider mb-2">COMMAND_REP:</label>
                    <input
                      type="number"
                      value={missionForm.commandCenterReputation}
                      onChange={(e) => setMissionForm({ ...missionForm, commandCenterReputation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black border-2 border-green-400/50 px-3 py-2 text-green-400 font-mono focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={missionForm.isStoryMission}
                      onChange={(e) => setMissionForm({ ...missionForm, isStoryMission: e.target.checked })}
                      className="text-green-400"
                    />
                    <span className="text-green-400 font-mono">STORY_MISSION</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-green-400/30">
                  <button
                    onClick={() => {
                      setShowBulkModal(false);
                      setEditingMission(null);
                      resetMissionForm();
                    }}
                    className="bg-red-900/30 hover:bg-red-800/40 text-red-300 px-4 py-2 border border-red-400/50 hover:border-red-400 font-mono text-sm transition-all duration-200"
                  >
                    [ESC] CANCEL
                  </button>
                  <button
                    onClick={editingMission ? handleUpdateMission : handleCreateMission}
                    className="bg-green-900/30 hover:bg-green-800/40 text-green-400 px-4 py-2 border border-green-400/50 hover:border-green-400 font-mono text-sm transition-all duration-200"
                  >
                    [ENTER] {editingMission ? "UPDATE" : "CREATE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 