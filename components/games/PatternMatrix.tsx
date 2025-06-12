'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Brain, Target, RotateCcw, Play, Eye, CheckCircle, Zap, Trophy, Activity } from 'lucide-react';
import type { GamePerformance } from '../../types/games';

interface PatternMatrixProps {
  onGameComplete: (score: number, performance: GamePerformance) => void;
  difficulty: number;
  gridSize?: number;
  timeLimit?: number;
}

interface GameState {
  phase: 'instructions' | 'memorize' | 'recall' | 'results';
  pattern: number[];
  userPattern: number[];
  currentLevel: number;
  score: number;
  lives: number;
  timeRemaining: number;
  roundStartTime: number;
  totalReactionTime: number;
  perfectRounds: number;
  totalRounds: number;
  isComplete: boolean;
}

const PatternMatrix: React.FC<PatternMatrixProps> = ({
  onGameComplete,
  difficulty,
  gridSize = 4,
  timeLimit = 30
}) => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'instructions',
    pattern: [],
    userPattern: [],
    currentLevel: 1,
    score: 0,
    lives: 3,
    timeRemaining: timeLimit,
    roundStartTime: 0,
    totalReactionTime: 0,
    perfectRounds: 0,
    totalRounds: 0,
    isComplete: false
  });

  const [highlightedCells, setHighlightedCells] = useState<Set<number>>(new Set());
  const [showingPattern, setShowingPattern] = useState(false);

  // Generate pattern based on level and difficulty
  const generatePattern = useCallback((level: number): number[] => {
    const patternLength = Math.min(2 + Math.floor(level / 2) + difficulty, gridSize * gridSize);
    const pattern: number[] = [];
    const totalCells = gridSize * gridSize;
    
    for (let i = 0; i < patternLength; i++) {
      let newCell;
      do {
        newCell = Math.floor(Math.random() * totalCells);
      } while (pattern.includes(newCell));
      pattern.push(newCell);
    }
    
    return pattern;
  }, [gridSize, difficulty]);

  // Start a new round
  const startNewRound = useCallback(() => {
    const pattern = generatePattern(gameState.currentLevel);
    setGameState(prev => ({
      ...prev,
      phase: 'memorize',
      pattern,
      userPattern: [],
      roundStartTime: Date.now()
    }));
    
    // Show pattern with sequence
    setShowingPattern(true);
    setHighlightedCells(new Set());
    
    // Animate pattern display
    pattern.forEach((cellIndex, sequenceIndex) => {
      setTimeout(() => {
        setHighlightedCells(prev => new Set([...prev, cellIndex]));
      }, sequenceIndex * 600);
    });
    
    // Hide pattern and start recall phase
    setTimeout(() => {
      setShowingPattern(false);
      setHighlightedCells(new Set());
      setGameState(prev => ({ ...prev, phase: 'recall' }));
    }, pattern.length * 600 + 1500);
  }, [gameState.currentLevel, generatePattern]);

  // Handle cell click during recall
  const handleCellClick = (cellIndex: number) => {
    if (gameState.phase !== 'recall' || gameState.isComplete) return;

    const newUserPattern = [...gameState.userPattern, cellIndex];
    setGameState(prev => ({ ...prev, userPattern: newUserPattern }));

    // Check if pattern is complete
    if (newUserPattern.length === gameState.pattern.length) {
      checkPattern(newUserPattern);
    }
  };

  // Check if user pattern matches the target pattern
  const checkPattern = (userPattern: number[]) => {
    const isCorrect = userPattern.every((cell, index) => cell === gameState.pattern[index]);
    const reactionTime = Date.now() - gameState.roundStartTime;
    
    if (isCorrect) {
      const levelBonus = gameState.currentLevel * 10;
      const speedBonus = Math.max(0, 5000 - reactionTime) / 100;
      const roundScore = 100 + levelBonus + speedBonus;
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + roundScore,
        currentLevel: prev.currentLevel + 1,
        totalReactionTime: prev.totalReactionTime + reactionTime,
        perfectRounds: prev.perfectRounds + 1,
        totalRounds: prev.totalRounds + 1,
        phase: 'results'
      }));
      
      // Auto-advance to next level after showing results
      setTimeout(() => {
        if (gameState.currentLevel < 10 && gameState.timeRemaining > 0) {
          startNewRound();
        } else {
          endGame();
        }
      }, 2000);
      
    } else {
      setGameState(prev => ({
        ...prev,
        lives: prev.lives - 1,
        totalRounds: prev.totalRounds + 1,
        phase: 'results'
      }));
      
      setTimeout(() => {
        if (gameState.lives > 1 && gameState.timeRemaining > 0) {
          startNewRound();
        } else {
          endGame();
        }
      }, 2000);
    }
  };

  // End the game
  const endGame = () => {
    const performance: GamePerformance = {
      accuracy: gameState.totalRounds > 0 ? (gameState.perfectRounds / gameState.totalRounds) * 100 : 0,
      reactionTime: gameState.perfectRounds > 0 ? gameState.totalReactionTime / gameState.perfectRounds : 0,
      level: gameState.currentLevel,
      perfectRounds: gameState.perfectRounds,
      totalRounds: gameState.totalRounds
    };
    
    setGameState(prev => ({ ...prev, isComplete: true }));
    onGameComplete(gameState.score, performance);
  };

  // Timer countdown
  useEffect(() => {
    if (gameState.phase === 'recall' && gameState.timeRemaining > 0 && !gameState.isComplete) {
      const timer = setInterval(() => {
        setGameState(prev => {
          if (prev.timeRemaining <= 1) {
            endGame();
            return { ...prev, timeRemaining: 0 };
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gameState.phase, gameState.timeRemaining, gameState.isComplete]);

  // Render grid cell
  const renderCell = (cellIndex: number) => {
    const isHighlighted = highlightedCells.has(cellIndex);
    const isUserSelected = gameState.userPattern.includes(cellIndex);
    const isCorrect = gameState.phase === 'results' && gameState.pattern.includes(cellIndex);
    const isWrong = gameState.phase === 'results' && isUserSelected && !gameState.pattern.includes(cellIndex);

    return (
      <button
        key={cellIndex}
        onClick={() => handleCellClick(cellIndex)}
        disabled={gameState.phase !== 'recall'}
        className={`
          aspect-square border-2 rounded-xl transition-all duration-300 relative overflow-hidden min-h-16 min-w-16 md:min-h-20 md:min-w-20 lg:min-h-24 lg:min-w-24
          ${isHighlighted ? 'border-green-400 bg-green-400/30 shadow-[0_0_25px_rgba(34,197,94,0.6)] scale-105' : 'border-gray-700/50'}
          ${isUserSelected && gameState.phase === 'recall' ? 'bg-green-500/30 border-green-300 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : ''}
          ${isCorrect ? 'bg-green-500/30 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : ''}
          ${isWrong ? 'bg-red-500/30 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : ''}
          ${gameState.phase === 'recall' ? 'hover:border-green-300 hover:bg-green-500/20 hover:scale-105 cursor-pointer hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95' : 'cursor-not-allowed'}
          bg-black/60 backdrop-blur-sm transform-gpu
        `}
      >
        {showingPattern && isHighlighted && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-green-400/50 to-green-500/50 animate-pulse" />
            <div className="absolute inset-0 bg-green-400/20 rounded-xl animate-ping" />
          </>
        )}
        {isUserSelected && gameState.phase === 'recall' && (
          <div className="absolute inset-2 bg-gradient-to-br from-green-400 to-green-500 rounded-lg opacity-70 animate-pulse" />
        )}
        {gameState.phase === 'results' && isCorrect && (
          <CheckCircle className="absolute inset-0 m-auto w-8 h-8 md:w-10 md:h-10 text-green-400 animate-bounce" />
        )}
        {gameState.phase === 'results' && isWrong && (
          <div className="absolute inset-0 m-auto w-8 h-8 md:w-10 md:h-10 text-red-400 flex items-center justify-center animate-pulse text-2xl md:text-3xl font-bold">
            ✕
          </div>
        )}
      </button>
    );
  };

  if (gameState.phase === 'instructions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-6">
                <Brain className="w-20 h-20 text-green-400 mx-auto animate-pulse" />
                <div className="absolute -inset-2 bg-green-400/10 rounded-full animate-ping" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent mb-3">
                Pattern Matrix
              </h1>
              <p className="text-xl text-gray-300 mb-2">Neural Pattern Recognition Training</p>
              <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-green-400 mx-auto rounded-full" />
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  How to Play
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Eye className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Watch & Memorize</p>
                      <p className="text-gray-300 text-sm">Observe the sequence of highlighted cells carefully</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Target className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Recreate Pattern</p>
                      <p className="text-gray-300 text-sm">Click cells in the exact same sequence</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Game Rules
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <Clock className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{timeLimit} Second Timer</p>
                      <p className="text-gray-300 text-sm">Complete as many levels as possible</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <RotateCcw className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">3 Lives Available</p>
                      <p className="text-gray-300 text-sm">Patterns get longer each level</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={startNewRound}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 mx-auto text-lg shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:scale-105 transform-gpu"
              >
                <Play className="w-6 h-6" />
                Begin Neural Training
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col lg:flex-row">
      {/* Left Sidebar - Stats & Info */}
      <div className="lg:w-80 p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Game Stats */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Game Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-white">{gameState.currentLevel}</div>
              <div className="text-green-400 text-xs">Level</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-white">{Math.round(gameState.score)}</div>
              <div className="text-green-400 text-xs">Score</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-white">{gameState.lives}</div>
              <div className="text-green-400 text-xs">Lives</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className={`text-2xl font-bold ${gameState.timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {gameState.timeRemaining}s
              </div>
              <div className="text-green-400 text-xs">Time</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Accuracy</span>
              <span className="text-white font-semibold">
                {gameState.totalRounds > 0 ? Math.round((gameState.perfectRounds / gameState.totalRounds) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Perfect Rounds</span>
              <span className="text-white font-semibold">{gameState.perfectRounds}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Total Rounds</span>
              <span className="text-white font-semibold">{gameState.totalRounds}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Avg. Reaction</span>
              <span className="text-white font-semibold">
                {gameState.perfectRounds > 0 ? Math.round(gameState.totalReactionTime / gameState.perfectRounds) : 0}ms
              </span>
            </div>
          </div>
        </div>

        {/* Pattern Info */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Current Pattern
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Pattern Length</span>
              <span className="text-white font-semibold">{gameState.pattern.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Progress</span>
              <span className="text-white font-semibold">
                {gameState.userPattern.length} / {gameState.pattern.length}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(gameState.userPattern.length / Math.max(gameState.pattern.length, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6">
        {/* Phase Indicator */}
        <div className="mb-6 lg:mb-8 text-center">
          {gameState.phase === 'memorize' && (
            <div className="space-y-2">
              <div className="text-2xl lg:text-3xl font-bold text-green-400 animate-pulse">
                Memorize the Pattern
              </div>
              <div className="text-gray-400">Watch carefully...</div>
            </div>
          )}
          {gameState.phase === 'recall' && (
            <div className="space-y-2">
              <div className="text-2xl lg:text-3xl font-bold text-green-300">
                Recreate the Pattern
              </div>
              <div className="text-gray-400">Click the cells in sequence</div>
            </div>
          )}
          {gameState.phase === 'results' && (
            <div className="space-y-2">
              <div className={`text-2xl lg:text-3xl font-bold ${gameState.userPattern.every((cell, index) => cell === gameState.pattern[index]) ? 'text-green-400' : 'text-red-400'}`}>
                {gameState.userPattern.every((cell, index) => cell === gameState.pattern[index]) ? 'Perfect!' : 'Try Again!'}
              </div>
              <div className="text-gray-400">
                {gameState.userPattern.every((cell, index) => cell === gameState.pattern[index]) 
                  ? 'Advancing to next level...' 
                  : 'Better luck next time!'
                }
              </div>
            </div>
          )}
        </div>

        {/* Game Grid */}
        <div className="relative">
          <div className="absolute -inset-4 bg-green-500/5 rounded-3xl blur-xl" />
          <div className="relative bg-black/80 backdrop-blur-xl p-6 lg:p-8 rounded-2xl border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <div 
              className="grid gap-4 lg:gap-6 w-full max-w-lg lg:max-w-2xl mx-auto"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
            >
              {Array.from({ length: gridSize * gridSize }, (_, index) => renderCell(index))}
            </div>
          </div>
        </div>

        {/* Game Complete Message */}
        {gameState.isComplete && (
          <div className="mt-8 text-center bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <Trophy className="w-12 h-12 text-green-400 mx-auto mb-4 animate-bounce" />
            <div className="text-2xl font-bold text-green-400 mb-2">Neural Training Complete!</div>
            <div className="text-gray-300 space-y-1">
              <div>Final Score: <span className="text-white font-semibold">{Math.round(gameState.score)}</span></div>
              <div>Accuracy: <span className="text-white font-semibold">{Math.round((gameState.perfectRounds / gameState.totalRounds) * 100)}%</span></div>
              <div>Levels Completed: <span className="text-white font-semibold">{gameState.currentLevel - 1}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Additional Info (Hidden on smaller screens) */}
      <div className="hidden xl:block w-80 p-6 space-y-6">
        {/* Tips */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Neural Tips
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-white font-medium mb-1">Focus Technique</p>
              <p>Use your peripheral vision to track multiple cells simultaneously</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-white font-medium mb-1">Memory Palace</p>
              <p>Create a mental story connecting the sequence of highlighted cells</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-white font-medium mb-1">Rhythm Method</p>
              <p>Pay attention to the timing between cell activations</p>
            </div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="bg-black/80 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
          <h3 className="text-lg font-semibold text-green-400 mb-4">Level Progress</h3>
          <div className="space-y-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  ${i < gameState.currentLevel - 1 
                    ? 'bg-green-500 border-green-400 text-white' 
                    : i === gameState.currentLevel - 1 
                    ? 'bg-green-500/30 border-green-400 text-green-400 animate-pulse' 
                    : 'bg-gray-700 border-gray-600 text-gray-400'
                  }`}>
                  {i + 1}
                </div>
                <div className={`flex-1 h-2 rounded-full ${
                  i < gameState.currentLevel - 1 ? 'bg-green-500' : 'bg-gray-700'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternMatrix;