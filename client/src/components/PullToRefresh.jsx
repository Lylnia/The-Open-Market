import { useState, useRef, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
    const [pulling, setPulling] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullHeight, setPullHeight] = useState(0);
    const startY = useRef(0);
    const containerRef = useRef(null);

    const threshold = 60;

    const onTouchStart = useCallback((e) => {
        if (containerRef.current?.scrollTop > 0) return;
        startY.current = e.touches[0].clientY;
        setPulling(true);
    }, []);

    const onTouchMove = useCallback((e) => {
        if (!pulling || refreshing) return;
        const dy = e.touches[0].clientY - startY.current;
        if (dy > 0) {
            setPullHeight(Math.min(dy * 0.5, 80));
        }
    }, [pulling, refreshing]);

    const onTouchEnd = useCallback(async () => {
        if (!pulling) return;
        setPulling(false);
        if (pullHeight >= threshold && onRefresh) {
            setRefreshing(true);
            setPullHeight(50);
            try { await onRefresh(); } catch { }
            setRefreshing(false);
        }
        setPullHeight(0);
    }, [pulling, pullHeight, onRefresh]);

    return (
        <div
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="ptr-container"
        >
            <div
                className={`ptr-indicator ${pulling ? 'pulling' : ''}`}
                style={{ height: pullHeight }}
            >
                {refreshing ? (
                    <div className="ptr-spinner" />
                ) : pullHeight > 0 ? (
                    <svg
                        width="22" height="22" viewBox="0 0 24 24" fill="none"
                        stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
                        style={{
                            transform: `rotate(${Math.min(pullHeight / threshold * 180, 180)}deg)`,
                            opacity: Math.min(pullHeight / threshold, 1),
                        }}
                    >
                        <polyline points="7,14 12,9 17,14" />
                    </svg>
                ) : null}
            </div>
            {children}
        </div>
    );
}
