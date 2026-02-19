const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nft: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', required: true },
    price: { type: Number, required: true },
    royaltyAmount: { type: Number, default: 0 },
    referralAmount: { type: Number, default: 0 },
    type: { type: String, enum: ['primary', 'secondary', 'presale'], default: 'primary' },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
}, { timestamps: true });

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ nft: 1 });

module.exports = mongoose.model('Order', orderSchema);
