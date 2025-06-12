"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { userHasWallet } from '@civic/auth-web3';
import { PublicKey } from '@solana/web3.js';
import { AscentTokenManager } from '../lib/solana';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

// Types
interface WalletContextType {
  // Civic Auth
  user: any | null;  // Using any for Civic user to avoid type conflicts
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Wallet Info
  walletAddress: string | null;
  publicKey: PublicKey | null;
  
  // Token Balances
  balances: {
    onChain: number;
    offChain: number;
    total: number;
  } | null;
  
  // Actions
  refreshBalance: () => Promise<void>;
  syncOnChainBalance: () => Promise<void>;
  bridgeToChain: (amount: number) => Promise<string>;
  bridgeFromChain: (amount: number) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const userContext = useUser();
  const { user, signIn, signOut, isLoading } = userContext;

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [balances, setBalances] = useState<{
    onChain: number;
    offChain: number;
    total: number;
  } | null>(null);

  // Convex queries and mutations
  const tokenBalance = useQuery(
    api.tokens.getPlayerBalance,
    walletAddress ? { walletAddress } : "skip"
  );

  const syncBalance = useAction(api.tokens.syncTokenBalance);
  const bridgeToChainMutation = useMutation(api.tokens.requestBridgeToChain);
  const bridgeFromChainMutation = useMutation(api.tokens.requestBridgeFromChain);

  // Update wallet info when user changes
  useEffect(() => {
    // Use userHasWallet to check if user has a wallet, then get the address
    if (userHasWallet(userContext)) {
      const address = userContext.solana.address;
      setWalletAddress(address);
      
      try {
        const pubkey = new PublicKey(address);
        setPublicKey(pubkey);
      } catch (error) {
        console.error('Invalid wallet address:', error);
        setPublicKey(null);
      }
    } else {
      setWalletAddress(null);
      setPublicKey(null);
      setBalances(null);
    }
  }, [userContext]);

  // Update balances when token balance changes
  useEffect(() => {
    if (tokenBalance) {
      setBalances({
        onChain: tokenBalance.onChainBalance,
        offChain: tokenBalance.offChainBalance,
        total: tokenBalance.totalBalance,
      });
    }
  }, [tokenBalance]);

  // Refresh balance from blockchain
  const refreshBalance = async (): Promise<void> => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    try {
      const tokenManager = new AscentTokenManager();
      const onChainBalance = await tokenManager.getTokenBalance(walletAddress);
      
      // Sync with database
      await syncBalance({
        walletAddress,
        onChainBalance,
      });
    } catch (error) {
      console.error('Error refreshing balance:', error);
      throw error;
    }
  };

  // Sync on-chain balance
  const syncOnChainBalance = async (): Promise<void> => {
    await refreshBalance();
  };

  // Bridge tokens to chain
  const bridgeToChain = async (amount: number): Promise<string> => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      const result = await bridgeToChainMutation({
        walletAddress,
        amount,
      });

      return result.requestId;
    } catch (error) {
      console.error('Error bridging to chain:', error);
      throw error;
    }
  };

  // Bridge tokens from chain
  const bridgeFromChain = async (amount: number): Promise<string> => {
    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    try {
      const result = await bridgeFromChainMutation({
        walletAddress,
        amount,
      });

      return result.requestId;
    } catch (error) {
      console.error('Error bridging from chain:', error);
      throw error;
    }
  };

  const contextValue: WalletContextType = {
    // Civic Auth
    user,
    isLoading,
    isAuthenticated: !!user,
    login: signIn,
    logout: signOut,
    
    // Wallet Info
    walletAddress,
    publicKey,
    
    // Token Balances
    balances,
    
    // Actions
    refreshBalance,
    syncOnChainBalance,
    bridgeToChain,
    bridgeFromChain,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Wallet connection component
export function WalletButton() {
  const { user, login, logout, isLoading, walletAddress } = useWallet();

  if (isLoading) {
    return (
      <button
        disabled
        className="bg-gray-600 text-gray-300 px-4 py-2 rounded-lg font-mono text-sm border border-gray-500"
      >
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm font-mono">
          <div className="text-green-400">Connected</div>
          <div className="text-gray-400 text-xs">
            {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
          </div>
        </div>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-mono transition-colors border border-red-500"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-mono text-sm transition-colors border border-blue-500"
    >
      Connect Wallet
    </button>
  );
}

// Token balance display component
export function TokenBalanceDisplay() {
  const { balances, refreshBalance, isAuthenticated } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBalance();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-cyan-500 rounded-lg p-4 font-mono">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-cyan-400 font-bold">ASCENT Credits</h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-xs text-gray-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {balances ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">On-Chain:</span>
            <span className="text-green-400">{balances.onChain.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Off-Chain:</span>
            <span className="text-blue-400">{balances.offChain.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between font-bold">
              <span className="text-white">Total:</span>
              <span className="text-cyan-400">{balances.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-center">Loading...</div>
      )}
    </div>
  );
}

// Bridge component
export function TokenBridge() {
  const { balances, bridgeToChain, bridgeFromChain, isAuthenticated } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [direction, setDirection] = useState<'to_chain' | 'from_chain'>('to_chain');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isAuthenticated || !balances) {
    return null;
  }

  const handleBridge = async () => {
    const bridgeAmount = parseFloat(amount);
    if (isNaN(bridgeAmount) || bridgeAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      let requestId: string;
      
      if (direction === 'to_chain') {
        if (bridgeAmount > balances.offChain) {
          alert('Insufficient off-chain balance');
          return;
        }
        requestId = await bridgeToChain(bridgeAmount);
      } else {
        if (bridgeAmount > balances.onChain) {
          alert('Insufficient on-chain balance');
          return;
        }
        requestId = await bridgeFromChain(bridgeAmount);
      }
      
      alert(`Bridge request submitted: ${requestId}`);
      setAmount('');
    } catch (error) {
      console.error('Bridge error:', error);
      alert('Bridge failed: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-cyan-500 rounded-lg p-4 font-mono">
      <h3 className="text-cyan-400 font-bold mb-4">Token Bridge</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Direction:</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'to_chain' | 'from_chain')}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            disabled={isProcessing}
          >
            <option value="to_chain">Off-Chain → On-Chain</option>
            <option value="from_chain">On-Chain → Off-Chain</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            disabled={isProcessing}
            min="0"
            step="0.000001"
          />
          <div className="text-xs text-gray-500 mt-1">
            Available: {direction === 'to_chain' ? balances.offChain : balances.onChain} ASCENT
          </div>
        </div>
        
        <button
          onClick={handleBridge}
          disabled={isProcessing || !amount}
          className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white py-2 rounded transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Bridge Tokens'}
        </button>
      </div>
    </div>
  );
} 