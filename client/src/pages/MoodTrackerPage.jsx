import { useState, useEffect, useCallback } from 'react';
import { moodStorage } from '../utils/storage.js';
import { moodsApi } from '../services/api.js';
import './MoodTrackerPage.css';

const MOODS = [
    { emoji: '😄', label: 'Great', value: 5, color: '#34d399' },
    { emoji: '🙂', label: 'Good', value: 4, color: '#22d3ee' },
    { emoji: '😐', label: 'Okay', value: 3, color: '#fbbf24' },
    { emoji: '😔', label: 'Low', value: 2, color: '#f472b6' },
    { emoji: '😢', label: 'Struggling', value: 1, color: '#f87171' },
];

function normalizeMoodItem(m) {
    const matched = MOODS.find(def => def.value === m.mood);
    return {
        id: m.id || String(Date.now()),
        mood: m.mood,
        emoji: m.emoji || matched?.emoji || '😐',
        label: m.tags || m.label || matched?.label || 'Okay',
        note: m.notes || m.note || '',
        timestamp: m.timestamp || new Date().toISOString(),
    };
}

export default function MoodTrackerPage() {
    const [selectedMood, setSelectedMood] = useState(null);
    const [note, setNote] = useState('');
    const [moodHistory, setMoodHistory] = useState(() => {
        const local = moodStorage.getLast30Days();
        return local.map(normalizeMoodItem).reverse();
    });
    const [showSuccess, setShowSuccess] = useState(false);

    const refreshServerMoods = useCallback(async () => {
        try {
            const serverMoods = await moodsApi.getAll({ limit: 30 });
            if (Array.isArray(serverMoods)) {
                setMoodHistory(serverMoods.map(normalizeMoodItem));
            }
        } catch {
            const local = moodStorage.getLast30Days();
            setMoodHistory(local.map(normalizeMoodItem).reverse());
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        moodsApi.getAll({ limit: 30 })
            .then(serverMoods => {
                if (isMounted && Array.isArray(serverMoods)) {
                    setMoodHistory(serverMoods.map(normalizeMoodItem));
                }
            })
            .catch(() => {
                // Keep local state
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const handleLogMood = async () => {
        if (!selectedMood) return;

        const newEntry = {
            mood: selectedMood.value,
            emoji: selectedMood.emoji,
            tags: selectedMood.label,
            label: selectedMood.label,
            notes: note.trim(),
            note: note.trim(),
            timestamp: new Date().toISOString(),
        };

        // Optimistic local update
        moodStorage.add(newEntry);
        setMoodHistory(prev => [normalizeMoodItem(newEntry), ...prev]);
        setShowSuccess(true);
        setSelectedMood(null);
        setNote('');
        setTimeout(() => setShowSuccess(false), 3000);

        try {
            await moodsApi.add(newEntry);
            await refreshServerMoods();
        } catch (err) {
            console.warn('Server sync for mood log failed, preserved locally:', err);
        }
    };

    const getTodaysMood = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return moodHistory.find(m => {
            const moodDate = new Date(m.timestamp);
            moodDate.setHours(0, 0, 0, 0);
            return moodDate.getTime() === today.getTime();
        });
    };

    const todaysMood = getTodaysMood();

    const getAverageMood = () => {
        if (moodHistory.length === 0) return null;
        const sum = moodHistory.reduce((acc, m) => acc + m.mood, 0);
        return (sum / moodHistory.length).toFixed(1);
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="mood-page">
            <div className="page-header">
                <h1>🎭 Mood Tracker</h1>
                <p>How are you feeling today?</p>
            </div>

            {showSuccess && (
                <div className="success-toast">
                    ✓ Mood logged successfully!
                </div>
            )}

            {todaysMood ? (
                <div className="card today-mood-card">
                    <h3>Today's Mood</h3>
                    <div className="today-mood">
                        <span className="today-emoji">{todaysMood.emoji}</span>
                        <span className="today-label">{todaysMood.label}</span>
                    </div>
                    {todaysMood.note && <p className="today-note">"{todaysMood.note}"</p>}
                </div>
            ) : (
                <div className="card mood-selector-card">
                    <h3>Log Your Mood</h3>

                    <div className="mood-options">
                        {MOODS.map((mood) => (
                            <button
                                key={mood.value}
                                className={`mood-option ${selectedMood?.value === mood.value ? 'selected' : ''}`}
                                onClick={() => setSelectedMood(mood)}
                                style={{ '--mood-color': mood.color }}
                            >
                                <span className="mood-emoji">{mood.emoji}</span>
                                <span className="mood-label">{mood.label}</span>
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add a note about how you're feeling (optional)..."
                        className="mood-note-input"
                    />

                    <button
                        onClick={handleLogMood}
                        disabled={!selectedMood}
                        className="btn btn-primary log-btn"
                    >
                        Log Mood
                    </button>
                </div>
            )}

            <div className="card stats-card">
                <h3>📊 Stats</h3>
                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-value">{moodHistory.length}</span>
                        <span className="stat-label">Entries (30 days)</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{getAverageMood() || '-'}</span>
                        <span className="stat-label">Average Mood</span>
                    </div>
                </div>
            </div>

            <div className="card history-card">
                <h3>📅 Recent History</h3>
                {moodHistory.length === 0 ? (
                    <p className="empty-message">No mood entries yet. Start tracking today!</p>
                ) : (
                    <div className="mood-history">
                        {moodHistory.slice(0, 7).map((entry) => (
                            <div key={entry.id} className="history-item">
                                <span className="history-emoji">{entry.emoji}</span>
                                <div className="history-details">
                                    <span className="history-label">{entry.label}</span>
                                    <span className="history-date">{formatDate(entry.timestamp)}</span>
                                </div>
                                {entry.note && (
                                    <span className="history-note" title={entry.note}>📝</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
