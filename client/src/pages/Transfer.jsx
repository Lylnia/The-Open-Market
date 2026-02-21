import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';

export default function Transfer() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [params] = useSearchParams();
    const [username, setUsername] = useState('');
    const [selectedNft, setSelectedNft] = useState(params.get('nft') || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showConfirmTransferModal, setShowConfirmTransferModal] = useState(false);
    const { data: nfts } = useApi('/user/nfts');

    const initiateTransfer = () => {
        if (!username || !selectedNft) return;
        setShowConfirmTransferModal(true);
    };

    const handleTransfer = async () => {
        try {
            setLoading(true);
            await api.post('/transfer/send', { nftId: selectedNft, toUsername: username });
            setShowConfirmTransferModal(false);
            setSuccess(true);
            showToast(t('transfer.success'), 'success');
        } catch (e) {
            showToast(e?.error || 'Transfer failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{t('transfer.success')}</p>
            </div>
        );
    }

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 20 }}>{t('transfer.title')}</h1>

            <div className="flex-col gap-16">
                <div>
                    <label className="caption" style={{ marginBottom: 6, display: 'block' }}>{t('transfer.recipient')}</label>
                    <input className="input" placeholder={`@${t('transfer.username')}`} value={username} onChange={e => setUsername(e.target.value)} />
                </div>

                <div>
                    <label className="caption" style={{ marginBottom: 6, display: 'block' }}>{t('transfer.select_nft')}</label>
                    <div className="flex-col gap-8">
                        {nfts?.map(nft => (
                            <div key={nft._id}
                                className="card flex items-center gap-12"
                                style={{
                                    padding: '12px 14px', cursor: 'pointer',
                                    boxShadow: selectedNft === nft._id ? '0 0 0 2px var(--accent)' : 'var(--shadow-card)',
                                }}
                                onClick={() => setSelectedNft(nft._id)}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                    {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <p style={{ fontWeight: 600, fontSize: 15 }}>{nft.series?.name} #{nft.mintNumber}</p>
                                {selectedNft === nft._id && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" style={{ marginLeft: 'auto' }}>
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button className="btn btn-primary btn-block" onClick={initiateTransfer} disabled={loading || !username || !selectedNft}>
                    {t('transfer.confirm')}
                </button>
            </div>

            {/* Transfer Confirmation Modal */}
            {showConfirmTransferModal && (
                <div className="modal-overlay" onClick={() => setShowConfirmTransferModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h3 className="h2" style={{ marginBottom: 8, color: 'var(--text-primary)', textAlign: 'center' }}>Confirm Transfer</h3>

                        <div style={{ background: 'var(--bg-elevated)', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'center' }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>You are about to transfer</p>

                            {(() => {
                                const nftData = nfts?.find(n => n._id === selectedNft);
                                return (
                                    <>
                                        <p className="h3" style={{ color: 'var(--accent)', marginBottom: 16 }}>
                                            {nftData?.series?.name} #{nftData?.mintNumber}
                                        </p>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>To User</p>
                                        <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>@{username.replace('@', '')}</p>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex gap-12">
                            <button className="btn btn-secondary" style={{ flex: 1, height: 50, borderRadius: 16 }} onClick={() => setShowConfirmTransferModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1, height: 50, borderRadius: 16, background: 'var(--success)', border: 'none', color: '#fff' }} onClick={handleTransfer} disabled={loading}>
                                {loading ? '...' : 'Yes, Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
