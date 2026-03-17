// ===================================
// HOME PAGE APP
// ===================================

class HomeApp extends ShopApp {
    constructor() {
        super(); // calls ShopApp constructor → this.init() → HomeApp.init()
    }

    async init() {
        this.allProducts = [];
        this.activeFilter = 'all';
        this.inStockOnly = false;
        this.setupCartListeners();
        this.setupProductModalListeners();
        this.setupLightboxListeners();
        this.updateCartUI();
        this.buildFilterBar();
        this.initTicker();
        await this.loadAllProducts();
    }

    // ─── Announcement Ticker ──────────────────────────────────────────────────

    initTicker() {
        const ticker = document.querySelector('.ticker');
        if (!ticker) return;

        const speed = 24; // px per second — adjust to taste
        let halfWidth = 0;
        let pos = 0;
        let lastTime = null;

        // Measure once after layout settles so scrollWidth is stable
        requestAnimationFrame(() => {
            halfWidth = ticker.scrollWidth / 2;

            const step = (timestamp) => {
                if (lastTime !== null) {
                    pos -= speed * (timestamp - lastTime) / 1000;
                    if (pos <= -halfWidth) pos += halfWidth;
                    ticker.style.transform = `translateX(${pos}px)`;
                }
                lastTime = timestamp;
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }

    // ─── Filter Bar ───────────────────────────────────────────────────────────

    buildFilterBar() {
        const filterBar = document.getElementById('homeFilterBar');
        if (!filterBar) return;

        filterBar.innerHTML = `
            <div class="filter-dropdown" id="availabilityDropdown">
                <button class="filter-pill filter-pill-dropdown" id="availabilityPill" aria-haspopup="listbox" aria-expanded="false">
                    <span class="filter-pill-label" id="availabilityLabel">Availability</span>
                    <svg class="filter-pill-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="filter-dropdown-menu" id="availabilityMenu" role="listbox" aria-label="Availability">
                    <button class="filter-dropdown-option filter-dropdown-option-active" role="option" aria-selected="true" data-value="all">Show All</button>
                    <button class="filter-dropdown-option" role="option" aria-selected="false" data-value="in-stock">In Stock</button>
                </div>
            </div>`;

        const pill    = document.getElementById('availabilityPill');
        const menu    = document.getElementById('availabilityMenu');
        const label   = document.getElementById('availabilityLabel');
        const options = menu.querySelectorAll('.filter-dropdown-option');

        pill.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = pill.getAttribute('aria-expanded') === 'true';
            pill.setAttribute('aria-expanded', String(!isOpen));
            menu.classList.toggle('filter-dropdown-menu-open', !isOpen);
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => {
                    o.classList.remove('filter-dropdown-option-active');
                    o.setAttribute('aria-selected', 'false');
                });
                opt.classList.add('filter-dropdown-option-active');
                opt.setAttribute('aria-selected', 'true');

                const value = opt.dataset.value;
                const isFiltered = value === 'in-stock';
                label.textContent = isFiltered ? 'Availability: In Stock' : 'Availability';
                pill.classList.toggle('filter-pill-active', isFiltered);
                pill.setAttribute('aria-expanded', 'false');
                menu.classList.remove('filter-dropdown-menu-open');

                this.inStockOnly = isFiltered;
                this.renderFilteredProducts();
            });
        });

        document.addEventListener('click', (e) => {
            if (!document.getElementById('availabilityDropdown')?.contains(e.target)) {
                pill.setAttribute('aria-expanded', 'false');
                menu.classList.remove('filter-dropdown-menu-open');
            }
        });
    }

    // ─── Product Loading ──────────────────────────────────────────────────────

    async loadAllProducts() {
        try {
            this.allProducts = await shopifyClient.getAllProducts(50);
            this.showGrid();
            this.renderFilteredProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError();
        }
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    renderFilteredProducts() {
        let products = [...this.allProducts];
        if (this.inStockOnly) {
            products = products.filter(p => this.isProductInStock(p));
        }
        this.renderProducts(products);
    }

    renderProducts(products) {
        const grid = document.getElementById('homeProductsGrid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="collection-empty-message" style="grid-column: 1 / -1;">
                    <p>No products match this filter right now. Check back soon!</p>
                </div>`;
            return;
        }

        grid.innerHTML = products.map(p => this.createProductCard(p)).join('');

        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openProductModal(card.getAttribute('data-product-id'));
            });
        });
    }

    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const isOutOfStock = this.isProductOutOfStock(product);
        const thumbnailUrl = image?.transformedSrc
            || (image?.url ? `${image.url}?width=400&height=400&crop=center` : null);

        const imageHTML = thumbnailUrl
            ? `<img src="${thumbnailUrl}" alt="${this.escapeAttr(image.altText || product.title)}" class="product-image">`
            : `<div class="product-no-image">No image available</div>`;

        const category = this.getProductCategory(product);
        const cardClasses = [
            'product-card',
            category ? `product-card-${category}` : '',
            'home-product-card'
        ].filter(Boolean).join(' ');

        const priceFormatted = this.formatPriceRange(product);

        return `
            <div class="${cardClasses}" data-product-id="${product.id}">
                <div class="product-image-container">
                    ${imageHTML}
                    ${isOutOfStock ? '<div class="product-out-of-stock-badge">Out of Stock</div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                    <div class="product-price-section">
                        <span class="product-price ${isOutOfStock ? 'product-price-unavailable' : ''}">${priceFormatted}</span>
                        ${isOutOfStock ? '<span class="product-waitlist-label">Join the Waitlist</span>' : ''}
                    </div>
                </div>
            </div>`;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    isProductInStock(product) {
        const variants = product.variants?.edges || [];
        return variants.some(e => e.node.availableForSale);
    }

    escapeAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }

    showLoading() {
        const loading = document.getElementById('homeLoadingState');
        const error   = document.getElementById('homeErrorState');
        const grid    = document.getElementById('homeProductsGrid');
        if (loading) loading.style.display = 'flex';
        if (error)   error.style.display   = 'none';
        if (grid)    grid.style.display    = 'none';
    }

    showGrid() {
        const loading = document.getElementById('homeLoadingState');
        const error   = document.getElementById('homeErrorState');
        const grid    = document.getElementById('homeProductsGrid');
        if (loading) loading.style.display = 'none';
        if (error)   error.style.display   = 'none';
        if (grid)    grid.style.display    = 'grid';
    }

    showError() {
        const loading = document.getElementById('homeLoadingState');
        const error   = document.getElementById('homeErrorState');
        const grid    = document.getElementById('homeProductsGrid');
        if (loading) loading.style.display = 'none';
        if (error)   error.style.display   = 'block';
        if (grid)    grid.style.display    = 'none';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HomeApp());
} else {
    new HomeApp();
}
