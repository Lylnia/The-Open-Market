import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApi } from '../hooks/useApi';
import { IconWallet, IconHeart, IconHistory, IconTrophy, IconSettings, IconShield, IconChevronRight, IconCopy, IconLink, IconGrid } from '../assets/icons';
import { useState } from 'react';

export default function Profile() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const { data: nfts } = useApi('/user/nfts');
    const [copied, setCopied] = useState(false);

    const copyReferral = () => {
        navigator.clipboard?.writeText(user?.referralCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const menuItems = [
        { to: '/wallet', icon: IconWallet, label: t('profile.wallet'), value: user ? `${(user.balance / 1e9).toFixed(2)} TON` : '' },
        { to: '/favorites', icon: IconHeart, label: t('profile.favorites') },
        { to: '/transactions', icon: IconHistory, label: t('profile.transactions') },
        { to: '/leaderboard', icon: IconTrophy, label: t('profile.leaderboard') },
    ];

    const languages = [
        { code: 'tr', name: 'Türkçe' },
        { code: 'en', name: 'English' },
        { code: 'ru', name: 'Русский' },
    ];

    return (
        <div className="page">
            {/* User info */}
            <div className="flex items-center gap-16" style={{ marginBottom: 24 }}>
                <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-elevated)',
                    overflow: 'hidden', flexShrink: 0, border: '2px solid var(--border)',
                }}>
                    {user?.photoUrl ? <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                            {(user?.firstName || 'U')[0]}
                        </div>
                    }
                </div>
                <div>
                    <h2 className="h2">{user?.firstName} {user?.lastName}</h2>
                    {user?.username && <p className="caption">@{user.username}</p>}
                </div>
            </div>

            {/* Referral */}
            {user?.referralCode && (
                <div className="card flex items-center justify-between" style={{ marginBottom: 16, padding: '12px 16px' }}>
                    <div className="flex items-center gap-8">
                        <IconLink size={16} style={{ color: 'var(--text-muted)' }} />
                        <div>
                            <p className="caption" style={{ fontSize: 10 }}>{t('profile.referral')}</p>
                            <p style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>{user.referralCode}</p>
                        </div>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={copyReferral} style={{ gap: 4 }}>
                        <IconCopy size={14} />
                        {copied ? t('profile.copied') : t('profile.copy')}
                    </button>
                </div>
            )}

            {/* Menu */}
            <div className="flex-col gap-4" style={{ marginBottom: 24 }}>
                {menuItems.map(({ to, icon: Icon, label, value }) => (
                    <Link key={to} to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card flex items-center gap-12" style={{ padding: '14px 16px' }}>
                            <Icon size={20} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
                            {value && <span className="caption" style={{ fontWeight: 600 }}>{value}</span>}
                            <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </Link>
                ))}
            </div>

            {/* My NFTs */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">{t('profile.my_nfts')}</h2>
                    <span className="tag">{nfts?.length || 0}</span>
                </div>
                {nfts?.length > 0 ? (
                    <div className="grid-2">
                        {nfts.slice(0, 6).map(nft => (
                            <Link key={nft._id} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                        {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ padding: '8px 10px' }}>
                                        <p style={{ fontSize: 11, fontWeight: 600 }}>{nft.series?.name} #{nft.mintNumber}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                        <IconGrid size={32} style={{ opacity: 0.3 }} />
                        <p style={{ marginTop: 8, fontSize: 13 }}>{t('profile.no_nfts')}</p>
                    </div>
                )}
            </section>

            {/* Settings */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">{t('profile.settings')}</h2>
                </div>

                <div className="card" style={{ marginBottom: 8 }}>
                    <div className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                        <span style={{ fontSize: 14 }}>{t('profile.theme')}</span>
                        <button className="btn btn-sm btn-secondary" onClick={toggleTheme}>
                            {theme === 'dark' ? t('profile.light') : t('profile.dark')}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <p style={{ fontSize: 14, marginBottom: 8 }}>{t('profile.language')}</p>
                    <div className="flex gap-8">
                        {languages.map(({ code, name }) => (
                            <button key={code} className={`btn btn-sm ${language === code ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setLanguage(code)}>{name}</button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Admin link */}
            {user?.isAdmin && (
                <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card flex items-center gap-12" style={{ padding: '14px 16px' }}>
                        <IconShield size={20} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ flex: 1, fontWeight: 500 }}>{t('profile.admin')}</span>
                        <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                </Link>
            )}
        </div>
    );
}
