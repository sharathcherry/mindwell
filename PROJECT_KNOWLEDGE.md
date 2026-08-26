# MindWell — Complete Project Knowledge Base & Architecture Takeout

> **Document Purpose**: This single document is a comprehensive, self-contained knowledge briefing designed to give any Large Language Model (LLM) or human engineer complete context, architectural blueprints, schema specifications, and implementation details for the **MindWell** codebase.

---

## 1. Executive Summary

- **Project Name**: MindWell
- **Mission**: Zero-operating-cost, production-grade, multimodal AI mental wellness companion.
- **Repository**: `https://github.com/sharathcherry/mindwell`
- **Live Production URL**: `https://mindwell-gold.vercel.app`
- **Operating Cost**: **\$0.00 / month** (strictly built using free-tier serverless cloud components).
- **Core Technology Stack**:
  - **Frontend**: React 19 (SPA), Vite 7, CSS Variables design system, Google Identity Services (GSI SDK).
  - **Backend API**: Vercel Serverless Functions (Node.js runtime, max 12 functions on Hobby tier).
  - **Database & ORM**: PostgreSQL hosted on **Supabase** (`ap-south-1` Mumbai) via Prisma ORM 5.22 with connection pooling.
  - **AI & ML Pipeline**:
    - **Primary LLM**: Google Gemini 3.6 Flash (`gemini-3.6-flash`, OpenAI-compatible endpoint).
    - **Fallback LLM**: Groq Cloud Qwen 3.8 27B (`qwen/qwen3.8-27b`, ultra-low latency LPU inference).
    - **Emotion Transformer**: Hugging Face Serverless Inference (`j-hartmann/emotion-english-distilroberta-base` for 7 Ekman emotions).
    - **Voice SER (Local/Hybrid)**: Self-hosted PyTorch HuBERT acoustic Speech Emotion Recognition (`superb/hubert-base-superb-er`).
  - **Authentication**: JWT (15-min access token + 7-day `httpOnly` secure refresh cookie with SHA-256 token rotation) + Google OAuth 2.0.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer
        SPA["React 19 + Vite SPA\n(client/)"]
        GSI["Google Identity Services\n(accounts.google.com/gsi)"]
    end

    subgraph API & Edge Gateway
        Vercel["Vercel Serverless Gateway\n(api/ - 7 consolidated routes)"]
        AuthMiddleware["JWT & Session Auth\n(Token Rotation + Refresh)"]
    end

    subgraph AI Cascade Engine
        HF["HuggingFace DistilRoBERTa\n(Emotion Classification)"]
        Gemini["Google Gemini 3.6 Flash\n(Primary Chat & Zero-Shot Triage)"]
        Groq["Groq Cloud Qwen 3.8 27B\n(High-Speed Fallback)"]
        Heuristics["Deterministic Fallback\n(Zero-latency safety net)"]
    end

    subgraph Persistence Layer
        Prisma["Prisma ORM Client\n(rhel-openssl-3.0.x binaries)"]
        Supabase["Supabase PostgreSQL\n(aws-1-ap-south-1.pooler.supabase.com:6543)"]
    end

    SPA -->|HTTPS REST / SSE Streaming| Vercel
    GSI -->|ID Token Credential| SPA
    Vercel --> AuthMiddleware
    AuthMiddleware --> Prisma
    Prisma --> Supabase
    Vercel -->|Parallel Emotion Extraction| HF
    Vercel -->|Real-time Token Streaming| Gemini
    Gemini -.->|Failover| Groq
    Groq -.->|Failover| Heuristics
