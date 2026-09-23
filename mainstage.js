// Keep spark placement tied to the actual glow cycle, without a separate timer.
(() => {
    const wordmark = document.querySelector('svg.mainstage-wordmark');
    if (!wordmark) return;

    const lettering = wordmark.querySelector('#mainstage-lettering');
    const letters = [...lettering.querySelectorAll('path')];
    const sparks = [...wordmark.querySelectorAll('.title-spark')];
    const face = wordmark.querySelector('.letter-face');
    // Pages can widen the wordmark sooner when it has the full container to itself.
    const wideLayout = matchMedia(wordmark.dataset.wideQuery || '(min-width: 1100px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function placeSparks() {
        if (reducedMotion.matches) return;

        // Pick different letters within each burst so sparks never pile up.
        const shuffled = [...letters];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const viewport = wordmark.viewBox.baseVal;
        const toViewBox = wordmark.getCTM().inverse();
        sparks.forEach((spark, i) => {
            const letter = shuffled[i];
            const transform = toViewBox.multiply(letter.getCTM());
            const length = letter.getTotalLength();
            let point;
            // Leave room for each sparkle and its glow inside the SVG edges.
            for (let attempt = 0; attempt < 32; attempt++) {
                point = letter.getPointAtLength(Math.random() * length).matrixTransform(transform);
                if (point.x >= 16 && point.x <= viewport.width - 16 &&
                    point.y >= 16 && point.y <= viewport.height - 16) break;
            }
            const x = Math.max(16, Math.min(viewport.width - 16, point.x));
            const y = Math.max(16, Math.min(viewport.height - 16, point.y));
            const scale = 0.7 + Math.random() * 0.3;
            spark.parentElement.setAttribute('transform',
                `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(2)})`);
        });
    }

    function updateLayout() {
        const wide = wideLayout.matches;
        wordmark.dataset.layout = wide ? 'wide' : 'stacked';
        wordmark.setAttribute('viewBox', wide ? '0 0 740 146' : '0 0 400 234');
        wordmark.setAttribute('width', wide ? '740' : '400');
        wordmark.setAttribute('height', wide ? '146' : '234');
        lettering.setAttribute('transform', wide ? 'translate(26 10) skewX(-9)' : 'translate(40 12) skewX(-9)');
        wordmark.querySelector('.mainstage-stage-letters').setAttribute('transform',
            wide ? 'translate(354 0) scale(.88 .94)' : 'translate(0 87) scale(.88 .94)');
        wordmark.querySelector('.mainstage-underline').setAttribute('d',
            wide ? 'M13 106H720L715 138H8Z' : 'M13 194H352L347 226H8Z');
        const collectionLabel = wordmark.querySelector('.mainstage-collection-label');
        collectionLabel.setAttribute('x', wide ? '364' : '180');
        collectionLabel.setAttribute('y', wide ? '122' : '210');
        placeSparks();
    }

    face.addEventListener('animationiteration', (event) => {
        if (event.animationName === 'mainstage-face-lighten') placeSparks();
    });
    wideLayout.addEventListener('change', updateLayout);
    reducedMotion.addEventListener('change', placeSparks);
    updateLayout();
})();

// September 22, 2026 at 11 AM America/Chicago is CDT (UTC-05:00).
// Keep the launch tied to an absolute instant, regardless of the visitor's zone.
(() => {
    const launch = document.querySelector('[data-mainstage-launch]');
    if (!launch) return;

    const launchAt = Date.parse('2026-09-22T11:00:00-05:00');
    const callout = launch.querySelector('[data-mainstage-callout]');
    const link = launch.querySelector('[data-mainstage-link]');
    const afterLaunch = document.querySelectorAll('[data-mainstage-after-launch]');
    let timer;

    function updateLaunch() {
        clearTimeout(timer);
        const remaining = launchAt - Date.now();
        const launched = remaining <= 0;
        callout.hidden = launched;
        link.hidden = !launched;
        afterLaunch.forEach(element => { element.hidden = !launched; });

        if (launched) {
            link.href = 'main-stage-collection.html';
        } else {
            link.removeAttribute('href');
            // Recheck the clock each minute, with an exact timer at the cutoff.
            timer = setTimeout(updateLaunch, Math.min(remaining, 60_000));
        }
    }

    // Catch up immediately after a sleeping/backgrounded tab or a history restore.
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateLaunch();
    });
    window.addEventListener('pageshow', updateLaunch);
    window.addEventListener('focus', updateLaunch);
    updateLaunch();
})();
