const express = require('express');
const { auth } = require('../middleware/auth');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { notifyTransfer } = require('../services/telegramService');

const router = express.Router();

router.post('/send', auth, async (req, res) => {
    try {
        const { nftId, toUsername, toTelegramId } = req.body;
        if (!nftId) return res.status(400).json({ error: 'NFT ID required' });
        if (!toUsername && !toTelegramId) return res.status(400).json({ error: 'Recipient required' });

        const nft = await NFT.findById(nftId).populate('series', 'name');
        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        if (nft.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not the owner' });
        }
        if (nft.isListed) return res.status(400).json({ error: 'Delist NFT first' });

        let recipient;
        if (toTelegramId) {
            recipient = await User.findOne({ telegramId: toTelegramId });
        } else {
            recipient = await User.findOne({ username: toUsername });
        }

        if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
        if (recipient._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        nft.owner = recipient._id;
        await nft.save();

        // Transaction records
        await Transaction.create([
            { user: req.user._id, type: 'transfer_out', nft: nft._id, toUser: recipient._id, status: 'completed', description: `${nft.series.name} #${nft.mintNumber} transfer edildi` },
            { user: recipient._id, type: 'transfer_in', nft: nft._id, fromUser: req.user._id, status: 'completed', description: `${nft.series.name} #${nft.mintNumber} alındı` },
        ]);

        notifyTransfer(req.user.telegramId, recipient.telegramId, nft.series.name, nft.mintNumber);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Transfer failed' });
    }
});

module.exports = router;
