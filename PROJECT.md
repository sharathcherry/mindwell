# Project: MindWell Platform Hardening & Vercel Production Packaging

## Architecture
MindWell is a multi-tier multimodal mental wellness platform engineered with free-tier cloud infrastructure, Vercel Serverless native deployment, local/cloud acoustic signal processing, persistent database storage, and enterprise security guardrails.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Frontend                        │
│   (Vite + React 19 + Tailwind/CSS Vars + Recharts + jsPDF)  │
│          AuthContext + Axios/Fetch Token Interceptor        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               /api/*          │         /api/audio/*
                               ▼                       ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│     Vercel Serverless / Express      │   │ Zero-Dep Node Audio Fallback │
│  (Node.js ESM + Prisma ORM + JWT)    │   │  & External PyTorch HuBERT   │
│  - Rate Limiting (express-rate-limit)│   │  - Direct Gemini 2.0 Audio   │
│  - Zod Request Schema Validation     │   │  - FastAPI HuBERT on GPU/CPU │
│  - Deterministic Crisis Triage Engine│   │  - Clinical Biomarkers + STT │
│  - Multimodal LLM Cascade:           │   └──────────────────────────────┘
│    Gemini 2.0 Flash -> Groq Llama3.3 │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│      Persistent Database Layer       │
│   (PostgreSQL Neon / SQLite Local)   │
│   Prisma ORM: Users, Sessions,       │
│   Conversations, Messages, Moods,    │
│   Journals                           │
└──────────────────────────────────────┘
```

---

## Feature Inventory
Every feature from the Survey phase and Vercel hosting requirements is mapped to its assigned milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Persistent Database Layer & Schema | Prisma ORM with SQLite zero-config fallback and PostgreSQL (Neon serverless pooler) support. Core models: User, Session (refresh tokens), Conversation, ChatMessage (with acoustic telemetry & fusion), MoodLog, JournalEntry. Prisma client singleton, migrations, seed script. | M1 | R1, Survey E1, Vercel Update |
| 2 | Secure Production Auth & Token Lifecycle | JWT access token (15m expiry) + httpOnly secure refresh token rotation (7d in DB Session), bcrypt password hashing, auth endpoints (`/signup`, `/login`, `/refresh`, `/logout`, `/me`). | M2 | R2, Survey E1 |
| 3 | Route Protection & Resource APIs | `requireAuth` middleware protecting `/api/chat`, `/api/moods`, `/api/journals`, `/api/conversations`, `/api/reports/*` with database CRUD persistence. | M2 | R2, Survey E1 |
| 4 | React Client Real Auth Migration | `AuthContext` + `AuthProvider`, migration from browser `localStorage` mock auth to backend session REST calls, automatic 401 token refresh interceptor, `<ProtectedRoute>` routing in `App.jsx`. | M2 | R2, Survey E2 |
| 5 | React Client Persistent Data Layer | Adapt `client/src/services/api.js` and pages (`ChatPage`, `MoodTrackerPage`, `JournalPage`, `ReportsPage`, `ProgressPage`) to fetch/store data via backend REST APIs. | M2 | R1, R2, Survey E2 |
| 6 | Production Rate Limiting | `express-rate-limit` middleware on auth (5 req/15m), chat (30 req/m), reports (10 req/m), and general API (100 req/15m) returning HTTP 429. | M3 | R3, Survey E1 |
| 7 | Zod Request Schema Validation | Zod schemas for auth, chat, mood, journal, and report payloads with automated validation middleware returning HTTP 400 Bad Request. | M3 | R3, Survey E1 |
| 8 | Hardened Crisis Triage & Safety Guardrails | Sub-50ms keyword matching (<1ms), multi-country emergency hotline directory (US/GB/IN/CA/AU/DEFAULT), zero-shot LLM triage fallback, CBT 5-4-3-2-1 grounding protocol. | M3 | R3, Survey E1, E3 |
| 9 | Security Headers & CORS | `helmet` HTTP headers protection, strict CORS origin allow-listing, httpOnly secure cookie configuration. | M3 | R3, Survey E1 |
| 10 | Tier-1 Acoustic SER & Clinical Biomarkers | PyTorch HuBERT SER (`superb/hubert-base-superb-er`) on CUDA/CPU, acoustic biomarkers calculation (Pitch $F_0$ via ACF, Jitter, Shimmer, Speaking Rate, RMS energy, ZCR). | M4 | R4, Survey E3 |
| 11 | Speech-to-Text & Offline Resilience | Groq Whisper Large v3 integration with resilient offline/fallback handling. | M4 | R4, Survey E3 |
| 12 | Dynamic Multimodal AI Cascade & Fusion | Dynamic runtime fallback chain (Gemini 2.0 Flash -> Groq Llama 3.3 70B -> NVIDIA NIM -> Local heuristics) with tone-attuned masked distress detection. Direct audio processing via Gemini 2.0 Flash in `api/audio/process.js` for zero-dependency Vercel Serverless support. | M4 | R4, Vercel Update |
| 13 | Single-Command Production Docker & Vercel Packaging | Multi-service `docker-compose.yml`, Dockerfiles for all 3 tiers, Nginx reverse proxy routing, health checks (`/api/health`, `/health`), `vercel.json` (serverless routing, build command `npx prisma generate && cd client && npm run build`, output directory `client/dist`), and `.env.example`. | M5 | R5, Vercel Update |
| 14 | Comprehensive 4-Tier Test Suite & Build Verification | 100% automated tests passing across unit, integration, auth, rate limiting, and security in <30s; client Vite build compiling with 0 errors. | M6 | Acceptance, Survey E1, E2, E3 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Persistent Database Layer & Schema | Prisma schema (`schema.prisma`), SQLite/Postgres support, migrations, seed script, Prisma singleton client (`server/db.js`), CRUD repositories. | none | IN_PROGRESS |
| M2 | Authentication & Client-Server Integration | Server auth routes (`/api/auth/*`), JWT + httpOnly cookie session rotation, `requireAuth` middleware, resource CRUD routes (`/api/moods`, `/api/journals`, `/api/conversations`), client `AuthContext`, API token refresh interceptor, React auth & storage migration, Vercel serverless `api/` route parity. | M1 | PLANNED |
| M3 | Hardened Security, Rate Limiting & Safety Guardrails | `express-rate-limit` rate limiters, Zod request validation middleware & schemas, deterministic sub-50ms crisis triage engine, emergency hotlines, `helmet`, CORS. | M2 | PLANNED |
| M4 | Free-Tier Multimodal AI & Audio Architecture | Python audio service Tier-1 SER acoustic biomarkers ($F_0$, jitter, shimmer, speaking rate), Groq Whisper STT, Gemini 2.0 Flash + Groq Llama 3.3 70B dynamic fallback cascade, multimodal audio processing for Vercel serverless (`api/audio/process.js`). | M1 | IN_PROGRESS |
| M5 | Production Docker & Vercel Deployment Packaging | `docker-compose.yml`, Dockerfiles, Nginx config, `vercel.json` configuration with build hooks (`prisma generate`, `vite build`), health checks, `.env.example`. | M1, M2, M3, M4 | PLANNED |
| M6 | Final Verification & Test Suite Hardening | Full unit, integration, and security test suite passing 100% in < 30s, client Vite build compiling with 0 errors, E2E acceptance test suite verification. | M1, M2, M3, M4, M5 | PLANNED |
