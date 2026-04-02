import { NavLink, useNavigate } from 'react-router-dom';
import { MessageCircle, Drama, BookOpen, Wind, FileText, TrendingUp, AlertTriangle, LogOut } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const navItems = [
    { path: '/',          label: 'Chat',      Icon: MessageCircle },
    { path: '/mood',      label: 'Mood',      Icon: Drama },
    { path: '/journal',   label: 'Journal',   Icon: BookOpen },
    { path: '/exercises', label: 'Exercises', Icon: Wind },
    { path: '/reports',   label: 'Reports',   Icon: FileText },
    { path: '/progress',  label: 'Progress',  Icon: TrendingUp },
];

export default function Navbar({ user, onLogout }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout?.();
        navigate('/login', { replace: true });
    };

    // User initials for avatar
    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">
                        <span className="logo-icon">🧠</span> MindWell
                    </h1>
                    <p className="tagline">Your Wellness Companion</p>
                </div>

                <ul className="nav-list">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <item.Icon size={20} className="nav-icon" strokeWidth={1.75} />
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="sidebar-footer">
                    <ThemeToggle />
                    <NavLink to="/crisis" className="crisis-btn">
                        <AlertTriangle size={16} strokeWidth={2} />
                        Crisis Help
                    </NavLink>

                    {/* User profile + logout */}
                    {user && (
                        <div className="sidebar-user">
                            <div className="user-info">
                                <span className="user-avatar-sidebar">{initials}</span>
                            <div className="user-details">
                                    <span className="user-name" title={user.name}>{user.name}</span>
                                    <span className="user-email" title={user.email}>{user.email}</span>
                                </div>
                            </div>
                            <button
                                className="logout-btn"
                                onClick={handleLogout}
                                title="Sign out"
                            >
                                <LogOut size={16} strokeWidth={1.75} />
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="mobile-nav">
                {navItems.slice(0, 5).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `mobile-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.Icon size={20} className="mobile-nav-icon" strokeWidth={1.75} />
                        <span className="mobile-nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
