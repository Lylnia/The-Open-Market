import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';

export default function Transactions() {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('');
    const { data, loading } = useApi('/transactions', filter ? { type: filter } : {}, [filter]);

    const types = ['', 'deposit', 'withdrawal', 'buy', 'sell', 'transfer_in', 'transfer_out', 'airdrop', 'referral_earning'];
    const typeLabels = { '': t('transactions.all'), deposit: t('transactions.deposit'), withdrawal: t('transactions.withdrawal'), buy: t('transactions.buy'), sell: t('transactions.sell'), transfer_in: t('transactions.transfer_in'), transfer_out: t('transactions.transfer_out'), airdrop: t('transactions.airdrop'), referral_earning: t('transactions.referral') };
    const statusColors = { pending: 'var(--warning)', completed: 'var(--success)', failed: 'var(--error)' };

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('transactions.title')}</h1>

            <div className="scroll-h" style={{ marginBottom: 16 }}>
                {types.map(type => (
                    <button key={type} className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(type)} style={{ whiteSpace: 'nowrap' }}>{typeLabels[type] || type}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex-col gap-8">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />)}</div>
            ) : data?.transactions?.length > 0 ? (
                <div className="flex-col gap-4">
                    {data.transactions.map(tx => (
                        <div key={tx._id} className="card flex items-center justify-between" style={{ padding: '12px 14px' }}>
                            <div>
                                <p style={{ fontSize: 13, fontWeight: 500 }}>{typeLabels[tx.type] || tx.type}</p>
                                <p className="caption" style={{ fontSize: 11 }}>{new Date(tx.createdAt).toLocaleString()}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {tx.amount > 0 && <p style={{ fontWeight: 600, fontSize: 14 }}>{['sell', 'deposit', 'referral_earning', 'royalty_earning', 'airdrop', 'transfer_in'].includes(tx.type) ? '+' : '-'}{(tx.amount / 1e9).toFixed(4)} TON</p>}
                                <span style={{ fontSize: 10, color: statusColors[tx.status], fontWeight: 600 }}>{t(`transactions.${tx.status}`)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state"><p>{t('transactions.no_transactions')}</p></div>
            )}
        </div>
    );
}
