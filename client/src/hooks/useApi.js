import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export function useApi(path, params = {}, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(path, params);
            setData(res.data);
        } catch (err) {
            setError(err?.error || 'Request failed');
        } finally {
            setLoading(false);
        }
    }, [path, JSON.stringify(params)]);

    useEffect(() => {
        refetch();
    }, [refetch, ...deps]);

    return { data, loading, error, refetch };
}
