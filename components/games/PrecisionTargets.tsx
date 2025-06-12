'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Target, Crosshair, RotateCcw, Play, Trophy, Activity, Eye, Timer, Zap, Focus, Heart, Circle, TrendingUp, Award } from 'lucide-react';
import type { GamePerformance } from '../../types/games';

interface PrecisionTargetsProps {
  onGameComplete: (score: number, performance: GamePerformance) => void;
  difficulty: number;
  gridSize?: number;
  timeLimit?: number;
}

interface TargetData {
  id: number;
  x: number;
  y: number;
  size: number;
  timeAlive: number;
  maxDuration: number;
  points: number;
  isHit: boolean;
}

interface GameState {
  phase: 'instructions' | 'playing' | 'results';
  score: number;
  level: number;
  lives: number;
  timeRemaining: number;
  targets: TargetData[];
  targetsHit: number;
  targetsTotal: number;
  perfectHits: number;
  totalReactionTime: number;
  isComplete: boolean;
  nextTargetId: number;
}

export default function PrecisionTargets({
  onGameComplete,
  difficulty,
  gridSize = 6,
  timeLimit = 45
}: PrecisionTargetsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const [gameState, setGameState] = useState<GameState>({
    phase: 'instructions',
    score: 0,
    level: 1,
    lives: 3,
    timeRemaining: timeLimit,
    targets: [],
    targetsHit: 0,
    targetsTotal: 0,
    perfectHits: 0,
    totalReactionTime: 0,
    isComplete: false,
    nextTargetId: 1
  });

  // Calculate game parameters based on level and difficulty
  const getGameParams = useCallback(() => {
    const spawnRate = Math.max(2500 - (gameState.level * 100) - (difficulty * 150), 1000);
    const targetDuration = Math.max(6000 - (gameState.level * 80) - (difficulty * 100), 3500);
    const maxSimultaneous = Math.min(1 + Math.floor(gameState.level / 4) + Math.floor(difficulty / 3), 3);
    const minTargetSize = Math.max(60 - (gameState.level * 3) - (difficulty * 4), 35);
    const maxTargetSize = Math.max(120 - (gameState.level * 4) - (difficulty * 6), 60);
    
    return {
      spawnRate,
      targetDuration,
      maxSimultaneous,
      minTargetSize,
      maxTargetSize
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
        const container = containerRef.current;
        if (!container) return currentState;
        
        const containerRect = container.getBoundingClientRect();
        const activeTargets = currentState.targets.filter(t => !t.isHit);
        
        if (activeTargets.length < params.maxSimultaneous && Math.random() > 0.4) {
          const targetSize = Math.random() * (params.maxTargetSize - params.minTargetSize) + params.minTargetSize;
          const margin = targetSize / 2 + 20;
          
          const x = Math.random() * (containerRect.width - margin * 2) + margin;
          const y = Math.random() * (containerRect.height - margin * 2) + margin;
          
          // Calculate points based on target size (smaller = more points)
          const sizeRatio = (params.maxTargetSize - targetSize) / (params.maxTargetSize - params.minTargetSize);
          const basePoints = Math.round(50 + sizeRatio * 100);
          
          const newTarget: TargetData = {
            id: currentState.nextTargetId,
            x,
            y,
            size: targetSize,
            timeAlive: 0,
            maxDuration: params.targetDuration,
            points: basePoints,
            isHit: false
          };
          
          // Set timeout to remove target
          const timeout = setTimeout(() => {
            handleTargetTimeout(newTarget.id);
          }, params.targetDuration);
          
          targetTimeoutsRef.current.set(newTarget.id, timeout);
          
          return {
            ...currentState,
            targets: [...currentState.targets, newTarget],
            targetsTotal: currentState.targetsTotal + 1,
            nextTargetId: currentState.nextTargetId + 1
          };
        }
        
        return currentState;
      });
    };

    // Start spawn interval
    gameIntervalRef.current = setInterval(spawnTargets, 1000);
    
    // Spawn first target immediately
    setTimeout(spawnTargets, 300);
  }, [getGameParams, timeLimit]);

  // Handle target hit
  const handleTargetHit = useCallback((targetId: number, event: React.MouseEvent) => {
    if (gameState.phase !== 'playing' || gameState.isComplete) return;
    
    const target = gameState.targets.find(t => t.id === targetId && !t.isHit);
    if (!target) return;
    
    const reactionTime = target.timeAlive;
    const speedBonus = Math.max(0, (target.maxDuration - reactionTime) / target.maxDuration) * 50;
    const finalScore = target.points + speedBonus;
    
    // Clear timeout for this target
    const timeout = targetTimeoutsRef.current.get(targetId);
    if (timeout) {
      clearTimeout(timeout);
      targetTimeoutsRef.current.delete(targetId);
    }
    
    // Check if it's a perfect hit (fast reaction)
    const isPerfect = reactionTime < 500;
    
    setGameState(prev => {
      const updatedTargets = prev.targets.map(t => 
        t.id === targetId ? { ...t, isHit: true } : t
      );
      
      const newScore = prev.score + finalScore;
      const newLevel = 1 + Math.floor(newScore / 1000);
      
      return {
        ...prev,
        targets: updatedTargets,
        score: newScore,
        level: newLevel,
        targetsHit: prev.targetsHit + 1,
        perfectHits: prev.perfectHits + (isPerfect ? 1 : 0),
        totalReactionTime: prev.totalReactionTime + reactionTime
      };
    });
    
    // Create hit effect
    createHitEffect(event.clientX, event.clientY, isPerfect);
  }, [gameState.phase, gameState.isComplete, gameState.targets]);

  // Handle target timeout (miss)
  const handleTargetTimeout = useCallback((targetId: number) => {
    setGameState(prev => {
      const updatedTargets = prev.targets.filter(t => t.id !== targetId);
      const newLives = prev.lives - 1;
      
      return {
        ...prev,
        targets: updatedTargets,
        lives: newLives
      };
    });
    
    targetTimeoutsRef.current.delete(targetId);
  }, []);

  // Create hit effect animation
  const createHitEffect = (x: number, y: number, isPerfect: boolean) => {
    const effect = document.createElement('div');
    effect.className = `fixed pointer-events-none z-50 ${isPerfect ? 'text-green-300' : 'text-green-400'} font-bold text-xl animate-ping`;
    effect.style.left = `${x}px`;
    effect.style.top = `${y}px`;
    effect.style.transform = 'translate(-50%, -50%)';
    effect.textContent = isPerfect ? 'PERFECT!' : '+' + Math.round(Math.random() * 100 + 50);
    
    document.body.appendChild(effect);
    setTimeout(() => document.body.removeChild(effect), 1000);
  };

  // Update target timers
  useEffect(() => {
    if (gameState.phase === 'playing' && !gameState.isComplete) {
      const interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          targets: prev.targets.map(target => ({
            ...target,
            timeAlive: target.timeAlive + 100
          }))
        }));
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [gameState.phase, gameState.isComplete]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      targetTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Render target
  const renderTarget = (target: TargetData) => {
    if (target.isHit) return null;
    
    const lifePercent = (target.maxDuration - target.timeAlive) / target.maxDuration;
    const scale = 0.9 + (Math.sin(target.timeAlive / 150) * 0.08);
    const urgency = lifePercent < 0.3 ? 'animate-pulse' : '';
    
    return (
      <div
        key={target.id}
        className={`absolute cursor-crosshair transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${urgency}`}
        style={{
          left: target.x,
          top: target.y,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: target.size,
          height: target.size
        }}
        onClick={(e) => handleTargetHit(target.id, e)}
      >
        <div className="relative w-full h-full">
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-green-400/20 blur-lg animate-pulse" />
          
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-green-400 bg-gradient-to-br from-green-400/30 to-emerald-500/30 shadow-xl" />
          
          {/* Middle ring */}
          <div className="absolute inset-[12%] rounded-full border-3 border-emerald-400 bg-gradient-to-br from-emerald-400/25 to-green-400/25" />
          
          {/* Inner circle (bullseye) */}
          <div className="absolute inset-[30%] rounded-full border-2 border-green-300 bg-gradient-to-br from-green-300/50 to-emerald-300/50 flex items-center justify-center shadow-lg">
            <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse shadow-inner" />
          </div>
          
          {/* Timer arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent">
            <div 
              className="absolute inset-0 rounded-full border-2 border-green-300 transition-all duration-100"
              style={{ 
                clipPath: `polygon(50% 0%, 50% 50%, ${50 + 50 * Math.cos((lifePercent * 2 * Math.PI) - Math.PI/2)}% ${50 + 50 * Math.sin((lifePercent * 2 * Math.PI) - Math.PI/2)}%, 50% 50%)`
              }}
            />
          </div>
          
          {/* Points indicator */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-300 bg-black/70 px-2 py-1 rounded-full border border-green-400/30 backdrop-blur-sm">
            {target.points}
          </div>
        </div>
      </div>
    );
  };

  if (gameState.phase === 'instructions') {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 via-black to-green-900/20 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl">
                <Target className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-green-400 via-emerald-500 to-green-600 bg-clip-text text-transparent mb-3 tracking-tight">
              PRECISION TARGETS
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-light tracking-wide">Neural Accuracy Enhancement Training</p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-medium text-sm">Difficulty Level {difficulty}</span>
            </div>
          </div>
          
          {/* Game Info Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* How to Play */}
            <div className="bg-gradient-to-br from-black/80 to-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 shadow-xl">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <Focus className="w-5 h-5" />
                How to Play
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Crosshair, text: "Click targets quickly" },
                  { icon: Circle, text: "Smaller = more points" },
                  { icon: TrendingUp, text: "Speed bonuses" },
                  { icon: Award, text: "Perfect hits <500ms" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-gray-300 text-sm font-medium">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Game Rules */}
            <div className="bg-gradient-to-br from-black/80 to-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 shadow-xl">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Game Rules
              </h3>
              <div className="space-y-2">
                {[
                  { label: "Time Limit", value: `${timeLimit}s`, icon: Timer },
                  { label: "Lives", value: "3", icon: Heart },
                  { label: "Miss Penalty", value: "-1 Life", icon: Target },
                  { label: "Level Up", value: "1000pts", icon: Trophy }
                ].map((rule, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <rule.icon className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300 text-sm font-medium">{rule.label}</span>
                    </div>
                    <span className="text-green-400 font-bold text-sm">{rule.value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Performance Tips */}
            <div className="bg-gradient-to-br from-black/80 to-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 shadow-xl md:col-span-2 lg:col-span-1">
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Pro Tips
              </h3>
              <div className="space-y-2">
                {[
                  "Stay centered",
                  "Use peripherals",
                  "Quick movements",
                  "Don't chase"
                ].map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                    <p className="text-gray-300 text-sm font-medium">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Start Button */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-50 animate-pulse" />
              <button
                onClick={startGame}
                className="relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95"
              >
                <Play className="w-6 h-6" />
                Begin Training
                <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

      return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-black to-green-900/20 flex overflow-hidden">
      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-sm border-b border-green-500/30">
        <div className="flex items-center justify-between p-4">
          {/* Left Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold text-lg">{Math.round(gameState.score).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold">LVL {gameState.level}</span>
            </div>
          </div>
          
          {/* Center Status */}
          <div className="text-center">
            {gameState.phase === 'playing' && (
              <div className="text-green-400 text-xl font-bold flex items-center gap-2">
                {gameState.targets.filter(t => !t.isHit).length > 0 ? (
                  <>
                    <Crosshair className="w-5 h-5 animate-spin" />
                    ENGAGE TARGETS
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    SCANNING...
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Right Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-green-400" />
              <span className="text-white font-bold text-lg">{gameState.timeRemaining}s</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-green-400" />
              <div className="flex gap-1">
                {Array.from({length: 3}, (_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < gameState.lives ? 'bg-green-400' : 'bg-gray-600'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Sidebar - Compact Stats */}
      <div className="w-20 lg:w-64 bg-black/90 backdrop-blur-sm border-r border-green-500/30 pt-20 p-2 lg:p-4 flex flex-col">
        <div className="hidden lg:block">
          <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Stats
          </h2>
        </div>
        
        {/* Performance Metrics */}
        <div className="space-y-3 flex-1">
          {/* Accuracy */}
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-400/30 rounded-lg p-3">
            <div className="lg:hidden flex justify-center mb-2">
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <div className="hidden lg:flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm font-medium">ACCURACY</span>
              <Eye className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white text-center lg:text-left">
              {gameState.targetsTotal > 0 ? Math.round((gameState.targetsHit / gameState.targetsTotal) * 100) : 0}%
            </div>
          </div>
          
          {/* Targets Hit */}
          <div className="bg-gradient-to-br from-emerald-400/20 to-green-500/20 border border-emerald-300/30 rounded-lg p-3">
            <div className="lg:hidden flex justify-center mb-2">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="hidden lg:flex items-center justify-between mb-2">
              <span className="text-emerald-300 text-sm font-medium">HITS</span>
              <Target className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white text-center lg:text-left">
              {gameState.targetsHit}/{gameState.targetsTotal}
            </div>
          </div>
          
          {/* Perfect Hits */}
          <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-300/30 rounded-lg p-3">
            <div className="lg:hidden flex justify-center mb-2">
              <Award className="w-5 h-5 text-green-400" />
            </div>
            <div className="hidden lg:flex items-center justify-between mb-2">
              <span className="text-green-300 text-sm font-medium">PERFECT</span>
              <Award className="w-4 h-4 text-green-300" />
            </div>
            <div className="text-xl lg:text-2xl font-bold text-white text-center lg:text-left">
              {gameState.perfectHits}
            </div>
          </div>
          
          {/* Reaction Time */}
          <div className="bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-300/30 rounded-lg p-3">
            <div className="lg:hidden flex justify-center mb-2">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div className="hidden lg:flex items-center justify-between mb-2">
              <span className="text-green-300 text-sm font-medium">AVG RT</span>
              <Clock className="w-4 h-4 text-green-300" />
            </div>
            <div className="text-lg lg:text-xl font-bold text-white text-center lg:text-left">
              {gameState.targetsHit > 0 ? Math.round(gameState.totalReactionTime / gameState.targetsHit) : 0}ms
            </div>
          </div>
        </div>
        
        {/* Active Targets */}
        <div className="mt-4 bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-400/30 rounded-lg p-3">
          <div className="lg:hidden flex justify-center mb-2">
            <Circle className="w-5 h-5 text-green-400" />
          </div>
          <div className="hidden lg:block text-green-400 text-xs font-medium mb-2">ACTIVE</div>
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <div className="text-xl lg:text-2xl font-bold text-white">
              {gameState.targets.filter(t => !t.isHit).length}
            </div>
            <div className="flex gap-1">
              {Array.from({length: 3}, (_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < gameState.targets.filter(t => !t.isHit).length ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 pt-20 relative overflow-hidden">
        {/* Enhanced Background */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div 
            className="w-full h-full opacity-5"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(34,197,94,0.3) 1px, transparent 1px),
                radial-gradient(circle at 75% 75%, rgba(34,197,94,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
          
          {/* Radial fade */}
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/30" />
        </div>
        
        {/* Game Container */}
        <div className="absolute inset-0 cursor-crosshair" ref={containerRef}>
          {/* Render targets */}
          {gameState.targets.map(target => renderTarget(target))}
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
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
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