"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api, Assistant, VectorSearchResult } from "@/lib/api";
import {
  Search,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Database,
  Layers,
  Copy,
  Check,
  Bot,
} from "lucide-react";

interface IngestedChunkRecord {
  id: string;
  collection: string;
  title: string;
  text: string;
  timestamp: string;
}

export default function KnowledgeBasePage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Collections & Assistants
  const [collections, setCollections] = useState<string[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [collectionName, setCollectionName] = useState("");

  // Ingestion State
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestedChunks, setIngestedChunks] = useState<IngestedChunkRecord[]>([]);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Load existing collections and assistants
  const loadMetadata = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const [colsData, asstsData] = await Promise.all([
        api.listKnowledgeCollections(currentOrg.id).catch(() => ({ collections: [] })),
        api.listAssistants(currentOrg.id).catch(() => []),
      ]);

      const cols = colsData.collections || [];
      setCollections(cols);
      setAssistants(asstsData);

      // Default to first assistant's knowledge base if present
      const firstKb = asstsData.find((a) => a.knowledgeBase)?.knowledgeBase;
      if (firstKb) {
        setCollectionName(firstKb);
      } else if (cols.length > 0) {
        setCollectionName(cols[0]);
      }
    } catch {
      // Graceful fallback
    }
  }, [currentOrg]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Handle document chunk ingestion
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    const targetKb = collectionName.trim();
    const content = documentContent.trim();
    if (!targetKb || !content) {
      toastError("Collection name and document text are required");
      return;
    }

    setIsIngesting(true);
    try {
      const res = await api.ingestKnowledge(currentOrg.id, {
        knowledgeBase: targetKb,
        text: content,
        metadata: {
          title: documentTitle.trim() || "Untitled Document",
          ingested_at: new Date().toISOString(),
        },
      });

      toastSuccess(`Document indexed into collection '${targetKb}'`);

      const record: IngestedChunkRecord = {
        id: res.id || Math.random().toString(36).substring(2, 9),
        collection: targetKb,
        title: documentTitle.trim() || "Untitled Document",
        text: content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setIngestedChunks((prev) => [record, ...prev]);

      // If this is a new collection, add to list
      if (!collections.includes(targetKb)) {
        setCollections((prev) => [...prev, targetKb]);
      }

      setDocumentContent("");
      setDocumentTitle("");
    } catch (err: any) {
      toastError(err?.message || "Failed to ingest document chunk into Qdrant");
    } finally {
      setIsIngesting(false);
    }
  };

  // Handle vector similarity search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    const targetKb = collectionName.trim();
    const query = searchQuery.trim();
    if (!targetKb || !query) {
      toastError("Collection name and search query are required");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const res = await api.searchKnowledge(currentOrg.id, {
        knowledgeBase: targetKb,
        query,
        topK,
      });

      const list = res.results || [];
      setSearchResults(list);
      if (list.length > 0) {
        toastSuccess(`Retrieved ${list.length} relevant semantic matches`);
      } else {
        toastSuccess("Search completed: no matching chunks found in this collection");
      }
    } catch (err: any) {
      toastError(err?.message || "Vector similarity search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  // Find which assistants use this collection
  const associatedAssistants = assistants.filter(
    (a) => a.knowledgeBase && a.knowledgeBase.toLowerCase() === collectionName.trim().toLowerCase()
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="border-b border-surface-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {currentOrg?.name || "Workspace"}
            </span>
            <span className="text-content-muted">/</span>
            <span className="text-xs text-content-muted">RAG Knowledge Base</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">
            Vector Knowledge Engine
          </h1>
          <p className="text-xs text-content-muted mt-1">
            Store, vectorize, and retrieve business knowledge, product FAQs, and support playbooks via Qdrant Cosine embeddings.
          </p>
        </div>

        {/* Collection Selector & Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-surface-border bg-surface text-xs">
            <Database className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-content-muted">Active Collection:</span>
            <span className="font-mono font-semibold text-content-primary">{collectionName}</span>
          </div>
        </div>
      </div>

      {/* Collection Quick Switcher & Assistant Linkage Banner */}
      <div className="p-4 rounded-2xl border border-surface-border bg-surface flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-content-primary">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Select or Create Collection:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={collections.includes(collectionName) ? collectionName : "__custom__"}
              onChange={(e) => {
                if (e.target.value !== "__custom__") {
                  setCollectionName(e.target.value);
                  setSearchResults([]);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-surface-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            >
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">+ Custom Collection Name</option>
            </select>

            <input
              type="text"
              placeholder="Collection name (e.g. support-faq)"
              value={collectionName}
              onChange={(e) => {
                setCollectionName(e.target.value);
                setSearchResults([]);
              }}
              className="px-3 py-1.5 rounded-xl border border-surface-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Associated Assistants badge */}
        <div className="flex items-center gap-2">
          {associatedAssistants.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-medium">
              <Bot className="h-3.5 w-3.5" />
              <span>
                Connected to {associatedAssistants.length} assistant{associatedAssistants.length > 1 ? "s" : ""}:{" "}
                <strong>{associatedAssistants.map((a) => a.name).join(", ")}</strong>
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-content-muted">
              No assistants currently assigned to this collection name
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Document Ingestion Form */}
        <div className="space-y-6">
          <form
            onSubmit={handleIngest}
            className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                <span>Ingest Document Chunk</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-content-muted border border-surface-border">
                Embedding: Cosine
              </span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Generates high-dimensional vector embeddings and securely stores text chunks into Qdrant for automatic RAG injection into assistant conversations.
            </p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Document Title / Header
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g. Enterprise SLA & Support Hours"
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Document Text Content *
              </label>
              <textarea
                rows={6}
                required
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Paste verbatim business policies, FAQs, pricing tiers, or instructions..."
                className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isIngesting || !documentContent.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isIngesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Vector Embedding...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Index Document into &apos;{collectionName}&apos;</span>
                </>
              )}
            </button>
          </form>

          {/* Recently Ingested Chunks in this Session */}
          {ingestedChunks.length > 0 && (
            <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-3 animate-slideUp">
              <div className="flex items-center justify-between text-xs font-bold text-content-primary">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Recently Indexed in this Session ({ingestedChunks.length})</span>
                </div>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {ingestedChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3 rounded-xl border border-surface-border bg-surface-raised/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-content-primary">{chunk.title}</span>
                      <span className="text-[10px] text-content-muted">{chunk.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-content-secondary line-clamp-2">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Similarity Search Tester */}
        <div className="space-y-6">
          <form
            onSubmit={handleSearch}
            className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
                <Search className="h-4 w-4 text-teal-600" />
                <span>Test Vector Similarity Search</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-content-muted border border-surface-border">
                Collection: {collectionName}
              </span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Test semantic search across vectors in real-time to preview exactly what context snippets assistants receive during customer calls and chats.
            </p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Query Question *
              </label>
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question or enter keywords..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-medium text-content-secondary mb-1">
                <span>Top K Nearest Chunks</span>
                <span className="font-mono text-content-primary font-bold">{topK} results</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching Qdrant Vectors...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Search Knowledge Base</span>
                </>
              )}
            </button>
          </form>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className="space-y-3 animate-slideUp">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-content-primary">
                  Retrieved Chunks ({searchResults.length})
                </h3>
                <span className="text-[10px] text-content-muted">Ranked by Cosine Similarity</span>
              </div>
              {searchResults.map((item, idx) => {
                const matchPct = (item.score * 100).toFixed(1);
                const scoreColor =
                  item.score >= 0.8
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : item.score >= 0.65
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-surface-border bg-surface space-y-2 relative group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-content-primary">Match #{idx + 1}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${scoreColor}`}
                        >
                          Cosine: {matchPct}%
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.text, idx)}
                        className="text-content-muted hover:text-content-primary p-1 rounded hover:bg-surface-raised transition-colors"
                        title="Copy text snippet"
                      >
                        {copiedIdx === idx ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-content-secondary leading-relaxed bg-surface-raised/40 p-3 rounded-lg border border-surface-border font-sans">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
