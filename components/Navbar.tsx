"use client";

import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Zap, Clock, Award, User, Settings, Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  badge?: string;
}

interface NavbarProps {
  ascentCredits: number;
}

export default function Navbar({ ascentCredits: propAscentCredits }: NavbarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Get Civic user data
  const userContext = useUser();
  const { user, signOut } = userContext;

  // Get wallet address if available
  const walletAddress = userHasWallet(userContext) ? userContext.solana.address : null;

  // Get real player data from backend
  const playerData = useQuery(api.myFunctions.getAugmenteeProfile, {
    userWallet: walletAddress || "demo-wallet"
  });
  
  // Get dynamic counts for navbar badges
  const trainingDrills = useQuery(api.myFunctions.getTrainingDrills) || [];
  const upgradeableItems = useQuery(api.myFunctions.getUpgradeableItems, {
    userWallet: walletAddress || "demo-wallet"
  }) || [];
  const craftingSchematics = useQuery(api.myFunctions.getCraftingSchematics, {
    userWallet: walletAddress || "demo-wallet"  
  }) || [];
  
  // Use real credits and XP from database or fallback to prop
  const ascentCredits = playerData?.ascentCredits ?? propAscentCredits ?? 15420;
  const experiencePoints = playerData?.experiencePoints ?? 0;
  
  // Calculate dynamic counts
  const trainingDrillsCount = trainingDrills.length;
  const techLabItemsCount = upgradeableItems.length + craftingSchematics.length;

  const navigationItems: NavigationItem[] = [
    { id: 'home', label: 'Academy Hub', href: '/', active: pathname === '/' },
    { id: 'training', label: 'Training Drills', href: '/training', badge: trainingDrillsCount.toString(), active: pathname === '/training' },
    { id: 'simulation', label: 'Missions', href: '/simulation', badge: 'NEW', active: pathname === '/simulation' },
    { id: 'augmentee', label: 'Augmentee', href: '/augmentee', active: pathname === '/augmentee' },
    { id: 'techlab', label: 'Tech Lab', href: '/techlab', badge: techLabItemsCount > 0 ? techLabItemsCount.toString() : undefined, active: pathname === '/techlab' },
    { id: 'marketplace', label: 'Market', href: '/marketplace', active: pathname === '/marketplace' },
    { id: 'leaderboards', label: 'Rankings', href: '/leaderboards', active: pathname === '/leaderboards' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const toggleNavigation = () => {
    setIsNavOpen(!isNavOpen);
  };

  const copyWalletAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const handleSignOut = () => {
    signOut();
    setIsProfileOpen(false);
    router.push('/login');
  };

  const activeNavItem = navigationItems.find(item => item.active) || navigationItems[0];

  return (
    <>
      <header className="relative z-50 border-b border-green-400/30 bg-gradient-to-b from-black via-black/95 to-black/90 backdrop-blur-xl shadow-2xl shadow-green-500/10">
        {/* Top Status Bar - Enhanced */}
        <div className="hidden lg:block border-b border-green-400/20 bg-gradient-to-r from-black/60 via-green-950/20 to-black/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-8 py-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center space-x-8 text-gray-300">
                <div className="flex items-center space-x-3 group">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-20" />
                  </div>
                  <span className="tracking-wider group-hover:text-green-300 transition-colors duration-300">SYSTEM STATUS: OPERATIONAL</span>
                </div>
                <div className="flex items-center space-x-3 group hover:text-green-300 transition-colors duration-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tracking-wider">LAST SYNC: {formatDate(currentTime)}</span>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-green-300 font-semibold tracking-wider">
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-400/10 rounded-full border border-green-400/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span>CLEARANCE: LEVEL 2</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-green-400/10 rounded-full border border-green-400/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>NEURAL LINK: STABLE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navbar - Enhanced */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-18 lg:h-24">
            {/* Logo Section - Enhanced */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="relative group cursor-pointer">
                <div className="w-12 h-12 lg:w-16 lg:h-16 relative transition-all duration-500 group-hover:scale-110">
                  <img 
                    src="/images/logo.png"
                    alt="ECHELON Logo"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute -inset-2 bg-gradient-to-br from-green-400/40 via-green-500/30 to-green-600/40 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-green-400/20 to-green-500/20 rounded-2xl blur-sm opacity-50" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl lg:text-3xl font-black tracking-wider text-transparent bg-gradient-to-r from-green-300 via-green-400 to-green-500 bg-clip-text drop-shadow-lg">
                  ECHELON
                </h1>
                <div className="text-xs lg:text-sm text-gray-400 tracking-[0.2em] -mt-1 font-medium">
                  ASCENT ACADEMY
                </div>
              </div>
            </div>

            {/* Desktop Navigation - Dropdown Menu */}
            <div className="hidden lg:block relative">
              <button
                onClick={toggleNavigation}
                className="flex items-center space-x-3 px-6 py-3 text-sm font-semibold transition-all duration-400 rounded-xl group overflow-hidden text-green-300 bg-gradient-to-br from-green-400/15 via-green-400/10 to-green-500/15 shadow-xl shadow-green-500/20 border border-green-400/30 hover:from-green-400/25 hover:to-green-500/25 hover:border-green-400/60"
              >
                <span className="relative z-10 tracking-wide">{activeNavItem.label}</span>
                {activeNavItem.badge && (
                  <div className={`px-2 py-1 text-xs font-bold rounded-full shadow-lg transition-all duration-300 ${
                    activeNavItem.badge === 'NEW' 
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black animate-pulse shadow-yellow-400/50' 
                      : 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-green-400/50'
                  }`}>
                    {activeNavItem.badge}
                  </div>
                )}
                <ChevronDown className={`w-4 h-4 text-green-400 transition-all duration-400 group-hover:text-green-300 ${isNavOpen ? 'rotate-180' : ''}`} />
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/10 to-green-400/0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-400" />
              </button>

              {/* Navigation Dropdown */}
              {isNavOpen && (
                <div className="absolute top-full left-0 mt-3 w-80 bg-gradient-to-br from-black/95 via-green-950/20 to-black/95 border border-green-400/40 rounded-2xl shadow-2xl shadow-green-500/20 backdrop-blur-xl z-50 overflow-hidden">
                  <div className="p-3">
                    <div className="text-xs text-green-400/80 font-semibold tracking-widest uppercase px-4 py-2 mb-2">Navigation Menu</div>
                    {navigationItems.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`w-full flex items-center justify-between px-4 py-3 my-2 rounded-xl transition-all duration-300 group border ${
                          item.active
                            ? 'text-green-300 bg-gradient-to-r from-green-400/15 to-green-500/15 border-green-400/30 shadow-lg shadow-green-500/10'
                            : 'text-gray-300 hover:text-green-300 hover:bg-gradient-to-r hover:from-green-400/10 hover:to-green-500/10 border-transparent hover:border-green-400/20'
                        }`}
                        onClick={() => setIsNavOpen(false)}
                      >
                        <span className="font-medium tracking-wide">{item.label}</span>
                        <div className="flex items-center space-x-2">
                          {item.badge && (
                            <div className={`px-2 py-1 text-xs font-bold rounded-full shadow-md transition-all duration-300 ${
                              item.badge === 'NEW' 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black animate-pulse shadow-yellow-400/50' 
                                : 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-green-400/50'
                            }`}>
                              {item.badge}
                            </div>
                          )}
                          {item.active && (
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Section - Enhanced */}
            <div className="flex items-center space-x-5">
              {/* Time Display - Enhanced */}
              <div className="hidden sm:flex items-center space-x-3 text-green-300 bg-gradient-to-r from-green-400/10 via-green-500/10 to-green-400/10 border border-green-400/20 rounded-xl px-4 py-2.5 backdrop-blur-sm shadow-lg shadow-green-500/10">
                <Clock className="w-4 h-4 text-green-400" />
                <div className="text-sm font-mono font-bold tracking-wider">
                  {formatTime(currentTime)}
                </div>
              </div>

              {/* Credits Display - Enhanced */}
              <div className="flex items-center space-x-3 bg-gradient-to-r from-green-400/15 via-green-500/10 to-green-400/15 border border-green-400/40 rounded-xl px-5 py-3 backdrop-blur-sm hover:from-green-400/25 hover:to-green-400/25 hover:border-green-400/60 transition-all duration-400 group shadow-xl shadow-green-500/15 cursor-pointer">
                <Zap className="w-5 h-5 text-green-400 group-hover:animate-pulse group-hover:text-green-300 transition-colors duration-300" />
                <span className="text-sm font-bold text-green-300 hidden sm:inline tracking-wide">
                  {ascentCredits.toLocaleString()}
                </span>
                <span className="text-xs text-green-400 hidden lg:inline font-semibold tracking-widest">AC</span>
              </div>

              {/* XP Display - Enhanced */}
              <div className="flex items-center space-x-3 bg-gradient-to-r from-green-500/15 via-green-600/10 to-green-500/15 border border-green-500/40 rounded-xl px-5 py-3 backdrop-blur-sm hover:from-green-500/25 hover:to-green-500/25 hover:border-green-500/60 transition-all duration-400 group shadow-xl shadow-green-600/15 cursor-pointer">
                <Award className="w-5 h-5 text-green-500 group-hover:animate-pulse group-hover:text-green-400 transition-colors duration-300" />
                <span className="text-sm font-bold text-green-300 hidden sm:inline tracking-wide">
                  {experiencePoints.toLocaleString()}
                </span>
                <span className="text-xs text-green-500 hidden lg:inline font-semibold tracking-widest">XP</span>
              </div>

              {/* Profile Dropdown - Enhanced */}
              <div className="relative">
                <button
                  onClick={toggleProfile}
                  className="flex items-center space-x-3 p-3 rounded-xl bg-gradient-to-br from-green-400/15 to-green-500/15 border border-green-400/40 hover:from-green-400/25 hover:to-green-500/25 hover:border-green-400/60 transition-all duration-400 group shadow-xl shadow-green-500/15"
                >
                  {user?.picture ? (
                    <img 
                      src={user.picture} 
                      alt={user.name || "User"} 
                      className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-green-400/30 group-hover:shadow-green-400/50 transition-shadow duration-300"
                    />
                  ) : (
                  <div className="w-9 h-9 bg-gradient-to-br from-green-300 via-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-400/30 group-hover:shadow-green-400/50 transition-shadow duration-300">
                    <User className="w-5 h-5 text-black" />
                  </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-green-400 transition-all duration-400 group-hover:text-green-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu - Enhanced */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-gradient-to-br from-black/95 via-green-950/20 to-black/95 border border-green-400/40 rounded-2xl shadow-2xl shadow-green-500/20 backdrop-blur-xl z-50 overflow-hidden">
                    <div className="p-6 border-b border-green-400/30 bg-gradient-to-r from-green-400/5 to-green-500/5">
                      <div className="flex items-center space-x-4">
                        {user?.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name || "User"} 
                            className="w-14 h-14 rounded-xl object-cover shadow-xl shadow-green-400/30"
                          />
                        ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-green-300 via-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-xl shadow-green-400/30">
                          <User className="w-7 h-7 text-black" />
                        </div>
                        )}
                        <div className="flex-1">
                          <div className="text-green-300 font-bold text-lg tracking-wide">{user?.name || "Agent-047"}</div>
                          <div className="text-sm text-green-400/80 font-medium">Recruit Level</div>
                          <div className="text-xs text-gray-400 mt-1">Neural Interface: Active</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Wallet Address Section */}
                    {walletAddress && (
                      <div className="p-4 border-b border-green-400/20 bg-gradient-to-r from-green-400/5 to-green-500/5">
                        <div className="text-xs text-green-400/80 font-semibold tracking-widest uppercase mb-2">Wallet Address</div>
                        <button
                          onClick={copyWalletAddress}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-green-400/20 hover:border-green-400/40 transition-all duration-300 group"
                        >
                          <span className="text-sm text-gray-300 font-mono truncate">
                            {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                          </span>
                          <Copy className={`w-4 h-4 transition-all duration-300 ${copiedWallet ? 'text-green-400' : 'text-gray-400 group-hover:text-green-400'}`} />
                        </button>
                        {copiedWallet && (
                          <div className="text-xs text-green-400 mt-1 font-medium">Address copied to clipboard!</div>
                        )}
                      </div>
                    )}

                    <div className="p-3">
                      <button className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-green-400/10 hover:to-green-500/10 transition-all duration-300 text-gray-300 hover:text-green-300 group border border-transparent hover:border-green-400/20">
                        <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="font-medium">Settings</span>
                      </button>
                      <button className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-green-400/10 hover:to-green-500/10 transition-all duration-300 text-gray-300 hover:text-green-300 group border border-transparent hover:border-green-400/20">
                        <Award className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Achievements</span>
                      </button>
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-red-400/10 hover:to-red-500/10 transition-all duration-300 text-gray-300 hover:text-red-300 group border border-transparent hover:border-red-400/20"
                      >
                        <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button - Enhanced */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-3 rounded-xl bg-gradient-to-br from-green-400/15 to-green-500/15 border border-green-400/40 hover:from-green-400/25 hover:to-green-500/25 hover:border-green-400/60 transition-all duration-400 shadow-lg shadow-green-500/15"
              >
                <div className="relative w-6 h-6">
                  {isMobileMenuOpen ? (
                    <X className="w-6 h-6 text-green-400 animate-in spin-in-90 duration-300" />
                  ) : (
                    <Menu className="w-6 h-6 text-green-400" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - Enhanced */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-green-400/30 bg-gradient-to-b from-black/98 via-green-950/10 to-black/98 backdrop-blur-xl">
            <div className="px-6 py-6 space-y-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all duration-400 group ${
                    item.active
                      ? 'text-green-300 bg-gradient-to-r from-green-400/15 to-green-500/15 border border-green-400/30 shadow-lg shadow-green-500/10'
                      : 'text-gray-300 hover:text-green-300 hover:bg-gradient-to-r hover:from-green-400/10 hover:to-green-500/10 border border-transparent hover:border-green-400/20'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="font-medium tracking-wide">{item.label}</span>
                  {item.badge && (
                    <div className={`px-3 py-1 text-xs font-bold rounded-full shadow-md transition-all duration-300 ${
                      item.badge === 'NEW' 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black animate-pulse shadow-yellow-400/50' 
                        : 'bg-gradient-to-r from-green-400 to-green-500 text-black shadow-green-400/50'
                    }`}>
                      {item.badge}
                    </div>
                  )}
                </Link>
              ))}
              <div className="pt-6 mt-6 border-t border-green-400/20">
                <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-green-400/10 to-green-500/10 rounded-xl border border-green-400/20">
                  <span className="text-gray-400 font-medium tracking-wide">System Time</span>
                  <span className="text-green-300 font-mono font-bold tracking-wider">{formatTime(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Click outside handlers */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsProfileOpen(false)}
        />
      )}
      {isNavOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsNavOpen(false)}
        />
      )}
    </>
  );
}