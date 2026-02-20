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
        <div className="page-flush">
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
                    <div className="flex gap-12" style={{ marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
                        {[
                            { label: 'FLOOR', value: `${(data.stats.floorPrice / 1e9).toFixed(2)} TON` },
                            { label: 'VOLUME', value: `${(data.stats.totalVolume / 1e9).toFixed(0)} TON` },
                            { label: 'OWNERS', value: data.stats.ownerCount },
                            { label: 'SUPPLY', value: data.stats.totalSupply },
                        ].map(({ label, value }) => (
                            <div key={label} className="card" style={{ padding: '16px', minWidth: 100, textAlign: 'center', flexShrink: 0, borderRadius: 16 }}>
                                <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 2 }}>{value}</p>
                                <p className="overline" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Series */}
                <h2 className="section-title" style={{ marginBottom: 16, fontSize: 20 }}>Series in Collection</h2>
                <div className="card" style={{ padding: 0 }}>
                    {data.series?.map((s, idx) => {
                        const available = s.totalSupply - s.mintedCount;
                        return (
                            <Link key={s._id} to={`/series/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="flex gap-12" style={{ padding: '16px', borderBottom: idx !== data.series.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                        {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                                            <p style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.3px' }}>{s.name}</p>
                                            <span className={`badge badge-${s.rarity}`}>{s.rarity}</span>
                                        </div>
                                        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)', marginBottom: 6 }}>{(s.price / 1e9).toFixed(2)} TON</p>
                                        <div className="flex items-center gap-12">
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Available: <strong style={{ color: 'var(--text-primary)' }}>{available}</strong></span>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Supply: <strong style={{ color: 'var(--text-primary)' }}>{s.totalSupply}</strong></span>
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
