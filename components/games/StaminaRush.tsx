'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Target, Activity, Trophy, Play, RotateCcw, Heart, Crosshair, Flame, Shield } from 'lucide-react';
import type { GamePerformance } from '../../types/games';

interface StaminaRushProps {
  onGameComplete: (score: number, performance: GamePerformance) => void;
  difficulty: number;
}

interface Target {
  id: number;
  x: number;
  y: number;
  type: 'normal' | 'fast' | 'bonus' | 'danger';
  size: number;
  speed: number;
  direction: { x: number; y: number };
  health: number;
  maxHealth: number;
  points: number;
  timeLeft: number;
  createdAt: number;
}

interface GameState {
  phase: 'instructions' | 'playing' | 'gameOver';
  score: number;
  stamina: number;
  maxStamina: number;
  health: number;
  maxHealth: number;
  combo: number;
  maxCombo: number;
  totalShots: number;
  totalHits: number;
  level: number;
  timeElapsed: number;
  targets: Target[];
  projectiles: Array<{ id: number; x: number; y: number; dx: number; dy: number; damage: number }>;
  powerUps: Array<{ id: number; x: number; y: number; type: 'stamina' | 'health' | 'multishot'; timeLeft: number }>;
  reactionTimes: number[];
  lastShotTime: number;
}

