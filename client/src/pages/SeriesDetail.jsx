import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

export default function SeriesDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data, loading, refetch } = useApi(`/series/${slug}`);
    const [buyingMint, setBuyingMint] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { showToast } = useToast();

    // Reset selection on Series change
    useEffect(() => {
        setSelectedIndex(0);
    }, [data?._id]);

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!data) return <div className="page"><p>{t('common.error')}</p></div>;

    const available = data.totalSupply - data.mintedCount;
    const mintedItems = (data.nfts || []).map(nft => ({ type: 'minted', ...nft }));

    // Create available blanks
    const availableItems = Array.from({ length: Math.min(20, available) }, (_, i) => ({
        type: 'available',
        mintNumber: data.mintedCount + i + 1,
        price: data.price
    }));

    // Combine and sort by mint number
    const allItems = [...availableItems, ...mintedItems];
    allItems.sort((a, b) => a.mintNumber - b.mintNumber);

    const selectedItem = allItems[selectedIndex] || allItems[0];

    const handleBuy = async (mintNumber) => {
        if (!user) {
            navigate('/profile');
            return;
        }
        try {
            setBuyingMint(mintNumber);
            await api.post(`/nfts/mint`, { seriesId: data._id, mintNumber });
            refetch();
        } catch (e) {
            showToast(e?.error || 'Purchase failed', 'error');
        } finally {
            setBuyingMint(null);
        }
    };

    return (
        <div className="page" style={{ paddingBottom: 120 }}>
            {/* Header Text */}
            <div style={{ padding: '8px 16px', marginBottom: 12 }}>
                <h1 className="h1" style={{ fontSize: 26, letterSpacing: '-0.5px', marginBottom: 2 }}>{data.name}</h1>
                <Link to={`/collection/${data.collection?.slug}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>{data.collection?.name}</p>
                </Link>

                <div className="flex items-center gap-8">
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        SUPPLY {data.totalSupply}
                    </span>
                </div>
            </div>

            {/* Hero Viewport */}
            <div style={{ margin: '0 16px', borderRadius: 24, background: 'var(--bg-card)', aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.imageUrl ? <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            </div>

            {/* Thumbnail Rail */}
            <div className="scroll-h" style={{ marginTop: 16, padding: '0 16px', gap: 12, paddingBottom: 8 }}>
                {allItems.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                        <div
                            key={`mint-${item.mintNumber}`}
                            onClick={() => setSelectedIndex(idx)}
                            style={{
                                width: 80, height: 80, borderRadius: 16, flexShrink: 0, overflow: 'hidden', cursor: 'pointer',
                                background: 'var(--bg-elevated)',
                                border: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            {data.imageUrl && <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}

                            <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '2px 6px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                                #{item.mintNumber}
                            </div>

                            {item.type === 'minted' && item.isListed && (
                                <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--accent)', borderRadius: 4, width: 8, height: 8 }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Details for Selected Item */}
            <div style={{ padding: '24px 16px' }}>
                {selectedItem && (
                    <div className="card" style={{ padding: 16 }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                            <p style={{ fontSize: 18, fontWeight: 700 }}>#{selectedItem.mintNumber}</p>
                            {selectedItem.type === 'minted' ? (
                                <span className="tag" style={{ background: 'var(--bg-elevated)' }}>Minted</span>
                            ) : (
                                <span className="tag" style={{ background: 'var(--bg-elevated)' }}>Available</span>
                            )}
                        </div>

                        {selectedItem.type === 'minted' ? (
                            <>
                                <p className="caption" style={{ marginBottom: 4 }}>Owner: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>@{selectedItem.owner?.username || 'user'}</span></p>
                                {selectedItem.isListed ? (
                                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>{(selectedItem.listPrice / 1e9).toFixed(2)} TON</p>
                                ) : (
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>Not listed for sale</p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="caption" style={{ marginBottom: 4 }}>Mint Price</p>
                                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{(data.price / 1e9).toFixed(2)} TON</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Fixed Action Bottom Button */}
            <div style={{ position: 'fixed', bottom: 85, left: 16, right: 16, zIndex: 50 }}>
                {selectedItem?.type === 'available' ? (
                    <button
                        className="btn btn-primary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16, background: '#4DB8FF', color: '#FFFFFF', border: 'none' }}
                        disabled={buyingMint === selectedItem.mintNumber}
                        onClick={() => handleBuy(selectedItem.mintNumber)}
                    >
                        {buyingMint === selectedItem.mintNumber ? '...' : `Buy ${(data.price / 1e9).toFixed(2)} TON`}
                    </button>
                ) : (
                    <Link
                        to={`/nft/${selectedItem?._id}`}
                        className="btn btn-primary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                    >
                        Get on Market
                    </Link>
                )}
            </div>
        </div>
    );
}