```

---

## 3. Directory Structure & Key Files

```text
mindwell/
├── api/                             # Vercel Serverless Functions (Max 12 Hobby Limit)
│   ├── _shared.js                   # Common auth, CORS, validation, rate limiting helpers
│   ├── chat.js                      # Real-time SSE word-by-word streaming chat endpoint
│   ├── conversations.js             # Conversation history listing & creation
│   ├── health.js                    # System & database health probe
│   ├── journals.js                  # Journal entries CRUD
│   ├── moods.js                     # Mood logs CRUD
│   ├── auth/
│   │   └── [action].js              # Dynamic auth handler: login, signup, google, refresh, logout
│   └── reports/
│       └── [type].js                # Dynamic report generator: therapy & lifestyle
├── client/                          # React + Vite Frontend
│   ├── public/                      # Static assets & icons
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatBubble.jsx       # Message bubble with live streaming & emotion tags
│   │   │   ├── Navigation.jsx       # Sidebar & tab navigation
│   │   │   └── VoiceRecorder.jsx    # Audio capture & acoustic SER upload
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state (user, tokens, Google login)
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx         # Live streaming chat interface
│   │   │   ├── LoginPage.jsx        # Login & Signup with Google Identity button
│   │   │   ├── MoodPage.jsx         # Mood tracking & interactive charts
│   │   │   ├── JournalPage.jsx      # Mental health journaling
│   │   │   ├── ReportsPage.jsx      # Personalized therapy insights
│   │   │   └── CrisisPage.jsx       # Emergency crisis resources & hotlines
│   │   ├── services/
│   │   │   ├── api.js               # API service with SSE reader & 401 token refresh
│   │   │   └── auth.js              # Auth API calls (login, Google, refresh, logout)
│   │   └── utils/
│   │       └── storage.js           # LocalStorage caching fallback
│   ├── index.html                   # Entry HTML with Google GSI SDK script
│   ├── package.json                 # Frontend dependencies
│   └── vite.config.js               # Vite config with /api proxy for local dev
├── server/                          # Shared backend library & Prisma ORM
│   ├── prisma/
│   │   └── schema.prisma            # Database schema with native & rhel binary targets
│   ├── routes/                      # Express route handlers (for local dev container)
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── moods.js
│   │   └── journals.js
│   ├── services/
│   │   ├── analysis.js              # Keyword + Hugging Face RoBERTa emotion classifier
│   │   ├── crisis.js                # Deterministic crisis rules & hotline routing
│   │   ├── fallback.js              # Empathetic zero-dependency heuristic responses
│   │   ├── nvidia.js                # AI provider cascade & SSE streaming controller
│   │   └── prompts.js               # Clinical system prompts & cognitive reframing
│   ├── db.js                        # Singleton Prisma client instance with pooling
│   └── package.json                 # Server dependencies
├── python_audio/                    # Python PyTorch Tier-1 Acoustic SER Service
│   ├── server.py                    # Flask/FastAPI service hosting HuBERT CUDA model
│   └── requirements.txt             # PyTorch, transformers, torchaudio, librosa
├── vercel.json                      # Vercel deployment configuration & build commands
├── package.json                     # Root monorepo manifest with hoisted dependencies
└── PROJECT_KNOWLEDGE.md             # Master knowledge base & architecture guide
```

---

## 4. Database Schema (Prisma PostgreSQL)

The database schema is defined in `server/prisma/schema.prisma` and hosted on Supabase PostgreSQL (`ap-south-1`):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Transaction pooler (Port 6543 with ?pgbouncer=true)
  directUrl = env("DIRECT_URL")     // Session pooler (Port 5432)
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x", "rhel-openssl-1.0.x"]
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  name          String?
  role          String         @default("user")
  timezone      String         @default("UTC")
  locale        String         @default("en-US")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  sessions      Session[]
  conversations Conversation[]
  moodLogs      MoodLog[]
  journalEntries JournalEntry[]
}

model Session {
  id           String    @id @default(uuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash    String    @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime  @default(now())
}

model Conversation {
  id           String        @id @default(uuid())
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String        @default("New Conversation")
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  messages     ChatMessage[]
}

model ChatMessage {
  id                 String       @id @default(uuid())
  conversationId     String
  conversation       Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role               String       // "user" | "assistant" | "system"
  content            String
  emotion            String?      // e.g., "sadness", "anxiety", "joy"
  emotionConfidence  Float?
  isMaskedDistress   Boolean      @default(false)
  voicePitch         Float?
  voiceTempo         Float?
  voiceEnergy        Float?
  createdAt          DateTime     @default(now())
}

model MoodLog {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating     Int       // 1 to 5
  emoji      String
  tags       String[]  // ["work", "sleep", "family"]
  notes      String?
  loggedAt   DateTime  @default(now())
}

model JournalEntry {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title      String
  prompt     String?
  content    String
  moodTag    String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

---

## 5. Multi-Tier AI Cascade & Emotion Analysis

### 5.1 Request Pipeline Lifecycle
1. **User Message Received**: Client sends `POST /api/chat` with JWT auth.
2. **Text Emotion Classification** (`server/services/analysis.js`):
   - **Fast Keyword Analysis**: Synchronous scan across clinical categories (`anxiety`, `depression`, `anger`, `fear`, `positive`).
   - **Hugging Face DistilRoBERTa**: Asynchronously calls `j-hartmann/emotion-english-distilroberta-base` via Hugging Face Inference API with a 1500ms timeout.
3. **Multimodal Emotion Fusion** (`mergeVoiceEmotion`):
   - Combines textual Ekman classification with vocal acoustic telemetry (pitch, tempo, energy from `VoiceRecorder.jsx`).
   - Detects **Masked Distress**: When user text seems positive/neutral but voice acoustic biomarkers indicate severe strain or sadness.
4. **Crisis Safety Triage** (`server/services/crisis.js` & `assessCrisisRisk`):
   - Scans for imminent crisis keywords (`suicide`, `kill myself`, `self harm`).
   - If keywords match: calls Gemini 3.6 Flash for zero-shot risk classification (`is_crisis`, `risk_level`).
   - If crisis confirmed: immediately halts normal chat and returns localized emergency helpline numbers and crisis protocols.
5. **Real-Time Word-by-Word Streaming Chat** (`streamChatWithAI`):
   - System prompt dynamically loaded from `prompts.js` incorporating CBT, ACT, and mindfulness frameworks.
   - Pipes tokens over Server-Sent Events (`text/event-stream`) to the browser using `Transfer-Encoding: chunked`.
   - **Cascade Fallback Strategy**:
     1. **Google Gemini 3.6 Flash** (`gemini-3.6-flash`) — 1,500 free requests/day.
     2. **Groq Cloud Qwen 3.8 27B** (`qwen/qwen3.8-27b`) — Ultra-low latency LPU fallback.
     3. **Deterministic Heuristics** (`fallback.js`) — Offline, zero-dependency compassionate response pool.

---

## 6. Authentication & Security Engine

### 6.1 Token Lifecycle
- **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`, transmitted via `Authorization: Bearer <token>`.
- **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`, stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie.
- **Token Rotation & Replay Protection**:
  - Each refresh generates a brand new refresh token and deletes the old one.
  - Stored in Supabase `Session` table as a `SHA-256` hash (plain tokens are never stored in the database).

### 6.2 Google OAuth 2.0 (Google Identity Services - GSI)
- Frontend loads official Google SDK: `<script src="https://accounts.google.com/gsi/client" async defer></script>`.
- Button initialized via `google.accounts.id.renderButton()`.
- On user selection, Google returns a signed ID token (`credential`).
- Frontend POSTs `{ credential }` to `/api/auth/google`.
- Backend verifies token directly against `https://oauth2.googleapis.com/tokeninfo?id_token=<token>`, checks `aud` against `GOOGLE_CLIENT_ID`, extracts verified email and profile name, auto-provisions user in PostgreSQL, and establishes the JWT session.

