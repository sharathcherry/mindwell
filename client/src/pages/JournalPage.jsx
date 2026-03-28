import { useState, useEffect } from 'react';
import { journalStorage } from '../utils/storage';
import './JournalPage.css';

const PROMPTS = [
    "What are you grateful for today?",
    "What's been on your mind lately?",
    "Describe a challenge you faced and how you handled it.",
    "What made you smile today?",
    "What's one thing you'd like to improve about yourself?",
    "Write about a moment when you felt proud of yourself.",
    "What are your goals for this week?",
    "Describe how you're feeling right now in detail.",
];

export default function JournalPage() {
    const [entries, setEntries] = useState([]);
    const [isWriting, setIsWriting] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [randomPrompt, setRandomPrompt] = useState('');

    useEffect(() => {
        loadEntries();
        setRandomPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    }, []);

    const loadEntries = () => {
        setEntries(journalStorage.getAll());
    };

    const handleSave = () => {
        if (!title.trim() && !content.trim()) return;

        if (editingId) {
            journalStorage.update(editingId, { title, content });
        } else {
            journalStorage.add({ title, content });
        }

        setTitle('');
        setContent('');
        setIsWriting(false);
        setEditingId(null);
        loadEntries();
    };

    const handleEdit = (entry) => {
        setTitle(entry.title || '');
        setContent(entry.content || '');
        setEditingId(entry.id);
        setIsWriting(true);
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this entry?')) {
            journalStorage.delete(id);
            loadEntries();
        }
    };

    const handleNewPrompt = () => {
        setRandomPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    };

    const filteredEntries = searchQuery
        ? journalStorage.search(searchQuery)
        : entries;

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="journal-page">
            <div className="page-header">
                <h1>📝 Journal</h1>
                <p>Express your thoughts and feelings</p>
            </div>

            {!isWriting ? (
                <>
                    <div className="card prompt-card">
                        <div className="prompt-header">
                            <span className="prompt-icon">💭</span>
                            <span>Writing Prompt</span>
                        </div>
                        <p className="prompt-text">{randomPrompt}</p>
                        <div className="prompt-actions">
                            <button onClick={handleNewPrompt} className="btn btn-ghost">
                                🔄 New Prompt
                            </button>
                            <button
                                onClick={() => {
                                    setContent(randomPrompt + '\n\n');
                                    setIsWriting(true);
                                }}
                                className="btn btn-secondary"
                            >
                                Use This Prompt
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsWriting(true)}
                        className="btn btn-primary new-entry-btn"
                    >
                        ✍️ New Journal Entry
                    </button>

                    <div className="search-container">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Search entries..."
                            className="search-input"
                        />
                    </div>

                    <div className="entries-list">
                        {filteredEntries.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📖</span>
                                <p>No journal entries yet. Start writing to express yourself!</p>
                            </div>
                        ) : (
                            filteredEntries.map((entry) => (
                                <div key={entry.id} className="card entry-card">
                                    <div className="entry-header">
                                        <h3 className="entry-title">
                                            {entry.title || 'Untitled Entry'}
                                        </h3>
                                        <span className="entry-date">{formatDate(entry.createdAt)}</span>
                                    </div>
                                    <p className="entry-preview">
                                        {entry.content?.substring(0, 200)}
                                        {entry.content?.length > 200 && '...'}
                                    </p>
                                    <div className="entry-actions">
                                        <button
                                            onClick={() => handleEdit(entry)}
                                            className="btn btn-ghost"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            className="btn btn-ghost text-danger"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="writing-mode">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Entry title (optional)..."
                        className="title-input"
                    />
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your thoughts here..."
                        className="content-input"
                        autoFocus
                    />
                    <div className="writing-actions">
                        <button
                            onClick={() => {
                                setIsWriting(false);
                                setTitle('');
                                setContent('');
                                setEditingId(null);
                            }}
                            className="btn btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!title.trim() && !content.trim()}
                            className="btn btn-primary"
                        >
                            💾 Save Entry
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
