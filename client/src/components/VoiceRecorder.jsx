import { useState, useRef } from 'react';
import './VoiceRecorder.css';

const AUDIO_API_URL = import.meta.env.VITE_AUDIO_API_URL || '/api/audio/process';

export default function VoiceRecorder({ onResult, disabled }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const dragCounterRef = useRef(0);
    const [dragActive, setDragActive] = useState(false);

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
            formData.append('audio', audioBlob, audioBlob.name || 'recording.webm');

            const response = await fetch(AUDIO_API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let fallback = 'Audio processing failed';
                try {
                    const payload = await response.json();
                    fallback = payload?.detail || payload?.error || fallback;
                } catch {
                    // Keep fallback message.
                }
                throw new Error(fallback);
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

    const handleFileUpload = async (file) => {
        if (!file || disabled || isProcessing) return;
        setError(null);
        await processAudio(file);
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        await handleFileUpload(file);
        event.target.value = '';
    };

    const openFilePicker = () => {
        if (disabled || isProcessing) return;
        fileInputRef.current?.click();
    };

    const handleDragEnter = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragCounterRef.current += 1;
        setDragActive(true);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
            dragCounterRef.current = 0;
            setDragActive(false);
        }
    };

    const handleDrop = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragActive(false);
        dragCounterRef.current = 0;
        const file = event.dataTransfer?.files?.[0];
        await handleFileUpload(file);
    };

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div
            className={`voice-recorder${dragActive ? ' drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="voice-controls">
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
                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={disabled || isProcessing}
                    className="voice-upload-btn"
                    title="Upload a voice note from your files"
                >
                    <span className="plus-icon" aria-hidden="true">+</span>
                </button>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={disabled}
            />
            <div className="drop-hint">
                {dragActive ? 'Release to upload your audio note' : 'Drop an audio file or tap + to add a voice note'}
            </div>

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
