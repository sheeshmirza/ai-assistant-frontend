"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, OutboundCallResponseData } from "@/lib/api";
import {
  PhoneCall,
  PhoneForwarded,
  Radio,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Bot,
  Sparkles,
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";
import { LoadingState } from "@/components/ui/LoadingState";

export default function VoiceTelephonyPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const searchParams = useSearchParams();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [toPhoneNumber, setToPhoneNumber] = useState("");
  const [openingMessage, setOpeningMessage] = useState(
    "Hello! This is Acme Health calling to confirm your upcoming appointment."
  );
  const [isCalling, setIsCalling] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<OutboundCallResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    const fetchAssistants = async () => {
      setIsLoading(true);
      try {
        const list = await api.listAssistants(currentOrg.id);
        const voiceAssistants = list.filter((a) => a.channels.includes("voice"));
        setAssistants(voiceAssistants);

        const paramId = searchParams.get("assistantId");
        if (paramId && voiceAssistants.some((a) => a.id === paramId)) {
          setSelectedAssistantId(paramId);
        } else if (voiceAssistants.length > 0) {
          setSelectedAssistantId(voiceAssistants[0].id);
        }
      } catch (err: any) {
        toastError(err?.message || "Failed to load voice assistants");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssistants();
  }, [currentOrg, searchParams]);

  const activeAssistant = assistants.find((a) => a.id === selectedAssistantId);

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !selectedAssistantId) return;
    if (!toPhoneNumber.trim()) {
      toastError("Destination phone number is required");
      return;
    }

    setIsCalling(true);
    setLastCallResult(null);

    try {
      const res = await api.initiateCall(currentOrg.id, selectedAssistantId, {
        to: toPhoneNumber.trim(),
        openingMessage: openingMessage.trim(),
      });
      setLastCallResult(res);
      toastSuccess(`Call initiated with SID: ${res.callSid}`);
    } catch (err: any) {
      toastError(err?.message || "Failed to initiate outbound call");
    } finally {
      setIsCalling(false);
    }
  };

  const webhookUrl = "http://localhost:3002/api/voice/webhook";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !currentOrg) {
    return <LoadingState message="Loading voice telephony engine..." />;
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentOrg?.name}
            </span>
            <span className="text-content-muted">/</span>
            <span className="text-xs text-content-muted">Voice & Telephony</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Voice Telephony Engine
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Orchestrate inbound customer phone calls, outbound appointment reminders, and live call transfers.
          </p>
        </div>

        {/* Selected Assistant Indicator */}
        {assistants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted">Active Voice Agent:</span>
            <select
              value={selectedAssistantId}
              onChange={(e) => setSelectedAssistantId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-surface-border bg-surface font-semibold text-content-primary focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {assistants.length === 0 ? (
        <div className="p-12 rounded-2xl border border-surface-border bg-surface text-center">
          <PhoneCall className="h-10 w-10 text-content-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-content-primary mb-1">No voice assistants configured</h3>
          <p className="text-xs text-content-muted mb-4 max-w-sm mx-auto">
            Enable the <strong>Voice Telephony</strong> channel on any assistant in the Assistants dashboard to begin accepting and making phone calls.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Outbound Call Placement */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                <PhoneCall className="h-4 w-4 text-indigo-600" />
                <span>Place Outbound Call</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">
                Trigger a proactive phone call to a customer or lead. When the recipient answers, Twilio connects them to the assistant.
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
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    Opening Greeting
                  </label>
                  <textarea
                    rows={3}
                    value={openingMessage}
                    onChange={(e) => setOpeningMessage(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCalling}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
                >
                  {isCalling ? (
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

            {/* Live Call Transfer Info */}
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                <PhoneForwarded className="h-4 w-4 text-teal-600" />
                <span>Autonomous Call Transfer</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">
                If the assistant determines that a caller requires human escalation, it invokes the MCP action <code className="font-mono text-indigo-600 dark:text-indigo-400">transfer_call</code>.
              </p>
              <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/40 font-mono text-[11px] text-content-secondary leading-relaxed">
                TwiML emitted: &lt;Dial&gt;+15551234567&lt;/Dial&gt;
              </div>
            </div>
          </div>

          {/* Right Column: Inbound Webhook Configuration */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                <Radio className="h-4 w-4 text-purple-600" />
                <span>Twilio Inbound Phone Setup</span>
              </div>
              <p className="text-xs text-content-muted leading-relaxed">
                Configure your Twilio Phone Number Console to forward inbound phone calls directly to the platform AI voice runtime.
              </p>

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Webhook URL (HTTP POST)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-surface-border bg-surface-raised font-mono text-content-primary select-all"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className="p-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary transition-colors"
                    title="Copy URL"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs text-content-secondary">
                <div className="font-semibold text-content-primary">Webhook Lifecycle:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-content-muted text-[11px] leading-relaxed">
                  <li>Caller dials your assigned Twilio number.</li>
                  <li>Twilio executes HTTP POST to <code className="font-mono">/api/voice/webhook</code> with cryptographic HMAC signature.</li>
                  <li>AI service validates signature and returns TwiML <code className="font-mono">&lt;Gather input="speech"&gt;</code>.</li>
                  <li>Speech is converted to text and submitted to <code className="font-mono">/api/voice/turn</code>.</li>
                  <li>Assistant synthesizes conversational response and speaks via TwiML <code className="font-mono">&lt;Say&gt;</code>.</li>
                </ol>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-content-primary mb-2">Sample TwiML Response</h4>
                <CodeSnippet
                  code={`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello! Thanks for calling Acme Health. How can I help you today?</Say>
  <Gather input="speech" action="/api/voice/turn" method="POST">
    <Say>I'm listening...</Say>
  </Gather>
</Response>`}
                  language="xml"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

