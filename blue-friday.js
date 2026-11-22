(() => {
    const banner = document.getElementById('blueFridayBanner');
    if (!banner) return;

    const expiresAt = Date.parse(banner.dataset.expires);
    let expiryTimer;

    function updateVisibility() {
        clearTimeout(expiryTimer);
        const remaining = expiresAt - Date.now();
        banner.hidden = !(remaining > 0);

        if (!banner.hidden) {
            expiryTimer = setTimeout(updateVisibility, Math.min(remaining, 2_147_483_647));
        }
    }

    updateVisibility();
    // A restored or backgrounded page can miss the scheduled update.
    window.addEventListener('pageshow', updateVisibility);
    document.addEventListener('visibilitychange', updateVisibility);

    const copyButton = banner.querySelector('.sale-code');
    const code = copyButton.querySelector('.sale-code-value').textContent;
    const status = banner.querySelector('.sale-copy-status');
    const confetti = banner.querySelector('.sale-copy-confetti');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let feedbackTimer;

    async function copyCode() {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(code);
            return;
        }

        const field = document.createElement('textarea');
        field.value = code;
        field.readOnly = true;
        field.className = 'visually-hidden';
        document.body.appendChild(field);
        try {
            field.select();
            if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
        } finally {
            field.remove();
            copyButton.focus({ preventScroll: true });
        }
    }

    function celebrateCopy() {
        const pieces = [
            [-62, -14, -160, 'var(--sale-yellow)'],
            [-52, -30, 120, 'var(--sale-coral)'],
            [-44, 10, 95, 'var(--sale-cream)'],
            [-38, -48, -150, 'var(--sale-cream)'],
            [-26, -22, 180, '#abc5ff'],
            [-18, -56, -105, 'var(--sale-coral)'],
            [-5, -39, 145, 'var(--sale-yellow)'],
            [10, -53, -130, '#abc5ff'],
            [23, -34, 160, 'var(--sale-coral)'],
            [32, 12, -130, 'var(--sale-yellow)'],
            [41, -49, 95, 'var(--sale-cream)'],
            [49, -20, -175, 'var(--sale-coral)'],
            [57, -35, 140, '#abc5ff'],
            [66, -9, 160, 'var(--sale-yellow)']
        ];

        confetti.replaceChildren(...pieces.map(([x, y, spin, color]) => {
            const piece = document.createElement('span');
            piece.style.setProperty('--confetti-x', `${x}px`);
            piece.style.setProperty('--confetti-y', `${y}px`);
            piece.style.setProperty('--confetti-spin', `${spin}deg`);
            piece.style.setProperty('--confetti-color', color);
            return piece;
        }));
    }

    copyButton.addEventListener('click', async () => {
        let copied = false;
        try {
            await copyCode();
            copied = true;
        } catch {
            // Announce a failure instead of showing a successful copy.
        }

        clearTimeout(feedbackTimer);
        status.textContent = copied ? 'Copied!' : 'Couldn’t copy';
        if (copied && !reducedMotion.matches) celebrateCopy();
        else confetti.replaceChildren();

        feedbackTimer = setTimeout(() => {
            status.textContent = '';
            confetti.replaceChildren();
        }, 1800);
    });
})();
