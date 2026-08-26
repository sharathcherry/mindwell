# Technical Codebase Audit Report: MindWell

**Audit Date:** August 26, 2026  
**Auditor Role:** Senior Software Engineer / Technical Auditor  
**Target Repository:** `mindwell`  
**Purpose:** Strict evidence-based verification for resume writeup accuracy.

---

## Executive Summary Table

| Category | Claimed in Readme / Pitch | Actual Codebase Reality | Verification Status |
| :--- | :--- | :--- | :--- |
| **1. Agentic Architecture** | Agentic multi-step decision & crisis loop | Single zero-shot LLM classification call + keyword match | ❌ **Not Agentic** |
| **2. Hotline Routing** | Region & locale-aware emergency surfacing | Static 5-country dictionary with locale heuristic; static UI page | ⚠️ **Heuristic Lookup / Hardcoded** |
| **3. PDF Reporting** | Downloadable multi-report PDF generator | Fully functional and reachable client & backend report system | ✅ **Verified Implemented** |
| **4. Voice Emotion Model** | SpeechBrain SER (wav2vec2) + Whisper confidence | SpeechBrain missing; Whisper STT-only; confidence hardcoded (0.6/0.5) | ❌ **Vaporware / Synthetic** |
| **5. Production Scale** | Real user scale, latency SLA, F1 accuracy | No DB, no telemetry, no evaluation benchmarks | ❌ **Not Found in Repo** |

---

## 1. AGENTIC CLAIM

### Verdict: **Not Agentic**
Crisis detection is a **single-prompt zero-shot classification call** with a preliminary keyword string search. It does not contain multi-step agent reasoning, tool/function calling, reflection loops, or dynamic decision cycles.

### Evidence & Code Path

