const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const PreSale = require('../models/PreSale');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const PresalePledge = require('../models/PresalePledge');

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

router.post('/:id/pledge', auth, async (req, res) => {
    const { withRetry } = require('../utils/transactionRetry');
    const { amount = 1 } = req.body; // Amount of packages/tickets to pledge for

    if (amount < 1 || amount > 100) return res.status(400).json({ error: 'Invalid amount' });

    try {
        const result = await withRetry(async (session) => {
            const throwErr = (msg, status = 400) => { const e = new Error(msg); e.statusCode = status; throw e; };

            const presale = await PreSale.findById(req.params.id).session(session);
            if (!presale || !presale.isActive) throwErr('Pre-sale not found', 404);

            const now = new Date();
            if (now < presale.startDate || now > presale.endDate) throwErr('Pre-sale not active', 400);

            // Check how many pledges this user already has for this presale
            const existingPledges = await PresalePledge.find({ buyer: req.user._id, presale: presale._id }).session(session);
            const userTotalPledged = existingPledges.reduce((sum, p) => sum + p.amountLocked, 0);

            if (userTotalPledged + amount > presale.maxPerUser) throwErr(`Max ${presale.maxPerUser} packages per user. You have ${userTotalPledged}.`, 400);

            const totalCost = presale.price * amount;

            const buyer = await User.findById(req.user._id).session(session);
            if (buyer.balance < totalCost) throwErr('Insufficient balance', 400);

            buyer.balance -= totalCost;
            await buyer.save({ session });

            const pledge = await PresalePledge.create([{
                buyer: buyer._id,
                presale: presale._id,
                amountLocked: amount,
                status: 'pending_draw'
            }], { session });

            await Transaction.create([{
                user: buyer._id, type: 'locked', amount: totalCost, status: 'completed',
                description: `Locked TON for Pre-sale Pledge: ${presale.name} (x${amount})`,
            }], { session });

            return { pledge: pledge[0] };
        });

        res.json({ success: true, pledge: result.pledge });
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message || 'Pledge failed' });
    }
});

// Admin-only route to execute the draw
router.post('/:id/draw', auth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Access denied' });

    try {
        const presale = await PreSale.findById(req.params.id);
        if (!presale) return res.status(404).json({ error: 'Pre-sale not found' });

        const series = await Series.findById(presale.series);
        if (!series) return res.status(404).json({ error: 'Assigned series not found' });

        const now = new Date();
        if (now <= presale.endDate) return res.status(400).json({ error: 'Pre-sale is still active. Cannot draw yet.' });

        // Get all pending pledges
        const pledges = await PresalePledge.find({ presale: presale._id, status: 'pending_draw' }).populate('buyer');

        let totalPledgedCapacity = pledges.reduce((sum, p) => sum + p.amountLocked, 0);
        let itemsRemainingToDistribute = presale.totalSupply - presale.soldCount;

        if (itemsRemainingToDistribute <= 0) return res.status(400).json({ error: 'All items already minted for this presale.' });

        // Find available mint numbers in the series
        const existingMints = await NFT.find({ series: series._id }).select('mintNumber').lean();
        const mintedSet = new Set(existingMints.map(n => n.mintNumber));
        const availableMintNumbers = [];
        for (let i = 1; i <= series.totalSupply; i++) {
            if (!mintedSet.has(i)) availableMintNumbers.push(i);
        }

        // Expanded flat array of "tickets" matching pledge IDs
        let ticketPool = [];
        for (const p of pledges) {
            for (let i = 0; i < p.amountLocked; i++) {
                ticketPool.push(p._id.toString());
            }
        }

        // Shuffle
        for (let i = ticketPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ticketPool[i], ticketPool[j]] = [ticketPool[j], ticketPool[i]];
        }

        const winCounts = {}; // pledgeId: number of wins
        const winLimit = Math.min(itemsRemainingToDistribute, availableMintNumbers.length);

        const winningTickets = ticketPool.slice(0, winLimit);
        winningTickets.forEach(tid => {
            winCounts[tid] = (winCounts[tid] || 0) + 1;
        });

        // Resolve each pledge
        for (const pledge of pledges) {
            const pidStr = pledge._id.toString();
            const wins = winCounts[pidStr] || 0;
            const losses = pledge.amountLocked - wins;

            if (wins > 0) {
                // Mint NFTs for wins
                for (let w = 0; w < wins; w++) {
                    const mintNumber = availableMintNumbers.pop();
                    const newNft = await NFT.create({ series: series._id, mintNumber, owner: pledge.buyer._id });

                    presale.soldCount += 1;
                    series.mintedCount += 1;

                    await Order.create({
                        buyer: pledge.buyer._id, nft: newNft._id, price: presale.price, type: 'presale', status: 'completed'
                    });
                }

                // Keep the subset of funds for wins, mark pledge as won (or partially won if losses > 0)
                pledge.status = 'won';
            } else {
                pledge.status = 'lost';
            }

            if (losses > 0) {
                // Refund the unused/lost locked TON
                const refundAmount = losses * presale.price;
                const buyer = await User.findById(pledge.buyer._id);
                if (buyer) {
                    buyer.balance += refundAmount;
                    await buyer.save();

                    await Transaction.create({
                        user: buyer._id, type: 'refund', amount: refundAmount, status: 'completed',
                        description: `Pre-sale Refund: ${losses} ${losses === 1 ? 'pack' : 'packs'} lost in raffle for ${presale.name}`,
                    });
                }
            }

            await pledge.save();
        }

        await presale.save();
        await series.save();

        res.json({ success: true, message: 'Draw completed, winners assigned and funds refunded.' });
    } catch (error) {
        console.error('Pre-sale draw error:', error);
        res.status(500).json({ error: 'Pre-sale draw failed' });
    }
});

module.exports = router;
