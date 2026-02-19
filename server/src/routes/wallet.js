const express = require('express');
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
    try {
        const { amount, toAddress } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
        if (!toAddress) return res.status(400).json({ error: 'Withdrawal address required' });

        if (req.user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance immediately, mark as pending for admin approval
        req.user.balance -= amount;
        await req.user.save();

        const tx = await Transaction.create({
            user: req.user._id,
            type: 'withdrawal',
            amount,
            memo: toAddress,
            status: 'pending',
            description: `${amount / 1e9} TON çekim talebi`,
        });

        res.json({ success: true, transaction: tx });
    } catch (error) {
        res.status(500).json({ error: 'Withdrawal request failed' });
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
