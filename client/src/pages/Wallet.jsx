import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import api from '../services/api';
import { IconArrowDown, IconArrowUp, IconCopy } from '../assets/icons';

export default function Wallet() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [tab, setTab] = useState('deposit');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState('');
    const { data: walletData } = useApi('/wallet/balance');

    const copyText = (text, key) => {
        navigator.clipboard?.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleWithdraw = async () => {
        try {
            setLoading(true);
            await api.post('/wallet/withdraw', { amount: parseFloat(withdrawAmount) * 1e9, toAddress: withdrawAddress });
            setWithdrawAmount(''); setWithdrawAddress('');
            alert('Withdrawal request submitted');
        } catch (e) { alert(e?.error || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 20 }}>{t('wallet.title')}</h1>

            {/* Balance */}
            <div className="card" style={{ textAlign: 'center', padding: '24px', marginBottom: 20 }}>
                <p className="overline" style={{ marginBottom: 4 }}>{t('wallet.balance')}</p>
                <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>
                    {user ? (user.balance / 1e9).toFixed(4) : '0.0000'}
                </p>
                <p className="caption">TON</p>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                <button className={`tab ${tab === 'deposit' ? 'active' : ''}`} onClick={() => setTab('deposit')}>
                    <span className="flex items-center gap-4"><IconArrowDown size={14} />{t('wallet.deposit')}</span>
                </button>
                <button className={`tab ${tab === 'withdraw' ? 'active' : ''}`} onClick={() => setTab('withdraw')}>
                    <span className="flex items-center gap-4"><IconArrowUp size={14} />{t('wallet.withdraw')}</span>
                </button>
            </div>

            {tab === 'deposit' && (
                <div className="flex-col gap-12">
                    <p className="caption">{t('wallet.deposit_info')}</p>
                    <div className="card">
                        <p className="overline" style={{ marginBottom: 4 }}>{t('wallet.address')}</p>
                        <div className="flex items-center justify-between">
                            <p style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-all', fontFamily: 'monospace' }}>{walletData?.centralWallet || '—'}</p>
                            <button onClick={() => copyText(walletData?.centralWallet || '', 'addr')} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4 }}>
                                <IconCopy size={16} />
                            </button>
                        </div>
                        {copied === 'addr' && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>{t('profile.copied')}</p>}
                    </div>
                    <div className="card">
                        <p className="overline" style={{ marginBottom: 4 }}>{t('wallet.memo')}</p>
                        <div className="flex items-center justify-between">
                            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{user?.memo || '—'}</p>
                            <button onClick={() => copyText(user?.memo || '', 'memo')} style={{ background: 'none', color: 'var(--text-secondary)', padding: 4 }}>
                                <IconCopy size={16} />
                            </button>
                        </div>
                        {copied === 'memo' && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>{t('profile.copied')}</p>}
                    </div>
                </div>
            )}

            {tab === 'withdraw' && (
                <div className="flex-col gap-12">
                    <div>
                        <label className="caption" style={{ marginBottom: 4, display: 'block' }}>{t('wallet.address')}</label>
                        <input className="input" placeholder="EQ..." value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} />
                    </div>
                    <div>
                        <label className="caption" style={{ marginBottom: 4, display: 'block' }}>{t('wallet.amount')} (TON)</label>
                        <input className="input" type="number" step="0.01" placeholder="0.00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                    </div>
                    <button className="btn btn-primary btn-block" onClick={handleWithdraw} disabled={loading || !withdrawAmount || !withdrawAddress}>
                        {loading ? '...' : t('wallet.withdraw_request')}
                    </button>
                </div>
            )}
        </div>
    );
}
