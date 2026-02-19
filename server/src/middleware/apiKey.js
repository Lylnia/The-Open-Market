const ApiKey = require('../models/ApiKey');

// Per-key rate limit tracking (sliding window)
const keyRequests = new Map();

const checkKeyRateLimit = (key, maxPerMinute) => {
    const now = Date.now();
    const windowMs = 60 * 1000;
    let timestamps = keyRequests.get(key) || [];
    timestamps = timestamps.filter(ts => now - ts < windowMs);
    if (timestamps.length >= maxPerMinute) return false;
    timestamps.push(now);
    keyRequests.set(key, timestamps);
    return true;
};

const apiKeyAuth = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            const key = req.headers['x-api-key'];
            if (!key) {
                return res.status(401).json({ error: 'API key required. Provide X-API-Key header.' });
            }

            const apiKey = await ApiKey.findOne({ key, isActive: true });
            if (!apiKey) {
                return res.status(401).json({ error: 'Invalid or inactive API key' });
            }

            if (requiredPermission && !apiKey.permissions.includes(requiredPermission)) {
                return res.status(403).json({ error: `Permission '${requiredPermission}' not granted for this API key` });
            }

            if (!checkKeyRateLimit(key, apiKey.rateLimit || 60)) {
                return res.status(429).json({ error: 'API key rate limit exceeded' });
            }

            apiKey.totalRequests += 1;
            apiKey.lastUsedAt = new Date();
            await apiKey.save();

            req.apiKey = apiKey;
            next();
        } catch (error) {
            res.status(500).json({ error: 'API key validation failed' });
        }
    };
};

module.exports = apiKeyAuth;
