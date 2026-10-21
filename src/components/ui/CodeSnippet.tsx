"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CodeSnippet({
  code,
  language = "bash",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl border border-surface-border bg-slate-950 text-slate-100 p-4 font-mono text-xs overflow-x-auto">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800 text-[10px] text-slate-400">
        <span>{language.toUpperCase()}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

