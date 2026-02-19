import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../hooks/useApi';
import api from '../../services/api';

export default function Dashboard() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('stats');
    const { data: stats } = useApi('/admin/stats');
    const { data: collections, refetch: refetchCollections } = useApi('/admin/collections');
    const { data: series, refetch: refetchSeries } = useApi('/admin/series');
    const { data: presales, refetch: refetchPresales } = useApi('/admin/presales');
    const { data: usersData, refetch: refetchUsers } = useApi('/admin/users');
    const { data: withdrawals, refetch: refetchWithdrawals } = useApi('/admin/withdrawals');
    const { data: apiKeys, refetch: refetchApiKeys } = useApi('/admin/api-keys');

    const tabs = ['stats', 'collections', 'series', 'presales', 'users', 'withdrawals', 'api_keys'];

    const handleDelete = async (type, id) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/admin/${type}/${id}`);
            if (type === 'collections') refetchCollections();
            if (type === 'series') refetchSeries();
            if (type === 'presales') refetchPresales();
            if (type === 'api-keys') refetchApiKeys();
        } catch (e) { alert(e?.error || 'Failed'); }
    };

    const handleWithdrawal = async (id, action) => {
        try {
            await api.post(`/admin/withdrawals/${id}/${action}`);
            refetchWithdrawals();
        } catch (e) { alert(e?.error || 'Failed'); }
    };

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('admin.title')}</h1>

            <div className="scroll-h" style={{ marginBottom: 20 }}>
                {tabs.map(tabName => (
                    <button key={tabName} className={`btn btn-sm ${tab === tabName ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setTab(tabName)} style={{ whiteSpace: 'nowrap' }}>
                        {t(`admin.${tabName}`)}
                    </button>
                ))}
            </div>

            {/* Stats */}
            {tab === 'stats' && stats && (
                <div className="grid-2" style={{ marginBottom: 24 }}>
                    {[
                        { label: t('admin.total_users'), value: stats.userCount },
                        { label: t('admin.total_nfts'), value: stats.nftCount },
                        { label: t('admin.total_orders'), value: stats.orderCount },
                        { label: t('admin.total_volume'), value: `${(stats.totalVolume / 1e9).toFixed(0)} TON` },
                        { label: t('admin.pending_withdrawals'), value: stats.pendingWithdrawals },
                    ].map(({ label, value }) => (
                        <div key={label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <p className="stat-value">{value}</p>
                            <p className="stat-label">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Collections */}
            {tab === 'collections' && (
                <div className="flex-col gap-8">
                    {collections?.map(col => (
                        <div key={col._id} className="card flex items-center justify-between" style={{ padding: '12px 14px' }}>
                            <div>
                                <p style={{ fontWeight: 600 }}>{col.name}</p>
                                <p className="caption">{col.slug}</p>
                            </div>
                            <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('collections', col._id)}>{t('admin.delete')}</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Series */}
            {tab === 'series' && (
                <div className="flex-col gap-8">
                    {series?.map(s => (
                        <div key={s._id} className="card flex items-center justify-between" style={{ padding: '12px 14px' }}>
                            <div>
                                <p style={{ fontWeight: 600 }}>{s.name}</p>
                                <p className="caption">{s.collection?.name} — {s.mintedCount}/{s.totalSupply} — Royalty: {s.royaltyPercent}%</p>
                            </div>
                            <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('series', s._id)}>{t('admin.delete')}</button>
                        </div>
                    ))}
                </div>
            )}

            {/* PreSales */}
            {tab === 'presales' && (
                <div className="flex-col gap-8">
                    {presales?.map(ps => (
                        <div key={ps._id} className="card" style={{ padding: '12px 14px' }}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p style={{ fontWeight: 600 }}>{ps.name}</p>
                                    <p className="caption">{ps.soldCount}/{ps.totalSupply} sold — {ps.isActive ? 'Active' : 'Inactive'}</p>
                                </div>
                                <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('presales', ps._id)}>{t('admin.delete')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Users */}
            {tab === 'users' && (
                <div className="flex-col gap-4">
                    {usersData?.users?.map(u => (
                        <div key={u._id} className="card flex items-center gap-12" style={{ padding: '10px 14px' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 500, fontSize: 13 }}>@{u.username || 'user'} — {u.firstName}</p>
                                <p className="caption">Balance: {(u.balance / 1e9).toFixed(2)} TON | NFTs: {u.telegramId}</p>
                            </div>
                            <span className={`tag ${u.isAdmin ? '' : ''}`}>{u.isAdmin ? 'Admin' : 'User'}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Withdrawals */}
            {tab === 'withdrawals' && (
                <div className="flex-col gap-8">
                    {withdrawals?.map(tx => (
                        <div key={tx._id} className="card" style={{ padding: '12px 14px' }}>
                            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                                <div>
                                    <p style={{ fontWeight: 600 }}>{(tx.amount / 1e9).toFixed(4)} TON</p>
                                    <p className="caption">@{tx.user?.username} — {tx.memo}</p>
                                </div>
                                <span className="tag">{tx.status}</span>
                            </div>
                            {tx.status === 'pending' && (
                                <div className="flex gap-8">
                                    <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={() => handleWithdrawal(tx._id, 'approve')}>{t('admin.approve')}</button>
                                    <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => handleWithdrawal(tx._id, 'reject')}>{t('admin.reject')}</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* API Keys */}
            {tab === 'api_keys' && (
                <div className="flex-col gap-8">
                    {apiKeys?.map(ak => (
                        <div key={ak._id} className="card" style={{ padding: '12px 14px' }}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p style={{ fontWeight: 600 }}>{ak.name}</p>
                                    <p className="caption" style={{ fontFamily: 'monospace', fontSize: 10 }}>{ak.key}</p>
                                    <p className="caption">Requests: {ak.totalRequests} — {ak.isActive ? 'Active' : 'Inactive'}</p>
                                </div>
                                <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('api-keys', ak._id)}>{t('admin.delete')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
