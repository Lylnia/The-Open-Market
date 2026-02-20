import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IconHeart } from '../assets/icons';

export default function Favorites() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('collection');
    const { data, loading } = useApi('/favorites', { type: tab }, [tab]);

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('favorites.title')}</h1>

            <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>{t('favorites.collections')}</button>
                <button className={`tab ${tab === 'series' ? 'active' : ''}`} onClick={() => setTab('series')}>{t('favorites.series')}</button>
            </div>

            {loading ? (
                <div className="flex-col gap-8">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}</div>
            ) : data?.length > 0 ? (
                <div className="flex-col gap-8">
                    {data.map(fav => {
                        const target = fav.targetData;
                        if (!target) return null;
                        const to = tab === 'collection' ? `/collection/${target.slug}` : `/series/${target.slug}`;
                        return (
                            <Link key={fav._id} to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card flex items-center gap-12" style={{ padding: '12px 16px' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                        {(target.logoUrl || target.imageUrl) && <img src={target.logoUrl || target.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{target.name}</p>
                                        {target.price && <p className="caption">{(target.price / 1e9).toFixed(2)} TON</p>}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <IconHeart size={48} style={{ opacity: 0.3 }} />
                    <p style={{ marginTop: 12 }}>{t('favorites.no_favorites')}</p>
                </div>
            )}
        </div>
    );
}
