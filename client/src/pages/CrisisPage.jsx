import { NavLink } from 'react-router-dom';
import './CrisisPage.css';

const HOTLINES = [
    {
        country: '🇺🇸 United States',
        lines: [
            { name: 'National Suicide Prevention Lifeline', number: '988', available: '24/7' },
            { name: 'Crisis Text Line', number: 'Text HOME to 741741', available: '24/7' },
            { name: 'SAMHSA National Helpline', number: '1-800-662-4357', available: '24/7' },
        ],
    },
    {
        country: '🇬🇧 United Kingdom',
        lines: [
            { name: 'Samaritans', number: '116 123', available: '24/7' },
            { name: 'SHOUT', number: 'Text SHOUT to 85258', available: '24/7' },
        ],
    },
    {
        country: '🇮🇳 India',
        lines: [
            { name: 'iCall', number: '9152987821', available: 'Mon-Sat, 8am-10pm' },
            { name: 'Vandrevala Foundation', number: '1860-2662-345', available: '24/7' },
            { name: 'AASRA', number: '91-22-27546669', available: '24/7' },
        ],
    },
    {
        country: '🇨🇦 Canada',
        lines: [
            { name: 'Crisis Services Canada', number: '1-833-456-4566', available: '24/7' },
            { name: 'Kids Help Phone', number: '1-800-668-6868', available: '24/7' },
        ],
    },
    {
        country: '🇦🇺 Australia',
        lines: [
            { name: 'Lifeline', number: '13 11 14', available: '24/7' },
            { name: 'Beyond Blue', number: '1300 22 4636', available: '24/7' },
        ],
    },
];

const QUICK_TECHNIQUES = [
    {
        name: 'Ground Yourself',
        icon: '🌿',
        steps: ['Take a deep breath', 'Name 5 things you can see', 'Focus on your feet on the ground'],
    },
    {
        name: 'Breathe',
        icon: '🌬️',
        steps: ['Breathe in for 4 seconds', 'Hold for 4 seconds', 'Breathe out for 4 seconds'],
    },
    {
        name: 'Cold Water',
        icon: '💧',
        steps: ['Splash cold water on your face', 'Hold ice cubes in your hands', 'This activates your calming response'],
    },
];

export default function CrisisPage() {
    return (
        <div className="crisis-page">
            <div className="crisis-header">
                <span className="crisis-icon">🆘</span>
                <h1>Crisis Support</h1>
                <p>You are not alone. Help is available.</p>
            </div>

            <div className="card emergency-card">
                <h2>⚠️ In Immediate Danger?</h2>
                <p>If you or someone else is in immediate danger, please call emergency services:</p>
                <div className="emergency-numbers">
                    <span>🇺🇸 911</span>
                    <span>🇬🇧 999</span>
                    <span>🇮🇳 112</span>
                    <span>🇪🇺 112</span>
                </div>
            </div>

            <div className="card techniques-card">
                <h2>🧘 Quick Calming Techniques</h2>
                <div className="techniques-grid">
                    {QUICK_TECHNIQUES.map((technique) => (
                        <div key={technique.name} className="technique">
                            <span className="technique-icon">{technique.icon}</span>
                            <h3>{technique.name}</h3>
                            <ol>
                                {technique.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
                <NavLink to="/exercises" className="btn btn-secondary exercises-link">
                    🧘 Go to Full Exercises
                </NavLink>
            </div>

            <div className="card hotlines-card">
                <h2>📞 Crisis Hotlines</h2>
                <p className="hotlines-intro">
                    Free, confidential support is available. You don't have to face this alone.
                </p>

                <div className="hotlines-list">
                    {HOTLINES.map((country) => (
                        <div key={country.country} className="country-section">
                            <h3>{country.country}</h3>
                            <div className="hotline-items">
                                {country.lines.map((line) => (
                                    <div key={line.name} className="hotline-item">
                                        <span className="hotline-name">{line.name}</span>
                                        <span className="hotline-number">{line.number}</span>
                                        <span className="hotline-hours">{line.available}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card reminder-card">
                <span className="reminder-icon">💜</span>
                <h2>Remember</h2>
                <ul>
                    <li>This moment will pass</li>
                    <li>Your feelings are valid</li>
                    <li>Asking for help is a sign of strength</li>
                    <li>You matter and your life has value</li>
                </ul>
            </div>
        </div>
    );
}
