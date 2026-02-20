import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useTelegram } from '../hooks/useTelegram';
import { useEffect, useState, useMemo } from 'react';
import { IconSearch, IconPresale } from '../assets/icons';

export default function Inventory() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: nfts, loading } = useApi('/user/nfts');
    const { tg, showBackButton } = useTelegram();

    const [search, setSearch] = useState('');
    const [seriesId, setSeriesId] = useState('');
    const [sort, setSort] = useState('number_asc');

    useEffect(() => {
        showBackButton(true);
        const handleBack = () => { navigate(-1); };
        tg?.BackButton?.onClick(handleBack);

        return () => {
            showBackButton(false);
            tg?.BackButton?.offClick(handleBack);
        };
    }, []);

    const userSeriesList = useMemo(() => {
        const list = [];
        const set = new Set();
        (nfts || []).forEach(n => {
            if (n.series && !set.has(n.series._id)) {
                set.add(n.series._id);
                list.push(n.series);
            }
        });
        return list;
    }, [nfts]);

    const filteredNfts = useMemo(() => {
        let arr = nfts ? [...nfts] : [];
        if (search.trim()) {
            const s = search.toLowerCase();
            arr = arr.filter(n => n.series?.name?.toLowerCase().includes(s) || n.mintNumber.toString().includes(s));
        }
        if (seriesId) {
            arr = arr.filter(n => n.series?._id === seriesId);
        }
        if (sort === 'price_asc') arr.sort((a, b) => a.listPrice - b.listPrice);
        if (sort === 'price_desc') arr.sort((a, b) => b.listPrice - a.listPrice);
        if (sort === 'number_asc') arr.sort((a, b) => a.mintNumber - b.mintNumber);
        if (sort === 'number_desc') arr.sort((a, b) => b.mintNumber - a.mintNumber);
        return arr;
    }, [nfts, search, seriesId, sort]);

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;

    return (
        <div className="page" style={{ paddingBottom: 100 }}>
            <h1 className="h2" style={{ marginBottom: 20 }}>My Inventory</h1>

            <div className="card" style={{ padding: '16px', marginBottom: 24, textAlign: 'center', background: 'var(--bg-elevated)' }}>
                <p className="overline" style={{ fontSize: 12, marginBottom: 4 }}>TOTAL NFTs</p>
                <p style={{ fontSize: 32, fontWeight: 700 }}>{nfts?.length || 0}</p>
            </div>

            <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                    <IconSearch size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input"
                        style={{ paddingLeft: 44, borderRadius: 16, height: 48, fontSize: 16, background: 'var(--bg-elevated)', border: 'none' }}
                        placeholder="Name or ID"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Series</span>
                        <select
                            className="input"
                            style={{ paddingTop: 24, paddingBottom: 8, paddingLeft: 12, height: 56, borderRadius: 16, background: 'var(--bg-elevated)', border: 'none', appearance: 'none', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}
                            value={seriesId}
                            onChange={e => setSeriesId(e.target.value)}
                        >
                            <option value="">All Series</option>
                            {userSeriesList.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Sort</span>
                        <select
                            className="input"
                            style={{ paddingTop: 24, paddingBottom: 8, paddingLeft: 12, height: 56, borderRadius: 16, background: 'var(--bg-elevated)', border: 'none', appearance: 'none', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                        >
                            <option value="number_asc">Number: Ascending</option>
                            <option value="number_desc">Number: Descending</option>
                        </select>
                    </div>
                </div>
            </div>

            {filteredNfts.length > 0 ? (
                <div className="grid-2">
                    {filteredNfts.map((nft, idx) => (
                        <Link key={`${nft._id}-${idx}`} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
                                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                                    {nft?.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ padding: '12px' }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft?.series?.name} #{nft?.mintNumber}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="badge" style={{ fontSize: 10, background: nft.isListed ? 'var(--accent-dim)' : 'var(--bg-input)', color: nft.isListed ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                            {nft.isListed ? `Listed: ${(nft.listPrice / 1e9).toFixed(2)}` : 'Not Listed'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <IconPresale size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p>No NFTs match your filters.</p>
                </div>
            )}
        </div>
    );
}
