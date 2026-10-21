"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, ActionTaken, OutboundCallResponseData } from "@/lib/api";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  PhoneIncoming,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Bot,
  User as UserIcon,
  CheckCircle2,
  Wrench,
  Loader2,
  Copy,
  Check,
  Send,
  RotateCcw,
  Activity,
  Calendar,
  ShieldCheck,
  Play,
  Volume1,
  Sliders,
  Settings,
  Wifi,
  Zap,
  Globe,
  Pause,
  Flame,
  Download,
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";
import { LoadingState } from "@/components/ui/LoadingState";

interface VoiceLanguage {
  code: string;       // BCP-47 tag, e.g. "en-US"
  name: string;       // "English (US)"
  nativeName: string; // "English"
  flag: string;       // "🇺🇸"
  prefix: string;     // "en"
  defaultGreeting: string;
}

const SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  {
    code: "en-US",
    name: "English (US)",
    nativeName: "English (US)",
    flag: "🇺🇸",
    prefix: "en",
    defaultGreeting: "Thank you for calling Acme Global. How may I assist you today?",
  },
  {
    code: "en-GB",
    name: "English (UK)",
    nativeName: "English (UK)",
    flag: "🇬🇧",
    prefix: "en",
    defaultGreeting: "Good day. Thank you for calling Acme Global. How may I direct your call?",
  },
  {
    code: "es-ES",
    name: "Spanish (Spain)",
    nativeName: "Español",
    flag: "🇪🇸",
    prefix: "es",
    defaultGreeting: "Gracias por llamar a Acme Global. ¿En qué puedo ayudarle hoy?",
  },
  {
    code: "fr-FR",
    name: "French (France)",
    nativeName: "Français",
    flag: "🇫🇷",
    prefix: "fr",
    defaultGreeting: "Bonjour et merci d'avoir contacté Acme Global. Comment puis-je vous aider ?",
  },
  {
    code: "de-DE",
    name: "German (Germany)",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    prefix: "de",
    defaultGreeting: "Guten Tag und vielen Dank für Ihren Anruf bei Acme Global. Wie kann ich Ihnen behilflich sein?",
  },
  {
    code: "it-IT",
    name: "Italian (Italy)",
    nativeName: "Italiano",
    flag: "🇮🇹",
    prefix: "it",
    defaultGreeting: "Buongiorno, grazie per aver chiamato Acme Global. Come posso esserle utile?",
  },
  {
    code: "pt-BR",
    name: "Portuguese (Brazil)",
    nativeName: "Português",
    flag: "🇧🇷",
    prefix: "pt",
    defaultGreeting: "Olá, obrigado por ligar para a Acme Global. Como posso ajudar você hoje?",
  },
  {
    code: "hi-IN",
    name: "Hindi (India)",
    nativeName: "हिन्दी",
    flag: "🇮🇳",
    prefix: "hi",
    defaultGreeting: "नमस्ते! एक्मे ग्लोबल में कॉल करने के लिए धन्यवाद। आज मैं आपकी क्या सहायता कर सकता हूँ?",
  },
  {
    code: "ja-JP",
    name: "Japanese (Japan)",
    nativeName: "日本語",
    flag: "🇯🇵",
    prefix: "ja",
    defaultGreeting: "お電話ありがとうございます。アクメ・グローバルです。本日はどのようなご用件でしょうか？",
  },
  {
    code: "zh-CN",
    name: "Chinese (Mandarin)",
    nativeName: "中文 (普通话)",
    flag: "🇨🇳",
    prefix: "zh",
    defaultGreeting: "您好，感谢致电 Acme Global。请问今天有什么我可以协助您的？",
  },
  {
    code: "ar-SA",
    name: "Arabic (Saudi Arabia)",
    nativeName: "العربية",
    flag: "🇸🇦",
    prefix: "ar",
    defaultGreeting: "أهلاً بك، شكراً لاتصالك بأكمي جلوبال. كيف يمكنني مساعدتك اليوم؟",
  },
  {
    code: "ru-RU",
    name: "Russian (Russia)",
    nativeName: "Русский",
    flag: "🇷🇺",
    prefix: "ru",
    defaultGreeting: "Здравствуйте! Спасибо за звонок в Acme Global. Чем я могу вам помочь сегодня?",
  },
];

interface CallTurn {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actionsTaken?: ActionTaken[];
  timestamp: string;
}

// DTMF standard dual-tone multi-frequency mapping
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

// Play realistic DTMF touch tones
function playDtmfTone(char: string) {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const freqs = DTMF_FREQS[char];
    if (!freqs) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch {}
    }, 180);
  } catch {}
}

// Play realistic ringback tone (440Hz + 480Hz modulated cadence)
function startRingbackTone(): () => void {
  if (typeof window === "undefined") return () => {};
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return () => {};

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    let ringOn = true;
    const interval = setInterval(() => {
      ringOn = !ringOn;
      gain.gain.setValueAtTime(ringOn ? 0.08 : 0.0001, ctx.currentTime);
    }, 1500);

    return () => {
      clearInterval(interval);
      try {
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch {}
    };
  } catch {
    return () => {};
  }
}

// Play realistic soothing Hold Music / Chime
function startHoldMusic(): () => void {
  if (typeof window === "undefined") return () => {};
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return () => {};

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    let isStopped = false;

    // Harmonic chord progression: Cmaj7 - Fmaj7 warm telephone chords
    const notes = [
      [261.63, 329.63, 392.0, 493.88], // C E G B
      [220.0, 261.63, 329.63, 392.0],  // A C E G
      [174.61, 220.0, 261.63, 329.63], // F A C E
      [196.0, 246.94, 293.66, 392.0],  // G B D G
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (isStopped) return;
      const currentChord = notes[chordIdx % notes.length];
      chordIdx++;

      currentChord.forEach((freq) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 2.3);
        } catch {}
      });
    };

    playChord();
    const interval = setInterval(playChord, 2400);

    return () => {
      isStopped = true;
      clearInterval(interval);
      try {
        ctx.close();
      } catch {}
    };
  } catch {
    return () => {};
  }
}

