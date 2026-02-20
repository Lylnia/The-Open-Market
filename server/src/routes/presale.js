const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const PreSale = require('../models/PreSale');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const presales = await PreSale.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        })
            .populate({ path: 'series', populate: { path: 'collection', select: 'name slug' } })
            .lean();

        // Also include upcoming pre-sales
        const upcoming = await PreSale.find({
            isActive: true,
            startDate: { $gt: now },
        })
            .populate({ path: 'series', populate: { path: 'collection', select: 'name slug' } })
            .lean();

        res.json({ active: presales, upcoming });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pre-sales' });
    }
});

router.post('/:id/buy', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const presale = await PreSale.findById(req.params.id).session(session);
        if (!presale || !presale.isActive) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Pre-sale not found' });
        }

        const now = new Date();
        if (now < presale.startDate || now > presale.endDate) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Pre-sale not active' });
        }

        if (presale.soldCount >= presale.totalSupply) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Pre-sale sold out' });
        }

        // Check per-user limit for THIS specific presale
        const userPurchases = await Order.countDocuments({
            buyer: req.user._id,
            type: 'presale',
            status: 'completed',
            nft: { $in: await NFT.find({ series: presale.series }).select('_id').session(session).then(nfts => nfts.map(n => n._id)) },
        }).session(session);

        if (userPurchases >= presale.maxPerUser) {
            await session.abortTransaction();
            return res.status(400).json({ error: `Max ${presale.maxPerUser} per user` });
        }

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer.balance < presale.price) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const series = await Series.findById(presale.series).session(session);
        if (series.mintedCount >= series.totalSupply) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Series sold out' });
        }

        // Generate fully random available mint number
        const existingMints = await NFT.find({ series: series._id }).select('mintNumber').lean().session(session);
        const mintedSet = new Set(existingMints.map(n => n.mintNumber));
        const availableItems = [];
        for (let i = 1; i <= series.totalSupply; i++) {
            if (!mintedSet.has(i)) availableItems.push(i);
        }

        if (availableItems.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Series sold out' });
        }

        const mintNumber = availableItems[Math.floor(Math.random() * availableItems.length)];

        // Deduct balance
        buyer.balance -= presale.price;
        await buyer.save({ session });

        // Create NFT (lazy mint)
        const nft = await NFT.create([{
            series: series._id,
            mintNumber,
            owner: buyer._id,
        }], { session });

        // Update counts
        series.mintedCount += 1;
        await series.save({ session });
        presale.soldCount += 1;
        await presale.save({ session });

        // Create order
        await Order.create([{
            buyer: buyer._id,
            nft: nft[0]._id,
            price: presale.price,
            type: 'presale',
            status: 'completed',
        }], { session });

        // Transaction record
        await Transaction.create([{
            user: buyer._id,
            type: 'buy',
            amount: presale.price,
            nft: nft[0]._id,
            status: 'completed',
            description: `Pre-sale: ${series.name} #${mintNumber}`,
        }], { session });

        await session.commitTransaction();
        res.json({ success: true, nft: nft[0] });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'Pre-sale purchase failed' });
    } finally {
        session.endSession();
    }
});

module.exports = router;
