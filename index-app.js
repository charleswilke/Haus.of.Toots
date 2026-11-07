// ===================================
// HOME PAGE APP
// ===================================

class HomeApp extends ShopApp {
    // Products rendered per scroll batch. Divides evenly into the masonry's
    // 1/2/3/4 column layouts so a batch never leaves a ragged part-row.
    static BATCH_SIZE = 12;

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
            this.allProducts.sort((a, b) =>
                (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
            );
            this.setupProductFilters();
            this.showGrid();
            this.renderProducts();
            this.productFilters.hidden = false;
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError();
        }
    }

    setupProductFilters() {
        this.productFilters = document.getElementById('homeProductFilters');
        this.allProductsFilter = this.productFilters.querySelector('[data-product-filter="all"]');
        this.inStockFilter = this.productFilters.querySelector('[data-product-filter="in-stock"]');
        this.meshFilter = document.getElementById('homeMeshFilter');
        this.defaultMeshFilter = this.meshFilter.querySelector('[checked]');
        this.filterTrigger = document.getElementById('homeProductFilterTrigger');
        this.setupFilterDisclosure();

        this.meshFilter.addEventListener('change', () => this.renderProducts());
        this.productFilters.addEventListener('click', ({ target }) => {
            const button = target.closest('[data-product-filter]');
            if (!button) return;

            if (button === this.allProductsFilter) {
                this.productFilters.querySelectorAll('[aria-pressed="true"]').forEach(filter => {
                    filter.setAttribute('aria-pressed', 'false');
                });
                this.defaultMeshFilter.checked = true;
            } else {
                const isPressed = button.getAttribute('aria-pressed') === 'true';
                button.setAttribute('aria-pressed', String(!isPressed));
            }
            this.renderProducts();
        });
    }

    setupFilterDisclosure() {
        const trigger = this.filterTrigger;
        const disclosure = trigger.parentElement;
        const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';
        const close = () => trigger.setAttribute('aria-expanded', 'false');

        trigger.addEventListener('click', () => {
            trigger.setAttribute('aria-expanded', String(!isOpen()));
        });
        document.addEventListener('click', ({ target }) => {
            if (isOpen() && !disclosure.contains(target)) close();
        });
        disclosure.addEventListener('focusout', ({ relatedTarget }) => {
            if (isOpen() && relatedTarget && !disclosure.contains(relatedTarget)) close();
        });
        disclosure.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !isOpen()) return;
            event.stopPropagation();
            close();
            trigger.focus();
        });
    }

    matchesCollections(product, selectedCollections) {
        const keys = this.getProductCollectionKeys(product);
        if (!keys.length) keys.push(this.getProductTitleCollection(product));
        if (product.tags?.some(tag => tag.trim().toLowerCase() === 'accessories')) {
            keys.push('accessories');
        }
        return keys.some(key => selectedCollections.includes(key));
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    renderProducts() {
        const selectedCollections = Array.from(
            this.productFilters.querySelectorAll('[aria-pressed="true"]'),
            button => button.dataset.productFilter
        ).filter(key => key !== 'all' && key !== 'in-stock');
        const inStockOnly = this.inStockFilter.getAttribute('aria-pressed') === 'true';
        const mesh = this.meshFilter.querySelector(':checked').value;
        const dropdownSelections = selectedCollections.length + Number(inStockOnly);
        const filterLabel = dropdownSelections ? `Filters (${dropdownSelections})` : '';
        this.filterTrigger.querySelector('.home-product-filter-label').textContent = filterLabel || 'All Products';
        this.filterTrigger.querySelector('.home-product-filter-label-mobile').textContent = filterLabel || 'All';
        this.allProductsFilter.setAttribute('aria-pressed', String(!selectedCollections.length && !inStockOnly && !mesh));

        this.filteredProducts = this.allProducts.filter(product =>
            (!selectedCollections.length || this.matchesCollections(product, selectedCollections)) &&
            this.matchesMeshAndStock(product, mesh, inStockOnly)
        );
        const count = this.filteredProducts.length;
        document.getElementById('homeProductCount').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
        document.getElementById('homeEmptyState').hidden = count > 0;

        this.visibleCount = 0;
        this.moreProductsObserver?.disconnect();

        const grid = document.getElementById('homeProductsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        this.renderNextBatch();
        if (this.visibleCount < count) this.watchForMoreProducts();
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
            card.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                card.click();
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
                this.renderNextBatch();
                // Re-observing re-fires the callback, so a batch too short to fill
                // the viewport keeps loading until the sentinel is pushed off screen.
                this.moreProductsObserver.unobserve(sentinel);
                if (this.visibleCount < this.filteredProducts.length) this.moreProductsObserver.observe(sentinel);
            }, { rootMargin: '400px 0px' });
        }

        this.moreProductsObserver.observe(sentinel);
    }

    createProductCard(product) {
        return super.createProductCard(product)
            .replace('class="product-card"', 'class="product-card home-product-card"');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    matchesMeshAndStock(product, mesh, inStockOnly) {
        const variants = product.variants?.edges || [];
        if (mesh) {
            const sizedVariants = variants
                .filter(({ node }) => node)
                .map(({ node }) => ({ variant: node, sizes: this.getVariantMeshSizes(node) }))
                .filter(({ sizes }) => sizes.length);

            if (sizedVariants.length) {
                return sizedVariants.some(({ variant, sizes }) =>
                    sizes.includes(mesh) && (!inStockOnly || this.isVariantInStock(variant))
                );
            }

            const taggedSize = String(this.getProductMeshTag(product) || '').match(/\d+/)?.[0];
            if (taggedSize !== mesh) return false;
        }

        return !inStockOnly || variants.some(({ node }) => this.isVariantInStock(node));
    }

    isVariantInStock(variant) {
        return variant?.availableForSale === true && !this.isVariantPreorder(variant);
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
