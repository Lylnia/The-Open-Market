import { createContext, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const { i18n } = useTranslation();

    useEffect(() => {
        const saved = localStorage.getItem('tom_lang');
        if (saved) {
            i18n.changeLanguage(saved);
        } else {
            const tg = window.Telegram?.WebApp;
            const tgLang = tg?.initDataUnsafe?.user?.language_code;
            const lang = ['tr', 'ru'].includes(tgLang) ? tgLang : 'en';
            i18n.changeLanguage(lang);
        }
    }, [i18n]);

    const setLanguage = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('tom_lang', lang);
    };

    return (
        <LanguageContext.Provider value={{ language: i18n.language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
