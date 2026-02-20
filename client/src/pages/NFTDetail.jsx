import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTelegram } from '../hooks/useTelegram';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function NFTDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: nft, loading, refetch } = useApi(`/nfts/${id}`);
    const [action, setAction] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [listPrice, setListPrice] = useState('');
    const [showBidModal, setShowBidModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
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

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!nft) return <div className="page"><p>{t('common.error')}</p></div>;

    const isOwner = user && String(nft.owner?._id) === String(user.id);
    const series = nft.series || {};

    const handleBuy = async () => {
        try { setAction('buy'); await api.post(`/nfts/${id}/buy`); refetch(); }
        catch (e) { showToast(e?.error || 'Failed', 'error'); }
        finally { setAction(null); }
    };

    const handleBid = async () => {
        try { setAction('bid'); await api.post('/bids', { nftId: id, amount: parseFloat(bidAmount) * 1e9 }); setShowBidModal(false); setBidAmount(''); refetch(); }
        catch (e) { showToast(e?.error || 'Failed', 'error'); }
        finally { setAction(null); }
    };

    const handleList = async () => {
        try { setAction('list'); await api.post(`/nfts/${id}/list`, { price: parseFloat(listPrice) * 1e9 }); setShowListModal(false); setListPrice(''); refetch(); }
        catch (e) { showToast(e?.error || 'Failed', 'error'); }
        finally { setAction(null); }
    };

    const handleDelist = async () => {
        try { setAction('delist'); await api.post(`/nfts/${id}/delist`); refetch(); }
        catch (e) { showToast(e?.error || 'Failed', 'error'); }
        finally { setAction(null); }
    };

    const handleAcceptBid = async (bidId) => {
        try { await api.post(`/bids/${bidId}/accept`); refetch(); } catch (e) { showToast(e?.error || 'Failed', 'error'); }
    };

    return (
        <div className="page" style={{ paddingBottom: 100 }}>
            {/* Header Text */}
            <div style={{ padding: '8px 16px', marginBottom: 12 }}>
                <h1 className="h1" style={{ fontSize: 26, letterSpacing: '-0.5px', marginBottom: 2 }}>{series.name} #{nft.mintNumber}</h1>
                <Link to={`/collection/${series.collection?.slug}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>{series.collection?.name}</p>
                </Link>

                <div className="flex items-center gap-8">
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        SUPPLY {series.totalSupply}
                    </span>
                </div>
            </div>

            {/* Hero Viewport */}
            <div style={{ margin: '0 16px', borderRadius: 24, background: 'var(--bg-card)', aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {series.imageUrl ? <img src={series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div className="skeleton" style={{ width: '100%', height: '100%' }} />}
            </div>

            {/* Details & Metadata */}
            <div style={{ padding: '24px 16px' }}>
                {/* Price & Owner Card */}
                <div className="card" style={{ marginBottom: 24, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p className="caption" style={{ fontSize: 13, marginBottom: 2 }}>{nft.isListed ? t('nft.price') : t('nft.not_listed')}</p>
                        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: nft.isListed ? 'var(--accent)' : 'inherit' }}>
                            {nft.isListed ? `${(nft.listPrice / 1e9).toFixed(2)} TON` : t('nft.not_listed')}
                        </p>
                    </div>
                    {nft.owner && (
                        <div style={{ textAlign: 'right' }}>
                            <p className="caption" style={{ fontSize: 13, marginBottom: 2 }}>{t('nft.owner')}</p>
                            <p style={{ fontWeight: 600, fontSize: 16 }}>@{nft.owner.username || nft.owner.firstName || 'user'}</p>
                        </div>
                    )}
                </div>

                {/* Bids */}
                {nft.bids?.length > 0 && (
                    <section className="section" style={{ marginBottom: 24 }}>
                        <h3 className="section-title" style={{ marginBottom: 12 }}>{t('nft.bids')}</h3>
                        <div className="card" style={{ padding: 0 }}>
                            {nft.bids.map((bid, idx) => (
                                <div key={bid._id} className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: idx !== nft.bids.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: 15 }}>{(bid.amount / 1e9).toFixed(4)} TON</p>
                                        <p className="caption" style={{ fontSize: 13, marginTop: 2 }}>@{bid.bidder?.username || 'user'}</p>
                                    </div>
                                    {isOwner && bid.status === 'active' && (
                                        <button className="btn-pill" onClick={() => handleAcceptBid(bid._id)}>{t('nft.accept')}</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Price History */}
                {nft.priceHistory?.length > 0 && (
                    <section className="section" style={{ marginBottom: 24 }}>
                        <h3 className="section-title" style={{ marginBottom: 12 }}>{t('series.price_history')}</h3>
                        <div className="card" style={{ padding: 0 }}>
                            {nft.priceHistory.map((ph, idx) => (
                                <div key={idx} className="flex justify-between items-center" style={{ padding: '12px 16px', borderBottom: idx !== nft.priceHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(ph.createdAt).toLocaleDateString()}</span>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>{(ph.price / 1e9).toFixed(4)} TON</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Attributes */}
                {series.attributes?.length > 0 && (
                    <section className="section">
                        <h3 className="section-title" style={{ marginBottom: 12 }}>{t('nft.attributes')}</h3>
                        <div className="grid-2">
                            {series.attributes.map((attr, i) => (
                                <div key={i} className="card" style={{ padding: '12px', textAlign: 'center', borderRadius: 12 }}>
                                    <p className="overline" style={{ marginBottom: 4 }}>{attr.trait}</p>
                                    <p style={{ fontWeight: 600, fontSize: 14 }}>{attr.value}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Fixed Bottom Action Panel */}
            <div style={{ position: 'fixed', bottom: 32, left: 16, right: 16, zIndex: 50, display: 'flex', gap: 12 }}>
                {!isOwner && nft.isListed && (
                    <button className="btn btn-primary" style={{ flex: 1, height: 50, fontSize: 17, borderRadius: 16, background: '#4DB8FF', color: '#FFFFFF', border: 'none' }} onClick={handleBuy} disabled={action || !user}>
                        {action === 'buy' ? '...' : `Buy ${(nft.listPrice / 1e9).toFixed(2)} TON`}
                    </button>
                )}
                {!isOwner && !nft.isListed && (
                    <button className="btn btn-secondary" style={{ flex: 1, height: 50, fontSize: 16, borderRadius: 16 }} onClick={() => setShowBidModal(true)} disabled={!user}>
                        {t('nft.make_offer')}
                    </button>
                )}
                {!isOwner && nft.isListed && (
                    <button className="btn btn-secondary" style={{ flex: 0.5, height: 50, fontSize: 15, borderRadius: 16 }} onClick={() => setShowBidModal(true)} disabled={!user}>
                        {t('nft.make_offer')}
                    </button>
                )}

                {isOwner && !nft.isListed && (
                    <>
                        <button className="btn btn-primary" style={{ flex: 1, height: 50, fontSize: 16, borderRadius: 16 }} onClick={() => setShowListModal(true)}>{t('nft.list_for_sale')}</button>
                        <Link to={`/transfer?nft=${id}`} className="btn btn-secondary" style={{ flex: 0.8, height: 50, fontSize: 16, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>{t('nft.transfer')}</Link>
                    </>
                )}
                {isOwner && nft.isListed && (
                    <button className="btn btn-secondary btn-block" style={{ height: 50, fontSize: 16, borderRadius: 16 }} onClick={handleDelist} disabled={action}>{action === 'delist' ? '...' : t('nft.delist')}</button>
                )}
            </div>

            {/* Bid Modal */}
            {showBidModal && (
                <div className="modal-overlay" onClick={() => setShowBidModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h3 className="h3" style={{ marginBottom: 16 }}>{t('nft.make_offer')}</h3>
                        <input className="input" type="number" step="0.01" placeholder="TON" value={bidAmount} onChange={e => setBidAmount(e.target.value)} style={{ marginBottom: 16 }} />
                        <button className="btn btn-primary btn-block" onClick={handleBid} disabled={!bidAmount || action}>{action === 'bid' ? '...' : t('common.confirm')}</button>
                    </div>
                </div>
            )}

            {/* List Modal */}
            {showListModal && (
                <div className="modal-overlay" onClick={() => setShowListModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h3 className="h3" style={{ marginBottom: 16 }}>{t('nft.list_for_sale')}</h3>
                        <input className="input" type="number" step="0.01" placeholder="TON" value={listPrice} onChange={e => setListPrice(e.target.value)} style={{ marginBottom: 16 }} />

                        {listPrice > 0 && (
                            <div className="card" style={{ padding: '12px', marginBottom: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Market Fee (5%)</span>
                                    <span style={{ fontSize: 13, fontWeight: 500 }}>-{(listPrice * 0.05).toFixed(2)} TON</span>
                                </div>
                                <div className="flex justify-between" style={{ marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Creator Royalty ({series.royaltyPercent}%)</span>
                                    <span style={{ fontSize: 13, fontWeight: 500 }}>-{(listPrice * (series.royaltyPercent / 100)).toFixed(2)} TON</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>You Receive</span>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>
                                        {(listPrice - (listPrice * 0.05) - (listPrice * (series.royaltyPercent / 100))).toFixed(2)} TON
                                    </span>
                                </div>
                            </div>
                        )}

                        <button className="btn btn-primary btn-block" onClick={handleList} disabled={!listPrice || listPrice <= 0 || action}>{action === 'list' ? '...' : t('common.confirm')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
