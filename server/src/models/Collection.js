const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: {
        tr: { type: String, default: '' },
        en: { type: String, default: '' },
        ru: { type: String, default: '' },
    },
    logoUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { timestamps: true });

collectionSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
