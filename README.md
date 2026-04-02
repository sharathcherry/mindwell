# 🧠 MindWell - Agentic Mental Therapy Bot

An AI-powered mental wellness web application with agentic capabilities, voice emotion detection, mood tracking, journaling, guided exercises, and personalized PDF reports.

![MindWell](https://img.shields.io/badge/MindWell-Mental%20Wellness-7c3aed?style=for-the-badge)

## ✨ Features

### 💬 AI Chat with Voice Emotion Detection
- 🎤 **Voice Input**: Speak to MindWell using your microphone
- 🧠 **Emotion Detection**: Whisper (speech-to-text) + SpeechBrain SER (emotion from voice)
- Detects: sadness, anger, happiness, neutral with confidence scores
- **Groq Cloud AI** for lightning-fast intelligent responses (Llama 3.3 70B)
- Crisis detection with immediate resources

### 🎭 Mood Tracker
- Emoji-based mood logging with notes
- 30-day history and statistics

### 📝 Journal
- Write entries with guided prompts
- Search functionality

### 🧘 Guided Exercises
- Box Breathing, 5-4-3-2-1 Grounding
- Body Scan, CBT Thought Challenge

### 📄 PDF Reports
- Therapy Recommendations
- Lifestyle Wellness Plan
- Progress Summary

### 🆘 Crisis Resources
- International hotlines
- Quick calming techniques

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+ (for voice features)
- **Groq API key** (Recommended for fast AI responses)
- NVIDIA API key (Optional fallback)

### Installation

1. **Set up the Node.js backend**
   ```bash
   cd mindwell/server
   npm install
   cp .env.example .env
   # Add your GROQ_API_KEY to .env
   ```

2. **Set up the frontend**
   ```bash
   cd mindwell/client
   npm install
   ```

3. **Set up Python audio backend** (for voice features)
   ```bash
   cd mindwell/python_audio
   pip install -r requirements.txt
   ```

### Environment Variables

Backend (`server/.env`):

- `PORT` - API port, defaults to `3001`
- `GROQ_API_KEY` - preferred LLM provider
- `NVIDIA_API_KEY` - fallback LLM provider
- `CLIENT_ORIGINS` - comma-separated CORS allow list, defaults to local Vite dev hosts

Frontend (`client/.env`):

- `VITE_API_BASE_URL` - optional override for the chat/report API base path
- `VITE_AUDIO_API_URL` - optional override for the voice processing endpoint

If you are running locally, you can leave these unset and use the default Vite proxy setup.

### Running the App

**Terminal 1** - Node.js backend:
```bash
cd server && npm run dev
```

**Terminal 2** - Frontend:
```bash
cd client && npm run dev
```

**Terminal 3** - Python audio API (for voice):
```bash
cd python_audio && python main.py
```

Open http://localhost:5173

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | Express.js + FastAPI |
| AI Chat | Groq Cloud (Llama 3.3 70B) |
| Speech-to-Text | Whisper (local) |
| Emotion Detection | SpeechBrain wav2vec2 |
| Storage | LocalStorage |

---

## ⚠️ Disclaimer

MindWell is an AI companion and is **NOT** a replacement for professional mental health care.

**Crisis Contacts:**
- **US**: 988 | **UK**: 116 123 | **India**: 9152987821

---

Built with 💜 for mental wellness
