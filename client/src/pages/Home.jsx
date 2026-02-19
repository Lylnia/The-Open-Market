import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { IconChevronRight, IconDiamond } from '../assets/icons';

export default function Home() {
    const { t } = useTranslation();
    const { data: collections, loading } = useApi('/collections');
    const { data: activity } = useApi('/activity');

    return (
        <div className="page">
            <div style={{ marginBottom: 24 }}>
                <h1 className="h1" style={{ marginBottom: 4 }}>{t('app_name')}</h1>
                <p className="caption">Premium NFT Marketplace</p>
            </div>

            {/* Featured collection banner */}
            {!loading && collections?.length > 0 && (
                <section className="section">
                    <Link to={`/collection/${collections[0].slug}`} style={{ textDecoration: 'none' }}>
                        <div style={{
                            borderRadius: 20, overflow: 'hidden', position: 'relative',
                            background: 'var(--bg-card)', border: '1px solid var(--border)', height: 160,
                        }}>
                            {collections[0].bannerUrl ? (
                                <img src={collections[0].bannerUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-elevated))' }} />
                            )}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                padding: '24px 16px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            }}>
                                <p className="overline" style={{ color: '#aaa', marginBottom: 4 }}>{t('home.featured')}</p>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{collections[0].name}</h2>
                            </div>
                        </div>
                    </Link>
                </section>
            )}

            {/* Collections */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">{t('home.collections')}</h2>
                </div>
                {loading ? (
                    <div className="flex-col gap-12">
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 16 }} />)}
                    </div>
                ) : (
                    <div className="flex-col gap-8">
                        {collections?.map(col => (
                            <Link key={col._id} to={`/collection/${col.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="card flex items-center gap-12" style={{ padding: '12px 16px' }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
                                        background: 'var(--bg-elevated)', flexShrink: 0,
                                    }}>
                                        {col.logoUrl ? <img src={col.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconDiamond size={20} style={{ color: 'var(--text-muted)' }} /></div>
                                        }
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{col.name}</p>
                                        <p className="caption">{col.description?.en || col.description?.tr || ''}</p>
                                    </div>
                                    <IconChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Activity Feed */}
            <section className="section">
                <div className="section-header">
                    <h2 className="section-title">{t('home.activity')}</h2>
                </div>
                {activity?.length > 0 ? (
                    <div className="flex-col gap-8">
                        {activity.slice(0, 8).map((tx, i) => (
                            <div key={i} className="flex items-center gap-12" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
                                    {tx.nft?.series?.imageUrl && <img src={tx.nft.series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        @{tx.user?.username || 'user'} {tx.type === 'buy' ? 'bought' : tx.type === 'transfer_in' ? 'received' : tx.type}
                                    </p>
                                    <p className="caption" style={{ fontSize: 11 }}>{tx.nft?.series?.name} #{tx.nft?.mintNumber}</p>
                                </div>
                                {tx.amount > 0 && <span style={{ fontSize: 12, fontWeight: 600 }}>{(tx.amount / 1e9).toFixed(2)} TON</span>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="caption">{t('common.loading')}</p>
                )}
            </section>
        </div>
    );
}
