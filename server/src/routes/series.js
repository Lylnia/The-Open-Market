const express = require('express');
const Series = require('../models/Series');
const NFT = require('../models/NFT');
const { getSeriesStats } = require('../services/statsService');

const router = express.Router();

router.get('/:slug', async (req, res) => {
    try {
        const series = await Series.findOne({ slug: req.params.slug, isActive: true })
            .populate('collection', 'name slug logoUrl')
            .lean();
        if (!series) return res.status(404).json({ error: 'Series not found' });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const nfts = await NFT.find({ series: series._id })
            .populate('owner', 'username telegramId')
            .sort({ mintNumber: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalNfts = await NFT.countDocuments({ series: series._id });
        const stats = await getSeriesStats(series._id);

        res.json({
            ...series,
            stats,
            nfts,
            pagination: {
                page,
                limit,
                total: totalNfts,
                pages: Math.ceil(totalNfts / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch series' });
    }
});

module.exports = router;
