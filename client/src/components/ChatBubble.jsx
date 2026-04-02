import './ChatBubble.css';

export default function ChatBubble({ message, isUser, timestamp }) {
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div className={`chat-bubble-wrapper ${isUser ? 'user' : 'ai'}`}>
            {!isUser && <span className="ai-avatar">🧠</span>}
            <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
                <div className="bubble-content">
                    <p>{message}</p>
                    {timestamp && <span className="bubble-time">{formattedTime}</span>}
                </div>
            </div>
            {isUser && <span className="user-avatar">You</span>}
        </div>
    );
}

