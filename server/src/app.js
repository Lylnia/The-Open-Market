const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { generalLimiter, authLimiter, walletLimiter } = require('./middleware/rateLimit');
const { initBot } = require('./services/telegramService');

const app = express();

// Connect DB
connectDB();

// Init Telegram Bot
initBot();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));
app.use(express.json());
app.use(generalLimiter);

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/series', require('./routes/series'));
app.use('/api/nfts', require('./routes/nfts'));
app.use('/api/wallet', walletLimiter, require('./routes/wallet'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/presale', require('./routes/presale'));
app.use('/api/transfer', require('./routes/transfer'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/bids', require('./routes/bids'));
app.use('/api/search', require('./routes/search'));
app.use('/api/external', require('./routes/external'));
app.use('/api/admin', require('./routes/admin'));

// Activity feed (recent transactions)
app.get('/api/activity', async (req, res) => {
    try {
        const Transaction = require('./models/Transaction');
        const activity = await Transaction.find({
            type: { $in: ['buy', 'sell', 'transfer_in', 'airdrop'] },
            status: 'completed',
        })
            .populate('user', 'username firstName')
            .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Stats endpoint
app.get('/api/stats/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const { getCollectionStats, getSeriesStats } = require('./services/statsService');
        if (type === 'collection') {
            res.json(await getCollectionStats(id));
        } else if (type === 'series') {
            res.json(await getSeriesStats(id));
        } else {
            res.status(400).json({ error: 'Invalid type' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Referral
app.post('/api/referral/generate', require('./middleware/auth').auth, async (req, res) => {
    try {
        res.json({ referralCode: req.user.referralCode, link: `https://t.me/your_bot?start=ref_${req.user.referralCode}` });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// User settings update
app.put('/api/user/settings', require('./middleware/auth').auth, async (req, res) => {
    try {
        const { language, theme } = req.body;
        if (language) req.user.language = language;
        if (theme) req.user.theme = theme;
        await req.user.save();
        res.json({ success: true, language: req.user.language, theme: req.user.theme });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// User's own NFTs
app.get('/api/user/nfts', require('./middleware/auth').auth, async (req, res) => {
    try {
        const NFT = require('./models/NFT');
        const nfts = await NFT.find({ owner: req.user._id })
            .populate({ path: 'series', select: 'name slug imageUrl price rarity', populate: { path: 'collection', select: 'name slug' } })
            .sort({ createdAt: -1 })
            .lean();
        res.json(nfts);
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`The Open Market API running on port ${PORT}`));

module.exports = app;
