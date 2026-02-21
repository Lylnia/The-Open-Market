import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../hooks/useApi';
import { IconArrowUpRight, IconArrowDownLeft, IconShoppingCart, IconTag, IconExchange, IconGift, IconUsers } from '../assets/icons';

export default function Transactions() {
    const { t } = useTranslation();
    const [filter, setFilter] = useState('');
    const { data, loading } = useApi('/transactions', filter ? { type: filter } : {}, [filter]);

    const types = ['', 'deposit', 'withdrawal', 'buy', 'sell', 'transfer_in', 'transfer_out', 'airdrop', 'referral_earning'];
    const typeLabels = { '': t('transactions.all'), deposit: t('transactions.deposit'), withdrawal: t('transactions.withdrawal'), buy: t('transactions.buy'), sell: t('transactions.sell'), transfer_in: t('transactions.transfer_in'), transfer_out: t('transactions.transfer_out'), airdrop: t('transactions.airdrop'), referral_earning: t('transactions.referral') };

    // Aesthetic Maps
    const typeStyles = {
        deposit: { icon: IconArrowDownLeft, color: 'var(--success)', bg: 'rgba(52, 199, 89, 0.1)' },
        withdrawal: { icon: IconArrowUpRight, color: 'var(--text-primary)', bg: 'var(--bg-elevated)' },
        buy: { icon: IconShoppingCart, color: 'var(--warning)', bg: 'rgba(255, 149, 0, 0.1)' },
        sell: { icon: IconTag, color: 'var(--success)', bg: 'rgba(52, 199, 89, 0.1)' },
        transfer_in: { icon: IconExchange, color: 'var(--accent)', bg: 'rgba(0, 122, 255, 0.1)' },
        transfer_out: { icon: IconExchange, color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
        airdrop: { icon: IconGift, color: '#FF2D55', bg: 'rgba(255, 45, 85, 0.1)' },
        referral_earning: { icon: IconUsers, color: 'var(--success)', bg: 'rgba(52, 199, 89, 0.1)' },
        default: { icon: IconTag, color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' }
    };

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
                <div className="flex-col gap-12">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 20 }} />)}</div>
            ) : data?.transactions?.length > 0 ? (
                <div className="flex-col gap-12">
                    {data.transactions.map(tx => {
                        const style = typeStyles[tx.type] || typeStyles.default;
                        const Icon = style.icon;
                        const isPositive = ['sell', 'deposit', 'referral_earning', 'airdrop', 'transfer_in'].includes(tx.type);

                        return (
                            <div key={tx._id} className="card flex items-center gap-16" style={{ padding: '16px', borderRadius: 20 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 16,
                                    background: style.bg, color: style.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Icon size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 2 }}>
                                        {typeLabels[tx.type] || tx.type}
                                    </p>
                                    <p className="caption" style={{ fontSize: 13, textTransform: 'capitalize' }}>
                                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {tx.amount > 0 && (
                                        <p style={{ fontWeight: 700, fontSize: 16, color: isPositive ? 'var(--success)' : 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 2 }}>
                                            {isPositive ? '+' : '-'}{(tx.amount / 1e9).toFixed(2)} TON
                                        </p>
                                    )}
                                    <span style={{ fontSize: 11, color: statusColors[tx.status], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t(`transactions.${tx.status}`)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state" style={{ padding: '60px 0', opacity: 0.6 }}>
                    <IconExchange size={48} style={{ marginBottom: 16, color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: 16, fontWeight: 500 }}>{t('transactions.no_transactions')}</p>
                </div>
            )}
        </div>
    );
}
