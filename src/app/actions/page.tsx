"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  Wrench,
  CheckCircle2,
  Calendar,
  Mail,
  MessageSquare,
  Users,
  PhoneForwarded,
  FileText,
  Play,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import CodeSnippet from "@/components/ui/CodeSnippet";

interface MCPToolCard {
  name: string;
  category: string;
  description: string;
  icon: any;
  parameters: Record<string, string>;
  samplePayload: Record<string, any>;
}

const BUILTIN_TOOLS: MCPToolCard[] = [
  {
    name: "book_appointment",
    category: "Scheduling",
    description: "Books an appointment slot on an external booking calendar or EHR system.",
    icon: Calendar,
    parameters: {
      customer_name: "string (required)",
      customer_email: "string (optional)",
      customer_phone: "string (optional)",
      start_time: "ISO 8601 string (required)",
      end_time: "ISO 8601 string (optional)",
      service_type: "string (required)",
      notes: "string (optional)",
    },
    samplePayload: {
      customer_name: "Jane Smith",
      customer_email: "jane@example.com",
      start_time: "2026-10-22T14:00:00Z",
      service_type: "Dental Checkup",
    },
  },
  {
    name: "schedule_calendar_event",
    category: "Scheduling",
    description: "Creates an event on Google Calendar, Outlook 365, or CalDAV.",
    icon: Calendar,
    parameters: {
      event_title: "string (required)",
      start_time: "ISO 8601 string (required)",
      end_time: "ISO 8601 string (required)",
      attendees: "array of emails (optional)",
      description: "string (optional)",
    },
    samplePayload: {
      event_title: "Product Demo: AI Assistant Platform",
      start_time: "2026-10-22T15:00:00Z",
      end_time: "2026-10-22T15:30:00Z",
      attendees: ["client@example.com"],
    },
  },
  {
    name: "send_email",
    category: "Messaging",
    description: "Dispatches an email message via SendGrid, Postmark, or SMTP webhook.",
    icon: Mail,
    parameters: {
      to: "string (required)",
      subject: "string (required)",
      body: "string (required)",
      cc: "string (optional)",
    },
    samplePayload: {
      to: "client@example.com",
      subject: "Appointment Confirmation",
      body: "Hi Jane, your appointment is confirmed for tomorrow at 2:00 PM.",
    },
  },
  {
    name: "send_sms",
    category: "Messaging",
    description: "Sends an SMS message to a mobile number via Twilio or SMS provider.",
    icon: MessageSquare,
    parameters: {
      to: "string E.164 (required)",
      body: "string (required)",
    },
    samplePayload: {
      to: "+15551234567",
      body: "Acme Health: Your checkup is confirmed for tomorrow at 2 PM.",
    },
  },
  {
    name: "create_lead",
    category: "CRM & Sales",
    description: "Captures a prospective lead in HubSpot, Salesforce, or Zoho CRM.",
    icon: Users,
    parameters: {
      name: "string (required)",
      email: "string (optional)",
      phone: "string (optional)",
      company: "string (optional)",
      interest: "string (optional)",
    },
    samplePayload: {
      name: "Alex Johnson",
      email: "alex@enterprise.com",
      company: "Acme Corp",
      interest: "Enterprise Voice Agents",
    },
  },
  {
    name: "transfer_call",
    category: "Telephony",
    description: "Executes a live call transfer to a human specialist via TwiML <Dial>.",
    icon: PhoneForwarded,
    parameters: {
      target_phone_number: "string E.164 (required)",
      reason: "string (optional)",
    },
    samplePayload: {
      target_phone_number: "+15559876543",
      reason: "Customer requested billing department",
    },
  },
  {
    name: "fill_google_form",
    category: "Automation",
    description: "Fills out and submits structured web form fields.",
    icon: FileText,
    parameters: {
      form_id: "string (required)",
      form_url: "string (required)",
      fields: "key-value object (required)",
    },
    samplePayload: {
      form_id: "intake-form-101",
      form_url: "https://docs.google.com/forms/d/e/.../formResponse",
      fields: { "entry.101": "Jane Smith" },
    },
  },
];

