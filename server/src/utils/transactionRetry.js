const mongoose = require('mongoose');

async function withRetry(action, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let session = await mongoose.startSession();
        try {
            session.startTransaction();
            const result = await action(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            if (error.code === 11000 && attempt < maxRetries) {
                // Duplicate key error on unique index (e.g. mintNumber), retry!
                console.log(`Race condition encountered, retrying (${attempt}/${maxRetries})...`);
                continue;
            }
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = { withRetry };
