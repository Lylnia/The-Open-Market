const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const tonService = require('../services/tonService');
const { notifyWithdrawal } = require('../services/telegramService');

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

        // Deduct balance immediately, mark as pending
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
        session.endSession(); // End session early to free locks

        // Check if amount qualifies for auto-withdrawal
        const thresholdTON = parseFloat(process.env.AUTO_WITHDRAW_THRESHOLD || '5');
        const thresholdNano = thresholdTON * 1e9;
        let autoProcessed = false;

        if (amount <= thresholdNano) {
            const withdrawalResult = await tonService.sendWithdrawal(toAddress, amount);
            if (withdrawalResult.success) {
                const updatedTx = await Transaction.findById(tx[0]._id);
                updatedTx.status = 'completed';
                updatedTx.txHash = withdrawalResult.txHash;
                updatedTx.description += ' (Auto-processed)';
                await updatedTx.save();

                autoProcessed = true;
                tx[0] = updatedTx; // Update local ref for response
                notifyWithdrawal(user.telegramId, amount / 1e9, 'completed');
            } else {
                console.warn(`[Auto-Withdraw] Failed for ${user.username}, keeping as pending for admin review:`, withdrawalResult.error);
            }
        }

        return res.json({
            success: true,
            transaction: tx[0],
            autoProcessed,
            message: autoProcessed ? 'Withdrawal processed automatically!' : 'Withdrawal pending manual approval.'
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Withdrawal error:', error);
        res.status(500).json({ error: 'Withdrawal request failed' });
    } finally {
        if (!session.hasEnded) {
            session.endSession();
        }
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