export default function MCPActionsPage() {
  const { currentOrg } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTestTool, setActiveTestTool] = useState<MCPToolCard | null>(null);
  const [testPayload, setTestPayload] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  const openTestModal = (tool: MCPToolCard) => {
    setActiveTestTool(tool);
    setTestPayload(JSON.stringify(tool.samplePayload, null, 2));
    setExecutionResult(null);
  };

  const handleExecuteTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTestTool) return;

    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(testPayload);
    } catch {
      toastError("Payload must be valid JSON");
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    // Simulated test dispatcher (connects to Python AI service MCP webhook router)
    try {
      await new Promise((res) => setTimeout(res, 600));
      setExecutionResult({
        success: true,
        action: activeTestTool.name,
        dispatched_at: new Date().toISOString(),
        status: "webhook_simulated_success",
        data: parsedArgs,
      });
      toastSuccess(`Executed test for ${activeTestTool.name}`);
    } catch (err: any) {
      toastError(err?.message || "Test execution failed");
    } finally {
      setIsExecuting(false);
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
          <span className="text-xs text-content-muted">Intelligence & Tools</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          Model Context Protocol (MCP) Actions
        </h1>
        <p className="text-xs text-content-muted mt-1">
          Pre-defined and dynamic action tools available to AI assistants during chat and phone dialogues.
        </p>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-content-primary mb-1">Autonomous Function Calling</h3>
          <p className="text-[11px] text-content-muted leading-relaxed">
            The OpenAI LLM determines when to call a tool based on the user's intent, executes it, and feeds results back into conversational memory.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
            <Wrench className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-content-primary mb-1">Config-Driven Webhooks</h3>
          <p className="text-[11px] text-content-muted leading-relaxed">
            Configure action target endpoints via the <code className="font-mono text-[10px]">MCP_ACTION_WEBHOOKS</code> JSON mapping without altering platform code.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-surface-border bg-surface">
          <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <PhoneForwarded className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-content-primary mb-1">Live Telephony Dialing</h3>
          <p className="text-[11px] text-content-muted leading-relaxed">
            The <code className="font-mono text-[10px]">transfer_call</code> tool automatically emits TwiML &lt;Dial&gt; to immediately transfer active phone callers.
          </p>
        </div>
      </div>

      {/* Tools Catalog */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-content-primary">Supported Tool Definitions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BUILTIN_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.name}
                className="p-5 rounded-2xl border border-surface-border bg-surface hover:border-surface-borderHover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-surface-raised flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-surface-border">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold font-mono text-content-primary">{tool.name}</h3>
                        <span className="text-[10px] text-content-muted">{tool.category}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-content-secondary leading-relaxed mb-4">
                    {tool.description}
                  </p>

                  <div className="border-t border-surface-border pt-3 mb-4 space-y-1.5">
                    <span className="text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                      Parameters:
                    </span>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {Object.entries(tool.parameters).map(([key, type]) => (
                        <div key={key} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-content-primary">{key}</span>
                          <span className="text-content-muted">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-border pt-3">
                  <button
                    onClick={() => openTestModal(tool)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-subtle text-xs font-medium text-content-primary transition-colors border border-surface-border"
                  >
                    <Play className="h-3 w-3 text-indigo-600" />
                    <span>Test Tool</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Webhook Configuration Guide */}
      <div className="p-6 rounded-2xl border border-surface-border bg-surface space-y-3">
        <h3 className="text-xs font-bold text-content-primary">Configuring MCP Webhooks</h3>
        <p className="text-xs text-content-muted leading-relaxed">
          Set <code className="font-mono text-indigo-600">MCP_ACTION_WEBHOOKS</code> in your <code className="font-mono">.env</code> file to a valid JSON dictionary mapping action names to endpoints:
        </p>
        <CodeSnippet
          code={`MCP_ACTION_WEBHOOKS='{
  "book_appointment": "https://api.yourdomain.com/webhooks/appointments",
  "schedule_calendar_event": "https://api.yourdomain.com/webhooks/calendar",
  "send_email": "https://api.yourdomain.com/webhooks/email",
  "send_sms": "https://api.yourdomain.com/webhooks/sms",
  "create_lead": "https://api.yourdomain.com/webhooks/crm/leads",
  "transfer_call": "https://api.yourdomain.com/webhooks/telephony/transfer"
}'`}
          language="bash"
        />
      </div>

      {/* Test Execution Modal */}
      {activeTestTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl animate-slideUp space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold font-mono text-content-primary">
                  Test {activeTestTool.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveTestTool(null)}
                className="p-1 rounded-lg text-content-muted hover:text-content-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteTest} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  JSON Arguments
                </label>
                <textarea
                  rows={6}
                  required
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full text-xs font-mono p-3 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTestTool(null)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-surface-border bg-surface hover:bg-surface-raised text-content-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50"
                >
                  {isExecuting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Execute Action</span>
                </button>
              </div>
            </form>

            {executionResult && (
              <div className="mt-3 p-3.5 rounded-xl border border-surface-border bg-surface-raised font-mono text-xs space-y-1 animate-slideUp">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  Response Output:
                </div>
                <pre className="text-[10px] text-content-secondary overflow-x-auto">
                  {JSON.stringify(executionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
