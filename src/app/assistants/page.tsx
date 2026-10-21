"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant } from "@/lib/api";
import {
  Bot,
  Plus,
  MessageSquare,
  PhoneCall,
  Edit2,
  Trash2,
  X,
  Search,
  Check,
  Sparkles,
  BookOpen,
  Wrench,
  Loader2,
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

const USE_CASE_OPTIONS = [
  { value: "appointment_booking", label: "Appointment Booking", desc: "Schedule appointments, dental checkups, calendar slots" },
  { value: "inbound_query_handling", label: "Inbound Query Handling", desc: "Answer inquiries, support triage, knowledge base FAQ lookup" },
  { value: "selling", label: "Selling & Conversion", desc: "Product recommendations, prospect qualification, closing sales" },
  { value: "outreach", label: "Proactive Outreach", desc: "Lead re-engagement, status notifications, automated follow-ups" },
  { value: "cold_outreach", label: "Cold Outreach", desc: "High-conversion outbound prospecting and lead qualification" },
];

const AVAILABLE_ACTIONS = [
  { name: "book_appointment", label: "Book Appointment" },
  { name: "schedule_calendar_event", label: "Calendar Event" },
  { name: "fill_google_form", label: "Fill Form" },
  { name: "send_email", label: "Send Email" },
  { name: "send_sms", label: "Send SMS" },
  { name: "create_lead", label: "Create CRM Lead" },
  { name: "transfer_call", label: "Transfer Phone Call" },
];

export default function AssistantsPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [useCase, setUseCase] = useState("appointment_booking");
  const [channels, setChannels] = useState<string[]>(["chat"]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [enabledActions, setEnabledActions] = useState<string[]>([]);

  const loadAssistants = useCallback(async () => {
    if (!currentOrg) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.listAssistants(currentOrg.id);
      setAssistants(data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load assistants");
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    loadAssistants();
  }, [loadAssistants]);

  const openCreateModal = () => {
    setEditingAssistant(null);
    setName("");
    setUseCase("appointment_booking");
    setChannels(["chat", "voice"]);
    setSystemPrompt("");
    setKnowledgeBase("");
    setEnabledActions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assistant) => {
    setEditingAssistant(a);
    setName(a.name);
    setUseCase(a.useCase);
    setChannels(a.channels || ["chat"]);
    setSystemPrompt(a.systemPrompt || "");
    setKnowledgeBase(a.knowledgeBase || "");
    setEnabledActions(a.enabledActions || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    if (!name.trim()) {
      toastError("Assistant name is required");
      return;
    }
    if (channels.length === 0) {
      toastError("Select at least one channel (chat or voice)");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAssistant) {
        await api.updateAssistant(currentOrg.id, editingAssistant.id, {
          name: name.trim(),
          systemPrompt: systemPrompt.trim(),
          enabledActions,
          knowledgeBase: knowledgeBase.trim() || undefined,
        });
        toastSuccess("Assistant updated and cache purged");
      } else {
        await api.createAssistant(currentOrg.id, {
          name: name.trim(),
          useCase,
          channels,
          systemPrompt: systemPrompt.trim(),
          enabledActions,
          knowledgeBase: knowledgeBase.trim() || undefined,
        });
        toastSuccess("Assistant created successfully");
      }
      setIsModalOpen(false);
      await loadAssistants();
    } catch (err: any) {
      toastError(err?.message || "Failed to save assistant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asstId: string) => {
    if (!currentOrg) return;
    if (!confirm("Are you sure you want to delete this assistant?")) return;

    try {
      await api.deleteAssistant(currentOrg.id, asstId);
      toastSuccess("Assistant deleted and cache purged");
      await loadAssistants();
    } catch (err: any) {
      toastError(err?.message || "Failed to delete assistant");
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const toggleAction = (act: string) => {
    setEnabledActions((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  const filteredAssistants = assistants.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUseCase = selectedUseCase === "all" || a.useCase === selectedUseCase;
    return matchesSearch && matchesUseCase;
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
            <span className="text-xs text-content-muted">Assistants</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">AI Assistants</h1>
          <p className="text-xs text-content-muted mt-1">
            Configure autonomous voice and chat agents with custom prompts, RAG knowledge bases, and MCP tools.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Assistant</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-content-muted" />
          <input
            type="text"
            placeholder="Search assistants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            "all",
            "appointment_booking",
            "inbound_query_handling",
            "selling",
            "outreach",
            "cold_outreach",
          ].map((uc) => (
            <button
              key={uc}
              onClick={() => setSelectedUseCase(uc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedUseCase === uc
                  ? "bg-surface-raised text-content-primary border border-surface-border shadow-sm"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              {uc === "all" ? "All Use Cases" : uc.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <ErrorState title="Error" message={errorMsg} onRetry={loadAssistants} />}

      {isLoading ? (
        <LoadingState message="Loading assistants..." />
      ) : filteredAssistants.length === 0 ? (
        <div className="p-12 rounded-2xl border border-surface-border bg-surface text-center">
          <Bot className="h-10 w-10 text-content-muted mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-content-primary mb-1">No assistants found</h3>
          <p className="text-xs text-content-muted mb-4 max-w-sm mx-auto">
            Get started by provisioning an assistant for customer support, appointment booking, or proactive outreach.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Assistant</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssistants.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl border border-surface-border bg-surface hover:border-surface-borderHover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800">
                      {a.name[0]}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-content-primary leading-snug">{a.name}</h3>
                      <span className="text-[11px] text-content-muted capitalize">
                        {a.useCase.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                      a.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <p className="text-xs text-content-secondary line-clamp-3 mb-4 leading-relaxed">
                  {a.systemPrompt || "No system prompt configured."}
                </p>

                <div className="space-y-2 mb-4 pt-3 border-t border-surface-border text-xs">
                  <div className="flex items-center justify-between text-content-muted">
                    <span>Channels:</span>
                    <div className="flex items-center gap-1.5">
                      {a.channels?.includes("chat") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-raised text-[10px] font-medium text-content-secondary">
                          <MessageSquare className="h-3 w-3" /> Chat
                        </span>
                      )}
                      {a.channels?.includes("voice") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-raised text-[10px] font-medium text-content-secondary">
                          <PhoneCall className="h-3 w-3" /> Voice
                        </span>
                      )}
                    </div>
                  </div>

                  {a.knowledgeBase && (
                    <div className="flex items-center justify-between text-content-muted">
                      <span>Knowledge:</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="h-3 w-3" /> {a.knowledgeBase}
                      </span>
                    </div>
                  )}

                  {a.enabledActions && a.enabledActions.length > 0 && (
                    <div className="flex items-center justify-between text-content-muted">
                      <span>Actions ({a.enabledActions.length}):</span>
                      <span className="text-[10px] text-content-secondary truncate max-w-[150px]">
                        {a.enabledActions.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-surface-border">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/chat?assistantId=${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-subtle text-xs font-medium text-content-primary transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Chat</span>
                  </Link>
                  {a.channels?.includes("voice") && (
                    <Link
                      href={`/voice?assistantId=${a.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-surface-subtle text-xs font-medium text-content-primary transition-colors"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-teal-600" />
                      <span>Call</span>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(a)}
                    className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-raised transition-colors"
                    title="Edit Assistant"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded-lg text-content-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title="Delete Assistant"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Assistant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl animate-slideUp space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold text-content-primary">
                  {editingAssistant ? "Edit Assistant" : "Create New AI Assistant"}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-raised"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Assistant Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Dental Receptionist"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {!editingAssistant && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    Use Case Template *
                  </label>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {USE_CASE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Communication Channels *
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes("chat")}
                      onChange={() => toggleChannel("chat")}
                      className="rounded border-surface-border text-indigo-600 focus:ring-ring"
                    />
                    <span>Chat (Web & Mobile)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.includes("voice")}
                      onChange={() => toggleChannel("voice")}
                      className="rounded border-surface-border text-indigo-600 focus:ring-ring"
                    />
                    <span>Voice Telephony (Twilio)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  System Instructions (Prompt)
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe personality, business rules, tone, and what actions to take..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  Knowledge Base Collection (RAG)
                </label>
                <input
                  type="text"
                  placeholder="e.g. acme-health-docs"
                  value={knowledgeBase}
                  onChange={(e) => setKnowledgeBase(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-[10px] text-content-muted mt-1">
                  Qdrant vector collection name. Matching snippets are automatically injected into conversational turns.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Enabled MCP Actions
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-surface-border bg-surface-raised/40">
                  {AVAILABLE_ACTIONS.map((act) => (
                    <label key={act.name} className="flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledActions.includes(act.name)}
                        onChange={() => toggleAction(act.name)}
                        className="rounded border-surface-border text-indigo-600 focus:ring-ring"
                      />
                      <span>{act.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingAssistant ? "Save Changes" : "Create Assistant"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

