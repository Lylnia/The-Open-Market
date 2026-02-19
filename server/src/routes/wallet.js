const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

router.get('/balance', auth, async (req, res) => {
    try {
        res.json({ balance: req.user.balance, walletAddress: req.user.walletAddress, memo: req.user.memo, centralWallet: process.env.TON_WALLET_ADDRESS });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
});

// Get deposit info (memo + central wallet address)
router.post('/deposit', auth, async (req, res) => {
    try {
        res.json({
            centralWallet: process.env.TON_WALLET_ADDRESS,
            memo: req.user.memo,
            instructions: {
                tr: `Yatırım yapmak için ${process.env.TON_WALLET_ADDRESS} adresine memo olarak "${req.user.memo}" yazarak TON gönderin.`,
                en: `To deposit, send TON to ${process.env.TON_WALLET_ADDRESS} with memo "${req.user.memo}".`,
                ru: `Для депозита отправьте TON на ${process.env.TON_WALLET_ADDRESS} с memo "${req.user.memo}".`,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get deposit info' });
    }
});

// Request withdrawal
router.post('/withdraw', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, toAddress } = req.body;
        if (!amount || amount <= 0) { await session.abortTransaction(); return res.status(400).json({ error: 'Valid amount required' }); }
        if (!toAddress) { await session.abortTransaction(); return res.status(400).json({ error: 'Withdrawal address required' }); }

        // Re-read user within session for atomicity
        const user = await User.findById(req.user._id).session(session);
        if (user.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance immediately, mark as pending for admin approval
        user.balance -= amount;
        await user.save({ session });

        const tx = await Transaction.create([{
            user: user._id,
            type: 'withdrawal',
            amount,
            memo: toAddress,
            status: 'pending',
            description: `${amount / 1e9} TON withdrawal request`,
        }], { session });

        await session.commitTransaction();
        res.json({ success: true, transaction: tx[0] });
    } catch (error) {
        await session.abortTransaction();
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Withdrawal request failed' });
    } finally {
        session.endSession();
    }
});

// Connect wallet address
router.post('/connect', auth, async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) return res.status(400).json({ error: 'Wallet address required' });

        req.user.walletAddress = walletAddress;
        await req.user.save();

        res.json({ success: true, walletAddress });
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect wallet' });
    }
});

module.exports = router;
