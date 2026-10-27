import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  Square,
  Globe,
  Delete,
  CornerDownLeft,
  Keyboard as KeyboardIcon,
  Lock,
  Sparkles,
  MicOff,
  AlertCircle,
  ExternalLink,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { ToneMode } from '../types';
import { WebAudioWaveformManager } from '../utils/audioWaveform';

interface MurmurKeyboardProps {
  isRecording: boolean;
  isTranscribing: boolean;
  isSecureField: boolean;
  isMicPermissionGranted: boolean;
  recordingDurationSeconds: number;
  isHoldToTalkMode: boolean;
  tone: ToneMode;
  hostPackage: string;
  amplitudeLevel: number;
  interimTranscript?: string;
  hasNetworkError?: boolean;
  onToneChange: (tone: ToneMode) => void;
  onToggleMic: () => void;
  onStartHoldMic: () => void;
  onStopHoldMic: () => void;
  onOpenPermissionGrant: () => void;
  onRetryStt: () => void;
  onSpace: () => void;
  onDelete: () => void;
  onEnter: () => void;
  onSwitchKeyboard: () => void;
  onKeyPress: (char: string) => void;
  isQwertyMode: boolean;
  onToggleQwerty: () => void;
  hapticsEnabled: boolean;
}

export const MurmurKeyboard: React.FC<MurmurKeyboardProps> = ({
  isRecording,
  isTranscribing,
  isSecureField,
  isMicPermissionGranted,
  recordingDurationSeconds,
  isHoldToTalkMode,
  tone,
  hostPackage,
  amplitudeLevel,
  interimTranscript = '',
  hasNetworkError = false,
  onToneChange,
  onToggleMic,
  onStartHoldMic,
  onStopHoldMic,
  onOpenPermissionGrant,
  onRetryStt,
  onSpace,
  onDelete,
  onEnter,
  onSwitchKeyboard,
  onKeyPress,
  isQwertyMode,
  onToggleQwerty,
  hapticsEnabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioManagerRef = useRef<WebAudioWaveformManager | null>(null);
  const [internalAmplitude, setInternalAmplitude] = useState<number>(0);

  const triggerHaptic = () => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  useEffect(() => {
    if (isRecording && isMicPermissionGranted) {
      audioManagerRef.current = new WebAudioWaveformManager();
      audioManagerRef.current.start((amp) => {
        setInternalAmplitude(amp);
      }, canvasRef.current);
    } else {
      audioManagerRef.current?.stop();
      audioManagerRef.current = null;
      setInternalAmplitude(0);
    }

    return () => {
      audioManagerRef.current?.stop();
    };
  }, [isRecording, isMicPermissionGranted]);

  const effectiveAmp = Math.max(amplitudeLevel, internalAmplitude);

  const qwertyRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ','],
  ];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 text-slate-100 flex flex-col justify-between p-2 select-none shadow-2xl transition-all">
      {/* Top Bar: Tone Toggle Pills + Host Context / Timer + QWERTY switch */}
      <div className="flex items-center justify-between pb-1 px-1">
        {/* Tone Selector */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/60">
          {(['casual', 'professional', 'plain'] as ToneMode[]).map((mode) => {
            const isActive = tone === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  triggerHaptic();
                  onToneChange(mode);
                }}
                className={`px-2 py-0.5 text-[11px] font-medium capitalize rounded-md transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Recording Timer or Package indicator */}
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/60">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-rose-400">
                {formatTimer(recordingDurationSeconds)}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline max-w-[120px] truncate">
              {hostPackage.replace('com.', '')}
            </span>
          )}

          <button
            onClick={() => {
              triggerHaptic();
              onToggleQwerty();
            }}
            title={isQwertyMode ? 'Switch to Voice Dictation' : 'Switch to QWERTY fallback'}
            className={`p-1.5 rounded-lg transition-colors ${
              isQwertyMode
                ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isQwertyMode ? <Mic size={15} /> : <KeyboardIcon size={15} />}
          </button>
        </div>
      </div>

      {/* Middle Section: Network Error OR Permission Denied OR Secure Field OR QWERTY OR Voice Hub */}
      <div className="flex-1 min-h-[142px] flex items-center justify-center relative py-1">
        {hasNetworkError ? (
          /* Offline / Failed Network State with Retry */
          <div className="flex flex-col items-center justify-center text-center p-3 bg-rose-950/30 rounded-2xl border border-rose-900/50 max-w-xs animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mb-1.5">
              <WifiOff size={18} />
            </div>
            <p className="text-xs font-bold text-rose-300">Speech Transcription Failed</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5 leading-tight">
              Network dropped. Audio buffer preserved in memory.
            </p>
            <button
              onClick={() => {
                triggerHaptic();
                onRetryStt();
              }}
              className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950"
            >
              <RefreshCw size={11} />
              <span>Retry Transcription</span>
            </button>
          </div>
        ) : !isMicPermissionGranted ? (
          /* Mic Permission Denied State with Deep-Link */
          <div className="flex flex-col items-center justify-center text-center p-3 bg-rose-950/25 rounded-2xl border border-rose-900/50 max-w-xs animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mb-1.5">
              <MicOff size={18} />
            </div>
            <p className="text-xs font-bold text-rose-300">Microphone Access Required</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5 leading-tight">
              An IME cannot show system dialogs. Grant RECORD_AUDIO in the companion app.
            </p>
            <button
              onClick={() => {
                triggerHaptic();
                onOpenPermissionGrant();
              }}
              className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-md shadow-rose-950"
            >
              <span>Grant in Murmur App</span>
              <ExternalLink size={11} />
            </button>
          </div>
        ) : isSecureField ? (
          /* Secure Password Field Banner */
          <div className="flex flex-col items-center justify-center text-center p-4 bg-rose-950/20 rounded-xl border border-rose-900/40 max-w-sm">
            <div className="w-9 h-9 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mb-1.5">
              <Lock size={18} />
            </div>
            <p className="text-xs font-semibold text-rose-300">
              Voice Dictation Disabled
            </p>
            <p className="text-[11px] text-rose-400/80 mt-0.5">
              Murmur disables dictation on password and PIN fields for your security.
            </p>
          </div>
        ) : isQwertyMode ? (
          /* Minimal Fallback QWERTY Layout */
          <div className="w-full flex flex-col gap-1.5 py-1">
            {qwertyRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1">
                {row.map((char) => (
                  <button
                    key={char}
                    onClick={() => {
                      triggerHaptic();
                      onKeyPress(char);
                    }}
                    className="flex-1 max-w-[34px] h-10 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 active:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-sm"
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* Voice Dictation Hub with Real-Time Waveform & Interim Transcript */
          <div className="flex flex-col items-center justify-center w-full">
            {/* Interim streaming words or Live Audio Waveform Canvas */}
            <div className="h-7 w-56 mb-2 flex items-center justify-center relative">
              {interimTranscript ? (
                <div className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] text-indigo-300 font-mono truncate max-w-full text-center animate-fade-in border border-indigo-500/30">
                  "{interimTranscript}"
                </div>
              ) : isTranscribing ? (
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Transcribing speech...</span>
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  width={224}
                  height={28}
                  className={`w-full h-full rounded transition-opacity duration-200 ${
                    isRecording ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}
              {!isRecording && !isTranscribing && !interimTranscript && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" />
                  <span>Deepgram Nova-3 Stream Ready</span>
                </div>
              )}
            </div>

            {/* Central Mic Button (Tap or Hold-to-Talk) */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  <div
                    className="absolute rounded-full bg-rose-500/20 transition-all duration-100"
                    style={{
                      width: `${76 + effectiveAmp * 40}px`,
                      height: `${76 + effectiveAmp * 40}px`,
                    }}
                  />
                  <div
                    className="absolute rounded-full bg-rose-500/10 animate-pulse"
                    style={{
                      width: `${90 + effectiveAmp * 50}px`,
                      height: `${90 + effectiveAmp * 50}px`,
                    }}
                  />
                </>
              )}

              {isHoldToTalkMode ? (
                /* Hold to talk button */
                <button
                  onMouseDown={() => {
                    triggerHaptic();
                    onStartHoldMic();
                  }}
                  onMouseUp={() => {
                    triggerHaptic();
                    onStopHoldMic();
                  }}
                  onTouchStart={() => {
                    triggerHaptic();
                    onStartHoldMic();
                  }}
                  onTouchEnd={() => {
                    triggerHaptic();
                    onStopHoldMic();
                  }}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50 ring-4 ring-indigo-500/20'
                  }`}
                >
                  {isRecording ? <Square size={24} className="fill-white" /> : <Mic size={26} />}
                </button>
              ) : (
                /* Tap to talk button */
                <button
                  onClick={() => {
                    triggerHaptic();
                    onToggleMic();
                  }}
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-900/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50 ring-4 ring-indigo-500/20 hover:ring-indigo-500/40'
                  }`}
                >
                  {isRecording ? <Square size={24} className="fill-white" /> : <Mic size={26} />}
                </button>
              )}
            </div>

            <p className="text-[11px] font-medium text-slate-400 mt-2 flex items-center gap-1">
              {isRecording ? (
                <span className="text-rose-400 font-semibold animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {isHoldToTalkMode ? 'Release to insert' : 'Listening... Tap to stop'}
                </span>
              ) : (
                <>
                  <Sparkles size={11} className="text-indigo-400" />
                  {isHoldToTalkMode ? 'Hold mic to speak' : 'Tap mic to speak'}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Command Row: Switch Keyboard, Space, Delete, Enter */}
      <div className="flex items-center gap-1.5 pt-1">
        {/* Switch Keyboard Key (IME picker) */}
        <button
          onClick={() => {
            triggerHaptic();
            onSwitchKeyboard();
          }}
          title="Switch Keyboard (InputMethodManager)"
          className="w-12 h-11 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          <Globe size={18} />
        </button>

        {/* Space Key */}
        <button
          onClick={() => {
            triggerHaptic();
            onSpace();
          }}
          className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-xs font-medium tracking-wide transition-colors flex items-center justify-center shadow-sm"
        >
          Space
        </button>

        {/* Delete Key */}
        <button
          onClick={() => {
            triggerHaptic();
            onDelete();
          }}
          title="Delete (Backspace)"
          className="w-12 h-11 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-rose-400 rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          <Delete size={18} />
        </button>

        {/* Enter Key */}
        <button
          onClick={() => {
            triggerHaptic();
            onEnter();
          }}
          title="Enter (Return)"
          className="w-12 h-11 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
        >
          <CornerDownLeft size={18} />
        </button>
      </div>
    </div>
  );
};
