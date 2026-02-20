import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconHome, IconMarket, IconProfile } from '../../assets/icons';
import './BottomNav.css';

export default function BottomNav() {
    const { t } = useTranslation();

    const tabs = [
        { to: '/', icon: IconHome, label: t('nav.home') },
        { to: '/market', icon: IconMarket, label: t('nav.market') },
        { to: '/profile', icon: IconProfile, label: t('nav.profile') },
    ];

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-inner">
                {tabs.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={20} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
