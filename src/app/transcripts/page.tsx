"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Assistant, TranscriptEntry } from "@/lib/api";
import {
  FileText,
  Bot,
  User as UserIcon,
  Wrench,
  RefreshCw,
  Search,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function TranscriptsPage() {
  const { currentOrg } = useAuth();
  const searchParams = useSearchParams();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [conversationFilter, setConversationFilter] = useState<string>("");
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAssistants = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const list = await api.listAssistants(currentOrg.id);
      setAssistants(list);

      const paramAsstId = searchParams.get("assistantId");
      if (paramAsstId && list.some((a) => a.id === paramAsstId)) {
        setSelectedAssistantId(paramAsstId);
      } else if (list.length > 0 && !selectedAssistantId) {
        setSelectedAssistantId(list[0].id);
      }

      const paramConvId = searchParams.get("conversationId");
      if (paramConvId) {
        setConversationFilter(paramConvId);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load assistants");
    }
  }, [currentOrg, searchParams, selectedAssistantId]);

  const loadTranscripts = useCallback(async () => {
    if (!currentOrg || !selectedAssistantId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getTranscripts(
        currentOrg.id,
        selectedAssistantId,
        conversationFilter.trim() || undefined
      );
      setTranscripts(data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load transcripts");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, selectedAssistantId, conversationFilter]);

  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  useEffect(() => {
    if (selectedAssistantId) {
      loadTranscripts();
    }
  }, [selectedAssistantId, loadTranscripts]);

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
            <span className="text-xs text-content-muted">Transcripts & Audits</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            MongoDB Dialogue Transcripts
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Examine verbatim dialogue turns, customer inputs, assistant replies, and audited MCP actions taken.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Assistant Selector */}
          <select
            value={selectedAssistantId}
            onChange={(e) => setSelectedAssistantId(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-surface-border bg-surface font-medium text-content-primary focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            onClick={loadTranscripts}
            className="p-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary transition-colors"
            title="Refresh transcripts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Filter by Conversation ID..."
            value={conversationFilter}
            onChange={(e) => setConversationFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface focus:outline-none focus:ring-1 focus:ring-ring font-mono"
          />
        </div>
        {conversationFilter && (
          <button
            onClick={() => setConversationFilter("")}
            className="text-xs text-content-muted hover:text-content-primary"
          >
            Clear Filter
          </button>
        )}
      </div>

      {errorMsg && <ErrorState title="Error" message={errorMsg} onRetry={loadTranscripts} />}

      {isLoading ? (
        <LoadingState message="Loading transcripts from MongoDB..." />
      ) : transcripts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-surface-border bg-surface text-center">
          <FileText className="h-10 w-10 text-content-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-content-primary mb-1">No transcripts found</h3>
          <p className="text-xs text-content-muted max-w-sm mx-auto">
            No dialogue entries recorded in MongoDB for this assistant yet. Start a chat or voice conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transcripts.map((entry) => {
            const actions = entry.actionsTaken || entry.metadata?.actions_taken || [];
            const hasMessages = entry.messages && entry.messages.length > 0;

            return (
              <div
                key={entry.id}
                className="p-5 rounded-2xl border border-surface-border bg-surface hover:border-surface-borderHover transition-all space-y-3"
              >
                {/* Header with Conversation ID and Timestamp */}
                <div className="flex items-center justify-between text-xs border-b border-surface-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-content-primary">
                      {entry.channel ? entry.channel.toUpperCase() : "CHAT"} Dialogue
                    </span>
                    <span className="text-content-muted">•</span>
                    <span className="font-mono text-[11px] text-content-muted truncate max-w-[240px]">
                      {entry.conversationId}
                    </span>
                  </div>

                  <div className="text-[11px] text-content-muted font-mono">
                    {new Date(entry.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>

                {/* Multi-turn Messages from MongoDB */}
                {hasMessages ? (
                  <div className="space-y-2.5">
                    {entry.messages!.map((msg, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white"
                              : "bg-surface-raised text-content-primary border border-surface-border"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <UserIcon className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3 text-indigo-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-[10px] text-content-muted uppercase tracking-wider font-semibold mb-0.5">
                            {msg.role}
                          </div>
                          <div className="text-xs text-content-primary whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-content-primary whitespace-pre-wrap leading-relaxed pl-8">
                    {entry.content}
                  </div>
                )}

                {/* Audited Actions Taken */}
                {actions.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Audited MCP Actions ({actions.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {actions.map((act, i) => (
                        <div key={i} className="p-2 rounded-lg bg-surface border border-surface-border text-[11px]">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {act.name}
                          </div>
                          {act.arguments && (
                            <pre className="mt-1 text-[10px] font-mono text-content-muted overflow-x-auto">
                              Arguments: {JSON.stringify(act.arguments, null, 2)}
                            </pre>
                          )}
                          {act.result && (
                            <pre className="mt-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto">
                              Result: {JSON.stringify(act.result, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

