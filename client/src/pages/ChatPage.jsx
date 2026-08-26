import { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import VoiceRecorder from '../components/VoiceRecorder';
import { conversationStorage, userContextStorage } from '../utils/storage';
import { chatApi } from '../services/api';
import './ChatPage.css';

const WELCOME_MESSAGE = {
    role: 'assistant',
    content: "Hi there! 👋 I'm MindWell, your mental wellness companion. I'm here to listen, support, and help you navigate your thoughts and feelings. How are you doing today?",
    timestamp: new Date().toISOString(),
};

function getRuntimeRegionContext() {
    let locale = 'en-US';
    let timezone = 'UTC';

    try {
        if (typeof navigator !== 'undefined' && navigator.language) {
            locale = navigator.language;
        }
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        // Keep defaults when browser APIs are unavailable.
    }

    const localeCountry = locale.includes('-') ? locale.split('-').pop() : '';
    const countryCode = typeof localeCountry === 'string' ? localeCountry.toUpperCase() : '';

    return { locale, timezone, countryCode };
}

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detectedEmotion, setDetectedEmotion] = useState(null);
    const messagesEndRef = useRef(null);

    // Load conversation history on mount
    useEffect(() => {
        const savedMessages = conversationStorage.getAll();
        if (savedMessages.length === 0) {
            setMessages([WELCOME_MESSAGE]);
            conversationStorage.addMessage(WELCOME_MESSAGE);
        } else {
            setMessages(savedMessages);
        }
        userContextStorage.incrementSession();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString(),
            voiceEmotion: detectedEmotion?.emotion,
            emotionConfidence: detectedEmotion?.confidence,
        };

        setMessages(prev => [...prev, userMessage]);
        conversationStorage.addMessage(userMessage);
        const currentEmotion = detectedEmotion;
        setInput('');
        setDetectedEmotion(null);
        setIsLoading(true);
        setError(null);

        try {
            const userContext = {
                ...userContextStorage.get(),
                ...getRuntimeRegionContext(),
                detectedVoiceEmotion: currentEmotion?.emotion,
                emotionConfidence: currentEmotion?.confidence,
                allAcousticEmotions: currentEmotion?.allEmotions,
                acousticBiomarkers: currentEmotion?.biomarkers,
            };
            const response = await chatApi.sendMessage(
                userMessage.content,
                messages,
                userContext
            );

            const aiMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date().toISOString(),
                fusion: response.fusion,
            };

            setMessages(prev => [...prev, aiMessage]);
            conversationStorage.addMessage(aiMessage);

            if (response.insights) {
                response.insights.forEach(insight => {
                    userContextStorage.addInsight(insight);
                });
            }

            if (response.contextUpdates) {
                userContextStorage.update(response.contextUpdates);
            }
        } catch (err) {
            setError('Unable to connect to the server. Please make sure the backend is running.');
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle voice recording result from Tier-1 Acoustic SER
    const handleVoiceResult = (result) => {
        setInput(result.text || '');

        const emotionInfo = {
            emotion: result.emotion,
            confidence: result.confidence,
            allEmotions: result.all_emotions,
            biomarkers: result.biomarkers,
            tier: result.tier,
        };

        setDetectedEmotion(emotionInfo);

        // Auto-submit if meaningful text was transcribed
        if (result.text && result.text.trim().length > 2) {
            sendMessageWithEmotion(
                result.text.trim(),
                result.emotion,
                result.confidence,
                result.all_emotions,
                result.biomarkers
            );
        }
    };

    // Send message with Tier-1 acoustic emotion telemetry for Tier-2 multimodal fusion
    const sendMessageWithEmotion = async (text, emotion, confidence, allEmotions, biomarkers) => {
        const userMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
            voiceEmotion: emotion,
            emotionConfidence: confidence,
            acousticTelemetry: {
                allEmotions,
                biomarkers,
            },
        };

        setMessages(prev => [...prev, userMessage]);
        conversationStorage.addMessage(userMessage);
        setInput('');
        setDetectedEmotion(null);
        setIsLoading(true);
        setError(null);

        try {
            const userContext = {
                ...userContextStorage.get(),
                ...getRuntimeRegionContext(),
                detectedVoiceEmotion: emotion,
                emotionConfidence: confidence,
                allAcousticEmotions: allEmotions,
                acousticBiomarkers: biomarkers,
            };

            const response = await chatApi.sendMessage(
                text,
                messages,
                userContext
            );

            const aiMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date().toISOString(),
                fusion: response.fusion,
            };

            setMessages(prev => [...prev, aiMessage]);
            conversationStorage.addMessage(aiMessage);
            setDetectedEmotion(null);

            if (response.insights) {
                response.insights.forEach(insight => {
                    userContextStorage.addInsight(insight);
                });
            }

            if (response.contextUpdates) {
                userContextStorage.update(response.contextUpdates);
            }
        } catch (err) {
            setError('Unable to connect. Please check if all servers are running.');
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getEmotionEmoji = (emotion) => {
        const emojis = {
            sadness: '😢',
            sad: '😢',
            happiness: '😊',
            happy: '😊',
            anger: '😠',
            angry: '😠',
            fear: '😨',
            neutral: '😐',
        };
        return emojis[emotion?.toLowerCase()] || '🎭';
    };

    const handleClearChat = () => {
        if (window.confirm('Are you sure you want to clear the conversation? This cannot be undone.')) {
            conversationStorage.clear();
            const freshWelcome = {
                role: 'assistant',
                content: "Hi there! 👋 I'm MindWell, your mental wellness companion. I'm here to listen, support, and help you navigate your thoughts and feelings. How are you doing today?",
                timestamp: new Date().toISOString(),
            };
            setMessages([freshWelcome]);
            conversationStorage.addMessage(freshWelcome);
            setDetectedEmotion(null);
        }
    };

    return (
        <div className="chat-page">
            <div className="chat-header">
                <h1>💬 Chat with MindWell</h1>
                <button type="button" onClick={handleClearChat} className="btn btn-ghost clear-btn">
                    Clear Chat
                </button>
            </div>

            <div className="chat-container">
                <div className="messages-container">
                    {messages.map((msg, index) => (
                        <ChatBubble
                            key={index}
                            message={msg.content}
                            isUser={msg.role === 'user'}
                            timestamp={msg.timestamp}
                            voiceEmotion={msg.voiceEmotion}
                            emotionConfidence={msg.emotionConfidence}
                            fusion={msg.fusion}
                        />
                    ))}

                    {isLoading && (
                        <div className="typing-indicator">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <p>⚠️ {error}</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="chat-input-form">
                    <VoiceRecorder
                        onResult={handleVoiceResult}
                        disabled={isLoading}
                    />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Share what's on your mind, or use the mic..."
                        disabled={isLoading}
                        className="chat-input"
                    />
                    {detectedEmotion && (
                        <span
                            className={`emotion-badge ${detectedEmotion.emotion}`}
                            title={`Tier-1 Acoustic Model (${detectedEmotion.tier || 'Neural Network'})`}
                        >
                            {getEmotionEmoji(detectedEmotion.emotion)} {detectedEmotion.emotion}
                            <span className="confidence">({Math.round(detectedEmotion.confidence * 100)}%)</span>
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="btn btn-primary send-btn"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </form>
            </div>

            <p className="disclaimer">
                💡 MindWell is an AI companion, not a replacement for professional mental health care.
            </p>
        </div>
    );
}
