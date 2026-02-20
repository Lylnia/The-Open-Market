import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IconSearch } from '../assets/icons';

export default function Market() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const { data, loading } = useApi('/nfts', { listed: 'true', limit: 20, page }, [page]);
    const { data: searchResults } = useApi(search.length >= 2 ? '/search' : null, search.length >= 2 ? { q: search } : {}, [search]);

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
                    {loading ? (
                        <div className="grid-2">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div>
                    ) : data?.nfts?.length > 0 ? (
                        <div className="grid-2">
                            {data.nfts.map(nft => (
                                <Link key={nft._id} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><p>No results</p></div>
                    )}
                    {data?.pagination && data.pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-12" style={{ marginTop: 24 }}>
                            <button className="btn-pill" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>BACK</button>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{page} / {data.pagination.pages}</span>
                            <button className="btn-pill" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>NEXT</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
