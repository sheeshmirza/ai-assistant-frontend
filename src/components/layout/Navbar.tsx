"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  Bot,
  Building,
  Check,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Plus,
  Radio,
  Menu,
  X,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Wrench,
  BookOpen,
  Settings as SettingsIcon,
} from "lucide-react";

export default function Navbar({
  isLanding = false,
  isLogin = false,
}: {
  isLanding?: boolean;
  isLogin?: boolean;
}) {
  const pathname = usePathname();
  const { user, organizations, currentOrg, selectOrganization, createOrganization, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName("");
      setIsCreatingOrg(false);
      setOrgDropdownOpen(false);
    } catch {}
  };

  const navLinks = [
    { label: "Overview", href: "/overview" },
    { label: "Assistants", href: "/assistants" },
    { label: "Chat", href: "/chat" },
    { label: "Voice Playground", href: "/voice" },
    { label: "Transcripts", href: "/transcripts" },
    { label: "MCP Tools", href: "/actions" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Org Switcher */}
        <div className="flex items-center gap-3">
          <Link href="/overview" className="flex items-center gap-2 font-semibold text-content-primary tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-sm">
              <Bot className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline-block font-bold text-sm tracking-tight">AI Assistant</span>
          </Link>

          {/* Org Selector */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-surface-raised hover:bg-surface-subtle text-content-secondary border border-surface-border transition-colors max-w-[180px] sm:max-w-[220px]"
              >
                <Building className="h-3.5 w-3.5 text-content-muted shrink-0" />
                <span className="truncate">{currentOrg?.name || "Select Organization"}</span>
                <ChevronDown className="h-3 w-3 text-content-muted shrink-0 ml-0.5" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl border border-surface-border bg-surface shadow-xl py-1.5 z-50 animate-slideUp">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-content-muted uppercase tracking-wider">
                    Organizations
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          selectOrganization(org.id);
                          setOrgDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-raised transition-colors"
                      >
                        <span className="font-medium text-content-primary truncate">{org.name}</span>
                        {currentOrg?.id === org.id && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-surface-border mt-1 pt-1.5 px-3">
                    {isCreatingOrg ? (
                      <form onSubmit={handleCreateOrg} className="space-y-2 py-1">
                        <input
                          type="text"
                          placeholder="Organization name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-surface-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1 rounded-md"
                          >
                            Create
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingOrg(false)}
                            className="text-xs px-2 text-content-muted hover:text-content-primary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsCreatingOrg(true)}
                        className="flex items-center gap-1.5 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Organization
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: Quick Links, Theme, User Profile */}
        <div className="flex items-center gap-2">
          {/* Quick status pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Platform Active</span>
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-raised transition-colors"
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User profile dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-lg hover:bg-surface-raised transition-colors text-xs font-medium"
              >
                <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase border border-indigo-200 dark:border-indigo-800">
                  {user.fullName ? user.fullName[0] : user.email[0]}
                </div>
                <span className="hidden sm:inline-block text-content-secondary max-w-[120px] truncate">
                  {user.fullName || user.email}
                </span>
                <ChevronDown className="h-3 w-3 text-content-muted" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-surface-border bg-surface shadow-xl py-1.5 z-50 animate-slideUp">
                  <div className="px-3 py-2 border-b border-surface-border">
                    <p className="text-xs font-semibold text-content-primary truncate">{user.fullName}</p>
                    <p className="text-[11px] text-content-muted truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-content-secondary hover:bg-surface-raised transition-colors"
                  >
                    <SettingsIcon className="h-3.5 w-3.5 text-content-muted" />
                    Settings & API Keys
                  </Link>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            !isLogin && (
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                Sign In
              </Link>
            )
          )}

          {/* Mobile hamburger toggle */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-content-muted hover:text-content-primary hover:bg-surface-raised rounded-lg"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-surface-border bg-surface px-4 py-3 space-y-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-xs font-medium ${
                pathname === item.href
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                  : "text-content-secondary hover:bg-surface-raised"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

