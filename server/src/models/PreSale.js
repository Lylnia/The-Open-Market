const mongoose = require('mongoose');

const preSaleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: {
        tr: { type: String, default: '' },
        en: { type: String, default: '' },
        ru: { type: String, default: '' },
    },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true },
    price: { type: Number, required: true },
    totalSupply: { type: Number, required: true },
    soldCount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    maxPerUser: { type: Number, default: 5 },
}, { timestamps: true });

preSaleSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('PreSale', preSaleSchema);
