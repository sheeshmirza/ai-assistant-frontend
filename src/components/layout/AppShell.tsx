"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Bot } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token, user, isLoading } = useAuth();

  const isLanding = pathname === "/";
  const isLogin = pathname === "/login" || pathname === "/login/";
  const isPublic = isLanding || isLogin;

  useEffect(() => {
    if (!isLoading && !isPublic && (!token || !user)) {
      router.replace("/login");
    }
  }, [isLoading, isPublic, token, user, router]);

  // Loading spinner for auth verification
  if (!isPublic && isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <OfflineBanner />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-sm animate-pulse">
          <Bot className="h-5 w-5" />
        </div>
        <p className="mt-3 text-xs text-content-muted font-medium tracking-wide">
          Verifying session...
        </p>
      </div>
    );
  }

  // Prevent flash while redirecting to login
  if (!isPublic && (!token || !user)) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <OfflineBanner />
      <Navbar isLanding={isLanding} isLogin={isLogin} />
      <div className="flex flex-1">
        {!isPublic && <Sidebar />}
        <main
          className={
            isPublic
              ? "min-w-0 flex-1 w-full min-h-[calc(100vh-3.5rem)]"
              : "min-w-0 flex-1 w-full pl-0 lg:pl-60 min-h-[calc(100vh-3.5rem)] transition-all duration-200 ease-out"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}

