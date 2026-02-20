const express = require('express');
const Collection = require('../models/Collection');
const Series = require('../models/Series');
const { getCollectionStats } = require('../services/statsService');
const asyncHandler = require('express-async-handler');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const collections = await Collection.find({ isActive: true })
        .sort({ order: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

    const total = await Collection.countDocuments({ isActive: true });

    res.json({
        data: collections,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
    const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!collection) throw new AppError('Collection not found', 404);

    const series = await Series.find({ collection: collection._id, isActive: true }).lean();
    const stats = await getCollectionStats(collection._id);

    res.json({ ...collection, series, stats });
}));

module.exports = router;