const StaminaRush: React.FC<StaminaRushProps> = ({ onGameComplete, difficulty }) => {
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'instructions',
    score: 0,
    stamina: 100,
    maxStamina: 100,
    health: 100,
    maxHealth: 100,
    combo: 0,
    maxCombo: 0,
    totalShots: 0,
    totalHits: 0,
    level: 1,
    timeElapsed: 0,
    targets: [],
    projectiles: [],
    powerUps: [],
    reactionTimes: [],
    lastShotTime: 0
  });

  const [crosshair, setCrosshair] = useState({ x: 0, y: 0, visible: false });
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number; type: 'hit' | 'miss' | 'combo' | 'powerup'; text?: string }>>([]);

  // Game configuration based on difficulty
  const gameConfig = {
    staminaCost: Math.max(5, 10 - difficulty),
    staminaRegen: 1 + difficulty * 0.5,
    targetSpawnRate: Math.max(300, 1000 - difficulty * 100), // Ensure minimum spawn rate
    targetSpeed: 1 + difficulty * 0.3,
    maxTargets: Math.max(3, 5 + difficulty * 2) // Ensure minimum targets
  };

  // Create new target
  const createTarget = useCallback((): Target => {
    const types = ['normal', 'fast', 'bonus', 'danger'] as const;
    const type = types[Math.floor(Math.random() * types.length)];
    const gameArea = gameAreaRef.current;
    
    if (!gameArea) {
      return {
        id: Date.now(),
        x: 100,
        y: 100,
        type: 'normal',
        size: 40,
        speed: 2,
        direction: { x: 1, y: 0 },
        health: 1,
        maxHealth: 1,
        points: 10,
        timeLeft: 3000,
        createdAt: Date.now()
      };
    }

    const rect = gameArea.getBoundingClientRect();
    const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y, dx, dy;

    switch (edge) {
      case 0: // top
        x = Math.random() * rect.width;
        y = -50;
        dx = (Math.random() - 0.5) * 2;
        dy = Math.random() + 0.5;
        break;
      case 1: // right
        x = rect.width + 50;
        y = Math.random() * rect.height;
        dx = -(Math.random() + 0.5);
        dy = (Math.random() - 0.5) * 2;
        break;
      case 2: // bottom
        x = Math.random() * rect.width;
        y = rect.height + 50;
        dx = (Math.random() - 0.5) * 2;
        dy = -(Math.random() + 0.5);
        break;
      default: // left
        x = -50;
        y = Math.random() * rect.height;
        dx = Math.random() + 0.5;
        dy = (Math.random() - 0.5) * 2;
    }

    const config = {
      normal: { size: 40, health: 1, points: 10, timeLeft: 4000, speed: gameConfig.targetSpeed },
      fast: { size: 25, health: 1, points: 20, timeLeft: 2000, speed: gameConfig.targetSpeed * 1.5 },
      bonus: { size: 60, health: 2, points: 50, timeLeft: 6000, speed: gameConfig.targetSpeed * 0.7 },
      danger: { size: 35, health: 1, points: -20, timeLeft: 5000, speed: gameConfig.targetSpeed * 1.2 }
    }[type];

    return {
      id: Date.now() + Math.random(),
      x,
      y,
      type,
      size: config.size,
      speed: config.speed,
      direction: { x: dx, y: dy },
      health: config.health,
      maxHealth: config.health,
      points: config.points,
      timeLeft: config.timeLeft,
      createdAt: Date.now()
    };
  }, [gameConfig.targetSpeed]);

  // Handle mouse movement
  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState.phase !== 'playing' || !gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    setCrosshair({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true
    });
  };

  // Handle shooting
  const handleShoot = (e: React.MouseEvent) => {
    if (gameState.phase !== 'playing' || gameState.stamina < gameConfig.staminaCost) return;
    
    e.preventDefault();
    const now = Date.now();
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const targetX = e.clientX - rect.left;
    const targetY = e.clientY - rect.top;
    
    // Check if we hit any targets
    let hitTarget = false;
    const newTargets = gameState.targets.map(target => {
      const distance = Math.sqrt(
        Math.pow(target.x - targetX, 2) + Math.pow(target.y - targetY, 2)
      );
      
      if (distance <= target.size / 2) {
        hitTarget = true;
        const newHealth = target.health - 1;
        return { ...target, health: newHealth };
      }
      return target;
    });

    // Calculate reaction time
    const reactionTime = gameState.lastShotTime > 0 ? now - gameState.lastShotTime : 0;
    
    setGameState(prev => {
      const newTotalShots = prev.totalShots + 1;
      const newTotalHits = hitTarget ? prev.totalHits + 1 : prev.totalHits;
      const newCombo = hitTarget ? prev.combo + 1 : 0;
      const newMaxCombo = Math.max(prev.maxCombo, newCombo);
      const newReactionTimes = reactionTime > 0 ? [...prev.reactionTimes, reactionTime] : prev.reactionTimes;
      
      return {
        ...prev,
        stamina: Math.max(0, prev.stamina - gameConfig.staminaCost),
        totalShots: newTotalShots,
        totalHits: newTotalHits,
        combo: newCombo,
        maxCombo: newMaxCombo,
        targets: newTargets,
        reactionTimes: newReactionTimes,
        lastShotTime: now
      };
    });

    // Add visual effect
    setEffects(prev => [...prev, {
      id: Date.now(),
      x: targetX,
      y: targetY,
      type: hitTarget ? 'hit' : 'miss'
    }]);

    // Remove effect after animation
    setTimeout(() => {
      setEffects(prev => prev.filter(effect => effect.id !== Date.now()));
    }, 500);
  };

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState.phase !== 'playing') return;

    const deltaTime = timestamp - lastUpdateRef.current;
    lastUpdateRef.current = timestamp;

    setGameState(prev => {
      let newState = { ...prev };
      
      // Update time
      newState.timeElapsed = prev.timeElapsed + deltaTime / 1000;
      
      // Regenerate stamina
      newState.stamina = Math.min(prev.maxStamina, prev.stamina + gameConfig.staminaRegen * (deltaTime / 1000));
      
      // Update level based on time
      newState.level = Math.floor(newState.timeElapsed / 30) + 1;
      
      // Spawn new targets
      if (prev.targets.length < gameConfig.maxTargets) {
        // Force spawn at least one target in the first 2 seconds if none exist
        if (prev.targets.length === 0 && newState.timeElapsed < 2) {
          const newTarget = createTarget();
          newState.targets = [...prev.targets, newTarget];
          console.log('Force spawned target:', newTarget);
        } else if (Math.random() < (deltaTime / (gameConfig.targetSpawnRate / 10))) {
          const newTarget = createTarget();
          newState.targets = [...prev.targets, newTarget];
          console.log('Spawned target:', newTarget);
        }
      }
      
      // Update targets
      newState.targets = prev.targets
        .map(target => ({
          ...target,
          x: target.x + target.direction.x * target.speed * (deltaTime / 16),
          y: target.y + target.direction.y * target.speed * (deltaTime / 16),
          timeLeft: target.timeLeft - deltaTime
        }))
        .filter(target => {
          // Remove dead or expired targets
          if (target.health <= 0) {
            newState.score += target.points * (newState.combo > 0 ? Math.min(newState.combo * 0.1 + 1, 2) : 1);
            return false;
          }
          
          if (target.timeLeft <= 0) {
            if (target.type === 'danger') {
              newState.health = Math.max(0, newState.health - 20);
            }
            return false;
          }
          
          // Remove targets that are too far off screen
          const gameArea = gameAreaRef.current;
          if (gameArea) {
            const rect = gameArea.getBoundingClientRect();
            if (target.x < -100 || target.x > rect.width + 100 || 
                target.y < -100 || target.y > rect.height + 100) {
              return false;
            }
          }
          
          return true;
        });
      
      // Check game over conditions
      if (newState.health <= 0) {
        newState.phase = 'gameOver';
        
        const performance: GamePerformance = {
          accuracy: newState.totalShots > 0 ? (newState.totalHits / newState.totalShots) * 100 : 0,
          level: newState.level,
          totalShots: newState.totalShots,
          totalHits: newState.totalHits,
          maxCombo: newState.maxCombo,
          averageReactionTime: newState.reactionTimes.length > 0 
            ? newState.reactionTimes.reduce((a, b) => a + b, 0) / newState.reactionTimes.length 
            : 0,
          survivalTime: newState.timeElapsed
        };
        
        onGameComplete(Math.round(newState.score), performance);
      }
      
      return newState;
    });

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.phase, gameConfig, createTarget, onGameComplete]);

  // Start game loop
  useEffect(() => {
    if (gameState.phase === 'playing') {
      lastUpdateRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.phase, gameLoop]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      score: 0,
      stamina: 100,
      health: 100,
      combo: 0,
      maxCombo: 0,
      totalShots: 0,
      totalHits: 0,
      level: 1,
      timeElapsed: 0,
      targets: [],
      reactionTimes: [],
      lastShotTime: 0
    }));
  };

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'instructions'
    }));
  };

  if (gameState.phase === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                <Crosshair className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
                <div className="absolute -inset-2 bg-green-400/10 rounded-full animate-ping" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent mb-2">
                Stamina Rush
              </h1>
              <p className="text-lg text-gray-300 mb-2">High-Intensity Target Elimination</p>
              <div className="w-20 h-1 bg-gradient-to-r from-green-500 to-emerald-400 mx-auto rounded-full" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  How to Play
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Crosshair className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Aim & Shoot</p>
                      <p className="text-gray-300 text-xs">Click on targets to eliminate them before they escape</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Zap className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Manage Stamina</p>
                      <p className="text-gray-300 text-xs">Each shot costs stamina - let it regenerate between shots</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Target Types
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-5 h-5 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Normal (10pts)</p>
                      <p className="text-gray-300 text-xs">Standard targets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Fast (20pts)</p>
                      <p className="text-gray-300 text-xs">Quick moving targets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-6 h-6 bg-green-500 rounded-full mt-0 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Bonus (50pts)</p>
                      <p className="text-gray-300 text-xs">High value, multiple hits</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-5 h-5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">Danger (-20pts)</p>
                      <p className="text-gray-300 text-xs">Avoid or eliminate quickly!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={startGame}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto text-lg shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:scale-105 transform-gpu"
              >
                <Play className="w-5 h-5" />
                Start Rush
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === 'gameOver') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.2)] text-center">
            <Trophy className="w-16 h-16 text-green-400 mx-auto mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold text-green-400 mb-4">Mission Complete!</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-white">{Math.round(gameState.score)}</div>
                <div className="text-green-400 text-sm">Final Score</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-white">{Math.round(gameState.timeElapsed)}s</div>
                <div className="text-green-400 text-sm">Survival Time</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-white">
                  {gameState.totalShots > 0 ? Math.round((gameState.totalHits / gameState.totalShots) * 100) : 0}%
                </div>
                <div className="text-green-400 text-sm">Accuracy</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-white">{gameState.maxCombo}</div>
                <div className="text-green-400 text-sm">Max Combo</div>
              </div>
            </div>
            
            <button
              onClick={resetGame}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-black flex">
      {/* Left Sidebar */}
      <div className="w-80 p-6 space-y-6">
        {/* Player Stats */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Vital Signs
          </h3>
          
          {/* Health */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-400 text-sm flex items-center gap-1">
                <Heart className="w-4 h-4" />
                Health
              </span>
              <span className="text-white font-semibold">{Math.round(gameState.health)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Stamina */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-emerald-400 text-sm flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Stamina
              </span>
              <span className="text-white font-semibold">{Math.round(gameState.stamina)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-green-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(gameState.stamina / gameState.maxStamina) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Score & Combo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-xl font-bold text-white">{Math.round(gameState.score)}</div>
              <div className="text-green-400 text-xs">Score</div>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className={`text-xl font-bold ${gameState.combo > 0 ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>
                {gameState.combo}
              </div>
              <div className="text-emerald-400 text-xs">Combo</div>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Accuracy</span>
              <span className="text-white font-semibold">
                {gameState.totalShots > 0 ? Math.round((gameState.totalHits / gameState.totalShots) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Hits / Shots</span>
              <span className="text-white font-semibold">{gameState.totalHits} / {gameState.totalShots}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Max Combo</span>
              <span className="text-white font-semibold">{gameState.maxCombo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Level</span>
              <span className="text-white font-semibold">{gameState.level}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Time</span>
              <span className="text-white font-semibold">{Math.round(gameState.timeElapsed)}s</span>
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5" />
            Active Targets
          </h3>
          <div className="space-y-2">
            {gameState.targets.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No active targets</p>
            ) : (
              gameState.targets.map(target => (
                <div key={target.id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg">
                  <div 
                    className={`w-4 h-4 rounded-full ${
                      target.type === 'normal' ? 'bg-blue-500' :
                      target.type === 'fast' ? 'bg-yellow-500' :
                      target.type === 'bonus' ? 'bg-green-500' :
                      'bg-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-white text-xs font-medium capitalize">{target.type}</div>
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                      <div 
                        className="bg-green-400 h-1 rounded-full transition-all duration-100"
                        style={{ width: `${(target.timeLeft / (target.type === 'fast' ? 2000 : target.type === 'bonus' ? 6000 : 4000)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{target.points > 0 ? '+' : ''}{target.points}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative w-full h-full max-w-4xl max-h-[600px] bg-black/50 backdrop-blur-sm border border-green-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)]">
          {/* Game Canvas */}
          <div 
            ref={gameAreaRef}
            className="w-full h-full cursor-none relative"
            onMouseMove={handleMouseMove}
            onClick={handleShoot}
            onMouseLeave={() => setCrosshair(prev => ({ ...prev, visible: false }))}
          >
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)
                `,
                backgroundSize: '50px 50px'
              }} />
            </div>

            {/* Targets */}
            {gameState.targets.map(target => (
              <div
                key={target.id}
                className={`absolute rounded-full transition-all duration-100 ${
                  target.type === 'normal' ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' :
                  target.type === 'fast' ? 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse' :
                  target.type === 'bonus' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]' :
                  'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce'
                }`}
                style={{
                  left: target.x - target.size / 2,
                  top: target.y - target.size / 2,
                  width: target.size,
                  height: target.size,
                  border: target.health < target.maxHealth ? '3px solid rgba(255,255,255,0.8)' : 'none'
                }}
              >
                {/* Target Center Dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full opacity-80" />
                </div>
                
                {/* Health Bar for Bonus Targets */}
                {target.type === 'bonus' && target.health < target.maxHealth && (
                  <div className="absolute -top-2 left-0 right-0">
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-green-400 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${(target.health / target.maxHealth) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Time Indicator */}
                <div className="absolute -bottom-1 left-0 right-0">
                  <div className="w-full bg-gray-700 rounded-full h-0.5">
                    <div 
                      className={`h-0.5 rounded-full transition-all duration-100 ${
                        target.type === 'normal' ? 'bg-blue-400' :
                        target.type === 'fast' ? 'bg-yellow-400' :
                        target.type === 'bonus' ? 'bg-green-400' :
                        'bg-green-400'
                      }`}
                      style={{ 
                        width: `${(target.timeLeft / (
                          target.type === 'fast' ? 2000 : 
                          target.type === 'bonus' ? 6000 : 
                          target.type === 'danger' ? 5000 : 4000
                        )) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Visual Effects */}
            {effects.map(effect => (
              <div
                key={effect.id}
                className={`absolute pointer-events-none animate-ping ${
                  effect.type === 'hit' ? 'text-green-400' :
                  effect.type === 'miss' ? 'text-green-400' :
                  effect.type === 'combo' ? 'text-emerald-400' :
                  'text-green-400'
                }`}
                style={{
                  left: effect.x - 15,
                  top: effect.y - 15,
                }}
              >
                {effect.type === 'hit' && (
                  <div className="w-8 h-8 rounded-full bg-green-400/30 border-2 border-green-400" />
                )}
                {effect.type === 'miss' && (
                  <div className="w-8 h-8 rounded-full bg-green-400/30 border-2 border-green-400" />
                )}
                {effect.text && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-bold whitespace-nowrap">
                    {effect.text}
                  </div>
                )}
              </div>
            ))}

            {/* Crosshair */}
            {crosshair.visible && (
              <div
                className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: crosshair.x, top: crosshair.y }}
              >
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-green-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 bg-green-400 rounded-full" />
                  </div>
                  {/* Crosshair Lines */}
                  <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-green-400 transform -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-green-400 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            )}

            {/* Game HUD Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              {/* Left HUD */}
              <div className="space-y-2">
                {gameState.combo > 2 && (
                  <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-3 py-1">
                    <span className="text-emerald-400 font-bold text-sm">COMBO x{gameState.combo}</span>
                  </div>
                )}
                {gameState.stamina < gameConfig.staminaCost && (
                  <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-1">
                    <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      LOW STAMINA
                    </span>
                  </div>
                )}
              </div>

              {/* Right HUD */}
              <div className="text-right space-y-2">
                <div className="bg-black/50 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2">
                  <div className="text-green-400 text-xs">LEVEL</div>
                  <div className="text-white font-bold text-lg">{gameState.level}</div>
                </div>
              </div>
            </div>

            {/* Center Warning for Low Health */}
            {gameState.health <= 30 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/50 rounded-2xl px-6 py-3 animate-pulse">
                  <div className="text-green-400 font-bold text-xl flex items-center gap-2">
                    <Heart className="w-6 h-6" />
                    CRITICAL HEALTH
                  </div>
                </div>
              </div>
            )}

            {/* Stamina Warning */}
            {gameState.stamina <= 20 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none">
                <div className="bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/50 rounded-xl px-4 py-2 animate-bounce">
                  <div className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    RECHARGING STAMINA
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaminaRush;