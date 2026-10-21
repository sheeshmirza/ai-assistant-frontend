// AI Assistant Platform API Client

export interface APIError {
  code: string;
  message: string;
  status: number;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assistant {
  id: string;
  organizationId: string;
  name: string;
  useCase:
    | "appointment_booking"
    | "inbound_query_handling"
    | "selling"
    | "outreach"
    | "cold_outreach"
    | string;
  channels: string[];
  status: "active" | "draft" | "archived" | "deleted" | string;
  systemPrompt?: string;
  knowledgeBase?: string;
  enabledActions?: string[];
  phoneNumber?: string;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  assistantId: string;
  channel: "chat" | "voice";
  direction: "inbound" | "outbound";
  externalId?: string;
  status: "active" | "completed" | "ended" | "failed";
  startedAt: string;
  endedAt?: string;
}

export interface ActionTaken {
  name: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  timestamp: string;
}

export interface ConversationLog {
  id: string;
  organizationId: string;
  assistantId: string;
  conversationId: string;
  channel: string;
  messages: ConversationMessage[];
  metadata?: {
    actions_taken?: ActionTaken[];
    [key: string]: any;
  };
  createdAt: string;
}

export interface TranscriptEntry {
  id: string;
  organizationId: string;
  assistantId: string;
  conversationId: string;
  channel?: string;
  messages?: ConversationMessage[];
  role?: "user" | "assistant" | "system";
  content?: string;
  actionsTaken?: ActionTaken[];
  metadata?: {
    actions_taken?: ActionTaken[];
    [key: string]: any;
  };
  createdAt: string;
}

export interface ChatResponseData {
  reply: string;
  conversationId: string;
  actionsTaken?: ActionTaken[];
  actions_taken?: ActionTaken[];
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationSessionData {
  history?: ConversationTurn[];
  context?: Record<string, unknown>;
  summary?: string;
  metadata?: Record<string, unknown>;
  entities?: Record<string, unknown>;
}

export interface OutboundMessageResponseData {
  message: string;
  conversationId: string;
  dispatch: Record<string, unknown>;
}

export interface OutboundCallResponseData {
  callSid: string;
  conversationId: string;
  status: string;
}

export interface MCPActionDefinition {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface VectorSearchResult {
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const configured = localStorage.getItem("ai_assistant_api_url");
    if (configured) return configured.replace(/\/+$/, "");
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3000";
  return envUrl.replace(/\/+$/, "");
};

const getAiServiceUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim() || "http://localhost:3002";
  return envUrl.replace(/\/+$/, "");
};

class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("ai_assistant_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("ai_assistant_token", token);
      } else {
        localStorage.removeItem("ai_assistant_token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    overrideBaseUrl?: string
  ): Promise<T> {
    const baseUrl = overrideBaseUrl || getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = res.headers.get("content-type") || "";
      let body: any = null;
      if (contentType.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      if (!res.ok) {
        const errorMsg =
          body?.error?.message ||
          body?.detail ||
          body?.message ||
          `Request failed with status ${res.status}`;
        const errorCode = body?.error?.code || "REQUEST_FAILED";
        const err: APIError = {
          code: errorCode,
          message: errorMsg,
          status: res.status,
        };
        throw err;
      }

      // If wrapped in standard envelope { data: ... }
      if (body && typeof body === "object" && "data" in body) {
        return body.data as T;
      }
      return body as T;
    } catch (err: any) {
      if (err?.code && err?.status) throw err;
      throw {
        code: "NETWORK_ERROR",
        message: err?.message || "Failed to connect to backend service",
        status: 0,
      } as APIError;
    }
  }

  // Auth Endpoints
  async register(email: string, password: string, fullName: string) {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || "User";
    const lastName = parts.slice(1).join(" ") || "Account";
    return this.request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<User>("/api/auth/me");
  }

  // Organizations
  async createOrganization(name: string) {
    return this.request<Organization>("/api/organizations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async listOrganizations() {
    return this.request<Organization[]>("/api/organizations");
  }

  async getOrganization(orgId: string) {
    return this.request<Organization>(`/api/organizations/${orgId}`);
  }

  async deleteOrganization(orgId: string) {
    return this.request<{ success: boolean; organizationId: string }>(`/api/organizations/${orgId}`, {
      method: "DELETE",
    });
  }

  // Assistants
  async listAssistants(orgId: string) {
    return this.request<Assistant[]>(`/api/organizations/${orgId}/assistants`);
  }

  async getAssistant(orgId: string, asstId: string) {
    return this.request<Assistant>(`/api/organizations/${orgId}/assistants/${asstId}`);
  }

  async createAssistant(
    orgId: string,
    data: {
      name: string;
      useCase: string;
      channels: string[];
      systemPrompt?: string;
      enabledActions?: string[];
      knowledgeBase?: string;
    }
  ) {
    return this.request<Assistant>(`/api/organizations/${orgId}/assistants`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAssistant(
    orgId: string,
    asstId: string,
    data: {
      name?: string;
      systemPrompt?: string;
      enabledActions?: string[];
      knowledgeBase?: string;
      phoneNumber?: string;
      status?: string;
    }
  ) {
    return this.request<Assistant>(`/api/organizations/${orgId}/assistants/${asstId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAssistant(orgId: string, asstId: string) {
    return this.request<{ success: boolean }>(`/api/organizations/${orgId}/assistants/${asstId}`, {
      method: "DELETE",
    });
  }

  // Conversations & Communications
  async sendChat(
    orgId: string,
    data: {
      assistantId: string;
      conversationId?: string;
      message: string;
      channel?: "chat" | "voice" | string;
      language?: string;
      history?: ConversationTurn[];
      conversationData?: ConversationSessionData;
    }
  ) {
    const payload: {
      assistantId: string;
      message: string;
      conversationId?: string;
      channel?: string;
      language?: string;
      history?: ConversationTurn[];
      conversationData?: ConversationSessionData;
    } = {
      assistantId: data.assistantId,
      message: data.message,
    };
    if (data.conversationId && data.conversationId.trim()) {
      payload.conversationId = data.conversationId.trim();
    }
    if (data.channel) {
      payload.channel = data.channel;
    }
    if (data.language && data.language.trim()) {
      payload.language = data.language.trim();
    }
    if (data.history && data.history.length > 0) {
      payload.history = data.history;
    }
    if (data.conversationData) {
      payload.conversationData = data.conversationData;
    }
    return this.request<ChatResponseData>(`/api/organizations/${orgId}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async initiateCall(
    orgId: string,
    asstId: string,
    data: { to?: string; toPhoneNumber?: string; openingMessage?: string }
  ) {
    const payload = {
      toPhoneNumber: data.toPhoneNumber || data.to || "",
      openingMessage: data.openingMessage || "",
    };
    return this.request<OutboundCallResponseData>(
      `/api/organizations/${orgId}/assistants/${asstId}/calls`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async sendMessage(
    orgId: string,
    asstId: string,
    data: { channel: "sms" | "email"; recipient: string; objective: string }
  ) {
    return this.request<OutboundMessageResponseData>(
      `/api/organizations/${orgId}/assistants/${asstId}/messages`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async listConversations(orgId: string, asstId: string) {
    return this.request<Conversation[]>(
      `/api/organizations/${orgId}/assistants/${asstId}/conversations`
    );
  }

  async getTranscripts(orgId: string, asstId: string, conversationId?: string) {
    const qs = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
    return this.request<TranscriptEntry[]>(
      `/api/organizations/${orgId}/assistants/${asstId}/conversations/transcripts${qs}`
    );
  }

  async endConversation(orgId: string, asstId: string, conversationId: string) {
    return this.request<{ success: boolean }>(
      `/api/organizations/${orgId}/assistants/${asstId}/conversations/${conversationId}/end`,
      {
        method: "POST",
      }
    );
  }

  // Knowledge Base (RAG Qdrant Vector Storage)
  async ingestKnowledge(
    orgId: string,
    data: {
      knowledgeBase: string;
      text: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    return this.request<{ id: string }>(`/api/organizations/${orgId}/knowledge/ingest`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async searchKnowledge(
    orgId: string,
    data: {
      knowledgeBase: string;
      query: string;
      topK?: number;
    }
  ) {
    return this.request<{ results: VectorSearchResult[] }>(
      `/api/organizations/${orgId}/knowledge/search`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async listKnowledgeCollections(orgId: string) {
    return this.request<{ collections: string[] }>(
      `/api/organizations/${orgId}/knowledge/collections`
    );
  }

  // Direct AI Runtime Queries (Optional fallback / diagnostics)
  async getAiServiceHealth() {
    return this.request<{ service: string; version: string }>("/", {}, getAiServiceUrl());
  }

  async getPlatformHealth() {
    return this.request<{ status: string; service: string }>("/health");
  }
}

export const api = new APIClient();

