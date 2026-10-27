import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  FileText,
  Compass,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Volume2,
  RefreshCw,
  Check,
  PhoneCall,
  Mic,
  MicOff,
  Radio,
  Sliders,
  ExternalLink,
  WifiOff,
  Copy,
  Tag,
} from 'lucide-react';
import { HostApp, ToneMode, DictionaryItem, SnippetItem } from '../types';
import { MurmurKeyboard } from './MurmurKeyboard';
import { applySmartCommit } from '../utils/textCommit';

interface AndroidSimulatorProps {
  dictionary: DictionaryItem[];
  snippets: SnippetItem[];
  onAddHistory: (raw: string, cleaned: string, tone: ToneMode, hostPkg: string) => void;
  hapticsEnabled: boolean;
  onNavigateToCompanionTab?: (tab: string) => void;
}

const HOST_APPS: HostApp[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    icon: 'MessageSquare',
    defaultTone: 'casual',
    placeholder: 'Message +1 (555) 019-2834...',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    packageName: 'com.google.android.gm',
    icon: 'Mail',
    defaultTone: 'professional',
    placeholder: 'Compose email to team...',
  },
  {
    id: 'messages',
    name: 'Google Messages',
    packageName: 'com.google.android.apps.messaging',
    icon: 'MessageSquare',
    defaultTone: 'casual',
    placeholder: 'Text message...',
  },
  {
    id: 'notes',
    name: 'Google Keep / Notes',
    packageName: 'com.google.android.keep',
    icon: 'FileText',
    defaultTone: 'casual',
    placeholder: 'Take a note...',
  },
  {
    id: 'browser',
    name: 'Chrome Browser',
    packageName: 'com.android.chrome',
    icon: 'Compass',
    defaultTone: 'plain',
    placeholder: 'Search or type URL...',
  },
  {
    id: 'secure',
    name: 'Bank / Password Field',
    packageName: 'com.securebank.app',
    icon: 'ShieldAlert',
    defaultTone: 'plain',
    placeholder: 'Enter account password...',
    isPassword: true,
  },
];