---

## 7. API Reference Matrix

All private endpoints require `Authorization: Bearer <token>` or auto-refresh cookie.

| Method | Endpoint | Description | Payload / Response |
|---|---|---|---|
| `GET` | `/api/health` | Service uptime and DB status | `{ status: "ok", version: "1.0.0" }` |
| `POST` | `/api/auth/signup` | Register new user account | Body: `{ email, password, name }` |
| `POST` | `/api/auth/login` | Login with email/password | Body: `{ email, password }` |
| `POST` | `/api/auth/google` | Google One-Tap / GSI Login | Body: `{ credential }` |
| `POST` | `/api/auth/refresh` | Refresh access token | Cookies: `refreshToken` → `{ accessToken }` |
| `POST` | `/api/auth/logout` | Revoke session & clear cookie | Status `200 OK` |
| `POST` | `/api/chat` | SSE Streaming AI chat | Body: `{ message, conversationHistory, userContext }` → `text/event-stream` |
| `GET` | `/api/moods` | Retrieve user mood logs | Returns array of `MoodLog` records |
| `POST` | `/api/moods` | Create a new mood log | Body: `{ rating, emoji, tags, notes }` |
| `GET` | `/api/journals` | Retrieve user journals | Returns array of `JournalEntry` records |
| `POST` | `/api/journals` | Create journal entry | Body: `{ title, prompt, content, moodTag }` |
| `POST` | `/api/reports/therapy` | Generate AI therapy plan | Returns structured therapy suggestions |
| `POST` | `/api/reports/lifestyle` | Generate lifestyle report | Returns personalized wellness schedule |

