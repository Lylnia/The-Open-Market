import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTelegram } from '../hooks/useTelegram';
import { IconShare } from '../assets/icons';
import api from '../services/api';
import PresaleModal from '../components/common/PresaleModal';

export default function SeriesDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data, loading, refetch } = useApi(`/series/${slug}`);

    // UI States
    const [buyingMint, setBuyingMint] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showPresaleModal, setShowPresaleModal] = useState(false);

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

    // Create available blanks safely
    const availableItems = available > 0 ? Array.from({ length: Math.min(100, available) }, (_, i) => data.mintedCount + i + 1) : [];

    // Check if there is an active presale embedded in the Series payload
    const activePresale = data?.activePresale;
    const isPresaleActive = !!activePresale;

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
        <div className="page" style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 24px)) + 32px)', paddingBottom: 120 }}>
            {/* Header Section */}
            <div className="flex justify-between items-start" style={{ padding: '0 20px', marginBottom: 20 }}>
                <div>
                    <h1 className="h1" style={{ fontSize: 32, letterSpacing: '-0.8px', marginBottom: 6 }}>{data.name}</h1>
                    <Link to={`/collection/${data.collection?.slug}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>{data.collection?.name}</span>
                    </Link>

                    {/* Badges */}
                    <div className="flex items-center gap-8" style={{ marginBottom: 16 }}>
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '6px 12px', fontSize: 11, letterSpacing: '0.5px' }}>SUPPLY {data.totalSupply}</span>
                    </div>

                    {(data.description && (data.description.en || data.description.tr || data.description.ru)) && (
                        <p className="body" style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.4, marginBottom: 4 }}>
                            {data.description.en || data.description.tr || data.description.ru}
                        </p>
                    )}
                </div>

                {/* Share Button */}
                <button
                    className="btn-icon"
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({ title: data.name, url: window.location.href });
                        } else {
                            navigator.clipboard.writeText(window.location.href);
                            showToast('Copied to clipboard', 'info');
                        }
                    }}
                    style={{ background: 'transparent', color: 'var(--text-primary)', padding: 8, marginTop: -4 }}
                >
                    <IconShare size={24} />
                </button>
            </div>

            {/* Large Image Display Container */}
            <div style={{
                margin: '0 16px 24px 16px',
                aspectRatio: '1.05/1',
                background: 'var(--bg-card)',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)'
            }}>
                {data.imageUrl ? (
                    <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                    <div className="skeleton" style={{ width: '100%', height: '100%' }} />
                )}
            </div>

            {/* Fixed Action Bottom Button */}
            <div style={{ position: 'fixed', bottom: 56, left: 16, right: 16, zIndex: 50 }}>
                {isPresaleActive ? (
                    <button
                        className="btn btn-primary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16, background: '#4DB8FF', color: '#FFFFFF', border: 'none' }}
                        onClick={() => setShowPresaleModal(true)}
                    >
                        Join Raffle ({(activePresale?.price / 1e9).toFixed(2)} TON)
                    </button>
                ) : (
                    <button
                        className="btn btn-secondary btn-block"
                        style={{ height: 50, fontSize: 17, borderRadius: 16 }}
                        onClick={() => navigate(`/market?series=${data._id}`)}
                    >
                        Get on Market
                    </button>
                )}
            </div>

            {showPresaleModal && activePresale && (
                <PresaleModal
                    presale={activePresale}
                    series={data}
                    onClose={() => setShowPresaleModal(false)}
                    onPledgeSuccess={refetch}
                />
            )}
        </div>
    );
}
