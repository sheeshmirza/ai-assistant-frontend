"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  PhoneCall,
  Send,
  History,
  FileText,
  Wrench,
  BookOpen,
  Building,
  Settings,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

const navGroups = [
  {
    title: "AI Agents",
    items: [
      { label: "Overview", href: "/overview", icon: LayoutDashboard },
      { label: "Assistants", href: "/assistants", icon: Bot },
      { label: "Chat Playground", href: "/chat", icon: MessageSquare },
      { label: "Voice & Phone", href: "/voice", icon: PhoneCall },
      { label: "Outbound Outreach", href: "/campaigns", icon: Send },
    ],
  },
  {
    title: "Operations & Audits",
    items: [
      { label: "Conversations", href: "/conversations", icon: History },
      { label: "Transcripts & Actions", href: "/transcripts", icon: FileText },
    ],
  },
  {
    title: "Intelligence & Tools",
    items: [
      { label: "MCP Actions", href: "/actions", icon: Wrench },
      { label: "Knowledge Base (RAG)", href: "/knowledge", icon: BookOpen },
    ],
  },
  {
    title: "Account & Settings",
    items: [
      { label: "Organizations", href: "/organizations", icon: Building },
      { label: "Platform Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-14 left-0 z-30 hidden h-[calc(100vh-3.5rem)] w-60 border-r border-surface-border bg-surface lg:block overflow-y-auto p-3">
      <div className="space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-2 text-[10px] font-bold text-content-muted uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : "text-content-secondary hover:text-content-primary hover:bg-surface-raised"
                    )}
                  >
                    <Icon className={clsx("h-4 w-4 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-content-muted")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pro Badge / Micro footer */}
      <div className="mt-8 mx-1 p-3 rounded-xl border border-surface-border bg-surface-raised/60 text-xs">
        <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>MCP Autonomous AI</span>
        </div>
        <p className="text-[11px] text-content-muted leading-relaxed">
          Inbound & outbound chat, voice telephony, and autonomous tool calling.
        </p>
      </div>
    </aside>
  );
}
