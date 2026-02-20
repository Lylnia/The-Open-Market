import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import api from '../services/api';
import { IconSearch } from '../assets/icons';
import { useSocket } from '../hooks/useSocket';

export default function Market() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [nfts, setNfts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const { data: searchResults } = useApi(search.length >= 2 ? '/search' : null, search.length >= 2 ? { q: search } : {}, [search]);
    const observer = useRef();

    const fetchNfts = async (pageNum) => {
        setIsLoading(true);
        try {
            const res = await api.get('/nfts', { params: { listed: 'true', limit: 20, page: pageNum } });
            if (pageNum === 1) {
                setNfts(res.data.nfts);
            } else {
                setNfts(prev => [...prev, ...res.data.nfts]);
            }
            setHasMore(pageNum < res.data.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch NFTs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch if not searching
        if (search.length < 2) {
            fetchNfts(1);
            setPage(1);
        }
    }, [search]);

    useEffect(() => {
        if (page > 1 && search.length < 2) {
            fetchNfts(page);
        }
    }, [page]);

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
            // Remove the sold NFT from the market feed
            setNfts(prev => prev.filter(nft => nft._id !== nftId));
        }
    });

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('market.title')}</h1>

            <div style={{ position: 'relative', marginBottom: 24, padding: '0 4px' }}>
                <IconSearch size={18} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    style={{ paddingLeft: 46, borderRadius: 16, height: 44, fontSize: 16 }}
                    placeholder="Search collections or NFTs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Search results */}
            {search.length >= 2 && searchResults && (
                <div style={{ marginBottom: 24 }}>
                    {searchResults.collections?.length > 0 && (
                        <div className="card" style={{ padding: 0, marginBottom: 16 }}>
                            <p className="overline" style={{ padding: '16px 16px 8px', color: 'var(--text-secondary)' }}>COLLECTIONS</p>
                            {searchResults.collections.map((col, idx) => (
                                <Link key={col._id} to={`/collection/${col.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="flex items-center gap-12" style={{ padding: '12px 16px', borderBottom: idx !== searchResults.collections.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {col.logoUrl && <img src={col.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <p style={{ fontWeight: 600, fontSize: 16 }}>{col.name}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    {searchResults.series?.length > 0 && (
                        <div className="card" style={{ padding: 0 }}>
                            <p className="overline" style={{ padding: '16px 16px 8px', color: 'var(--text-secondary)' }}>SERIES</p>
                            {searchResults.series.map((s, idx) => (
                                <Link key={s._id} to={`/series/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="flex items-center gap-12" style={{ padding: '12px 16px', borderBottom: idx !== searchResults.series.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, fontSize: 16 }}>{s.name}</p>
                                            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{(s.price / 1e9).toFixed(2)} TON</p>
                                        </div>
                                        <span className={`badge badge-${s.rarity}`} style={{ alignSelf: 'center' }}>{s.rarity}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Listed NFTs */}
            {search.length < 2 && (
                <>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Listed NFTs</h2>
                    {nfts.length === 0 && isLoading ? (
                        <div className="grid-2">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div>
                    ) : nfts.length > 0 ? (
                        <div className="grid-2">
                            {nfts.map((nft, idx) => {
                                const isLastElement = nfts.length === idx + 1;
                                return (
                                    <Link ref={isLastElement ? lastElementRef : null} key={`${nft._id}-${idx}`} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
                                            <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                                                {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <div style={{ padding: '12px' }}>
                                                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nft.series?.name} #{nft.mintNumber}</p>
                                                <div className="flex items-center justify-between">
                                                    <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>{(nft.listPrice / 1e9).toFixed(2)} TON</span>
                                                    <span className={`badge badge-${nft.series?.rarity}`} style={{ fontSize: 9 }}>{nft.series?.rarity}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state"><p>No results</p></div>
                    )}

                    {isLoading && nfts.length > 0 && (
                        <div className="flex justify-center" style={{ padding: '24px 0' }}>
                            <div className="spinner" style={{ width: 24, height: 24 }} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
