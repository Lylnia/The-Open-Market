const mongoose = require('mongoose');

const nftSchema = new mongoose.Schema({
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true, index: true },
    mintNumber: { type: Number, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isListed: { type: Boolean, default: false },
    listPrice: { type: Number, default: 0 },
}, { timestamps: true });

nftSchema.index({ series: 1, mintNumber: 1 }, { unique: true });
nftSchema.index({ isListed: 1 });
nftSchema.index({ owner: 1, isListed: 1 });

nftSchema.virtual('name').get(function () {
    return `#${this.mintNumber}`;
});

module.exports = mongoose.model('NFT', nftSchema);
