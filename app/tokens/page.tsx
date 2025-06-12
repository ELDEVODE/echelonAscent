"use client";

import React from 'react';
import TokenDashboard from '@/components/TokenDashboard';
import { WalletProvider } from '@/components/WalletProvider';
import Navbar from '@/components/Navbar';

export default function TokensPage() {
  return (
    <div className="min-h-screen bg-black text-green-400">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="w-full h-full opacity-10"
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
      <div className="fixed inset-0 pointer-events-none z-0">
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

      {/* Content */}
      <div className="relative z-10">
        <Navbar ascentCredits={0} />
        
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-green-400 mb-2 font-mono">
                [ASCENT TOKEN INTERFACE]
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mb-4" />
              <p className="text-green-400/80 font-mono">
                MANAGE YOUR ASCENT TOKENS AND BRIDGE OPERATIONS
              </p>
            </div>
          </div>

          <div className="bg-black/60 border border-green-400/30 rounded-xl p-6 backdrop-blur-sm">
            <WalletProvider>
              <TokenDashboard />
            </WalletProvider>
          </div>
        </main>

        {/* Terminal-style Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-black/80 border-t border-green-400/30 p-2 text-xs font-mono text-green-400/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center">
              <div>[SYSTEM: ONLINE]</div>
              <div>[SECURE-CHANNEL: ACTIVE]</div>
              <div>[TOKEN-PROTOCOL: v1.0.0]</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 