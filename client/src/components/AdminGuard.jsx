import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminGuard({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="page"><div className="loading-center"><div className="spinner" /></div></div>;
    if (!user?.isAdmin) return <Navigate to="/" replace />;

    return children;
}
