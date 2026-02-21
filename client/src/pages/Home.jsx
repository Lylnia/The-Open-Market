import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import PullToRefresh from '../components/PullToRefresh';
import { useSocket } from '../hooks/useSocket';

export default function Home() {
    const { t } = useTranslation();
    const { data: collectionsData, loading, refetch: refetchCollections } = useApi('/collections');
    const { data: presaleRes, loading: presaleLoading, refetch: refetchPresale } = useApi('/presale');
    const collections = collectionsData?.data || collectionsData || [];

    const presales = presaleRes?.active || presaleRes?.upcoming || [];
    const latestPresale = presales[0];

    const handleRefresh = useCallback(async () => {
        await Promise.all([refetchCollections(), refetchPresale()]);
    }, [refetchCollections, refetchPresale]);

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="page">
                {/* Main banner (Featured) */}
                <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <h2 className="h2" style={{ fontSize: 24, letterSpacing: '-0.6px' }}>Collections</h2>
                    <Link to="/market" style={{ fontSize: 16, fontWeight: 600, color: '#4DB8FF', textDecoration: 'none' }}>See all</Link>
                </div>
                {!loading && collections?.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <Link to={`/collection/${collections[0].slug}`} style={{ textDecoration: 'none' }}>
                            <div style={{ borderRadius: 24, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                                <div style={{ height: 180, width: '100%', background: 'var(--bg-card)' }}>
                                    {collections[0].bannerUrl ? (
                                        <img src={collections[0].bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1C1C1E, #2C2C2E)' }} />
                                    )}
                                </div>
                                <div className="flex items-center gap-12" style={{ padding: '14px 16px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', overflow: 'hidden', flexShrink: 0 }}>
                                        {collections[0].logoUrl ? (
                                            <img src={collections[0].logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: 'var(--accent)' }} />
                                        )}
                                    </div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{collections[0].name}</h3>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Presale Section */}
                <section className="section" style={{ marginBottom: 24 }}>
                    {presaleLoading ? (
                        <div className="flex-col gap-12">
                            {[1].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />)}
                        </div>
                    ) : latestPresale ? (
                        <div className="flex-col gap-16">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                                    <h2 className="h2" style={{ fontSize: 24, letterSpacing: '-0.6px' }}>{latestPresale.name}</h2>
                                    {latestPresale.soldCount >= latestPresale.totalSupply ? (
                                        <Link to={`/collection/${latestPresale.series?.collection?.slug}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none' }}>
                                            GET ON MARKET
                                        </Link>
                                    ) : (
                                        <Link to="/presale" style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', background: '#4DB8FF', padding: '6px 14px', borderRadius: 16, textDecoration: 'none' }}>
                                            {(latestPresale.price / 1e9).toFixed(2)} TON
                                        </Link>
                                    )}
                                </div>

                                <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                        {latestPresale.series?.collection?.logoUrl ?
                                            <img src={latestPresale.series.collection.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                            <div style={{ width: '100%', height: '100%', background: 'var(--accent)' }} />
                                        }
                                    </div>
                                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{latestPresale.series?.collection?.name || 'Pre-Sale Collection'}</span>
                                </div>

                                <div className="scroll-h" style={{ gap: 12, paddingBottom: 8, margin: '0 -16px', padding: '0 16px' }}>
                                    {[1, 2, 3].map((item, idx) => (
                                        <div key={item} style={{
                                            width: 120, height: 120, borderRadius: 16, flexShrink: 0,
                                            background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            position: 'relative', overflow: 'hidden'
                                        }}>
                                            {latestPresale.series?.imageUrl ?
                                                <img src={latestPresale.series.imageUrl} alt="" style={{ width: '80%', height: '80%', objectFit: 'contain' }} /> :
                                                <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)' }} />
                                            }
                                            {idx === 2 && (
                                                <Link to={`/presale`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>MORE</span>
                                                </Link>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ marginBottom: 0 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                                <h2 className="h2" style={{ fontSize: 24, letterSpacing: '-0.6px' }}>Presale</h2>
                                <Link to="/presale" style={{ fontSize: 16, fontWeight: 600, color: '#4DB8FF', textDecoration: 'none' }}>See all</Link>
                            </div>
                            <p className="caption">No active presales</p>
                        </div>
                    )}
                </section>



            </div>
        </PullToRefresh>
    );
}
