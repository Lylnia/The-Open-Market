const express = require('express');
const apiKeyAuth = require('../middleware/apiKey');
const User = require('../models/User');
const NFT = require('../models/NFT');
const Series = require('../models/Series');

const router = express.Router();

// Verify NFT ownership
router.get('/verify', apiKeyAuth('verify'), async (req, res) => {
    try {
        const { telegramId, series: seriesSlug, collection: collectionSlug } = req.query;
        if (!telegramId) return res.status(400).json({ error: 'telegramId required' });

        const user = await User.findOne({ telegramId: parseInt(telegramId) });
        if (!user) return res.json({ owns: false, nfts: [] });

        let filter = { owner: user._id };

        if (seriesSlug) {
            const series = await Series.findOne({ slug: seriesSlug });
            if (!series) return res.json({ owns: false, nfts: [] });
            filter.series = series._id;
        }

        const nfts = await NFT.find(filter)
            .populate({ path: 'series', select: 'name slug rarity attributes collection', populate: { path: 'collection', select: 'name slug' } })
            .lean();

        res.json({ owns: nfts.length > 0, count: nfts.length, nfts });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get user's NFTs
router.get('/user/:telegramId/nfts', apiKeyAuth('list_nfts'), async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const nfts = await NFT.find({ owner: user._id })
            .populate({ path: 'series', select: 'name slug imageUrl rarity attributes', populate: { path: 'collection', select: 'name slug' } })
            .lean();

        res.json({ telegramId: user.telegramId, username: user.username, nfts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user NFTs' });
    }
});

// Get series holders
router.get('/series/:slug/holders', apiKeyAuth('list_holders'), async (req, res) => {
    try {
        const series = await Series.findOne({ slug: req.params.slug });
        if (!series) return res.status(404).json({ error: 'Series not found' });

        const nfts = await NFT.find({ series: series._id, owner: { $ne: null } })
            .populate('owner', 'username telegramId')
            .select('mintNumber owner')
            .lean();

        const holders = {};
        nfts.forEach(nft => {
            const key = nft.owner.telegramId;
            if (!holders[key]) {
                holders[key] = { telegramId: nft.owner.telegramId, username: nft.owner.username, nfts: [] };
            }
            holders[key].nfts.push({ mintNumber: nft.mintNumber, id: nft._id });
        });

        res.json({ series: series.name, holderCount: Object.keys(holders).length, holders: Object.values(holders) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch holders' });
    }
});

// Get NFT detail
router.get('/nft/:id', apiKeyAuth('nft_detail'), async (req, res) => {
    try {
        const nft = await NFT.findById(req.params.id)
            .populate({ path: 'series', populate: { path: 'collection', select: 'name slug' } })
            .populate('owner', 'username telegramId')
            .lean();

        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        res.json(nft);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch NFT' });
    }
});

module.exports = router;
