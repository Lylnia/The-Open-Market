import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Market from './pages/Market';
import PreSale from './pages/PreSale';
import Profile from './pages/Profile';
import CollectionDetail from './pages/CollectionDetail';
import SeriesDetail from './pages/SeriesDetail';
import NFTDetail from './pages/NFTDetail';
import Wallet from './pages/Wallet';
import Transactions from './pages/Transactions';
import Favorites from './pages/Favorites';
import Transfer from './pages/Transfer';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/admin/Dashboard';
import { useTelegram } from './hooks/useTelegram';
import { useEffect } from 'react';

function AppContent() {
    const { ready, expand } = useTelegram();

    useEffect(() => {
        ready();
        expand();
    }, []);

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/market" element={<Market />} />
                <Route path="/presale" element={<PreSale />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/collection/:slug" element={<CollectionDetail />} />
                <Route path="/series/:slug" element={<SeriesDetail />} />
                <Route path="/nft/:id" element={<NFTDetail />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/transfer" element={<Transfer />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/admin" element={<Dashboard />} />
            </Route>
        </Routes>
    );
}

export default function App() {
    const manifestUrl = import.meta.env.VITE_TON_MANIFEST_URL || '/tonconnect-manifest.json';

    return (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
            <ThemeProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <BrowserRouter>
                            <AppContent />
                        </BrowserRouter>
                    </AuthProvider>
                </LanguageProvider>
            </ThemeProvider>
        </TonConnectUIProvider>
    );
}
