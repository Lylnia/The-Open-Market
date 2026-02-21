import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { IconPlus } from '../../assets/icons';

// Reusable form field
function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <label className="caption" style={{ display: 'block', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );
}

// ========== COLLECTION FORM ==========
function CollectionForm({ onSuccess, editData, onCancel }) {
    const [form, setForm] = useState(editData || {
        name: '', slug: '', logoUrl: '', bannerUrl: '', order: 0, isActive: true,
        description: { tr: '', en: '', ru: '' },
    });
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            if (editData?._id) {
                await api.put(`/admin/collections/${editData._id}`, form);
            } else {
                await api.post('/admin/collections', form);
            }
            onSuccess();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Error', 'error'); }
        finally { setLoading(false); }
    };

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const setDesc = (lang, val) => setForm(prev => ({ ...prev, description: { ...prev.description, [lang]: val } }));

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 className="h3" style={{ marginBottom: 16 }}>{editData ? 'Koleksiyon Düzenle' : 'Yeni Koleksiyon'}</h3>
            <Field label="Koleksiyon Adı *">
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Alpha Club" />
            </Field>
            <Field label="Slug * (URL'de kullanılacak)">
                <input className="input" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="Örn: alpha-club" />
            </Field>
            <Field label="Logo URL">
                <input className="input" value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Banner URL">
                <input className="input" value={form.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Sıralama">
                <input className="input" type="number" value={form.order} onChange={e => set('order', parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="Açıklama (TR)">
                <input className="input" value={form.description.tr} onChange={e => setDesc('tr', e.target.value)} placeholder="Türkçe açıklama" />
            </Field>
            <Field label="Açıklama (EN)">
                <input className="input" value={form.description.en} onChange={e => setDesc('en', e.target.value)} placeholder="English description" />
            </Field>
            <Field label="Açıklama (RU)">
                <input className="input" value={form.description.ru} onChange={e => setDesc('ru', e.target.value)} placeholder="Описание" />
            </Field>
            <div className="flex gap-8">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !form.name || !form.slug}>
                    {loading ? '...' : editData ? 'Kaydet' : 'Oluştur'}
                </button>
                {onCancel && <button className="btn btn-secondary" onClick={onCancel}>İptal</button>}
            </div>
        </div>
    );
}

// ========== SERIES FORM ==========
function SeriesForm({ collections, onSuccess, editData, onCancel }) {
    const [form, setForm] = useState(editData || {
        name: '', slug: '', collection: '', imageUrl: '',
        totalSupply: '', royaltyPercent: 5, isActive: true,
        description: { tr: '', en: '', ru: '' },
    });
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const payload = { ...form, totalSupply: parseInt(form.totalSupply) };
            if (editData?._id) {
                await api.put(`/admin/series/${editData._id}`, payload);
            } else {
                await api.post('/admin/series', payload);
            }
            onSuccess();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Error', 'error'); }
        finally { setLoading(false); }
    };

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const setDesc = (lang, val) => setForm(prev => ({ ...prev, description: { ...prev.description, [lang]: val } }));

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 className="h3" style={{ marginBottom: 16 }}>{editData ? 'Seri Düzenle' : 'Yeni Seri'}</h3>
            <Field label="Seri Adı *">
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Genesis" />
            </Field>
            <Field label="Slug *">
                <input className="input" value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="Örn: genesis" />
            </Field>
            <Field label="Koleksiyon *">
                <select className="input" value={form.collection} onChange={e => set('collection', e.target.value)}>
                    <option value="">Koleksiyon Seç</option>
                    {collections?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
            </Field>
            <Field label="Görsel URL">
                <input className="input" value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Toplam Arz *">
                <input className="input" type="number" value={form.totalSupply} onChange={e => set('totalSupply', e.target.value)} placeholder="Örn: 100" />
            </Field>

            <Field label="Royalty % (2. el satış komisyonu)">
                <input className="input" type="number" step="1" min="0" max="50" value={form.royaltyPercent} onChange={e => set('royaltyPercent', parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="Açıklama (TR)">
                <input className="input" value={form.description.tr} onChange={e => setDesc('tr', e.target.value)} />
            </Field>
            <Field label="Açıklama (EN)">
                <input className="input" value={form.description.en} onChange={e => setDesc('en', e.target.value)} />
            </Field>
            <Field label="Açıklama (RU)">
                <input className="input" value={form.description.ru} onChange={e => setDesc('ru', e.target.value)} />
            </Field>
            <div className="flex gap-8">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}
                    disabled={loading || !form.name || !form.slug || !form.collection || !form.totalSupply}>
                    {loading ? '...' : editData ? 'Kaydet' : 'Oluştur'}
                </button>
                {onCancel && <button className="btn btn-secondary" onClick={onCancel}>İptal</button>}
            </div>
        </div>
    );
}

