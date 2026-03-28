import { useState, useRef } from 'react';
import './VoiceRecorder.css';

const AUDIO_API_URL = 'http://localhost:3002/api/audio/process';

export default function VoiceRecorder({ onResult, disabled }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await processAudio(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Recording error:', err);
            setError('Microphone access denied. Please allow microphone access.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async (audioBlob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(AUDIO_API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Audio processing failed');
            }

            const result = await response.json();
            onResult(result);
        } catch (err) {
            console.error('Audio processing error:', err);
            setError('Could not process audio. Make sure the audio server is running.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div className="voice-recorder">
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || isProcessing}
                className={`voice-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
                {isProcessing ? (
                    <span className="processing-icon">⏳</span>
                ) : isRecording ? (
                    <span className="recording-icon">⏹️</span>
                ) : (
                    <span className="mic-icon">🎤</span>
                )}
            </button>

            {isRecording && (
                <span className="recording-indicator">
                    <span className="pulse-dot"></span>
                    Recording...
                </span>
            )}

            {error && (
                <span className="voice-error" title={error}>⚠️</span>
            )}
        </div>
    );
}
