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

const router = express.Router();

// List NFTs with filters
router.get('/', async (req, res) => {
    try {
        const { series, owner, listed, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (series) filter.series = series;
        if (owner) filter.owner = owner;
        if (listed === 'true') filter.isListed = true;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const nfts = await NFT.find(filter)
            .populate('series', 'name slug imageUrl price rarity collection')
            .populate('owner', 'username telegramId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await NFT.countDocuments(filter);

        res.json({
            nfts,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch NFTs' });
    }
});

// Get single NFT
router.get('/:id', async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id)
            .populate({ path: 'series', populate: { path: 'collection', select: 'name slug' } })
            .populate('owner', 'username telegramId firstName photoUrl')
            .lean();
        if (!nft) return res.status(404).json({ error: 'NFT not found' });

        const Bid = require('../models/Bid');
        const bids = await Bid.find({ nft: nft._id, status: 'active' })
            .populate('bidder', 'username telegramId')
            .sort({ amount: -1 })
            .lean();

        const priceHistory = await getPriceHistory(nft._id);

        res.json({ ...nft, bids, priceHistory });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch NFT' });
    }
});

// Get NFT price history
router.get('/:id/price-history', async (req, res) => {
    try {
        const priceHistory = await getPriceHistory(req.params.id);
        res.json(priceHistory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch price history' });
    }
});

// Primary mint (lazy mint from series page)
router.post('/mint', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { seriesId, mintNumber } = req.body;
        if (!seriesId || !mintNumber) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'seriesId and mintNumber required' });
        }

        const series = await Series.findById(seriesId).session(session);
        if (!series || !series.isActive) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Series not found or inactive' });
        }

        if (series.mintedCount >= series.totalSupply) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Series sold out' });
        }

        if (mintNumber < 1 || mintNumber > series.totalSupply) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Invalid mint number' });
        }

        const existing = await NFT.findOne({ series: seriesId, mintNumber }).session(session);
        if (existing) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'This NFT already minted' });
        }

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer.balance < series.price) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient balance' });
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

        await Transaction.create([{
            user: buyer._id,
            type: 'buy',
            amount: series.price,
            nft: newNft[0]._id,
            status: 'completed',
            description: `${series.name} #${mintNumber} purchased`,
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

        notifyPurchase(buyer.telegramId, null, series.name, mintNumber, series.price / 1e9);
        res.json({ success: true, nft: newNft[0] });
    } catch (error) {
        await session.abortTransaction();
        console.error('Mint error:', error);
        res.status(500).json({ error: 'Mint failed' });
    } finally {
        session.endSession();
    }
});

// Buy NFT (primary or secondary)
router.post('/:id/buy', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const nft = await NFT.findById(req.params.id).populate('series').session(session);

        // If NFT doesn't exist yet, it's a primary sale (lazy mint)
        if (!nft) {
            const { seriesId, mintNumber } = req.body;
            if (!seriesId || !mintNumber) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'seriesId and mintNumber required for primary purchase' });
            }

            const series = await Series.findById(seriesId).session(session);
            if (!series || !series.isActive) {
                await session.abortTransaction();
                return res.status(404).json({ error: 'Series not found or inactive' });
            }

            if (series.mintedCount >= series.totalSupply) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Series sold out' });
            }

            if (mintNumber < 1 || mintNumber > series.totalSupply) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Invalid mint number' });
            }

            const existing = await NFT.findOne({ series: seriesId, mintNumber }).session(session);
            if (existing) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'This NFT already minted' });
            }

            const buyer = await User.findById(req.user._id).session(session);
            if (buyer.balance < series.price) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Insufficient balance' });
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

            // Create transaction
            await Transaction.create([{
                user: buyer._id,
                type: 'buy',
                amount: series.price,
                nft: newNft[0]._id,
                status: 'completed',
                description: `${series.name} #${mintNumber} purchased`,
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

            notifyPurchase(buyer.telegramId, null, series.name, mintNumber, series.price / 1e9);
            return res.json({ success: true, nft: newNft[0] });
        }

        // Secondary sale
        if (!nft.isListed) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'NFT not listed for sale' });
        }

        const buyer = await User.findById(req.user._id).session(session);
        if (buyer._id.toString() === nft.owner.toString()) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Cannot buy your own NFT' });
        }

        if (buyer.balance < nft.listPrice) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient balance' });
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

        // Transaction records
        await Transaction.create([
            { user: buyer._id, type: 'buy', amount: price, nft: nft._id, status: 'completed' },
            { user: seller._id, type: 'sell', amount: sellerReceives, nft: nft._id, status: 'completed' },
        ], { session });

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

        notifyPurchase(buyer.telegramId, seller.telegramId, series.name, nft.mintNumber, price / 1e9);
        res.json({ success: true, nft });
    } catch (error) {
        await session.abortTransaction();
        console.error('Buy error:', error);
        res.status(500).json({ error: 'Purchase failed' });
    } finally {
        session.endSession();
    }
});

// List NFT for secondary sale
router.post('/:id/list', auth, async (req, res) => {
    try {
        const { price } = req.body;
        if (!price || price <= 0) return res.status(400).json({ error: 'Valid price required' });

        const nft = await NFT.findById(req.params.id);
        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        if (nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not the owner' });
        }

        nft.isListed = true;
        nft.listPrice = price;
        await nft.save();

        res.json({ success: true, nft });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list NFT' });
    }
});

// Delist NFT
router.post('/:id/delist', auth, async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id);
        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        if (nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not the owner' });
        }

        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delist NFT' });
    }
});

module.exports = router;
