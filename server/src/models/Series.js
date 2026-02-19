const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: {
        tr: { type: String, default: '' },
        en: { type: String, default: '' },
        ru: { type: String, default: '' },
    },
    imageUrl: { type: String, default: '' },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: true, index: true },
    price: { type: Number, required: true },
    totalSupply: { type: Number, required: true },
    mintedCount: { type: Number, default: 0 },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
    royaltyPercent: { type: Number, default: 0, min: 0, max: 50 },
    attributes: [{
        trait: { type: String },
        value: { type: String },
    }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

seriesSchema.index({ collection: 1, isActive: 1 });
seriesSchema.index({ rarity: 1 });

module.exports = mongoose.model('Series', seriesSchema);
