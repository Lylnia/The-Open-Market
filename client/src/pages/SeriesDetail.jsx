import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function SeriesDetail() {
    const { slug } = useParams();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data, loading, refetch } = useApi(`/series/${slug}`);
    const [buyingMint, setBuyingMint] = useState(null);

    const handleBuy = async (mintNumber) => {
        try {
            setBuyingMint(mintNumber);
            await api.post(`/nfts/new/buy`, { seriesId: data._id, mintNumber });
            refetch();
        } catch (e) {
            alert(e?.error || 'Purchase failed');
        } finally {
            setBuyingMint(null);
        }
    };

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!data) return <div className="page"><p>{t('common.error')}</p></div>;

    const available = data.totalSupply - data.mintedCount;

    return (
        <div className="page">
            {/* Series header */}
            <div className="flex gap-16" style={{ marginBottom: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                    {data.imageUrl && <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div>
                    <Link to={`/collection/${data.collection?.slug}`} className="caption" style={{ textDecoration: 'none', fontSize: 12 }}>
                        {data.collection?.name}
                    </Link>
                    <h1 className="h1" style={{ marginBottom: 4 }}>{data.name}</h1>
                    <span className={`badge badge-${data.rarity}`}>{data.rarity}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-12" style={{ marginBottom: 20 }}>
                {[
                    { label: t('nft.price'), value: `${(data.price / 1e9).toFixed(2)} TON` },
                    { label: t('series.available'), value: available },
                    { label: t('series.minted'), value: `${data.mintedCount}/${data.totalSupply}` },
                ].map(({ label, value }) => (
                    <div key={label} className="card" style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}>
                        <p className="stat-value" style={{ fontSize: 16 }}>{value}</p>
                        <p className="stat-label">{label}</p>
                    </div>
                ))}
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${(data.mintedCount / data.totalSupply) * 100}%` }} /></div>
            </div>

            {data.stats && (
                <div className="flex gap-12" style={{ marginBottom: 24 }}>
                    <div className="card" style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{(data.stats.floorPrice / 1e9).toFixed(2)} TON</p>
                        <p className="stat-label">{t('collection.floor')}</p>
                    </div>
                    <div className="card" style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700 }}>{data.stats.ownerCount}</p>
                        <p className="stat-label">{t('collection.owners')}</p>
                    </div>
                </div>
            )}

            {/* NFT Grid */}
            <h2 className="section-title" style={{ marginBottom: 12 }}>NFTs</h2>
            <div className="grid-2">
                {/* Show available mints */}
                {data.nfts?.map(nft => (
                    <Link key={nft._id} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="card" style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                                {data.imageUrl && <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 600 }}>#{nft.mintNumber}</p>
                            <p className="caption" style={{ fontSize: 11 }}>{nft.owner ? `@${nft.owner.username || 'user'}` : t('series.available')}</p>
                            {nft.isListed && <p style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{(nft.listPrice / 1e9).toFixed(2)} TON</p>}
                        </div>
                    </Link>
                ))}
                {/* Show buyable slots if there are available mints */}
                {available > 0 && data.nfts?.length < data.totalSupply && Array.from({ length: Math.min(4, available - (data.nfts?.length || 0)) }, (_, i) => {
                    const mintNum = data.mintedCount + i + 1;
                    return (
                        <div key={`mint-${mintNum}`} className="card" style={{ padding: '12px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 10, marginBottom: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-muted)' }}>#{mintNum}</span>
                            </div>
                            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{(data.price / 1e9).toFixed(2)} TON</p>
                            <button className="btn btn-primary btn-sm btn-block" disabled={buyingMint || !user} onClick={() => handleBuy(mintNum)}>
                                {buyingMint === mintNum ? '...' : t('series.buy')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
