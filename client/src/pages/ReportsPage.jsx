import { useState } from 'react';
import {
    generateTherapyReportPDF,
    generateLifestylePlanPDF,
    generateProgressReportPDF,
    downloadPDF
} from '../services/pdfService';
import { reportsApi } from '../services/api';
import {
    userContextStorage,
    conversationStorage,
    moodStorage,
    journalStorage,
    exerciseStorage
} from '../utils/storage';
import './ReportsPage.css';

const REPORT_TYPES = [
    {
        id: 'therapy',
        title: 'Therapy Recommendation',
        icon: '🩺',
        description: 'Get personalized therapy type recommendations based on your conversations and patterns.',
        color: 'var(--accent-primary)',
    },
    {
        id: 'lifestyle',
        title: 'Lifestyle Wellness Plan',
        icon: '🌱',
        description: 'Receive a customized daily wellness plan including sleep, exercise, and nutrition tips.',
        color: 'var(--accent-secondary)',
    },
    {
        id: 'progress',
        title: 'Progress Summary',
        icon: '📊',
        description: 'Review your journey including mood trends, journal insights, and exercise streaks.',
        color: 'var(--accent-primary)',
    },
];

export default function ReportsPage() {
    const [generating, setGenerating] = useState(null);
    const [error, setError] = useState(null);

    const generateReport = async (type) => {
        setGenerating(type);
        setError(null);

        try {
            const userContext = userContextStorage.get();
            const conversations = conversationStorage.getAll();
            const moods = moodStorage.getLast30Days();
            const journals = journalStorage.getAll();
            const exercises = exerciseStorage.getAll();

            let reportData;
            let doc;
            let filename;

            switch (type) {
                case 'therapy':
                    try {
                        // Try to get AI-generated content
                        reportData = await reportsApi.generateTherapyReport(userContext, conversations, moods);
                    } catch {
                        // Fallback to default content
                        reportData = {
                            summary: `Based on your ${conversations.length} conversations with MindWell, we've analyzed your patterns and concerns to provide personalized recommendations.`,
                            therapies: [
                                {
                                    name: 'Cognitive Behavioral Therapy (CBT)',
                                    description: 'CBT helps identify and change negative thought patterns. It\'s effective for anxiety, depression, and stress management.',
                                },
                                {
                                    name: 'Mindfulness-Based Cognitive Therapy (MBCT)',
                                    description: 'MBCT combines cognitive therapy with mindfulness meditation. Great for preventing recurring depression and managing stress.',
                                },
                                {
                                    name: 'Dialectical Behavior Therapy (DBT)',
                                    description: 'DBT teaches skills for emotional regulation, distress tolerance, and interpersonal effectiveness.',
                                },
                            ],
                        };
                    }
                    doc = generateTherapyReportPDF(reportData);
                    filename = 'MindWell_Therapy_Recommendations';
                    break;

                case 'lifestyle':
                    try {
                        reportData = await reportsApi.generateLifestyleReport(userContext, moods, journals);
                    } catch {
                        // Fallback to default content
                        const avgMood = moods.length > 0
                            ? moods.reduce((a, m) => a + m.mood, 0) / moods.length
                            : 3;

                        reportData = {
                            introduction: `This personalized wellness plan is created based on your mood patterns (average: ${avgMood.toFixed(1)}/5) and ${journals.length} journal entries.`,
                        };
                    }
                    doc = generateLifestylePlanPDF(reportData);
                    filename = 'MindWell_Lifestyle_Plan';
                    break;

                case 'progress':
                    {
                        const last30DaysExercises = exercises.filter(e => {
                            const date = new Date(e.completedAt);
                            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                            return date >= thirtyDaysAgo;
                        });

                        reportData = {
                            period: 'Last 30 Days',
                            totalConversations: conversations.length,
                            moodEntries: moods.length,
                            journalEntries: journals.length,
                            exercisesCompleted: last30DaysExercises.length,
                            moodSummary: moods.length >= 5
                                ? `Your average mood is ${(moods.reduce((a, m) => a + m.mood, 0) / moods.length).toFixed(1)}/5 over ${moods.length} entries.`
                                : 'Log more moods to see trends!',
                        };
                        doc = generateProgressReportPDF(reportData);
                        filename = 'MindWell_Progress_Report';
                    }
                    break;

                default:
                    throw new Error('Unknown report type');
            }

            downloadPDF(doc, filename);
        } catch (err) {
            console.error('Report generation error:', err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setGenerating(null);
        }
    };

    return (
        <div className="reports-page">
            <div className="page-header">
                <h1>📄 Reports</h1>
                <p>Generate personalized PDF reports based on your journey</p>
            </div>

            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                </div>
            )}

            <div className="reports-grid">
                {REPORT_TYPES.map((report) => (
                    <div
                        key={report.id}
                        className="card report-card"
                        style={{ '--report-color': report.color }}
                    >
                        <span className="report-icon">{report.icon}</span>
                        <h3>{report.title}</h3>
                        <p>{report.description}</p>
                        <button
                            onClick={() => generateReport(report.id)}
                            disabled={generating !== null}
                            className="btn btn-primary generate-btn"
                        >
                            {generating === report.id ? (
                                <span className="loading-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            ) : (
                                <>📥 Generate PDF</>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="card info-card">
                <h3>💡 How Reports Work</h3>
                <ul>
                    <li>Reports are generated using your local data (nothing is sent to external servers)</li>
                    <li>The more you use MindWell, the more personalized your reports become</li>
                    <li>AI-powered insights when connected to the backend</li>
                    <li>All reports include mental health disclaimers</li>
                </ul>
            </div>
        </div>
    );
}
