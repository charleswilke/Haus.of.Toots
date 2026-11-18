(function () {
    const grid = document.querySelector('.lns-shop-grid');
    const dropdown = document.getElementById('lnsShopSort');
    const toggles = document.querySelector('.lns-sort-toggles');
    const compareNames = new Intl.Collator('en-US', { sensitivity: 'base' }).compare;
    // Postal codes in alphabetical order by full state name.
    const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
    const orderByState = new Map(states.map((code, index) => [code, index]));
    const shops = Array.from(grid.children, card => {
        const location = card.querySelector('.lns-card-city').textContent.trim();
        const code = location.slice(location.lastIndexOf(',') + 1).trim();
        const name = card.querySelector('.lns-card-name').textContent.trim()
            .replace(/^The\s+/i, '')
            .replace(/\s*\(opens in a new tab\)$/, '');
        return { card, name, state: orderByState.get(code) ?? states.length };
    });

    function sortShops(by, order) {
        const direction = order === 'desc' ? -1 : 1;
        shops.sort((a, b) => direction * ((by === 'state' ? a.state - b.state : 0) || compareNames(a.name, b.name)));
        grid.append(...shops.map(shop => shop.card));
    }

    function updateFromToggles() {
        const by = toggles.querySelector('[name="lnsSortBy"]:checked').value;
        const order = toggles.querySelector('[name="lnsSortOrder"]:checked').value;
        dropdown.value = by + ':' + order;
        sortShops(by, order);
    }

    dropdown.addEventListener('change', () => {
        const [by, order] = dropdown.value.split(':');
        toggles.querySelector('[name="lnsSortBy"][value="' + by + '"]').checked = true;
        toggles.querySelector('[name="lnsSortOrder"][value="' + order + '"]').checked = true;
        sortShops(by, order);
    });
    toggles.addEventListener('change', updateFromToggles);
    updateFromToggles();
    dropdown.hidden = false;
    toggles.hidden = false;
})();
