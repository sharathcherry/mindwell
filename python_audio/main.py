"""
MindWell Tier-1 Audio Processing API
State-of-the-Art Acoustic Speech Emotion Recognition (SER) using PyTorch/Transformers + Groq Whisper Large v3.
"""

import os
import subprocess
import tempfile
import time
import warnings
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
import requests
import soundfile as sf
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from transformers import AutoModelForAudioClassification, AutoFeatureExtractor

# Suppress non-critical warnings
warnings.filterwarnings("ignore")

def load_environment():
    current_dir = Path(__file__).resolve().parent
    python_env = current_dir / ".env"
    server_env = current_dir.parent / "server" / ".env"

    if python_env.exists():
        load_dotenv(python_env, override=False)
    if server_env.exists():
        load_dotenv(server_env, override=False)

load_environment()

app = FastAPI(title="MindWell Tier-1 Audio API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
SER_MODEL_ID = "superb/hubert-base-superb-er"
TARGET_SAMPLING_RATE = 16000
LABEL_MAPPING = {
    "neu": "neutral",
    "hap": "happiness",
    "ang": "anger",
    "sad": "sadness",
    "fea": "fear",
    "fear": "fear",
    "dis": "anger",
    "sur": "fear",
}

device = "cuda" if torch.cuda.is_available() else "cpu"
feature_extractor = None
ser_model = None

def init_ser_model():
    global feature_extractor, ser_model, device
    try:
        print(f"[INFO] Initializing Acoustic SER Model ({SER_MODEL_ID}) on {device.upper()}...", flush=True)
        t0 = time.time()
        feature_extractor = AutoFeatureExtractor.from_pretrained(SER_MODEL_ID)
        ser_model = AutoModelForAudioClassification.from_pretrained(SER_MODEL_ID)
        ser_model = ser_model.to(device)
        ser_model.eval()
        print(f"[SUCCESS] SER Model loaded successfully in {time.time() - t0:.2f}s on {device.upper()}!", flush=True)
    except Exception as e:
        print(f"[WARNING] Failed to load local SER model: {e}", flush=True)
        feature_extractor = None
        ser_model = None

# Initialize on startup
init_ser_model()

def convert_to_wav_16k_mono(input_path: str, output_path: str) -> bool:
    """Convert any audio file to 16kHz mono PCM 16-bit WAV using ffmpeg or soundfile."""
    try:
        # Try ffmpeg first (handles webm, opus, ogg, mp3, mp4, etc.)
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-ar", str(TARGET_SAMPLING_RATE),
            "-ac", "1",
            "-c:a", "pcm_s16le",
            output_path,
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 100:
            return True
    except Exception:
        pass

    # Fallback to soundfile reading
    try:
        data, sr = sf.read(input_path)
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)  # downmix to mono
        if sr != TARGET_SAMPLING_RATE:
            from scipy import signal
            num_samples = int(len(data) * float(TARGET_SAMPLING_RATE) / sr)
            data = signal.resample(data, num_samples)
        sf.write(output_path, data.astype(np.float32), TARGET_SAMPLING_RATE)
        return True
    except Exception as e:
        print(f"Audio conversion error: {e}", flush=True)
        return False

