import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getUser,
    getToken,
    clearToken,
    login as authLogin,
    signup as authSignup,
    logout as authLogout,
    getMe,
    refresh as authRefresh,
} from '../services/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getUser());
    const [accessToken, setAccessToken] = useState(() => getToken());
    const [loading, setLoading] = useState(true);

    const restoreSession = useCallback(async () => {
        try {
            // First check if an existing access token or user exists
            const existingUser = getUser();
            const existingToken = getToken();

            if (existingToken) {
                try {
                    const profile = await getMe();
                    setUser(profile);
                    setAccessToken(existingToken);
                    setLoading(false);
                    return;
                } catch {
                    // Access token might be expired, try silent refresh
                }
            }

            // Attempt silent session refresh via httpOnly cookie
            try {
                const refreshed = await authRefresh();
                if (refreshed?.user) {
                    setUser(refreshed.user);
                    setAccessToken(refreshed.accessToken);
                } else if (existingUser) {
                    setUser(existingUser);
                }
            } catch {
                if (existingUser) {
                    setUser(existingUser);
                } else {
                    setUser(null);
                    setAccessToken(null);
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        restoreSession().then(() => {
            if (!isMounted) return;
        });
        return () => {
            isMounted = false;
        };
    }, [restoreSession]);

    const login = async (email, password) => {
        setLoading(true);
        try {
            const data = await authLogin(email, password);
            setUser(data.user);
            setAccessToken(data.accessToken);
            return data;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (userData) => {
        setLoading(true);
        try {
            const data = await authSignup(userData);
            setUser(data.user);
            setAccessToken(data.accessToken);
            return data;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authLogout();
        } finally {
            setUser(null);
            setAccessToken(null);
            clearToken();
            setLoading(false);
        }
    };

    const value = {
        user,
        accessToken,
        loading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        checkAuth: restoreSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
