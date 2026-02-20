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
    if (listed === 'true') filter.isListed = true;

    if (collection) {
        const seriesInCol = await Series.find({ collection }).select('_id').lean();
        if (!filter.series) filter.series = { $in: seriesInCol.map(s => s._id) };
    }

    if (search && search.trim().length > 0) {
        const matchingSeries = await Series.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
        const seriesIds = matchingSeries.map(s => s._id);
        const searchNum = parseInt(search);

        if (!isNaN(searchNum)) {
            filter.$or = [
                { series: { $in: seriesIds } },
                { mintNumber: searchNum }
            ];
        } else if (seriesIds.length > 0) {
            filter.series = filter.series ? { $in: seriesIds.filter(id => filter.series.$in?.includes(id) || filter.series === id) } : { $in: seriesIds };
        } else {
            // Nothing matches
            filter._id = null;
        }
    }

    let sortConfig = { listPrice: 1, createdAt: 1 };
    if (sort === 'price_desc') sortConfig = { listPrice: -1, createdAt: -1 };
    if (sort === 'number_asc') sortConfig = { mintNumber: 1, createdAt: 1 };
    if (sort === 'number_desc') sortConfig = { mintNumber: -1, createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const nfts = await NFT.find(filter)
        .populate('series', 'name slug imageUrl price collection')
        .populate('owner', 'username telegramId')
        .sort(sortConfig)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await NFT.countDocuments(filter);

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
    let session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { seriesId } = req.body;
        if (!seriesId) {
            throw new AppError('seriesId required', 400);
        }

        const series = await Series.findById(seriesId).session(session);
        if (!series || !series.isActive) {
            throw new AppError('Series not found or inactive', 404);
        }

        if (series.mintedCount >= series.totalSupply) {
            throw new AppError('Series sold out', 400);
        }

        // Generate fully random available mint number
        const existingMints = await NFT.find({ series: seriesId }).select('mintNumber').lean().session(session);
        const mintedSet = new Set(existingMints.map(n => n.mintNumber));
        const availableItems = [];
        for (let i = 1; i <= series.totalSupply; i++) {
            if (!mintedSet.has(i)) availableItems.push(i);
        }

        if (availableItems.length === 0) throw new AppError('Series sold out', 400);

        const mintNumber = availableItems[Math.floor(Math.random() * availableItems.length)];

        const existing = await NFT.findOne({ series: seriesId, mintNumber }).session(session);
        if (existing) {
            throw new AppError('This NFT already minted', 400);
        }

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer.balance < series.price) {
            throw new AppError('Insufficient balance', 400);
        }

        buyer.balance -= series.price;
        await buyer.save({ session });

        const newNft = await NFT.create([{
            series: seriesId,
            mintNumber,
            owner: buyer._id,
        }], { session });

        series.mintedCount += 1;
        await series.save({ session });

        await Order.create([{
            buyer: buyer._id,
            nft: newNft[0]._id,
            price: series.price,
            type: 'primary',
            status: 'completed',
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
                        user: referrer._id,
                        type: 'referral_earning',
                        amount: commission,
                        nft: newNft[0]._id,
                        fromUser: buyer._id,
                        status: 'completed',
                    }], { session });
                }
            }
        }

        await session.commitTransaction();

        // Emit real-time events
        try {
            const io = getIO();
            const activityPopulated = await Transaction.findById(newTransaction[0]._id)
                .populate('user', 'username firstName')
                .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
                .lean();
            io.emit('activity:new', activityPopulated);
            io.emit('nft:sold', { nftId: newNft[0]._id, buyer: buyer._id, price: series.price });
        } catch (socketErr) {
            console.error('Socket emit error:', socketErr);
        }

        notifyPurchase(buyer.telegramId, null, series.name, mintNumber, series.price / 1e9);
        res.json({ success: true, nft: newNft[0] });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
}));

