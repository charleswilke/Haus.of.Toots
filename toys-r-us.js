// October 30 at 11 AM in Chicago is CDT (UTC-05:00). Use one absolute instant
// so the announcement changes together for shoppers in every time zone.
(() => {
    const announcement = document.querySelector('[data-toys-launch]');
    if (!announcement) return;

    const launchAt = Date.parse(announcement.dateTime);
    if (!Number.isFinite(launchAt)) return;
    let timer;

    function updateLaunch() {
        clearTimeout(timer);
        const remaining = launchAt - Date.now();
        const copy = remaining > 0
            ? 'Arriving October 30 · 11 a.m. Central'
            : 'Now in the Village · Classic & holiday canvases';
        if (announcement.textContent !== copy) announcement.textContent = copy;
        if (remaining > 0) timer = setTimeout(updateLaunch, Math.min(remaining, 60_000));
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateLaunch();
    });
    window.addEventListener('pageshow', updateLaunch);
    window.addEventListener('focus', updateLaunch);
    updateLaunch();
})();
