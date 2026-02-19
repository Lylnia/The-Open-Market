import { useState, useEffect } from 'react';

export default function SplashScreen({ loading }) {
    const [visible, setVisible] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (!loading) {
            // Minimum 1s splash display
            const timer = setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => setVisible(false), 500);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (!visible) return null;

    return (
        <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="splash-logo">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
            </div>
            <p className="splash-title">The Open Market</p>
            <p className="splash-subtitle">NFT Marketplace</p>
        </div>
    );
}
