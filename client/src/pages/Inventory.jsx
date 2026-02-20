import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect } from 'react';

export default function Inventory() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: nfts, loading } = useApi('/user/nfts');
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

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;

    return (
        <div className="page" style={{ paddingBottom: 100 }}>
            <h1 className="h2" style={{ marginBottom: 20 }}>My Inventory</h1>

            <div className="card" style={{ padding: '16px', marginBottom: 24, textAlign: 'center', background: 'var(--bg-elevated)' }}>
                <p className="overline" style={{ fontSize: 12, marginBottom: 4 }}>TOTAL NFTs</p>
                <p style={{ fontSize: 32, fontWeight: 700 }}>{nfts?.length || 0}</p>
            </div>

            {nfts?.length > 0 ? (
                <div className="grid-2">
                    {nfts.map((nft, idx) => (
                        <Link key={`${nft._id}-${idx}`} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
                                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                                    {nft?.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ padding: '12px' }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft?.series?.name} #{nft?.mintNumber}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="badge" style={{ fontSize: 10, background: nft.isListed ? 'var(--accent-dim)' : 'var(--bg-input)', color: nft.isListed ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                            {nft.isListed ? `Listed: ${(nft.listPrice / 1e9).toFixed(2)}` : 'Not Listed'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <p>No NFTs yet.</p>
                </div>
            )}
        </div>
    );
}
