import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useState } from 'react';
import api from '../services/api';

export default function NFTDetail() {
    const { id } = useParams();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { data: nft, loading, refetch } = useApi(`/nfts/${id}`);
    const [action, setAction] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [listPrice, setListPrice] = useState('');
    const [showBidModal, setShowBidModal] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const { showToast } = useToast();

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
        <div className="page" style={{ padding: 0 }}>
            {/* Image */}
            <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-card)', overflow: 'hidden' }}>
                {series.imageUrl && <img src={series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>

            <div style={{ padding: 16 }}>
                {/* Breadcrumb */}
                <div className="flex items-center gap-4" style={{ marginBottom: 4 }}>
                    <Link to={`/collection/${series.collection?.slug}`} className="caption" style={{ textDecoration: 'none' }}>{series.collection?.name}</Link>
                    <span className="caption">/</span>
                    <Link to={`/series/${series.slug}`} className="caption" style={{ textDecoration: 'none' }}>{series.name}</Link>
                </div>

                <h1 className="h1" style={{ marginBottom: 8 }}>{series.name} #{nft.mintNumber}</h1>

                <div className="flex items-center gap-8" style={{ marginBottom: 16 }}>
                    <span className={`badge badge-${series.rarity}`}>{series.rarity}</span>
                    <span className="tag" style={{ background: 'var(--bg-elevated)' }}>{t('nft.mint_number')}: {nft.mintNumber}</span>
                </div>

                {/* Price & Owner */}
                <div className="card" style={{ marginBottom: 24, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p className="caption" style={{ fontSize: 12, marginBottom: 2 }}>{nft.isListed ? t('nft.price') : t('nft.not_listed')}</p>
                        <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{nft.isListed ? `${(nft.listPrice / 1e9).toFixed(4)} TON` : `${(series.price / 1e9).toFixed(4)} TON`}</p>
                    </div>
                    {nft.owner && (
                        <div style={{ textAlign: 'right' }}>
                            <p className="caption" style={{ fontSize: 12, marginBottom: 2 }}>{t('nft.owner')}</p>
                            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent)' }}>@{nft.owner.username || nft.owner.firstName || 'user'}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex-col gap-12" style={{ marginBottom: 32 }}>
                    {!isOwner && nft.isListed && (
                        <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={handleBuy} disabled={action}>{action === 'buy' ? '...' : t('nft.buy_now')}</button>
                    )}
                    {!isOwner && nft.owner && (
                        <button className="btn btn-secondary btn-block" style={{ height: 48 }} onClick={() => setShowBidModal(true)}>{t('nft.make_offer')}</button>
                    )}
                    {isOwner && !nft.isListed && (
                        <>
                            <button className="btn btn-primary btn-block" style={{ height: 48 }} onClick={() => setShowListModal(true)}>{t('nft.list_for_sale')}</button>
                            <Link to={`/transfer?nft=${id}`} className="btn btn-secondary btn-block" style={{ textDecoration: 'none', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t('nft.transfer')}</Link>
                        </>
                    )}
                    {isOwner && nft.isListed && (
                        <button className="btn btn-secondary btn-block" style={{ height: 48 }} onClick={handleDelist} disabled={action}>{action === 'delist' ? '...' : t('nft.delist')}</button>
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
                        <button className="btn btn-primary btn-block" onClick={handleList} disabled={!listPrice || action}>{action === 'list' ? '...' : t('common.confirm')}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
