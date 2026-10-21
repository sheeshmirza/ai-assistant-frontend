# AI Assistant Platform — Minimal Classic Frontend

A minimal classic Next.js 14 (App Router) frontend for the **AI Assistant Platform**, designed to mirror the refined aesthetic and architectural patterns of `mailhost-frontend`.

---

## Features

- **App Shell & Layout**:
  - Top navigation bar with multi-tenant organization selector, service health ping indicator, theme switcher (Light / Dark / System), and user profile menu.
  - Collapsible, grouped sidebar navigation matching the minimal classic design.
  - Auto-dismissing toast notifications and offline network detection banners.
- **Authentication & Multi-Tenant Workspaces**:
  - Seamless Sign In and Registration with Bcrypt/JWT token storage.
  - Organization switching and creation with instant workspace re-scoping.
- **AI Assistants Studio (`/assistants`)**:
  - Filter and search assistants by name, use-case template (`customer_support`, `sales`, `appointment_booking`, `general`), and channel (`chat`, `voice`).
  - Full CRUD modal with custom system prompt editor, Qdrant RAG collection configuration, and MCP tool checklist.
  - Automatic Redis cache invalidation on assistant update or deletion.
- **Interactive Chat Console (`/chat`)**:
  - Live conversational turns with sliding memory window.
  - Real-time display of assistant dialogue, RAG knowledge snippets, and audited MCP actions taken.
- **Voice Telephony Engine (`/voice`)**:
  - Outbound phone call dispatcher with E.164 validation and custom opening greetings.
  - Inbound Twilio webhook setup guide and sample TwiML response preview.
  - Live call transfer simulation via TwiML `<Dial>`.
- **Proactive Outreach Campaigns (`/campaigns`)**:
  - Compose and dispatch targeted outreach messages over SMS or Email using MCP tools.
- **Conversation & Transcript Audits (`/conversations` & `/transcripts`)**:
  - PostgreSQL relational conversation history with channel, direction (`inbound` \| `outbound`), status, and duration metrics.
  - MongoDB full dialogue transcript viewer with speaker roles, timestamps, and audited tool executions.
- **MCP Action & Webhook Registry (`/actions`)**:
  - Pre-configured schemas for `book_appointment`, `schedule_calendar_event`, `fill_google_form`, `send_email`, `send_sms`, `create_lead`, and `transfer_call`.
  - Interactive test execution modal with JSON payload editor.
- **Vector Knowledge Base Manager (`/knowledge`)**:
  - Ingest documents into Qdrant vector collections.
  - Real-time cosine similarity search tester with score ranking.
- **Platform Diagnostics & Settings (`/settings`)**:
  - Ping and monitor connection status for Go Platform API (port 3000) and Python AI service (port 3002).
  - Configurable API base URL stored in `localStorage`.

---

## Tech Stack

- **Framework**: Next.js 14.2.24 (App Router)
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 3.4 with custom classic theme variables
- **Icons**: Lucide React
- **State & Context**: React 18 Context API (`AuthContext`, `ThemeContext`, `ToastContext`)
- **Validation**: Zod & strong TypeScript interfaces

---

## Getting Started

### 1. Environment Setup
Create a `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3002
```

### 2. Development Server
```bash
npm run dev
```
Runs at `http://localhost:3001`.

### 3. Production Build
```bash
npm run build
npm start
```