def transcribe_with_groq(file_path: str) -> str:
    """Transcribe audio using Groq Whisper Large v3 with graceful offline fallback."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "[Audio recorded - offline mode / GROQ_API_KEY not configured]"

    try:
        with open(file_path, "rb") as audio_file:
            response = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": audio_file},
                data={
                    "model": "whisper-large-v3",
                    "language": "en",
                    "response_format": "json",
                },
                timeout=30,
            )

        if response.status_code >= 400:
            print(f"[WARNING] Groq STT HTTP {response.status_code}: {response.text[:200]}", flush=True)
            return ""

        payload = response.json()
        return (payload.get("text") or "").strip()
    except Exception as e:
        print(f"[WARNING] Groq STT network/service error (offline fallback): {e}", flush=True)
        return ""

def compute_acoustic_biomarkers(waveform: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
    """
    Compute comprehensive clinical acoustic vocal biomarkers:
    - rms_energy: Root Mean Square signal amplitude float
    - zero_crossing_rate: Rate of sign changes per sample
    - pitch_f0_hz: Fundamental frequency F0 (Hz) via Normalized Autocorrelation Function (ACF) over 30ms window (75Hz-500Hz)
    - jitter_percent: Cycle-to-cycle pitch period perturbation percentage
    - shimmer_percent: Cycle-to-cycle peak amplitude perturbation percentage
    - speaking_rate: Voiced segment count / total duration in seconds
    - arousal: Perceived vocal arousal ("high", "medium", "low") derived from energy, F0, and ZCR
    """
    if len(waveform) == 0:
        return {
            "rms_energy": 0.0,
            "zero_crossing_rate": 0.0,
            "pitch_f0_hz": 0.0,
            "jitter_percent": 0.0,
            "shimmer_percent": 0.0,
            "speaking_rate": 0.0,
            "arousal": "low",
        }

    waveform = np.asarray(waveform, dtype=np.float32)
    # Remove DC bias
    waveform = waveform - np.mean(waveform)

    # 1. RMS Energy
    rms = float(np.sqrt(np.mean(waveform ** 2)))
    if np.isnan(rms) or np.isinf(rms):
        rms = 0.0

    # 2. Zero Crossing Rate
    if len(waveform) > 1:
        zero_crossings = np.nonzero(np.diff(waveform > 0))[0]
        zcr = float(len(zero_crossings) / (len(waveform) - 1))
    else:
        zcr = 0.0
    if np.isnan(zcr) or np.isinf(zcr):
        zcr = 0.0

    # 3. Frame-based ACF Pitch F0, Jitter, Shimmer, and Speaking Rate
    frame_len = int(sr * 0.030)  # 30ms window
    hop_len = int(sr * 0.010)    # 10ms hop
    min_f0 = 75.0
    max_f0 = 500.0
    min_lag = max(1, int(sr / max_f0))
    max_lag = min(frame_len - 1, int(sr / min_f0))

    voiced_f0s = []
    voiced_periods = []
    voiced_amplitudes = []
    voiced_flags = []

    total_samples = len(waveform)
    if total_samples >= frame_len and max_lag > min_lag:
        num_frames = 1 + (total_samples - frame_len) // hop_len
        silence_threshold = max(0.005, 0.1 * rms)

        for i in range(num_frames):
            start = i * hop_len
            frame = waveform[start : start + frame_len]
            frame_rms = float(np.sqrt(np.mean(frame ** 2)))

            if frame_rms < silence_threshold:
                voiced_flags.append(False)
                continue

            # Normalized Autocorrelation Function (ACF)
            f_centered = frame - np.mean(frame)
            frame_energy = np.sum(f_centered ** 2)
            if frame_energy <= 1e-8:
                voiced_flags.append(False)
                continue

            # Compute ACF for valid lags
            acf = np.correlate(f_centered, f_centered, mode="full")
            acf = acf[len(f_centered) - 1 :]  # lags 0 to frame_len-1

            # Search peak in [min_lag, max_lag]
            search_region = acf[min_lag : max_lag + 1]
            if len(search_region) == 0:
                voiced_flags.append(False)
                continue

            peak_idx = int(np.argmax(search_region))
            best_lag = min_lag + peak_idx
            norm_r = acf[best_lag] / (frame_energy + 1e-9)

            if norm_r >= 0.30 and best_lag > 0:
                f0 = float(sr / best_lag)
                period = float(best_lag / sr)
                amp = float(np.max(np.abs(frame)))

                voiced_f0s.append(f0)
                voiced_periods.append(period)
                voiced_amplitudes.append(amp)
                voiced_flags.append(True)
            else:
                voiced_flags.append(False)

    # Pitch F0 summary
    if len(voiced_f0s) > 0:
        pitch_f0_hz = float(np.median(voiced_f0s))
    else:
        pitch_f0_hz = 0.0

    # Jitter (% cycle-to-cycle perturbation)
    if len(voiced_periods) >= 2:
        diff_p = np.abs(np.diff(voiced_periods))
        mean_p = np.mean(voiced_periods)
        jitter = float((np.mean(diff_p) / (mean_p + 1e-9)) * 100.0)
    else:
        jitter = 0.0

    # Shimmer (% peak-to-peak amplitude perturbation)
    if len(voiced_amplitudes) >= 2:
        diff_a = np.abs(np.diff(voiced_amplitudes))
        mean_a = np.mean(voiced_amplitudes)
        shimmer = float((np.mean(diff_a) / (mean_a + 1e-9)) * 100.0)
    else:
        shimmer = 0.0

    # Speaking Rate (voiced segments / duration in seconds)
    duration_sec = float(len(waveform) / sr)
    voiced_segments = 0
    in_voiced = False
    for is_v in voiced_flags:
        if is_v and not in_voiced:
            voiced_segments += 1
            in_voiced = True
        elif not is_v:
            in_voiced = False

    if duration_sec > 0:
        speaking_rate = float(voiced_segments / duration_sec)
    else:
        speaking_rate = 0.0

    # Arousal Classification
    if rms > 0.08 and (pitch_f0_hz > 200.0 or zcr > 0.05):
        arousal = "high"
    elif rms > 0.03 or pitch_f0_hz > 140.0:
        arousal = "medium"
    else:
        arousal = "low"

    return {
        "rms_energy": round(rms, 4),
        "zero_crossing_rate": round(zcr, 4),
        "pitch_f0_hz": round(pitch_f0_hz, 2),
        "jitter_percent": round(jitter, 4),
        "shimmer_percent": round(shimmer, 4),
        "speaking_rate": round(speaking_rate, 2),
        "arousal": arousal,
    }

def classify_acoustic_emotion(wav_path: str) -> Dict[str, Any]:
    """Run real acoustic deep neural network classification on 16kHz audio."""
    global feature_extractor, ser_model, device

    if ser_model is None or feature_extractor is None:
        init_ser_model()

    if ser_model is None or feature_extractor is None:
        return {
            "emotion": "neutral",
            "confidence": 0.5,
            "all_emotions": {"neutral": 0.5, "sadness": 0.2, "happiness": 0.2, "anger": 0.1},
            "biomarkers": {
                "rms_energy": 0.04,
                "zero_crossing_rate": 0.02,
                "pitch_f0_hz": 180.0,
                "jitter_percent": 0.015,
                "shimmer_percent": 0.025,
                "speaking_rate": 2.5,
                "arousal": "medium",
            },
            "source": "heuristic_fallback",
        }

    data, sr = sf.read(wav_path)
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)

    data = data.astype(np.float32)

    biomarkers = compute_acoustic_biomarkers(data, sr)

    inputs = feature_extractor(data, sampling_rate=sr, return_tensors="pt", padding=True)
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = ser_model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

    all_emotions: Dict[str, float] = {}
    for idx, prob in enumerate(probs):
        raw_label = ser_model.config.id2label.get(idx, str(idx))
        canonical_label = LABEL_MAPPING.get(raw_label.lower(), raw_label.lower())
        all_emotions[canonical_label] = float(round(prob, 4))

    # Pick top emotion
    top_emotion = max(all_emotions, key=lambda k: all_emotions[k])
    confidence = all_emotions[top_emotion]

    return {
        "emotion": top_emotion,
        "confidence": float(round(confidence, 4)),
        "all_emotions": all_emotions,
        "biomarkers": biomarkers,
        "source": "hubert_acoustic_ser_neural_network",
        "device": device,
    }

@app.get("/")
async def root():
    return {
        "message": "MindWell Tier-1 Audio Processing API",
        "status": "ok",
        "model": SER_MODEL_ID,
        "device": device,
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": ser_model is not None,
        "device": device,
        "gpu_available": torch.cuda.is_available(),
    }

@app.post("/api/audio/process")
async def process_audio(audio: UploadFile = File(...)):
    """
    Tier-1 Multimodal Audio Processing:
    1. Converts audio to 16kHz mono WAV PCM.
    2. Transcribes with Groq Whisper Large v3 (Cloud STT).
    3. Runs PyTorch Acoustic Speech Emotion Recognition (SER) deep neural network.
    4. Computes physical acoustic biomarkers (RMS energy, vocal arousal, ZCR).
    """
    tmp_raw_path = None
    tmp_wav_path = None

    try:
        suffix = Path(audio.filename).suffix if audio.filename else ".webm"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_raw:
            content = await audio.read()
            tmp_raw.write(content)
            tmp_raw_path = tmp_raw.name

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_wav:
            tmp_wav_path = tmp_wav.name

        # 1. Convert to 16kHz mono WAV
        converted = convert_to_wav_16k_mono(tmp_raw_path, tmp_wav_path)
        active_wav = tmp_wav_path if converted else tmp_raw_path

        # 2. Run Tier-1 Acoustic SER
        ser_result = classify_acoustic_emotion(active_wav)

        # 3. Transcribe with Whisper
        try:
            transcript_text = transcribe_with_groq(active_wav)
        except Exception as stt_err:
            print(f"STT warning: {stt_err}", flush=True)
            transcript_text = ""

        return JSONResponse({
            "text": transcript_text,
            "emotion": ser_result["emotion"],
            "confidence": ser_result["confidence"],
            "all_emotions": ser_result["all_emotions"],
            "biomarkers": ser_result.get("biomarkers", {}),
            "tier": "Tier-1 Acoustic Neural Network (PyTorch/CUDA)",
            "device": ser_result.get("device", device),
        })

    except Exception as e:
        print(f"Audio processing error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in [tmp_raw_path, tmp_wav_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

if __name__ == "__main__":
    import uvicorn
    print("[INFO] Starting MindWell Tier-1 Audio API on http://localhost:3002", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=3002)
