import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function PresaleModal({ presale, series, onClose, onPledgeSuccess }) {
    const { t } = useTranslation();
    const { user, updateUser } = useAuth();
    const { showToast } = useToast();
    const [amount, setAmount] = useState(1);
    const [loading, setLoading] = useState(false);

    // Safety
    if (!presale) return null;

    const handlePledge = async () => {
        if (!user) {
            showToast('Please login first', 'error');
            return;
        }

        const totalCost = presale.price * amount;
        if (user.balance < totalCost) {
            showToast('Insufficient TON balance', 'error');
            return;
        }

        try {
            setLoading(true);
            const res = await api.post(`/presale/${presale._id}/pledge`, { amount });
            if (res.data.success) {
                showToast(`Successfully pledged ${amount} tickets! TON locked.`, 'success');
                // Optmistic user balance update
                updateUser({ balance: user.balance - totalCost });
                if (onPledgeSuccess) onPledgeSuccess();
                onClose();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Pledge failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-handle" />
                <div className="flex items-center gap-12" style={{ marginBottom: 20 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        {series?.imageUrl && <img src={series.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: 18 }}>{presale.name}</h3>
                        <p className="caption">Join Raffle</p>
                    </div>
                </div>

                <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: 16, marginBottom: 24 }}>
                    <div className="flex justify-between" style={{ marginBottom: 12 }}>
                        <span className="caption">Price per Ticket</span>
                        <span style={{ fontWeight: 600 }}>{(presale.price / 1e9).toFixed(2)} TON</span>
                    </div>
                    <div className="flex justify-between" style={{ marginBottom: 12 }}>
                        <span className="caption">Max Allowed</span>
                        <span style={{ fontWeight: 600 }}>{presale.maxPerUser} Tickets</span>
                    </div>
                    <div className="flex justify-between" style={{ marginBottom: 16 }}>
                        <span className="caption">How it works</span>
                        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'right', maxWidth: 200 }}>
                            Lock your TON to enter the draw. If you don't win, your TON is instantly refunded.
                        </span>
                    </div>

                    <div className="flex items-center justify-between" style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 12 }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '8px 16px', borderRadius: 8 }}
                            onClick={() => setAmount(Math.max(1, amount - 1))}
                        >
                            -
                        </button>
                        <span style={{ fontSize: 18, fontWeight: 700 }}>{amount}</span>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '8px 16px', borderRadius: 8 }}
                            onClick={() => setAmount(Math.min(presale.maxPerUser, amount + 1))}
                        >
                            +
                        </button>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-block"
                    disabled={loading || !user}
                    onClick={handlePledge}
                    style={{ height: 56, fontSize: 16 }}
                >
                    {loading ? 'Processing...' : `Lock ${((presale.price * amount) / 1e9).toFixed(2)} TON`}
                </button>
            </div>
        </div>
    );
}
