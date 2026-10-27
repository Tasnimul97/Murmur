import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Key,
  BookOpen,
  Scissors,
  History,
  Settings,
  Mic,
  ArrowRight,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Info,
  Server,
  Sparkles,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import {
  ToneMode,
  DictionaryItem,
  SnippetItem,
  HistoryItem,
  MurmurSettings,
} from '../types';

interface CompanionAppProps {
  settings: MurmurSettings;
  onUpdateSettings: (settings: MurmurSettings) => void;
  dictionary: DictionaryItem[];
  onAddDictionary: (term: string, category: 'name' | 'jargon' | 'abbreviation') => void;
  onDeleteDictionary: (id: string) => void;
  snippets: SnippetItem[];
  onAddSnippet: (cue: string, expansion: string) => void;
  onDeleteSnippet: (id: string) => void;
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export const CompanionApp: React.FC<CompanionAppProps> = ({
  settings,
  onUpdateSettings,
  dictionary,
  onAddDictionary,
  onDeleteDictionary,
  snippets,
  onAddSnippet,
  onDeleteSnippet,
  history,
  onClearHistory,
  onDeleteHistoryItem,
}) => {
  const [activeTab, setActiveTab] = useState<
    'onboarding' | 'home' | 'dictionary' | 'snippets' | 'history' | 'settings'
  >('home');

  // Onboarding state
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [isImeEnabled, setIsImeEnabled] = useState<boolean>(true);
  const [isImeSelected, setIsImeSelected] = useState<boolean>(true);
  const [isMicGranted, setIsMicGranted] = useState<boolean>(true);
  const [testFieldText, setTestFieldText] = useState<string>('');

  // Dictionary form
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState<'name' | 'jargon' | 'abbreviation'>('name');

  // Snippets form
  const [newCue, setNewCue] = useState('');
  const [newExpansion, setNewExpansion] = useState('');

  // Notification / Feedback
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const requestBrowserMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setIsMicGranted(true);
      alert('Microphone permission granted!');
    } catch (e) {
      alert('Microphone permission denied or blocked in browser settings.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Companion App Navigation Bar */}
      <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Mic size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Murmur Companion
              <span className="text-[10px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2 py-0.5 rounded-full">
                Jetpack Compose
              </span>
            </h2>
            <p className="text-xs text-slate-400">Settings, Dictionary, Snippets &amp; Privacy</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'home', label: 'Home', icon: ShieldCheck },
            { id: 'onboarding', label: 'Onboarding', icon: Smartphone },
            { id: 'dictionary', label: 'Dictionary', icon: BookOpen },
            { id: 'snippets', label: 'Snippets', icon: Scissors },
            { id: 'history', label: 'History', icon: History },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {copyFeedback && (
        <div className="bg-emerald-950 border-b border-emerald-800 text-emerald-300 text-xs py-1.5 px-6 text-center font-medium">
          {copyFeedback}
        </div>
      )}

      {/* Screen 1: Home / Status Dashboard */}
      {activeTab === 'home' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Status Overview</h3>
            <p className="text-xs text-slate-400 mb-6">
              Diagnostic verification of all Android system requirements for Murmur IME.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isImeEnabled ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Keyboard Enabled</div>
                    <div className="text-[11px] text-slate-400">In Android System Settings</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsImeEnabled(!isImeEnabled)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Toggle
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isImeSelected ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Active Keyboard</div>
                    <div className="text-[11px] text-slate-400">Current default IME</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsImeSelected(!isImeSelected)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Toggle
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isMicGranted ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="text-rose-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Microphone Permission</div>
                    <div className="text-[11px] text-slate-400">RECORD_AUDIO runtime grant</div>
                  </div>
                </div>
                <button
                  onClick={requestBrowserMic}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Grant
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.deepgramApiKey || settings.useProxy ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <AlertTriangle size={20} className="text-amber-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-200">STT &amp; LLM Keys</div>
                    <div className="text-[11px] text-slate-400">
                      {settings.useProxy ? 'Using Cloudflare Proxy' : 'EncryptedSharedPreferences'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Guarantee Notice */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-400" />
              Privacy &amp; Keystroke Invariant
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Murmur is built with a zero-tracking guarantee:
            </p>
            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong>No audio is ever stored on disk.</strong> Audio is kept in volatile RAM and immediately discarded.
              </li>
              <li>
                <strong>The keyboard never logs, stores, or transmits keystrokes</strong> from normal typing key presses.
              </li>
              <li>
                <strong>No analytics or third-party tracking SDKs</strong> are bundled in the application.
              </li>
              <li>
                <strong>Secure fields</strong> (passwords, PINs) automatically disable voice dictation.
              </li>
            </ul>
          </div>

          {/* OEM Battery Optimization Notice */}
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 text-xs text-amber-200/90 flex gap-3.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-amber-300 mb-1">
                OEM Battery Optimization (Samsung, Xiaomi, OnePlus)
              </h5>
              <p className="text-amber-200/70 leading-relaxed text-[11px]">
                Aggressive OS background management on MIUI/OneUI can terminate the IME service process. To prevent keyboard crashes or lag, exempt Murmur from battery optimization under <em>Android Settings &gt; Apps &gt; Murmur &gt; Battery &gt; Unrestricted</em>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: Onboarding Flow */}
      {activeTab === 'onboarding' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">4-Step Setup Flow</h3>
              <p className="text-xs text-slate-400">Get Murmur running on your Android device</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
              Step {onboardingStep} of 4
            </span>
          </div>

          {/* Stepper Wizard */}
          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Smartphone size={24} />
              </div>
              <h4 className="text-base font-semibold text-white">Step 1: Enable Murmur in System Settings</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Android requires explicit user approval in system settings before an InputMethodService can be loaded by any application.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
                <br />
                context.startActivity(intent)
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  Murmur is Enabled <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Key size={24} />
              </div>
              <h4 className="text-base font-semibold text-white">Step 2: Select Murmur as Active Keyboard</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Now switch your active IME from Gboard/Samsung Keyboard to Murmur using the system input method picker.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
                <br />
                imm.showInputMethodPicker()
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setOnboardingStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setOnboardingStep(3)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  Selected as Active <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Mic size={24} />
              </div>
              <h4 className="text-base font-semibold text-white">Step 3: Grant Microphone Permission</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                An IME cannot display system runtime permission dialogs itself. The companion app requests <code>android.permission.RECORD_AUDIO</code> on behalf of the keyboard.
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  onClick={requestBrowserMic}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-medium flex items-center gap-1.5"
                >
                  <Mic size={14} /> Test Browser Mic
                </button>
                <button
                  onClick={() => setOnboardingStep(4)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  Permission Granted <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 4 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-base font-semibold text-white">Step 4: Try It Here Sandbox</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                You're all set! Tap into the test box below to verify your keyboard appears, responds to voice dictation, and commits clean text.
              </p>
              <textarea
                value={testFieldText}
                onChange={(e) => setTestFieldText(e.target.value)}
                placeholder="Tap here to test dictation..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 p-3 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
              />
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  Finish Onboarding
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen 3: Personal Dictionary */}
      {activeTab === 'dictionary' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Personal Dictionary</h3>
              <p className="text-xs text-slate-400">
                Names, technical jargon, and abbreviations always spelled your way. Fed into STT keyword hints and LLM prompt.
              </p>
            </div>
          </div>

          {/* Add Word Form */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="e.g. Tasnimul, Supabase, LLMs..."
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as typeof newCategory)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="name">Name / Person</option>
              <option value="jargon">Technical Jargon</option>
              <option value="abbreviation">Abbreviation</option>
            </select>
            <button
              onClick={() => {
                if (newTerm.trim()) {
                  onAddDictionary(newTerm.trim(), newCategory);
                  setNewTerm('');
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Add Term
            </button>
          </div>

          {/* Dictionary List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {dictionary.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-200">{item.term}</span>
                  <span className="ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.category}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteDictionary(item.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen 4: Snippets */}
      {activeTab === 'snippets' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Voice Snippets</h3>
              <p className="text-xs text-slate-400">
                Spoken cues expand automatically to your saved text templates during transcription.
              </p>
            </div>
          </div>

          {/* Add Snippet Form */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Spoken Cue (Trigger)
                </label>
                <input
                  type="text"
                  value={newCue}
                  onChange={(e) => setNewCue(e.target.value)}
                  placeholder="e.g. my email, zoom link, standup"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Expanded Text
                </label>
                <input
                  type="text"
                  value={newExpansion}
                  onChange={(e) => setNewExpansion(e.target.value)}
                  placeholder="e.g. alex@murmur.app"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (newCue.trim() && newExpansion.trim()) {
                  onAddSnippet(newCue.trim(), newExpansion.trim());
                  setNewCue('');
                  setNewExpansion('');
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Plus size={14} /> Save Snippet
            </button>
          </div>

          {/* Snippets List */}
          <div className="space-y-2">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                    "{snippet.cue}" <ArrowRight size={12} className="text-slate-500" />
                  </div>
                  <div className="text-xs text-slate-200 font-mono">{snippet.expansion}</div>
                </div>
                <button
                  onClick={() => onDeleteSnippet(snippet.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen 5: History */}
      {activeTab === 'history' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Dictation History</h3>
              <p className="text-xs text-slate-400">
                Last 100 dictations with raw transcript vs cleaned comparison. (OFF by default for privacy).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.historyEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, historyEnabled: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                Store History
              </label>
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
          </div>

          {!settings.historyEnabled && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-3">
              <Info size={16} className="text-indigo-400 shrink-0" />
              <span>
                History storage is currently <strong>disabled</strong> in accordance with Murmur's privacy-first design. Enable it above if you wish to audit transcripts.
              </span>
            </div>
          )}

          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No recorded dictations yet. Dictate in any app or the simulator to see raw vs cleaned text here.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400">{item.hostPackage}</span>
                      <span>•</span>
                      <span className="capitalize">{item.tone} Tone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => copyToClipboard(item.cleanedText)}
                        className="text-slate-400 hover:text-slate-200"
                        title="Copy Cleaned Text"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteHistoryItem(item.id)}
                        className="text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-[10px] font-semibold text-rose-400/90 uppercase tracking-wider mb-1">
                        Raw Transcript
                      </div>
                      <div className="text-slate-400 font-mono text-[11px]">{item.rawText}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40">
                      <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                        Cleaned Output
                      </div>
                      <div className="text-slate-200 font-medium">{item.cleanedText}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Screen 6: Settings */}
      {activeTab === 'settings' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Settings &amp; Keys</h3>
            <p className="text-xs text-slate-400">
              API credentials stored via EncryptedSharedPreferences / Android Keystore, or optional Cloudflare Worker proxy.
            </p>
          </div>

          {/* Proxy toggle */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server size={18} className="text-indigo-400" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Use Cloudflare Worker Proxy
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Keeps keys server-side for public app distribution.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.useProxy}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, useProxy: e.target.checked })
                }
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
            </div>

            {settings.useProxy && (
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Proxy Base URL (configurable)
                </label>
                <input
                  type="text"
                  value={settings.customProxyUrl}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, customProxyUrl: e.target.value })
                  }
                  placeholder="https://murmur-proxy.yourname.workers.dev"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* Direct API Keys (EncryptedSharedPreferences) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Direct API Keys (Stored in Keystore)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Deepgram STT API Key (Default)
                </label>
                <input
                  type="password"
                  value={settings.deepgramApiKey}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, deepgramApiKey: e.target.value })
                  }
                  placeholder="dg_live_..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Anthropic / Claude API Key (Cleanup)
                </label>
                <input
                  type="password"
                  value={settings.anthropicApiKey}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, anthropicApiKey: e.target.value })
                  }
                  placeholder="sk-ant-..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Gemini API Key (Alternative Fast LLM)
                </label>
                <input
                  type="password"
                  value={settings.geminiApiKey}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, geminiApiKey: e.target.value })
                  }
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  OpenAI API Key (Whisper fallback)
                </label>
                <input
                  type="password"
                  value={settings.openaiApiKey}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, openaiApiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Keyboard Preferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Tone</label>
                <select
                  value={settings.defaultTone}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, defaultTone: e.target.value as ToneMode })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="casual">Casual (Chat apps)</option>
                  <option value="professional">Professional (Work email)</option>
                  <option value="plain">Plain (Code / Search)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Recording Mode</label>
                <select
                  value={settings.recordingMode}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      recordingMode: e.target.value as 'tap' | 'hold',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="tap">Tap to start / Tap to stop</option>
                  <option value="hold">Hold to talk</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cleanup Style</label>
                <select
                  value={settings.cleanupStyle}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      cleanupStyle: e.target.value as 'minimal' | 'standard' | 'rewrite',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="standard">Standard (Fillers + Corrections)</option>
                  <option value="minimal">Minimal (Punctuation only)</option>
                  <option value="rewrite">Polished Rewrite</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.hapticsEnabled}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, hapticsEnabled: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                Haptic Feedback on Tap &amp; Start/Stop
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.autoDetectLanguage}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, autoDetectLanguage: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                Auto Detect Language (EN, Bengali, Hindi)
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
