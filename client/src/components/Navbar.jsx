import { NavLink, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const navItems = [
    { path: '/', label: 'Chat', icon: '💬' },
    { path: '/mood', label: 'Mood', icon: '🎭' },
    { path: '/journal', label: 'Journal', icon: '📝' },
    { path: '/exercises', label: 'Exercises', icon: '🧘' },
    { path: '/reports', label: 'Reports', icon: '📄' },
    { path: '/progress', label: 'Progress', icon: '📈' },
];

export default function Navbar() {
    const location = useLocation();

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">🧠 MindWell</h1>
                    <p className="tagline">Your Wellness Companion</p>
                </div>

                <ul className="nav-list">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''}`
                                }
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="sidebar-footer">
                    <ThemeToggle />
                    <NavLink to="/crisis" className="crisis-btn">
                        🆘 Crisis Help
                    </NavLink>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="mobile-nav">
                {navItems.slice(0, 5).map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `mobile-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="mobile-nav-icon">{item.icon}</span>
                        <span className="mobile-nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
