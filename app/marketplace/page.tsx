"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ToastProvider } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import { useUser } from "@civic/auth-web3/react";
import { userHasWallet } from "@civic/auth-web3";

interface BackendMarketplaceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rarity: string;
  description: string;
  icon: string;
  inStock: number;
}

interface MarketplaceItem {
  id: string;
  name: string;
  type: 'schematic' | 'suit_mod' | 'material' | 'bundle';
  category?: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  stock?: number;
  isLimited?: boolean;
  discount?: number;
}

const useToast = () => {
  const [toasts, setToasts] = useState<Array<{id: string, title: string, message: string, type: string}>>([]);

  const success = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'success' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const error = (title: string, message: string) => {
    const id = Date.now().toString();
    const newToast = { id, title, message, type: 'error' };
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  return { success, error, toasts };
};

export default function Marketplace() {
  const userContext = useUser();
  const { user } = userContext;
  
  if (!user) {
    return (
      <div className="h-screen w-full bg-black text-green-400 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🔒</div>
          <div className="text-xl font-bold mb-2">Neural Interface Locked</div>
          <div className="text-gray-400">Authentication required to access marketplace</div>
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
          <div className="text-xl font-bold mb-2">Initializing Commerce Hub</div>
          <div className="text-gray-400">Connecting to neural marketplace...</div>
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
  const marketplaceItemsQuery = useQuery(api.myFunctions.getMarketplaceItems);
  const backendItems = marketplaceItemsQuery || [];
  const purchaseItem = useMutation(api.myFunctions.purchaseItem);

  // Convert backend items to frontend format
  const convertBackendItem = (item: BackendMarketplaceItem): MarketplaceItem => {
    let type: 'schematic' | 'suit_mod' | 'material' | 'bundle' = 'material';
    if (item.category.includes('schematic') || item.category.includes('weapon') || item.category.includes('armor')) {
      type = 'schematic';
    } else if (item.category.includes('mod') || item.category.includes('helmet') || item.category.includes('chest')) {
      type = 'suit_mod';
    } else if (item.category.includes('bundle')) {
      type = 'bundle';
    }

    return {
      id: item.id,
      name: item.name,
      type,
      category: item.category,
      price: item.price,
      rarity: item.rarity as 'common' | 'rare' | 'epic' | 'legendary',
      description: item.description,
      stock: item.inStock,
      isLimited: item.inStock < 10,
      discount: undefined
    };
  };

  const marketplaceItems = backendItems.map(convertBackendItem);

  const [ascentCredits, setAscentCredits] = useState(0);
  const [activeTab, setActiveTab] = useState<'featured' | 'schematics' | 'suit_mods' | 'materials' | 'bundles' | 'trading' | 'auction'>('featured');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'rarity'>('name');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const { success: showSuccessToast, error: showErrorToast, toasts } = useToast();

  useEffect(() => {
    if (playerData) {
      setAscentCredits(playerData.ascentCredits);
    }
  }, [playerData]);

  const handlePurchase = async (item: MarketplaceItem) => {
    if (!canAfford(item.price)) {
      showErrorToast('Insufficient Credits', `You need ${item.price - ascentCredits} more credits.`);
      return;
    }

    setIsProcessing(true);
    
    try {
      await purchaseItem({ 
        userWallet: walletAddress,
        itemId: item.id, 
        price: item.price 
      });
      setAscentCredits(prev => prev - item.price);
      showSuccessToast('Purchase Complete', `${item.name} added to your inventory!`);
      setShowItemDetail(false);
    } catch (error) {
      console.error('Purchase failed:', error);
      showErrorToast('Purchase Failed', 'Unable to complete purchase. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canAfford = (price: number) => ascentCredits >= price;

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

  const getItemIcon = (item: MarketplaceItem) => {
    if (item.type === 'schematic') {
      switch (item.category) {
        case 'weapon': return '🔫';
        case 'armor': return '🛡️';
        case 'utility': return '🔧';
        default: return '📋';
      }
    } else if (item.type === 'suit_mod') {
      switch (item.category) {
        case 'helmet': return '⛑️';
        case 'chest': return '🦾';
        case 'arms': return '🥊';
        case 'legs': return '🦵';
        default: return '✨';
      }
    } else if (item.type === 'material') {
      return '🧪';
    } else if (item.type === 'bundle') {
      return '📦';
    }
    return '🔹';
  };

  const getFilteredItems = () => {
    let filtered = marketplaceItems;

    if (activeTab === 'featured') {
      filtered = filtered.filter(item => item.isLimited || item.discount || item.rarity === 'legendary');
    } else if (activeTab !== 'trading' && activeTab !== 'auction') {
      const typeMapping: Record<string, string> = {
        'schematics': 'schematic',
        'suit_mods': 'suit_mod',
        'materials': 'material',
        'bundles': 'bundle'
      };
      const itemType = typeMapping[activeTab];
      if (itemType) {
        filtered = filtered.filter(item => item.type === itemType);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'rarity') {
        const rarityOrder: Record<string, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
        return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
      }
      return 0;
    });

    return filtered;
  };

  const filteredItems = getFilteredItems();

  const openItemDetail = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setShowItemDetail(true);
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

        {/* Commerce Particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
              className="absolute w-1 h-1 bg-green-400 rounded-full opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${4 + Math.random() * 6}s`
            }}
          />
        ))}
      </div>

        {/* Trading Data Streams */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-pulse" 
               style={{ top: '30%', animationDuration: '2s' }} />
          <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-pulse" 
               style={{ top: '70%', animationDuration: '3s', animationDelay: '1s' }} />
        </div>

      <Navbar ascentCredits={ascentCredits} />

      {/* Processing Overlay */}
      {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-black/90 border border-green-400/50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin mx-auto mb-4" />
              <div className="text-xl font-bold mb-2 text-green-400">PROCESSING TRANSACTION</div>
              <div className="text-sm text-gray-400">Neural commerce network active...</div>
            </div>
          </div>
        )}

        {/* Item Detail Modal */}
        {showItemDetail && selectedItem && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="bg-black/90 border border-green-400/50 rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-green-400">{selectedItem.name}</h3>
                <button
                  onClick={() => setShowItemDetail(false)}
                  className="text-gray-400 hover:text-red-400 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="flex items-center justify-center mb-4">
                <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-4xl ${getRarityBg(selectedItem.rarity)}`}>
                  {getItemIcon(selectedItem)}
                </div>
              </div>

              <div className="text-center mb-4">
                <div className={`text-sm font-bold uppercase ${getRarityColor(selectedItem.rarity)}`}>
                  {selectedItem.rarity} {selectedItem.type.replace('_', ' ')}
                </div>
                {selectedItem.category && (
                  <div className="text-xs text-gray-400 capitalize mt-1">
                    {selectedItem.category}
                  </div>
                )}
              </div>

              <p className="text-gray-400 mb-6 text-center">{selectedItem.description}</p>

              {selectedItem.stock !== undefined && (
                <div className="text-center mb-4">
                  <div className={`text-sm font-bold ${selectedItem.stock <= 5 ? 'text-red-400' : 'text-green-400'}`}>
                    {selectedItem.stock} units in stock
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-green-400">{selectedItem.price.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Ascent Credits</div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowItemDetail(false)}
                  className="flex-1 py-3 bg-gray-400/20 text-gray-400 border border-gray-400/40 rounded-lg font-bold hover:bg-gray-400/30 transition-all duration-200"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handlePurchase(selectedItem)}
                  disabled={!canAfford(selectedItem.price) || isProcessing}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all duration-200 ${
                    canAfford(selectedItem.price) && !isProcessing
                      ? 'bg-green-400/20 text-green-400 border border-green-400/40 hover:bg-green-400/30'
                      : 'bg-gray-400/20 text-gray-400 border border-gray-400/40 cursor-not-allowed'
                  }`}
                >
                  {!canAfford(selectedItem.price) ? 'INSUFFICIENT CREDITS' : 'PURCHASE'}
                </button>
              </div>
          </div>
        </div>
      )}

        <main className="flex-1 p-6 relative z-10 h-full overflow-y-auto pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Enhanced Header */}
            <div className="text-center relative">
              <h2 className="text-5xl font-bold tracking-wider mb-4 text-green-400">
                NEURAL MARKETPLACE
              </h2>
              <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
              <p className="text-xl text-green-300 opacity-90 mb-4">
                Advanced Equipment Exchange • Neural Enhancement Hub • Credits Trading Center
              </p>
              
              {/* Credits Display */}
              <div className="inline-flex items-center space-x-4 bg-black/70 border border-green-400/40 rounded-lg px-6 py-3">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl">💰</div>
                  <div>
                    <div className="text-xs text-gray-400">ASCENT CREDITS</div>
                    <div className="text-xl font-bold text-green-400">{ascentCredits.toLocaleString()}</div>
                  </div>
                </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search neural equipment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-green-400/30 rounded-lg px-4 py-3 pl-10 text-green-400 placeholder-green-400/50 focus:border-green-400 focus:outline-none"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400/50">
                  🔍
                </div>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-black/60 border border-green-400/30 rounded-lg px-4 py-3 text-green-400 focus:border-green-400 focus:outline-none"
              >
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="rarity">Sort by Rarity</option>
              </select>

              <div className="flex items-center justify-center bg-black/40 border border-green-400/20 rounded-lg px-4 py-3">
                <span className="text-sm text-green-300">
                  {filteredItems.length} items available
                </span>
            </div>
          </div>

            {/* Enhanced Tab Navigation */}
            <div className="bg-black/50 p-2 rounded-lg border border-green-400/30">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'featured', label: 'Featured', icon: '⭐', description: 'Curated selections' },
                  { id: 'schematics', label: 'Schematics', icon: '📋', description: 'Equipment blueprints' },
                  { id: 'suit_mods', label: 'Suit Mods', icon: '✨', description: 'Neural enhancements' },
                  { id: 'materials', label: 'Materials', icon: '🧪', description: 'Crafting resources' },
                  { id: 'bundles', label: 'Bundles', icon: '📦', description: 'Value packages' },
                  { id: 'trading', label: 'Trading', icon: '🔄', description: 'Player exchange' },
                  { id: 'auction', label: 'Auctions', icon: '⏰', description: 'Live bidding' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-4 rounded-lg font-bold transition-all duration-300 text-center ${
                    activeTab === tab.id
                        ? 'bg-green-400/20 text-green-400 border border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                        : 'text-gray-400 hover:text-green-300 hover:bg-green-400/10'
                  }`}
                >
                    <div className="text-2xl mb-1">{tab.icon}</div>
                    <div className="text-sm font-bold">{tab.label}</div>
                    <div className="text-xs opacity-60">{tab.description}</div>
                </button>
              ))}
            </div>
          </div>

            {/* Enhanced Content Display */}
            {activeTab === 'trading' ? (
              <div className="bg-black/60 border border-green-400/30 rounded-lg p-8">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔄</div>
                  <div className="text-3xl font-bold mb-4 text-green-400">NEURAL TRADING HUB</div>
                  <div className="text-xl text-gray-400 mb-8">Player-to-player item exchange system</div>
                  <div className="bg-black/40 border border-green-400/20 rounded-lg p-6 max-w-2xl mx-auto">
                    <div className="text-lg text-gray-400 mb-6">
                      Advanced trading features in development:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="space-y-3 text-green-300">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Direct player item exchanges</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Credit-based trading system</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Secure escrow transactions</span>
                        </div>
                      </div>
                      <div className="space-y-3 text-green-300">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Trading reputation system</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Global trade offers board</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Real-time trade notifications</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'auction' ? (
              <div className="bg-black/60 border border-green-400/30 rounded-lg p-8">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⏰</div>
                  <div className="text-3xl font-bold mb-4 text-green-400">NEURAL AUCTION HOUSE</div>
                  <div className="text-xl text-gray-400 mb-8">Live bidding on rare equipment and materials</div>
                  <div className="bg-black/40 border border-green-400/20 rounded-lg p-6 max-w-2xl mx-auto">
                    <div className="text-lg text-gray-400 mb-6">
                      Auction features in development:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="space-y-3 text-green-300">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Real-time bidding system</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Rare item auctions</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Time-limited exclusive sales</span>
                        </div>
                      </div>
                      <div className="space-y-3 text-green-300">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Automatic bid notifications</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Auction history tracking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400">•</span>
                          <span>Reserve price system</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Standard Marketplace Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => {
                const finalPrice = item.discount ? Math.floor(item.price * (1 - item.discount / 100)) : item.price;
                const isAffordable = canAfford(finalPrice);
                const isOutOfStock = item.stock !== undefined && item.stock <= 0;

                return (
                    <div 
                      key={item.id} 
                      className={`group relative bg-black/70 border rounded-lg p-4 transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.3)] cursor-pointer ${getRarityColor(item.rarity)}`}
                      onClick={() => openItemDetail(item)}
                    >
                    <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getRarityBg(item.rarity)}`} />
                    
                    {/* Limited/Discount Badge */}
                    {(item.isLimited || item.discount) && (
                      <div className="absolute -top-2 -right-2 z-20">
                        {item.discount && (
                          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full mb-1">
                            -{item.discount}%
                          </div>
                        )}
                        {item.isLimited && (
                          <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                            LIMITED
                          </div>
                        )}
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Item Icon */}
                      <div className={`w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center text-3xl ${getRarityBg(item.rarity)}`}>
                        {getItemIcon(item)}
                      </div>

                        {/* Item Info */}
                      <div className="text-center mb-3">
                          <h3 className="text-lg font-bold mb-1 text-green-400">{item.name}</h3>
                        <div className={`text-xs font-bold uppercase ${getRarityColor(item.rarity)}`}>
                          {item.rarity} {item.type.replace('_', ' ')}
                        </div>
                        {item.category && (
                            <div className="text-xs text-gray-400 capitalize mt-1">
                            {item.category}
                          </div>
                        )}
                      </div>

                        <p className="text-xs text-gray-400 mb-4 text-center min-h-[3rem] line-clamp-3">
                        {item.description}
                      </p>

                      {/* Stock Info */}
                      {item.stock !== undefined && (
                        <div className="text-center mb-3">
                          <div className={`text-xs font-bold ${item.stock <= 5 ? 'text-red-400' : 'text-green-400'}`}>
                            {item.stock} in stock
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      <div className="text-center mb-4">
                        {item.discount ? (
                          <div>
                              <div className="text-sm text-gray-400 line-through">{item.price.toLocaleString()}</div>
                              <div className="text-xl font-bold text-green-400">{finalPrice.toLocaleString()}</div>
                          </div>
                        ) : (
                            <div className="text-xl font-bold text-green-400">{item.price.toLocaleString()}</div>
                        )}
                        <div className="text-xs text-gray-400">Ascent Credits</div>
                      </div>

                        {/* Status Indicator */}
                        <div className="text-center">
                          <div className={`text-sm font-bold ${
                            isOutOfStock
                              ? 'text-red-400'
                              : isAffordable
                              ? 'text-green-400'
                              : 'text-gray-400'
                          }`}>
                            {isOutOfStock ? 'OUT OF STOCK' : isAffordable ? 'AVAILABLE' : 'INSUFFICIENT CREDITS'}
                          </div>
                        </div>
                    </div>
                  </div>
                );
              })}

            {filteredItems.length === 0 && (
                  <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                    <div className="text-xl font-bold mb-2 text-green-400">No items found</div>
                <div className="text-gray-400">Try adjusting your search or filter criteria</div>
              </div>
            )}
          </div>
            )}
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-black/90 border rounded-lg p-4 shadow-[0_0_20px_rgba(34,197,94,0.3)] backdrop-blur-sm animate-in slide-in-from-right-full duration-300 ${
              toast.type === 'error' ? 'border-red-400/50' : 'border-green-400/50'
            }`}
            style={{ minWidth: '300px' }}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-3 h-3 rounded-full mt-1 animate-pulse ${
                toast.type === 'error' ? 'bg-red-400' : 'bg-green-400'
              }`} />
              <div className="flex-1">
                <div className={`font-bold text-sm mb-1 ${
                  toast.type === 'error' ? 'text-red-400' : 'text-green-400'
                }`}>
                  {toast.title}
                </div>
                <div className={`text-xs ${
                  toast.type === 'error' ? 'text-red-300' : 'text-green-300'
                }`}>
                  {toast.message}
                </div>
              </div>
              </div>
            </div>
          ))}
          </div>
        
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}