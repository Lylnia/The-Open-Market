import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('tom_theme');
        if (saved) return saved;
        const tg = window.Telegram?.WebApp;
        return tg?.colorScheme || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('tom_theme', theme);
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.setHeaderColor(theme === 'dark' ? '#000000' : '#FFFFFF');
            tg.setBackgroundColor(theme === 'dark' ? '#000000' : '#FFFFFF');
        }
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
