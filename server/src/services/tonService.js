const TonWeb = require('tonweb');

let tonweb;
if (process.env.TON_API_KEY) {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
        apiKey: process.env.TON_API_KEY
    }));
} else {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
}

const checkDeposit = async (memo) => {
    try {
        const walletAddress = process.env.TON_WALLET_ADDRESS;
        if (!walletAddress) {
            console.warn('TON_WALLET_ADDRESS is not set in environment.');
            return { found: false, amount: 0, txHash: '' };
        }

        const transactions = await tonweb.provider.getTransactions(walletAddress, 50);
        for (const tx of transactions) {
            if (tx.in_msg && tx.in_msg.message === memo) {
                const value = tx.in_msg.value;
                if (value && parseInt(value) > 0) {
                    return { found: true, amount: parseInt(value), txHash: tx.transaction_id.hash };
                }
            }
        }
        return { found: false, amount: 0, txHash: '' };
    } catch (error) {
        console.error('Error checking TON deposit:', error);
        return { found: false, amount: 0, txHash: '' };
    }
};

const sendWithdrawal = async (toAddress, amount) => {
    // Note: Actual withdrawal requires tonweb-mnemonic and securely stored seed phrases.
    // This is logged for the manual dispatching queue in production until a hot-wallet is fully set up.
    console.log(`[Queue] Withdrawal request of ${amount} nanoTON to ${toAddress}`);
    return { success: true, txHash: `pending_tx_${Date.now()}` };
};

const generateMemo = (telegramId) => {
    // Generate a unique memo for deposit identification
    const timestamp = Date.now().toString(36);
    const id = telegramId.toString(36);
    return `TOM_${id}_${timestamp}`.toUpperCase();
};

const formatTON = (nanoTon) => {
    return (nanoTon / 1e9).toFixed(4);
};

const toNano = (ton) => {
    return Math.round(ton * 1e9);
};

module.exports = { checkDeposit, sendWithdrawal, generateMemo, formatTON, toNano };
