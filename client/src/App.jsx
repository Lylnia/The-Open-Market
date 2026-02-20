import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/layout/Layout';
import SplashScreen from './components/SplashScreen';
import MaintenanceScreen from './components/MaintenanceScreen';
import Home from './pages/Home';
import Market from './pages/Market';
import PreSale from './pages/PreSale';
import Profile from './pages/Profile';
import Inventory from './pages/Inventory';
import CollectionDetail from './pages/CollectionDetail';
import SeriesDetail from './pages/SeriesDetail';
import NFTDetail from './pages/NFTDetail';
import Wallet from './pages/Wallet';
import Transactions from './pages/Transactions';
import Favorites from './pages/Favorites';
import Transfer from './pages/Transfer';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/admin/Dashboard';
import AdminGuard from './components/AdminGuard';
import { useTelegram } from './hooks/useTelegram';
import { useEffect, useState } from 'react';
import api from './services/api';

function AppContent() {
    const { ready, expand, disableVerticalSwipes } = useTelegram();
    const { loading } = useAuth();
    const [maintenance, setMaintenance] = useState(false);
    const [healthChecked, setHealthChecked] = useState(false);

    useEffect(() => {
        ready();
        expand();
        disableVerticalSwipes();
    }, []);

    // Check maintenance mode
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await api.get('/health');
                if (res.maintenance) setMaintenance(true);
            } catch {
                // If health check fails, show maintenance
                setMaintenance(true);
            } finally {
                setHealthChecked(true);
            }
        };
        checkHealth();
    }, []);

    if (maintenance && healthChecked) return <MaintenanceScreen />;

    return (
        <>
            <SplashScreen loading={loading} />
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/market" element={<Market />} />
                    <Route path="/presale" element={<PreSale />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/collection/:slug" element={<CollectionDetail />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/transfer" element={<Transfer />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
                </Route>
                <Route path="/series/:slug" element={<SeriesDetail />} />
                <Route path="/nft/:id" element={<NFTDetail />} />
            </Routes>
        </>
    );
}

export default function App() {
    const manifestUrl = import.meta.env.VITE_TON_MANIFEST_URL || '/tonconnect-manifest.json';

    return (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <ToastProvider>
                            <BrowserRouter>
                                <AppContent />
                            </BrowserRouter>
                        </ToastProvider>
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </TonConnectUIProvider>
    );
}
