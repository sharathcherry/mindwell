import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import MoodTrackerPage from './pages/MoodTrackerPage';
import JournalPage from './pages/JournalPage';
import ExercisesPage from './pages/ExercisesPage';
import ReportsPage from './pages/ReportsPage';
import ProgressPage from './pages/ProgressPage';
import CrisisPage from './pages/CrisisPage';
import LoginPage from './pages/LoginPage';
import { getUser, logout } from './services/auth.js';
import './styles/index.css';

// ── CSS page transition ────────────────────────────────────
function AnimatedRoutes() {
    const location = useLocation();

    return (
        <div
            key={location.pathname}
            className="page-transition fadeIn"
            style={{ height: '100%' }}
        >
            <Routes location={location}>
                <Route path="/"          element={<ChatPage />} />
                <Route path="/mood"      element={<MoodTrackerPage />} />
                <Route path="/journal"   element={<JournalPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/reports"   element={<ReportsPage />} />
                <Route path="/progress"  element={<ProgressPage />} />
                <Route path="/crisis"    element={<CrisisPage />} />
                <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

// ── App shell with auth ─────────────────────────────────────
function AppShell() {
    const location = useLocation();
    const user = getUser();

    const handleLogout = () => {
        logout();
    };

    // Unauthenticated → send to /login
    if (!user) {
        if (location.pathname !== '/login') {
            return <Navigate to="/login" replace />;
        }
        return <LoginPage />;
    }

    // Already logged in and hits /login → redirect to home
    if (location.pathname === '/login') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="app">
            <Navbar user={user} onLogout={handleLogout} />
            <main className="main-content">
                <AnimatedRoutes />
            </main>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*"    element={<AppShell />} />
            </Routes>
        </Router>
    );
}
