const express = require('express');
const { auth } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const { type, cursor, limit = 20, days } = req.query;
        const filter = { user: req.user._id };

        if (type) filter.type = type;
        if (cursor) filter._id = { $lt: cursor };

        if (days) {
            const dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - parseInt(days));
            filter.createdAt = { $gte: dateLimit };
        }

        const transactions = await Transaction.find(filter)
            .populate('nft', 'mintNumber series')
            .populate('fromUser', 'username')
            .populate('toUser', 'username')
            .sort({ _id: -1 })
            .limit(parseInt(limit) + 1)
            .lean();

        const hasMore = transactions.length > parseInt(limit);
        if (hasMore) transactions.pop();

        const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1]._id : null;

        res.json({
            transactions,
            pagination: { hasMore, nextCursor },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

module.exports = router;