1. **Entry Point & Flow Control:**
   Incoming chat requests hit [`chatWithAI`](server/services/nvidia.js#L111-L125):
   ```javascript
   // server/services/nvidia.js (lines 111-125)
   export async function chatWithAI(message, conversationHistory = [], userContext = {}) {
       const analysis = mergeVoiceEmotion(analyzeMessage(message), userContext);
       const API_KEY = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
       const crisisAssessment = await assessCrisisRisk(
           message,
           conversationHistory,
           userContext,
           API_KEY,
           analysis
       );

       // Handle crisis situation
       if (crisisAssessment.hasCrisisIndicator) {
           return buildCrisisResponse(userContext, crisisAssessment);
       }
   ```

2. **Regex / Substring Keyword Matching:**
   A simple substring list is evaluated before or alongside LLM classification:
   ```javascript
   // server/services/analysis.js (lines 9, 27-29)
   const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end my life', "don't want to live", 'self harm', 'hurt myself'];
   ...
   const hasCrisisIndicator = CRISIS_KEYWORDS.some((keyword) => lowercaseMessage.includes(keyword));
   return { detected, hasCrisisIndicator };
   ```

3. **Zero-Shot LLM Triage Request:**
   [`assessCrisisRisk`](server/services/nvidia.js#L31-L109) makes a **single prompt execution** to Groq (`llama-3.3-70b-versatile` with `temperature: 0`):
   ```javascript
   // server/services/nvidia.js (lines 49-58)
   const prompt = [
       'You are a crisis triage classifier for mental health chat safety.',
       'Classify suicide/self-harm risk from the latest user message and short context.',
       'Return JSON only with: {"is_crisis": boolean, "risk_level": "low|medium|high|imminent", "reasons": string[]}.',
       'Mark is_crisis=true for explicit or strongly implied self-harm/suicidal intent, plans, or inability to stay safe.',
       '',
       `User locale context: ${JSON.stringify({ locale: userContext?.locale, countryCode: userContext?.countryCode, timezone: userContext?.timezone })}`,
       `Recent context:\n${recentContext || 'none'}`,
       `Latest user message:\n${message}`,
   ].join('\n');
   ```

4. **Static Template Return:**
   If `hasCrisisIndicator` is true, execution halts immediately and invokes [`buildCrisisResponse`](server/services/crisis.js#L115-L153), returning hardcoded CBT grounding text and hotline contacts.

---

## 2. HOTLINE LOGIC

### Verdict: **Static dictionary with basic client heuristic fallback (Chat); 100% static array (Crisis Page)**
There is no dynamic geolocation lookup, GeoIP database, or external hotline provider API.

### Evidence & Sources

1. **Backend Mapping Dictionary:**
   [`server/services/crisis.js`](server/services/crisis.js#L1-L26) holds a hardcoded dictionary supporting exactly 5 countries (`US`, `GB`, `IN`, `CA`, `AU`) and a `DEFAULT` fallback:
   ```javascript
   // server/services/crisis.js (lines 1-26, 91-101)
   const HOTLINES_BY_REGION = {
       US: [
           { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', availability: '24/7' },
           { name: 'Crisis Text Line', contact: 'Text HOME to 741741', availability: '24/7' },
       ],
       GB: [
           { name: 'Samaritans', contact: 'Call 116 123', availability: '24/7' },
           { name: 'SHOUT', contact: 'Text SHOUT to 85258', availability: '24/7' },
       ],
       IN: [
           { name: 'Kiran Mental Health Helpline', contact: 'Call 1800-599-0019', availability: '24/7' },
           { name: 'AASRA', contact: 'Call +91-22-2754-6669', availability: '24/7' },
       ],
       CA: [ ... ],
       AU: [ ... ],
       DEFAULT: [
           { name: 'International Emergency', contact: 'Call your local emergency number now', availability: 'Immediate' },
           { name: 'Befrienders Worldwide', contact: 'https://www.befrienders.org', availability: 'Directory' },
       ],
   };

   export function resolveCrisisRegion(userContext = {}) {
       const candidates = [
           normalizeCountryCode(userContext.countryCode),
           normalizeCountryCode(userContext.country),
           countryFromLocale(userContext.locale),
           countryFromTimezone(userContext.timezone),
       ];

       const region = candidates.find((code) => HOTLINES_BY_REGION[code]) || 'DEFAULT';
       return region;
   }
   ```

2. **Client-Side Property Collection:**
   [`client/src/pages/ChatPage.jsx`](client/src/pages/ChatPage.jsx#L14-L31) reads `navigator.language` and `Intl.DateTimeFormat().resolvedOptions().timeZone` to construct `countryCode` and pass it to the backend.

3. **Frontend Crisis Page (`/crisis`):**
   [`client/src/pages/CrisisPage.jsx`](client/src/pages/CrisisPage.jsx#L4-L42) completely ignores the user's location and renders all 5 hardcoded country hotlines concurrently in a static UI grid.

---

## 3. PDF REPORT

### Verdict: **Actually Implemented and Reachable**
The downloadable PDF wellness report is fully implemented on both the client (via `jspdf`) and backend (via LLM prompt generation + fallback templates), with functional routing and user triggers.

### Evidence & Sources

- **Client PDF Generation Engine:** [`client/src/services/pdfService.js`](client/src/services/pdfService.js)
  - `generateTherapyReportPDF(reportData)` (lines 72–143)
  - `generateLifestylePlanPDF(reportData)` (lines 145–226)
  - `generateProgressReportPDF(reportData)` (lines 228–285)
  - `downloadPDF(doc, filename)` (lines 287–289): executes `doc.save(...)` triggering browser download.
- **UI View & Controls:** [`client/src/pages/ReportsPage.jsx`](client/src/pages/ReportsPage.jsx#L46-L141) contains interactive buttons invoking `generateReport('therapy' | 'lifestyle' | 'progress')`.
- **Reachability & Routing:**
  - Route defined in [`client/src/App.jsx:29`](client/src/App.jsx#L29) (`<Route path="/reports" element={<ReportsPage />} />`).
  - Linked in navigation sidebar [`client/src/components/Navbar.jsx:11`](client/src/components/Navbar.jsx#L11).
- **Backend Report API Endpoints:**
  - `POST /api/reports/therapy` in [`server/index.js:102-115`](server/index.js#L102-L115) and [`api/reports/therapy.js`](api/reports/therapy.js).
  - `POST /api/reports/lifestyle` in [`server/index.js:118-131`](server/index.js#L118-L131) and [`api/reports/lifestyle.js`](api/reports/lifestyle.js).

---

## 4. EMOTION MODEL

### Verdict: **SpeechBrain is missing (vaporware); Whisper is STT-only; confidence scores are hardcoded constants (0.6 / 0.5)**

### Evidence & Pipeline Trace

1. **SpeechBrain SER:** **Not found in repo.**
   - Mentioned in [`README.md`](README.md#L11) ("*Whisper (speech-to-text) + SpeechBrain SER (emotion from voice)*") and line 114 ("*SpeechBrain wav2vec2*").
   - `speechbrain` is **absent** from [`python_audio/requirements.txt`](python_audio/requirements.txt) and is never imported or invoked anywhere in the codebase.

2. **Whisper Transcription:**
   - Transcribed remotely via the Groq Cloud API endpoint (`https://api.groq.com/openai/v1/audio/transcriptions` with `model: "whisper-large-v3"`) in [`python_audio/main.py:49-78`](python_audio/main.py#L49-L78).
   - Whisper only provides text transcription; it outputs no acoustic emotion analysis or confidence score.

3. **Emotion Inference & Confidence Logic:**
   In [`python_audio/main.py`](python_audio/main.py#L79-L88), emotion is derived purely from basic substring matching over the transcript text with static hardcoded floats:
   ```python
   # python_audio/main.py (lines 79-88)
   def infer_emotion_from_text(text: str):
       """Best-effort emotion inference when no voice classifier is used."""
       text_lower = (text or "").lower()
       if any(w in text_lower for w in ["sad", "depressed", "down", "hurt", "hopeless"]):
           return {"emotion": "sadness", "confidence": 0.6, "all_emotions": {}}
       if any(w in text_lower for w in ["angry", "mad", "frustrated", "annoyed"]):
           return {"emotion": "anger", "confidence": 0.6, "all_emotions": {}}
       if any(w in text_lower for w in ["happy", "great", "good", "excited", "better"]):
           return {"emotion": "happiness", "confidence": 0.6, "all_emotions": {}}
       return {"emotion": "neutral", "confidence": 0.5, "all_emotions": {}}
   ```

---

## 5. SCALE

| Metric | Verification Finding | Evidence / Citation |
| :--- | :--- | :--- |
| **Real User Session Count** | **Not found in repo** | Per-browser localStorage counter only (`client/src/utils/storage.js:99-103`). No server telemetry or DB. |
| **Latency (p50, p95, p99)** | **Not found in repo** | No latency profiling, benchmarks, or SLA metrics recorded. |
| **Model Accuracy / F1** | **Not found in repo** | Zero evaluation datasets, ground-truth test splits, or confusion matrices. |
| **Methodology Stated** | **Not found in repo** | No formal evaluation methodology exists in the codebase. |

---

## 6. GAPS (Blunt Technical Assessment for Resume Claims)

Do not put the following claims on a resume without engineering the underlying architecture first:

1. **"Built an Agentic AI Mental Health Platform": FALSE**
   - There are no autonomous agent loops, tool bindings, ReAct patterns, RAG systems, or memory vector stores.
   - It is a standard single-turn LLM chat proxy wrapped in Express.js.

2. **"Speech Emotion Recognition (SER) with SpeechBrain / wav2vec2": FABRICATION**
   - SpeechBrain was never implemented. Audio emotion classification is a 9-line Python function doing `if "sad" in text.lower()` and returning a hardcoded `0.6`.

3. **"Locally Hosted / On-Device Whisper Model": FALSE**
   - Whisper is not running locally via PyTorch, ONNX, or C++. Audio is sent directly over the public internet to Groq's cloud REST endpoint.

4. **"Full-Stack Scalable Architecture": ABSENT**
   - There is zero persistent backend database (no SQL, MongoDB, Redis, or DynamoDB).
   - User credentials, chat logs, journals, and mood histories are stored solely in the user's browser `localStorage`.

5. **"Secure User Authentication": ILLUSORY**
   - Authentication is a client-side mock hashing passwords directly into `localStorage` via Web Crypto PBKDF2 (`client/src/services/auth.js`).
   - Backend API endpoints have zero authentication or token validation middleware (no JWTs, sessions, or API keys).

6. **"Automated Crisis Triage & Safety Guardrails": UNSUITABLE FOR CLINICAL/SAFETY CLAIMS**
   - Safety checks rely on a 6-item static string array and an uncalibrated zero-shot LLM prompt. There are no deterministic enterprise guardrails (e.g., NeMo Guardrails, Llama Guard, or rule-based safety state machines).

7. **"Rigorous Production Testing & ML Validation": MINIMAL**
   - Testing is limited to 5 basic Node HTTP response assertions (`server/test/run-api-tests.js`) and 3 client mock checks (`client/test/run-client-tests.js`). There is no load testing, integration testing, or ML accuracy benchmarking.

---

## 7. RESOLUTION & UPGRADED ARCHITECTURE: Two-Tier Multimodal Fusion

Following this audit, the voice and emotion engine was upgraded and verified in the codebase:

### Implementation Summary
1. **Tier-1 Acoustic Biomarker Engine ([`python_audio/main.py`](python_audio/main.py)):**
   - Integrated `superb/hubert-base-superb-er` deep neural network running directly on PyTorch with NVIDIA CUDA 12.4 acceleration.
   - Computes physical acoustic biomarkers (`rms_energy`, `zero_crossing_rate`, `arousal`).
   - Generates authentic softmax probability distributions across acoustic emotion classes.
   - **Benchmarked Inference Latency:** **363.22 ms** on local CUDA GPU.
2. **Tier-2 Semantic-Acoustic Multimodal Fusion ([`server/services/analysis.js`](server/services/analysis.js)):**
   - Implemented cross-modal fusion comparing transcript semantics against vocal prosody.
   - Detects **Masked Distress** (minimizing words with severe vocal distress) and **Affective Sarcasm**.
   - Integrated Google Gemini 2.0 Flash (`gemini-2.0-flash`) support alongside Groq Llama 3.3 for tone-attuned empathetic conversational guidance.
3. **Verified Test Coverage:**
   - Python Audio ML Unit Test: `python test_audio_endpoint.py` (PASS)
   - Node API & Fusion Unit Tests: `node test/run-api-tests.js` (7/7 PASS)
   - Client Component & Storage Tests: `node test/run-client-tests.js` (3/3 PASS)
   - Vite Production Build: `npm run build` (PASS)

