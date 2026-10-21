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
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";
import { LoadingState } from "@/components/ui/LoadingState";

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
    const freqs = DTMF_FREQS[char];
    if (!freqs) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
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
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 440;
    osc2.frequency.value = 480;
    gain.gain.value = 0.05;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    let ringOn = true;
    const interval = setInterval(() => {
      ringOn = !ringOn;
      gain.gain.setValueAtTime(ringOn ? 0.05 : 0.0001, ctx.currentTime);
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

// Play connection pickup click
function playPickupTone() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(480, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
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

  // Active Tab
  const [activeTab, setActiveTab] = useState<"playground" | "outbound" | "telephony">("playground");

  // Assistants State
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Playground Call Session State
  const [callState, setCallState] = useState<
    "idle" | "ringing" | "connected" | "listening" | "thinking" | "speaking" | "ended"
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

  // Voice Persona Settings
  const [selectedVoiceRate, setSelectedVoiceRate] = useState<number>(1.05);
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
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Canvas Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Scroll transcript to bottom
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [callTurns]);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
      setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

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
    if (["connected", "listening", "thinking", "speaking"].includes(callState)) {
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
        freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);
      }

      const centerY = height / 2;
      const isCallActive = ["connected", "listening", "thinking", "speaking"].includes(callState);

      if (!isCallActive) {
        // Resting flatline
        ctx.beginPath();
        ctx.strokeStyle = "rgba(156, 163, 175, 0.3)";
        ctx.lineWidth = 2;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
      } else if (callState === "speaking") {
        // Organic assistant speaking waves
        phase += 0.08;
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
            centerY +
            Math.sin(x * 0.04 - phase * 1.2) * 12 * Math.sin((x / width) * Math.PI);
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
          const y =
            centerY +
            Math.sin(x * 0.08 + phase) * 8 * Math.sin((x / width) * Math.PI);
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
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.5)";
        for (let x = 0; x < width; x += 4) {
          const y =
            centerY +
            Math.sin(x * 0.02 + phase) * 5 * Math.sin((x / width) * Math.PI);
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

  // Web Speech Synthesis (Assistant speaking aloud)
  const speakAssistantReply = useCallback(
    (text: string, onDone?: () => void) => {
      if (!isSpeakerEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setCallState("connected");
        if (onDone) onDone();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = selectedVoiceRate;
      utterance.pitch = 1.0;

      // Select voice
      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (selectedVoiceName !== "auto") {
        chosenVoice = voices.find((v) => v.name === selectedVoiceName);
      }

      if (!chosenVoice) {
        chosenVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Daniel") ||
                v.name.includes("Jenny"))
          ) || voices.find((v) => v.lang.startsWith("en"));
      }

      if (chosenVoice) utterance.voice = chosenVoice;

      utterance.onstart = () => {
        setCallState("speaking");
      };

      utterance.onend = () => {
        setCallState("connected");
        if (onDone) onDone();
      };

      utterance.onerror = () => {
        setCallState("connected");
        if (onDone) onDone();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeakerEnabled, selectedVoiceName, selectedVoiceRate]
  );

  // Send a voice turn to the backend
  const sendVoiceTurn = useCallback(
    async (spokenText: string) => {
      if (!currentOrg || !selectedAssistantId || !spokenText.trim()) return;

      const userText = spokenText.trim();
      const userTurn: CallTurn = {
        id: Math.random().toString(36).substring(2, 9),
        role: "user",
        content: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setCallTurns((prev) => [...prev, userTurn]);
      setCallState("thinking");

      const t0 = performance.now();
      try {
        const res = await api.sendChat(currentOrg.id, {
          assistantId: selectedAssistantId,
          conversationId: conversationId || undefined,
          message: userText,
          channel: "voice",
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
          const target = (transfer.arguments as any)?.target_phone_number || "human department";
          setTransferDetected(target);
          toastSuccess(`Call transferred to ${target}`);
        }

        // Speak reply, then resume listening if hands-free
        speakAssistantReply(res.reply, () => {
          if (isHandsFree && !isMicMuted && callState !== "ended") {
            startSpeechRecognition();
          }
        });
      } catch (err: any) {
        toastError(err?.message || "Voice connection encountered an error");
        setCallState("connected");
      }
    },
    [
      currentOrg,
      selectedAssistantId,
      conversationId,
      speakAssistantReply,
      isHandsFree,
      isMicMuted,
      callState,
      toastSuccess,
      toastError,
    ]
  );

  // Setup Web Speech Recognition with Hands-Free Continuous Loop
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined" || isMicMuted) return;
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
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setCallState("listening");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          sendVoiceTurn(transcript);
        }
      };

      recognition.onerror = () => {
        setCallState("connected");
      };

      recognition.onend = () => {
        // In continuous hands-free mode, if not speaking or thinking, re-arm
        if (isHandsFree && !isMicMuted && callState === "listening") {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {}
  }, [isHandsFree, isMicMuted, callState, sendVoiceTurn]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // Initialize Microphone Analyser for realistic Canvas visualizer
  const startMicrophoneStream = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      // Mic permission blocked or unavailable
    }
  };

  // Start Voice Call
  const handleStartCall = async (customGreeting?: string) => {
    if (!currentOrg || !selectedAssistantId) return;

    setCallState("ringing");
    setCallTurns([]);
    setCallDuration(0);
    setConversationId("");
    setTransferDetected(null);
    setDtmfBuffer("");
    setLatencyMs(null);

    // Start authentic ringback sound
    const stopRingback = startRingbackTone();
    ringbackStopperRef.current = stopRingback;

    // Connect microphone for real-time frequency analysis
    await startMicrophoneStream();

    // Answer call after realistic 1.6s connection delay
    setTimeout(() => {
      if (ringbackStopperRef.current) ringbackStopperRef.current();
      playPickupTone();
      setCallState("connected");

      const opening =
        customGreeting ||
        activeAssistant?.systemPrompt?.split(".")[0]?.trim() ||
        "Hello! Thank you for calling. How can I help you today?";

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
    }, 1600);
  };

  // End Voice Call
  const handleEndCall = () => {
    if (ringbackStopperRef.current) ringbackStopperRef.current();
    playHangupTone();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopSpeechRecognition();
    stopMicrophoneStream();
    setCallState("ended");

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
            Real-time telephony phone call simulator, continuous hands-free dialogue, audio visualizer, and Twilio voice routing.
          </p>
        </div>

        {/* Assistant Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted">Voice Assistant:</span>
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
                  {["connected", "listening", "thinking", "speaking"].includes(callState) && (
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
                  {["connected", "listening", "thinking", "speaking"].includes(callState) && (
                    <div
                      className={`absolute -inset-3 rounded-full blur-xl opacity-50 transition-all ${
                        callState === "speaking"
                          ? "bg-emerald-500 animate-pulse"
                          : callState === "listening"
                          ? "bg-indigo-500 animate-pulse"
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
                    : "Audio: Standby"}
                </div>
              </div>

              {/* Call Control Buttons */}
              {callState === "idle" || callState === "ended" ? (
                <div className="space-y-3 pt-1">
                  <button
                    onClick={() => handleStartCall()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    <PhoneCall className="h-5 w-5" />
                    <span>Call Voice Assistant</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStartCall("Hello, thank you for calling customer support. How may I direct your call today?")
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-xs font-semibold text-content-secondary transition-all"
                  >
                    <PhoneIncoming className="h-4 w-4 text-indigo-600" />
                    <span>Simulate Incoming Caller</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Call Action Bar */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Microphone Mute */}
                    <button
                      onClick={() => {
                        setIsMicMuted((prev) => !prev);
                        if (!isMicMuted) {
                          stopSpeechRecognition();
                        } else if (isHandsFree) {
                          startSpeechRecognition();
                        }
                      }}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        isMicMuted
                          ? "bg-rose-500/10 border border-rose-500/20 text-rose-600"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                      {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-indigo-600" />}
                    </button>

                    {/* Speaker Audio Output */}
                    <button
                      onClick={() => {
                        setIsSpeakerEnabled((prev) => !prev);
                        if (isSpeakerEnabled && typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        isSpeakerEnabled
                          ? "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-600"
                      }`}
                      title={isSpeakerEnabled ? "Mute Speaker" : "Unmute Speaker"}
                    >
                      {isSpeakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>

                    {/* Keypad DTMF Toggle */}
                    <button
                      onClick={() => setShowKeypad((prev) => !prev)}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        showKeypad
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title="Touch-Tone Keypad"
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="h-1 w-1 rounded-full bg-current" />
                        ))}
                      </div>
                    </button>

                    {/* Red End Call Button */}
                    <button
                      onClick={handleEndCall}
                      className="h-12 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-rose-500/20 transition-all active:scale-95"
                      title="Hang Up Call"
                    >
                      <PhoneOff className="h-5 w-5" />
                      <span>End Call</span>
                    </button>
                  </div>

                  {/* Manual Utterance Input (Allows typing simulated speech) */}
                  <form onSubmit={handleSendUtterance} className="relative flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Speak into microphone or type speech turn..."
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

                {/* Hands-Free Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-content-primary">
                  <input
                    type="checkbox"
                    checked={isHandsFree}
                    onChange={(e) => setIsHandsFree(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Hands-Free Auto-Dialogue</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-content-muted mb-1">Synthesizer Voice</label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full text-[11px] px-2 py-1.5 rounded-lg border border-surface-border bg-background text-content-primary focus:outline-none"
                  >
                    <option value="auto">Natural Neural (Auto)</option>
                    {availableVoices.map((v) => (
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
                    min={0.9}
                    max={1.25}
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
              </div>

              <div className="flex items-center gap-2">
                {conversationId && (
                  <span className="text-[10px] font-mono text-content-muted bg-surface-raised px-2 py-0.5 rounded-lg border border-surface-border">
                    Session: {conversationId.substring(0, 8)}...
                  </span>
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
