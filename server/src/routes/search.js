const express = require('express');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const NFT = require('../models/NFT');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q || q.length < 2) return res.json({ collections: [], series: [], nfts: [] });

        const regex = new RegExp(q, 'i');

        const [collections, series] = await Promise.all([
            Collection.find({ name: regex, isActive: true }).select('name slug logoUrl').limit(parseInt(limit)).lean(),
            Series.find({ name: regex, isActive: true }).select('name slug imageUrl price rarity').populate('collection', 'name slug').limit(parseInt(limit)).lean(),
        ]);

        res.json({ collections, series });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
