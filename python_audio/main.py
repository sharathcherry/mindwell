"""
MindWell Audio Processing API
Local Whisper + SpeechBrain Emotion Recognition
"""

import os
import tempfile
import warnings
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Suppress warnings
warnings.filterwarnings("ignore")

app = FastAPI(title="MindWell Audio API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances (lazy loaded)
whisper_model = None
emotion_classifier = None

def get_whisper_model():
    """Lazy load Whisper model"""
    global whisper_model
    if whisper_model is None:
        print("🎤 Loading Whisper model (first time may take a moment)...")
        import whisper
        whisper_model = whisper.load_model("base")
        print("✅ Whisper model loaded!")
    return whisper_model

def get_emotion_classifier():
    """Lazy load SpeechBrain emotion classifier"""
    global emotion_classifier
    if emotion_classifier is None:
        print("🧠 Loading SpeechBrain emotion model...")
        from speechbrain.inference.interfaces import foreign_class
        emotion_classifier = foreign_class(
            source="speechbrain/emotion-recognition-wav2vec2-IEMOCAP",
            pymodule_file="custom_interface.py",
            classname="CustomEncoderWav2vec2Classifier",
            savedir="pretrained_models/emotion-recognition"
        )
        print("✅ Emotion model loaded!")
    return emotion_classifier

@app.get("/")
async def root():
    return {"message": "MindWell Audio API is running", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/audio/process")
async def process_audio(audio: UploadFile = File(...)):
    """
    Process audio file:
    1. Transcribe with Whisper
    2. Detect emotion with SpeechBrain
    """
    try:
        # Save uploaded file temporarily
        suffix = Path(audio.filename).suffix if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Convert to WAV if needed (for SpeechBrain compatibility)
        wav_path = tmp_path
        if not tmp_path.endswith('.wav'):
            wav_path = tmp_path.replace(suffix, '.wav')
            # Read and resave as WAV
            import subprocess
            try:
                # Try using ffmpeg for conversion
                subprocess.run([
                    'ffmpeg', '-y', '-i', tmp_path, 
                    '-ar', '16000', '-ac', '1', wav_path
                ], capture_output=True, check=True)
            except:
                # Fallback: just use the original file
                wav_path = tmp_path

        # 1. Transcribe with Whisper
        whisper = get_whisper_model()
        result = whisper.transcribe(wav_path, language="en")
        text = result["text"].strip()
        
        # 2. Emotion detection with SpeechBrain
        emotion_result = {"emotion": "neutral", "confidence": 0.5, "all_emotions": {}}
        
        try:
            classifier = get_emotion_classifier()
            out_prob, score, index, text_lab = classifier.classify_file(wav_path)
            
            # Get emotion label and confidence
            emotion = text_lab[0].lower()
            confidence = float(score[0])
            
            # Get all probabilities
            emotions_list = ["anger", "happiness", "sadness", "neutral"]
            probs = out_prob[0].tolist() if hasattr(out_prob[0], 'tolist') else list(out_prob[0])
            all_emotions = {e: round(p, 3) for e, p in zip(emotions_list, probs)}
            
            emotion_result = {
                "emotion": emotion,
                "confidence": round(confidence, 3),
                "all_emotions": all_emotions
            }
        except Exception as e:
            print(f"Emotion detection error: {e}")
            # Fallback emotion based on text analysis
            text_lower = text.lower()
            if any(w in text_lower for w in ['sad', 'depressed', 'down', 'hurt']):
                emotion_result = {"emotion": "sadness", "confidence": 0.6, "all_emotions": {}}
            elif any(w in text_lower for w in ['angry', 'mad', 'frustrated']):
                emotion_result = {"emotion": "anger", "confidence": 0.6, "all_emotions": {}}
            elif any(w in text_lower for w in ['happy', 'great', 'good', 'excited']):
                emotion_result = {"emotion": "happiness", "confidence": 0.6, "all_emotions": {}}

        # Cleanup temp files
        try:
            os.unlink(tmp_path)
            if wav_path != tmp_path:
                os.unlink(wav_path)
        except:
            pass

        return JSONResponse({
            "text": text,
            "emotion": emotion_result["emotion"],
            "confidence": emotion_result["confidence"],
            "all_emotions": emotion_result.get("all_emotions", {})
        })

    except Exception as e:
        print(f"Audio processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting MindWell Audio API on http://localhost:3002")
    uvicorn.run(app, host="0.0.0.0", port=3002)