// Buy NFT (primary or secondary)
router.post('/:id/buy', auth, validate(buySchema), asyncHandler(async (req, res) => {
    let session = await mongoose.startSession();
    try {
        session.startTransaction();
        const nft = await NFT.findById(req.params.id).populate('series').session(session);

        // If NFT doesn't exist yet, it's a primary sale (lazy mint)
        if (!nft) {
            const { seriesId, mintNumber } = req.body;
            if (!seriesId || !mintNumber) {
                throw new AppError('seriesId and mintNumber required for primary purchase', 400);
            }

            const series = await Series.findById(seriesId).session(session);
            if (!series || !series.isActive) {
                throw new AppError('Series not found or inactive', 404);
            }

            if (series.mintedCount >= series.totalSupply) {
                throw new AppError('Series sold out', 400);
            }

            if (mintNumber < 1 || mintNumber > series.totalSupply) {
                throw new AppError('Invalid mint number', 400);
            }

            const existing = await NFT.findOne({ series: seriesId, mintNumber }).session(session);
            if (existing) {
                throw new AppError('This NFT already minted', 400);
            }

            const buyer = await User.findById(req.user._id).session(session);
            if (buyer.balance < series.price) {
                throw new AppError('Insufficient balance', 400);
            }

            // Deduct balance
            buyer.balance -= series.price;
            await buyer.save({ session });

            // Create NFT (lazy mint)
            const newNft = await NFT.create([{
                series: seriesId,
                mintNumber,
                owner: buyer._id,
            }], { session });

            // Update series minted count
            series.mintedCount += 1;
            await series.save({ session });

            // Create order
            await Order.create([{
                buyer: buyer._id,
                nft: newNft[0]._id,
                price: series.price,
                type: 'primary',
                status: 'completed',
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
                            user: referrer._id,
                            type: 'referral_earning',
                            amount: commission,
                            nft: newNft[0]._id,
                            fromUser: buyer._id,
                            status: 'completed',
                        }], { session });
                    }
                }
            }

            await session.commitTransaction();

            // Emit real-time events
            try {
                const io = getIO();
                const newTransaction = await Transaction.findOne({ user: buyer._id, nft: newNft[0]._id, status: 'completed' }).sort({ createdAt: -1 });
                if (newTransaction) {
                    const activityPopulated = await Transaction.findById(newTransaction._id)
                        .populate('user', 'username firstName')
                        .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
                        .lean();
                    io.emit('activity:new', activityPopulated);
                }
                io.emit('nft:sold', { nftId: newNft[0]._id, buyer: buyer._id, price: series.price });
            } catch (socketErr) {
                console.error('Socket emit error:', socketErr);
            }

            notifyPurchase(buyer.telegramId, null, series.name, mintNumber, series.price / 1e9);
            return res.json({ success: true, nft: newNft[0] });
        }

        // Secondary sale
        if (!nft.isListed) {
            throw new AppError('NFT not listed for sale', 400);
        }

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer._id.toString() === nft.owner.toString()) {
            throw new AppError('Cannot buy your own NFT', 400);
        }

        if (buyer.balance < nft.listPrice) {
            throw new AppError('Insufficient balance', 400);
        }

        const seller = await User.findById(nft.owner).session(session);
        const series = nft.series;
        const price = nft.listPrice;

        // Calculate royalty
        const royaltyAmount = Math.floor(price * (series.royaltyPercent / 100));
        const sellerReceives = price - royaltyAmount;

        // Transfer funds
        buyer.balance -= price;
        seller.balance += sellerReceives;
        await buyer.save({ session });
        await seller.save({ session });

        // Transfer NFT
        nft.owner = buyer._id;
        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save({ session });

        // Create order
        await Order.create([{
            buyer: buyer._id,
            seller: seller._id,
            nft: nft._id,
            price,
            royaltyAmount,
            type: 'secondary',
            status: 'completed',
        }], { session });

        // Referral for buyer
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

        await session.commitTransaction();

        // Emit real-time events
        try {
            const io = getIO();
            const newTransaction = await Transaction.findOne({ user: buyer._id, nft: nft._id, status: 'completed' }).sort({ createdAt: -1 });
            if (newTransaction) {
                const activityPopulated = await Transaction.findById(newTransaction._id)
                    .populate('user', 'username firstName')
                    .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
                    .lean();
                io.emit('activity:new', activityPopulated);
            }
            io.emit('nft:sold', { nftId: nft._id, buyer: buyer._id, price });
        } catch (socketErr) {
            console.error('Socket emit error:', socketErr);
        }

        notifyPurchase(buyer.telegramId, seller.telegramId, series.name, nft.mintNumber, price / 1e9);
        res.json({ success: true, nft });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
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
