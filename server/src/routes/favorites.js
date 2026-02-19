const express = require('express');
const { auth } = require('../middleware/auth');
const Favorite = require('../models/Favorite');
const Collection = require('../models/Collection');
const Series = require('../models/Series');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const { type } = req.query;
        const filter = { user: req.user._id };
        if (type) filter.targetType = type;

        const favorites = await Favorite.find(filter).sort({ createdAt: -1 }).lean();

        // Populate based on type
        const populated = await Promise.all(favorites.map(async (fav) => {
            if (fav.targetType === 'collection') {
                fav.targetData = await Collection.findById(fav.target).select('name slug logoUrl').lean();
            } else {
                fav.targetData = await Series.findById(fav.target).select('name slug imageUrl price rarity').lean();
            }
            return fav;
        }));

        res.json(populated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

router.post('/toggle', auth, async (req, res) => {
    try {
        const { targetType, targetId } = req.body;
        if (!targetType || !targetId) return res.status(400).json({ error: 'targetType and targetId required' });

        const existing = await Favorite.findOne({ user: req.user._id, target: targetId });
        if (existing) {
            await existing.deleteOne();
            res.json({ favorited: false });
        } else {
            await Favorite.create({ user: req.user._id, targetType, target: targetId });
            res.json({ favorited: true });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

module.exports = router;
