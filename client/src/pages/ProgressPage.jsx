import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { moodStorage, journalStorage, exerciseStorage, conversationStorage } from '../utils/storage.js';
import { moodsApi, journalsApi } from '../services/api.js';
import './ProgressPage.css';

function processMoodData(moods) {
    const grouped = {};
    moods.forEach(m => {
        const date = new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(m.mood);
    });

    return Object.entries(grouped).map(([date, values]) => ({
        date,
        mood: values.reduce((a, b) => a + b, 0) / values.length,
    })).slice(-14);
}

export default function ProgressPage() {
    const [moods, setMoods] = useState(() => moodStorage.getLast30Days());
    const [journals, setJournals] = useState(() => journalStorage.getAll());
    const [exercises, setExercises] = useState(() => exerciseStorage.getAll());
    const [conversations, setConversations] = useState(() => conversationStorage.getAll());

    useEffect(() => {
        let isMounted = true;

        Promise.allSettled([
            moodsApi.getAll({ limit: 30 }),
            journalsApi.getAll(),
        ]).then(([moodsResult, journalsResult]) => {
            if (!isMounted) return;
            if (moodsResult.status === 'fulfilled' && Array.isArray(moodsResult.value)) {
                setMoods(moodsResult.value);
            }
            if (journalsResult.status === 'fulfilled' && Array.isArray(journalsResult.value)) {
                setJournals(journalsResult.value);
            }
            setExercises(exerciseStorage.getAll());
            setConversations(conversationStorage.getAll());
        });

        return () => {
            isMounted = false;
        };
    }, []);

    const snapshot = useMemo(() => {
        const avgMood = moods.length > 0
            ? moods.reduce((a, m) => a + m.mood, 0) / moods.length
            : 0;

        return {
            moodData: processMoodData(moods),
            stats: {
                totalMoods: moods.length,
                totalJournals: journals.length,
                totalExercises: exercises.length,
                totalConversations: conversations.filter(c => c.role === 'user').length,
                exerciseStreak: exerciseStorage.getStreak(),
                avgMood: avgMood.toFixed(1),
            },
        };
    }, [moods, journals, exercises, conversations]);

    const { moodData, stats } = snapshot;

    const getMoodEmoji = (value) => {
        const num = Number(value);
        if (num >= 4.5) return '😄';
        if (num >= 3.5) return '🙂';
        if (num >= 2.5) return '😐';
        if (num >= 1.5) return '😔';
        return '😢';
    };

    return (
        <div className="progress-page">
            <div className="page-header">
                <h1>📈 Progress</h1>
                <p>Track your mental wellness journey</p>
            </div>

            <div className="stats-grid">
                <div className="card stat-card">
                    <span className="stat-emoji">🎭</span>
                    <span className="stat-value">{stats.totalMoods}</span>
                    <span className="stat-label">Mood Entries</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-emoji">📝</span>
                    <span className="stat-value">{stats.totalJournals}</span>
                    <span className="stat-label">Journal Entries</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-emoji">🧘</span>
                    <span className="stat-value">{stats.totalExercises}</span>
                    <span className="stat-label">Exercises Done</span>
                </div>
                <div className="card stat-card">
                    <span className="stat-emoji">💬</span>
                    <span className="stat-value">{stats.totalConversations}</span>
                    <span className="stat-label">Messages Sent</span>
                </div>
            </div>

            <div className="highlights-row">
                <div className="card highlight-card streak">
                    <span className="highlight-icon">🔥</span>
                    <div className="highlight-content">
                        <span className="highlight-value">{stats.exerciseStreak}</span>
                        <span className="highlight-label">Day Streak</span>
                    </div>
                </div>
                <div className="card highlight-card mood-avg">
                    <span className="highlight-icon">{getMoodEmoji(stats.avgMood)}</span>
                    <div className="highlight-content">
                        <span className="highlight-value">{stats.avgMood}/5</span>
                        <span className="highlight-label">Avg Mood</span>
                    </div>
                </div>
            </div>

            <div className="card chart-card">
                <h3>Mood Trends (Last 14 Days)</h3>
                {moodData.length > 0 ? (
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={moodData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                />
                                <YAxis
                                    domain={[1, 5]}
                                    stroke="var(--text-muted)"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    ticks={[1, 2, 3, 4, 5]}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="mood"
                                    stroke="url(#colorGradient)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 5 }}
                                    activeDot={{ r: 8, fill: 'var(--accent-secondary)' }}
                                />
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#22d3ee" />
                                    </linearGradient>
                                </defs>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="empty-chart">
                        <span>📊</span>
                        <p>Start logging moods to see your trends!</p>
                    </div>
                )}
            </div>

            <div className="card tips-card">
                <h3>💡 Insights</h3>
                <div className="tips-list">
                    {Number(stats.avgMood) >= 4 && (
                        <div className="tip success">
                            <span>✨</span>
                            <p>Your average mood is great! Keep up the positive momentum.</p>
                        </div>
                    )}
                    {stats.exerciseStreak >= 3 && (
                        <div className="tip success">
                            <span>🔥</span>
                            <p>Impressive {stats.exerciseStreak}-day exercise streak! Consistency is key.</p>
                        </div>
                    )}
                    {stats.totalJournals < 3 && (
                        <div className="tip suggestion">
                            <span>📝</span>
                            <p>Try journaling more often - it's great for processing emotions.</p>
                        </div>
                    )}
                    {stats.totalMoods < 7 && (
                        <div className="tip suggestion">
                            <span>🎭</span>
                            <p>Log your mood daily to better understand your patterns.</p>
                        </div>
                    )}
                    {stats.totalMoods === 0 && stats.totalJournals === 0 && (
                        <div className="tip suggestion">
                            <span>🌟</span>
                            <p>Start your wellness journey by logging a mood or writing in the journal!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
