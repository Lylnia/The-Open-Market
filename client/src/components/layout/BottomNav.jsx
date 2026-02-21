import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconHome, IconMarket, IconProfile } from '../../assets/icons';
import './BottomNav.css';

export default function BottomNav() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { to: '/', icon: IconHome, label: t('nav.home') },
        { to: '/market', icon: IconMarket, label: t('nav.market') },
        { to: '/profile', icon: IconProfile, label: t('nav.profile') },
    ];

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {tabs.map(({ to, icon: Icon, label }) => {
                    const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
                    return (
                        <div
                            key={to}
                            onClick={() => navigate(to)}
                            className={`nav-tab ${isActive ? 'active' : ''}`}
                            style={{ cursor: 'pointer' }}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
