import io
import numbers
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient
from main import app, compute_acoustic_biomarkers

client = TestClient(app)

REQUIRED_BIOMARKERS = [
    "pitch_f0_hz",
    "jitter_percent",
    "shimmer_percent",
    "speaking_rate",
    "rms_energy",
    "zero_crossing_rate",
    "arousal",
]

def test_compute_acoustic_biomarkers_unit():
    print("[TEST] Testing compute_acoustic_biomarkers unit logic...", flush=True)
    sr = 16000

    # 1. Pure 220Hz tone
    t = np.linspace(0, 1.5, int(sr * 1.5), endpoint=False)
    tone = (0.4 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
    bm_tone = compute_acoustic_biomarkers(tone, sr)

    for field in REQUIRED_BIOMARKERS:
        assert field in bm_tone, f"Missing biomarker field: {field}"
        if field == "arousal":
            assert bm_tone[field] in ["high", "medium", "low"], f"Invalid arousal value: {bm_tone[field]}"
        else:
            assert isinstance(bm_tone[field], numbers.Number), f"Biomarker {field} must be numeric"

    # Verify pitch is close to 220 Hz
    assert 200.0 <= bm_tone["pitch_f0_hz"] <= 240.0, f"Pitch expected around 220Hz, got {bm_tone['pitch_f0_hz']}"
    assert bm_tone["rms_energy"] > 0.1, f"RMS energy expected > 0.1, got {bm_tone['rms_energy']}"
    assert bm_tone["zero_crossing_rate"] > 0.0, f"ZCR expected > 0, got {bm_tone['zero_crossing_rate']}"

    # 2. Silence (zeros)
    silence = np.zeros(int(sr * 1.0), dtype=np.float32)
    bm_silence = compute_acoustic_biomarkers(silence, sr)
    for field in REQUIRED_BIOMARKERS:
        assert field in bm_silence, f"Missing biomarker field in silence: {field}"
    assert bm_silence["rms_energy"] == 0.0
    assert bm_silence["pitch_f0_hz"] == 0.0
    assert bm_silence["arousal"] == "low"

    # 3. Empty input
    bm_empty = compute_acoustic_biomarkers(np.array([], dtype=np.float32), sr)
    for field in REQUIRED_BIOMARKERS:
        assert field in bm_empty, f"Missing biomarker field in empty array: {field}"

    print("[PASS] Biomarker unit calculations verified successfully!", flush=True)

def test_audio_process_api():
    print("[TEST] Testing /health endpoint...", flush=True)
    res = client.get("/health")
    print("[TEST] Health response:", res.status_code, res.json(), flush=True)
    assert res.status_code == 200
    assert res.json()["model_loaded"] is True

    print("[TEST] Testing /api/audio/process endpoint with synthetic audio...", flush=True)
    sr = 16000
    t = np.linspace(0, 1.5, int(sr * 1.5), endpoint=False)
    waveform = (0.4 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, waveform, sr, format="WAV")
    buf.seek(0)

    files = {"audio": ("test_recording.wav", buf, "audio/wav")}
    res = client.post("/api/audio/process", files=files)

    print("[TEST] Audio processing status:", res.status_code, flush=True)
    payload = res.json()
    print("[TEST] Audio processing payload:", payload, flush=True)

    assert res.status_code == 200
    assert "emotion" in payload
    assert "confidence" in payload
    assert "all_emotions" in payload
    assert "biomarkers" in payload
    assert isinstance(payload["confidence"], float)
    assert payload["confidence"] > 0.0

    biomarkers = payload["biomarkers"]
    for field in REQUIRED_BIOMARKERS:
        assert field in biomarkers, f"Biomarker field '{field}' missing from response"
        if field == "arousal":
            assert biomarkers[field] in ["high", "medium", "low"], f"Invalid arousal '{biomarkers[field]}'"
        else:
            assert isinstance(biomarkers[field], numbers.Number), f"Biomarker '{field}' is not numeric ({type(biomarkers[field])})"
            assert biomarkers[field] >= 0.0, f"Biomarker '{field}' cannot be negative ({biomarkers[field]})"

    print("[PASS] Tier-1 Acoustic SER Endpoint test PASSED successfully!", flush=True)

if __name__ == "__main__":
    test_compute_acoustic_biomarkers_unit()
    test_audio_process_api()

