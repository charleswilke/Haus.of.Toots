(() => {
    const banner = document.getElementById('blueFridayBanner');
    if (!banner) return;

    const expiresAt = Date.parse(banner.dataset.expires);
    let timer;

    function updateVisibility() {
        clearTimeout(timer);
        const remaining = expiresAt - Date.now();
        banner.hidden = !(remaining > 0);

        if (!banner.hidden) {
            timer = setTimeout(updateVisibility, Math.min(remaining, 2_147_483_647));
        }
    }

    updateVisibility();
    // A restored or backgrounded page can miss the scheduled update.
    window.addEventListener('pageshow', updateVisibility);
    document.addEventListener('visibilitychange', updateVisibility);
})();
