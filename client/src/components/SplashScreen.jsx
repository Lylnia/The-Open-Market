import { useState, useEffect } from 'react';
import logo from '../assets/logo.jpg';

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
            <div className="splash-logo" style={{ overflow: 'hidden', padding: 0 }}>
                <img src={logo} alt="The Open Market" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <p className="splash-title">The Open Market</p>
            <p className="splash-subtitle">NFT Marketplace</p>
        </div>
    );
}
