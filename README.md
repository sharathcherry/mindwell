# 🧠 MindWell - Multimodal AI Mental Wellness Platform

An AI-powered mental wellness companion built on a **Two-Tier Multimodal Fusion Architecture** combining PyTorch-accelerated Acoustic Speech Emotion Recognition (SER) with Contextual Multimodal Intelligence (Gemini 2.0 Flash / Groq Llama 3.3), deterministic safety guardrails, mood tracking, guided CBT exercises, and downloadable clinical wellness PDF reports.

![MindWell](https://img.shields.io/badge/MindWell-Multimodal%20Wellness-7c3aed?style=for-the-badge)

---

## 🏛️ Two-Tier Multimodal Fusion Architecture

MindWell utilizes a dual-engine architecture to overcome the classic *"I'm fine"* failure mode (where a user's spoken words claim they are okay while their vocal acoustics reveal deep distress):

```
                       ┌─────────────────────────┐
                       │  User Audio Input (.wav)│
                       └────────────┬────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │ TIER 1: Acoustic SER  │                 │ TIER 2: Multimodal    │
   │ (PyTorch + CUDA GPU)  │                 │ Intelligence (Gemini) │
   └───────────┬───────────┘                 └───────────┬───────────┘
               │                                         │
               │ • Softmax Probabilities                 │ • Semantic Context
               │ • Physical Biomarkers (RMS/ZCR)         │ • Sarcasm & Masked Distress
               │ • Calibrated Confidence %               │ • Psychological Nuance
               │                                         │
               └────────────────────┬────────────────────┘
                                    ▼
                     ┌─────────────────────────────┐
                     │   Fusion Arbiter (Backend)  │
                     │  • Mismatch Detection       │
                     │  • Tone-Attuned AI Guidance │
                     └──────────────┬──────────────┘
                                    ▼
                     Personalized Therapeutic Response
```

1. **Tier 1 (Acoustic Biomarker Layer - FastAPI & PyTorch):**
   - Extracts mathematical probability distributions (`sadness`, `happiness`, `anger`, `neutral`) directly from 16kHz audio waveforms using deep acoustic transformers (`superb/hubert-base-superb-er`).
   - Computes physical vocal biomarkers: RMS vocal energy, Zero Crossing Rate (pitch instability), and autonomic arousal.
   - Transcribes audio via Groq Whisper Large v3.
2. **Tier 2 (Contextual Fusion Layer - Node/Express & Gemini 2.0 / Groq):**
   - Cross-references semantic transcript content against acoustic vocal telemetry.
   - Detects **Masked Distress / Emotional Suppression** (e.g. positive text with acute acoustic distress).
   - Generates tone-attuned, empathetic conversational guidance.

---

## ✨ Features

### 💬 Multimodal Voice & Chat Companion
- 🎤 **Voice Input**: Speak naturally using microphone or audio file upload.
- 🧠 **Deep Acoustic SER**: Real-time PyTorch inference with CUDA GPU acceleration.
- 💜 **Masked Distress Detection**: Alerts the AI when vocal strain contradicts minimizing words.
- 🛡️ **Deterministic Crisis Triage**: Sub-50ms fail-safe keyword filters + zero-shot triage classifier with localized hotline routing.

### 🎭 Mood Tracker & Visual Analytics
- Emoji-based mood logging with custom notes and tags.
- Recharts-powered 14-day and 30-day interactive mood trend graphs.

### 📝 Guided Journaling
- Cognitive reframing and guided prompt templates.
- Client-side fast search and emotional tagging.

### 🧘 Interactive Exercises
- Box Breathing with animated pacing circles.
- 5-4-3-2-1 Grounding technique.
- CBT Thought Record reframing tool.

### 📄 Downloadable PDF Reports (`jspdf`)
- **Therapy Recommendations**: Tailored modality suggestions (CBT, MBCT, ACT).
- **Lifestyle Wellness Plan**: Personalized sleep hygiene, exercise, and nutrition guides.
- **Progress Summary**: Statistical breakdown of streaks, average mood, and journal insights.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Lucide Icons, Recharts, Framer Motion |
| **PDF Generation** | jsPDF (Client-side rendering & download) |
| **API Server** | Node.js + Express (ES Modules) |
| **Audio & ML Engine** | FastAPI, PyTorch (CUDA 12.4), Transformers (HuBERT / wav2vec2), SoundFile, FFmpeg |
| **Cloud Speech-to-Text** | Groq Cloud (Whisper Large v3) |
| **Multimodal LLM** | Google Gemini 2.0 Flash / Groq Cloud (Llama 3.3 70B) |
| **Local Persistence** | Web Crypto PBKDF2 + LocalStorage |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (with PyTorch and CUDA recommended)
- **Gemini API Key** (Free via [Google AI Studio](https://aistudio.google.com/)) OR **Groq API Key** (Free via [Groq Console](https://console.groq.com/))

### Installation & Setup

1. **Node.js API Server**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add your GEMINI_API_KEY or GROQ_API_KEY to server/.env
   npm run dev
   ```

2. **Python Tier-1 Audio Service**
   ```bash
   cd python_audio
   pip install -r requirements.txt
   python main.py
   ```

3. **React Frontend**
   ```bash
   cd client
   npm install
   npm run dev
   ```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

- **Backend & Fusion Tests:** `cd server && npm test`
- **Audio ML Unit Tests:** `cd python_audio && python test_audio_endpoint.py`
- **Frontend Smoke Tests:** `cd client && npm test`

---

## ⚠️ Disclaimer

MindWell is an AI companion for educational and self-reflection purposes and is **NOT** a replacement for licensed medical or clinical psychological care.

**Crisis Contacts:**
- **US**: 988 | **UK**: 116 123 | **India**: 112 / 9152987821 | **Canada**: 988 | **International**: [Befrienders Worldwide](https://www.befrienders.org/)
