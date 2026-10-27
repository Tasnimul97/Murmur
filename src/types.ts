export type ToneMode = 'casual' | 'professional' | 'plain';

export interface HostApp {
  id: string;
  name: string;
  packageName: string;
  icon: string;
  defaultTone: ToneMode;
  placeholder: string;
  isPassword?: boolean;
}

export interface DictionaryItem {
  id: string;
  term: string;
  category: 'name' | 'jargon' | 'abbreviation';
  notes?: string;
}

export interface SnippetItem {
  id: string;
  cue: string;
  expansion: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  rawText: string;
  cleanedText: string;
  tone: ToneMode;
  durationSeconds: number;
  hostPackage: string;
}

export interface MurmurSettings {
  deepgramApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  customProxyUrl: string;
  useProxy: boolean;
  defaultTone: ToneMode;
  recordingMode: 'tap' | 'hold';
  historyEnabled: boolean;
  cleanupStyle: 'minimal' | 'standard' | 'rewrite';
  hapticsEnabled: boolean;
  autoDetectLanguage: boolean;
  supportedLanguages: string[];
}
