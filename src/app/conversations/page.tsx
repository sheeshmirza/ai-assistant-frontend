"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, Conversation } from "@/lib/api";
import {
  History,
  MessageSquare,
  PhoneCall,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  FileText,
  StopCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ConversationsPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterDirection, setFilterDirection] = useState<string>("all");

  const loadAssistants = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const list = await api.listAssistants(currentOrg.id);
      setAssistants(list);
      if (list.length > 0 && !selectedAssistantId) {
        setSelectedAssistantId(list[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load assistants");
    }
  }, [currentOrg, selectedAssistantId]);

  const loadConversations = useCallback(async () => {
    if (!currentOrg || !selectedAssistantId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.listConversations(currentOrg.id, selectedAssistantId);
      setConversations(data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg, selectedAssistantId]);

  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  useEffect(() => {
    if (selectedAssistantId) {
      loadConversations();
    }
  }, [selectedAssistantId, loadConversations]);

  const handleEndConversation = async (convId: string) => {
    if (!currentOrg || !selectedAssistantId) return;
    try {
      await api.endConversation(currentOrg.id, selectedAssistantId, convId);
      toastSuccess("Conversation marked as completed");
      await loadConversations();
    } catch (err: any) {
      toastError(err?.message || "Failed to end conversation");
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchChannel = filterChannel === "all" || c.channel === filterChannel;
    const matchDirection = filterDirection === "all" || c.direction === filterDirection;
    return matchChannel && matchDirection;
  });

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
            <span className="text-xs text-content-muted">Conversations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Conversation Logs
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Relational conversation metadata, session lifecycles, and channel metrics stored in PostgreSQL.
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
            onClick={loadConversations}
            className="p-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {["all", "chat", "voice"].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterChannel === ch
                  ? "bg-surface-raised text-content-primary border border-surface-border shadow-sm font-semibold"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              {ch === "all" ? "All Channels" : ch}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {["all", "inbound", "outbound"].map((dir) => (
            <button
              key={dir}
              onClick={() => setFilterDirection(dir)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterDirection === dir
                  ? "bg-surface-raised text-content-primary border border-surface-border shadow-sm font-semibold"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              {dir === "all" ? "All Directions" : dir}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <ErrorState title="Error" message={errorMsg} onRetry={loadConversations} />}

      {isLoading ? (
        <LoadingState message="Loading conversations..." />
      ) : filteredConversations.length === 0 ? (
        <div className="p-12 rounded-2xl border border-surface-border bg-surface text-center">
          <History className="h-10 w-10 text-content-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-content-primary mb-1">No conversations found</h3>
          <p className="text-xs text-content-muted mb-4 max-w-sm mx-auto">
            Interact with your assistant via chat or initiate a phone call to start recording session logs.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm">
          <table className="w-full text-left text-xs text-content-secondary">
            <thead className="bg-surface-raised/50 border-b border-surface-border text-[11px] font-semibold text-content-muted uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredConversations.map((c) => (
                <tr key={c.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-content-primary">
                    {c.id.substring(0, 18)}...
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-raised text-[11px] font-medium text-content-secondary capitalize">
                      {c.channel === "chat" ? (
                        <MessageSquare className="h-3 w-3 text-indigo-500" />
                      ) : (
                        <PhoneCall className="h-3 w-3 text-teal-500" />
                      )}
                      <span>{c.channel}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-content-muted capitalize">
                      {c.direction === "inbound" ? (
                        <>
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Inbound</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Outbound</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                        c.status === "active"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-content-muted">
                    {new Date(c.startedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <Link
                      href={`/transcripts?assistantId=${selectedAssistantId}&conversationId=${c.id}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-raised hover:bg-surface-subtle text-[11px] font-medium text-content-primary transition-colors border border-surface-border"
                      title="View Transcript"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Transcript</span>
                    </Link>
                    {c.status === "active" && (
                      <button
                        onClick={() => handleEndConversation(c.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-medium transition-colors border border-rose-500/20"
                        title="End Conversation"
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        <span>End</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
