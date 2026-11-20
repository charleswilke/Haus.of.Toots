(function () {
    const grid = document.querySelector('.lns-shop-grid');
    const bar = document.querySelector('.lns-sort-bar');
    const trigger = bar.querySelector('.lns-sort-trigger');
    const menu = bar.querySelector('.lns-sort-menu');
    const choices = [...menu.querySelectorAll('.lns-sort-choice')];
    const toggles = bar.querySelector('.lns-sort-toggles');
    const compact = matchMedia('(max-width: 800px), (hover: none) and (pointer: coarse) and (max-height: 500px)');
    const sortIndicators = [...toggles.querySelectorAll('.lns-sort-group')].map(group => ({
        group,
        sync: createToggleIndicator(group, 'lns-sort-indicator')
    }));
    const syncSortIndicators = () => sortIndicators.forEach(({ sync }) => sync());
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
