const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'buy', 'sell', 'airdrop', 'transfer_in', 'transfer_out', 'referral_earning', 'royalty_earning', 'locked', 'refund'],
        required: true,
    },
    amount: { type: Number, default: 0 },
    nft: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', default: null },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    memo: { type: String, default: '' },
    txHash: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    description: { type: String, default: '' },
}, { timestamps: true });

transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