// ========== PRESALE FORM ==========
function PreSaleForm({ seriesList, onSuccess, onCancel }) {
    const [form, setForm] = useState({
        name: '', series: '', price: '', totalSupply: '', maxPerUser: 5,
        startDate: '', endDate: '',
    });
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await api.post('/admin/presales', {
                ...form,
                price: Math.round(parseFloat(form.price) * 1e9),
                totalSupply: parseInt(form.totalSupply),
                maxPerUser: parseInt(form.maxPerUser),
            });
            onSuccess();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Error', 'error'); }
        finally { setLoading(false); }
    };

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 className="h3" style={{ marginBottom: 16 }}>Yeni Ön Satış</h3>
            <Field label="Ön Satış Adı *">
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: Genesis Pre-Sale" />
            </Field>
            <Field label="Seri *">
                <select className="input" value={form.series} onChange={e => set('series', e.target.value)}>
                    <option value="">Seri Seç</option>
                    {seriesList?.map(s => <option key={s._id} value={s._id}>{s.name} ({s.collection?.name})</option>)}
                </select>
            </Field>
            <Field label="Fiyat (TON) *">
                <input className="input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="1.5" />
            </Field>
            <Field label="Ön Satış Miktarı *">
                <input className="input" type="number" value={form.totalSupply} onChange={e => set('totalSupply', e.target.value)} placeholder="50" />
            </Field>
            <Field label="Kişi Başı Maksimum">
                <input className="input" type="number" value={form.maxPerUser} onChange={e => set('maxPerUser', e.target.value)} />
            </Field>
            <Field label="Başlangıç Tarihi *">
                <input className="input" type="datetime-local" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </Field>
            <Field label="Bitiş Tarihi *">
                <input className="input" type="datetime-local" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </Field>
            <div className="flex gap-8">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}
                    disabled={loading || !form.name || !form.series || !form.price || !form.totalSupply || !form.startDate || !form.endDate}>
                    {loading ? '...' : 'Oluştur'}
                </button>
                {onCancel && <button className="btn btn-secondary" onClick={onCancel}>İptal</button>}
            </div>
        </div>
    );
}

