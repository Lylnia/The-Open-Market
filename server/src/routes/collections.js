const express = require('express');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const { getCollectionStats } = require('../services/statsService');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const collections = await Collection.find({ isActive: true }).sort({ order: 1 }).lean();
        res.json(collections);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).lean();
        if (!collection) return res.status(404).json({ error: 'Collection not found' });

        const series = await Series.find({ collection: collection._id, isActive: true }).lean();
        const stats = await getCollectionStats(collection._id);

        res.json({ ...collection, series, stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch collection' });
    }
});

module.exports = router;
