

export enum ProcessingState {
  IDLE = 'IDLE',
  READING_FILE = 'READING_FILE',
  EXTRACTING = 'EXTRACTING', // Analyzing with Gemini Vision/Text
  SUMMARIZING = 'SUMMARIZING', // Generating summaries
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface KeyInsight {
  point: string;
  reference: string; // The "citation" or source context
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
}

export interface AnalysisResult {
  id?: string;
  fileName?: string; // Added to track which file this result belongs to
  extractedText: string; // Raw extracted text for reference
  shortSummary: string;
  mediumSummary: string;
  longSummary: string;
  insights: KeyInsight[];
  diagramDefinition?: string; // Mermaid.js string
  wordCount: number;
  readingTimeMinutes: number;
  timestamp?: number;
  chatHistory?: ChatMessage[];
  quiz?: QuizQuestion[];
}

export interface AudioState {
  isLoading: boolean;
  audioUrl: string | null;
  currentType: 'short' | 'medium' | 'long' | null;
  cache?: Record<string, string>; // Cache for storing multiple generated audios
}

export interface FileData {
  name: string;
  type: string;
  data: string; // Base64
  mimeType: string;
}

export enum SummaryLevel {
  SHORT = 'Short',
  MEDIUM = 'Medium',
  LONG = 'Long',
}

export type PlanType = 'free' | 'premium';

export type Theme = 'light' | 'dark' | 'midnight' | 'sunset' | 'amoled' | 'gradient' | 'custom';
export type FontTheme = 'sans' | 'serif' | 'mono';

export type AudioPlayerTheme = 'classic' | 'cyberpunk' | 'glass' | 'cassette' | 'minimal';

export const AUDIO_THEMES: {id: AudioPlayerTheme, name: string, description: string}[] = [
  { id: 'classic', name: 'Classic Radio', description: 'Warm, tactile aesthetic' },
  { id: 'glass', name: 'Glassmorphism', description: 'Modern, frosted look' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon glow and grids' },
  { id: 'cassette', name: 'Lo-Fi Cassette', description: 'Retro tape vibes' },
  { id: 'minimal', name: 'Ultra Minimal', description: 'Clean lines only' },
];

export interface HistoryItem {
  id: string;
  fileName: string;
  date: number;
  summarySnippet: string;
  result: AnalysisResult;
  savedAudio?: string; // Base64
  savedAudioType?: string;
  isFavorite?: boolean;
  lastPlaybackTime?: number;
  totalDuration?: number;
}

export interface UserProfile {
  name: string;
  email: string;
  plan: PlanType;
  creditsUsed: number;
  creditsLimit: number; // 5 for free, Infinity for premium
  isAuthenticated?: boolean;
  streak?: number;
  xp?: number;
  badges?: string[];
  history: HistoryItem[];
  customThemeColor?: string;
}

export interface MultiFileProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  // Indian Languages
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  // International Languages
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'it', name: 'Italian (Italiano)' },
];

export interface VoiceOption {
  key: string;      // Unique UI Key
  id: string;       // API Voice Name (Kore, Puck, etc.)
  name: string;     // Display Name
  style: string;    // Descriptive Style
  gender: 'Male' | 'Female';
  premium: boolean;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { key: 'voice1', id: 'Kore', name: 'Voice 1 (Balanced)', style: 'Balanced / Professional', gender: 'Female', premium: false },
  { key: 'voice2', id: 'Zephyr', name: 'Voice 2 (Gentle)', style: 'Calm / Storyteller', gender: 'Female', premium: false },
  { key: 'voice3', id: 'Puck', name: 'Voice 3 (Energetic)', style: 'Dynamic / Energetic', gender: 'Male', premium: false },
  { key: 'voice4', id: 'Charon', name: 'Voice 4 (Deep)', style: 'Deep / Resonant', gender: 'Male', premium: false },
  { key: 'voice5', id: 'Fenrir', name: 'Voice 5 (Intense)', style: 'Authoritative / Strong', gender: 'Male', premium: false },
  { key: 'voice6', id: 'Aoede', name: 'Voice 6 (Confident)', style: 'Confident / Engaging', gender: 'Female', premium: true },
  { key: 'voice7', id: 'Erinome', name: 'Voice 7 (Bright)', style: 'Bright / Clear', gender: 'Female', premium: true },
  { key: 'voice8', id: 'Iapetus', name: 'Voice 8 (Calm)', style: 'Calm / Smooth', gender: 'Male', premium: true },
  { key: 'voice9', id: 'Leda', name: 'Voice 9 (Warm)', style: 'Warm / Friendly', gender: 'Female', premium: true },
  { key: 'voice10', id: 'Umbriel', name: 'Voice 10 (Neutral)', style: 'Neutral / Objective', gender: 'Female', premium: true },
];

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  RESULTS = 'RESULTS',
  LIBRARY = 'LIBRARY'
}