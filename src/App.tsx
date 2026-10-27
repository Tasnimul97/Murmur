import React, { useState, useEffect } from 'react';
import {
  Mic,
  Smartphone,
  BookOpen,
  Terminal,
  FileCode,
  Download,
  ShieldCheck,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  DictionaryItem,
  SnippetItem,
  HistoryItem,
  MurmurSettings,
  ToneMode,
} from './types';
import { AndroidSimulator } from './components/AndroidSimulator';
import { CompanionApp } from './components/CompanionApp';
import { CodebaseExplorer } from './components/CodebaseExplorer';
import { MilestoneGuide } from './components/MilestoneGuide';
import { downloadAndroidProjectZip } from './utils/exportProject';

const DEFAULT_SETTINGS: MurmurSettings = {
  deepgramApiKey: '',
  anthropicApiKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  customProxyUrl: 'https://murmur-proxy.yourname.workers.dev',
  useProxy: false,
  defaultTone: 'casual',
  recordingMode: 'tap',
  historyEnabled: false, // OFF by default as required
  cleanupStyle: 'standard',
  hapticsEnabled: true,
  autoDetectLanguage: true,
  supportedLanguages: ['en_US', 'bn_IN', 'hi_IN'],
};

const INITIAL_DICTIONARY: DictionaryItem[] = [
  { id: '1', term: 'Tasnimul', category: 'name' },
  { id: '2', term: 'Murmur', category: 'jargon' },
  { id: '3', term: 'Jetpack Compose', category: 'jargon' },
  { id: '4', term: 'Deepgram', category: 'jargon' },
  { id: '5', term: 'LLM', category: 'abbreviation' },
  { id: '6', term: 'IME', category: 'abbreviation' },
];

const INITIAL_SNIPPETS: SnippetItem[] = [
  { id: '1', cue: 'my email', expansion: 'alex@murmur.app' },
  { id: '2', cue: 'standup update', expansion: 'Yesterday: finished IME skeleton. Today: STT pipeline. Blockers: none.' },
  { id: '3', cue: 'zoom link', expansion: 'https://meet.google.com/mur-murm-ime' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'companion' | 'milestone' | 'code'>(
    'simulator'
  );

  // Persistent storage state
  const [settings, setSettings] = useState<MurmurSettings>(() => {
    try {
      const saved = localStorage.getItem('murmur_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [dictionary, setDictionary] = useState<DictionaryItem[]>(() => {
    try {
      const saved = localStorage.getItem('murmur_dictionary');
      return saved ? JSON.parse(saved) : INITIAL_DICTIONARY;
    } catch {
      return INITIAL_DICTIONARY;
    }
  });

  const [snippets, setSnippets] = useState<SnippetItem[]>(() => {
    try {
      const saved = localStorage.getItem('murmur_snippets');
      return saved ? JSON.parse(saved) : INITIAL_SNIPPETS;
    } catch {
      return INITIAL_SNIPPETS;
    }
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('murmur_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('murmur_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('murmur_dictionary', JSON.stringify(dictionary));
  }, [dictionary]);

  useEffect(() => {
    localStorage.setItem('murmur_snippets', JSON.stringify(snippets));
  }, [snippets]);

  useEffect(() => {
    localStorage.setItem('murmur_history', JSON.stringify(history));
  }, [history]);

  // Dictionary handlers
  const handleAddDictionary = (term: string, category: 'name' | 'jargon' | 'abbreviation') => {
    const newItem: DictionaryItem = {
      id: Date.now().toString(),
      term,
      category,
    };
    setDictionary((prev) => [newItem, ...prev]);
  };

  const handleDeleteDictionary = (id: string) => {
    setDictionary((prev) => prev.filter((item) => item.id !== id));
  };

  // Snippets handlers
  const handleAddSnippet = (cue: string, expansion: string) => {
    const newItem: SnippetItem = {
      id: Date.now().toString(),
      cue,
      expansion,
    };
    setSnippets((prev) => [newItem, ...prev]);
  };

  const handleDeleteSnippet = (id: string) => {
    setSnippets((prev) => prev.filter((item) => item.id !== id));
  };

  // History handlers
  const handleAddHistory = (
    rawText: string,
    cleanedText: string,
    tone: ToneMode,
    hostPackage: string
  ) => {
    if (!settings.historyEnabled) return;
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawText,
      cleanedText,
      tone,
      durationSeconds: Math.floor(Math.random() * 8) + 2,
      hostPackage,
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 99)]); // Limit to last 100
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Application Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Mic size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Murmur</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0 Production Complete
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Milestones 1–9 Complete • STT + LLM Cleanup + Command Mode + Room &amp; Keystore
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Keyboard Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('companion')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'companion'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers size={14} />
              <span className="hidden sm:inline">Companion App</span>
            </button>

            <button
              onClick={() => setActiveTab('milestone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'milestone'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck size={14} />
              <span className="hidden sm:inline">Milestones (1–9)</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileCode size={14} />
              <span className="hidden sm:inline">Code &amp; ZIP</span>
            </button>
          </div>

          {/* Download Project CTA */}
          <button
            onClick={() => downloadAndroidProjectZip()}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <Download size={13} />
            <span>Export .zip</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'simulator' && (
          <AndroidSimulator
            dictionary={dictionary}
            snippets={snippets}
            onAddHistory={handleAddHistory}
            hapticsEnabled={settings.hapticsEnabled}
            onNavigateToCompanionTab={(tab) => setActiveTab('companion')}
          />
        )}

        {activeTab === 'companion' && (
          <CompanionApp
            settings={settings}
            onUpdateSettings={setSettings}
            dictionary={dictionary}
            onAddDictionary={handleAddDictionary}
            onDeleteDictionary={handleDeleteDictionary}
            snippets={snippets}
            onAddSnippet={handleAddSnippet}
            onDeleteSnippet={handleDeleteSnippet}
            history={history}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        )}

        {activeTab === 'milestone' && <MilestoneGuide />}

        {activeTab === 'code' && <CodebaseExplorer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Murmur v1.0.0 • Privacy-first Android Voice Dictation</span>
          <span>Zero keystroke logging • Audio in RAM only</span>
        </div>
      </footer>
    </div>
  );
}
