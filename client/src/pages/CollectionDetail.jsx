import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

export default function CollectionDetail() {
    const { slug } = useParams();
    const { t } = useTranslation();
    const { data, loading } = useApi(`/collections/${slug}`);

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!data) return <div className="page"><p>{t('common.error')}</p></div>;

    return (
        <div className="page" style={{ padding: 0 }}>
            {/* Banner */}
            <div style={{ height: 180, position: 'relative', background: 'var(--bg-card)' }}>
                {data.bannerUrl ? <img src={data.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-elevated))' }} />}
                <div style={{ position: 'absolute', bottom: -28, left: 16, width: 56, height: 56, borderRadius: 16, overflow: 'hidden', border: '3px solid var(--bg-primary)', background: 'var(--bg-card)' }}>
                    {data.logoUrl && <img src={data.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
            </div>

            <div style={{ padding: '40px 16px 16px' }}>
                <h1 className="h1" style={{ marginBottom: 4 }}>{data.name}</h1>
                <p className="caption" style={{ marginBottom: 16 }}>{data.description?.en || data.description?.tr || ''}</p>

                {/* Stats */}
                {data.stats && (
                    <div className="flex gap-12" style={{ marginBottom: 24, overflowX: 'auto' }}>
                        {[
                            { label: t('collection.floor'), value: `${(data.stats.floorPrice / 1e9).toFixed(2)} TON` },
                            { label: t('collection.volume'), value: `${(data.stats.totalVolume / 1e9).toFixed(0)} TON` },
                            { label: t('collection.owners'), value: data.stats.ownerCount },
                            { label: t('collection.supply'), value: data.stats.totalSupply },
                        ].map(({ label, value }) => (
                            <div key={label} className="card" style={{ padding: '12px 16px', minWidth: 90, textAlign: 'center', flexShrink: 0 }}>
                                <p className="stat-value" style={{ fontSize: 16 }}>{value}</p>
                                <p className="stat-label">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Series */}
                <h2 className="section-title" style={{ marginBottom: 12 }}>{t('collection.series')}</h2>
                <div className="flex-col gap-12">
                    {data.series?.map(s => {
                        const available = s.totalSupply - s.mintedCount;
                        return (
                            <Link key={s._id} to={`/series/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card flex gap-12" style={{ padding: 12 }}>
                                    <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                        {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                                            <p style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</p>
                                            <span className={`badge badge-${s.rarity}`}>{s.rarity}</span>
                                        </div>
                                        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{(s.price / 1e9).toFixed(2)} TON</p>
                                        <div className="flex items-center gap-8">
                                            <span className="caption">{t('series.available')}: {available}</span>
                                            <span className="caption">{t('collection.supply')}: {s.totalSupply}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
