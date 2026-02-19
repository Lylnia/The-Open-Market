const TelegramBot = require('node-telegram-bot-api');

let bot = null;

const initBot = () => {
    if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'your_telegram_bot_token') {
        bot = new TelegramBot(process.env.BOT_TOKEN);
    }
};

const sendNotification = async (telegramId, message) => {
    if (!bot) return;
    try {
        await bot.sendMessage(telegramId, message, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`Failed to send notification to ${telegramId}:`, error.message);
    }
};

const notifyPurchase = async (buyerTgId, sellerTgId, seriesName, mintNumber, price) => {
    const nftName = `${seriesName} #${mintNumber}`;
    await sendNotification(buyerTgId, `✅ <b>${nftName}</b> purchased successfully!\n💰 Paid: ${price} TON`);
    if (sellerTgId) {
        await sendNotification(sellerTgId, `💰 <b>${nftName}</b> sold!\n💰 Earned: ${price} TON`);
    }
};

const notifyTransfer = async (fromTgId, toTgId, seriesName, mintNumber) => {
    const nftName = `${seriesName} #${mintNumber}`;
    await sendNotification(fromTgId, `📤 <b>${nftName}</b> transferred.`);
    await sendNotification(toTgId, `📥 <b>${nftName}</b> received!`);
};

const notifyBid = async (ownerTgId, bidderUsername, seriesName, mintNumber, amount) => {
    const nftName = `${seriesName} #${mintNumber}`;
    await sendNotification(ownerTgId, `💬 @${bidderUsername} offered ${amount} TON for <b>${nftName}</b>.`);
};

const notifyPreSaleStart = async (telegramIds, preSaleName) => {
    const message = `🚀 <b>${preSaleName}</b> pre-sale started!`;
    for (const tgId of telegramIds) {
        await sendNotification(tgId, message);
    }
};

const notifyDeposit = async (telegramId, amount) => {
    await sendNotification(telegramId, `💰 <b>${amount} TON</b> deposited to your balance.`);
};

const notifyWithdrawal = async (telegramId, amount, status) => {
    const statusText = status === 'completed' ? 'approved ✅' : 'rejected ❌';
    await sendNotification(telegramId, `💸 <b>${amount} TON</b> withdrawal ${statusText}.`);
};

module.exports = {
    initBot,
    sendNotification,
    notifyPurchase,
    notifyTransfer,
    notifyBid,
    notifyPreSaleStart,
    notifyDeposit,
    notifyWithdrawal,
};
