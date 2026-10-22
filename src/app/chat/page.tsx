"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, ActionTaken } from "@/lib/api";
import {
  Bot,
  Send,
  User as UserIcon,
  Sparkles,
  RefreshCw,
  Wrench,
  Loader2,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

interface MessageBubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionsTaken?: ActionTaken[];
  timestamp: string;
}

export default function ChatPlaygroundPage() {
  const { currentOrg } = useAuth();
  const { error: toastError } = useToast();
  const searchParams = useSearchParams();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<MessageBubble[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load assistants on mount
  useEffect(() => {
    if (!currentOrg) return;
    const fetchAssistants = async () => {
      setIsLoading(true);
      try {
        const list = await api.listAssistants(currentOrg.id);
        const chatCapable = list.filter((a) => a.channels.includes("chat"));
        setAssistants(chatCapable.length > 0 ? chatCapable : list);

        const paramAsstId = searchParams.get("assistantId");
        if (paramAsstId && list.some((a) => a.id === paramAsstId)) {
          setSelectedAssistantId(paramAsstId);
        } else if (list.length > 0) {
          setSelectedAssistantId(list[0].id);
        }

        // Initialize with empty conversationId so backend creates a persistent conversation session
        setConversationId("");
      } catch (err: any) {
        toastError(err?.message || "Failed to load assistants");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssistants();
  }, [currentOrg, searchParams]);

  const activeAssistant = assistants.find((a) => a.id === selectedAssistantId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !selectedAssistantId || !inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const userBubble: MessageBubble = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Extract prior messages to retain full session context in the request payload
    const priorHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userBubble]);
    setIsSending(true);

    try {
      const activeAssistant = assistants.find((a) => a.id === selectedAssistantId);
      const res = await api.sendChat(currentOrg.id, {
        assistantId: selectedAssistantId,
        conversationId: conversationId || undefined,
        message: userText,
        channel: "chat",
        history: priorHistory,
        conversationData: {
          history: priorHistory,
          context: {
            channel: "chat",
            use_case: activeAssistant?.useCase || "general",
            total_prior_turns: messages.length,
          },
        },
      });

      if (res.conversationId && res.conversationId !== conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantBubble: MessageBubble = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: res.reply,
        actionsTaken: res.actionsTaken || (res as any).actions_taken,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantBubble]);
    } catch (err: any) {
      toastError(err?.message || "Failed to receive response from assistant");
    } finally {
      setIsSending(false);
    }
  };

  const resetConversation = () => {
    setConversationId("");
    setMessages([]);
  };

  if (isLoading && !currentOrg) {
    return <LoadingState message="Loading chat playground..." />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-surface-border bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-content-primary">Chat Console</div>
            <div className="text-[10px] text-content-muted">Session: {conversationId}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Assistant Picker */}
          <select
            value={selectedAssistantId}
            onChange={(e) => {
              setSelectedAssistantId(e.target.value);
              resetConversation();
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.useCase.replace(/_/g, " ")})
              </option>
            ))}
          </select>

          <button
            onClick={resetConversation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-xs text-content-secondary transition-colors"
            title="Reset conversation turns"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-content-primary mb-1">
              {activeAssistant ? `Chat with ${activeAssistant.name}` : "Interactive Chat Playground"}
            </h3>
            <p className="text-xs text-content-muted leading-relaxed mb-4">
              Send a test message to observe conversational context, Qdrant RAG knowledge injection, and autonomous MCP action execution.
            </p>
            {activeAssistant?.enabledActions && activeAssistant.enabledActions.length > 0 && (
              <div className="p-3 rounded-xl border border-surface-border bg-surface text-left w-full text-xs">
                <div className="font-semibold text-content-primary mb-1 text-[11px]">Enabled MCP Tools:</div>
                <div className="flex flex-wrap gap-1">
                  {activeAssistant.enabledActions.map((act) => (
                    <span key={act} className="px-2 py-0.5 rounded bg-surface-raised text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-2xl ${
                m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-surface-raised text-content-primary border border-surface-border"
                }`}
              >
                {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4 text-indigo-600" />}
              </div>

              <div className="space-y-1.5 max-w-[85%]">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                      : "bg-surface border border-surface-border text-content-primary rounded-tl-none shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>

                {/* Show MCP Actions Badge if executed by LLM */}
                {m.actionsTaken && m.actionsTaken.length > 0 && (
                  <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      <Wrench className="h-3 w-3" />
                      <span>MCP Actions Triggered:</span>
                    </div>
                    {m.actionsTaken.map((act, i) => (
                      <div key={i} className="text-[10px] font-mono text-content-secondary bg-surface p-1.5 rounded border border-surface-border">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{act.name}</span>
                        {act.arguments && (
                          <pre className="mt-1 text-[9px] text-content-muted overflow-x-auto">
                            {JSON.stringify(act.arguments, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[10px] text-content-muted ${m.role === "user" ? "text-right" : "text-left"}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="h-8 w-8 rounded-full bg-surface-raised flex items-center justify-center border border-surface-border">
              <Bot className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-surface-border text-content-muted text-xs flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              <span>Assistant is generating response & checking tools...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-4 border-t border-surface-border bg-surface shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            required
            placeholder={activeAssistant ? `Message ${activeAssistant.name}...` : "Type a message..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isSending || assistants.length === 0}
            className="flex-1 text-xs px-4 py-2.5 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

