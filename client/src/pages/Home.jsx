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

                {/* Presale Section */}
                <section className="section" style={{ marginBottom: 24 }}>
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <h2 className="h2" style={{ fontSize: 22 }}>Presale</h2>
                        <Link to="/presale" style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent)' }}>More</Link>
                    </div>

                    {presaleLoading ? (
                        <div className="flex-col gap-12">
                            {[1].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 20 }} />)}
                        </div>
                    ) : latestPresale ? (
                        <div className="flex-col gap-16">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-8">
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                                            {latestPresale.series?.imageUrl && <img src={latestPresale.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <h3 style={{ fontSize: 17, fontWeight: 600 }}>{latestPresale.name}</h3>
                                    </div>
                                    {latestPresale.soldCount >= latestPresale.totalSupply ? (
                                        <Link to={`/collection/${latestPresale.series?.collection?.slug}`} className="btn-pill">
                                            GET ON MARKET
                                        </Link>
                                    ) : (
                                        <Link to="/presale" className="btn-pill" style={{ background: '#4DB8FF', color: '#FFFFFF', border: 'none' }}>
                                            {(latestPresale.price / 1e9).toFixed(2)} TON
                                        </Link>
                                    )}
                                </div>

                                <div className="scroll-h" style={{ gap: 8, paddingBottom: 8 }}>
                                    {[1, 2, 3].map(item => (
                                        <div key={item} style={{
                                            width: 140, height: 140, borderRadius: 16, flexShrink: 0,
                                            background: 'var(--bg-card)', border: '1px solid var(--border-light)', overflow: 'hidden'
                                        }}>
                                            {latestPresale.series?.imageUrl ?
                                                <img src={latestPresale.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                                <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)' }} />
                                            }
                                        </div>
                                    ))}
                                    <Link to={`/presale`} style={{ textDecoration: 'none' }}>
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
                        </div>
                    ) : (
                        <p className="caption">No active presales</p>
                    )}
                </section>



            </div>
        </PullToRefresh>
    );
}