---

## 8. Environment Variables Specification

| Key | Scope | Purpose | Example Value |
|---|---|---|---|
| `DATABASE_URL` | Server | Supabase Transaction Pooler URL (Port 6543) | `postgresql://postgres.xxx:pass@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Server | Supabase Session Pooler URL (Port 5432) | `postgresql://postgres.xxx:pass@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Server | Secret for signing 15m access tokens | 32+ character random hex/base64 string |
| `JWT_REFRESH_SECRET` | Server | Secret for signing 7d refresh tokens | 32+ character random hex/base64 string |
| `GEMINI_API_KEY` | Server | Google AI Studio API key | `AQ.Ab8RN6...` |
| `GROQ_API_KEY` | Server | Groq Cloud LPU API key | `gsk_mnJ0...` |
| `HF_TOKEN` | Server | Hugging Face User Access Token | `hf_PfQNVFn...` |
| `GOOGLE_CLIENT_ID` | Server & Client | Google Cloud OAuth Client ID | `56537672878-...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Server | Google Cloud OAuth Client Secret | `GOCSPX-mdL9...` |
| `VITE_GOOGLE_CLIENT_ID`| Client | Bundled into Vite frontend build | Same as `GOOGLE_CLIENT_ID` |

---

## 9. Developer & Deployment Runbook

### 9.1 Local Development
```bash
# 1. Install root, server, and client dependencies
npm run install:all

# 2. Generate Prisma client (with native and linux binaries)
npx prisma generate --schema=server/prisma/schema.prisma

# 3. Start local development environment
# Terminal 1: Vite Frontend
npm run dev --prefix client

# Terminal 2: Node.js Express Server (optional if testing local API)
npm run dev --prefix server
```

### 9.2 Production Deployment to Vercel
```powershell
# Authenticated Vercel deployment with prebuilt bundle
$env:VERCEL_TOKEN = "your_vercel_token"
npx vercel build --prod --token $env:VERCEL_TOKEN --yes
npx vercel deploy --prebuilt --prod --token $env:VERCEL_TOKEN --yes
```

---

## 10. Rules for Future LLM Maintainers
1. **Vercel Serverless Function Limit**: The project runs on the Vercel Hobby plan (max 12 serverless functions). Keep dynamic routes consolidated under `api/auth/[action].js` and `api/reports/[type].js`.
2. **Prisma Binary Targets**: Whenever running `prisma generate` or editing `schema.prisma`, always preserve `binaryTargets = ["native", "rhel-openssl-3.0.x", "rhel-openssl-1.0.x"]` so serverless functions in AWS Lambda / Vercel Linux environments have the correct query engine.
3. **Connection Pooling**: Always connect to Supabase PostgreSQL using port `6543` and `?pgbouncer=true&connection_limit=1` to prevent exhausting database connections across stateless serverless invocations.
4. **Streaming Protocol**: The `/api/chat` endpoint must stream via `text/event-stream` with `res.write('event: delta\ndata: ...')` and end with `event: done` for real-time UI rendering.
