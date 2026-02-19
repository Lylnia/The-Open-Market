import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { IconTrophy } from '../assets/icons';

export default function Leaderboard() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('balance');
    const { data, loading } = useApi('/leaderboard', { type: tab }, [tab]);

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('leaderboard.title')}</h1>

            <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab ${tab === 'balance' ? 'active' : ''}`} onClick={() => setTab('balance')}>{t('leaderboard.by_balance')}</button>
                <button className={`tab ${tab === 'nft' ? 'active' : ''}`} onClick={() => setTab('nft')}>{t('leaderboard.by_nfts')}</button>
            </div>

            {loading ? (
                <div className="flex-col gap-8">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}</div>
            ) : data?.leaderboard?.length > 0 ? (
                <div className="flex-col gap-4">
                    {data.leaderboard.map((entry, i) => (
                        <div key={i} className="card flex items-center gap-12" style={{ padding: '12px 14px' }}>
                            <span style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, flexShrink: 0,
                                background: i < 3 ? 'var(--accent)' : 'var(--bg-elevated)',
                                color: i < 3 ? 'var(--bg-primary)' : 'var(--text-secondary)',
                            }}>
                                {i + 1}
                            </span>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                {entry.photoUrl ? <img src={entry.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
                                        {(entry.firstName || entry.username || 'U')[0]}
                                    </div>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600, fontSize: 14 }}>{entry.firstName || entry.username}</p>
                                <p className="caption">@{entry.username || 'user'}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontWeight: 700, fontSize: 14 }}>
                                    {tab === 'balance' ? `${(entry.balance / 1e9).toFixed(2)} TON` : entry.nftCount}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <IconTrophy size={48} style={{ opacity: 0.3 }} />
                    <p style={{ marginTop: 12 }}>{t('common.loading')}</p>
                </div>
            )}
        </div>
    );
}
