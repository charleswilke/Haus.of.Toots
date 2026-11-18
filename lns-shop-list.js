(function () {
    const grid = document.querySelector('.lns-shop-grid');
    const bar = document.querySelector('.lns-sort-bar');
    const trigger = bar.querySelector('.lns-sort-trigger');
    const menu = bar.querySelector('.lns-sort-menu');
    const choices = [...menu.querySelectorAll('.lns-sort-choice')];
    const toggles = bar.querySelector('.lns-sort-toggles');
    const compact = matchMedia('(max-width: 800px), (hover: none) and (pointer: coarse) and (max-height: 500px)');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const sortIndicators = [...toggles.querySelectorAll('.lns-sort-group')].map(group => {
        const pill = document.createElement('span');
        pill.className = 'lns-sort-indicator';
        pill.setAttribute('aria-hidden', 'true');
        group.appendChild(pill);
        group.classList.add('has-sort-indicator');

        function sync(animate = false) {
            const target = group.querySelector('input:checked + span').getBoundingClientRect();
            const from = pill.getBoundingClientRect();
            pill.getAnimations().forEach(animation => animation.cancel());
            if (!target.width) return; // Compact layouts use the menu instead.
            const bounds = group.getBoundingClientRect();
            Object.assign(pill.style, {
                left: target.left - bounds.left - group.clientLeft + 'px',
                top: target.top - bounds.top - group.clientTop + 'px',
                width: target.width + 'px',
                height: target.height + 'px'
            });
            if (!animate || reducedMotion.matches || !from.width) return;

            // Move and deform only the background; the labels stay crisp.
            // Start from its current visual bounds so rapid changes stay smooth.
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
        return { group, sync };
    });
    const syncSortIndicators = () => sortIndicators.forEach(({ sync }) => sync());
    const indicatorObserver = new ResizeObserver(syncSortIndicators);
    sortIndicators.forEach(({ group }) => indicatorObserver.observe(group));
    document.fonts.ready.then(syncSortIndicators);
    reducedMotion.addEventListener('change', syncSortIndicators);
    const compareNames = new Intl.Collator('en-US', { sensitivity: 'base' }).compare;
    // Postal codes in alphabetical order by full state name.
    const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
    const orderByState = new Map(states.map((code, index) => [code, index]));
    const shops = Array.from(grid.children, card => {
        const location = card.querySelector('.lns-card-city').textContent.trim();
        const code = location.match(/,\s*([A-Z]{2})\b/)?.[1];
        const name = (card.querySelector('.lns-shop-name-link')?.getAttribute('aria-label')
            || card.querySelector('.lns-card-name').textContent).trim()
            .replace(/^The\s+/i, '')
            .replace(/\s*\(opens in a new tab\)$/, '');
        return { card, name, state: orderByState.get(code) ?? states.length };
    });

    function sortShops(by, order) {
        const direction = order === 'desc' ? -1 : 1;
        shops.sort((a, b) => direction * ((by === 'state' ? a.state - b.state : 0) || compareNames(a.name, b.name)));
        grid.append(...shops.map(shop => shop.card));
        for (const choice of choices) {
            choice.setAttribute('aria-pressed', String(choice.dataset.sort === by + ':' + order));
        }
    }

    function updateFromToggles(event) {
        const by = toggles.querySelector('[name="lnsSortBy"]:checked').value;
        const order = toggles.querySelector('[name="lnsSortOrder"]:checked').value;
        sortShops(by, order);
        sortIndicators.forEach(({ group, sync }) => sync(group === event?.target.closest('.lns-sort-group')));
    }

    function setMenuOpen(open) {
        menu.hidden = !open;
        trigger.setAttribute('aria-expanded', String(open));
    }

    trigger.addEventListener('click', () => setMenuOpen(menu.hidden));
    menu.addEventListener('click', event => {
        const choice = event.target.closest('.lns-sort-choice');
        if (!choice) return;
        const [by, order] = choice.dataset.sort.split(':');
        toggles.querySelector('[name="lnsSortBy"][value="' + by + '"]').checked = true;
        toggles.querySelector('[name="lnsSortOrder"][value="' + order + '"]').checked = true;
        sortShops(by, order);
        syncSortIndicators();
        setMenuOpen(false);
        trigger.focus({ preventScroll: true });
    });
    document.addEventListener('pointerdown', event => {
        if (!menu.hidden && !menu.contains(event.target) && !trigger.contains(event.target)) setMenuOpen(false);
    });
    bar.addEventListener('focusout', event => {
        if (!menu.hidden && event.relatedTarget && !bar.contains(event.relatedTarget)) setMenuOpen(false);
    });
    bar.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menu.hidden) {
            event.preventDefault();
            setMenuOpen(false);
            trigger.focus({ preventScroll: true });
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        const down = event.key === 'ArrowDown';
        if (event.target === trigger) {
            event.preventDefault();
            setMenuOpen(true);
            choices[down ? 0 : choices.length - 1].focus();
        } else if (menu.contains(event.target)) {
            event.preventDefault();
            const index = choices.indexOf(event.target);
            choices[(index + (down ? 1 : -1) + choices.length) % choices.length].focus();
        }
    });
    compact.addEventListener('change', () => {
        if (!compact.matches) setMenuOpen(false);
    });
    toggles.addEventListener('change', updateFromToggles);
    updateFromToggles();
    trigger.hidden = false;
    toggles.hidden = false;

    const header = document.querySelector('.top-nav');
    const cart = document.querySelector('.nav-cart-peek');
    const page = bar.closest('.lns-page');
    const updateStickyOffset = () => {
        const bodyTop = parseFloat(getComputedStyle(document.body).paddingTop);
        page.style.setProperty('--lns-body-top', bodyTop + 'px');
        page.style.setProperty('--lns-header-bottom', (header?.getBoundingClientRect().bottom ?? bodyTop) + 'px');
        page.style.setProperty('--lns-sort-height', bar.offsetHeight + 'px');
        if (cart) page.style.setProperty('--lns-cart-bottom', (cart.offsetTop + cart.offsetHeight) + 'px');
    };

    updateStickyOffset();
    const observer = new ResizeObserver(updateStickyOffset);
    observer.observe(bar, { box: 'border-box' });
    if (header) observer.observe(header, { box: 'border-box' });
    if (cart) observer.observe(cart, { box: 'border-box' });
})();
