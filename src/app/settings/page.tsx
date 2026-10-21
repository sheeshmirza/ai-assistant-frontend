"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import {
  Settings,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Save,
  RefreshCw,
  Key,
} from "lucide-react";

export default function SettingsPage() {
  const { user, currentOrg } = useAuth();
  const { theme, setTheme } = useTheme();
  const { success: toastSuccess, error: toastError } = useToast();

  const [apiUrl, setApiUrl] = useState("http://localhost:3000");
  const [aiUrl, setAiUrl] = useState("http://localhost:3002");
  const [goHealth, setGoHealth] = useState<string>("unknown");
  const [pyHealth, setPyHealth] = useState<string>("unknown");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedApi = localStorage.getItem("ai_assistant_api_url");
      if (storedApi) setApiUrl(storedApi);
    }
    checkServices();
  }, []);

  const checkServices = async () => {
    setIsChecking(true);
    try {
      const go = await api.getPlatformHealth();
      setGoHealth(go?.status === "ok" ? "online" : "error");
    } catch {
      setGoHealth("offline");
    }

    try {
      const py = await api.getAiServiceHealth();
      setPyHealth(py?.version ? "online" : "error");
    } catch {
      setPyHealth("offline");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("ai_assistant_api_url", apiUrl.trim());
      toastSuccess("API URL updated");
      checkServices();
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8 animate-slideUp">
      {/* Top Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Workspace
          </span>
          <span className="text-content-muted">/</span>
          <span className="text-xs text-content-muted">Settings</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          Platform Configuration
        </h1>
        <p className="text-xs text-content-muted mt-1">
          Inspect microservice diagnostics, configure backend host endpoints, and customize appearance.
        </p>
      </div>

      <div className="space-y-6">
        {/* Microservices Health Section */}
        <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-content-primary">Backend Services Status</h3>
            </div>
            <button
              onClick={checkServices}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface hover:bg-surface-raised text-xs font-medium text-content-secondary transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>Ping Services</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-surface-border bg-surface-raised/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-content-primary">Go Platform API</div>
                <div className="text-[10px] text-content-muted font-mono">{apiUrl}</div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  goHealth === "online"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {goHealth === "online" ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Online (Port 3000)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>Unreachable</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-surface-border bg-surface-raised/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-content-primary">Python AI Runtime</div>
                <div className="text-[10px] text-content-muted font-mono">{aiUrl}</div>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  pyHealth === "online"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                }`}
              >
                {pyHealth === "online" ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Online (Port 3002)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    <span>Unreachable</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Backend Endpoint Settings */}
        <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-content-primary">Backend API Connection</h3>
          </div>
          <p className="text-xs text-content-muted leading-relaxed">
            Customize the HTTP target endpoint of the Go platform API used by this browser session.
          </p>

          <form onSubmit={handleSaveApiUrl} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Go API Base URL
              </label>
              <input
                type="url"
                required
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Endpoint</span>
            </button>
          </form>
        </div>

        {/* Appearance & Theme */}
        <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-content-primary">Appearance</h3>
          </div>
          <p className="text-xs text-content-muted">
            Choose your preferred interface theme.
          </p>

          <div className="flex gap-3 max-w-md">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "System", icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              const isCurrent = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-semibold gap-2 transition-all ${
                    isCurrent
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "border-surface-border bg-surface-raised hover:bg-surface-subtle text-content-muted hover:text-content-primary"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Details */}
        <div className="p-6 rounded-2xl border border-surface-border bg-surface shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-content-primary">Active Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-content-secondary">
            <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/40">
              <span className="text-[10px] text-content-muted uppercase tracking-wider block mb-0.5">User</span>
              <span className="font-semibold text-content-primary">{user?.fullName || "—"}</span>
              <div className="text-[11px] text-content-muted">{user?.email}</div>
            </div>
            <div className="p-3 rounded-xl border border-surface-border bg-surface-raised/40">
              <span className="text-[10px] text-content-muted uppercase tracking-wider block mb-0.5">Organization</span>
              <span className="font-semibold text-content-primary">{currentOrg?.name || "—"}</span>
              <div className="text-[11px] font-mono text-content-muted">Slug: {currentOrg?.slug}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

