const express = require('express');
const { auth } = require('../middleware/auth');
const Bid = require('../models/Bid');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { notifyBid, notifyPurchase } = require('../services/telegramService');

const router = express.Router();

// Place bid
router.post('/', auth, async (req, res) => {
    try {
        const { nftId, amount, expiresInHours = 48 } = req.body;
        if (!nftId || !amount) return res.status(400).json({ error: 'nftId and amount required' });

        const nft = await NFT.findById(nftId).populate('series', 'name');
        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        if (!nft.owner) return res.status(400).json({ error: 'NFT not owned yet' });
        if (nft.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot bid on your own NFT' });
        }
        if (req.user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

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
    } catch (error) {
        res.status(500).json({ error: 'Failed to place bid' });
    }
});

// Accept bid
router.post('/:id/accept', auth, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id).populate('bidder');
        if (!bid || bid.status !== 'active') return res.status(404).json({ error: 'Active bid not found' });

        const nft = await NFT.findById(bid.nft).populate('series');
        if (!nft || nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not the NFT owner' });
        }

        if (new Date() > bid.expiresAt) {
            bid.status = 'expired';
            await bid.save();
            return res.status(400).json({ error: 'Bid expired' });
        }

        const bidder = await User.findById(bid.bidder._id);
        if (bidder.balance < bid.amount) {
            bid.status = 'cancelled';
            await bid.save();
            return res.status(400).json({ error: 'Bidder insufficient balance' });
        }

        const seller = req.user;
        const price = bid.amount;
        const royalty = Math.floor(price * (nft.series.royaltyPercent / 100));
        const sellerReceives = price - royalty;

        bidder.balance -= price;
        seller.balance += sellerReceives;
        await bidder.save();
        await seller.save();

        nft.owner = bidder._id;
        nft.isListed = false;
        nft.listPrice = 0;
        await nft.save();

        bid.status = 'accepted';
        await bid.save();

        // Reject other bids
        await Bid.updateMany({ nft: nft._id, _id: { $ne: bid._id }, status: 'active' }, { status: 'rejected' });

        await Order.create({ buyer: bidder._id, seller: seller._id, nft: nft._id, price, royaltyAmount: royalty, type: 'secondary', status: 'completed' });
        await Transaction.create([
            { user: bidder._id, type: 'buy', amount: price, nft: nft._id, status: 'completed' },
            { user: seller._id, type: 'sell', amount: sellerReceives, nft: nft._id, status: 'completed' },
        ]);

        notifyPurchase(bidder.telegramId, seller.telegramId, nft.series.name, nft.mintNumber, price / 1e9);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to accept bid' });
    }
});

// Reject bid
router.post('/:id/reject', auth, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id);
        if (!bid || bid.status !== 'active') return res.status(404).json({ error: 'Active bid not found' });

        const nft = await NFT.findById(bid.nft);
        if (!nft || nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not the NFT owner' });
        }

        bid.status = 'rejected';
        await bid.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject bid' });
    }
});

module.exports = router;
