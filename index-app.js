// ===================================
// HOME PAGE APP
// ===================================

class HomeApp extends ShopApp {
    // Products rendered per scroll batch. Divides evenly into the masonry's
    // 1/2/3 column layouts so a batch never leaves a ragged part-row.
    static BATCH_SIZE = 6;

    constructor() {
        super(); // calls ShopApp constructor → this.init() → HomeApp.init()
    }

    async init() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.visibleCount = 0;
        this.setupCartListeners();
        this.setupProductModalListeners();
        this.setupLightboxListeners();
        this.updateCartUI();
        this.initTicker();
        this.setupNewsletterForm();
        await this.loadAllProducts();
    }

    // ─── Newsletter Signup (rough-in) ─────────────────────────────────────────

    setupNewsletterForm() {
        const form = document.getElementById('newsletterForm');
        const input = document.getElementById('newsletterEmail');
        const feedback = document.getElementById('newsletterFeedback');
        if (!form || !input || !feedback) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = input.value.trim();
            feedback.classList.remove('is-success', 'is-error');

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                feedback.textContent = "Hmm, that email doesn't look quite right. Try again?";
                feedback.classList.add('is-error');
                return;
            }

            // Preview safeguard: do not imply an address was stored until a real list is connected.
            feedback.textContent = "Signup is still being stitched together — your email wasn't sent or saved yet.";
            feedback.classList.add('is-preview');
        });
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

    // ─── Product Loading ──────────────────────────────────────────────────────

    async loadAllProducts() {
        try {
            this.allProducts = await shopifyClient.getAllProducts(50);
            this.showGrid();
            this.renderProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError();
        }
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    renderProducts() {
        let products = [...this.allProducts];
        products.sort((a, b) => {
            const aIn = this.isProductInStock(a);
            const bIn = this.isProductInStock(b);
            if (aIn === bIn) return 0;
            return aIn ? -1 : 1;
        });

        this.filteredProducts = products;
        this.visibleCount = 0;

        const grid = document.getElementById('homeProductsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="collection-empty-message" style="grid-column: 1 / -1;">
                    <p>No products match this filter right now. Check back soon!</p>
                </div>`;
            return;
        }

        this.renderNextBatch();
        this.watchForMoreProducts();
    }

    /**
     * Appends the next slice of the catalog so the first paint stays compact and
     * the rest of the grid arrives as the shopper scrolls.
     */
    renderNextBatch() {
        const grid = document.getElementById('homeProductsGrid');
        if (!grid) return;

        const start = this.visibleCount;
        const batch = this.filteredProducts.slice(start, start + HomeApp.BATCH_SIZE);
        if (batch.length === 0) return;

        const staging = document.createElement('div');
        staging.innerHTML = batch.map(p => this.createProductCard(p)).join('');

        Array.from(staging.children).forEach((card, i) => {
            // Masonry sorts on this, so stamp it before the columns get rebuilt —
            // otherwise appended cards jump ahead of the ones already on screen.
            card.dataset.masonryOrder = String(start + i);
            card.addEventListener('click', () => {
                this.openProductModal(card.getAttribute('data-product-id'));
            });
            grid.appendChild(card);
        });

        this.visibleCount = start + batch.length;
        if (window.applyMasonry) window.applyMasonry(grid);
    }

    renderRemainingProducts() {
        while (this.visibleCount < this.filteredProducts.length) this.renderNextBatch();
    }

    watchForMoreProducts() {
        const sentinel = document.getElementById('homeGridSentinel');
        if (!sentinel || !('IntersectionObserver' in window)) {
            // Nothing to trip the next batch — render it all rather than stranding
            // products the shopper can never scroll to.
            this.renderRemainingProducts();
            return;
        }

        if (!this.moreProductsObserver) {
            this.moreProductsObserver = new IntersectionObserver((entries) => {
                if (!entries.some(e => e.isIntersecting)) return;
                if (this.visibleCount >= this.filteredProducts.length) {
                    this.moreProductsObserver.unobserve(sentinel);
                    return;
                }
                this.renderNextBatch();
                // Re-observing re-fires the callback, so a batch too short to fill
                // the viewport keeps loading until the sentinel is pushed off screen.
                this.moreProductsObserver.unobserve(sentinel);
                this.moreProductsObserver.observe(sentinel);
            }, { rootMargin: '400px 0px' });
        }

        this.moreProductsObserver.unobserve(sentinel);
        this.moreProductsObserver.observe(sentinel);
    }

    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const isOutOfStock = this.isProductOutOfStock(product);
        const thumbnailUrl = image?.url
            ? `${image.url}${image.url.includes('?') ? '&' : '?'}width=600`
            : null;

        const imageHTML = thumbnailUrl
            ? `<img src="${thumbnailUrl}" alt="${this.escapeAttr(image.altText || product.title)}" class="product-image">`
            : `<div class="product-no-image">No image available</div>`;

        const cardClasses = 'product-card home-product-card';

        const priceFormatted = this.formatPriceRange(product);

        return `
            <div class="${cardClasses}" data-product-id="${product.id}">
                <div class="product-image-container">
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <div class="product-title-row">
                        <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                        ${isOutOfStock ? '<span class="product-out-of-stock-badge">Out of Stock</span>' : ''}
                    </div>
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
        if (grid)    grid.style.display    = '';
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
