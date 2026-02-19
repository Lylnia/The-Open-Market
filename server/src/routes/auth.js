const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Referral = require('../models/Referral');
const { verifyTelegramInitData } = require('../middleware/auth');
const { generateMemo } = require('../services/tonService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) {
            return res.status(400).json({ error: 'initData required' });
        }

        const isValid = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
        if (!isValid && process.env.NODE_ENV !== 'development') {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }

        const params = new URLSearchParams(initData);
        const userDataStr = params.get('user');
        if (!userDataStr) {
            return res.status(400).json({ error: 'User data not found' });
        }

        const userData = JSON.parse(userDataStr);
        const { id: telegramId, username, first_name, last_name, photo_url, language_code } = userData;

        let user = await User.findOne({ telegramId });
        const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number);

        if (!user) {
            const lang = ['tr', 'ru'].includes(language_code) ? language_code : 'en';
            user = await User.create({
                telegramId,
                username: username || '',
                firstName: first_name || '',
                lastName: last_name || '',
                photoUrl: photo_url || '',
                language: lang,
                isAdmin: adminIds.includes(telegramId),
                memo: generateMemo(telegramId),
                referralCode: uuidv4().split('-')[0].toUpperCase(),
            });

            // Handle referral
            const { referralCode } = req.body;
            if (referralCode) {
                const referrer = await User.findOne({ referralCode });
                if (referrer && referrer._id.toString() !== user._id.toString()) {
                    user.referredBy = referrer._id;
                    await user.save();
                    await Referral.create({ referrer: referrer._id, referred: user._id });
                }
            }
        } else {
            user.username = username || user.username;
            user.firstName = first_name || user.firstName;
            user.lastName = last_name || user.lastName;
            user.photoUrl = photo_url || user.photoUrl;
            user.isAdmin = adminIds.includes(telegramId) || user.isAdmin;
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user._id,
                telegramId: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                photoUrl: user.photoUrl,
                balance: user.balance,
                isAdmin: user.isAdmin,
                language: user.language,
                theme: user.theme,
                memo: user.memo,
                referralCode: user.referralCode,
                walletAddress: user.walletAddress,
            },
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

module.exports = router;
