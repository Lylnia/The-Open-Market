const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const NFT = require('../models/NFT');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { notifyTransfer } = require('../services/telegramService');

const router = express.Router();

router.post('/send', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { nftId, toUsername, toTelegramId } = req.body;
        if (!nftId) { await session.abortTransaction(); return res.status(400).json({ error: 'NFT ID required' }); }
        if (!toUsername && !toTelegramId) { await session.abortTransaction(); return res.status(400).json({ error: 'Recipient required' }); }

        const nft = await NFT.findById(nftId).populate('series', 'name').session(session);
        if (!nft) { await session.abortTransaction(); return res.status(404).json({ error: 'NFT not found' }); }
        if (nft.owner.toString() !== req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({ error: 'Not the owner' });
        }
        if (nft.isListed) { await session.abortTransaction(); return res.status(400).json({ error: 'Delist NFT first' }); }

        let recipient;
        if (toTelegramId) {
            recipient = await User.findOne({ telegramId: toTelegramId }).session(session);
        } else {
            recipient = await User.findOne({ username: toUsername }).session(session);
        }

        if (!recipient) { await session.abortTransaction(); return res.status(404).json({ error: 'Recipient not found' }); }
        if (recipient._id.toString() === req.user._id.toString()) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        nft.owner = recipient._id;
        await nft.save({ session });

        // Transaction records
        await Transaction.create([
            { user: req.user._id, type: 'transfer_out', nft: nft._id, toUser: recipient._id, status: 'completed', description: `${nft.series.name} #${nft.mintNumber} transferred` },
            { user: recipient._id, type: 'transfer_in', nft: nft._id, fromUser: req.user._id, status: 'completed', description: `${nft.series.name} #${nft.mintNumber} received` },
        ], { session });

        await session.commitTransaction();

        notifyTransfer(req.user.telegramId, recipient.telegramId, nft.series.name, nft.mintNumber);

        res.json({ success: true });
    } catch (error) {
        await session.abortTransaction();
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    } finally {
        session.endSession();
    }
});

module.exports = router;
