const express = require('express');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const asyncHandler = require('express-async-handler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    const { q, limit = 10 } = req.query;
    if (!q || q.length < 2) return res.json({ collections: [], series: [], nfts: [] });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const [collections, series] = await Promise.all([
        Collection.find({ name: regex, isActive: true }).select('name slug logoUrl').limit(parseInt(limit)).lean(),
        Series.find({ name: regex, isActive: true }).select('name slug imageUrl price rarity').populate('collection', 'name slug').limit(parseInt(limit)).lean(),
    ]);

    res.json({ collections, series });
}));

module.exports = router;
