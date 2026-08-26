import './ChatBubble.css';

export default function ChatBubble({ message, isUser, timestamp, voiceEmotion, emotionConfidence, fusion }) {
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

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
        return emojis[emotion?.toLowerCase()] || '🎙️';
    };

    return (
        <div className={`chat-bubble-wrapper ${isUser ? 'user' : 'ai'}`}>
            {!isUser && <span className="ai-avatar">🧠</span>}
            <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
                <div className="bubble-content">
                    <p>
                        {message}
                        {!isUser && !message && <span className="streaming-pulse">...</span>}
                    </p>
                    <div className="bubble-meta">
                        {!isUser && fusion?.isMaskedDistress && (
                            <span className="fusion-tag masked-distress" title="Tier-2 Multimodal Fusion detected vocal strain">
                                💜 Tone-attuned response
                            </span>
                        )}
                        {timestamp && <span className="bubble-time">{formattedTime}</span>}
                    </div>
                </div>
            </div>
            {isUser && <span className="user-avatar">You</span>}
        </div>
    );
}
