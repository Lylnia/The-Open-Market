import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import api from '../services/api';
import { IconArrowDown, IconArrowUp, IconCopy } from '../assets/icons';

export default function Wallet() {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [tab, setTab] = useState('deposit');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState('');
    const { data: walletData } = useApi('/wallet/balance');

    const copyText = (text, key) => {
        navigator.clipboard?.writeText(text);
        setCopied(key);
        showToast(t('profile.copied'), 'success');
        setTimeout(() => setCopied(''), 2000);
    };

    const handleWithdraw = async () => {
        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
        if (!withdrawAddress.match(/^(EQ|UQ)[a-zA-Z0-9_-]{46}$/)) return showToast('Invalid TON address format', 'error');
        const nanoAmount = Math.round(amount * 1e9);
        if (nanoAmount > (user?.balance || 0)) return showToast('Insufficient balance', 'error');
        try {
            setLoading(true);
            await api.post('/wallet/withdraw', { amount: nanoAmount, toAddress: withdrawAddress });
            updateUser({ balance: (user?.balance || 0) - nanoAmount });
            setWithdrawAmount(''); setWithdrawAddress('');
            showToast(t('wallet.withdraw_success', 'Withdrawal request submitted'), 'success');
        } catch (e) {
            showToast(e?.error || 'Failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 20 }}>{t('wallet.title')}</h1>

            {/* Balance */}
            <div className="card" style={{ textAlign: 'center', padding: '28px', marginBottom: 20 }}>
                <p className="overline" style={{ marginBottom: 6 }}>{t('wallet.balance')}</p>
                <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-1px', marginBottom: 4 }}>
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
                        <p className="overline" style={{ marginBottom: 6 }}>{t('wallet.address')}</p>
                        <div className="flex items-center justify-between">
                            <p style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-all', fontFamily: 'monospace' }}>{walletData?.centralWallet || '—'}</p>
                            <button onClick={() => copyText(walletData?.centralWallet || '', 'addr')} style={{ background: 'none', color: 'var(--text-secondary)', padding: 8 }}>
                                <IconCopy size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="card">
                        <p className="overline" style={{ marginBottom: 6 }}>{t('wallet.memo')}</p>
                        <div className="flex items-center justify-between">
                            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{user?.memo || '—'}</p>
                            <button onClick={() => copyText(user?.memo || '', 'memo')} style={{ background: 'none', color: 'var(--text-secondary)', padding: 8 }}>
                                <IconCopy size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'withdraw' && (
                <div className="flex-col gap-12">
                    <div>
                        <label className="caption" style={{ marginBottom: 6, display: 'block' }}>{t('wallet.address')}</label>
                        <input className="input" placeholder="EQ..." value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} />
                    </div>
                    <div>
                        <label className="caption" style={{ marginBottom: 6, display: 'block' }}>{t('wallet.amount')} (TON)</label>
                        <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                        {user && (
                            <p className="caption" style={{ marginTop: 4, fontSize: 11 }}>
                                Max: {(user.balance / 1e9).toFixed(4)} TON
                            </p>
                        )}
                    </div>
                    <button className="btn btn-primary btn-block" onClick={handleWithdraw} disabled={loading || !withdrawAmount || !withdrawAddress}>
                        {loading ? '...' : t('wallet.withdraw_request')}
                    </button>
                </div>
            )}
        </div>
    );
}
