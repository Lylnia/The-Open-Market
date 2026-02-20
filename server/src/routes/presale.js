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
    const { withRetry } = require('../utils/transactionRetry');
    try {
        const result = await withRetry(async (session) => {
            const throwErr = (msg, status = 400) => { const e = new Error(msg); e.statusCode = status; throw e; };

            const presale = await PreSale.findById(req.params.id).session(session);
            if (!presale || !presale.isActive) throwErr('Pre-sale not found', 404);

            const now = new Date();
            if (now < presale.startDate || now > presale.endDate) throwErr('Pre-sale not active', 400);
            if (presale.soldCount >= presale.totalSupply) throwErr('Pre-sale sold out', 400);

            const userPurchases = await Order.countDocuments({
                buyer: req.user._id,
                type: 'presale',
                status: 'completed',
                nft: { $in: await NFT.find({ series: presale.series }).select('_id').session(session).then(nfts => nfts.map(n => n._id)) },
            }).session(session);

            if (userPurchases >= presale.maxPerUser) throwErr(`Max ${presale.maxPerUser} per user`, 400);

            const buyer = await User.findById(req.user._id).session(session);
            if (buyer.balance < presale.price) throwErr('Insufficient balance', 400);

            const series = await Series.findById(presale.series).session(session);
            if (series.mintedCount >= series.totalSupply) throwErr('Series sold out', 400);

            const existingMints = await NFT.find({ series: series._id }).select('mintNumber').lean().session(session);
            const mintedSet = new Set(existingMints.map(n => n.mintNumber));
            const availableItems = [];
            for (let i = 1; i <= series.totalSupply; i++) {
                if (!mintedSet.has(i)) availableItems.push(i);
            }

            if (availableItems.length === 0) throwErr('Series sold out', 400);

            const mintNumber = availableItems[Math.floor(Math.random() * availableItems.length)];

            buyer.balance -= presale.price;
            await buyer.save({ session });

            const nft = await NFT.create([{ series: series._id, mintNumber, owner: buyer._id }], { session });

            series.mintedCount += 1;
            await series.save({ session });
            presale.soldCount += 1;
            await presale.save({ session });

            await Order.create([{
                buyer: buyer._id, nft: nft[0]._id, price: presale.price, type: 'presale', status: 'completed'
            }], { session });

            await Transaction.create([{
                user: buyer._id, type: 'buy', amount: presale.price, nft: nft[0]._id, status: 'completed',
                description: `Pre-sale: ${series.name} #${mintNumber}`,
            }], { session });

            return { nft: nft[0] };
        });

        res.json({ success: true, nft: result.nft });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Pre-sale purchase failed' });
    }
});

module.exports = router;
