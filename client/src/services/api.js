const API_URL = import.meta.env.VITE_API_URL;

const api = {
    getToken: () => localStorage.getItem('tom_token'),

    headers: () => {
        const h = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('tom_token');
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    },

    _parseError: async (res) => {
        try { return await res.json(); } catch { return { error: `Request failed (${res.status})` }; }
    },

    get: async (path, params = {}) => {
        const query = new URLSearchParams(params).toString();
        const url = `${API_URL}${path}${query ? '?' + query : ''}`;
        const res = await fetch(url, { headers: api.headers() });
        if (!res.ok) throw await api._parseError(res);
        return { data: await res.json() };
    },

    post: async (path, body = {}) => {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: api.headers(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw await api._parseError(res);
        return { data: await res.json() };
    },

    put: async (path, body = {}) => {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'PUT',
            headers: api.headers(),
            body: JSON.stringify(body),
        });
        if (!res.ok) throw await api._parseError(res);
        return { data: await res.json() };
    },

    delete: async (path) => {
        const res = await fetch(`${API_URL}${path}`, {
            method: 'DELETE',
            headers: api.headers(),
        });
        if (!res.ok) throw await api._parseError(res);
        return { data: await res.json() };
    },
};

export default api;
export { API_URL };
