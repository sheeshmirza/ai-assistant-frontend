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

    gain.gain.value = 0.12;
    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    setTimeout(() => {
      osc1.stop();
      osc2.stop();
      ctx.close();
    }, 150);
  } catch {
    // AudioContext blocked or unsupported in current environment
  }
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
  const [showKeypad, setShowKeypad] = useState(false);
  const [dtmfBuffer, setDtmfBuffer] = useState<string>("");
  const [textUtterance, setTextUtterance] = useState("");
  const [isSpeechRecognitionActive, setIsSpeechRecognitionActive] = useState(false);
  const [transferDetected, setTransferDetected] = useState<string | null>(null);

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
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll transcript to bottom
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [callTurns]);

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

  // Web Speech Synthesis (Assistant speaking aloud)
  const speakAssistantReply = useCallback(
    (text: string) => {
      if (!isSpeakerEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setCallState("connected");
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select pleasant voice if available
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;

      utterance.onstart = () => {
        setCallState("speaking");
      };

      utterance.onend = () => {
        setCallState("connected");
      };

      utterance.onerror = () => {
        setCallState("connected");
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeakerEnabled]
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

      try {
        const res = await api.sendChat(currentOrg.id, {
          assistantId: selectedAssistantId,
          conversationId: conversationId || undefined,
          message: userText,
          channel: "voice",
        });

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

        // Check if call transfer tool was invoked
        const transfer = actions.find((a: ActionTaken) => a.name === "transfer_call");
        if (transfer) {
          const target = (transfer.arguments as any)?.target_phone_number || "human department";
          setTransferDetected(target);
          toastSuccess(`Call transferred to ${target}`);
        }

        speakAssistantReply(res.reply);
      } catch (err: any) {
        toastError(err?.message || "Voice connection encountered an error");
        setCallState("connected");
      }
    },
    [currentOrg, selectedAssistantId, conversationId, speakAssistantReply, toastSuccess, toastError]
  );

  // Setup Web Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toastError("Speech Recognition not supported in this browser. You can type utterances below.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsSpeechRecognitionActive(true);
        setCallState("listening");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          sendVoiceTurn(transcript);
        }
      };

      recognition.onerror = () => {
        setIsSpeechRecognitionActive(false);
        setCallState("connected");
      };

      recognition.onend = () => {
        setIsSpeechRecognitionActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsSpeechRecognitionActive(false);
    }
  }, [sendVoiceTurn, toastError]);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsSpeechRecognitionActive(false);
    }
  };

  // Start Voice Call
  const handleStartCall = async (greetingMessage?: string) => {
    if (!currentOrg || !selectedAssistantId) return;

    setCallState("ringing");
    setCallTurns([]);
    setCallDuration(0);
    setConversationId("");
    setTransferDetected(null);
    setDtmfBuffer("");

    // Simulate phone connection latency (1.2s)
    setTimeout(async () => {
      setCallState("connected");
      const opening =
        greetingMessage ||
        activeAssistant?.systemPrompt?.split(".")[0] ||
        "Hello! Thank you for calling. How can I help you today?";

      const initialTurn: CallTurn = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: opening,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setCallTurns([initialTurn]);
      speakAssistantReply(opening);
    }, 1200);
  };

  // End Voice Call
  const handleEndCall = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    stopSpeechRecognition();
    setCallState("ended");

    // Close conversation session if conversationId exists
    if (currentOrg && selectedAssistantId && conversationId) {
      api.endConversation(currentOrg.id, selectedAssistantId, conversationId).catch(() => {});
    }
  };

  // Keypad press
  const handleKeypadPress = (digit: string) => {
    playDtmfTone(digit);
    setDtmfBuffer((prev) => prev + digit);
    if (callState === "connected" || callState === "listening") {
      sendVoiceTurn(`[Keypad Pressed DTMF digit: ${digit}]`);
    }
  };

  // Handle manual text submission into call
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
            Simulate real-time phone calls with AI voice agents, test spoken speech synthesis, and manage telephony channels.
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
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm relative overflow-hidden space-y-6">
              {/* Call Status Badge */}
              <div className="flex items-center justify-between border-b border-surface-border pb-4">
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
                      ? "Ready to Connect"
                      : callState === "ringing"
                      ? "Dialing Assistant..."
                      : callState === "speaking"
                      ? "Assistant Speaking..."
                      : callState === "listening"
                      ? "Listening to You..."
                      : callState === "thinking"
                      ? "Processing Intent..."
                      : callState === "ended"
                      ? "Call Ended"
                      : "Call Connected"}
                  </span>
                </div>

                {["connected", "listening", "thinking", "speaking"].includes(callState) && (
                  <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    {formatTimer(callDuration)}
                  </div>
                )}
              </div>

              {/* Call Transfer Banner */}
              {transferDetected && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-500/30 text-xs flex items-center gap-2 text-teal-800 dark:text-teal-200 animate-slideUp">
                  <PhoneForwarded className="h-4 w-4 text-teal-600 shrink-0" />
                  <div>
                    <div className="font-bold">Call Transferred via MCP</div>
                    <div className="text-[11px] font-mono text-teal-700 dark:text-teal-300">
                      Target: {transferDetected}
                    </div>
                  </div>
                </div>
              )}

              {/* Central Audio Visualizer Avatar */}
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  {/* Glowing pulses */}
                  {["connected", "listening", "thinking", "speaking"].includes(callState) && (
                    <div
                      className={`absolute -inset-4 rounded-full blur-xl opacity-40 transition-all ${
                        callState === "speaking"
                          ? "bg-emerald-500 animate-pulse"
                          : callState === "listening"
                          ? "bg-indigo-500 animate-pulse"
                          : "bg-amber-500 animate-pulse"
                      }`}
                    />
                  )}

                  <div className="relative h-28 w-28 rounded-full border-2 border-surface-border bg-surface-raised flex items-center justify-center shadow-inner">
                    <Bot
                      className={`h-12 w-12 transition-all ${
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
                  <p className="text-xs text-content-muted capitalize mt-0.5">
                    {activeAssistant?.useCase.replace(/_/g, " ")} • Telephony Voice
                  </p>
                </div>

                {/* Animated Waveform Visualizer */}
                {["connected", "listening", "thinking", "speaking"].includes(callState) && (
                  <div className="flex items-center justify-center gap-1.5 h-8">
                    {[16, 24, 32, 20, 28, 12, 30, 22, 14].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${
                          callState === "speaking"
                            ? "bg-emerald-500 animate-pulse"
                            : callState === "listening"
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-surface-border"
                        }`}
                        style={{
                          height:
                            callState === "speaking"
                              ? `${h}px`
                              : callState === "listening"
                              ? `${Math.max(8, h * 0.7)}px`
                              : "6px",
                          animationDelay: `${i * 120}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Main Call Action Buttons */}
              {callState === "idle" || callState === "ended" ? (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleStartCall()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg hover:shadow-emerald-500/20 transition-all"
                  >
                    <PhoneCall className="h-5 w-5" />
                    <span>Start Voice Call (Simulator)</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStartCall("Hello, thank you for calling customer service. How may I direct your call?")
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-xs font-semibold text-content-secondary transition-all"
                  >
                    <PhoneIncoming className="h-4 w-4 text-indigo-600" />
                    <span>Simulate Inbound Customer Call</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Active Call Controls */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Mic Toggle */}
                    <button
                      onClick={() => {
                        if (isSpeechRecognitionActive) {
                          stopSpeechRecognition();
                        } else {
                          startSpeechRecognition();
                        }
                      }}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        isSpeechRecognitionActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 ring-4 ring-indigo-500/20"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title={isSpeechRecognitionActive ? "Stop Speech Input" : "Speak to Assistant"}
                    >
                      <Mic className="h-5 w-5" />
                    </button>

                    {/* Speaker Output Toggle */}
                    <button
                      onClick={() => setIsSpeakerEnabled((prev) => !prev)}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        isSpeakerEnabled
                          ? "bg-surface-raised border border-surface-border text-content-primary"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-600"
                      }`}
                      title={isSpeakerEnabled ? "Mute Assistant Audio" : "Unmute Assistant Audio"}
                    >
                      {isSpeakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </button>

                    {/* Keypad Toggle */}
                    <button
                      onClick={() => setShowKeypad((prev) => !prev)}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                        showKeypad
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-surface-raised border border-surface-border text-content-primary hover:bg-surface-border"
                      }`}
                      title="Toggle Dialpad"
                    >
                      <div className="grid grid-cols-3 gap-0.5">
                        {[...Array(9)].map((_, i) => (
                          <div key={i} className="h-1 w-1 rounded-full bg-current" />
                        ))}
                      </div>
                    </button>

                    {/* Hang Up Button */}
                    <button
                      onClick={handleEndCall}
                      className="h-12 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-rose-500/20 transition-all"
                      title="Hang Up Call"
                    >
                      <PhoneOff className="h-5 w-5" />
                      <span>Hang Up</span>
                    </button>
                  </div>

                  {/* Manual Utterance Input (Allows typing simulated speech) */}
                  <form onSubmit={handleSendUtterance} className="relative flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Speak into microphone or type speech utterance..."
                      value={textUtterance}
                      onChange={(e) => setTextUtterance(e.target.value)}
                      className="w-full text-xs pl-3 pr-10 py-2.5 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="submit"
                      disabled={!textUtterance.trim()}
                      className="absolute right-1.5 top-3.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                      title="Send Utterance"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </form>
                </div>
              )}

              {/* Synthesized DTMF Dialpad Drawer */}
              {showKeypad && (
                <div className="p-4 rounded-xl border border-surface-border bg-surface-raised/40 space-y-3 animate-slideUp">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-content-primary">DTMF Touch-Tone Keypad</span>
                    <span className="font-mono text-[11px] text-content-muted">
                      {dtmfBuffer ? `Input: ${dtmfBuffer}` : "Press digits"}
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

            {/* Voice Telephony Specs Card */}
            <div className="p-5 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Voice Agent Capabilities</span>
              </div>
              <div className="text-xs text-content-secondary space-y-1.5 leading-relaxed">
                <div>
                  <span className="font-semibold text-content-primary">Model: </span>
                  <span className="font-mono text-[11px]">Gemini 2.5 Flash Lite (ultra-low latency voice)</span>
                </div>
                <div>
                  <span className="font-semibold text-content-primary">Enabled Channels: </span>
                  <span className="font-mono text-[11px]">{activeAssistant?.channels.join(", ")}</span>
                </div>
                <div>
                  <span className="font-semibold text-content-primary">MCP Actions: </span>
                  <span className="font-mono text-[11px]">
                    {activeAssistant?.enabledActions && activeAssistant.enabledActions.length > 0
                      ? activeAssistant.enabledActions.join(", ")
                      : "Standard phone dialogue"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Call Transcript & Audited Actions (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 flex flex-col h-[680px]">
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
                    Start a simulated phone call using the console on the left. The caller speech turns and assistant verbal replies will stream here in real time.
                  </p>
                </div>
              ) : (
                callTurns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex gap-3 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {turn.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
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