const PRESET_UTTERANCES = [
  {
    label: 'Real-time Utterance A (Jargon & Names)',
    raw: 'hey Tasnimul let us test the Murmur Deepgram streaming integration today',
  },
  {
    label: 'Real-time Utterance B (Self-Correction in speech)',
    raw: 'we need to deploy the new keyboard update at 3 no wait 4pm',
  },
  {
    label: 'Real-time Utterance C (Chat message)',
    raw: 'can you send me the latest APK when you get a chance thanks',
  },
  {
    label: 'Real-time Utterance D (Multilingual Bengali/Hindi mix)',
    raw: 'Dhonnobad for helping with the Kotlin IME keyboard build',
  },
];

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  dictionary,
  snippets,
  onAddHistory,
  hapticsEnabled,
  onNavigateToCompanionTab,
}) => {
  const [selectedApp, setSelectedApp] = useState<HostApp>(HOST_APPS[0]);
  const [tone, setTone] = useState<ToneMode>(HOST_APPS[0].defaultTone);
  const [inputText, setInputText] = useState<string>('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isQwertyMode, setIsQwertyMode] = useState<boolean>(false);
  const [showImePicker, setShowImePicker] = useState<boolean>(false);
  const [simulatedSpeech, setSimulatedSpeech] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [hasNetworkError, setHasNetworkError] = useState<boolean>(false);
  const [simulateBrokenConnection, setSimulateBrokenConnection] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Milestone 2 & 3 & 7 states
  const [isMicPermissionGranted, setIsMicPermissionGranted] = useState<boolean>(true);
  const [isHoldToTalkMode, setIsHoldToTalkMode] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [simulatedAmplitude, setSimulatedAmplitude] = useState<number>(0);

  // Command Mode selected text
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // In-memory audio buffer simulation for retry
  const bufferedSpeechRef = useRef<string>('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Live timer & amplitude simulation
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
        setSimulatedAmplitude(0.3 + Math.random() * 0.5);
      }, 200);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
      setSimulatedAmplitude(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleSelectApp = (app: HostApp) => {
    setSelectedApp(app);
    setTone(app.defaultTone);
    setIsRecording(false);
    setInputText('');
    setCursorPos(0);
    setSelectedText('');
    showNotice(`Switched to ${app.name} (${app.packageName}) -> Auto-selected ${app.defaultTone} tone`);
  };

  const showNotice = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => {
      setStatusNotification((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    setCursorPos(start);
    setSelectionRange({ start, end });
    const sel = start !== end ? target.value.slice(start, end) : '';
    setSelectedText(sel);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    const pos = e.target.selectionStart || 0;
    setCursorPos(pos);
    setSelectedText('');
  };

  const handleSpace = () => {
    const { updatedText, newCursorPosition } = applySmartCommit(inputText, cursorPos, ' ');
    setInputText(updatedText);
    setCursorPos(newCursorPosition);
  };

  const handleDelete = () => {
    if (cursorPos === 0) return;
    const before = inputText.slice(0, cursorPos - 1);
    const after = inputText.slice(cursorPos);
    setInputText(before + after);
    setCursorPos(cursorPos - 1);
  };

  const handleEnter = () => {
    const before = inputText.slice(0, cursorPos);
    const after = inputText.slice(cursorPos);
    setInputText(before + '\n' + after);
    setCursorPos(cursorPos + 1);
  };

  const handleKeyPress = (char: string) => {
    const { updatedText, newCursorPosition } = applySmartCommit(inputText, cursorPos, char);
    setInputText(updatedText);
    setCursorPos(newCursorPosition);
  };

  // Start speech recording (Milestone 3 STT pipeline)
  const startRecording = (overrideUtterance?: string) => {
    if (!isMicPermissionGranted) {
      showNotice('Microphone access denied! Deep-link button rendered in keyboard.');
      return;
    }
    if (selectedApp.isPassword) {
      showNotice('Voice dictation is disabled on password fields.');
      return;
    }

    setHasNetworkError(false);
    setIsRecording(true);
    setInterimTranscript('');

    const speechText = overrideUtterance || PRESET_UTTERANCES[Math.floor(Math.random() * PRESET_UTTERANCES.length)].raw;
    setSimulatedSpeech(speechText);
    bufferedSpeechRef.current = speechText;

    // Simulate streaming words arriving progressively over WebSocket
    const words = speechText.split(' ');
    let currentWordIndex = 0;
    const interval = setInterval(() => {
      if (!isRecording && currentWordIndex > 0) {
        clearInterval(interval);
        return;
      }
      currentWordIndex = Math.min(words.length, currentWordIndex + 2);
      setInterimTranscript(words.slice(0, currentWordIndex).join(' '));
      if (currentWordIndex >= words.length) {
        clearInterval(interval);
      }
    }, 400);

    // Also attempt browser Web Speech API if supported
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              setSimulatedSpeech(event.results[i][0].transcript);
              bufferedSpeechRef.current = event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (interim) setInterimTranscript(interim);
        };
        recognition.onerror = () => {};
        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (_e) {}
    }
  };

  // Stop recording and insert raw transcript at cursor (Milestone 3)
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsTranscribing(true);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_e) {}
      speechRecognitionRef.current = null;
    }

    setTimeout(() => {
      setIsTranscribing(false);
      setInterimTranscript('');

      const rawTranscript = simulatedSpeech || bufferedSpeechRef.current;

      // Milestone 8 Edge Case: Apps with unusual input connections where commitText misbehaves
      if (simulateBrokenConnection) {
        navigator.clipboard.writeText(rawTranscript);
        showNotice('⚠️ Host editor connection failed: Cleaned text copied to clipboard!');
        return;
      }

      // Milestone 7: Command Mode (selected text rewrite)
      if (selectedText.trim().length > 0) {
        let rewritten = selectedText;
        const cmd = rawTranscript.toLowerCase();

        if (cmd.includes('short') || cmd.includes('concise')) {
          const words = selectedText.split(' ');
          rewritten = words.slice(0, Math.max(3, Math.floor(words.length * 0.6))).join(' ') + '.';
        } else if (cmd.includes('bengali') || cmd.includes('bangla')) {
          rewritten = "এই টেক্সটটি বাংলায় সুন্দরভাবে অনুবাদ করা হয়েছে।";
        } else if (cmd.includes('hindi')) {
          rewritten = "इस पाठ का हिंदी में अनुवाद किया गया है।";
        } else if (cmd.includes('grammar') || cmd.includes('fix')) {
          rewritten = selectedText
            .replace(/\b(wanna)\b/gi, 'want to')
            .replace(/\b(gonna)\b/gi, 'going to')
            .replace(/\b(u)\b/gi, 'you')
            .replace(/\b(r)\b/gi, 'are')
            .trim();
          rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
          if (!rewritten.endsWith('.')) rewritten += '.';
        } else if (cmd.includes('professional') || tone === 'professional') {
          rewritten = `I would like to respectfully inform you that ${selectedText.toLowerCase().replace(/\.$/, '')}.`;
        } else {
          rewritten = selectedText.trim();
        }

        const before = inputText.slice(0, selectionRange.start);
        const after = inputText.slice(selectionRange.end);
        setInputText(before + rewritten + after);
        setCursorPos(before.length + rewritten.length);
        setSelectedText('');
        onAddHistory(`Command: "${rawTranscript}" on "${selectedText}"`, rewritten, tone, selectedApp.packageName);
        showNotice(`Command Mode: Rewrote selection to "${rewritten}"!`);
        return;
      }

      // Milestone 4: Full LLM Cleanup Pipeline
      let cleaned = rawTranscript
        // Remove filler words & false starts
        .replace(/\b(um|uh|you know|so basically|like|i mean)\b/gi, '')
        // Resolve conversational self-corrections e.g. "at 3 no wait 4pm" -> "at 4:00 PM"
        .replace(/\b(\w+)\s+(no wait|wait no|actually|scratch that)\s+(\w+)\b/gi, '$3')
        .replace(/\s+/g, ' ')
        .trim();

      // Expand Snippets (Milestone 6)
      snippets.forEach((s) => {
        const regex = new RegExp(`\\b${s.cue}\\b`, 'gi');
        cleaned = cleaned.replace(regex, s.expansion);
      });

      // Apply Dictionary spellings (Milestone 6)
      dictionary.forEach((d) => {
        const regex = new RegExp(`\\b${d.term}\\b`, 'gi');
        cleaned = cleaned.replace(regex, d.term);
      });

      // Apply Tone styling (Casual / Professional / Plain)
      if (tone === 'casual') {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        if (!cleaned.endsWith('!') && !cleaned.endsWith('.')) cleaned += '!';
      } else if (tone === 'professional') {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        if (!cleaned.endsWith('.')) cleaned += '.';
      }

      // Insert at cursor with smart spacing & capitalization
      const { updatedText, newCursorPosition } = applySmartCommit(inputText, cursorPos, cleaned);
      setInputText(updatedText);
      setCursorPos(newCursorPosition);

      onAddHistory(rawTranscript, cleaned, tone, selectedApp.packageName);
      showNotice(`Cleaned (${tone}): "${cleaned}" inserted!`);
    }, 450);
  };

  const handleToggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Milestone 3: Retry transcription from preserved in-memory audio buffer
  const handleRetryStt = () => {
    setHasNetworkError(false);
    setIsTranscribing(true);
    showNotice('Replaying buffered audio to STT provider...');

    setTimeout(() => {
      setIsTranscribing(false);
      const rawTranscript = bufferedSpeechRef.current || 'Tasnimul testing Murmur voice dictation';
      const { updatedText, newCursorPosition } = applySmartCommit(inputText, cursorPos, rawTranscript);
      setInputText(updatedText);
      setCursorPos(newCursorPosition);
      showNotice(`Retry success: "${rawTranscript}" committed!`);
    }, 600);
  };

  // Simulate network failure
  const triggerNetworkFailure = () => {
    if (isRecording) {
      setIsRecording(false);
    }
    setHasNetworkError(true);
    bufferedSpeechRef.current = simulatedSpeech || 'Preserved speech buffer in volatile memory';
    showNotice('Network dropped! Audio buffer kept in RAM. Retry button activated on keyboard.');
  };

  // Audio focus lost
  const simulateAudioFocusLoss = () => {
    if (!isRecording) {
      showNotice('Start recording first, then trigger audio focus loss.');
      return;
    }
    setIsRecording(false);
    showNotice('⚠️ AudioFocus lost: Phone call arrived! AudioRecord safely halted.');
  };

  const getAppIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare size={16} />;
      case 'Mail':
        return <Mail size={16} />;
      case 'FileText':
        return <FileText size={16} />;
      case 'Compass':
        return <Compass size={16} />;
      case 'ShieldAlert':
        return <ShieldAlert size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start justify-center max-w-7xl mx-auto">
      {/* Left: Interactive Android Device Simulator */}
      <div className="w-full max-w-[420px] mx-auto bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col min-h-[720px] relative overflow-hidden">
        {/* Android Punch Hole Camera & Speaker */}
        <div className="w-full flex items-center justify-between px-6 pt-2 pb-1 text-[11px] text-slate-400 font-medium">
          <span>12:45</span>
          <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700 mx-auto" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 rounded-sm border border-slate-400 p-0.5 flex items-center">
              <div className="h-full w-full bg-emerald-400 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Current Host App Header */}
        <div className="bg-slate-900/90 rounded-2xl p-2.5 my-1.5 flex items-center justify-between border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              {getAppIcon(selectedApp.icon)}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-200">{selectedApp.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">
                {selectedApp.packageName}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              Tone: <strong className="text-indigo-400 capitalize">{tone}</strong>
            </span>
          </div>
        </div>

        {/* Host App Content Area / Active Text Field */}
        <div className="flex-1 bg-slate-900/40 rounded-2xl p-3 flex flex-col justify-end border border-slate-800/80 mb-2 overflow-hidden relative">
          {/* Notification banner */}
          {statusNotification && (
            <div className="absolute top-2 left-2 right-2 bg-indigo-950/95 border border-indigo-500/50 text-indigo-200 text-[11px] px-2.5 py-2 rounded-xl shadow-lg flex items-center gap-2 z-20 animate-fade-in">
              <Sparkles size={13} className="text-indigo-400 shrink-0" />
              <span className="truncate">{statusNotification}</span>
            </div>
          )}

          {/* Interactive Chat / Document View */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-2 text-xs text-slate-400 flex flex-col justify-end">
            <div className="p-2.5 rounded-xl bg-slate-800/60 max-w-[85%] self-start border border-slate-700/40">
              <p className="text-[11px] text-slate-300">
                {selectedApp.isPassword
                  ? 'Please authenticate to access your banking dashboard.'
                  : `Murmur IME attached to ${selectedApp.name}. Select text for Command Mode or speak to dictate!`}
              </p>
            </div>
          </div>

          {/* Command Mode Active Alert */}
          {selectedText.length > 0 && (
            <div className="mb-2 p-2 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-[11px] flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles size={13} className="text-amber-400 shrink-0" />
                <span className="font-semibold">Command Mode:</span>
                <span className="font-mono text-[10px] text-amber-300/90 truncate max-w-[130px]">"{selectedText}"</span>
              </div>
              <button
                onClick={() => setSelectedText('')}
                className="text-[10px] text-amber-400 hover:underline px-1"
              >
                Clear
              </button>
            </div>
          )}

          {/* Active Target Input Field */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextChange}
              onSelect={handleTextareaSelect}
              placeholder={selectedApp.placeholder}
              rows={3}
              className={`w-full bg-slate-800/90 text-slate-100 placeholder-slate-500 text-xs rounded-xl p-2.5 border focus:outline-none transition-colors resize-none ${
                selectedApp.isPassword
                  ? 'border-rose-900/60 focus:border-rose-500'
                  : 'border-slate-700/80 focus:border-indigo-500 ring-1 ring-transparent focus:ring-indigo-500/30'
              }`}
            />
            {inputText.length > 0 && (
              <button
                onClick={() => {
                  setInputText('');
                  setCursorPos(0);
                }}
                className="absolute top-2 right-2 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-700/80 px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>Cursor: pos {cursorPos} of {inputText.length}</span>
            {isTranscribing && (
              <span className="text-indigo-400 flex items-center gap-1 animate-pulse font-medium">
                <RefreshCw size={10} className="animate-spin" />
                Streaming to Deepgram...
              </span>
            )}
          </div>
        </div>

        {/* Murmur Custom Keyboard (InputMethodService) */}
        <div className="rounded-b-[36px] overflow-hidden -mx-3 -mb-3">
          <MurmurKeyboard
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            isSecureField={!!selectedApp.isPassword}
            isMicPermissionGranted={isMicPermissionGranted}
            recordingDurationSeconds={recordingSeconds}
            isHoldToTalkMode={isHoldToTalkMode}
            tone={tone}
            hostPackage={selectedApp.packageName}
            amplitudeLevel={simulatedAmplitude}
            interimTranscript={interimTranscript}
            hasNetworkError={hasNetworkError}
            onToneChange={(newTone) => {
              setTone(newTone);
              showNotice(`Tone changed to ${newTone}`);
            }}
            onToggleMic={handleToggleMic}
            onStartHoldMic={() => startRecording()}
            onStopHoldMic={stopRecording}
            onOpenPermissionGrant={() => {
              if (onNavigateToCompanionTab) {
                onNavigateToCompanionTab('onboarding');
              }
              showNotice('Deep-linked to Murmur Companion App -> Step 3 (Microphone Grant)');
            }}
            onRetryStt={handleRetryStt}
            onSpace={handleSpace}
            onDelete={handleDelete}
            onEnter={handleEnter}
            onSwitchKeyboard={() => setShowImePicker(true)}
            onKeyPress={handleKeyPress}
            isQwertyMode={isQwertyMode}
            onToggleQwerty={() => setIsQwertyMode(!isQwertyMode)}
            hapticsEnabled={hapticsEnabled}
          />
        </div>

        {/* Android IME Picker Dialog Simulation */}
        {showImePicker && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 z-50">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full shadow-2xl">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Smartphone size={16} className="text-indigo-400" />
                Select Input Method
              </h4>
              <div className="space-y-2 mb-4">
                <button
                  onClick={() => setShowImePicker(false)}
                  className="w-full p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500 text-left flex items-center justify-between text-xs text-indigo-300 font-medium"
                >
                  <div>
                    <div className="font-semibold">Murmur Voice Keyboard</div>
                    <div className="text-[10px] text-slate-400">Deepgram STT (en, bn, hi)</div>
                  </div>
                  <Check size={16} className="text-indigo-400" />
                </button>

                <button
                  onClick={() => {
                    setShowImePicker(false);
                    showNotice('Switched to Gboard system keyboard');
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left flex items-center justify-between text-xs text-slate-300"
                >
                  <div>
                    <div className="font-semibold">Gboard</div>
                    <div className="text-[10px] text-slate-400">Google Keyboard</div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowImePicker(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Full Final Production Testing Suite */}
      <div className="flex-1 w-full space-y-5">
        {/* Command Mode Interactive Suite (Milestone 7) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Command Mode (Selected Text Rewrite)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Milestone 7
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select any text in the host field, tap the mic, and speak an instruction to rewrite the selection.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                const sample = "we need to discuss the project deadline as soon as humanly possible because the client is waiting";
                setInputText(sample);
                setSelectedText(sample);
                setSelectionRange({ start: 0, end: sample.length });
                showNotice('Selected text ready! Click an instruction below or speak into mic.');
              }}
              className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-medium"
            >
              1. Load &amp; Select Sample Text
            </button>

            <button
              disabled={selectedText.length === 0}
              onClick={() => {
                startRecording("make this shorter and concise");
                setTimeout(() => stopRecording(), 800);
              }}
              className="px-2.5 py-1 text-[11px] bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-medium disabled:opacity-40"
            >
              "Make this shorter"
            </button>

            <button
              disabled={selectedText.length === 0}
              onClick={() => {
                startRecording("translate to Bengali");
                setTimeout(() => stopRecording(), 800);
              }}
              className="px-2.5 py-1 text-[11px] bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-medium disabled:opacity-40"
            >
              "Translate to Bengali"
            </button>

            <button
              disabled={selectedText.length === 0}
              onClick={() => {
                startRecording("make it professional for email");
                setTimeout(() => stopRecording(), 800);
              }}
              className="px-2.5 py-1 text-[11px] bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg font-medium disabled:opacity-40"
            >
              "Make it professional"
            </button>
          </div>
        </div>

        {/* Milestone 4-6: Full Pipeline Utterances Bench */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 size={16} className="text-indigo-400" />
              Full End-to-End Pipeline (STT + LLM Cleanup)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">&lt; 1.5s latency</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Streams speech &rarr; Deepgram STT with keyword hints &rarr; PromptTemplate cleanup (removes fillers, resolves self-corrections, expands snippets, enforces tone &amp; dictionary) &rarr; Inserts at cursor.
          </p>

          <div className="space-y-2.5">
            {[
              {
                title: "Self-Correction Resolution",
                raw: "let us meet at 3 no wait 4pm tomorrow",
                desc: "Resolves 'no wait' into 4:00 PM without conversational reply"
              },
              {
                title: "Filler Removal & Jargon",
                raw: "um so basically we need to uh sync on the Murmur Jetpack Compose keyboard with Tasnimul",
                desc: "Removes um/uh, capitalizes jargon, enforces personal dictionary"
              },
              {
                title: "Voice Snippet Cue Expansion",
                raw: "please reach out at my email for the APK link",
                desc: "Spoken cue 'my email' expands to 'alex@murmur.app'"
              },
              {
                title: "Tone Shift Test",
                raw: "can you send me the numbers as soon as you can thanks",
                desc: "Adapts output according to selected Casual / Professional / Plain tone"
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-indigo-300">{item.title}</span>
                  <button
                    onClick={() => {
                      startRecording(item.raw);
                      setTimeout(() => stopRecording(), 1000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles size={11} />
                    Run Pipeline
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 mb-1">
                  "{item.raw}"
                </div>
                <div className="text-[10px] text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone 8 Edge Cases & Battery Optimization */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert size={16} className="text-indigo-400" />
              Production Edge Cases &amp; Safety
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Robustness
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Offline Network Drop & Retry Test */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <WifiOff size={13} className="text-rose-400" />
                Network Drop
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Audio preserved in RAM.
              </p>
              <button
                onClick={triggerNetworkFailure}
                className="w-full py-1 text-[11px] font-medium rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-colors"
              >
                Trigger Offline
              </button>
            </div>

            {/* Audio Focus Interruption */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <PhoneCall size={13} className="text-amber-400" />
                Incoming Call
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Halts AudioRecord cleanly.
              </p>
              <button
                onClick={simulateAudioFocusLoss}
                className="w-full py-1 text-[11px] font-medium rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 transition-colors"
              >
                Simulate Call
              </button>
            </div>

            {/* Unusual Input Connection Fallback */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Copy size={13} className="text-emerald-400" />
                Clipboard Fallback
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                For broken commitText.
              </p>
              <button
                onClick={() => {
                  const next = !simulateBrokenConnection;
                  setSimulateBrokenConnection(next);
                  showNotice(next ? 'Broken connection mode enabled' : 'Normal commitText enabled');
                }}
                className={`w-full py-1 text-[11px] font-medium rounded-lg transition-colors ${
                  simulateBrokenConnection
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {simulateBrokenConnection ? 'Simulating' : 'Normal'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
