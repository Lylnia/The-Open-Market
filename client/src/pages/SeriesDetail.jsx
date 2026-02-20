import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTelegram } from '../hooks/useTelegram';
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
    const { tg, showBackButton } = useTelegram();

    useEffect(() => {
        showBackButton(true);
        const handleBack = () => { navigate(-1); };
        tg?.BackButton?.onClick(handleBack);

        return () => {
            showBackButton(false);
            tg?.BackButton?.offClick(handleBack);
        };
    }, []);

    // Reset selection on Series change
    useEffect(() => {
        setSelectedIndex(0);
    }, [data?._id]);

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!data) return <div className="page"><p>{t('common.error')}</p></div>;

    const available = data.totalSupply - data.mintedCount;

    // Create available blanks
    const availableItems = Array.from({ length: Math.min(100, available) }, (_, i) => data.mintedCount + i + 1);

    const handleBuy = async () => {
        if (!user) {
            navigate('/profile');
            return;
        }
        if (availableItems.length === 0) return;

        // Pick a random available mint number to satisfy the "şansa göre gelecek" request
        const randomMintNumber = availableItems[Math.floor(Math.random() * availableItems.length)];

        try {
            setBuyingMint(randomMintNumber);
            await api.post(`/nfts/mint`, { seriesId: data._id, mintNumber: randomMintNumber });
            refetch();
            showToast(t('nft.buy_now') + ' Successful!', 'success');
            navigate('/profile');
        } catch (e) {
            showToast(e?.error || 'Purchase failed', 'error');
        } finally {
            setBuyingMint(null);
        }
    };

    return (
        <div className="page" style={{ paddingBottom: 100 }}>
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

            {/* Details */}
            <div style={{ padding: '24px 16px' }}>
                <div className="card" style={{ padding: 16 }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 18, fontWeight: 700 }}>{data.name}</p>
                        {available > 0 ? (
                            <span className="tag" style={{ background: 'var(--bg-elevated)' }}>Available to Mint</span>
                        ) : (
                            <span className="tag" style={{ background: 'var(--bg-elevated)' }}>Sold Out</span>
                        )}
                    </div>

                    <p className="caption" style={{ marginBottom: 4 }}>Price</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{(data.price / 1e9).toFixed(2)} TON</p>
                </div>
            </div>

            {/* Fixed Action Bottom Button */}
            <div style={{ position: 'fixed', bottom: 32, left: 16, right: 16, zIndex: 50 }}>
                {available > 0 ? (
                    <button
                        className="btn btn-primary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16, background: '#4DB8FF', color: '#FFFFFF', border: 'none' }}
                        disabled={buyingMint || !user}
                        onClick={handleBuy}
                    >
                        {buyingMint ? '...' : `Buy ${(data.price / 1e9).toFixed(2)} TON`}
                    </button>
                ) : (
                    <button
                        className="btn btn-primary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}
                        disabled
                    >
                        Sold Out
                    </button>
                )}
            </div>
        </div>
    );
}
