const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const tonService = require('../services/tonService');
const admin = require('../middleware/admin');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const PreSale = require('../models/PreSale');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const ApiKey = require('../models/ApiKey');
const Settings = require('../models/Settings');

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

// ===== GLOBAL SETTINGS =====
router.get('/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json(settings);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.put('/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();

        if (typeof req.body.isMaintenance === 'boolean') {
            settings.isMaintenance = req.body.isMaintenance;
        }

        await settings.save();
        res.json({ success: true, settings });
    } catch (error) { res.status(500).json({ error: 'Failed to update settings' }); }
});

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
    let session = null;
    try {
        const tx = await Transaction.findById(req.params.id).populate('user');
        if (!tx || tx.type !== 'withdrawal') return res.status(404).json({ error: 'Not found' });
        if (tx.status !== 'pending') return res.status(400).json({ error: 'Transaction is not pending' });

        // 1. Send real withdrawal
        const withdrawAmountNano = tonService.toNano(tx.amount / 1e9);
        const withdrawalResult = await tonService.sendWithdrawal(tx.memo, withdrawAmountNano); // tx.memo stores the destination address for withdrawals in this architecture

        session = await mongoose.startSession();
        session.startTransaction();

        if (withdrawalResult.success) {
            tx.status = 'completed';
            tx.txHash = withdrawalResult.txHash;
            await tx.save({ session });
            await session.commitTransaction();

            const { notifyWithdrawal } = require('../services/telegramService');
            notifyWithdrawal(tx.user.telegramId, tx.amount / 1e9, 'completed');
            res.json({ success: true, txHash: withdrawalResult.txHash });
        } else {
            // Fail and refund internally
            tx.status = 'failed';
            tx.description = `Blockchain payout failed: ${withdrawalResult.error}`;
            await tx.save({ session });

            // Refund user
            await User.findByIdAndUpdate(tx.user._id, { $inc: { balance: tx.amount } }, { session });

            // Log refund
            await Transaction.create([{
                user: tx.user._id,
                type: 'deposit',
                amount: tx.amount,
                status: 'completed',
                description: 'Refund for failed withdrawal'
            }], { session });

            await session.commitTransaction();

            const { notifyWithdrawal } = require('../services/telegramService');
            notifyWithdrawal(tx.user.telegramId, tx.amount / 1e9, 'failed');
            res.status(500).json({ error: 'On-chain payout failed. Funds returned to user.', details: withdrawalResult.error });
        }
    } catch (e) {
        if (session) await session.abortTransaction();
        console.error('Withdrawal auth error:', e);
        res.status(500).json({ error: 'Internal failure' });
    } finally {
        if (session) session.endSession();
    }
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

// ===== USER INVENTORY MANAGEMENT =====
router.get('/users/:id/nfts', async (req, res) => {
    try {
        const nfts = await NFT.find({ owner: req.params.id })
            .populate('series', 'name slug imageUrl price collection')
            .sort({ createdAt: -1 })
            .lean();
        res.json(nfts);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/nfts/:id/transfer-system', async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        if (!nft) return res.status(404).json({ error: 'NFT not found' });

        // Find or create the definitive System Account
        let systemUser = await User.findOne({ telegramId: 0 });
        if (!systemUser) {
            systemUser = await User.create({
                telegramId: 0,
                username: 'system',
                firstName: 'System',
                lastName: 'Account',
                isAdmin: true
            });
        }

        const oldOwner = nft.owner;
        nft.owner = systemUser._id;
        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save();

        await Transaction.create({
            user: oldOwner, type: 'sell', amount: 0, nft: nft._id, toUser: systemUser._id, status: 'completed',
            description: 'Admin Transfer: Confiscated to System'
        });

        res.json({ success: true, message: 'NFT transferred to system account' });
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/system-nfts', async (req, res) => {
    try {
        let systemUser = await User.findOne({ telegramId: 0 });
        if (!systemUser) return res.json([]);

        const nfts = await NFT.find({ owner: systemUser._id })
            .populate('series', 'name slug imageUrl price collection')
            .sort({ createdAt: -1 })
            .lean();
        res.json(nfts);
    } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/nfts/:id/burn', async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id).populate('series');
        if (!nft) return res.status(404).json({ error: 'NFT not found' });

        const series = nft.series;

        // Burn process: delete NFT and decrement series minted count
        await NFT.findByIdAndDelete(nft._id);
        if (series && series.mintedCount > 0) {
            series.mintedCount -= 1;
            await series.save();
        }

        await Transaction.create({
            user: nft.owner, type: 'sell', amount: 0, nft: nft._id, status: 'completed',
            description: 'Admin Action: NFT Burned'
        });

        res.json({ success: true, message: 'NFT burned' });
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
