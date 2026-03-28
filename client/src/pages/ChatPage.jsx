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
        };

        // Add user message
        setMessages(prev => [...prev, userMessage]);
        conversationStorage.addMessage(userMessage);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const userContext = userContextStorage.get();
            const response = await chatApi.sendMessage(
                userMessage.content,
                messages,
                userContext
            );

            const aiMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, aiMessage]);
            conversationStorage.addMessage(aiMessage);

            // Update user context if AI detected insights
            if (response.insights) {
                response.insights.forEach(insight => {
                    userContextStorage.addInsight(insight);
                });
            }

            // Update context with any detected concerns/strategies
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

    // Handle voice recording result
    const handleVoiceResult = (result) => {
        // Set the transcribed text as input
        setInput(result.text);

        // Store detected emotion
        setDetectedEmotion({
            emotion: result.emotion,
            confidence: result.confidence
        });

        // Auto-submit if we got meaningful text
        if (result.text && result.text.trim().length > 2) {
            // Use the voice result directly with emotion context
            sendMessageWithEmotion(result.text, result.emotion, result.confidence);
        }
    };

    // Send message with voice emotion context
    const sendMessageWithEmotion = async (text, emotion, confidence) => {
        const userMessage = {
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
            voiceEmotion: emotion,
            emotionConfidence: confidence
        };

        setMessages(prev => [...prev, userMessage]);
        conversationStorage.addMessage(userMessage);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const userContext = userContextStorage.get();
            // Add voice emotion to context
            userContext.detectedVoiceEmotion = emotion;
            userContext.emotionConfidence = confidence;

            const response = await chatApi.sendMessage(
                text,
                messages,
                userContext
            );

            const aiMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, aiMessage]);
            conversationStorage.addMessage(aiMessage);
            setDetectedEmotion(null);
        } catch (err) {
            setError('Unable to connect. Please check if all servers are running.');
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get emoji for detected emotion
    const getEmotionEmoji = (emotion) => {
        const emojis = {
            sadness: '😢',
            happiness: '😊',
            anger: '😠',
            neutral: '😐',
        };
        return emojis[emotion] || '🎭';
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
                        <span className={`emotion-badge ${detectedEmotion.emotion}`}>
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
