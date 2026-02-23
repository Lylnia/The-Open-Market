const mongoose = require('mongoose');

const presalePledgeSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    presale: { type: mongoose.Schema.Types.ObjectId, ref: 'PreSale', required: true },
    amountLocked: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending_draw', 'won', 'lost', 'refunded'],
        default: 'pending_draw'
    }
}, { timestamps: true });

presalePledgeSchema.index({ buyer: 1, presale: 1 });
presalePledgeSchema.index({ status: 1 });

module.exports = mongoose.model('PresalePledge', presalePledgeSchema);
