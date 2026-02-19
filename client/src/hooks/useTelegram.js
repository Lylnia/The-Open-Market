export function useTelegram() {
    const tg = window.Telegram?.WebApp;

    const ready = () => tg?.ready();
    const close = () => tg?.close();
    const expand = () => tg?.expand();
    const showBackButton = (show) => {
        if (show) tg?.BackButton?.show();
        else tg?.BackButton?.hide();
    };
    const onBackButton = (cb) => tg?.BackButton?.onClick(cb);
    const haptic = (type = 'light') => tg?.HapticFeedback?.impactOccurred(type);
    const showConfirm = (msg) => new Promise(resolve => tg?.showConfirm(msg, resolve));
    const showAlert = (msg) => new Promise(resolve => tg?.showAlert(msg, resolve));

    return {
        tg,
        user: tg?.initDataUnsafe?.user,
        initData: tg?.initData,
        colorScheme: tg?.colorScheme,
        ready,
        close,
        expand,
        showBackButton,
        onBackButton,
        haptic,
        showConfirm,
        showAlert,
    };
}
