import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('tom_token'));
    const [loading, setLoading] = useState(true);

    const login = useCallback(async (initData, referralCode) => {
        try {
            const res = await api.post('/auth/telegram', { initData, referralCode });
            setUser(res.data.user);
            setToken(res.data.token);
            localStorage.setItem('tom_token', res.data.token);
            return res.data;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }, []);

    const updateUser = useCallback((updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : null);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('tom_token');
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const tg = window.Telegram?.WebApp;
                if (tg?.initData) {
                    await login(tg.initData);
                }
            } catch (e) {
                console.error('Auth init failed:', e);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, [login]);

    // Sync auth state across tabs
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'tom_token') {
                if (!e.newValue) {
                    setUser(null);
                    setToken(null);
                }
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
