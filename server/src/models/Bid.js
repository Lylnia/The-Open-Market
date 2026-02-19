const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nft: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', required: true, index: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['active', 'accepted', 'rejected', 'expired', 'cancelled'], default: 'active' },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

bidSchema.index({ bidder: 1, status: 1 });
bidSchema.index({ nft: 1, status: 1 });
bidSchema.index({ expiresAt: 1, status: 1 });

// Static: bulk-expire old bids (call periodically or on read)
bidSchema.statics.expireOldBids = async function () {
    return this.updateMany(
        { status: 'active', expiresAt: { $lt: new Date() } },
        { status: 'expired' }
    );
};

module.exports = mongoose.model('Bid', bidSchema);
