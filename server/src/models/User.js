const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: '' },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    walletAddress: { type: String, default: '' },
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    language: { type: String, enum: ['tr', 'en', 'ru'], default: 'en' },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    memo: { type: String, unique: true, sparse: true },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralEarnings: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.index({ balance: -1 });
userSchema.index({ referralCode: 1 });

module.exports = mongoose.model('User', userSchema);
