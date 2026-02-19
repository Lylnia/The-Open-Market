const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['collection', 'series'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

favoriteSchema.index({ user: 1, targetType: 1 });
favoriteSchema.index({ user: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
