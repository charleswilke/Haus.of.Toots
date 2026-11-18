// The two outlines use the same six cubic segments, starting at the crown.
(function () {
    const hex = [
        0, -10.32, 2.98, -8.6, 5.96, -6.88, 8.94, -5.16,
        8.94, -1.72, 8.94, 1.72, 8.94, 5.16, 5.96, 6.88, 2.98, 8.6, 0, 10.32,
        -2.98, 8.6, -5.96, 6.88, -8.94, 5.16, -8.94, 1.72, -8.94, -1.72, -8.94, -5.16,
        -5.96, -6.88, -2.98, -8.6, 0, -10.32
    ];
    const teardrop = [
        0, -38, 8.3, -38, 15, -31.3, 15, -23,
        15, -18.5, 12.8, -14, 10, -9, 6.5, -2.7, 2.6, 4.7, 0, 10.32,
        -2.6, 4.7, -6.5, -2.7, -10, -9, -12.8, -14, -15, -18.5, -15, -23,
        -15, -31.3, -8.3, -38, 0, -38
    ];
    const rest = [0, 1, 1];
    const raised = [1, 1, 1];
    // Each beat specifies progress, outline blend, width, and height.
    const springUp = [[.18, 0, 1.28, .65], [.56, 1, .82, 1.24], [.78, 1, 1.09, .93], [1, ...raised]];
    const springBack = [[.68, .08, 1.15, .76], [1, ...rest]];
    const map = document.querySelector('.lns-map');
    const pin = map.querySelector('.lns-hover-pin');
    const icon = pin.querySelector('.lns-hover-pin-icon');
    const outline = icon.querySelector('path');
    const heart = icon.querySelector('use');
    const badge = pin.querySelector('.lns-hover-pin-badge');
    const label = badge.querySelector('text');
    const backdrop = badge.querySelector('rect');
    const modal = document.getElementById('lnsModal');
    const hint = document.querySelector('.lns-map-hint');
    const originalHint = hint.textContent;
    const desktop = matchMedia('(hover: hover) and (pointer: fine)');
    const touch = matchMedia('(any-pointer: coarse)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let hoveredMarker = null;
    let focusedMarker = null;
    let activeMarker = null;
    let drawnMarker = null;
    let shape = rest;
    let frame;

    function draw(values) {
        shape = values;
        const [blend, width, height] = shape;
        const points = hex.map((point, i) => +(point + (teardrop[i] - point) * blend).toFixed(2));
        outline.setAttribute('d', 'M' + points.slice(0, 2).join(' ') + 'C' + points.slice(2).join(' ') + 'Z');
        // Keep the lower tip on its stitch during the squeeze and rebound.
        icon.setAttribute('transform', `translate(0 10.32) scale(${width} ${height}) translate(0 -10.32)`);
        heart.setAttribute('transform', `translate(0 ${-23 * blend}) scale(${1 + .35 * blend})`);
    }

    function animate(beats, duration, done) {
        const timeline = [[0, ...shape], ...beats];
        const started = performance.now();
        function tick(now) {
            const time = Math.max(0, Math.min((now - started) / duration, 1));
            const index = timeline.findIndex(([end]) => end > 0 && end >= time);
            const [from, ...first] = timeline[index - 1];
            const [to, ...last] = timeline[index];
            const phase = (time - from) / (to - from);
            const eased = phase * phase * (3 - 2 * phase);
            draw(first.map((value, i) => value + (last[i] - value) * eased));
            if (time < 1) frame = requestAnimationFrame(tick);
            else if (done) done();
        }
        frame = requestAnimationFrame(tick);
    }

    function sizeBadge() {
        const halfWidth = Math.ceil(label.getComputedTextLength() / 2) + 11;
        backdrop.setAttribute('x', -halfWidth);
        backdrop.setAttribute('width', 2 * halfWidth);
    }

    function resetPin() {
        drawnMarker?.classList.remove('is-warping');
        drawnMarker = null;
        pin.classList.remove('is-visible');
    }

    function updatePin() {
        const marker = desktop.matches && modal.hidden ? hoveredMarker || focusedMarker : null;
        if (marker === activeMarker && (!drawnMarker || (desktop.matches && modal.hidden))) return;
        activeMarker = marker;
        cancelAnimationFrame(frame);
        badge.getAnimations().forEach(animation => animation.cancel());
        badge.classList.remove('is-visible');

        if (!marker) {
            if (drawnMarker && desktop.matches && modal.hidden && !reducedMotion.matches) {
                animate(springBack, 230, resetPin);
            } else {
                resetPin();
            }
            return;
        }

        if (marker !== drawnMarker) {
            resetPin();
            drawnMarker = marker;
            marker.classList.add('is-warping');
            const hexTile = marker.querySelector('.hx-marker');
            pin.setAttribute('transform', `translate(${hexTile.getAttribute('x')} ${hexTile.getAttribute('y')})`);
            label.textContent = marker.dataset.city;
            draw(rest);
            pin.classList.add('is-visible');
            sizeBadge();
        }

        badge.classList.add('is-visible');
        if (reducedMotion.matches) {
            draw(raised);
        } else {
            animate(springUp, 480);
            badge.animate([
                { opacity: 0, transform: 'translateY(3px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 165, delay: 200, easing: 'ease-out', fill: 'backwards' });
        }
    }

    for (const marker of map.querySelectorAll('.lns-marker')) {
        marker.addEventListener('pointerenter', event => {
            if (event.pointerType === 'touch') return;
            hoveredMarker = marker;
            updatePin();
        });
        marker.addEventListener('pointerleave', () => {
            if (hoveredMarker !== marker) return;
            hoveredMarker = null;
            updatePin();
        });
        marker.addEventListener('focus', () => {
            if (marker.matches(':focus-visible')) focusedMarker = marker;
            updatePin();
        });
        marker.addEventListener('blur', () => {
            focusedMarker = null;
            updatePin();
        });
    }

    function syncInputMode() {
        map.classList.toggle('has-hover-pins', desktop.matches);
        if (touch.matches || navigator.maxTouchPoints > 0) {
            hint.textContent = 'Tap a heart to find local needlepoint shops.';
        } else if (desktop.matches) {
            hint.textContent = 'Hover over a heart to see the city. Select it to find local shops.';
        } else {
            hint.textContent = originalHint;
        }
        if (!desktop.matches) hoveredMarker = null;
        updatePin();
    }

    desktop.addEventListener('change', syncInputMode);
    touch.addEventListener('change', syncInputMode);
    modal.addEventListener('focusin', updatePin);
    document.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.key !== 'Escape' || !modal.hidden || !activeMarker) return;
        hoveredMarker = null;
        focusedMarker = null;
        updatePin();
    });
    document.fonts.ready.then(() => {
        if (drawnMarker) sizeBadge();
    });
    window.addEventListener('resize', () => {
        if (drawnMarker) sizeBadge();
    });
    syncInputMode();
})();
