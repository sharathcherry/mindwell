import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import ChatPage from './pages/ChatPage';
import MoodTrackerPage from './pages/MoodTrackerPage';
import JournalPage from './pages/JournalPage';
import ExercisesPage from './pages/ExercisesPage';
import ReportsPage from './pages/ReportsPage';
import ProgressPage from './pages/ProgressPage';
import CrisisPage from './pages/CrisisPage';
import LoginPage from './pages/LoginPage';
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
                <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="/mood" element={<ProtectedRoute><MoodTrackerPage /></ProtectedRoute>} />
                <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
                <Route path="/exercises" element={<ProtectedRoute><ExercisesPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
                <Route path="/crisis" element={<CrisisPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

// ── App shell with auth ─────────────────────────────────────
function AppShell() {
    const location = useLocation();
    const { user, logout, isAuthenticated } = useAuth();

    // Already logged in and hits /login → redirect to home
    if (isAuthenticated && location.pathname === '/login') {
        return <Navigate to="/" replace />;
    }

    if (!isAuthenticated && location.pathname === '/login') {
        return <LoginPage />;
    }

    return (
        <div className="app">
            <Navbar user={user} onLogout={logout} />
            <main className="main-content">
                <AnimatedRoutes />
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/crisis" element={<CrisisPage />} />
                    <Route path="/*" element={<AppShell />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
