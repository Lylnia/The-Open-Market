const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    permissions: [{ type: String, enum: ['verify', 'list_nfts', 'list_holders', 'nft_detail'] }],
    rateLimit: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    totalRequests: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

apiKeySchema.statics.generateKey = function () {
    return 'prj_' + crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
