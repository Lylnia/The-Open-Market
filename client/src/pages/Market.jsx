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
    const [seriesId, setSeriesId] = useState('');
    const [sort, setSort] = useState('price_asc');

    // Custom Select state
    const [showSeriesSelect, setShowSeriesSelect] = useState(false);
    const [showSortSelect, setShowSortSelect] = useState(false);

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

    // Fetch series for dropdown
    const { data: seriesData } = useApi('/series', { limit: 100 });
    const seriesList = Array.isArray(seriesData) ? seriesData : seriesData?.data || [];

    const fetchNfts = async (pageNum, reset = false) => {
        setIsLoading(true);
        try {
            const params = { listed: 'true', limit: 20, page: pageNum, sort };
            if (debouncedSearch) params.search = debouncedSearch;
            if (seriesId) params.series = seriesId;

            const res = await api.get('/nfts', { params });
            const validNfts = res.data.nfts.filter(nft => nft.listPrice > 0);

            if (reset || pageNum === 1) {
                setNfts(validNfts);
            } else {
                setNfts(prev => {
                    const newItems = validNfts.filter(n => !prev.some(p => p._id === n._id));
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
    }, [debouncedSearch, seriesId, sort]);

    // Fetch more pages
    useEffect(() => {
        if (page > 1) {
            fetchNfts(page);
        }
    }, [page]);

    // Apply scroll lock when modals are open
    useEffect(() => {
        if (showSeriesSelect || showSortSelect) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showSeriesSelect, showSortSelect]);

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

            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-base)', padding: '16px 0 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    <div
                        style={{ position: 'relative', background: 'var(--bg-elevated)', borderRadius: 16, height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', cursor: 'pointer' }}
                        onClick={() => setShowSeriesSelect(true)}
                    >
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Series</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {seriesId ? seriesList.find(s => s._id === seriesId)?.name : 'All Series'}
                        </span>
                    </div>

                    <div
                        style={{ position: 'relative', background: 'var(--bg-elevated)', borderRadius: 16, height: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px', cursor: 'pointer' }}
                        onClick={() => setShowSortSelect(true)}
                    >
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Sort</span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {sort === 'price_asc' && 'Price: Ascending'}
                            {sort === 'price_desc' && 'Price: Descending'}
                            {sort === 'number_asc' && 'Number: Ascending'}
                            {sort === 'number_desc' && 'Number: Descending'}
                        </span>
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

            {/* Custom Modals for Selects */}
            {showSeriesSelect && (
                <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowSeriesSelect(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h3 className="h3" style={{ marginBottom: 16 }}>Select Series</h3>
                        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                                className={`btn ${!seriesId ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ justifyContent: 'flex-start', padding: '16px 20px' }}
                                onClick={() => { setSeriesId(''); setShowSeriesSelect(false); }}
                            >
                                All Series
                            </button>
                            {seriesList.map(s => (
                                <button
                                    key={s._id}
                                    className={`btn ${seriesId === s._id ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start', padding: '16px 20px' }}
                                    onClick={() => { setSeriesId(s._id); setShowSeriesSelect(false); }}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showSortSelect && (
                <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowSortSelect(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-handle" />
                        <h3 className="h3" style={{ marginBottom: 16 }}>Sort By</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { value: 'price_asc', label: 'Price: Ascending' },
                                { value: 'price_desc', label: 'Price: Descending' },
                                { value: 'number_asc', label: 'Number: Ascending' },
                                { value: 'number_desc', label: 'Number: Descending' },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    className={`btn ${sort === option.value ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start', padding: '16px 20px' }}
                                    onClick={() => { setSort(option.value); setShowSortSelect(false); }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
