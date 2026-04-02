import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Brain, Shield, Smile, TrendingUp } from 'lucide-react';
import { storage } from '../utils/storage';
import { hashPassword, saveUser, verifyPassword } from '../services/auth';
import './LoginPage.css';

const FEATURES = [
    { icon: Brain,      text: 'AI-powered mental wellness companion' },
    { icon: Smile,      text: 'Mood tracking & guided exercises' },
    { icon: TrendingUp, text: 'Progress insights & trend reports' },
    { icon: Shield,     text: 'Private — all data stays on your device' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!form.email || !form.password) {
            setError('Please fill in all fields.');
            return;
        }
        if (mode === 'signup' && !form.name.trim()) {
            setError('Please enter your name.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);

        // Simulate a brief async "auth" (localStorage-based)
        await new Promise(r => setTimeout(r, 600));

        if (mode === 'signup') {
            // Check if account already exists
            const existing = storage.get(`mindwell_account_${form.email}`);
            if (existing) {
                setError('An account with this email already exists. Please log in.');
                setLoading(false);
                return;
            }

            const passwordRecord = await hashPassword(form.password);

            // Save account
            storage.set(`mindwell_account_${form.email}`, {
                name: form.name.trim(),
                email: form.email,
                ...passwordRecord,
                createdAt: new Date().toISOString(),
            });
            saveUser({
                name: form.name.trim(),
                email: form.email,
                loggedInAt: new Date().toISOString(),
            });
        } else {
            // Login flow
            const account = storage.get(`mindwell_account_${form.email}`);
            if (!account) {
                setError('Invalid email or password.');
                setLoading(false);
                return;
            }

            let isPasswordValid = false;
            if (account.passwordHash) {
                isPasswordValid = await verifyPassword(form.password, account);
            } else if (account.password) {
                // Legacy migration support from plaintext local account records.
                isPasswordValid = account.password === form.password;
                if (isPasswordValid) {
                    const passwordRecord = await hashPassword(form.password);
                    const migrated = {
                        ...account,
                        ...passwordRecord,
                    };
                    delete migrated.password;
                    storage.set(`mindwell_account_${form.email}`, migrated);
                }
            }

            if (!isPasswordValid) {
                setError('Invalid email or password.');
                setLoading(false);
                return;
            }

            saveUser({
                name: account.name,
                email: account.email,
                loggedInAt: new Date().toISOString(),
            });
        }

        setLoading(false);
        navigate('/', { replace: true });
    };

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        setError('');
        setForm({ name: '', email: '', password: '' });
    };

    return (
        <div className="login-page">
            {/* Left panel — branding */}
            <div className="login-brand">
                <div className="brand-content">
                    <div className="brand-logo">
                        <span className="brand-brain">🧠</span>
                        <h1>MindWell</h1>
                    </div>
                    <p className="brand-tagline">
                        Your personal AI companion for mental wellness.
                        Track, reflect, and grow — every day.
                    </p>

                    <ul className="feature-list">
                        {FEATURES.map((feature) => (
                            <li key={feature.text} className="feature-item">
                                <span className="feature-icon-wrap">
                                    <feature.icon size={16} strokeWidth={2} />
                                </span>
                                <span>{feature.text}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="brand-quote">
                        <p>"The mind is everything. What you think, you become."</p>
                        <span>— Buddha</span>
                    </div>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="login-form-panel">
                <div className="login-card">
                    <div className="login-card-header">
                        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
                        <p>{mode === 'login'
                            ? 'Sign in to continue your wellness journey'
                            : 'Start your mental wellness journey today'
                        }</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        {mode === 'signup' && (
                            <div className="field-group animate-slideIn">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Alex Johnson"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="auth-input"
                                />
                            </div>
                        )}

                        <div className="field-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="alex@example.com"
                                value={form.email}
                                onChange={handleChange}
                                className="auth-input"
                            />
                        </div>

                        <div className="field-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    placeholder="Min. 6 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="auth-input"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword
                                        ? <EyeOff size={18} strokeWidth={1.75} />
                                        : <Eye size={18} strokeWidth={1.75} />
                                    }
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-error" role="alert">
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading}
                        >
                            {loading
                                ? <span className="btn-loading"><span /><span /><span /></span>
                                : mode === 'login' ? 'Sign In' : 'Create Account'
                            }
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <p className="auth-switch">
                        {mode === 'login'
                            ? "Don't have an account? "
                            : 'Already have an account? '
                        }
                        <button type="button" className="switch-btn" onClick={toggleMode}>
                            {mode === 'login' ? 'Sign up free' : 'Sign in'}
                        </button>
                    </p>

                    <p className="auth-disclaimer">
                        🔒 Your data is stored locally on this device only.
                    </p>
                </div>
            </div>
        </div>
    );
}
