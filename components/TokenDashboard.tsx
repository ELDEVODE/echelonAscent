"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useWallet, TokenBalanceDisplay, TokenBridge } from './WalletProvider';

interface TransactionItemProps {
  transaction: {
    id: string;
    type: string;
    amount: number;
    direction: 'credit' | 'debit';
    description: string;
    timestamp: number;
    transactionSignature?: string;
  };
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const { type, amount, direction, description, timestamp, transactionSignature } = transaction;
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reward': return '🎁';
      case 'bridge_to_chain': return '🌐';
      case 'bridge_from_chain': return '⬇️';
      case 'transfer': return '💸';
      case 'spend': return '🛒';
      case 'mint': return '⚡';
      default: return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reward': return 'text-green-400';
      case 'bridge_to_chain': return 'text-blue-400';
      case 'bridge_from_chain': return 'text-purple-400';
      case 'transfer': return 'text-yellow-400';
      case 'spend': return 'text-red-400';
      case 'mint': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`text-xl ${getTypeColor(type)}`}>
          {getTypeIcon(type)}
        </div>
        <div>
          <div className="font-semibold text-white">{description}</div>
          <div className="text-xs text-gray-400">
            {new Date(timestamp).toLocaleString()}
          </div>
          {transactionSignature && (
            <div className="text-xs text-blue-400 truncate max-w-[200px]">
              Tx: {transactionSignature.slice(0, 8)}...{transactionSignature.slice(-8)}
            </div>
          )}
        </div>
      </div>
      <div className={`font-bold ${direction === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
        {direction === 'credit' ? '+' : '-'}{amount.toLocaleString()} ASCENT
      </div>
    </div>
  );
};

interface BridgeRequestItemProps {
  request: {
    id: string;
    direction: 'to_chain' | 'from_chain';
    amount: number;
    status: string;
    requestedAt: number;
    errorMessage?: string;
  };
}

const BridgeRequestItem: React.FC<BridgeRequestItemProps> = ({ request }) => {
  const { direction, amount, status, requestedAt, errorMessage } = request;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'processing': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getDirectionText = (direction: string) => {
    return direction === 'to_chain' ? 'To Chain' : 'From Chain';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
      <div>
        <div className="font-semibold text-white">
          Bridge {getDirectionText(direction)}
        </div>
        <div className="text-sm text-gray-400">
          {amount.toLocaleString()} ASCENT
        </div>
        <div className="text-xs text-gray-500">
          {new Date(requestedAt).toLocaleString()}
        </div>
        {errorMessage && (
          <div className="text-xs text-red-400 mt-1">
            Error: {errorMessage}
          </div>
        )}
      </div>
      <div className={`font-bold ${getStatusColor(status)} uppercase text-sm`}>
        {status}
      </div>
    </div>
  );
};

const TokenDashboard: React.FC = () => {
  const { walletAddress, isAuthenticated, refreshBalance } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'bridge'>('overview');

  // Fetch data
  const transactions = useQuery(
    api.tokens.getTransactionHistory,
    walletAddress ? { walletAddress, limit: 20 } : "skip"
  );

  const bridgeRequests = useQuery(
    api.tokens.getPendingBridgeRequests,
    walletAddress ? { walletAddress } : "skip"
  );

  const tokenStats = useQuery(api.tokens.getTokenStats);

  const createBalance = useMutation(api.tokens.createTokenBalance);

  // Initialize balance record if needed
  const initializeBalance = async () => {
    if (walletAddress) {
      try {
        await createBalance({ walletAddress });
        await refreshBalance();
      } catch (error) {
        console.error('Failed to initialize balance:', error);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-800 border border-cyan-500 rounded-lg p-6 text-center">
        <div className="text-cyan-400 text-2xl mb-4">🔒</div>
        <h3 className="text-cyan-400 font-bold text-lg mb-2">Wallet Not Connected</h3>
        <p className="text-gray-400">Connect your wallet to view token information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-cyan-400 font-mono mb-2">
          ASCENT TOKEN DASHBOARD
        </h2>
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 bg-gray-900 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'transactions', label: 'Transactions', icon: '📋' },
          { id: 'bridge', label: 'Bridge', icon: '🌉' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'transactions' | 'bridge')}
            className={`flex-1 py-2 px-4 rounded font-mono text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-cyan-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Display */}
          <TokenBalanceDisplay />

          {/* Token Stats */}
          {tokenStats && (
            <div className="bg-gray-800 border border-cyan-500 rounded-lg p-4 font-mono">
              <h3 className="text-cyan-400 font-bold mb-3">Network Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Supply:</span>
                  <span className="text-green-400">{tokenStats.totalSupply.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">On-Chain:</span>
                  <span className="text-blue-400">{tokenStats.totalOnChain.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Off-Chain:</span>
                  <span className="text-purple-400">{tokenStats.totalOffChain.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holders:</span>
                  <span className="text-yellow-400">{tokenStats.totalHolders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pending Bridges:</span>
                  <span className="text-red-400">{tokenStats.pendingBridges}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 border border-cyan-500 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-3 font-mono">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={refreshBalance}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-mono text-sm transition-colors"
                >
                  🔄 Refresh Balance
                </button>
                <button
                  onClick={initializeBalance}
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-mono text-sm transition-colors"
                >
                  ⚡ Initialize Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-cyan-400 font-bold font-mono">Transaction History</h3>
            {transactions && (
              <span className="text-gray-400 text-sm">
                {transactions.length} transactions
              </span>
            )}
          </div>
          
          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-400">No transactions yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Complete missions and training to earn ASCENT tokens
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bridge' && (
        <div className="space-y-6">
          {/* Bridge Interface */}
          <TokenBridge />

          {/* Pending Bridge Requests */}
          {bridgeRequests && bridgeRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-cyan-400 font-bold font-mono">Pending Bridge Requests</h3>
              <div className="space-y-3">
                {bridgeRequests.map((request) => (
                  <BridgeRequestItem key={request.id} request={request} />
                ))}
              </div>
            </div>
          )}

          {/* Bridge Info */}
          <div className="bg-gray-800 border border-cyan-500 rounded-lg p-4">
            <h3 className="text-cyan-400 font-bold mb-3 font-mono">Bridge Information</h3>
            <div className="text-sm text-gray-400 space-y-2">
              <p>• Bridge operations may take 1-5 minutes to complete</p>
              <p>• On-chain tokens can be used for P2P transfers and DeFi</p>
              <p>• Off-chain tokens are optimized for fast gameplay</p>
              <p>• Bridge fees are automatically deducted from transfers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDashboard; 