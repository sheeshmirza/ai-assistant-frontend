"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Wrench,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/overview");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 border-b border-surface-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous Multi-Tenant SaaS Runtime</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-content-primary">
            Autonomous AI Agents for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500">
              Voice & Chat
            </span>
          </h1>

          <p className="text-base sm:text-lg text-content-secondary max-w-2xl mx-auto leading-relaxed">
            Deploy configurable AI assistants across inbound calls, outbound campaigns, and multi-channel chat. Powered by OpenAI, Qdrant RAG, and autonomous Model Context Protocol (MCP) action execution.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all hover:shadow-indigo-500/20"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-primary font-semibold text-sm transition-colors"
            >
              Sign In to Tenant
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm hover:border-surface-borderHover transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <PhoneCall className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-content-primary mb-1">Voice Telephony</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              Inbound and outbound PSTN calls powered by Twilio, real-time TwiML speech turns, and live human transfers.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm hover:border-surface-borderHover transition-all">
            <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-content-primary mb-1">Omnichannel Chat</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              Inbound customer support and proactive outreach campaigns over SMS and email with sliding turn memory.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm hover:border-surface-borderHover transition-all">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Wrench className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-content-primary mb-1">MCP Autonomous Actions</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              Agents autonomously book appointments, schedule calendar events, create CRM leads, and submit web forms.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm hover:border-surface-borderHover transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-content-primary mb-1">Enterprise Security</h3>
            <p className="text-xs text-content-muted leading-relaxed">
              3NF PostgreSQL relational integrity, Bcrypt 12, timing-safe HMAC authentication, and distributed tracing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

