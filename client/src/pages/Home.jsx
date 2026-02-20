import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useCallback } from 'react';
import PullToRefresh from '../components/PullToRefresh';

export default function Home() {
    const { t } = useTranslation();
    const { data: collections, loading, refetch: refetchCollections } = useApi('/collections');
    const { data: activity, loading: activityLoading, refetch: refetchActivity } = useApi('/activity');

    const handleRefresh = useCallback(async () => {
        await Promise.all([refetchCollections(), refetchActivity()]);
    }, [refetchCollections, refetchActivity]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="page" style={{ paddingTop: 12 }}>
                {/* Main banner (Featured) */}
                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="h2" style={{ fontSize: 22 }}>Collections</h2>
                    <Link to="/market" style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent)' }}>More</Link>
                </div>
                {!loading && collections?.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <Link to={`/collection/${collections[0].slug}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                borderRadius: 20, overflow: 'hidden', position: 'relative',
                                background: 'var(--bg-card)', height: 200,
                            }}>
                                {collections[0].bannerUrl ? (
                                    <img src={collections[0].bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1C1C1E, #2C2C2E)' }} />
                                )}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    padding: '32px 16px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                                }}>
                                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.5px' }}>{collections[0].name}</h2>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Latest Series Section */}
                <section className="section" style={{ marginBottom: 24 }}>
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <h2 className="h2" style={{ fontSize: 22 }}>Latest Series</h2>
                    </div>

                    {loading ? (
                        <div className="flex-col gap-12">
                            {[1].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />)}
                        </div>
                    ) : (
                        <div className="flex-col gap-16">
                            {collections?.slice(0, 1).map(col => (
                                <div key={col._id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                                {col.logoUrl && <img src={col.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            <h3 style={{ fontSize: 17, fontWeight: 600 }}>{col.name}</h3>
                                        </div>
                                        <Link to={`/collection/${col.slug}`} className="btn-pill">
                                            GET ON MARKET
                                        </Link>
                                    </div>

                                    <div className="scroll-h" style={{ gap: 8, paddingBottom: 8 }}>
                                        {/* Mocking collection items for the UI look */}
                                        {[1, 2, 3].map(item => (
                                            <div key={item} style={{
                                                width: 140, height: 140, borderRadius: 16, flexShrink: 0,
                                                background: 'var(--bg-card)', border: '1px solid var(--border-light)', overflow: 'hidden'
                                            }}>
                                                {col.bannerUrl ?
                                                    <img src={col.bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)' }} />
                                                }
                                            </div>
                                        ))}
                                        <Link to={`/collection/${col.slug}`} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                width: 140, height: 140, borderRadius: 16, flexShrink: 0,
                                                background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid var(--border-light)'
                                            }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>VIEW MORE</span>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>


                {/* Activity Feed */}
                <section className="section" style={{ marginTop: 24 }}>
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <h2 className="h2" style={{ fontSize: 20 }}>Recent Activity</h2>
                    </div>
                    {activityLoading ? (
                        <div className="flex-col gap-8">
                            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
                        </div>
                    ) : activity?.length > 0 ? (
                        <div className="card" style={{ padding: 0 }}>
                            {activity.slice(0, 5).map((tx, i) => (
                                <div key={i} className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: i !== Math.min(activity.length - 1, 4) ? '1px solid var(--border)' : 'none' }}>
                                    <div className="flex items-center gap-12">
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
                                            {tx.nft?.series?.imageUrl && <img src={tx.nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {tx.nft?.series?.name} #{tx.nft?.mintNumber}
                                            </p>
                                            <p className="caption" style={{ fontSize: 13, marginTop: 2 }}>
                                                @{tx.user?.username || 'user'} {tx.type === 'buy' ? 'bought' : tx.type}
                                            </p>
                                        </div>
                                    </div>
                                    {tx.amount > 0 && <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{(tx.amount / 1e9).toFixed(2)}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="caption">No activity yet</p>
                    )}
                </section>
            </div>
        </PullToRefresh>
    );
}
