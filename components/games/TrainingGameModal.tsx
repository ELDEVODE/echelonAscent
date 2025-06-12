'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import PatternMatrix from './PatternMatrix';
import ReactionGrid from './ReactionGrid';
import PrecisionTargets from './PrecisionTargets';
import StaminaRush from './StaminaRush';
import type { GamePerformance } from '../../types/games';

interface TrainingGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  drill: {
    id: string;
    name: string;
    category: string;
    difficulty: number;
    description: string;
  };
  onGameComplete: (score: number, performance: any) => void;
}

const TrainingGameModal: React.FC<TrainingGameModalProps> = ({
  isOpen,
  onClose,
  drill,
  onGameComplete
}) => {
  const gameConfig = useQuery(api.trainingGames.getGameConfig, 
    isOpen ? { drillId: drill.id as any } : "skip"
  );

  if (!isOpen) return null;

  const renderGame = () => {
    if (!drill || !gameConfig) return (
      <div className="flex items-center justify-center h-full">
        <div className="text-green-400 text-lg">Loading game...</div>
      </div>
    );

    switch (gameConfig.gameType) {
      case 'pattern_matrix':
        return (
          <PatternMatrix
            onGameComplete={onGameComplete}
            difficulty={gameConfig.baseDifficulty as number}
            gridSize={gameConfig.gridSize}
            timeLimit={gameConfig.timeLimit}
          />
        );
      case 'reaction_grid':
        return (
          <ReactionGrid 
            onGameComplete={onGameComplete}
            difficulty={gameConfig.baseDifficulty as number}
            gridSize={gameConfig.gridSize}
            timeLimit={gameConfig.timeLimit}
          />
        );
      case 'precision_target':
        return (
          <PrecisionTargets 
            onGameComplete={onGameComplete}
            difficulty={gameConfig.baseDifficulty as number}
            gridSize={gameConfig.gridSize}
            timeLimit={gameConfig.timeLimit}
          />
        );
      case 'stamina_rush':
        return (
          <StaminaRush 
            onGameComplete={onGameComplete}
            difficulty={gameConfig.baseDifficulty as number}
          />
        );
      default:
        return (
          <div className="text-center p-8">
            <p className="text-red-400">Game type not implemented: {gameConfig.gameType}</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50">
      <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 md:p-6 border-b border-green-500/30 bg-black/50 backdrop-blur-sm">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-green-400">{drill.name}</h2>
            <p className="text-gray-400 text-sm mt-1 hidden md:block">{drill.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
          </button>
        </div>

        {/* Game Content - Full Screen */}
        <div className="absolute inset-0 pt-16 md:pt-20">
          {renderGame()}
        </div>
      </div>
    </div>
  );
};

export default TrainingGameModal; 