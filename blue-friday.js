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
            [-43, -16, -120, 'var(--sale-yellow)'],
            [-33, -36, 115, 'var(--sale-cream)'],
            [-15, -47, -90, 'var(--sale-coral)'],
            [3, -43, 80, 'var(--sale-yellow)'],
            [20, -46, 130, '#abc5ff'],
            [36, -30, -110, 'var(--sale-coral)'],
            [43, -11, 160, 'var(--sale-cream)']
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
