export type Language = 'en' | 'zh';
export type AIProvider = 'google' | 'deepseek';

export interface PuzzleStage {
  id: string;
  content: string; // The text revealed at this stage (Scenario)
  answer: string; // The truth specifically for this stage
  unlockType: 'ai_judgement' | 'manual'; // Default is now AI judgement
  maxQuestions?: number; // Specific question limit for this stage in Challenge Mode
}

export interface Puzzle {
  id: string;
  title: string;
  content: string; // The "Soup Surface" (Base/Stage 1)
  answer: string; // The "Soup Bottom" (Final Truth or Stage 1 Truth)
  isChallenge: boolean;
  maxQuestions?: number;
  persona?: string; // AI Host Instructions
  stages?: PuzzleStage[]; // Optional additional stages
  winCondition?: 'restore' | 'trigger' | 'custom';
  winConditionCustom?: string;
  authorId?: string;
  playedCount?: number;
  isFavorite?: boolean;
  language?: Language;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
  isHint?: boolean;
}

export interface GameState {
  isPlaying: boolean;
  currentPuzzleId: string | null;
  history: Message[];
  questionsUsed: number;
  isSolved: boolean;
  currentStageIndex: number; // Tracks which stage the user is currently on
  unlockedClues: string[];
}

export interface AppSettings {
  provider: AIProvider;
  apiKey: string; // Google Key
  deepseekApiKey: string; // DeepSeek Key
  model: string; // Gemini Model
  deepseekModel: string; // DeepSeek Model
  useFreeTier: boolean;
  speed: 'fast' | 'normal' | 'slow';
  revealType: 'text' | 'modal';
  language: Language;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  WON = 'WON',
  LOST = 'LOST'
}