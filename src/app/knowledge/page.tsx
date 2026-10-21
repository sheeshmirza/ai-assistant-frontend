"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  BookOpen,
  Search,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  Loader2,
  FileText,
  Database,
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";

interface SearchResultItem {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export default function KnowledgeBasePage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Ingestion State
  const [collectionName, setCollectionName] = useState("company-faq");
  const [documentTitle, setDocumentTitle] = useState("Cancellation Policy");
  const [documentContent, setDocumentContent] = useState(
    "Appointments can be rescheduled or cancelled with at least 24 hours notice without penalty. Late cancellations incur a $25 fee."
  );
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("What happens if I cancel late?");
  const [topK, setTopK] = useState(3);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentContent.trim() || !collectionName.trim()) {
      toastError("Collection name and document text are required");
      return;
    }

    setIsIngesting(true);
    setIngestSuccess(false);

    try {
      // Connect to Python vector endpoint
      const aiBase = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:3002";
      const res = await fetch(`${aiBase}/api/vectors/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_base: collectionName.trim(),
          text: documentContent.trim(),
          metadata: { title: documentTitle.trim() },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || "Ingestion failed");
      }

      setIngestSuccess(true);
      toastSuccess(`Document indexed into collection '${collectionName}'`);
    } catch (err: any) {
      toastError(err?.message || "Failed to ingest document into Qdrant");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !collectionName.trim()) {
      toastError("Collection name and search query are required");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const aiBase = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:3002";
      const res = await fetch(`${aiBase}/api/vectors/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_base: collectionName.trim(),
          query: searchQuery.trim(),
          top_k: topK,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail || "Search failed");
      }

      const data = await res.json();
      setSearchResults(data?.results || []);
      toastSuccess(`Retrieved ${data?.results?.length || 0} relevant snippets`);
    } catch (err: any) {
      toastError(err?.message || "Vector similarity search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {currentOrg?.name}
          </span>
          <span className="text-content-muted">/</span>
          <span className="text-xs text-content-muted">RAG Knowledge Base</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          Qdrant Vector Intelligence
        </h1>
        <p className="text-xs text-content-muted mt-1">
          Index business documentation, FAQs, and procedures into 1536-dimensional Cosine vector collections for automatic RAG retrieval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Document Ingestion Form */}
        <div className="space-y-6">
          <form onSubmit={handleIngest} className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
              <UploadCloud className="h-4 w-4 text-indigo-600" />
              <span>Ingest Document Chunk</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Generates embeddings via OpenAI <code className="font-mono">text-embedding-3-small</code> and upserts into Qdrant.
            </p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Target Collection Name *
              </label>
              <input
                type="text"
                required
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g. dental-faq"
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Document Title / Header
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g. Operating Hours & Policies"
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Document Text Content *
              </label>
              <textarea
                rows={5}
                required
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Paste verbatim knowledge text..."
                className="w-full text-xs p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isIngesting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isIngesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Index Document</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Similarity Search Tester */}
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-content-primary">
              <Search className="h-4 w-4 text-teal-600" />
              <span>Test Vector Similarity Search</span>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Verify which context snippets are retrieved and injected into assistant turns for any user query.
            </p>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Query String *
              </label>
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter a test question or inquiry..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Top K Snippets ({topK})
              </label>
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
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Execute Similarity Search</span>
                </>
              )}
            </button>
          </form>

          {/* Results List */}
          {searchResults.length > 0 && (
            <div className="space-y-3 animate-slideUp">
              <h3 className="text-xs font-bold text-content-primary">
                Retrieved Chunks ({searchResults.length})
              </h3>
              {searchResults.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-surface-border bg-surface space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-content-primary">Chunk #{idx + 1}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-[10px] font-bold">
                      Cosine: {(item.score * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary leading-relaxed bg-surface-raised/40 p-2.5 rounded-lg border border-surface-border">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
