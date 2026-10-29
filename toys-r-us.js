// October 30 at 11 AM in Chicago is CDT (UTC-05:00). Use one absolute instant
// so the announcement changes together for shoppers in every time zone.
(() => {
    const announcement = document.querySelector('[data-toys-launch]');
    const cta = document.querySelector('[data-toys-cta]');
    const shopCopy = document.querySelector('[data-toys-shop]');
    const arrow = document.querySelector('[data-toys-arrow]');
    const timeNote = document.querySelector('[data-toys-time-note]');
    if (!announcement || !cta || !shopCopy || !arrow) return;

    const launchAt = Date.parse(announcement.dateTime);
    if (!Number.isFinite(launchAt)) return;
    let timer;

    function updateLaunch() {
        clearTimeout(timer);
        const remaining = launchAt - Date.now();
        const launched = remaining <= 0;
        announcement.hidden = launched;
        shopCopy.hidden = !launched;
        arrow.hidden = !launched;
        if (timeNote) timeNote.hidden = launched;
        if (launched) {
            cta.setAttribute('href', 'village');
            cta.removeAttribute('aria-disabled');
        } else {
            cta.removeAttribute('href');
            cta.setAttribute('aria-disabled', 'true');
        }
        if (remaining > 0) timer = setTimeout(updateLaunch, Math.min(remaining, 60_000));
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateLaunch();
    });
    window.addEventListener('pageshow', updateLaunch);
    window.addEventListener('focus', updateLaunch);
    updateLaunch();
})();

// Native buttons support tapping, clicking, and Enter/Space without changing
// the stack's layout or the edition's image, caption, and label pairing.
(() => {
    const stack = document.querySelector('[data-toys-stack]');
    if (!stack) return;
    const photos = [...stack.querySelectorAll('[data-toys-edition]')];
    photos.forEach(photo => {
        photo.addEventListener('click', () => {
            photos.forEach(item => {
                item.setAttribute('aria-pressed', String(item === photo));
            });
        });
    });
})();
