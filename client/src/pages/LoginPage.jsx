import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Brain, Shield, Smile, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { storage } from '../utils/storage.js';
import { hashPassword, verifyPassword } from '../services/auth.js';
import './LoginPage.css';

const FEATURES = [
    { icon: Brain,      text: 'AI-powered mental wellness companion' },
    { icon: Smile,      text: 'Mood tracking & guided exercises' },
    { icon: TrendingUp, text: 'Progress insights & trend reports' },
    { icon: Shield,     text: 'Private & Secure — End-to-End protected' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, signup } = useAuth();
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

        try {
            if (mode === 'signup') {
                try {
                    await signup({
                        email: form.email.trim(),
                        password: form.password,
                        name: form.name.trim(),
                    });
                } catch (serverErr) {
                    // If network fails (e.g. purely offline dev), provide local fallback
                    if (serverErr.message.includes('fetch') || serverErr.message.includes('Network')) {
                        const existing = storage.get(`mindwell_account_${form.email}`);
                        if (existing) {
                            throw new Error('An account with this email already exists. Please log in.');
                        }
                        const passwordRecord = await hashPassword(form.password);
                        storage.set(`mindwell_account_${form.email}`, {
                            name: form.name.trim(),
                            email: form.email,
                            ...passwordRecord,
                            createdAt: new Date().toISOString(),
                        });
                    } else {
                        throw serverErr;
                    }
                }
            } else {
                try {
                    await login(form.email.trim(), form.password);
                } catch (serverErr) {
                    // If server auth failed with 401/error, check if offline fallback applies
                    if (serverErr.message.includes('fetch') || serverErr.message.includes('Network')) {
                        const account = storage.get(`mindwell_account_${form.email}`);
                        if (!account) {
                            throw new Error('Invalid email or password.');
                        }
                        const isPasswordValid = await verifyPassword(form.password, account);
                        if (!isPasswordValid) {
                            throw new Error('Invalid email or password.');
                        }
                    } else {
                        throw serverErr;
                    }
                }
            }

            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
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
                        🔒 Enterprise-grade security with encrypted sessions and token rotation.
                    </p>
                </div>
            </div>
        </div>
    );
}
