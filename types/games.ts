export interface GamePerformance {
  accuracy: number;
  reactionTime?: number;
  level: number;
  perfectHits?: number;
  totalTargets?: number;
  perfectRounds?: number;
  totalRounds?: number;
  totalShots?: number;
  totalHits?: number;
  maxCombo?: number;
  averageReactionTime?: number;
  survivalTime?: number;
}

export interface GameConfig {
  gridSize?: number;
  timeLimit?: number;
  difficulty: number;
  lives?: number;
  targetCount?: number;
  speed?: number;
  precision?: number;
} 