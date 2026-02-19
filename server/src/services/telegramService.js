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
    await sendNotification(buyerTgId, `✅ <b>${nftName}</b> başarıyla satın alındı!\n💰 Ödenen: ${price} TON`);
    if (sellerTgId) {
        await sendNotification(sellerTgId, `💰 <b>${nftName}</b> satıldı!\n💰 Kazanılan: ${price} TON`);
    }
};

const notifyTransfer = async (fromTgId, toTgId, seriesName, mintNumber) => {
    const nftName = `${seriesName} #${mintNumber}`;
    await sendNotification(fromTgId, `📤 <b>${nftName}</b> transfer edildi.`);
    await sendNotification(toTgId, `📥 <b>${nftName}</b> size transfer edildi!`);
};

const notifyBid = async (ownerTgId, bidderUsername, seriesName, mintNumber, amount) => {
    const nftName = `${seriesName} #${mintNumber}`;
    await sendNotification(ownerTgId, `💬 <b>${nftName}</b> için @${bidderUsername} ${amount} TON teklif verdi.`);
};

const notifyPreSaleStart = async (telegramIds, preSaleName) => {
    const message = `🚀 <b>${preSaleName}</b> pre-sale başladı!`;
    for (const tgId of telegramIds) {
        await sendNotification(tgId, message);
    }
};

const notifyDeposit = async (telegramId, amount) => {
    await sendNotification(telegramId, `💰 <b>${amount} TON</b> bakiyenize yatırıldı.`);
};

const notifyWithdrawal = async (telegramId, amount, status) => {
    const statusText = status === 'completed' ? 'onaylandı ✅' : 'reddedildi ❌';
    await sendNotification(telegramId, `💸 <b>${amount} TON</b> çekim talebi ${statusText}.`);
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
