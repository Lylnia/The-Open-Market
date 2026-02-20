const express = require('express');
const mongoose = require('mongoose');
const NFT = require('../models/NFT');
const Series = require('../models/Series');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { notifyPurchase } = require('../services/telegramService');
const { getPriceHistory } = require('../services/statsService');
const asyncHandler = require('express-async-handler');
const validate = require('../middleware/validate');
const { listSchema, buySchema } = require('../utils/validations');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../utils/socket');

const router = express.Router();

// List NFTs with filters
router.get('/', asyncHandler(async (req, res) => {
    const { series, collection, owner, listed, search, sort = 'descending', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (series) filter.series = series;
    if (owner) filter.owner = owner;
    if (listed === 'true') {
        filter.isListed = true;
        filter.listPrice = { $gt: 0 };
    }

    if (collection) {
        const seriesInCol = await Series.find({ collection }).select('_id').lean();
        if (!filter.series) filter.series = { $in: seriesInCol.map(s => s._id) };
    }

    if (search && search.trim().length > 0) {
        const matchingSeries = await Series.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
        const seriesIds = matchingSeries.map(s => s._id);
        const searchNum = parseInt(search);

        const searchConditions = [];
        if (!isNaN(searchNum)) {
            searchConditions.push({ mintNumber: searchNum });
        }
        if (seriesIds.length > 0) {
            searchConditions.push({ series: { $in: seriesIds } });
        }

        if (searchConditions.length > 0) {
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: searchConditions });
        } else {
            filter._id = null;
        }
    }

    let sortConfig = { listPrice: 1, createdAt: 1 };
    if (sort === 'price_desc') sortConfig = { listPrice: -1, createdAt: -1 };
    if (sort === 'number_asc') sortConfig = { mintNumber: 1, createdAt: 1 };
    if (sort === 'number_desc') sortConfig = { mintNumber: -1, createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let nfts = await NFT.find(filter)
        .populate('series', 'name slug imageUrl price collection')
        .populate('owner', 'username telegramId')
        .sort(sortConfig)
        .lean();

    // STRICT SAFETY NET: Just in case MongoDB index/cache returns ghost 0-price items
    if (listed === 'true') {
        nfts = nfts.filter(nft => nft.isListed === true && nft.listPrice > 0);
    }

    const total = nfts.length;
    // Apply pagination manually after strict filtering
    nfts = nfts.slice(skip, skip + parseInt(limit));

    res.json({
        nfts,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
}));

// Get single NFT
router.get('/:id', asyncHandler(async (req, res) => {
    const nft = await NFT.findById(req.params.id)
        .populate({ path: 'series', populate: { path: 'collection', select: 'name slug' } })
        .populate('owner', 'username telegramId firstName photoUrl')
        .lean();
    if (!nft) throw new AppError('NFT not found', 404);

    const Bid = require('../models/Bid');
    const bids = await Bid.find({ nft: nft._id, status: 'active' })
        .populate('bidder', 'username telegramId')
        .sort({ amount: -1 })
        .lean();

    const priceHistory = await getPriceHistory(nft._id);

    res.json({ ...nft, bids, priceHistory });
}));

// Get NFT price history
router.get('/:id/price-history', asyncHandler(async (req, res) => {
    const priceHistory = await getPriceHistory(req.params.id);
    res.json(priceHistory);
}));

// Primary mint (lazy mint from series page)
router.post('/mint', auth, asyncHandler(async (req, res) => {
    const { withRetry } = require('../utils/transactionRetry');
    const result = await withRetry(async (session) => {
        const { seriesId } = req.body;
        if (!seriesId) throw new AppError('seriesId required', 400);

        const series = await Series.findById(seriesId).session(session);
        if (!series || !series.isActive) throw new AppError('Series not found or inactive', 404);
        if (series.mintedCount >= series.totalSupply) throw new AppError('Series sold out', 400);

        // Generate fully random available mint number
        const existingMints = await NFT.find({ series: seriesId }).select('mintNumber').lean().session(session);
        const mintedSet = new Set(existingMints.map(n => n.mintNumber));
        const availableItems = [];
        for (let i = 1; i <= series.totalSupply; i++) {
            if (!mintedSet.has(i)) availableItems.push(i);
        }
        if (availableItems.length === 0) throw new AppError('Series sold out', 400);

        const mintNumber = availableItems[Math.floor(Math.random() * availableItems.length)];

        // We skip exact duplicate manual check because we rely on the unique index catching races

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer.balance < series.price) throw new AppError('Insufficient balance', 400);

        buyer.balance -= series.price;
        await buyer.save({ session });

        const newNft = await NFT.create([{ series: seriesId, mintNumber, owner: buyer._id }], { session });

        series.mintedCount += 1;
        await series.save({ session });

        await Order.create([{
            buyer: buyer._id, nft: newNft[0]._id, price: series.price, type: 'primary', status: 'completed'
        }], { session });

        const tx = await Transaction.create([{
            user: buyer._id, type: 'buy', amount: series.price, nft: newNft[0]._id, status: 'completed',
            description: `Minted: ${series.name} #${mintNumber}`
        }], { session });

        // Handle referral commission (2%)
        if (buyer.referredBy) {
            const commission = Math.floor(series.price * 0.02);
            if (commission > 0) {
                const referrer = await User.findById(buyer.referredBy).session(session);
                if (referrer) {
                    referrer.balance += commission;
                    referrer.referralEarnings += commission;
                    await referrer.save({ session });
                    await Transaction.create([{
                        user: referrer._id, type: 'referral_earning', amount: commission, nft: newNft[0]._id, fromUser: buyer._id, status: 'completed'
                    }], { session });
                }
            }
        }

        return { nft: newNft[0], buyer, series, transaction: tx[0] };
    });

    // Emit real-time events outside transaction
    try {
        const io = getIO();
        const activityPopulated = await Transaction.findById(result.transaction._id)
            .populate('user', 'username firstName')
            .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
            .lean();
        io.emit('activity:new', activityPopulated);
        io.emit('nft:sold', { nftId: result.nft._id, buyer: result.buyer._id, price: result.series.price });
    } catch (socketErr) {
        console.error('Socket emit error:', socketErr);
    }

    notifyPurchase(result.buyer.telegramId, null, result.series.name, result.nft.mintNumber, result.series.price / 1e9);
    res.json({ success: true, nft: result.nft });
}));

// Buy NFT (primary or secondary)
router.post('/:id/buy', auth, validate(buySchema), asyncHandler(async (req, res) => {
    const { withRetry } = require('../utils/transactionRetry');
    const result = await withRetry(async (session) => {
        const nft = await NFT.findById(req.params.id).populate('series').session(session);

        // Primary sale (lazy mint)
        if (!nft) {
            const { seriesId, mintNumber } = req.body;
            if (!seriesId || !mintNumber) throw new AppError('seriesId and mintNumber required for primary purchase', 400);

            const series = await Series.findById(seriesId).session(session);
            if (!series || !series.isActive) throw new AppError('Series not found or inactive', 404);
            if (series.mintedCount >= series.totalSupply) throw new AppError('Series sold out', 400);
            if (mintNumber < 1 || mintNumber > series.totalSupply) throw new AppError('Invalid mint number', 400);

            const buyer = await User.findById(req.user._id).session(session);
            if (buyer.balance < series.price) throw new AppError('Insufficient balance', 400);

            buyer.balance -= series.price;
            await buyer.save({ session });

            const newNft = await NFT.create([{ series: seriesId, mintNumber, owner: buyer._id }], { session });
            series.mintedCount += 1;
            await series.save({ session });

            await Order.create([{
                buyer: buyer._id, nft: newNft[0]._id, price: series.price, type: 'primary', status: 'completed'
            }], { session });

            const tx = await Transaction.create([{
                user: buyer._id, type: 'buy', amount: series.price, nft: newNft[0]._id, status: 'completed',
                description: `Minted: ${series.name} #${mintNumber}`
            }], { session });

            if (buyer.referredBy) {
                const commission = Math.floor(series.price * 0.02);
                if (commission > 0) {
                    const referrer = await User.findById(buyer.referredBy).session(session);
                    if (referrer) {
                        referrer.balance += commission;
                        referrer.referralEarnings += commission;
                        await referrer.save({ session });
                        await Transaction.create([{
                            user: referrer._id, type: 'referral_earning', amount: commission, nft: newNft[0]._id, fromUser: buyer._id, status: 'completed'
                        }], { session });
                    }
                }
            }

            return { type: 'primary', nft: newNft[0], buyer, series, transaction: tx[0] };
        }

        // Secondary sale
        if (!nft.isListed) throw new AppError('NFT not listed for sale', 400);

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer._id.toString() === nft.owner.toString()) throw new AppError('Cannot buy your own NFT', 400);
        if (buyer.balance < nft.listPrice) throw new AppError('Insufficient balance', 400);

        const seller = await User.findById(nft.owner).session(session);
        const series = nft.series;
        const price = nft.listPrice;
        const royaltyAmount = Math.floor(price * (series.royaltyPercent / 100));
        const sellerReceives = price - royaltyAmount;

        buyer.balance -= price;
        seller.balance += sellerReceives;
        await buyer.save({ session });
        await seller.save({ session });

        nft.owner = buyer._id;
        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save({ session });

        await Order.create([{
            buyer: buyer._id, seller: seller._id, nft: nft._id, price, royaltyAmount, type: 'secondary', status: 'completed'
        }], { session });

        const tx = await Transaction.create([{
            user: buyer._id, type: 'buy', amount: price, nft: nft._id, fromUser: seller._id, status: 'completed',
            description: `Purchased: ${series.name} #${nft.mintNumber}`
        }], { session });

        await Transaction.create([{
            user: seller._id, type: 'sell', amount: sellerReceives, nft: nft._id, toUser: buyer._id, status: 'completed',
            description: `Sold: ${series.name} #${nft.mintNumber}`
        }], { session });

        if (buyer.referredBy) {
            const commission = Math.floor(price * 0.02);
            if (commission > 0) {
                const referrer = await User.findById(buyer.referredBy).session(session);
                if (referrer) {
                    referrer.balance += commission;
                    referrer.referralEarnings += commission;
                    await referrer.save({ session });
                }
            }
        }

        return { type: 'secondary', nft, buyer, seller, series, price, transaction: tx[0] };
    });

    try {
        const io = getIO();
        if (result.transaction) {
            const activityPopulated = await Transaction.findById(result.transaction._id)
                .populate('user', 'username firstName')
                .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
                .lean();
            io.emit('activity:new', activityPopulated);
        }
        io.emit('nft:sold', { nftId: result.nft._id, buyer: result.buyer._id, price: result.type === 'primary' ? result.series.price : result.price });
    } catch (socketErr) {
        console.error('Socket emit error:', socketErr);
    }

    notifyPurchase(
        result.buyer.telegramId,
        result.type === 'secondary' ? result.seller.telegramId : null,
        result.series.name,
        result.nft.mintNumber,
        (result.type === 'primary' ? result.series.price : result.price) / 1e9
    );
    res.json({ success: true, nft: result.nft });
}));

// List NFT for secondary sale
router.post('/:id/list', auth, validate(listSchema), asyncHandler(async (req, res) => {
    const { price } = req.body;

    const nft = await NFT.findById(req.params.id);
    if (!nft) throw new AppError('NFT not found', 404);
    if (nft.owner.toString() !== req.user._id.toString()) {
        throw new AppError('Not the owner', 403);
    }

    nft.isListed = true;
    nft.listPrice = price;
    await nft.save();

    res.json({ success: true, nft });
}));

// Delist NFT
router.post('/:id/delist', auth, asyncHandler(async (req, res) => {
    const nft = await NFT.findById(req.params.id);
    if (!nft) throw new AppError('NFT not found', 404);
    if (nft.owner.toString() !== req.user._id.toString()) {
        throw new AppError('Not the owner', 403);
    }

    nft.isListed = false;
    nft.listPrice = 0;
    await nft.save();

    res.json({ success: true });
}));

module.exports = router;
