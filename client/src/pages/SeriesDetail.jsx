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
            <div style={{ padding: '8px 16px', marginBottom: 18 }}>
                <h1 className="h1" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.6px', marginBottom: 4 }}>{data.name}</h1>
                <Link to={`/collection/${data.collection?.slug}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>{data.collection?.name}</p>
                </Link>
                {(data.description && (data.description.en || data.description.tr || data.description.ru)) && (
                    <p className="body" style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.4 }}>
                        {data.description.en || data.description.tr || data.description.ru}
                    </p>
                )}
            </div>

            {/* Hero Viewport */}
            <div style={{ margin: '0 16px', borderRadius: 24, background: 'var(--bg-card)', aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.imageUrl ? <img src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            </div>



        </div>
    );
}
