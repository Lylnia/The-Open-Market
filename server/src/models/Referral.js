const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    referred: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    earnedAmount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
