import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import { IconWallet, IconHeart, IconHistory, IconTrophy, IconShield, IconChevronRight, IconCopy, IconLink } from '../assets/icons';
import { useState } from 'react';

export default function Profile() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: nfts } = useApi('/user/nfts');
    const [copied, setCopied] = useState(false);

    const copyReferral = () => {
        navigator.clipboard?.writeText(user?.referralCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const menuItems = [
        { to: '/wallet', icon: IconWallet, label: 'Wallet', value: user ? `${(user.balance / 1e9).toFixed(2)} TON` : '' },
        { to: '/favorites', icon: IconHeart, label: 'Favorites' },
        { to: '/transactions', icon: IconHistory, label: 'Transactions' },
        { to: '/leaderboard', icon: IconTrophy, label: 'Leaderboard' },
    ];

    return (
        <div className="page" style={{ paddingTop: 20 }}>
            {/* Header / User info */}
            <div className="flex items-center gap-16" style={{ marginBottom: 32 }}>
                <div style={{
                    width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)',
                    overflow: 'hidden', flexShrink: 0
                }}>
                    {user?.photoUrl ? <img src={user.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, backgroundColor: 'var(--accent)', color: '#fff' }}>
                            {(user?.firstName || 'U')[0]}
                        </div>
                    }
                </div>
                <div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{user?.firstName || 'User'} {user?.lastName}</h2>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>@{user?.username || 'username'}</p>
                </div>
            </div>

            {/* General Settings Card (Telegram Grouped List Style) */}
            <div className="card" style={{ padding: 0, marginBottom: 24 }}>
                {/* Referral Code */}
                {user?.referralCode && (
                    <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-12">
                            <IconLink size={20} style={{ color: 'var(--text-secondary)' }} />
                            <div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Referral Code</p>
                                <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{user.referralCode}</p>
                            </div>
                        </div>
                        <button className="btn-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={copyReferral}>
                            <IconCopy size={12} />
                            {copied ? 'COPIED' : 'COPY'}
                        </button>
                    </div>
                )}

                {menuItems.map(({ to, icon: Icon, label, value }, index) => (
                    <Link key={to} to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="flex items-center gap-12" style={{
                            padding: '14px 16px',
                            borderBottom: index !== menuItems.length - 1 ? '1px solid var(--border)' : 'none'
                        }}>
                            <Icon size={22} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>{label}</span>
                            {value && <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>}
                            <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Admin link */}
            {user?.isAdmin && (
                <div className="card" style={{ padding: 0, marginBottom: 24 }}>
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="flex items-center gap-12" style={{ padding: '14px 16px' }}>
                            <IconShield size={22} style={{ color: 'var(--accent)' }} />
                            <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Admin Panel</span>
                            <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    </Link>
                </div>
            )}

            {/* My NFTs Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>My NFTs</h2>
                <div style={{ background: 'var(--bg-card)', padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600 }}>
                    {nfts?.length || 0}
                </div>
            </div>

            {/* My NFTs Grid */}
            {nfts?.length > 0 ? (
                <div className="grid-2">
                    {nfts.slice(0, 4).map(nft => (
                        <Link key={nft._id} to={`/nft/${nft._id}`} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ padding: 0, borderRadius: 16 }}>
                                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)' }}>
                                    {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                    <p style={{ fontSize: 15 }}>No NFTs yet.</p>
                </div>
            )}
        </div>
    );
}
