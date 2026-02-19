import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IconSearch } from '../assets/icons';

export default function Market() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const { data, loading } = useApi('/nfts', { listed: 'true', limit: 50 });
    const { data: searchResults } = useApi(search.length >= 2 ? '/search' : null, search.length >= 2 ? { q: search } : {}, [search]);

    return (
        <div className="page">
            <h1 className="h2" style={{ marginBottom: 16 }}>{t('market.title')}</h1>

            <div style={{ position: 'relative', marginBottom: 20 }}>
                <IconSearch size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    placeholder={t('market.search')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Search results */}
            {search.length >= 2 && searchResults && (
                <div style={{ marginBottom: 20 }}>
                    {searchResults.collections?.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <p className="overline" style={{ marginBottom: 8 }}>{t('home.collections')}</p>
                            {searchResults.collections.map(col => (
                                <Link key={col._id} to={`/collection/${col.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="card flex items-center gap-12" style={{ padding: '10px 14px', marginBottom: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {col.logoUrl && <img src={col.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{col.name}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                    {searchResults.series?.length > 0 && (
                        <div>
                            <p className="overline" style={{ marginBottom: 8 }}>{t('collection.series')}</p>
                            {searchResults.series.map(s => (
                                <Link key={s._id} to={`/series/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="card flex items-center gap-12" style={{ padding: '10px 14px', marginBottom: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {s.imageUrl && <img src={s.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                                            <p className="caption">{(s.price / 1e9).toFixed(2)} TON</p>
                                        </div>
                                        <span className={`badge badge-${s.rarity}`} style={{ marginLeft: 'auto' }}>{s.rarity}</span>
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
                    <p className="overline" style={{ marginBottom: 12 }}>{t('market.listed')}</p>
                    {loading ? (
                        <div className="grid-2">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}</div>
                    ) : data?.nfts?.length > 0 ? (
                        <div className="grid-2">
                            {data.nfts.map(nft => (
                                <Link key={nft._id} to={`/nft/${nft._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {nft.series?.imageUrl && <img src={nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div style={{ padding: '10px 12px' }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{nft.series?.name} #{nft.mintNumber}</p>
                                            <div className="flex items-center justify-between">
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{(nft.listPrice / 1e9).toFixed(2)} TON</span>
                                                <span className={`badge badge-${nft.series?.rarity}`} style={{ fontSize: 8 }}>{nft.series?.rarity}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><p>{t('market.no_results')}</p></div>
                    )}
                </>
            )}
        </div>
    );
}
