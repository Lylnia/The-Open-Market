const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Bid = require('../models/Bid');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { notifyBid, notifyPurchase } = require('../services/telegramService');
const asyncHandler = require('express-async-handler');
const validate = require('../middleware/validate');
const { bidSchema } = require('../utils/validations');
const { AppError } = require('../middleware/errorHandler');
const { getIO } = require('../utils/socket');

const router = express.Router();

// Place bid
router.post('/', auth, validate(bidSchema), asyncHandler(async (req, res) => {
    const { nftId, amount, expiresInHours = 48 } = req.body;

    const nft = await NFT.findById(nftId).populate('series', 'name');
    if (!nft) throw new AppError('NFT not found', 404);
    if (!nft.owner) throw new AppError('NFT not owned yet', 400);
    if (nft.owner.toString() === req.user._id.toString()) {
        throw new AppError('Cannot bid on your own NFT', 400);
    }
    if (req.user.balance < amount) throw new AppError('Insufficient balance', 400);

    // Check total active bids don't exceed balance
    const activeBidsTotal = await Bid.aggregate([
        { $match: { bidder: req.user._id, status: 'active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const existingBidsAmount = activeBidsTotal[0]?.total || 0;
    if (existingBidsAmount + amount > req.user.balance) {
        throw new AppError('Total active bids exceed balance', 400);
    }

    const bid = await Bid.create({
        bidder: req.user._id,
        nft: nftId,
        amount,
        expiresAt: new Date(Date.now() + expiresInHours * 3600000),
    });

    const owner = await User.findById(nft.owner);
    if (owner) {
        notifyBid(owner.telegramId, req.user.username, nft.series.name, nft.mintNumber, amount / 1e9);
    }

    res.json({ success: true, bid });
}));

// Accept bid
router.post('/:id/accept', auth, asyncHandler(async (req, res) => {
    let session = await mongoose.startSession();
    try {
        session.startTransaction();
        const bid = await Bid.findById(req.params.id).populate('bidder').session(session);
        if (!bid || bid.status !== 'active') {
            throw new AppError('Active bid not found', 404);
        }

        const nft = await NFT.findById(bid.nft).populate('series').session(session);
        if (!nft || nft.owner.toString() !== req.user._id.toString()) {
            throw new AppError('Not the NFT owner', 403);
        }

        if (new Date() > bid.expiresAt) {
            bid.status = 'expired';
            await bid.save({ session });
            throw new AppError('Bid expired', 400);
        }

        const bidder = await User.findById(bid.bidder._id).session(session);
        if (bidder.balance < bid.amount) {
            bid.status = 'cancelled';
            await bid.save({ session });
            throw new AppError('Bidder insufficient balance', 400);
        }

        const seller = await User.findById(req.user._id).session(session);
        const price = bid.amount;
        const royalty = Math.floor(price * (nft.series.royaltyPercent / 100));
        const sellerReceives = price - royalty;

        bidder.balance -= price;
        seller.balance += sellerReceives;
        await bidder.save({ session });
        await seller.save({ session });

        nft.owner = bidder._id;
        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save({ session });

        bid.status = 'accepted';
        await bid.save({ session });

        // Reject other active bids
        await Bid.updateMany(
            { nft: nft._id, _id: { $ne: bid._id }, status: 'active' },
            { status: 'rejected' },
            { session }
        );

        await Order.create([{
            buyer: bidder._id, seller: seller._id, nft: nft._id,
            price, royaltyAmount: royalty, type: 'secondary', status: 'completed',
        }], { session });

        await Transaction.create([
            { user: bidder._id, type: 'buy', amount: price, nft: nft._id, status: 'completed' },
            { user: seller._id, type: 'sell', amount: sellerReceives, nft: nft._id, status: 'completed' },
        ], { session });

        await session.commitTransaction();

        // Emit real-time events
        try {
            const io = getIO();
            const newTransaction = await Transaction.findOne({ user: bidder._id, nft: nft._id, status: 'completed' }).sort({ createdAt: -1 });
            if (newTransaction) {
                const activityPopulated = await Transaction.findById(newTransaction._id)
                    .populate('user', 'username firstName')
                    .populate({ path: 'nft', populate: { path: 'series', select: 'name slug imageUrl' } })
                    .lean();
                io.emit('activity:new', activityPopulated);
            }
            io.emit('nft:sold', { nftId: nft._id, buyer: bidder._id, price });
        } catch (socketErr) {
            console.error('Socket emit error:', socketErr);
        }

        notifyPurchase(bidder.telegramId, seller.telegramId, nft.series.name, nft.mintNumber, price / 1e9);
        res.json({ success: true });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
}));

// Reject bid
router.post('/:id/reject', auth, asyncHandler(async (req, res) => {
    const bid = await Bid.findById(req.params.id);
    if (!bid || bid.status !== 'active') throw new AppError('Active bid not found', 404);

    const nft = await NFT.findById(bid.nft);
    if (!nft || nft.owner.toString() !== req.user._id.toString()) {
        throw new AppError('Not the NFT owner', 403);
    }

    bid.status = 'rejected';
    await bid.save();

    res.json({ success: true });
}));

module.exports = router;
