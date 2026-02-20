const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const admin = require('../middleware/admin');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const PreSale = require('../models/PreSale');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const ApiKey = require('../models/ApiKey');

const router = express.Router();

// All admin routes require auth + admin
router.use(auth, admin);

// ===== DASHBOARD =====
router.get('/stats', async (req, res) => {
    try {
        const [userCount, nftCount, orderCount, totalVolume, pendingWithdrawals] = await Promise.all([
            User.countDocuments(),
            NFT.countDocuments(),
            Order.countDocuments({ status: 'completed' }),
            Order.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$price' } } }]),
            Transaction.countDocuments({ type: 'withdrawal', status: 'pending' }),
        ]);

        res.json({
            userCount,
            nftCount,
            orderCount,
            totalVolume: totalVolume.length > 0 ? totalVolume[0].total : 0,
            pendingWithdrawals,
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ===== FIELD WHITELISTS =====
const pick = (obj, keys) => keys.reduce((o, k) => { if (obj[k] !== undefined) o[k] = obj[k]; return o; }, {});
const COLLECTION_FIELDS = ['name', 'slug', 'logoUrl', 'bannerUrl', 'order', 'isActive', 'description'];
const SERIES_FIELDS = ['name', 'slug', 'collection', 'imageUrl', 'price', 'totalSupply', 'royaltyPercent', 'isActive', 'description', 'attributes'];
const USER_EDITABLE_FIELDS = ['isAdmin', 'balance'];

// ===== COLLECTIONS CRUD =====
router.get('/collections', async (req, res) => {
    try { res.json(await Collection.find().sort({ order: 1 }).lean()); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/collections', async (req, res) => {
    try {
        const data = pick(req.body, COLLECTION_FIELDS);
        if (!data.name || !data.slug) return res.status(400).json({ error: 'name and slug are required' });
        res.json(await Collection.create(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/collections/:id', async (req, res) => {
    try {
        const data = pick(req.body, COLLECTION_FIELDS);
        res.json(await Collection.findByIdAndUpdate(req.params.id, data, { new: true }));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.delete('/collections/:id', async (req, res) => {
    try {
        // Cascade: delete all series and their NFTs under this collection
        const seriesInCol = await Series.find({ collection: req.params.id }).select('_id');
        const seriesIds = seriesInCol.map(s => s._id);
        if (seriesIds.length > 0) {
            await NFT.deleteMany({ series: { $in: seriesIds } });
            await Series.deleteMany({ collection: req.params.id });
        }
        await Collection.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== SERIES CRUD =====
router.get('/series', async (req, res) => {
    try { res.json(await Series.find().populate('collection', 'name slug').lean()); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/series', async (req, res) => {
    try {
        const data = pick(req.body, SERIES_FIELDS);
        if (!data.name || !data.slug || !data.collection || !data.totalSupply) {
            return res.status(400).json({ error: 'name, slug, collection, and totalSupply are required' });
        }
        res.json(await Series.create(data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/series/:id', async (req, res) => {
    try {
        const data = pick(req.body, SERIES_FIELDS);
        res.json(await Series.findByIdAndUpdate(req.params.id, data, { new: true }));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.delete('/series/:id', async (req, res) => {
    try {
        // Cascade: delete all NFTs under this series
        await NFT.deleteMany({ series: req.params.id });
        await Series.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== NFT MANAGEMENT =====
router.get('/nfts', async (req, res) => {
    try {
        const { series, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (series) filter.series = series;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const nfts = await NFT.find(filter).populate('series', 'name').populate('owner', 'username').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
        const total = await NFT.countDocuments(filter);
        res.json({ nfts, total });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== PRESALE CRUD =====
router.get('/presales', async (req, res) => {
    try { res.json(await PreSale.find().populate('series', 'name slug').sort({ createdAt: -1 }).lean()); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/presales', async (req, res) => {
    try { res.json(await PreSale.create(req.body)); } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/presales/:id', async (req, res) => {
    try { res.json(await PreSale.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.delete('/presales/:id', async (req, res) => {
    try { await PreSale.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== USER MANAGEMENT =====
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;
        const filter = {};
        if (search) filter.$or = [{ username: new RegExp(search, 'i') }, { firstName: new RegExp(search, 'i') }];
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();
        const total = await User.countDocuments(filter);
        res.json({ users, total });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.put('/users/:id', async (req, res) => {
    try {
        const data = pick(req.body, USER_EDITABLE_FIELDS);
        res.json(await User.findByIdAndUpdate(req.params.id, data, { new: true }));
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== AIRDROP =====
router.post('/airdrop', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { userIds, seriesId } = req.body;
        if (!userIds?.length || !seriesId) { await session.abortTransaction(); return res.status(400).json({ error: 'userIds and seriesId required' }); }

        const series = await Series.findById(seriesId).session(session);
        if (!series) { await session.abortTransaction(); return res.status(404).json({ error: 'Series not found' }); }

        const results = [];
        for (const userId of userIds) {
            if (series.mintedCount >= series.totalSupply) break;
            const mintNumber = series.mintedCount + 1;
            const nft = await NFT.create([{ series: seriesId, mintNumber, owner: userId }], { session });
            series.mintedCount += 1;
            await Transaction.create([{ user: userId, type: 'airdrop', nft: nft[0]._id, status: 'completed', description: `Airdrop: ${series.name} #${mintNumber}` }], { session });
            results.push(nft[0]);
        }
        await series.save({ session });

        await session.commitTransaction();
        res.json({ success: true, airdropped: results.length });
    } catch (error) {
        await session.abortTransaction();
        console.error('Airdrop error:', error);
        res.status(500).json({ error: 'Airdrop failed' });
    } finally {
        session.endSession();
    }
});

// ===== WITHDRAWAL MANAGEMENT =====
router.get('/withdrawals', async (req, res) => {
    try {
        const txs = await Transaction.find({ type: 'withdrawal' }).populate('user', 'username telegramId').sort({ createdAt: -1 }).lean();
        res.json(txs);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/withdrawals/:id/approve', async (req, res) => {
    try {
        const tx = await Transaction.findById(req.params.id).populate('user');
        if (!tx || tx.type !== 'withdrawal') return res.status(404).json({ error: 'Not found' });
        tx.status = 'completed';
        await tx.save();
        const { notifyWithdrawal } = require('../services/telegramService');
        notifyWithdrawal(tx.user.telegramId, tx.amount / 1e9, 'completed');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/withdrawals/:id/reject', async (req, res) => {
    try {
        const tx = await Transaction.findById(req.params.id).populate('user');
        if (!tx || tx.type !== 'withdrawal') return res.status(404).json({ error: 'Not found' });
        // Refund balance
        const user = await User.findById(tx.user._id);
        user.balance += tx.amount;
        await user.save();
        tx.status = 'failed';
        await tx.save();
        const { notifyWithdrawal } = require('../services/telegramService');
        notifyWithdrawal(tx.user.telegramId, tx.amount / 1e9, 'failed');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== DEPOSIT (manual credit) =====
router.post('/deposit', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.balance += amount;
        await user.save();
        await Transaction.create({ user: user._id, type: 'deposit', amount, status: 'completed', description: 'Admin manual deposit' });
        const { notifyDeposit } = require('../services/telegramService');
        notifyDeposit(user.telegramId, amount / 1e9);
        res.json({ success: true, balance: user.balance });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// ===== API KEYS =====
router.get('/api-keys', async (req, res) => {
    try { res.json(await ApiKey.find().sort({ createdAt: -1 }).lean()); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/api-keys', async (req, res) => {
    try {
        const key = ApiKey.generateKey();
        const apiKey = await ApiKey.create({ ...req.body, key, createdBy: req.user._id });
        res.json(apiKey);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/api-keys/:id', async (req, res) => {
    try { res.json(await ApiKey.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});
router.delete('/api-keys/:id', async (req, res) => {
    try { await ApiKey.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

module.exports = router;
