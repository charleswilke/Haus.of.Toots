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
            [61, -9, 160, 'var(--sale-yellow)'],
            [-38, -24, -135, 'var(--sale-coral)', 'top'],
            [-24, -38, 175, 'var(--sale-yellow)', 'top'],
            [-10, -27, -95, '#abc5ff', 'top'],
            [3, -44, 130, 'var(--sale-coral)', 'top'],
            [17, -34, -165, 'var(--sale-yellow)', 'top'],
            [29, -41, 190, '#abc5ff', 'top'],
            [42, -22, -145, 'var(--sale-coral)', 'top']
        ];

        confetti.replaceChildren(...pieces.map(([x, y, spin, color, origin = x > 0 ? 'right' : 'left']) => {
            const piece = document.createElement('span');
            piece.className = `from-${origin}`;
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
