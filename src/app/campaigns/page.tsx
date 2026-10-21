"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, OutboundMessageResponseData } from "@/lib/api";
import {
  Send,
  Mail,
  MessageSquare,
  Bot,
  Sparkles,
  CheckCircle2,
  Loader2,
  Wrench,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function CampaignsPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [recipient, setRecipient] = useState("");
  const [objective, setObjective] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<OutboundMessageResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    const fetchAssistants = async () => {
      setIsLoading(true);
      try {
        const list = await api.listAssistants(currentOrg.id);
        setAssistants(list);
        if (list.length > 0) {
          setSelectedAssistantId(list[0].id);
        }
      } catch (err: any) {
        toastError(err?.message || "Failed to load assistants");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssistants();
  }, [currentOrg]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !selectedAssistantId) return;
    if (!recipient.trim() || !objective.trim()) {
      toastError("Recipient and objective are required");
      return;
    }

    setIsSending(true);
    setLastResult(null);

    try {
      const res = await api.sendMessage(currentOrg.id, selectedAssistantId, {
        channel,
        recipient: recipient.trim(),
        objective: objective.trim(),
      });
      setLastResult(res);
      toastSuccess(`Proactive ${channel.toUpperCase()} outreach dispatched`);
    } catch (err: any) {
      toastError(err?.message || "Failed to dispatch message");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !currentOrg) {
    return <LoadingState message="Loading campaign dispatcher..." />;
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {currentOrg?.name}
          </span>
          <span className="text-content-muted">/</span>
          <span className="text-xs text-content-muted">Outbound Outreach</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          Proactive Messaging Campaigns
        </h1>
        <p className="text-xs text-content-muted mt-1">
          Instruct assistants to compose and dispatch proactive outreach messages over SMS or Email using MCP tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleDispatch} className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Outreach Assistant *
              </label>
              <select
                value={selectedAssistantId}
                onChange={(e) => setSelectedAssistantId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-medium"
              >
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.useCase.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Channel *
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    channel === "sms"
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                      : "border-surface-border bg-surface text-content-muted hover:text-content-primary"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>SMS Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    channel === "email"
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                      : "border-surface-border bg-surface text-content-muted hover:text-content-primary"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Message</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Recipient {channel === "sms" ? "(Phone Number)" : "(Email Address)"} *
              </label>
              <input
                type={channel === "sms" ? "tel" : "email"}
                required
                placeholder={channel === "sms" ? "+1XXXXXXXXXX" : "customer@example.com"}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Outreach Objective *
              </label>
              <textarea
                rows={4}
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="State the objective, context, and any specific questions to prompt the lead..."
                className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
              />
              <p className="text-[10px] text-content-muted mt-1">
                The LLM dynamically formats friendly copy without signatures and dispatches via the {channel === "sms" ? "send_sms" : "send_email"} MCP tool.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSending || assistants.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Generate & Send Message</span>
                </>
              )}
            </button>
          </form>

          {/* Dispatch Result Card */}
          {lastResult && (
            <div className="p-5 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-3 animate-slideUp">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Message Dispatched via MCP</span>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-content-secondary mb-1">Generated Copy:</div>
                <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/50 text-xs text-content-primary whitespace-pre-wrap leading-relaxed">
                  {lastResult.message}
                </div>
              </div>
              <div className="text-[10px] text-content-muted font-mono">
                Conversation ID: {lastResult.conversationId}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-surface-border bg-surface space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>How It Works</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              When an outbound campaign is triggered:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[11px] text-content-secondary leading-relaxed">
              <li>A new conversation is registered with <code className="font-mono text-indigo-600">direction: outbound</code>.</li>
              <li>The assistant reviews short-term memory (if any past turns exist).</li>
              <li>The LLM composes personalized outreach tailored to the channel constraints.</li>
              <li>The message is saved to MongoDB transcripts and memory.</li>
              <li>The corresponding MCP action (<code className="font-mono">send_email</code> or <code className="font-mono">send_sms</code>) dispatches the payload via external webhooks.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

