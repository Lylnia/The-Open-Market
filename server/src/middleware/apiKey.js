const ApiKey = require('../models/ApiKey');

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
