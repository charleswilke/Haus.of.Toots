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

    function select(edition) {
        active = edition;
        photos.forEach(photo => { photo.hidden = photo.dataset.costcoPhoto !== edition; });
        choices.forEach(choice => {
            choice.setAttribute('aria-pressed', String(choice.dataset.costcoEdition === edition));
        });
        const next = edition === 'classic' ? 'holiday' : 'classic';
        swap.setAttribute('aria-label', `Show ${next} Costco canvas`);
    }

    swap.addEventListener('click', () => select(active === 'classic' ? 'holiday' : 'classic'));
    choices.forEach(choice => {
        choice.addEventListener('click', () => select(choice.dataset.costcoEdition));
    });
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
