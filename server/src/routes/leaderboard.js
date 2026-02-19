const express = require('express');
const User = require('../models/User');
const NFT = require('../models/NFT');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { type = 'balance', page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let leaderboard;

        if (type === 'nft') {
            leaderboard = await NFT.aggregate([
                { $match: { owner: { $ne: null } } },
                { $group: { _id: '$owner', nftCount: { $sum: 1 } } },
                { $sort: { nftCount: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                { $unwind: '$user' },
                { $project: { username: '$user.username', firstName: '$user.firstName', photoUrl: '$user.photoUrl', telegramId: '$user.telegramId', nftCount: 1 } },
            ]);
        } else {
            leaderboard = await User.find({ balance: { $gt: 0 } })
                .select('username firstName photoUrl telegramId balance')
                .sort({ balance: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();
        }

        res.json({ type, leaderboard });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
