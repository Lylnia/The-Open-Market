const TonWeb = require('tonweb');
const tonMnemonic = require('tonweb-mnemonic');

let tonweb;
if (process.env.TON_API_KEY) {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {
        apiKey: process.env.TON_API_KEY
    }));
} else {
    tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
}

const initHotWallet = async () => {
    try {
        const mnemonicPhrase = process.env.TON_MNEMONIC;
        if (!mnemonicPhrase) return;
        const mnemonicArray = mnemonicPhrase.split(' ');
        const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonicArray);
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        const address = await wallet.getAddress();
        console.log(`🔥 Hot Wallet (v4R2) Initialized. Derived Address: ${address.toString(true, true, true)}`);
        console.log(`⚠️ Ensure this exact address has a TON balance to pay for transaction gas!`);
    } catch (e) {
        console.error('Hot Wallet init error:', e.message);
    }
};

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

const sendWithdrawal = async (toAddress, amountNano) => {
    try {
        const mnemonicPhrase = process.env.TON_MNEMONIC;
        if (!mnemonicPhrase) {
            console.warn('[Queue] Automated withdrawal aborted: TON_MNEMONIC is not set.');
            return { success: false, error: 'Hot-wallet mnemonic not configured' };
        }

        const mnemonicArray = mnemonicPhrase.split(' ');
        const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonicArray);

        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });

        let seqno = null;
        try {
            seqno = await wallet.methods.seqno().call();
        } catch (seqnoError) {
            console.warn('[Queue] Wallet is uninitialized, proceeding with deploy payload.');
            seqno = null; // Uninitialized state
        }

        const transfer = wallet.methods.transfer({
            secretKey: keyPair.secretKey,
            toAddress: toAddress,
            amount: amountNano.toString(),
            seqno: seqno || 0,
            payload: 'Withdrawal from The Open Market',
            sendMode: 3, // Pay gas from contract balance but don't bounce the whole amount
        });

        // Send stateInit if it's the very first transaction (uninitialized)
        let tx;
        if (seqno === null) {
            tx = await transfer.send(); // First transfer implicitly includes deploy payload in tonweb if uninitialized
        } else {
            tx = await transfer.send();
        }

        console.log(`[Success] Real Withdrawal of ${amountNano} TON dispatched to ${toAddress}, Seqno: ${seqno}`);

        return { success: true, txHash: `seqno_${seqno}_${Date.now()}` };
    } catch (error) {
        console.error('[Error] Real Withdrawal Failed:', error);
        return { success: false, error: error.message };
    }
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

module.exports = { checkDeposit, sendWithdrawal, generateMemo, formatTON, toNano, initHotWallet };