// ========== AIRDROP FORM ==========
function AirdropForm({ seriesList, onSuccess, onCancel }) {
    const [seriesId, setSeriesId] = useState('');
    const [usernames, setUsernames] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const userIds = usernames.split(',').map(u => u.trim()).filter(Boolean);
            const res = await api.post('/admin/airdrop', { seriesId, userIds });
            if (typeof showToast === 'function') showToast(`${res.data.airdropped} NFT airdropped!`, 'success');
            onSuccess();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Error', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 className="h3" style={{ marginBottom: 16 }}>Airdrop</h3>
            <Field label="Seri *">
                <select className="input" value={seriesId} onChange={e => setSeriesId(e.target.value)}>
                    <option value="">Seri Seç</option>
                    {seriesList?.map(s => <option key={s._id} value={s._id}>{s.name} (Kalan: {s.totalSupply - s.mintedCount})</option>)}
                </select>
            </Field>
            <Field label="Kullanıcı ID'leri * (virgülle ayır)">
                <input className="input" value={usernames} onChange={e => setUsernames(e.target.value)} placeholder="userId1, userId2, userId3" />
            </Field>
            <div className="flex gap-8">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !seriesId || !usernames}>
                    {loading ? '...' : 'Airdrop Gönder'}
                </button>
                {onCancel && <button className="btn btn-secondary" onClick={onCancel}>İptal</button>}
            </div>
        </div>
    );
}
// ========== API KEY FORM ==========
function ApiKeyForm({ onSuccess, onCancel }) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await api.post('/admin/api-keys', { name });
            if (typeof showToast === 'function') showToast('API Key created successfully', 'success');
            onSuccess();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Error', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 className="h3" style={{ marginBottom: 16 }}>Yeni API Key</h3>
            <Field label="Uygulama / Geliştirici Adı *">
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: My Telegram Bot" />
            </Field>
            <div className="flex gap-8">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !name}>
                    {loading ? '...' : 'Oluştur'}
                </button>
                {onCancel && <button className="btn btn-secondary" onClick={onCancel}>İptal</button>}
            </div>
        </div>
    );
}
// ========== MAIN DASHBOARD ==========
export default function Dashboard() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('stats');
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const { showToast } = useToast();

    const { data: stats } = useApi('/admin/stats');
    const { data: collections, refetch: refetchCollections } = useApi(tab === 'collections' || tab === 'series' ? '/admin/collections' : null);
    const { data: series, refetch: refetchSeries } = useApi(tab === 'series' || tab === 'presales' || tab === 'airdrop' ? '/admin/series' : null);
    const { data: presales, refetch: refetchPresales } = useApi(tab === 'presales' ? '/admin/presales' : null);
    const { data: usersData } = useApi(tab === 'users' ? '/admin/users' : null);
    const { data: withdrawals, refetch: refetchWithdrawals } = useApi(tab === 'withdrawals' ? '/admin/withdrawals' : null);
    const { data: apiKeys, refetch: refetchApiKeys } = useApi(tab === 'api_keys' ? '/admin/api-keys' : null);

    const tabs = ['stats', 'collections', 'series', 'presales', 'users', 'withdrawals', 'airdrop', 'api_keys'];

    const handleDelete = async (type, id) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/admin/${type}/${id}`);
            if (type === 'collections') refetchCollections();
            if (type === 'series') refetchSeries();
            if (type === 'presales') refetchPresales();
            if (type === 'api-keys') refetchApiKeys();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Failed', 'error'); }
    };

    const handleWithdrawal = async (id, action) => {
        try {
            await api.post(`/admin/withdrawals/${id}/${action}`);
            refetchWithdrawals();
        } catch (e) { if (typeof showToast === 'function') showToast(e?.error || 'Failed', 'error'); }
    };

    const closeForm = () => { setShowForm(false); setEditItem(null); };

    return (
        <div className="page" style={{ padding: 0, display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
            {/* Sidebar Desktop / Topbar Mobile */}
            <div style={{
                width: '100%', maxWidth: 240, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10,
                overflowY: 'auto'
            }} className="admin-sidebar hidden-mobile">
                <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
                    <h1 className="h2" style={{ fontSize: 22 }}>Admin Panel</h1>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tabs.map(tabName => (
                        <button key={tabName}
                            className={`btn ${tab === tabName ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                justifyContent: 'flex-start', padding: '12px 16px', borderRadius: 12,
                                background: tab === tabName ? 'var(--accent)' : 'transparent',
                                color: tab === tabName ? '#fff' : 'var(--text-primary)',
                                border: 'none'
                            }}
                            onClick={() => { setTab(tabName); closeForm(); }}>
                            {t(`admin.${tabName}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Top Navigation */}
            <div className="admin-mobile-nav display-mobile" style={{
                position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)', padding: '12px 16px'
            }}>
                <h1 className="h2" style={{ fontSize: 20, marginBottom: 12 }}>Admin Panel</h1>
                <div className="scroll-h">
                    {tabs.map(tabName => (
                        <button key={tabName} className={`btn btn-sm ${tab === tabName ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => { setTab(tabName); closeForm(); }} style={{ whiteSpace: 'nowrap' }}>
                            {t(`admin.${tabName}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="admin-content" style={{ flex: 1, padding: '24px', marginLeft: 'var(--admin-sidebar-width, 0)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>

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
                        <>
                            {!showForm && (
                                <button className="btn btn-primary btn-block flex items-center justify-center gap-8" style={{ marginBottom: 16 }}
                                    onClick={() => setShowForm(true)}>
                                    <IconPlus size={16} /> Yeni Koleksiyon
                                </button>
                            )}
                            {(showForm || editItem) && (
                                <CollectionForm
                                    editData={editItem}
                                    onSuccess={() => { closeForm(); refetchCollections(); }}
                                    onCancel={closeForm}
                                />
                            )}
                            <div className="flex-col gap-8">
                                {collections?.map(col => (
                                    <div key={col._id} className="card flex items-center justify-between" style={{ padding: '12px 14px' }}>
                                        <div className="flex items-center gap-12" style={{ flex: 1 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
                                                {col.logoUrl && <img src={col.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600 }}>{col.name}</p>
                                                <p className="caption">{col.slug}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(col); setShowForm(false); }}>Düzenle</button>
                                            <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('collections', col._id)}>Sil</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Series */}
                    {tab === 'series' && (
                        <>
                            {!showForm && (
                                <button className="btn btn-primary btn-block flex items-center justify-center gap-8" style={{ marginBottom: 16 }}
                                    onClick={() => setShowForm(true)}>
                                    <IconPlus size={16} /> Yeni Seri
                                </button>
                            )}
                            {(showForm || editItem) && (
                                <SeriesForm
                                    collections={collections}
                                    editData={editItem}
                                    onSuccess={() => { closeForm(); refetchSeries(); }}
                                    onCancel={closeForm}
                                />
                            )}
                            <div className="flex-col gap-8">
                                {series?.map(s => (
                                    <div key={s._id} className="card" style={{ padding: '12px 14px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-12">
                                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
                                                    {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-8">
                                                        <p style={{ fontWeight: 600 }}>{s.name}</p>
                                                    </div>
                                                    <p className="caption">{s.collection?.name} — {s.mintedCount}/{s.totalSupply} — Royalty: {s.royaltyPercent}%</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setEditItem(s); setShowForm(false); }}>Düzenle</button>
                                                <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('series', s._id)}>Sil</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* PreSales */}
                    {tab === 'presales' && (
                        <>
                            {!showForm && (
                                <button className="btn btn-primary btn-block flex items-center justify-center gap-8" style={{ marginBottom: 16 }}
                                    onClick={() => setShowForm(true)}>
                                    <IconPlus size={16} /> Yeni Ön Satış
                                </button>
                            )}
                            {showForm && (
                                <PreSaleForm
                                    seriesList={series}
                                    onSuccess={() => { closeForm(); refetchPresales(); }}
                                    onCancel={closeForm}
                                />
                            )}
                            <div className="flex-col gap-8">
                                {presales?.map(ps => {
                                    const progress = ps.totalSupply > 0 ? (ps.soldCount / ps.totalSupply) * 100 : 0;
                                    return (
                                        <div key={ps._id} className="card" style={{ padding: '12px 14px' }}>
                                            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                                                <div>
                                                    <p style={{ fontWeight: 600 }}>{ps.name}</p>
                                                    <p className="caption">{ps.series?.name} — {(ps.price / 1e9).toFixed(2)} TON</p>
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <span className="tag">{ps.isActive ? 'Aktif' : 'Pasif'}</span>
                                                    <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleDelete('presales', ps._id)}>Sil</button>
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: 4 }} className="flex justify-between">
                                                <span className="caption">Satılan: {ps.soldCount}/{ps.totalSupply}</span>
                                                <span className="caption">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Users */}
                    {tab === 'users' && (
                        <div className="flex-col gap-4">
                            {usersData?.users?.map(u => (
                                <div key={u._id} className="card flex items-center gap-12" style={{ padding: '10px 14px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 500, fontSize: 13 }}>@{u.username || 'user'} — {u.firstName}</p>
                                        <p className="caption">Bakiye: {(u.balance / 1e9).toFixed(2)} TON | TG ID: {u.telegramId}</p>
                                    </div>
                                    <span className="tag">{u.isAdmin ? 'Admin' : 'User'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Withdrawals */}
                    {tab === 'withdrawals' && (
                        <div className="flex-col gap-8">
                            {withdrawals?.length === 0 && <div className="empty-state"><p>Bekleyen çekim yok</p></div>}
                            {withdrawals?.map(tx => (
                                <div key={tx._id} className="card" style={{ padding: '16px', borderRadius: 16 }}>
                                    <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{(tx.amount / 1e9).toFixed(4)} TON</p>
                                            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginTop: 4 }}>@{tx.user?.username}</p>
                                        </div>
                                        <span className="tag" style={{
                                            background: tx.status === 'pending' ? 'rgba(255, 149, 0, 0.1)' : tx.status === 'completed' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                                            color: tx.status === 'pending' ? 'var(--warning)' : tx.status === 'completed' ? 'var(--success)' : 'var(--error)'
                                        }}>{tx.status}</span>
                                    </div>

                                    <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                                        <p className="caption" style={{ marginBottom: 2 }}>Wallet Address (Memo):</p>
                                        <p style={{ fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all', userSelect: 'all' }}>
                                            {tx.memo || 'No memo provided'}
                                        </p>
                                    </div>

                                    {tx.status === 'pending' && (
                                        <div className="flex gap-8">
                                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--success)', border: 'none', color: '#fff' }} onClick={() => handleWithdrawal(tx._id, 'approve')}>Onayla</button>
                                            <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handleWithdrawal(tx._id, 'reject')}>Reddet</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Airdrop */}
                    {tab === 'airdrop' && (
                        <AirdropForm
                            seriesList={series}
                            onSuccess={() => { }}
                            onCancel={null}
                        />
                    )}

                    {/* API Keys */}
                    {tab === 'api_keys' && (
                        <>
                            {!showForm && (
                                <button className="btn btn-primary btn-block flex items-center justify-center gap-8" style={{ marginBottom: 16 }}
                                    onClick={() => setShowForm(true)}>
                                    <IconPlus size={16} /> Yeni API Key
                                </button>
                            )}
                            {showForm && (
                                <ApiKeyForm
                                    onSuccess={() => { closeForm(); refetchApiKeys(); }}
                                    onCancel={closeForm}
                                />
                            )}
                            <div className="flex-col gap-8">
                                {apiKeys?.map(ak => (
                                    <div key={ak._id} className="card" style={{ padding: '16px', borderRadius: 16 }}>
                                        <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: 16 }}>{ak.name}</p>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>İstek Sayısı: {ak.totalRequests}</p>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <span className="tag" style={{ background: ak.isActive ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: ak.isActive ? 'var(--success)' : 'var(--error)' }}>
                                                    {ak.isActive ? 'Aktif' : 'Pasif'}
                                                </span>
                                                <button className="btn btn-sm" style={{ color: 'var(--error)', padding: '6px 12px' }} onClick={() => handleDelete('api-keys', ak._id)}>Sil</button>
                                            </div>
                                        </div>
                                        <div style={{ background: 'var(--bg-base)', padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <code style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--text-primary)' }}>{ak.key}</code>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* End of Main Content Area */}
                </div>
            </div>
        </div>
    );
}