// Play connection pickup click
function playPickupTone() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        ctx.close();
      } catch {}
    }, 100);
  } catch {}
}

// Play disconnect tone
function playHangupTone() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(480, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        ctx.close();
      } catch {}
    }, 220);
  } catch {}
}

export default function VoicePlaygroundPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const searchParams = useSearchParams();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"playground" | "outbound" | "telephony">("playground");

  // Assistants State
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Language State
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(SUPPORTED_LANGUAGES[0]);

  // Playground Call Session State
  const [callState, setCallState] = useState<
    "idle" | "ringing" | "connected" | "listening" | "thinking" | "speaking" | "on_hold" | "ended"
  >("idle");
  const [conversationId, setConversationId] = useState<string>("");
  const [callTurns, setCallTurns] = useState<CallTurn[]>([]);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [showKeypad, setShowKeypad] = useState(false);
  const [dtmfBuffer, setDtmfBuffer] = useState<string>("");
  const [textUtterance, setTextUtterance] = useState("");
  const [transferDetected, setTransferDetected] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Real-Time STT Live Transcript (Sub-second streaming visualizer)
  const [liveCallerTranscript, setLiveCallerTranscript] = useState<string>("");

  // Post-Call Disposition Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Voice Persona Settings
  const [selectedVoiceRate, setSelectedVoiceRate] = useState<number>(1.08);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("auto");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Outbound Dispatcher State
  const [toPhoneNumber, setToPhoneNumber] = useState("");
  const [openingMessage, setOpeningMessage] = useState(
    "Hello! This is Acme Health calling to confirm your upcoming appointment."
  );
  const [isCallingOutbound, setIsCallingOutbound] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<OutboundCallResponseData | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio / Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ringbackStopperRef = useRef<(() => void) | null>(null);
  const holdMusicStopperRef = useRef<(() => void) | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // STT Fast Silence / End-of-Utterance (EOU) Detection Refs
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingTurnRef = useRef<boolean>(false);
  const callTurnsRef = useRef<CallTurn[]>([]);
  callTurnsRef.current = callTurns;
  const callDurationRef = useRef<number>(0);
  callDurationRef.current = callDuration;

  // Canvas Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const freqBufferRef = useRef<Uint8Array | null>(null);

  // Scroll transcript to bottom
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [callTurns, liveCallerTranscript]);

  // Load available speech synthesis voices filtered by selected language
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      setAvailableVoices(allVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Filter voices matching current language prefix
  const matchingVoices = availableVoices.filter((v) =>
    v.lang.toLowerCase().startsWith(selectedLang.prefix.toLowerCase())
  );

  // Load assistants on mount
  useEffect(() => {
    if (!currentOrg) return;
    const fetchAssistants = async () => {
      setIsLoading(true);
      try {
        const list = await api.listAssistants(currentOrg.id);
        const voiceAssistants = list.filter((a) => a.channels.includes("voice"));
        setAssistants(voiceAssistants.length > 0 ? voiceAssistants : list);

        const paramId = searchParams.get("assistantId");
        if (paramId && list.some((a) => a.id === paramId)) {
          setSelectedAssistantId(paramId);
        } else if (voiceAssistants.length > 0) {
          setSelectedAssistantId(voiceAssistants[0].id);
        } else if (list.length > 0) {
          setSelectedAssistantId(list[0].id);
        }
      } catch (err: any) {
        toastError(err?.message || "Failed to load assistants");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssistants();
  }, [currentOrg, searchParams]);

  const activeAssistant = assistants.find((a) => a.id === selectedAssistantId);

  // Call duration counter
  useEffect(() => {
    if (["connected", "listening", "thinking", "speaking", "on_hold"].includes(callState)) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Canvas Frequency Visualizer Loop (60 FPS Web Audio)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;
    let phase = 0;

    const render = () => {
      if (!running) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Read real microphone frequencies if active
      let freqData: Uint8Array | null = null;
      if (analyserRef.current && !isMicMuted && (callState === "listening" || callState === "connected")) {
        if (!freqBufferRef.current || freqBufferRef.current.length !== analyserRef.current.frequencyBinCount) {
          freqBufferRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }
        (analyserRef.current as any).getByteFrequencyData(freqBufferRef.current);
        freqData = freqBufferRef.current;
      }

      const centerY = height / 2;
      const isCallActive = ["connected", "listening", "thinking", "speaking", "on_hold"].includes(callState);

      if (!isCallActive) {
        // Resting flatline
        ctx.beginPath();
        ctx.strokeStyle = "rgba(156, 163, 175, 0.3)";
        ctx.lineWidth = 2;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      } else if (callState === "on_hold") {
        // Soft pulsing hold wave
        phase += 0.03;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.strokeStyle = "#8b5cf6";
        for (let x = 0; x < width; x += 4) {
          const y = centerY + Math.sin(x * 0.03 + phase) * 6 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (callState === "speaking") {
        // Organic assistant speaking waves
        phase += 0.09;
        ctx.lineWidth = 2.5;

        // Wave 1: Primary emerald wave
        ctx.beginPath();
        ctx.strokeStyle = "#10b981";
        for (let x = 0; x < width; x += 4) {
          const y =
            centerY +
            Math.sin(x * 0.03 + phase) * 16 * Math.sin((x / width) * Math.PI) +
            Math.cos(x * 0.06 - phase * 0.7) * 8 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Wave 2: Complementary glow wave
        ctx.beginPath();
        ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
        for (let x = 0; x < width; x += 4) {
          const y =
            centerY + Math.sin(x * 0.04 - phase * 1.2) * 12 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (callState === "thinking") {
        // Pulsing amber wave
        phase += 0.12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.strokeStyle = "#f59e0b";
        for (let x = 0; x < width; x += 4) {
          const y = centerY + Math.sin(x * 0.08 + phase) * 8 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (freqData && freqData.length > 0) {
        // Real-time microphone reactive waveform
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.strokeStyle = "#6366f1";

        const sliceWidth = width / 48;
        let x = 0;
        for (let i = 0; i < 48; i++) {
          const v = freqData[i * 2] / 255.0;
          const amp = v * (height * 0.42);
          const y = i % 2 === 0 ? centerY - amp : centerY + amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        // Subtle ambient listening pulse
        phase += 0.04;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.45)";
        for (let x = 0; x < width; x += 4) {
          const y = centerY + Math.sin(x * 0.02 + phase) * 5 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [callState, isMicMuted]);

  // Clean Web Audio MediaStream on hangup / unmount
  const stopMicrophoneStream = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Web Speech Synthesis (Assistant speaking aloud with language-aware voice matching)
  const speakAssistantReply = useCallback(
    (text: string, onDone?: () => void) => {
      if (!isSpeakerEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setCallState("connected");
        if (onDone) onDone();
        return;
      }

      // Pre-clean text: strip markdown asterisks, hashes, backticks, emojis, bullet points
      const cleanSpokenText = text
        .replace(/[*_#`~\[\]\(\)]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[-•]\s+/g, "")
        .trim();

      if (!cleanSpokenText) {
        setCallState("connected");
        if (onDone) onDone();
        return;
      }

      // Clear any prior watchdog timer
      if (resumeWatchdogRef.current) {
        clearInterval(resumeWatchdogRef.current);
        resumeWatchdogRef.current = null;
      }

      const executeSpeak = () => {
        try {
          // Unpause Chromium speech engine
          window.speechSynthesis.resume();

          const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
          activeUtteranceRef.current = utterance; // Retain reference to prevent V8 garbage collection!

          utterance.rate = selectedVoiceRate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          // Select voice matching active language
          const allVoices = window.speechSynthesis.getVoices();
          let chosenVoice: SpeechSynthesisVoice | undefined;

          if (selectedVoiceName !== "auto") {
            chosenVoice = allVoices.find((v) => v.name === selectedVoiceName);
          }

          if (!chosenVoice) {
            // Filter by current language prefix first
            const langVoices = allVoices.filter((v) =>
              v.lang.toLowerCase().startsWith(selectedLang.prefix.toLowerCase())
            );

            chosenVoice =
              langVoices.find(
                (v) =>
                  v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Premium") ||
                  v.name.includes("Siri") ||
                  v.name.includes("Enhanced")
              ) || langVoices[0];
          }

          if (chosenVoice) {
            utterance.voice = chosenVoice;
            utterance.lang = chosenVoice.lang;
          } else {
            utterance.lang = selectedLang.code;
          }

          let hasEnded = false;
          const finish = () => {
            if (hasEnded) return;
            hasEnded = true;
            if (resumeWatchdogRef.current) {
              clearInterval(resumeWatchdogRef.current);
              resumeWatchdogRef.current = null;
            }
            activeUtteranceRef.current = null;
            setCallState("connected");
            if (onDone) onDone();
          };

          utterance.onstart = () => {
            setCallState("speaking");
          };

          utterance.onend = () => {
            finish();
          };

          utterance.onerror = (e: any) => {
            console.warn("SpeechSynthesis event:", e?.error);
            if (e?.error && e?.error !== "canceled" && e?.error !== "interrupted") {
              // Try one fallback attempt with system default if specific voice had an issue
              try {
                const fallbackUtterance = new SpeechSynthesisUtterance(cleanSpokenText);
                fallbackUtterance.rate = selectedVoiceRate;
                fallbackUtterance.volume = 1.0;
                fallbackUtterance.onend = () => finish();
                fallbackUtterance.onerror = () => finish();
                activeUtteranceRef.current = fallbackUtterance;
                window.speechSynthesis.speak(fallbackUtterance);
                return;
              } catch {}
            }
            finish();
          };

          // Chromium unfreeze watchdog (prevents speech stall on long sentences)
          resumeWatchdogRef.current = setInterval(() => {
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              if (window.speechSynthesis.speaking) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
              } else if (resumeWatchdogRef.current) {
                clearInterval(resumeWatchdogRef.current);
                resumeWatchdogRef.current = null;
              }
            }
          }, 3500);

          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("SpeechSynthesis execution error:", err);
          setCallState("connected");
          if (onDone) onDone();
        }
      };

      // In Chromium, calling cancel() immediately followed by speak() drops the utterance.
      // If speech is currently ongoing, cancel and wait a brief tick for the cancel to settle.
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        setTimeout(executeSpeak, 60);
      } else {
        executeSpeak();
      }
    },
    [isSpeakerEnabled, selectedVoiceName, selectedVoiceRate, selectedLang]
  );

  // Send a voice turn to the backend
  const sendVoiceTurn = useCallback(
    async (spokenText: string) => {
      if (!currentOrg || !selectedAssistantId || !spokenText.trim()) return;

      const userText = spokenText.trim();
      setLiveCallerTranscript(""); // Clear live interim streaming text
      isProcessingTurnRef.current = true;

      const userTurn: CallTurn = {
        id: Math.random().toString(36).substring(2, 9),
        role: "user",
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      // Extract prior turns to transmit conversation context directly within request
      const priorHistory = callTurnsRef.current.slice(-10).map((t) => ({
        role: t.role,
        content: t.content,
      }));

      setCallTurns((prev) => [...prev, userTurn]);
      setCallState("thinking");

      const t0 = performance.now();
      try {
        const res = await api.sendChat(currentOrg.id, {
          assistantId: selectedAssistantId,
          conversationId: conversationId || undefined,
          message: userText,
          channel: "voice",
          language: selectedLang.name,
          history: priorHistory,
          conversationData: {
            history: priorHistory,
            context: {
              channel: "voice",
              language: selectedLang.name,
              locale: selectedLang.code,
              call_duration_seconds: callDurationRef.current,
              use_case: activeAssistant?.useCase || "general",
            },
          },
        });

        const roundtrip = Math.round(performance.now() - t0);
        setLatencyMs(roundtrip);

        if (res.conversationId && (!conversationId || conversationId !== res.conversationId)) {
          setConversationId(res.conversationId);
        }

        const actions = res.actionsTaken || (res as any).actions_taken || [];
        const assistantTurn: CallTurn = {
          id: Math.random().toString(36).substring(2, 9),
          role: "assistant",
          content: res.reply,
          actionsTaken: actions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };

        setCallTurns((prev) => [...prev, assistantTurn]);

        // Check for transfer_call action
        const transfer = actions.find((a: ActionTaken) => a.name === "transfer_call");
        if (transfer) {
          const target = (transfer.arguments as any)?.target_phone_number || "human tier-2 agent";
          setTransferDetected(target);
          toastSuccess(`Call transferred to ${target}`);
        }

        isProcessingTurnRef.current = false;

        // Speak reply aloud, then automatically resume listening
        speakAssistantReply(res.reply, () => {
          if (isHandsFree && !isMicMuted && callState !== "ended" && callState !== "on_hold") {
            startSpeechRecognition();
          }
        });
      } catch (err: any) {
        isProcessingTurnRef.current = false;
        toastError(err?.message || "Voice connection encountered an error");
        setCallState("connected");
      }
    },
    [
      currentOrg,
      selectedAssistantId,
      conversationId,
      selectedLang,
      speakAssistantReply,
      isHandsFree,
      isMicMuted,
      callState,
      toastSuccess,
      toastError,
    ]
  );

  // Setup Web Speech Recognition with Continuous Stream + Fast Silence Detection
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined" || isMicMuted || callState === "on_hold" || callState === "ended") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang.code;

      recognition.onstart = () => {
        setCallState("listening");
      };

      recognition.onresult = (event: any) => {
        if (isProcessingTurnRef.current) return;

        let fullTranscript = "";
        let hasFinalResult = false;

        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            hasFinalResult = true;
          }
        }

        const currentSaid = fullTranscript.trim();
        if (currentSaid) {
          setLiveCallerTranscript(currentSaid);

          // Fast End-of-Utterance (EOU) Silence Debounce:
          // If caller stops speaking for 800ms, immediately dispatch the turn!
          if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

          const debounceDelay = hasFinalResult ? 400 : 900;
          silenceTimeoutRef.current = setTimeout(() => {
            if (!isProcessingTurnRef.current && currentSaid.length > 0) {
              try {
                recognition.abort();
              } catch {}
              sendVoiceTurn(currentSaid);
            }
          }, debounceDelay);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition event:", e?.error);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          toastError("Microphone permission denied. Click the lock/site settings in your browser address bar to allow microphone.");
          setCallState("connected");
        } else if (e?.error !== "no-speech") {
          setCallState("connected");
        }
      };

      recognition.onend = () => {
        // Re-arm cleanly if call is still active and not speaking or thinking
        if (isHandsFree && !isMicMuted && callState === "listening" && !isProcessingTurnRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {}
  }, [isHandsFree, isMicMuted, callState, selectedLang, sendVoiceTurn]);

  const stopSpeechRecognition = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setLiveCallerTranscript("");
  }, []);

  // Barge-in / Interrupt Agent
  const handleInterruptAgent = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCallState("listening");
    if (!isMicMuted) {
      startSpeechRecognition();
    }
  }, [isMicMuted, startSpeechRecognition]);

  // Hold / Resume Call
  const handleToggleHold = useCallback(() => {
    if (callState === "on_hold") {
      // Resume call
      if (holdMusicStopperRef.current) {
        holdMusicStopperRef.current();
        holdMusicStopperRef.current = null;
      }
      setCallState("connected");
      toastSuccess("Call resumed from hold");
      if (isHandsFree && !isMicMuted) {
        startSpeechRecognition();
      }
    } else {
      // Put on hold
      stopSpeechRecognition();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      const stopHold = startHoldMusic();
      holdMusicStopperRef.current = stopHold;
      setCallState("on_hold");
      toastSuccess("Call placed on hold with acoustic chime");
    }
  }, [callState, isHandsFree, isMicMuted, startSpeechRecognition, stopSpeechRecognition, toastSuccess]);

  // Initialize Microphone Analyser for realistic Canvas visualizer
  const startMicrophoneStream = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      }
    } catch (err: any) {
      console.warn("Microphone stream note:", err?.message || err);
    }
  };

  // Start Voice Call
  const handleStartCall = async (customGreeting?: string) => {
    if (!currentOrg || !selectedAssistantId) return;

    // Immediately prime SpeechSynthesis and WebAudio on user gesture
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.resume();
          // Prime speech engine synchronously in user click handler
          const primer = new SpeechSynthesisUtterance(" ");
          primer.volume = 0.01;
          primer.rate = 2.0;
          window.speechSynthesis.speak(primer);
        } catch {}
      }

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const testCtx = new AudioContextClass();
          if (testCtx.state === "suspended") {
            testCtx.resume().catch(() => {});
          }
        } catch {}
      }
    }

    setCallState("ringing");
    setCallTurns([]);
    setCallDuration(0);
    setConversationId("");
    setTransferDetected(null);
    setDtmfBuffer("");
    setLatencyMs(null);
    setLiveCallerTranscript("");
    setShowSummaryModal(false);
    isProcessingTurnRef.current = false;

    // Start authentic ringback sound
    const stopRingback = startRingbackTone();
    ringbackStopperRef.current = stopRingback;

    // Connect microphone asynchronously without blocking connection delay
    startMicrophoneStream().catch(() => {});

    // Answer call after realistic 1.5s connection delay
    setTimeout(() => {
      if (ringbackStopperRef.current) ringbackStopperRef.current();
      playPickupTone();
      setCallState("connected");

      const opening = customGreeting || selectedLang.defaultGreeting;

      const initialTurn: CallTurn = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: opening,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setCallTurns([initialTurn]);

      // Speak opening greeting, then automatically arm microphone
      speakAssistantReply(opening, () => {
        if (isHandsFree && !isMicMuted) {
          startSpeechRecognition();
        }
      });
    }, 1500);
  };

  // End Voice Call
  const handleEndCall = () => {
    if (ringbackStopperRef.current) ringbackStopperRef.current();
    if (holdMusicStopperRef.current) {
      holdMusicStopperRef.current();
      holdMusicStopperRef.current = null;
    }
    playHangupTone();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopSpeechRecognition();
    stopMicrophoneStream();
    setCallState("ended");
    setShowSummaryModal(true);

    if (currentOrg && selectedAssistantId && conversationId) {
      api.endConversation(currentOrg.id, selectedAssistantId, conversationId).catch(() => {});
    }
  };

  // Keypad press
  const handleKeypadPress = (digit: string) => {
    playDtmfTone(digit);
    setDtmfBuffer((prev) => prev + digit);
    if (["connected", "listening", "speaking"].includes(callState)) {
      sendVoiceTurn(`[Keypad Pressed DTMF digit: ${digit}]`);
    }
  };

  // Handle manual text submission
  const handleSendUtterance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textUtterance.trim() || callState === "idle" || callState === "ended") return;
    const txt = textUtterance.trim();
    setTextUtterance("");
    sendVoiceTurn(txt);
  };

  // Export Call Transcript (JSON format)
  const handleDownloadTranscript = () => {
    const payload = {
      assistantId: selectedAssistantId,
      assistantName: activeAssistant?.name,
      conversationId: conversationId,
      language: selectedLang.name,
      durationSeconds: callDuration,
      formattedDuration: formatTimer(callDuration),
      totalTurns: callTurns.length,
      turns: callTurns,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-call-transcript-${conversationId || "session"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Call transcript exported as JSON");
  };

  // Copy full transcript text
  const handleCopyTranscript = () => {
    const text = callTurns
      .map((t) => `[${t.timestamp}] ${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toastSuccess("Transcript copied to clipboard");
  };

  // Dispatch real Twilio call
  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !selectedAssistantId) return;
    if (!toPhoneNumber.trim()) {
      toastError("Destination phone number is required");
      return;
    }

    setIsCallingOutbound(true);
    setLastCallResult(null);

    try {
      const res = await api.initiateCall(currentOrg.id, selectedAssistantId, {
        toPhoneNumber: toPhoneNumber.trim(),
        openingMessage: openingMessage.trim(),
      });
      setLastCallResult(res);
      toastSuccess(`Outbound call dispatched: SID ${res.callSid}`);
    } catch (err: any) {
      toastError(err?.message || "Failed to initiate outbound call");
    } finally {
      setIsCallingOutbound(false);
    }
  };

  const webhookUrl = "http://localhost:3002/api/voice/webhook";
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !currentOrg) {
    return <LoadingState message="Loading Voice Playground..." />;
  }

  // Count executed actions during call
  const totalActionsExecuted = callTurns.reduce((acc, turn) => {
    return acc + (turn.actionsTaken?.length || 0);
  }, 0);

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-slideUp">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentOrg?.name}
            </span>
            <span className="text-content-muted">/</span>
            <span className="text-xs text-content-muted">Voice Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Voice Playground
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Ultra-low latency telephony call simulator, multi-lingual AI voice assistant, continuous hands-free dialogue, and Twilio voice routing.
          </p>
        </div>

        {/* Assistant & Language Selection */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedLang.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) {
                  setSelectedLang(found);
                  toastSuccess(`Switched to ${found.name} (${found.flag})`);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-surface-border bg-surface font-semibold text-content-primary focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assistant Picker */}
          <div className="flex items-center gap-2">
            <select
              value={selectedAssistantId}
              onChange={(e) => {
                setSelectedAssistantId(e.target.value);
                if (callState !== "idle") handleEndCall();
              }}
              className="text-xs px-3 py-1.5 rounded-xl border border-surface-border bg-surface font-semibold text-content-primary focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.useCase.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Language Quick-Select Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-content-muted font-medium shrink-0">Language:</span>
        {SUPPORTED_LANGUAGES.slice(0, 8).map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              setSelectedLang(lang);
              toastSuccess(`Language set to ${lang.name}`);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
              selectedLang.code === lang.code
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary"
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.nativeName}</span>
          </button>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border gap-2">
        <button
          onClick={() => setActiveTab("playground")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "playground"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
              : "border-transparent text-content-muted hover:text-content-primary"
          }`}
        >
          <PhoneCall className="h-4 w-4" />
          <span>Interactive Voice Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab("outbound")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "outbound"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
              : "border-transparent text-content-muted hover:text-content-primary"
          }`}
        >
          <Phone className="h-4 w-4" />
          <span>Outbound Telephony Dialing</span>
        </button>

        <button
          onClick={() => setActiveTab("telephony")}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "telephony"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
              : "border-transparent text-content-muted hover:text-content-primary"
          }`}
        >
          <Radio className="h-4 w-4" />
          <span>Twilio Inbound & TwiML Setup</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE VOICE PLAYGROUND */}
      {activeTab === "playground" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Phone Console & Visualizer (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm relative overflow-hidden space-y-5">
              {/* Telephony Header & Call State */}
              <div className="flex items-center justify-between border-b border-surface-border pb-3.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      callState === "speaking"
                        ? "bg-emerald-500 animate-pulse"
                        : callState === "listening"
                        ? "bg-indigo-500 animate-pulse"
                        : callState === "thinking"
                        ? "bg-amber-500 animate-spin"
                        : callState === "connected"
                        ? "bg-emerald-500"
                        : callState === "on_hold"
                        ? "bg-purple-500 animate-pulse"
                        : callState === "ringing"
                        ? "bg-purple-500 animate-ping"
                        : "bg-content-muted"
                    }`}
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-content-primary">
                    {callState === "idle"
                      ? "Phone On Hook"
                      : callState === "ringing"
                      ? "Calling Line..."
                      : callState === "speaking"
                      ? "Agent Speaking..."
                      : callState === "listening"
                      ? "Listening to Caller..."
                      : callState === "thinking"
                      ? "AI Evaluating Intent..."
                      : callState === "on_hold"
                      ? "Call On Hold (Chime Active)"
                      : callState === "ended"
                      ? "Call Disconnected"
                      : "Call Connected"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {latencyMs && ["connected", "listening", "speaking"].includes(callState) && (
                    <span className="text-[10px] font-mono text-content-muted flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      {latencyMs}ms
                    </span>
                  )}
                  {["connected", "listening", "thinking", "speaking", "on_hold"].includes(callState) && (
                    <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      {formatTimer(callDuration)}
                    </div>
                  )}
                </div>
              </div>

              {/* Call Transfer Alert Banner */}
              {transferDetected && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-xs flex items-center gap-2 text-teal-800 dark:text-teal-200 animate-slideUp">
                  <PhoneForwarded className="h-4 w-4 text-teal-600 shrink-0" />
                  <div>
                    <div className="font-bold">Call Transferred via TwiML &lt;Dial&gt;</div>
                    <div className="text-[11px] font-mono text-teal-700 dark:text-teal-300">
                      Target: {transferDetected}
                    </div>
                  </div>
                </div>
              )}

              {/* Caller ID Card & Avatar */}
              <div className="text-center space-y-3 pt-1">
                <div className="relative inline-block">
                  {["connected", "listening", "thinking", "speaking", "on_hold"].includes(callState) && (
                    <div
                      className={`absolute -inset-3 rounded-full blur-xl opacity-50 transition-all ${
                        callState === "speaking"
                          ? "bg-emerald-500 animate-pulse"
                          : callState === "listening"
                          ? "bg-indigo-500 animate-pulse"
                          : callState === "on_hold"
                          ? "bg-purple-500 animate-pulse"
                          : "bg-amber-500 animate-pulse"
                      }`}
                    />
                  )}

                  <div className="relative h-24 w-24 mx-auto rounded-full border-2 border-surface-border bg-surface-raised flex items-center justify-center shadow-inner">
                    <Bot
                      className={`h-11 w-11 transition-all ${
                        callState === "speaking"
                          ? "text-emerald-600 dark:text-emerald-400 scale-110"
                          : callState === "listening"
                          ? "text-indigo-600 dark:text-indigo-400 scale-105"
                          : callState === "on_hold"
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-content-secondary"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-content-primary">
                    {activeAssistant?.name || "AI Voice Agent"}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-content-muted mt-0.5 font-mono">
                    <span>+1 (800) 555-AI24</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Wifi className="h-3 w-3" /> HD Voice
                    </span>
                    <span>•</span>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      {selectedLang.flag} {selectedLang.nativeName}
                    </span>
                  </div>
                </div>
              </div>

              {/* 60 FPS Real-Time Canvas Audio Frequency Visualizer */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={80}
                  className="w-full h-20 rounded-xl bg-surface-subtle border border-surface-border shadow-inner"
                />
                <div className="absolute right-2 top-2 text-[9px] font-mono text-content-muted uppercase tracking-wider">
                  {callState === "speaking"
                    ? "Audio Output: Active"
                    : callState === "listening"
                    ? "Mic Input: Capturing"
                    : callState === "on_hold"
                    ? "Hold Chime: Playing"
                    : "Audio: Standby"}
                </div>
              </div>

              {/* Real-Time Live STT Streaming Speech Bubble */}
              {callState === "listening" && liveCallerTranscript && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-100 animate-slideUp flex items-start gap-2 shadow-sm">
                  <Mic className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 mt-0.5 animate-pulse shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[10px] uppercase text-indigo-600 dark:text-indigo-400">
                      Hearing you live:
                    </span>
                    <p className="font-medium italic leading-relaxed">&ldquo;{liveCallerTranscript}&rdquo;</p>
                  </div>
                </div>
              )}

              {/* Barge-in / Interrupt Agent Button (Appears when Agent is Speaking) */}
              {callState === "speaking" && (
                <div className="flex justify-center animate-slideUp">
                  <button
                    onClick={handleInterruptAgent}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <Flame className="h-3.5 w-3.5 animate-bounce" />
                    <span>Interrupt Agent (Speak Now)</span>
                  </button>
                </div>
              )}

              {/* Call Control Buttons */}
              {callState === "idle" || callState === "ended" ? (
                <div className="space-y-3 pt-1">
                  <button
                    onClick={() => handleStartCall()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    <PhoneCall className="h-5 w-5" />
                    <span>Call Voice Assistant ({selectedLang.flag})</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStartCall(
                        selectedLang.code.startsWith("es")
                          ? "Hola, gracias por llamar a Acme Global. ¿En qué puedo ayudarle hoy?"
                          : selectedLang.code.startsWith("fr")
                          ? "Bonjour, merci d'avoir appelé Acme Global. Comment puis-je vous aider ?"
                          : "Hello, thank you for calling Acme Global. How may I direct your call today?"
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-xs font-semibold text-content-secondary transition-all"
                  >
                    <PhoneIncoming className="h-4 w-4 text-indigo-600" />
                    <span>Simulate Inbound Call</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Primary Telephony Action Bar */}
                  <div className="flex items-center justify-center gap-2.5">
                    {/* Microphone Mute */}
                    <button
                      onClick={() => {
                        setIsMicMuted((prev) => !prev);
                        if (!isMicMuted) {
                          stopSpeechRecognition();
                        } else if (isHandsFree && callState !== "on_hold") {
                          startSpeechRecognition();
                        }
                      }}
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                        isMicMuted
                          ? "bg-rose-500/10 border border-rose-500/20 text-rose-600"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-indigo-600" />}
                    </button>

                    {/* Speaker Audio Output */}
                    <button
                      onClick={() => {
                        setIsSpeakerEnabled((prev) => !prev);
                        if (isSpeakerEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                        isSpeakerEnabled
                          ? "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-600"
                      }`}
                      title={isSpeakerEnabled ? "Mute Speaker" : "Unmute Speaker"}
                    >
                      {isSpeakerEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>

                    {/* Hold / Resume Call Button */}
                    <button
                      onClick={handleToggleHold}
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                        callState === "on_hold"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title={callState === "on_hold" ? "Resume Call from Hold" : "Place Call on Hold"}
                    >
                      {callState === "on_hold" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>

                    {/* Keypad DTMF Toggle */}
                    <button
                      onClick={() => setShowKeypad((prev) => !prev)}
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                        showKeypad
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title="Touch-Tone Keypad"
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="h-0.5 w-0.5 rounded-full bg-current" />
                        ))}
                      </div>
                    </button>

                    {/* Red End Call Button */}
                    <button
                      onClick={handleEndCall}
                      className="h-11 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg hover:shadow-rose-500/20 transition-all active:scale-95"
                      title="Hang Up Call"
                    >
                      <PhoneOff className="h-4 w-4" />
                      <span>End Call</span>
                    </button>
                  </div>

                  {/* Manual Utterance Input (Allows typing simulated speech) */}
                  <form onSubmit={handleSendUtterance} className="relative flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={`Speak into mic or type in ${selectedLang.nativeName}...`}
                      value={textUtterance}
                      onChange={(e) => setTextUtterance(e.target.value)}
                      className="w-full text-xs pl-3 pr-10 py-2.5 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={!textUtterance.trim()}
                      className="absolute right-1.5 top-2.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                      title="Send Spoken Utterance"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              )}

              {/* Synthesized DTMF Keypad Drawer */}
              {showKeypad && (
                <div className="p-4 rounded-xl border border-surface-border bg-surface-raised/40 space-y-3 animate-slideUp">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-content-primary">DTMF Touch-Tone Keypad</span>
                    <span className="font-mono text-[11px] text-content-muted">
                      {dtmfBuffer ? `Buffer: ${dtmfBuffer}` : "Click to dial"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeypadPress(digit)}
                        className="p-2.5 rounded-xl border border-surface-border bg-surface hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/40 text-content-primary font-bold text-sm shadow-sm transition-all active:scale-95"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Voice Settings & Optimization Controls */}
            <div className="p-5 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <span>Acoustic & Voice Settings</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* One-click Audio / Speaker Test */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.resume();
                      }
                      speakAssistantReply(
                        selectedLang.code.startsWith("es")
                          ? "Prueba de audio. La salida de voz funciona correctamente."
                          : selectedLang.code.startsWith("fr")
                          ? "Test audio. La sortie vocale fonctionne correctement."
                          : selectedLang.code.startsWith("hi")
                          ? "ऑडियो टेस्ट। वॉयस आउटपुट चालू है।"
                          : selectedLang.code.startsWith("de")
                          ? "Audio-Test. Die Sprachausgabe funktioniert einwandfrei."
                          : "Audio check. Voice output is functioning properly."
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 transition-all flex items-center gap-1 active:scale-95"
                    title="Click to test your device speaker"
                  >
                    <Volume2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Test Audio</span>
                  </button>

                  {/* Hands-Free Toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-content-primary">
                    <input
                      type="checkbox"
                      checked={isHandsFree}
                      onChange={(e) => setIsHandsFree(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>Hands-Free</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-content-muted mb-1">
                    Voice ({matchingVoices.length} native)
                  </label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-surface-border bg-background text-content-primary focus:outline-none"
                  >
                    <option value="auto">Native Neural (Auto)</option>
                    {(matchingVoices.length > 0 ? matchingVoices : availableVoices).map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name.length > 24 ? v.name.substring(0, 24) + "..." : v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-content-muted mb-1">Pacing Rate: {selectedVoiceRate}x</label>
                  <input
                    type="range"
                    min={0.8}
                    max={1.35}
                    step={0.05}
                    value={selectedVoiceRate}
                    onChange={(e) => setSelectedVoiceRate(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Call Transcript & Audited Actions (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 flex flex-col h-[700px]">
            <div className="p-4 rounded-2xl border border-surface-border bg-surface shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-content-primary">Live Call Transcript & Audits</h3>
                {totalActionsExecuted > 0 && (
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {totalActionsExecuted} MCP Action{totalActionsExecuted > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {conversationId && (
                  <span className="text-[10px] font-mono text-content-muted bg-surface-raised px-2 py-0.5 rounded-lg border border-surface-border">
                    Session: {conversationId.substring(0, 8)}...
                  </span>
                )}
                {callTurns.length > 0 && (
                  <button
                    onClick={handleCopyTranscript}
                    className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-content-muted hover:text-content-primary transition-colors text-xs"
                    title="Copy full transcript"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
                {callTurns.length > 0 && (
                  <button
                    onClick={handleDownloadTranscript}
                    className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-content-muted hover:text-content-primary transition-colors text-xs"
                    title="Export transcript JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                {callTurns.length > 0 && (
                  <button
                    onClick={() => setCallTurns([])}
                    className="p-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-content-muted hover:text-content-primary transition-colors text-xs"
                    title="Clear transcript"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Log Box */}
            <div className="flex-1 p-6 rounded-2xl border border-surface-border bg-surface shadow-sm overflow-y-auto space-y-4">
              {callTurns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <PhoneCall className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-content-primary">No Active Voice Call</h4>
                  <p className="text-xs text-content-muted max-w-sm leading-relaxed">
                    Click &ldquo;Call Voice Assistant&rdquo; on the left to start a real-time hands-free audio conversation. Spoken speech and audited MCP tool actions will stream here.
                  </p>
                </div>
              ) : (
                callTurns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex gap-3 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {turn.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2 shadow-sm ${
                        turn.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-surface-raised border border-surface-border text-content-primary rounded-tl-none"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 pb-1 border-b border-white/10 dark:border-surface-border">
                        <span className="font-semibold uppercase tracking-wider">
                          {turn.role === "user" ? "Caller (You)" : activeAssistant?.name || "AI Phone Assistant"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{turn.timestamp}</span>
                          {turn.role === "assistant" && (
                            <button
                              onClick={() => speakAssistantReply(turn.content)}
                              className="hover:opacity-100 opacity-70 transition-opacity"
                              title="Replay Audio"
                            >
                              <Volume1 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="whitespace-pre-wrap leading-relaxed text-xs">{turn.content}</div>

                      {/* Audited Actions */}
                      {turn.actionsTaken && turn.actionsTaken.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-xl bg-surface border border-surface-border text-[11px] text-content-secondary space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                            <Wrench className="h-3.5 w-3.5" />
                            <span>Executed MCP Tool Action</span>
                          </div>
                          {turn.actionsTaken.map((act, i) => (
                            <div key={i} className="font-mono text-[10px] bg-background p-2 rounded-lg border border-surface-border">
                              <div className="font-bold text-indigo-600 dark:text-indigo-400">{act.name}</div>
                              {act.arguments && (
                                <pre className="mt-1 text-content-muted overflow-x-auto">
                                  {JSON.stringify(act.arguments, null, 2)}
                                </pre>
                              )}
                              {act.result && (
                                <pre className="mt-1 text-emerald-600 dark:text-emerald-400 overflow-x-auto">
                                  {JSON.stringify(act.result, null, 2)}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {turn.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="h-4 w-4 text-content-secondary" />
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Post-Call Summary Modal */}
      {showSummaryModal && callTurns.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-slideUp">
          <div className="bg-surface border border-surface-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-content-primary">Call Summary & Disposition</h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-content-muted hover:text-content-primary text-xs font-semibold px-2 py-1"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
                <div className="text-[10px] text-content-muted uppercase">Duration</div>
                <div className="text-sm font-bold text-content-primary font-mono mt-0.5">
                  {formatTimer(callDuration)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
                <div className="text-[10px] text-content-muted uppercase">Dialogue Turns</div>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                  {callTurns.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border">
                <div className="text-[10px] text-content-muted uppercase">Language</div>
                <div className="text-sm font-bold text-content-primary mt-0.5">
                  {selectedLang.flag} {selectedLang.nativeName}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-content-primary">Call Disposition:</div>
              <p className="text-content-muted leading-relaxed">
                Autonomous voice session concluded cleanly. All multi-turn dialogue, audio cadence metrics, and executed MCP actions were persisted to the MongoDB audit log.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                onClick={handleCopyTranscript}
                className="px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-xs font-semibold text-content-primary transition-colors flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Transcript</span>
              </button>
              <button
                onClick={handleDownloadTranscript}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OUTBOUND TELEPHONY DIALER */}
      {activeTab === "outbound" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
              <PhoneCall className="h-4 w-4 text-indigo-600" />
              <span>Place Outbound Real Phone Call (Twilio)</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Trigger a live telephony call to an external customer number via Twilio. When the recipient answers, Twilio connects them to the AI voice runtime.
            </p>

            <form onSubmit={handleInitiateCall} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Destination Phone Number (E.164) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+15551234567"
                  value={toPhoneNumber}
                  onChange={(e) => setToPhoneNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                />
                <p className="text-[10px] text-content-muted mt-1">Include country code (e.g. +1 for US/Canada).</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">Opening Greeting</label>
                <textarea
                  rows={3}
                  value={openingMessage}
                  onChange={(e) => setOpeningMessage(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isCallingOutbound}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
              >
                {isCallingOutbound ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PhoneCall className="h-3.5 w-3.5" />
                    <span>Dispatch Phone Call</span>
                  </>
                )}
              </button>
            </form>

            {lastCallResult && (
              <div className="mt-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs space-y-1.5 animate-slideUp">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Call Dispatched Successfully</span>
                </div>
                <div className="text-[11px] text-content-secondary font-mono space-y-0.5">
                  <div>Call SID: {lastCallResult.callSid}</div>
                  <div>Conversation ID: {lastCallResult.conversationId}</div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
              <PhoneForwarded className="h-4 w-4 text-teal-600" />
              <span>Autonomous Call Escalation</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              If an inbound or outbound caller requests a human manager, the assistant invokes the MCP action{" "}
              <code className="font-mono text-indigo-600 dark:text-indigo-400">transfer_call</code>.
            </p>
            <div className="p-4 rounded-xl border border-surface-border bg-surface-raised font-mono text-[11px] text-content-secondary leading-relaxed">
              &lt;Response&gt;
              <br />
              &nbsp;&nbsp;&lt;Say&gt;Connecting you with an account representative...&lt;/Say&gt;
              <br />
              &nbsp;&nbsp;&lt;Dial&gt;+15551234567&lt;/Dial&gt;
              <br />
              &lt;/Response&gt;
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TWILIO INBOUND & WEBHOOK SETUP */}
      {activeTab === "telephony" && (
        <div className="space-y-6 max-w-4xl">
          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
              <Radio className="h-4 w-4 text-purple-600" />
              <span>Twilio Phone Number Configuration</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              To connect phone numbers to your assistants, set your Twilio Console voice webhook to the public endpoint below:
            </p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Webhook URL (HTTP POST)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-surface-border bg-surface-raised font-mono text-content-primary select-all"
                />
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-xs font-medium text-content-primary transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
