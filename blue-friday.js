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
            [-61, -7, -160, 'var(--sale-yellow)'],
            [-54, 9, 120, 'var(--sale-coral)'],
            [-48, -11, 95, 'var(--sale-cream)'],
            [-43, 4, -150, 'var(--sale-yellow)'],
            [-36, -5, 180, '#abc5ff'],
            [-31, 11, -105, 'var(--sale-coral)'],
            [-24, 2, 145, 'var(--sale-cream)'],
            [25, -7, -130, '#abc5ff'],
            [32, 9, 160, 'var(--sale-coral)'],
            [37, -11, -130, 'var(--sale-yellow)'],
            [43, 3, 95, 'var(--sale-cream)'],
            [49, -4, -175, 'var(--sale-coral)'],
            [55, 10, 140, '#abc5ff'],
            [61, -9, 160, 'var(--sale-yellow)']
        ];

        confetti.replaceChildren(...pieces.map(([x, y, spin, color]) => {
            const piece = document.createElement('span');
            if (x > 0) piece.className = 'from-right';
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
