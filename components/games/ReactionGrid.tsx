'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Zap, Target, RotateCcw, Play, Crosshair, Trophy, Activity, Eye, Timer } from 'lucide-react';
import type { GamePerformance } from '../../types/games';

interface ReactionGridProps {
  onGameComplete: (score: number, performance: GamePerformance) => void;
  difficulty: number;
  gridSize?: number;
  timeLimit?: number;
}

interface GameState {
  phase: 'instructions' | 'playing' | 'results';
  score: number;
  lives: number;
  level: number;
  timeRemaining: number;
  targetsHit: number;
  targetsTotal: number;
  totalReactionTime: number;
  perfectHits: number;
  isComplete: boolean;
  currentTargets: Set<number>;
  targetTimers: Map<number, number>;
}

export default function ReactionGrid({
  onGameComplete,
  difficulty,
  gridSize = 5,
  timeLimit = 30
}: ReactionGridProps) {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'instructions',
    score: 0,
    lives: 3,
    level: 1,
    timeRemaining: timeLimit,
    targetsHit: 0,
    targetsTotal: 0,
    totalReactionTime: 0,
    perfectHits: 0,
    isComplete: false,
    currentTargets: new Set(),
    targetTimers: new Map(),
  });

  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate game parameters based on level and difficulty
  const getGameParams = useCallback(() => {
    const spawnRate = Math.max(1200 - (gameState.level * 80) - (difficulty * 150), 600);
    const targetDuration = Math.max(3500 - (gameState.level * 100) - (difficulty * 150), 1500);
    const maxSimultaneous = Math.min(1 + Math.floor(gameState.level / 3) + Math.floor(difficulty / 3), 4);
    
    return {
      spawnRate,
      targetDuration,
      maxSimultaneous
    };
  }, [gameState.level, difficulty]);

  // Start the game
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      timeRemaining: timeLimit,
      isComplete: false
    }));
    
    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    // Start spawning targets
    const spawnTargets = () => {
      setGameState(currentState => {
        if (currentState.phase !== 'playing' || currentState.isComplete || currentState.timeRemaining <= 0) {
          return currentState;
        }
        
        const params = getGameParams();
        
        if (currentState.currentTargets.size < params.maxSimultaneous && Math.random() > 0.3) {
          const availableCells = [];
          for (let i = 0; i < gridSize * gridSize; i++) {
            if (!currentState.currentTargets.has(i)) {
              availableCells.push(i);
            }
          }
          
          if (availableCells.length > 0) {
            const newTargetCell = availableCells[Math.floor(Math.random() * availableCells.length)];
            const newTargets = new Set(currentState.currentTargets);
            newTargets.add(newTargetCell);
            
            // Set timeout to remove target
            const timeout = setTimeout(() => {
              handleTargetMiss(newTargetCell);
            }, params.targetDuration);
            
            targetTimeoutsRef.current.set(newTargetCell, timeout);
            
            return {
              ...currentState,
              currentTargets: newTargets,
              targetsTotal: currentState.targetsTotal + 1,
              targetTimers: new Map(currentState.targetTimers).set(newTargetCell, Date.now())
            };
          }
        }
        
        return currentState;
      });
    };

    // Start spawning interval
    spawnTargets(); // Spawn first target immediately
    gameIntervalRef.current = setInterval(spawnTargets, getGameParams().spawnRate);
  }, [timeLimit, gridSize, getGameParams]);

  // Handle target hit
  const handleTargetHit = useCallback((cellIndex: number) => {
    setGameState(prev => {
      if (!prev.currentTargets.has(cellIndex) || prev.phase !== 'playing') return prev;

      const hitTime = Date.now();
      const startTime = prev.targetTimers.get(cellIndex);
      const reactionTime = startTime ? hitTime - startTime : 0;
      
      // Clear timeout for this target
      const timeout = targetTimeoutsRef.current.get(cellIndex);
      if (timeout) {
        clearTimeout(timeout);
        targetTimeoutsRef.current.delete(cellIndex);
      }

      // Calculate score
      const baseScore = 100;
      const speedBonus = Math.max(0, (1500 - reactionTime) / 10);
      const levelBonus = prev.level * 10;
      const roundScore = Math.round(baseScore + speedBonus + levelBonus);
      
      // Perfect hit bonus (under 300ms)
      const isPerfect = reactionTime < 300;
      
      const newTargets = new Set(prev.currentTargets);
      newTargets.delete(cellIndex);
      
      const newTimers = new Map(prev.targetTimers);
      newTimers.delete(cellIndex);
      
      return {
        ...prev,
        currentTargets: newTargets,
        targetTimers: newTimers,
        score: prev.score + roundScore,
        targetsHit: prev.targetsHit + 1,
        totalReactionTime: prev.totalReactionTime + reactionTime,
        perfectHits: prev.perfectHits + (isPerfect ? 1 : 0)
      };
    });
  }, []);

  // Handle target miss
  const handleTargetMiss = useCallback((cellIndex: number) => {
    setGameState(prev => {
      if (!prev.currentTargets.has(cellIndex)) return prev;
      
      const newTargets = new Set(prev.currentTargets);
      newTargets.delete(cellIndex);
      
      const newTimers = new Map(prev.targetTimers);
      newTimers.delete(cellIndex);
      
      const newLives = prev.lives - 1;
      
      return {
        ...prev,
        currentTargets: newTargets,
        targetTimers: newTimers,
        lives: newLives
      };
    });
    
    // Clear timeout
    targetTimeoutsRef.current.delete(cellIndex);
  }, []);

  // End game
  const endGame = useCallback(() => {
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
    
    // Clear all target timeouts
    targetTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    targetTimeoutsRef.current.clear();
    
    setGameState(prev => {
      const performance: GamePerformance = {
        accuracy: prev.targetsTotal > 0 ? (prev.targetsHit / prev.targetsTotal) * 100 : 0,
        reactionTime: prev.targetsHit > 0 ? prev.totalReactionTime / prev.targetsHit : 0,
        level: prev.level,
        perfectHits: prev.perfectHits,
        totalTargets: prev.targetsTotal
      };
      
      // Complete the game
      setTimeout(() => onGameComplete(prev.score, performance), 500);
      
      return { ...prev, isComplete: true, phase: 'results' };
    });
  }, [onGameComplete]);

  // Check end conditions
  useEffect(() => {
    if (gameState.phase === 'playing' && (gameState.lives <= 0 || gameState.timeRemaining <= 0)) {
      endGame();
    }
  }, [gameState.lives, gameState.timeRemaining, gameState.phase, endGame]);

  // Level up logic
  useEffect(() => {
    if (gameState.targetsHit > 0 && gameState.targetsHit % 15 === 0) {
      setGameState(prev => ({ ...prev, level: prev.level + 1 }));
    }
  }, [gameState.targetsHit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      targetTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Render cell
  const renderCell = (cellIndex: number) => {
    const isTarget = gameState.currentTargets.has(cellIndex);
    const startTime = gameState.targetTimers.get(cellIndex);
    const timeAlive = startTime ? Date.now() - startTime : 0;
    const params = getGameParams();
    
    return (
      <button
        key={cellIndex}
        onClick={() => handleTargetHit(cellIndex)}
        disabled={gameState.phase !== 'playing'}
        className={`
          aspect-square border-2 rounded-lg transition-all duration-200 relative overflow-hidden
          ${isTarget 
            ? 'border-green-400 bg-green-400/30 shadow-[0_0_30px_rgba(34,197,94,0.8)] cursor-pointer hover:bg-green-400/50 transform hover:scale-105' 
            : 'border-gray-700/30 bg-gray-900/20 cursor-default hover:bg-gray-800/20'
          }
        `}
      >
        {isTarget && (
          <>
            <div className="absolute inset-0 bg-gradient-radial from-green-300/60 via-green-400/40 to-green-500/30 animate-pulse" />
            <Crosshair className="absolute inset-0 m-auto w-4 h-4 md:w-6 md:h-6 text-green-100 drop-shadow-lg animate-spin" />
            {/* Target timer indicator */}
            <div 
              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-300 to-green-500 transition-all duration-100 shadow-sm"
              style={{ 
                width: `${Math.max(0, 100 - (timeAlive / params.targetDuration) * 100)}%`,
                opacity: 0.9
              }}
            />
          </>
        )}
      </button>
    );
  };

  if (gameState.phase === 'instructions') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-6 shadow-xl">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent mb-4">
              Reaction Grid
            </h1>
            <p className="text-xl text-gray-300 font-light">Neural Reflex Enhancement Training</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-black/60 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                How to Play
              </h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Click targets as they appear on the grid</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Faster reactions earn higher scores</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Speed and difficulty increase each level</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Perfect hits (under 300ms) give bonus points</p>
                </div>
              </div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Game Rules
              </h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex justify-between items-center">
                  <span>Time Limit:</span>
                  <span className="text-green-400 font-bold">{timeLimit} seconds</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Lives:</span>
                  <span className="text-green-400 font-bold">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Difficulty:</span>
                  <span className="text-green-400 font-bold">Level {difficulty}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Grid Size:</span>
                  <span className="text-green-400 font-bold">{gridSize}×{gridSize}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={startGame}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 mx-auto text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              <Play className="w-6 h-6" />
              Start Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex overflow-hidden">
      {/* Left Sidebar - Stats */}
      <div className="w-64 xl:w-80 bg-black/80 backdrop-blur-sm border-r border-green-500/30 p-4 xl:p-6 flex flex-col space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-xl xl:text-2xl font-bold text-green-400 flex items-center justify-center gap-2">
            <Activity className="w-5 h-5 xl:w-6 xl:h-6" />
            Training Stats
          </h2>
        </div>
        
        {/* Primary Stats */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-400/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm font-medium">LEVEL</span>
              <Zap className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-white">{gameState.level}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-400/20 to-green-500/20 border border-green-300/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-300 text-sm font-medium">SCORE</span>
              <Trophy className="w-4 h-4 text-green-300" />
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-white">{Math.round(gameState.score).toLocaleString()}</div>
          </div>
        </div>
        
        {/* Secondary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/60 border border-green-500/20 rounded-lg p-3">
            <div className="text-green-400 text-xs font-medium mb-1">LIVES</div>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              {gameState.lives}
              <div className="flex gap-1">
                {Array.from({length: 3}, (_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < gameState.lives ? 'bg-green-400' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-black/60 border border-green-500/20 rounded-lg p-3">
            <div className="text-green-400 text-xs font-medium mb-1">TIME</div>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              {gameState.timeRemaining}s
              <Timer className="w-3 h-3 text-green-400" />
            </div>
          </div>
        </div>
        
        {/* Performance Stats */}
        <div className="space-y-3 pt-4 border-t border-green-500/20">
          <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Performance
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Accuracy</span>
              <span className="text-green-300 font-bold">
                {gameState.targetsTotal > 0 ? Math.round((gameState.targetsHit / gameState.targetsTotal) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Targets Hit</span>
              <span className="text-green-300 font-bold">{gameState.targetsHit}/{gameState.targetsTotal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Perfect Hits</span>
              <span className="text-green-300 font-bold">{gameState.perfectHits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Avg. Reaction</span>
              <span className="text-green-300 font-bold">
                {gameState.targetsHit > 0 ? Math.round(gameState.totalReactionTime / gameState.targetsHit) : 0}ms
              </span>
            </div>
          </div>
        </div>
        
        {/* Active Targets Indicator */}
        <div className="mt-auto">
          <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-400/30 rounded-lg p-3">
            <div className="text-green-400 text-xs font-medium mb-2">ACTIVE TARGETS</div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold text-white">{gameState.currentTargets.size}</div>
              <div className="flex gap-1">
                {Array.from({length: 4}, (_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < gameState.currentTargets.size ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col">
        {/* Status Header */}
        <div className="bg-black/60 backdrop-blur-sm border-b border-green-500/30 p-4 xl:p-6">
          <div className="text-center">
            {gameState.phase === 'playing' && (
              <div className="text-green-400 text-xl xl:text-2xl font-bold flex items-center justify-center gap-2">
                {gameState.currentTargets.size > 0 ? (
                  <>
                    <Crosshair className="w-6 h-6 animate-spin" />
                    Hit the Targets!
                  </>
                ) : (
                  <>
                    <Target className="w-6 h-6" />
                    Get Ready...
                  </>
                )}
              </div>
            )}
            {gameState.phase === 'results' && (
              <div className="text-green-400 text-xl xl:text-2xl font-bold flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6" />
                Training Complete!
              </div>
            )}
          </div>
        </div>

        {/* Game Grid */}
        <div className="flex-1 flex items-center justify-center p-4 xl:p-8">
          <div className="w-full max-w-2xl xl:max-w-3xl">
            <div 
              className="grid gap-2 xl:gap-3 bg-black/90 backdrop-blur-sm p-4 xl:p-8 rounded-2xl border border-green-500/30 shadow-2xl aspect-square"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
            >
              {Array.from({ length: gridSize * gridSize }, (_, index) => renderCell(index))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Overlay */}
      {gameState.phase === 'results' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-black to-gray-900 border border-green-500/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="text-center mb-8">
              <Trophy className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl xl:text-4xl font-bold text-green-400 mb-2">Mission Complete!</h2>
              <div className="text-2xl xl:text-3xl font-bold text-white mb-4">
                Final Score: {Math.round(gameState.score).toLocaleString()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300 mb-1">
                  {Math.round((gameState.targetsHit / gameState.targetsTotal) * 100)}%
                </div>
                <div className="text-gray-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300 mb-1">
                  {gameState.targetsHit}/{gameState.targetsTotal}
                </div>
                <div className="text-gray-400">Targets Hit</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300 mb-1">{gameState.perfectHits}</div>
                <div className="text-gray-400">Perfect Hits</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300 mb-1">
                  {gameState.targetsHit > 0 ? Math.round(gameState.totalReactionTime / gameState.targetsHit) : 0}ms
                </div>
                <div className="text-gray-400">Avg. Reaction</div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
              >
                <RotateCcw className="w-5 h-5" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}