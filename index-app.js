// ===================================
// HOME PAGE APP
// ===================================

class HomeApp {
    constructor() {
        this.allProducts = [];
        this.activeFilter = 'all';
        this.inStockOnly = false;
        this.init();
    }

    async init() {
        this.buildFilterBar();
        await this.loadAllProducts();
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
            </div>
            <div class="filter-dropdown" id="wholesaleDropdown">
                <button class="filter-pill filter-pill-dropdown" id="wholesalePill" aria-haspopup="listbox" aria-expanded="false">
                    <span class="filter-pill-label">Wholesale</span>
                    <svg class="filter-pill-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="filter-dropdown-menu" id="wholesaleMenu" role="listbox" aria-label="Wholesale">
                    <a class="filter-dropdown-option" role="option" href="https://haus-of-toots.myshopify.com/pages/ws-account-login" target="_blank" rel="noopener noreferrer">Log in</a>
                    <a class="filter-dropdown-option" role="option" href="https://haus-of-toots.myshopify.com/pages/ws-account-create" target="_blank" rel="noopener noreferrer">Create account</a>
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

        const wholesalePill = document.getElementById('wholesalePill');
        const wholesaleMenu = document.getElementById('wholesaleMenu');

        wholesalePill.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = wholesalePill.getAttribute('aria-expanded') === 'true';
            wholesalePill.setAttribute('aria-expanded', String(!isOpen));
            wholesaleMenu.classList.toggle('filter-dropdown-menu-open', !isOpen);
        });

        document.addEventListener('click', (e) => {
            if (!document.getElementById('wholesaleDropdown')?.contains(e.target)) {
                wholesalePill.setAttribute('aria-expanded', 'false');
                wholesaleMenu.classList.remove('filter-dropdown-menu-open');
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
    }

    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const isOutOfStock = this.isProductOutOfStock(product);
        const thumbnailUrl = image?.transformedSrc
            || (image?.url ? `${image.url}?width=400&height=400&crop=center` : null);
        const productUrl = shopifyClient.getProductListingUrl(product.handle);

        const imageHTML = thumbnailUrl
            ? `<img src="${thumbnailUrl}" alt="${this.escapeAttr(image.altText || product.title)}" class="product-image">`
            : `<div class="product-no-image">No image available</div>`;

        const category = this.getProductCategory(product);
        const cardClasses = category
            ? `product-card product-card-${category} home-product-card`
            : 'product-card home-product-card';

        const priceFormatted = this.formatPrice(product);

        return `
            <a href="${this.escapeAttr(productUrl)}" target="_blank" rel="noopener noreferrer" class="${cardClasses}">
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
            </a>`;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    isProductInStock(product) {
        const variants = product.variants?.edges || [];
        return variants.some(e => e.node.availableForSale);
    }

    isProductOutOfStock(product) {
        const variants = product.variants?.edges || [];
        if (variants.length === 0) return false;
        return variants.every(e => !e.node.availableForSale);
    }

    getProductCategory(product) {
        const type = (product.productType || '').toLowerCase();
        const tags = (product.tags || []).map(t => t.toLowerCase());

        if (type.includes('customization') || tags.some(t => t.includes('customization'))) {
            return 'customizations';
        }
        if (type.includes('custom') || tags.some(t => t.includes('custom') && !t.includes('customization'))) {
            return 'custom-canvases';
        }
        if (type.includes('hot original') || type.includes('originals') ||
            tags.some(t => t.includes('hot original') || t.includes('originals'))) {
            return 'hot-originals';
        }
        if (type.includes('digital') || type.includes('chart') ||
            tags.some(t => t.includes('digital') || t.includes('chart'))) {
            return 'digital-charts';
        }
        return null;
    }

    formatPrice(product) {
        const amount = parseFloat(product.priceRange?.minVariantPrice?.amount || 0);
        const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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

    escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    escapeAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HomeApp());
} else {
    new HomeApp();
}
