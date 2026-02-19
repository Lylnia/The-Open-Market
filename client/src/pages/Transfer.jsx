import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import api from '../services/api';

export default function Transfer() {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const [username, setUsername] = useState('');
    const [selectedNft, setSelectedNft] = useState(params.get('nft') || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { data: nfts } = useApi('/user/nfts');

    const handleTransfer = async () => {
        try {
            setLoading(true);
            await api.post('/transfer/send', { nftId: selectedNft, toUsername: username });
            setSuccess(true);
        } catch (e) { alert(e?.error || 'Transfer failed'); }
        finally { setLoading(false); }
    };

    if (success) {
        return (
            <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                </div>
                <p style={{ fontSize: 18, fontWeight: 600 }}>{t('transfer.success')}</p>
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
                                className={`card flex items-center gap-12 ${selectedNft === nft._id ? 'selected' : ''}`}
                                style={{
                                    padding: '10px 14px', cursor: 'pointer',
                                    border: selectedNft === nft._id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                }}
                                onClick={() => setSelectedNft(nft._id)}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                                    {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <p style={{ fontWeight: 500, fontSize: 14 }}>{nft.series?.name} #{nft.mintNumber}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="btn btn-primary btn-block" onClick={handleTransfer} disabled={loading || !username || !selectedNft}>
                    {loading ? '...' : t('transfer.confirm')}
                </button>
            </div>
        </div>
    );
}
