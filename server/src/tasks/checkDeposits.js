const TonWeb = require('tonweb');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { getIO } = require('../utils/socket');

let tonweb;
if (process.env.TON_API_KEY) {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
        apiKey: process.env.TON_API_KEY
    }));
} else {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
}

async function processDeposits() {
    try {
        const walletAddress = process.env.TON_WALLET_ADDRESS;
        if (!walletAddress) {
            console.warn('[TON] TON_WALLET_ADDRESS is missing. Skipping script.');
            return;
        }

        // Fetch the last 100 transactions to the central wallet
        const transactions = await tonweb.provider.getTransactions(walletAddress, 100);
        if (!transactions || !Array.isArray(transactions)) return;

        for (const tx of transactions) {
            // Check if it's an incoming transaction with a message (memo)
            if (tx.in_msg && tx.in_msg.message) {
                const memo = tx.in_msg.message.trim();
                const value = tx.in_msg.value;
                const txHash = tx.transaction_id.hash;

                if (value && parseInt(value) > 0) {
                    const amountInNano = parseInt(value);

                    // 1. Check if we already processed this txHash globally
                    const existingTx = await Transaction.findOne({ txHash });
                    if (existingTx) continue; // Skip, already processed

                    // 2. Find user matching this memo exactly
                    const user = await User.findOne({ memo });
                    if (!user) continue; // Unknown memo, skip or log to a dead-letter queue

                    console.log(`[TON] Found valid deposit for user ${user.username}: ${amountInNano / 1e9} TON`);

                    let session = await mongoose.startSession();
                    try {
                        session.startTransaction();

                        // 3. Credit user balance safely
                        const latestUser = await User.findById(user._id).session(session);
                        if (!latestUser) throw new Error('User not found in session');
                        latestUser.balance += amountInNano;
                        await latestUser.save({ session });

                        // 4. Create local transaction record representing the deposit
                        const depositTx = await Transaction.create([{
                            user: latestUser._id,
                            type: 'deposit',
                            amount: amountInNano,
                            memo: memo,
                            txHash: txHash,
                            status: 'completed',
                            description: `Deposited ${amountInNano / 1e9} TON`
                        }], { session });

                        await session.commitTransaction();
                        console.log(`[TON] ✅ Deposit credited successfully (Tx: ${txHash})`);

                        // 5. Fire socket event if user is online
                        try {
                            const io = getIO();
                            io.to(latestUser._id.toString()).emit('wallet:deposit', {
                                amount: amountInNano,
                                txHash
                            });
                        } catch (sErr) { }

                        // 6. Notify user
                        const { notifyDeposit } = require('../services/telegramService');
                        await notifyDeposit(latestUser.telegramId, amountInNano / 1e9);

                    } catch (err) {
                        if (session.inTransaction()) {
                            await session.abortTransaction();
                        }
                        console.error(`[TON] Failed to process deposit ${txHash}:`, err);
                    } finally {
                        session.endSession();
                    }
                }
            }
        }
    } catch (error) {
        console.error('[TON] Error listening to blockchain:', error.message);
    }
}

// Start polling every 20 seconds
function startDepositCron() {
    // Initial run
    setTimeout(processDeposits, 5000);
    // Every 20 seconds
    setInterval(processDeposits, 20 * 1000);
    console.log('🔄 TON Deposit listener started. Polling every 20s for 100 txns.');
}

module.exports = { startDepositCron, processDeposits };
