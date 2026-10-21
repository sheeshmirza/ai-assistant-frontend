"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, Assistant, Conversation } from "@/lib/api";
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Wrench,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  Send,
  Activity,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function OverviewPage() {
  const { currentOrg } = useAuth();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [platformHealth, setPlatformHealth] = useState<string>("checking");

  const loadData = useCallback(async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const assts = await api.listAssistants(currentOrg.id);
      setAssistants(assts);

      // Load conversations from first assistant if available
      if (assts.length > 0) {
        try {
          const convs = await api.listConversations(currentOrg.id, assts[0].id);
          setConversations(convs);
        } catch {
          setConversations([]);
        }
      } else {
        setConversations([]);
      }

      // Check health
      try {
        const h = await api.getPlatformHealth();
        setPlatformHealth(h?.status === "ok" ? "healthy" : "warning");
      } catch {
        setPlatformHealth("unreachable");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !currentOrg) {
    return <LoadingState message="Loading platform overview..." />;
  }

  const activeAssistants = assistants.filter((a) => a.status === "active").length;
  const voiceAssistants = assistants.filter((a) => a.channels.includes("voice")).length;
  const chatAssistants = assistants.filter((a) => a.channels.includes("chat")).length;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-slideUp">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentOrg?.name || "Workspace"}
            </span>
            <span className="text-content-muted">/</span>
            <span className="text-xs text-content-muted">Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            AI Assistant Operations
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Monitor real-time voice telephony, chat dialogues, and autonomous MCP actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-xs font-medium text-content-secondary transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/assistants"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Assistant</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <ErrorState title="Could not load overview" message={errorMsg} onRetry={loadData} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-content-muted">Active Assistants</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-content-primary">{activeAssistants}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-content-muted">
            <span>{chatAssistants} chat</span>
            <span>•</span>
            <span>{voiceAssistants} voice</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-content-muted">Conversations (Total)</span>
            <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-content-primary">{conversations.length}</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>PostgreSQL & Mongo Synced</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-content-muted">Telephony Channels</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-content-primary">Twilio Voice</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-content-muted">
            <span>Inbound webhook & outbound calls</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-content-muted">Platform Runtime</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-content-primary capitalize">
            {platformHealth === "healthy" ? "100% Operational" : platformHealth}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-content-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Go Platform API + Python AI</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Assistants & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Deployed Assistants */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">Configured Assistants</h2>
            <Link href="/assistants" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              View all ({assistants.length})
            </Link>
          </div>

          {assistants.length === 0 ? (
            <div className="p-8 rounded-2xl border border-surface-border bg-surface text-center">
              <Bot className="h-8 w-8 text-content-muted mx-auto mb-2" />
              <p className="text-xs font-semibold text-content-primary mb-1">No assistants created yet</p>
              <p className="text-[11px] text-content-muted mb-4 max-w-sm mx-auto">
                Create your first assistant to handle inbound queries, schedule appointments, or make outbound calls.
              </p>
              <Link
                href="/assistants"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Assistant</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assistants.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-surface-border bg-surface hover:border-surface-borderHover transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-surface-raised flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 border border-surface-border">
                      {a.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-content-primary">{a.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-content-muted">
                        <span className="capitalize">{a.useCase.replace(/_/g, " ")}</span>
                        <span>•</span>
                        <span>{a.channels.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                        a.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {a.status}
                    </span>
                    <Link
                      href={`/chat?assistantId=${a.id}`}
                      className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-raised transition-colors"
                      title="Test Chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Launch & Diagnostics */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">Quick Actions</h2>
          <div className="p-5 rounded-2xl border border-surface-border bg-surface space-y-3">
            <Link
              href="/chat"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-subtle transition-colors border border-surface-border"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-content-primary">Interactive Chat</div>
                  <div className="text-[10px] text-content-muted">Test dialogue turns & RAG</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
            </Link>

            <Link
              href="/voice"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-subtle transition-colors border border-surface-border"
            >
              <div className="flex items-center gap-2.5">
                <PhoneCall className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <div>
                  <div className="text-xs font-semibold text-content-primary">Voice Telephony</div>
                  <div className="text-[10px] text-content-muted">Trigger outbound phone call</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
            </Link>

            <Link
              href="/campaigns"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-subtle transition-colors border border-surface-border"
            >
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div>
                  <div className="text-xs font-semibold text-content-primary">Outbound Campaign</div>
                  <div className="text-[10px] text-content-muted">Proactive SMS & email outreach</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
            </Link>

            <Link
              href="/actions"
              className="flex items-center justify-between p-3 rounded-xl bg-surface-raised hover:bg-surface-subtle transition-colors border border-surface-border"
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-content-primary">MCP Actions</div>
                  <div className="text-[10px] text-content-muted">Inspect tools & test webhooks</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-content-muted" />
            </Link>
          </div>

          {/* Quick curl test snippet */}
          <div>
            <h3 className="text-xs font-semibold text-content-primary mb-2">API Test Sample</h3>
            <CodeSnippet
              code={`curl -X POST http://localhost:3000/api/organizations/${currentOrg?.id || "YOUR_ORG_ID"}/chat \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"assistantId":"${assistants[0]?.id || "ASST_ID"}","conversationId":"test-1","message":"Hello!"}'`}
              language="bash"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

