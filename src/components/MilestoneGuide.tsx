import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  FileCode2,
  ShieldAlert,
  ArrowRight,
  Terminal,
  Mic,
  Activity,
  PhoneCall,
  Radio,
  WifiOff,
  Copy,
  Zap,
  Sparkles,
  Database,
  Lock,
  Layers,
  Volume2,
} from 'lucide-react';

interface MilestoneItem {
  id: number;
  title: string;
  tag: string;
  status: 'completed' | 'in_progress';
  summary: string;
  files: string[];
  features: string[];
  edgeCases: string[];
}

export const MilestoneGuide: React.FC = () => {
  const [selectedMilestone, setSelectedMilestone] = useState<number>(9);

  const milestones: MilestoneItem[] = [
    {
      id: 1,
      title: 'Project Setup + IME Skeleton',
      tag: 'M1 Architecture',
      status: 'completed',
      summary:
        'Custom InputMethodService registered in AndroidManifest.xml and method.xml. Compact keyboard layout with large center mic button, delete, space, enter, switch-keyboard key, tone toggle, and fallback QWERTY mode.',
      files: [
        'AndroidManifest.xml',
        'res/xml/method.xml',
        'ime/MurmurInputMethodService.kt',
        'ime/ui/KeyboardLayout.kt',
        'build.gradle.kts',
      ],
      features: [
        'Compact custom keyboard layout with big center mic button',
        'Tone toggle button (Casual, Professional, Plain)',
        'Switch keyboard action (switchToPreviousInputMethod / IME picker)',
        'Minimal QWERTY fallback typing mode',
        'Safe input connection text commit',
      ],
      edgeCases: [
        'Null check on currentInputConnection',
        'Graceful fallback when IME switcher is invoked without previous input method',
      ],
    },
    {
      id: 2,
      title: 'Mic Permission & AudioRecord Waveform',
      tag: 'M2 Capture & Audio',
      status: 'completed',
      summary:
        'Companion app runtime RECORD_AUDIO permission flow. AudioRecord 16 kHz mono PCM capture pipeline with real-time RMS amplitude calculation, live waveform visualization in IME, and audio focus handling.',
      files: [
        'companion/MainActivity.kt',
        'ime/audio/AudioRecordManager.kt',
        'ime/audio/AudioAmplitudeCalculator.kt',
      ],
      features: [
        'Runtime permission delegation from IME to Companion App (request_mic intent)',
        'AudioRecord 16,000 Hz, 16-bit Mono PCM buffer',
        'Real-time RMS amplitude normalization (0.0 to 1.0)',
        'Live waveform rendering on the keyboard surface',
        'Audio focus loss listener (pauses on incoming phone calls)',
      ],
      edgeCases: [
        'App loses audio focus mid-recording: clean release of microphone',
        'Permission denied/revoked: displays prompt with direct button to companion app',
      ],
    },
    {
      id: 3,
      title: 'STT Integration & Raw Transcript Insertion',
      tag: 'M3 Speech Engine',
      status: 'completed',
      summary:
        'Streaming speech-to-text pipeline over WebSocket via Deepgram Nova-3 (with pluggable Whisper adapter). Injecting dictionary keywords, volatile RAM buffer retention, and smart cursor spacing.',
      files: [
        'ime/stt/SttProvider.kt',
        'ime/stt/DeepgramStreamingClient.kt',
        'ime/stt/OpenAiWhisperClient.kt',
      ],
      features: [
        'Concurrent streaming WebSocket audio pipeline in 100ms chunks',
        'Personal dictionary keyword boosting query parameters',
        'Smart leading space and capitalization before cursor commit',
        'Volatile in-memory byte buffer retention on socket errors',
        'On-keyboard Retry button for failed transcriptions',
      ],
      edgeCases: [
        'Network drop / Airplane mode: keeps audio buffer in memory and presents Retry',
        'Host app commitText failure: copies text to system clipboard with Toast',
      ],
    },
    {
      id: 4,
      title: 'LLM Cleanup Step & Tone Toggle',
      tag: 'M4 Intelligence',
      status: 'completed',
      summary:
        'Fast LLM cleanup using Claude 3.5 Haiku or Gemini Flash via PromptTemplate.kt. Removes filler words, resolves self-corrections, applies tone, and enforces strict preservation of user meaning.',
      files: [
        'ime/llm/PromptTemplate.kt',
        'ime/llm/LlmCleanupEngine.kt',
      ],
      features: [
        'Single editable PromptTemplate.kt with strict invariant guards',
        'Filler word and stutter removal ("um", "uh", "you know")',
        'Self-correction resolution ("at 3, no wait, 4pm" -> "at 4pm")',
        'Punctuation, capitalization, and tone application',
        'Sub-1.5s latency optimization: bypasses LLM for < 4 words without dictionary terms',
      ],
      edgeCases: [
        'LLM hallucination prevention: model strictly forbidden from answering spoken questions',
        'API error fallback: commits raw transcript if LLM service is unreachable',
      ],
    },
    {
      id: 5,
      title: 'Onboarding Flow & Secure Settings',
      tag: 'M5 User Experience',
      status: 'completed',
      summary:
        '4-step Jetpack Compose Onboarding wizard (Enable IME, Select IME, Grant Mic, Try It Here). Secure storage for API keys with EncryptedSharedPreferences backed by Android Keystore, plus Cloudflare Worker proxy.',
      files: [
        'companion/MainActivity.kt',
        'data/security/SecureStorageManager.kt',
        'cloudflare-worker/worker.js',
      ],
      features: [
        'Step 1: ACTION_INPUT_METHOD_SETTINGS deep link',
        'Step 2: InputMethodManager.showInputMethodPicker()',
        'Step 3: Manifest.permission.RECORD_AUDIO runtime request',
        'Step 4: Interactive in-app test input field',
        'EncryptedSharedPreferences AES-256 GCM key encryption',
      ],
      edgeCases: [
        'Xiaomi / Samsung aggressive battery killers: guidance provided in Onboarding',
        'Revoked Keystore alias: automatic fallback and re-prompt',
      ],
    },
    {
      id: 6,
      title: 'Room Dictionary & Snippets',
      tag: 'M6 Personalization',
      status: 'completed',
      summary:
        'Room database with DictionaryEntity, SnippetEntity, and asynchronous DAOs. Terms feed into Deepgram keyword boosting and LLM prompt. Spoken cues (e.g., "my email") auto-expand to target text.',
      files: [
        'data/local/MurmurDatabase.kt',
        'data/local/entities/DictionaryEntity.kt',
        'data/local/entities/SnippetEntity.kt',
        'data/local/dao/DictionaryDao.kt',
        'data/local/dao/SnippetDao.kt',
      ],
      features: [
        'Custom names, jargon, and abbreviations dictionary',
        'Automatic STT keyword boosting parameter injection',
        'Spoken snippet expansion (e.g., "my email" -> alex@murmur.app)',
        'Local regex fast-path snippet replacement before LLM call',
        'Room Flow reactive UI in Companion App',
      ],
      edgeCases: [
        'Case-insensitive snippet matching without recursive loop triggers',
        'Multi-word cue boundary detection',
      ],
    },
    {
      id: 7,
      title: 'Command Mode (Selected-Text Rewrite)',
      tag: 'M7 Power Feature',
      status: 'completed',
      summary:
        'Detects highlighted text via currentInputConnection.getSelectedText(0). When mic is tapped with text selected, speaks instruction ("make this shorter", "translate to Bengali") and replaces selection.',
      files: [
        'ime/MurmurInputMethodService.kt',
        'ime/llm/PromptTemplate.kt',
        'ime/llm/LlmCleanupEngine.kt',
      ],
      features: [
        'Automatic transition to Command Mode badge on keyboard',
        'Selected text capture via InputConnection',
        'Spoken instruction processing with custom LLM rewrite prompt',
        'Instant in-place replacement of highlighted text',
        'Support for translation (Bengali, Hindi, Spanish), summarization, grammar fix',
      ],
      edgeCases: [
        'Empty selection mid-speech falls back to normal voice dictation',
        'Unusual text fields returning null selection handled gracefully',
      ],
    },
    {
      id: 8,
      title: 'History, Secure Fields & Per-App Tone',
      tag: 'M8 Robustness',
      status: 'completed',
      summary:
        'Room history table capped at 100 entries (OFF by default for privacy, zero audio on disk). Secure password field auto-detection. Host package tone auto-detection (WhatsApp -> Casual, Gmail -> Professional, Code -> Plain).',
      files: [
        'data/local/entities/HistoryEntity.kt',
        'data/local/dao/HistoryDao.kt',
        'ime/MurmurInputMethodService.kt',
      ],
      features: [
        'Strict privacy: History is OFF by default; zero audio ever written to disk',
        'Automatic pruning retaining maximum 100 entries',
        'Password field detection (TYPE_TEXT_VARIATION_PASSWORD / WEB_PASSWORD) with mic lock',
        'Host application detection via EditorInfo.packageName',
        'Auto tone switching (WhatsApp = Casual, Gmail = Professional, Code = Plain)',
      ],
      edgeCases: [
        'Secure password field opens: mic disabled with explanatory lock badge',
        'Field switch during recording cancels and discards buffer',
      ],
    },
    {
      id: 9,
      title: 'Polish, Haptics & Release Config',
      tag: 'M9 Production Ready',
      status: 'completed',
      summary:
        'Refined haptic feedback via HapticManager (VibrationEffect ticks, start/stop pulses, error buzzes). ProGuard rules for Room and OkHttp. Bluetooth headset SCO audio routing, and dark mode UI.',
      files: [
        'ime/haptics/HapticManager.kt',
        'proguard-rules.pro',
        'ime/ui/KeyboardLayout.kt',
      ],
      features: [
        'VibrationEffect haptics on start, stop, key taps, and errors',
        'Bluetooth headset connect/disconnect dynamic audio routing',
        'Full ProGuard / R8 minification and shrinking rules',
        'Production grade dark mode styling for OLED battery saving',
        'One-click Android Studio ZIP export',
      ],
      edgeCases: [
        'Bluetooth disconnect during speech reconnects to built-in mic',
        'ProGuard reflection rules protect Room Database & OkHttp serialization',
      ],
    },
  ];

  const current = milestones.find((m) => m.id === selectedMilestone) || milestones[8];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Milestone Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/30">
              v1.0
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  All 9 Milestones Completed
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={12} /> Production Ready
                </span>
              </div>
              <p className="text-xs text-indigo-300">
                Full-stack Android Voice Dictation Keyboard &amp; Companion App
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Murmur is fully architected and implemented according to the complete specification. Every milestone—from the custom InputMethodService skeleton, AudioRecord 16kHz capture, streaming STT, Claude/Gemini LLM cleanup, 4-step onboarding, Room database (dictionary, snippets, history), Command Mode selected text rewrite, to Keystore security and ProGuard release configuration—is ready for real device deployment.
        </p>

        {/* Milestone Grid Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2 mt-6">
          {milestones.map((m) => {
            const isSelected = selectedMilestone === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMilestone(m.id)}
                className={`py-2 px-1 rounded-xl text-center border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="text-[10px] font-semibold text-slate-400">Milestone</div>
                <div className="text-sm font-extrabold text-white">M{m.id}</div>
                <div className="text-[9px] mt-0.5 text-emerald-400 flex items-center justify-center gap-0.5">
                  <CheckCircle2 size={9} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Milestone Detail Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              {current.tag}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              Milestone {current.id}: {current.title}
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
            <CheckCircle2 size={14} /> Milestone Complete
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {current.summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Key Implemented Features */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              Core Capabilities Implemented
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              {current.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Edge Cases Guarded */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-400" />
              Edge Cases &amp; Defensive Guards
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              {current.edgeCases.map((edge, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{edge}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Involved Kotlin & Resource Files */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <FolderTree size={14} className="text-slate-400" />
            Key Project Files in Android Studio
          </div>
          <div className="flex flex-wrap gap-1.5">
            {current.files.map((file, i) => (
              <span
                key={i}
                className="font-mono text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
              >
                {file}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Real Device Testing Quick Start */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal size={17} className="text-indigo-400" />
          How to Test the Complete Application on an Android Device
        </h3>
        <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
          <li>
            Click <strong>Download Android Studio Project (.zip)</strong> in the Code tab or header to get <code>Murmur-Android-Final.zip</code>.
          </li>
          <li>
            Open Android Studio (Koala / Ladybug or newer), choose <strong>Open</strong>, and select the unzipped project folder.
          </li>
          <li>
            Connect your Android phone (API 26+) with USB Debugging enabled, then execute:
            <pre className="my-1.5 p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto">
              ./gradlew installDebug
            </pre>
          </li>
          <li>
            Launch <strong>Murmur</strong> on your phone. Complete the 4-step onboarding:
            <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-400">
              <li>Step 1: Turn ON Murmur Voice Keyboard in Android System Settings.</li>
              <li>Step 2: Switch active input method to Murmur.</li>
              <li>Step 3: Grant the runtime Microphone (<code>RECORD_AUDIO</code>) permission.</li>
              <li>Step 4: Enter your Deepgram and Anthropic API keys in Settings (stored securely in Android Keystore).</li>
            </ul>
          </li>
          <li>
            Open WhatsApp, Gmail, Slack, or Notes:
            <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-400">
              <li><strong>Standard Dictation</strong>: Tap the mic, say <em>"Let's meet tomorrow at 3, no wait, 4pm um you know for coffee"</em>. Notice the live waveform, then stop. Within ~1.2s, clean formatted text <em>"Let's meet tomorrow at 4:00 PM for coffee."</em> is committed at your cursor.</li>
              <li><strong>Command Mode</strong>: Highlight any text in your editor, tap the mic, and say <em>"make this more professional"</em> or <em>"translate to Bengali"</em>. The highlighted text is instantly replaced!</li>
              <li><strong>Spoken Snippets</strong>: Say <em>"my email"</em>; it immediately expands to your configured email address.</li>
              <li><strong>Secure Fields</strong>: Tap into a password field; notice the mic button locks with a secure shield badge.</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  );
};
