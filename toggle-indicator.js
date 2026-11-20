function createToggleIndicator(group, indicatorClass) {
    const pill = document.createElement('span');
    pill.className = indicatorClass;
    pill.setAttribute('aria-hidden', 'true');
    group.appendChild(pill);

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    function sync(animate = false) {
        const target = group.querySelector('input:checked + span').getBoundingClientRect();
        if (!target.width) return;

        // Use the current visual bounds so rapid changes start from the in-flight pill.
        const from = pill.getBoundingClientRect();
        pill.getAnimations().forEach(animation => animation.cancel());
        const bounds = group.getBoundingClientRect();
        Object.assign(pill.style, {
            left: target.left - bounds.left - group.clientLeft + 'px',
            top: target.top - bounds.top - group.clientTop + 'px',
            width: target.width + 'px',
            height: target.height + 'px'
        });
        group.classList.add('has-toggle-indicator');
        if (!animate || reducedMotion.matches || !from.width) return;

        const dx = from.left - target.left;
        const ratio = from.width / target.width;
        const frame = (offset, progress, stretch, height) => ({
            offset,
            transform: `translateX(${dx * (1 - progress)}px) scale(${(ratio + (1 - ratio) * progress) * stretch}, ${height})`
        });
        pill.animate([
            frame(0, 0, 1, from.height / target.height),
            frame(0.18, 0.12, 1.1, 0.82),
            frame(0.64, 1.02, 1.02, 0.96),
            frame(0.82, 0.99, 0.96, 1.08),
            frame(1, 1, 1, 1)
        ], { duration: 420, easing: 'cubic-bezier(0.22, 0.7, 0.3, 1)' });
    }

    const realign = () => sync();
    new ResizeObserver(realign).observe(group);
    document.fonts.ready.then(realign);
    reducedMotion.addEventListener('change', realign);
    return sync;
}
