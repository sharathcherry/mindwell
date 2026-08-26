# Original User Request

## 2026-08-26T12:33:29Z

Build and harden MindWell into a production-grade, multi-user mental wellness platform with zero operating cost using free-tier cloud infrastructure, PostgreSQL/Prisma persistence, secure JWT authentication, Two-Tier Multimodal SER with Gemini 2.0 Flash, and enterprise safety guardrails.

Working directory: c:\Users\katuk\OneDrive\Desktop\projects\vibe\mindwell
Integrity mode: development

## Requirements

### R1. Persistent Database Layer & Schema (PostgreSQL + Prisma ORM)
- Implement a production database schema using Prisma ORM with support for PostgreSQL (Neon/Supabase free tier) and a zero-config local fallback (SQLite/Postgres).
- Model core domain entities:
  - User: UUID, email (indexed/unique), passwordHash (Argon2/PBKDF2), role, timezone, locale, createdAt.
  - Session / RefreshToken: Token rotation, device fingerprint, expiration.
  - Conversation & ChatMessage: Encrypted content, role (user/assistant), acoustic vocal telemetry (emotion, confidence, biomarkers), and multimodal fusion metadata (isMaskedDistress).
  - MoodLog: Mood rating (1–5), emoji, tags, notes, timestamp.
  - JournalEntry: Title, reflection prompt, encrypted content, mood tag.
- Include migration scripts (prisma migrate) and seed scripts.

### R2. Secure Production Authentication & Middleware
- Build JWT-based authentication with httpOnly secure refresh cookies and short-lived access tokens.
- Add route protection middleware on all private API endpoints (/api/chat, /api/moods, /api/journals, /api/reports/*).
- Migrate the React frontend from localStorage mock auth to real server-backed session authentication with automatic token refresh interceptors.

### R3. Hardened Production Security, Rate Limiting & Safety Guardrails
- Implement rate limiting (express-rate-limit) on chat and auth routes (e.g. 30 req/min for chat, 5 req/min for auth).
- Add request schema validation using zod for all incoming API payloads.
- Harden the deterministic crisis triage engine with emergency hotline routing, sub-50ms keyword fail-safes, and zero-shot LLM classification fallback.
- Configure secure HTTP headers via helmet and robust CORS allow-listing.

### R4. 100% Free-Tier Multimodal AI & Audio Architecture
- Keep operating cost strictly  by integrating:
  - Tier-1 Local Acoustic SER: Self-hosted PyTorch transformer (superb/hubert-base-superb-er) with CUDA acceleration (0 cost).
  - Speech-to-Text: Groq Whisper Large v3 (free tier) with fallback to local Whisper.
  - Tier-2 Multimodal LLM: Google Gemini 2.0 Flash (gemini-2.0-flash - 1,500 free req/day) with Groq Llama 3.3 70B fallback.
- Enable automatic fallback chaining so the system degrades gracefully without crashing if any single free-tier quota is reached.

### R5. Single-Command Production Docker & CI/CD Packaging
- Provide a multi-service docker-compose.yml orchestrating:
  - Node.js API server (server/)
  - Python PyTorch Tier-1 Audio service (python_audio/)
  - NGINX reverse proxy serving the built Vite React frontend (client/dist/)
- Ensure health check endpoints (/api/health, /health) are wired for automated container orchestrators.

## Acceptance Criteria

### Security & Authentication
- [ ] User signup, login, password verification, token refresh, and logout work end-to-end via server API.
- [ ] Unauthenticated requests to /api/chat, /api/reports/*, /api/moods, and /api/journals return HTTP 401 Unauthorized.
- [ ] Rate limiter blocks requests exceeding configured thresholds with HTTP 429 Too Many Requests.

### Persistence & Data Integrity
- [ ] Prisma migrations apply cleanly without errors.
- [ ] Conversations, mood logs, and journal entries persist across browser sessions and server restarts.
- [ ] Multimodal acoustic telemetry (all_emotions, biomarkers, fusion) is properly stored with chat records.

### Verification & Automated Testing
- [ ] Automated end-to-end test suite (npm test) passes 100% of unit, integration, and security tests across all services in < 30 seconds.
- [ ] PyTorch Tier-1 Acoustic SER endpoint processes audio and returns valid probabilities and biomarkers on CUDA/CPU.
- [ ] Client Vite build (npm run build) compiles with 0 errors and zero dead code.

## 2026-08-26T12:40:04Z

CRITICAL UPDATE FROM USER:
The user explicitly stated:  i willl be hosting this on vercel soo i need it built accordingly.

Incorporate the following Vercel-native architecture requirements across all tracks:
1. Vercel Serverless Architecture:
   - All backend endpoints must be fully functional in the pi/ directory as standard Vercel Serverless functions (Node.js ESM) using the shared services.
   - Database layer: Prisma Client must support serverless environments (e.g. Neon PostgreSQL free tier serverless connection pooling with prisma generate in build step).
2. Audio & SER Deployment on Vercel:
   - Since Vercel Serverless has a 250MB limit and no GPU, implement zero-dependency Node.js native Multimodal Audio processing using Google Gemini 2.0 Flash API (sending audio base64/buffer directly to Gemini 2.0 Flash for audio tone + speech analysis) with fallback to external AUDIO_API_URL (Hugging Face / FastAPI) when available.
3. Vercel Configuration & Build:
   - Update ercel.json to handle installCommand, uildCommand (including 
px prisma generate), output directory client/dist, and SPA routing rewrites.
   - Ensure 
pm run build in root and client/ succeeds with 0 errors.

## 2026-08-26T13:04:31Z

SYSTEM RESUME UPDATE:
Resume from where left off:
- R1: Prisma ORM schema + PostgreSQL Neon migrations + seed scripts
- R2: JWT auth routes (signup, login, refresh, logout) + route protection middleware on /api/chat, /api/moods, /api/journals, /api/reports/*
- R3: Rate limiting (express-rate-limit), Zod validation, helmet security headers
- R4: Multimodal AI & Dual-Mode Audio Engine
- R5: docker-compose.yml multi-service orchestration
- R6 (Critical): Vercel-native deployment — vercel.json with prisma generate build step, api/ serverless functions for all routes, Neon PostgreSQL serverless connection pooling
