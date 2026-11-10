// Replay a short greeting only after a deliberate smaller-screen selection.
function replaySmallScreenGreeting(element) {
    if (!element || !window.matchMedia('(max-width: 1099px)').matches ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.classList.remove('is-celebrating');
    // Restart the CSS animation even when selections happen back to back.
    void element.offsetWidth;
    element.classList.add('is-celebrating');
}

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
            cta.setAttribute('href', 'village?featured=toys-r-us');
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

// Pick the smaller-screen card style once per page load, independently of the
// canvas edition. Restore the Gold Star card when both desktop cards are shown.
(() => {
    const card = document.querySelector('[data-costco-responsive-card]');
    if (!card) return;
    const label = card.querySelector('[data-costco-member-type]');
    const smallerScreen = window.matchMedia('(max-width: 1099px)');
    const useExecutive = Math.random() < .5;

    function updateStyle() {
        const executive = smallerScreen.matches && useExecutive;
        card.classList.toggle('costco-membership-mobile-executive', executive);
        if (label) label.textContent = executive ? 'Executive Stitcher' : 'Gold Star Stitcher';
    }

    smallerScreen.addEventListener('change', updateStyle);
    updateStyle();
})();

// Keep one close-up visible so choosing an edition never changes the card size.
(() => {
    const gallery = document.querySelector('[data-costco-gallery]');
    if (!gallery) return;
    const swap = gallery.querySelector('[data-costco-swap]');
    const photos = [...gallery.querySelectorAll('[data-costco-photo]')];
    const choices = [...gallery.querySelectorAll('[data-costco-edition]')];
    if (!swap || photos.length !== 2) return;
    let active = 'classic';

    // The hidden edition's photo is marked lazy so it stays out of the first
    // load. Switching it to eager makes the browser fetch it even while hidden.
    function fetchHiddenPhotos() {
        photos.forEach(photo => photo.querySelector('img')?.setAttribute('loading', 'eager'));
    }

    // Fetch it once the page has settled so the first swap is instant, unless
    // the shopper has asked their browser to save data.
    if (!window.navigator?.connection?.saveData) {
        const whenIdle = () => (window.requestIdleCallback || window.setTimeout).call(window, fetchHiddenPhotos);
        if (document.readyState === 'complete') whenIdle();
        else window.addEventListener('load', whenIdle, { once: true });
    }

    function select(edition) {
        if (edition === active) return;
        active = edition;
        fetchHiddenPhotos();
        photos.forEach(photo => { photo.hidden = photo.dataset.costcoPhoto !== edition; });
        choices.forEach(choice => {
            choice.setAttribute('aria-pressed', String(choice.dataset.costcoEdition === edition));
        });
        const next = edition === 'classic' ? 'holiday' : 'classic';
        swap.setAttribute('aria-label', `Show ${next} Costco canvas`);
        replaySmallScreenGreeting(gallery.closest?.('[data-costco-responsive-card]'));
    }

    swap.addEventListener('click', () => select(active === 'classic' ? 'holiday' : 'classic'));
    choices.forEach(choice => {
        choice.addEventListener('click', () => select(choice.dataset.costcoEdition));
    });
})();

// Each entry takes one smooth step down the aisle. Leaving holds the current
// crop; moving between the two membership cards does not count as another step.
(() => {
    const feature = document.querySelector('.costco-feature');
    if (!feature) return;
    const enabled = window.matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let steps = 0;
    feature.addEventListener('pointerenter', () => {
        if (!enabled.matches || steps >= 4) return;
        steps += 1;
        feature.style.setProperty('--costco-aisle-scale', (1 + steps * .03).toFixed(2));
    });
})();

// Some pointer visits spin the R so it lands facing forward, then fixes itself.
// Never on the first visit and never twice running, so it stays a surprise.
(() => {
    const feature = document.querySelector('.toys-feature');
    if (!feature) return;
    let visits = 0;
    let lastWasOops = false;
    feature.addEventListener('pointerenter', () => {
        visits += 1;
        lastWasOops = visits > 1 && !lastWasOops && Math.random() < .3;
        feature.classList.toggle('is-r-oops', lastWasOops);
    });
})();
