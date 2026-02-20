import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { IconPresale } from '../assets/icons';

function Countdown({ targetDate }) {
    const [time, setTime] = useState('');
    useEffect(() => {
        const update = () => {
            const diff = new Date(targetDate) - Date.now();
            if (diff <= 0) { setTime('00:00:00'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [targetDate]);
    return <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{time}</span>;
}

export default function PreSale() {
    const { t } = useTranslation();
    const { data, loading, refetch } = useApi('/presale');
    const [tab, setTab] = useState('active');
    const { user } = useAuth();
    const [buying, setBuying] = useState(null);
    const { showToast } = useToast();

    const handleBuy = async (presaleId) => {
        try {
            setBuying(presaleId);
            await api.post(`/presale/${presaleId}/buy`);
            refetch();
        } catch (e) {
            showToast(e?.error || 'Purchase failed', 'error');
        } finally {
            setBuying(null);
        }
    };

    const items = tab === 'active' ? data?.active : data?.upcoming;

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('presale.title')}</h1>

            <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>{t('presale.active')}</button>
                <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>{t('presale.upcoming')}</button>
            </div>

            {loading ? (
                <div className="flex-col gap-12">{[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div>
            ) : items?.length > 0 ? (
                <div className="flex-col gap-16">
                    {items.map(ps => {
                        const progress = ps.totalSupply > 0 ? (ps.soldCount / ps.totalSupply) * 100 : 0;
                        const soldOut = ps.soldCount >= ps.totalSupply;
                        return (
                            <div key={ps._id} className="card" style={{ padding: 20 }}>
                                <div className="flex items-center gap-12" style={{ marginBottom: 12 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
                                        {ps.series?.imageUrl && <img src={ps.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 600, fontSize: 16 }}>{ps.name}</h3>
                                        <p className="caption">{ps.series?.name} — {ps.series?.collection?.name}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between" style={{ marginBottom: 12 }}>
                                    <div>
                                        <p className="caption" style={{ fontSize: 11 }}>{t('nft.price')}</p>
                                        <p style={{ fontWeight: 700, fontSize: 18 }}>{(ps.price / 1e9).toFixed(2)} TON</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p className="caption" style={{ fontSize: 11 }}>{tab === 'active' ? t('presale.ends_in') : t('presale.starts_in')}</p>
                                        <Countdown targetDate={tab === 'active' ? ps.endDate : ps.startDate} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: 12 }}>
                                    <div className="flex justify-between" style={{ marginBottom: 4 }}>
                                        <span className="caption">{t('presale.sold')}: {ps.soldCount}/{ps.totalSupply}</span>
                                        <span className="caption">{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                                </div>

                                <p className="caption" style={{ marginBottom: 12 }}>{t('presale.max_per_user')}: {ps.maxPerUser}</p>

                                {tab === 'active' && (
                                    <button
                                        className="btn btn-primary btn-block"
                                        disabled={soldOut || buying === ps._id || !user}
                                        onClick={() => handleBuy(ps._id)}
                                    >
                                        {soldOut ? t('presale.sold_out') : buying === ps._id ? '...' : t('presale.buy')}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <IconPresale size={48} style={{ opacity: 0.3 }} />
                    <p style={{ marginTop: 12 }}>{t('presale.no_presales')}</p>
                </div>
            )}
        </div>
    );
}
