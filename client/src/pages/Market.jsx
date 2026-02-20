import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import api from '../services/api';
import { IconSearch, IconPresale } from '../assets/icons';
import { useSocket } from '../hooks/useSocket';

export default function Market() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [collection, setCollection] = useState('');
    const [sort, setSort] = useState('ascending');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const [nfts, setNfts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch collections for dropdown
    const { data: collectionsData } = useApi('/collections', { limit: 100 });
    const collections = collectionsData?.data || [];

    const fetchNfts = async (pageNum, reset = false) => {
        setIsLoading(true);
        try {
            const params = { listed: 'true', limit: 20, page: pageNum, sort };
            if (debouncedSearch) params.search = debouncedSearch;
            if (collection) params.collection = collection;

            const res = await api.get('/nfts', { params });
            if (reset || pageNum === 1) {
                setNfts(res.data.nfts);
            } else {
                setNfts(prev => {
                    const newItems = res.data.nfts.filter(n => !prev.some(p => p._id === n._id));
                    return [...prev, ...newItems];
                });
            }
            setHasMore(pageNum < res.data.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch NFTs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Refetch when filters change
    useEffect(() => {
        setPage(1);
        fetchNfts(1, true);
    }, [debouncedSearch, collection, sort]);

    // Fetch more pages
    useEffect(() => {
        if (page > 1) {
            fetchNfts(page);
        }
    }, [page]);

    const observer = useRef();
    const lastElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore]);

    // Listen to real-time socket events for sold NFTs
    useSocket({
        'nft:sold': ({ nftId }) => {
            setNfts(prev => prev.filter(nft => nft._id !== nftId));
        }
    });

    return (
        <div className="page" style={{ paddingBottom: 100 }}>
            <h1 className="h1" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.6px', marginBottom: 16 }}>{t('market.title', 'Market')}</h1>

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
                        <span style={{ position: 'absolute', top: 8, left: 12, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Collections</span>
                        <select
                            className="input"
                            style={{ paddingTop: 24, paddingBottom: 8, paddingLeft: 12, height: 56, borderRadius: 16, background: 'var(--bg-elevated)', border: 'none', appearance: 'none', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}
                            value={collection}
                            onChange={e => setCollection(e.target.value)}
                        >
                            <option value="">All Collections</option>
                            {collections.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
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
                            <option value="ascending">Ascending</option>
                            <option value="descending">Descending</option>
                        </select>
                    </div>
                </div>
            </div>

            {(nfts || []).length === 0 && isLoading ? (
                <div className="grid-2">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div>
            ) : (nfts || []).length > 0 ? (
                <div className="grid-2">
                    {(nfts || []).map((nft, idx) => {
                        const isLastElement = (nfts || []).length === idx + 1;
                        return (
                            <Link ref={isLastElement ? lastElementRef : null} key={`${nft._id}-${idx}`} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
                                    <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                                        {nft?.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft?.series?.name} #{nft?.mintNumber}</p>
                                        <div className="flex items-center justify-between">
                                            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--accent)' }}>{(nft.listPrice / 1e9).toFixed(2)} TON</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state" style={{ padding: '60px 0', opacity: 0.6 }}>
                    <IconPresale size={32} style={{ marginBottom: 12, color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: 16, fontWeight: 500 }}>No TON listings found</p>
                </div>
            )}

            {isLoading && nfts.length > 0 && (
                <div className="flex justify-center" style={{ padding: '24px 0' }}>
                    <div className="spinner" style={{ width: 24, height: 24 }} />
                </div>
            )}
        </div>
    );
}
