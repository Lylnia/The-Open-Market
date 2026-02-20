const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { generalLimiter, authLimiter, walletLimiter, bidLimiter, searchLimiter } = require('./middleware/rateLimit');
const { initBot } = require('./services/telegramService');
const { errorHandler, AppError } = require('./middleware/errorHandler');
const asyncHandler = require('express-async-handler');
const { initSocket } = require('./utils/socket');

const app = express();
const server = http.createServer(app);

// Init Socket.io
initSocket(server);

// Connect DB
connectDB();

// Init Telegram Bot
initBot();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL,
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
app.use('/api/bids', bidLimiter, require('./routes/bids'));
app.use('/api/search', searchLimiter, require('./routes/search'));
app.use('/api/external', require('./routes/external'));
app.use('/api/admin', require('./routes/admin'));

// Activity feed (recent transactions)
app.get('/api/activity', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const Transaction = require('./models/Transaction');
    const activity = await Transaction.find({
        type: { $in: ['buy', 'sell', 'transfer_in', 'airdrop'] },
        status: 'completed',
    })
        .populate('user', 'username firstName')
        .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await Transaction.countDocuments({
        type: { $in: ['buy', 'sell', 'transfer_in', 'airdrop'] },
        status: 'completed',
    });

    res.json({
        data: activity,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
}));

// Stats endpoint
app.get('/api/stats/:type/:id', asyncHandler(async (req, res, next) => {
    const { type, id } = req.params;
    const { getCollectionStats, getSeriesStats } = require('./services/statsService');
    if (type === 'collection') {
        res.json(await getCollectionStats(id));
    } else if (type === 'series') {
        res.json(await getSeriesStats(id));
    } else {
        return next(new AppError('Invalid type', 400));
    }
}));

// Referral
app.post('/api/referral/generate', require('./middleware/auth').auth, asyncHandler(async (req, res) => {
    const botUsername = process.env.BOT_USERNAME || 'TheOpenMarketBot';
    res.json({ referralCode: req.user.referralCode, link: `https://t.me/${botUsername}?start=ref_${req.user.referralCode}` });
}));

// User settings update
app.put('/api/user/settings', require('./middleware/auth').auth, asyncHandler(async (req, res) => {
    const { language, theme } = req.body;
    if (language) req.user.language = language;
    if (theme) req.user.theme = theme;
    await req.user.save();
    res.json({ success: true, language: req.user.language, theme: req.user.theme });
}));

// User's own NFTs
app.get('/api/user/nfts', require('./middleware/auth').auth, asyncHandler(async (req, res) => {
    const NFT = require('./models/NFT');
    const nfts = await NFT.find({ owner: req.user._id })
        .populate({ path: 'series', select: 'name slug imageUrl price rarity', populate: { path: 'collection', select: 'name slug' } })
        .sort({ createdAt: -1 })
        .lean();
    res.json(nfts);
}));

// Health check + Maintenance mode
app.get('/api/health', (req, res) => {
    const maintenance = process.env.MAINTENANCE_MODE === 'true';
    res.json({ status: maintenance ? 'maintenance' : 'ok', maintenance, timestamp: Date.now() });
});

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware (must be exactly here)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`The Open Market API running on port ${PORT}`));

module.exports = { app, server };
