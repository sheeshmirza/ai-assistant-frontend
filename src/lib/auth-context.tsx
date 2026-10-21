"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, User, Organization, APIError } from "./api";

const TOKEN_KEY = "ai_assistant_token";
const ORG_KEY = "ai_assistant_org_id";

interface AuthContextType {
  user: User | null;
  token: string | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  createOrganization: (name: string) => Promise<Organization>;
  selectOrganization: (orgId: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfileAndOrgs = useCallback(async () => {
    try {
      const [userData, orgsData] = await Promise.all([
        api.getMe(),
        api.listOrganizations(),
      ]);
      setUser(userData);
      setOrganizations(orgsData);

      // Restore previously selected organization or default to first
      let selectedOrg: Organization | null = null;
      const storedOrgId = typeof window !== "undefined" ? localStorage.getItem(ORG_KEY) : null;
      if (storedOrgId) {
        selectedOrg = orgsData.find((o) => o.id === storedOrgId) || null;
      }
      if (!selectedOrg && orgsData.length > 0) {
        selectedOrg = orgsData[0];
      }
      setCurrentOrg(selectedOrg);
      if (selectedOrg && typeof window !== "undefined") {
        localStorage.setItem(ORG_KEY, selectedOrg.id);
      }
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (savedToken) {
      setToken(savedToken);
      api.setToken(savedToken);
      loadProfileAndOrgs();
    } else {
      setIsLoading(false);
    }
  }, [loadProfileAndOrgs]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      api.setToken(res.token);
      setUser(res.user);
      await loadProfileAndOrgs();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const res = await api.register(email, password, fullName);
      setToken(res.token);
      api.setToken(res.token);
      setUser(res.user);
      await loadProfileAndOrgs();
    } finally {
      setIsLoading(false);
    }
  };

  const createOrganization = async (name: string): Promise<Organization> => {
    const newOrg = await api.createOrganization(name);
    setOrganizations((prev) => [newOrg, ...prev]);
    setCurrentOrg(newOrg);
    if (typeof window !== "undefined") {
      localStorage.setItem(ORG_KEY, newOrg.id);
    }
    return newOrg;
  };

  const selectOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId) || null;
    setCurrentOrg(org);
    if (org && typeof window !== "undefined") {
      localStorage.setItem(ORG_KEY, org.id);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setCurrentOrg(null);
    setOrganizations([]);
    api.setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ORG_KEY);
    }
  };

  const refresh = async () => {
    if (api.getToken()) {
      await loadProfileAndOrgs();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizations,
        currentOrg,
        isLoading,
        login,
        register,
        createOrganization,
        selectOrganization,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
