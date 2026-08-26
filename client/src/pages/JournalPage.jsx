import { useState, useEffect, useCallback } from 'react';
import { journalStorage } from '../utils/storage.js';
import { journalsApi } from '../services/api.js';
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
    const [entries, setEntries] = useState(() => journalStorage.getAll());
    const [isWriting, setIsWriting] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [randomPrompt, setRandomPrompt] = useState(
        () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
    );

    const refreshServerEntries = useCallback(async (query = '') => {
        try {
            const serverJournals = await journalsApi.getAll(query);
            if (Array.isArray(serverJournals)) {
                setEntries(serverJournals);
            }
        } catch {
            if (query) {
                setEntries(journalStorage.search(query));
            } else {
                setEntries(journalStorage.getAll());
            }
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        journalsApi.getAll(searchQuery)
            .then(serverJournals => {
                if (isMounted && Array.isArray(serverJournals)) {
                    setEntries(serverJournals);
                }
            })
            .catch(() => {
                // Keep local state
            });

        return () => {
            isMounted = false;
        };
    }, [searchQuery]);

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;

        const effectiveTitle = title.trim() || 'Untitled Entry';
        const effectiveContent = content.trim();

        if (editingId) {
            // Optimistic update
            journalStorage.update(editingId, { title: effectiveTitle, content: effectiveContent });
            setEntries(prev => prev.map(e => e.id === editingId ? { ...e, title: effectiveTitle, content: effectiveContent, updatedAt: new Date().toISOString() } : e));
            try {
                await journalsApi.update(editingId, { title: effectiveTitle, content: effectiveContent });
            } catch (err) {
                console.warn('Failed to update journal on server, kept locally:', err);
            }
        } else {
            // New entry optimistic update
            const newEntry = {
                id: String(Date.now()),
                title: effectiveTitle,
                content: effectiveContent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            journalStorage.add(newEntry);
            setEntries(prev => [newEntry, ...prev]);

            try {
                await journalsApi.add({ title: effectiveTitle, content: effectiveContent });
                await refreshServerEntries(searchQuery);
            } catch (err) {
                console.warn('Failed to save journal to server, kept locally:', err);
            }
        }

        setTitle('');
        setContent('');
        setIsWriting(false);
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setTitle(entry.title || '');
        setContent(entry.content || '');
        setEditingId(entry.id);
        setIsWriting(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this entry?')) {
            // Optimistic delete
            journalStorage.delete(id);
            setEntries(prev => prev.filter(e => e.id !== id));

            try {
                await journalsApi.delete(id);
            } catch (err) {
                console.warn('Failed to delete journal on server:', err);
            }
        }
    };

    const handleNewPrompt = () => {
        setRandomPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    };

    const filteredEntries = searchQuery
        ? entries.filter(j =>
            j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            j.content?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : entries;

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
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
