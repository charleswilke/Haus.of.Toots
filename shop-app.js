// ===================================
// SHOP APP - Main Application Logic
// ===================================

class ShopApp {
    constructor() {
        this.products = [];
        this.collectionContext = this.getCollectionContext();
        this.init();
    }

    /**
     * Initialize the shop
     */
    async init() {
        this.setupCartListeners();
        this.setupProductModalListeners();
        this.setupLightboxListeners();
        this.updateCartUI();
        await this.loadProducts();
    }

    getCollectionContext() {
        const { dataset } = document.body;
        const collectionKey = (dataset.shopCollection || '').trim();
        const collectionHandle = (dataset.shopCollectionHandle || collectionKey).trim();

        if (!collectionKey) {
            return null;
        }

        const aliases = (dataset.shopCollectionAliases || '')
            .split(',')
            .map(alias => this.normalizeCollectionText(alias))
            .filter(Boolean);

        return {
            key: collectionKey,
            handle: collectionHandle,
            title: (dataset.shopCollectionTitle || '').trim() || collectionKey,
            aliases,
            emptyMessage: (dataset.shopEmptyMessage || '').trim()
        };
    }

    normalizeCollectionText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getCollectionSearchText(product) {
        return this.normalizeCollectionText([
            product.title,
            product.handle,
            product.productType,
            product.description,
            product.descriptionHtml,
            ...(product.tags || [])
        ].join(' '));
    }

    filterProductsForCollection(products) {
        if (!this.collectionContext) {
            return products;
        }

        const aliases = this.collectionContext.aliases.length
            ? this.collectionContext.aliases
            : [this.normalizeCollectionText(this.collectionContext.key)];

        return products.filter(product => {
            const searchableText = this.getCollectionSearchText(product);
            return aliases.some(alias => searchableText.includes(alias));
        });
    }

    getEmptyProductsMessage() {
        if (this.collectionContext?.emptyMessage) {
            return this.collectionContext.emptyMessage;
        }

        if (this.collectionContext?.title) {
            return `No products are available in ${this.collectionContext.title} just yet. Please check back soon.`;
        }

        return 'No products available at this time.';
    }

    /**
     * Load products from Shopify
     */
    async loadProducts() {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const productsGrid = document.getElementById('productsGrid');

        try {
            if (this.collectionContext?.handle) {
                const collectionProducts = await shopifyClient.getCollectionProducts(this.collectionContext.handle, 50);
                if (collectionProducts) {
                    this.products = collectionProducts;
                } else {
                    const products = await shopifyClient.getProducts(24);
                    this.products = this.filterProductsForCollection(products);
                }
            } else {
                const products = await shopifyClient.getProducts(24);
                this.products = this.filterProductsForCollection(products);
            }
            
            // Hide loading, show products
            loadingState.style.display = 'none';
            productsGrid.style.display = 'grid';
            
            // Render products
            this.renderProducts();
        } catch (error) {
            console.error('Failed to load products:', error);
            loadingState.style.display = 'none';
            errorState.style.display = 'block';
        }
    }

    /**
     * Render products to the grid
     */
    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        
        if (this.products.length === 0) {
            productsGrid.innerHTML = `
                <div class="collection-empty-message">
                    <p>${this.escapeHtml(this.getEmptyProductsMessage())}</p>
                </div>
            `;
            return;
        }

        // Sort products - hand painted canvases first
        const sortedProducts = [...this.products].sort((a, b) => {
            const aIsHandPainted = this.isHandPainted(a);
            const bIsHandPainted = this.isHandPainted(b);
            if (aIsHandPainted && !bIsHandPainted) return -1;
            if (!aIsHandPainted && bIsHandPainted) return 1;
            return 0;
        });

        productsGrid.innerHTML = sortedProducts.map(product => this.createProductCard(product)).join('');
        
        // Add click listeners to product cards so any non-control click opens the detail view
        const productCards = productsGrid.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const productId = card.getAttribute('data-product-id');
                this.openProductModal(productId);
            });
        });
    }

    /**
     * Check if a product is hand painted
     */
    isHandPainted(product) {
        const productType = (product.productType || '').toLowerCase();
        const tags = (product.tags || []).map(tag => tag.toLowerCase());
        return productType.includes('hand painted') || 
               productType.includes('canvas') || 
               tags.includes('hand painted') ||
               tags.includes('canvas') ||
               tags.includes('hand-painted');
    }

    /**
     * Determine product category from tags/productType
     * Returns category key for CSS class and color mapping
     */
    getProductCategory(product) {
        const productType = (product.productType || '').toLowerCase();
        const tags = (product.tags || []).map(tag => tag.toLowerCase());
        
        // Check for customizations
        if (productType.includes('customization') || 
            tags.some(tag => tag.includes('customization'))) {
            return 'customizations';
        }
        
        // Check for custom canvases
        if (productType.includes('custom') || 
            tags.some(tag => tag.includes('custom') && !tag.includes('customization'))) {
            return 'custom-canvases';
        }
        
        // Check for HoT originals
        if (productType.includes('hot original') || 
            productType.includes('originals') ||
            tags.some(tag => tag.includes('hot original') || tag.includes('originals'))) {
            return 'hot-originals';
        }
        
        // Check for digital charts
        if (productType.includes('digital') || 
            productType.includes('chart') ||
            tags.some(tag => tag.includes('digital') || tag.includes('chart'))) {
            return 'digital-charts';
        }
        
        // Default: if hand painted, treat as custom-canvases, otherwise no category
        if (this.isHandPainted(product)) {
            return 'custom-canvases';
        }
        
        return null;
    }

    /**
     * Extract mesh size from product title
     */
    extractMeshSize(title) {
        if (!title) return null;
        // Look for patterns like "13 Mesh", "18 Mesh", ": 13", ": 18", etc.
        const meshMatch = title.match(/(\d+)\s*[Mm]esh/i);
        if (meshMatch) {
            return meshMatch[1];
        }
        // Also check for patterns like ": 13" or ": 18" at the end
        const endMatch = title.match(/:\s*(\d+)(?:\s*[Mm]esh)?$/);
        if (endMatch) {
            return endMatch[1];
        }
        return null;
    }

    /**
     * Create HTML for a product card
     */
    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const variants = product.variants?.edges || [];
        const isOutOfStock = this.isProductOutOfStock(product);

        // Use transformedSrc for thumbnail if available, otherwise use url with size parameters
        const thumbnailUrl = image?.transformedSrc || (image?.url ? `${image.url}?width=400&height=400&crop=center` : null);
        const fullImageUrl = image?.url || null;
        
        const imageHTML = thumbnailUrl 
            ? `<img src="${thumbnailUrl}" 
                    data-full-image="${fullImageUrl}" 
                    alt="${image.altText || product.title}" 
                    class="product-image product-image-clickable">`
            : `<div class="product-no-image">No image available</div>`;

        const priceFormatted = this.formatPriceRange(product);

        const description = this.stripHtml(product.description || product.descriptionHtml || '');

        // Get category for border color
        const category = this.getProductCategory(product);
        const cardClasses = category 
            ? `product-card product-card-${category}`
            : 'product-card';

        return `
            <div class="${cardClasses}" data-product-id="${product.id}">
                <div class="product-image-container">
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                    ${description ? `<p class="product-description">${this.escapeHtml(description)}</p>` : ''}
                    <div class="product-price-section">
                        <span class="product-price ${isOutOfStock ? 'product-price-unavailable' : ''}" data-product-id="${product.id}">${priceFormatted}</span>
                        ${isOutOfStock ? '<span class="product-waitlist-label">Join the Waitlist</span>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup cart-related event listeners
     */
    setupCartListeners() {
        // Cart button
        const cartButton = document.getElementById('cartButton');
        cartButton.addEventListener('click', () => this.openCart());

        // Close cart button
        const closeCartBtn = document.getElementById('closeCart');
        closeCartBtn.addEventListener('click', () => this.closeCart());

        // Cart overlay
        const cartDrawer = document.getElementById('cartDrawer');
        const overlay = cartDrawer.querySelector('.cart-drawer-overlay');
        overlay.addEventListener('click', () => this.closeCart());

        // Clear cart button
        const clearCartBtn = document.getElementById('clearCartBtn');
        clearCartBtn.addEventListener('click', () => this.handleClearCart());

        // Checkout button — prevent the default <a> navigation on the shop page
        // so the async Shopify cart creation can complete before redirecting.
        const checkoutBtn = document.getElementById('checkoutBtn');
        checkoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleCheckout();
        });

        // Subscribe to cart changes
        cartManager.subscribe(() => this.updateCartUI());
    }

    /**
     * Setup product modal event listeners
     */
    setupProductModalListeners() {
        const productModal = document.getElementById('productModal');
        const closeModalBtn = document.getElementById('closeProductModal');
        const overlay = productModal.querySelector('.product-modal-overlay');
        const modalBody = document.getElementById('productModalBody');
        const customScrollbar = document.getElementById('productModalScrollbar');
        const customThumb = document.getElementById('productModalScrollbarThumb');

        this.productModal = productModal;
        this.productModalBody = modalBody;
        this.productModalScrollbar = customScrollbar;
        this.productModalScrollbarThumb = customThumb;

        closeModalBtn.addEventListener('click', () => this.closeProductModal());
        overlay.addEventListener('click', () => this.closeProductModal());

        if (modalBody && customScrollbar && customThumb) {
            modalBody.addEventListener('scroll', () => this.updateProductModalScrollbar());
            modalBody.addEventListener('load', () => this.scheduleProductModalScrollbarUpdate(), true);

            customScrollbar.addEventListener('pointerdown', (event) => {
                if (event.target === customThumb) {
                    return;
                }

                const trackRect = customScrollbar.getBoundingClientRect();
                const clickOffset = event.clientY - trackRect.top;
                const thumbHeight = customThumb.offsetHeight;
                const thumbCenterOffset = clickOffset - (thumbHeight / 2);
                this.scrollProductModalFromThumbOffset(thumbCenterOffset);
            });

            customThumb.addEventListener('pointerdown', (event) => this.startProductModalScrollbarDrag(event));

            this.productModalMutationObserver = new MutationObserver(() => {
                this.scheduleProductModalScrollbarUpdate();
            });
            this.productModalMutationObserver.observe(modalBody, { childList: true, subtree: true });

            if (typeof ResizeObserver !== 'undefined') {
                this.productModalResizeObserver = new ResizeObserver(() => {
                    this.scheduleProductModalScrollbarUpdate();
                });
                this.productModalResizeObserver.observe(modalBody);
            }

            window.addEventListener('resize', () => this.scheduleProductModalScrollbarUpdate());
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && productModal.classList.contains('open')) {
                this.closeProductModal();
            }
        });
    }

    scheduleProductModalScrollbarUpdate() {
        if (this.productModalScrollbarFrame) {
            cancelAnimationFrame(this.productModalScrollbarFrame);
        }

        this.productModalScrollbarFrame = requestAnimationFrame(() => {
            this.updateProductModalScrollbar();
        });
    }

    updateProductModalScrollbar() {
        if (!this.productModalBody || !this.productModalScrollbar || !this.productModalScrollbarThumb) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = this.productModalBody;
        const maxScroll = scrollHeight - clientHeight;

        if (maxScroll <= 0) {
            this.productModalScrollbar.classList.add('hidden');
            return;
        }

        this.productModalScrollbar.classList.remove('hidden');

        const trackHeight = this.productModalScrollbar.clientHeight;
        const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 56);
        const maxThumbTravel = trackHeight - thumbHeight;
        const thumbOffset = maxThumbTravel * (scrollTop / maxScroll);

        this.productModalScrollbarThumb.style.height = `${thumbHeight}px`;
        this.productModalScrollbarThumb.style.transform = `translateY(${thumbOffset}px)`;
    }

    scrollProductModalFromThumbOffset(thumbOffset) {
        if (!this.productModalBody || !this.productModalScrollbar || !this.productModalScrollbarThumb) {
            return;
        }

        const trackHeight = this.productModalScrollbar.clientHeight;
        const thumbHeight = this.productModalScrollbarThumb.offsetHeight;
        const maxThumbTravel = Math.max(trackHeight - thumbHeight, 1);
        const boundedOffset = Math.min(Math.max(thumbOffset, 0), maxThumbTravel);
        const maxScroll = Math.max(this.productModalBody.scrollHeight - this.productModalBody.clientHeight, 0);

        this.productModalBody.scrollTop = (boundedOffset / maxThumbTravel) * maxScroll;
    }

    startProductModalScrollbarDrag(event) {
        if (!this.productModalScrollbarThumb) {
            return;
        }

        event.preventDefault();

        const thumbRect = this.productModalScrollbarThumb.getBoundingClientRect();
        const pointerOffset = event.clientY - thumbRect.top;

        const onPointerMove = (moveEvent) => {
            const trackRect = this.productModalScrollbar.getBoundingClientRect();
            const nextOffset = moveEvent.clientY - trackRect.top - pointerOffset;
            this.scrollProductModalFromThumbOffset(nextOffset);
        };

        const onPointerUp = () => {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    }

    /**
     * Setup lightbox event listeners
     */
    setupLightboxListeners() {
        const lightbox = document.getElementById('imageLightbox');
        const closeBtn = document.getElementById('closeLightbox');
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');
        const overlay = lightbox.querySelector('.lightbox-overlay');

        closeBtn.addEventListener('click', () => this.closeLightbox());
        overlay.addEventListener('click', () => this.closeLightbox());
        prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
        nextBtn.addEventListener('click', () => this.navigateLightbox(1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('open')) return;
            
            if (e.key === 'Escape') {
                this.closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                this.navigateLightbox(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateLightbox(1);
            }
        });
    }

    /**
     * Check if device is mobile
     */
    isMobileDevice() {
        return window.innerWidth <= 767;
    }

    /**
     * Open lightbox with images
     */
    openLightbox(imageUrls, startIndex = 0, captions = []) {
        // Disable lightbox on mobile devices
        if (this.isMobileDevice()) {
            return;
        }

        const lightbox = document.getElementById('imageLightbox');
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');
        const prevBtn = document.getElementById('prevImage');
        const nextBtn = document.getElementById('nextImage');

        this.lightboxImages = imageUrls;
        this.lightboxCaptions = captions;
        this.lightboxCurrentIndex = startIndex;

        // Show/hide navigation buttons
        if (imageUrls.length <= 1) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
        }

        this.updateLightboxImage();
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close lightbox
     */
    closeLightbox() {
        const lightbox = document.getElementById('imageLightbox');
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
    }

    /**
     * Navigate lightbox
     */
    navigateLightbox(direction) {
        if (!this.lightboxImages || this.lightboxImages.length <= 1) return;

        this.lightboxCurrentIndex += direction;
        
        if (this.lightboxCurrentIndex < 0) {
            this.lightboxCurrentIndex = this.lightboxImages.length - 1;
        } else if (this.lightboxCurrentIndex >= this.lightboxImages.length) {
            this.lightboxCurrentIndex = 0;
        }

        this.updateLightboxImage();
    }

    /**
     * Update lightbox image display
     */
    updateLightboxImage() {
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');

        if (this.lightboxImages && this.lightboxImages[this.lightboxCurrentIndex]) {
            lightboxImage.src = this.lightboxImages[this.lightboxCurrentIndex];
            lightboxImage.alt = this.lightboxCaptions[this.lightboxCurrentIndex] || '';
            
            if (this.lightboxCaptions[this.lightboxCurrentIndex]) {
                lightboxCaption.textContent = this.lightboxCaptions[this.lightboxCurrentIndex];
                lightboxCaption.style.display = 'block';
            } else {
                lightboxCaption.style.display = 'none';
            }
        }
    }

    /**
     * Open cart drawer
     */
    openCart() {
        const cartDrawer = document.getElementById('cartDrawer');
        cartDrawer.classList.add('open');
    }

    /**
     * Close cart basket
     */
    closeCart() {
        const cartDrawer = document.getElementById('cartDrawer');
        cartDrawer.classList.remove('open');
    }

    /**
     * Update cart UI
     */
    updateCartUI() {
        const items = cartManager.getItems();
        const totalItems = cartManager.getTotalItems();
        const totalPrice = cartManager.getTotalPrice();
        const currency = cartManager.getCurrency();

        // Show/hide cart peek button
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.classList.toggle('has-items', totalItems > 0);
        }

        // Update cart count badge
        const cartCount = document.getElementById('cartCount');
        if (totalItems > 0) {
            cartCount.textContent = totalItems === 1 ? '1 item' : `${totalItems} items`;
            cartCount.classList.remove('hidden');
        } else {
            cartCount.textContent = '0 items';
            cartCount.classList.remove('hidden');
        }

        // Update cart body
        const cartBody = document.getElementById('cartBody');
        if (items.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty">
                    <p>Your cart is empty</p>
                    <p class="cart-empty-subtitle">Add some beautiful designs to get started!</p>
                </div>
            `;
        } else {
            cartBody.innerHTML = `
                <div class="cart-items">
                    ${items.map(item => this.createCartItem(item)).join('')}
                </div>
            `;

            // Add event listeners to cart item controls
            this.attachCartItemListeners();
        }

        // Update cart footer
        const cartFooter = document.getElementById('cartFooter');
        const cartTotal = document.getElementById('cartTotal');
        
        if (items.length > 0) {
            cartFooter.style.display = 'block';
            cartTotal.textContent = this.formatPrice(totalPrice.toString(), currency);
            this.refreshCartInventoryUI();
        } else {
            cartFooter.style.display = 'none';
        }
    }

    /**
     * Create HTML for cart item
     */
    createCartItem(item) {
        return `
            <div class="cart-item" data-variant-id="${item.variantId}">
                ${item.productImage 
                    ? `<img src="${item.productImage}" alt="${item.productTitle}" class="cart-item-image">`
                    : `<div class="cart-item-image" style="background: var(--neutral-light);"></div>`
                }
                <div class="cart-item-details">
                    <div class="cart-item-title">${this.escapeHtml(item.productTitle)}</div>
                    ${item.variantInfo ? `<div class="cart-item-variant">${this.escapeHtml(item.variantInfo)}</div>` : ''}
                    <div class="cart-item-price">${this.formatPrice(item.price.amount, item.price.currencyCode)}</div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn quantity-decrease" data-variant-id="${item.variantId}">−</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn quantity-increase" data-variant-id="${item.variantId}">+</button>
                        </div>
                        <button class="remove-item-btn" data-variant-id="${item.variantId}" title="Remove item">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                    <p class="cart-item-stock-status" data-variant-id="${item.variantId}" aria-live="polite"></p>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to cart item controls
     */
    attachCartItemListeners() {
        // Quantity buttons
        document.querySelectorAll('.quantity-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const variantId = e.currentTarget.getAttribute('data-variant-id');
                const item = cartManager.getItems().find(i => i.variantId === variantId);
                if (item) {
                    cartManager.updateQuantity(variantId, item.quantity - 1);
                }
            });
        });

        document.querySelectorAll('.quantity-increase').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const variantId = e.currentTarget.getAttribute('data-variant-id');
                const item = cartManager.getItems().find(i => i.variantId === variantId);
                if (!item) {
                    return;
                }

                e.currentTarget.disabled = true;
                const inventoryRecord = await inventoryManager.getVariantInventory(variantId, { forceRefresh: true });
                if (!this.canIncreaseCartQuantity(item.quantity, inventoryRecord)) {
                    this.applyCartInventoryState(variantId, item.quantity, inventoryRecord);
                    return;
                }

                cartManager.updateQuantity(variantId, item.quantity + 1);
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const variantId = e.currentTarget.getAttribute('data-variant-id');
                cartManager.removeItem(variantId);
            });
        });
    }

    findCartItemElement(variantId) {
        return Array.from(document.querySelectorAll('.cart-item'))
            .find(element => element.getAttribute('data-variant-id') === variantId) || null;
    }

    setInventoryMessage(element, message, tone = 'neutral') {
        if (!element) {
            return;
        }

        element.textContent = message || '';
        element.classList.toggle('is-visible', Boolean(message));
        element.classList.toggle('is-warning', tone === 'warning');
        element.classList.toggle('is-error', tone === 'error');
    }

    canIncreaseCartQuantity(currentQuantity, inventoryRecord) {
        const limit = getVariantInventoryLimit(inventoryRecord);
        if (limit === null) {
            return inventoryRecord?.availableForSale !== false;
        }

        return currentQuantity < limit;
    }

    applyCartInventoryState(variantId, quantity, inventoryRecord) {
        const cartItem = this.findCartItemElement(variantId);
        if (!cartItem) {
            return;
        }

        const increaseButton = cartItem.querySelector('.quantity-increase');
        const presentation = getInventoryPresentation(inventoryRecord, quantity, 'cart');

        if (increaseButton) {
            increaseButton.disabled = !this.canIncreaseCartQuantity(quantity, inventoryRecord);
        }

        this.setInventoryMessage(
            cartItem.querySelector('.cart-item-stock-status'),
            presentation.message,
            presentation.tone
        );
    }

    async refreshCartInventoryUI(options = {}) {
        const items = cartManager.getItems();
        if (items.length === 0) {
            return {};
        }

        const inventoryMap = await inventoryManager.getVariantInventoryMap(
            items.map(item => item.variantId),
            options
        );

        items.forEach(item => {
            this.applyCartInventoryState(item.variantId, item.quantity, inventoryMap[item.variantId]);
        });

        return inventoryMap;
    }

    async validateCartInventory(options = {}) {
        const items = cartManager.getItems();
        if (items.length === 0) {
            return { valid: true, issues: [] };
        }

        const inventoryMap = await this.refreshCartInventoryUI(options);
        const issues = items.reduce((results, item) => {
            const inventoryRecord = inventoryMap[item.variantId];
            const limit = getVariantInventoryLimit(inventoryRecord);

            if (limit === null) {
                return results;
            }

            if (limit <= 0 || inventoryRecord?.availableForSale === false) {
                results.push(`${item.productTitle} is no longer available.`);
                return results;
            }

            if (item.quantity > limit) {
                results.push(`${item.productTitle} only has ${limit} available right now.`);
            }

            return results;
        }, []);

        return {
            valid: issues.length === 0,
            issues,
            inventoryMap
        };
    }

    /**
     * Handle clear cart
     */
    handleClearCart() {
        if (confirm('Are you sure you want to clear your cart?')) {
            cartManager.clearCart();
        }
    }

    resetCheckoutButton(checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = `
            <span>Proceed to Checkout</span>
            <svg class="needle-icon" width="20" height="20" viewBox="0 0 24 24">
                <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="2" cy="12" r="2" fill="currentColor"/>
            </svg>
        `;
    }

    /**
     * Handle checkout
     */
    async handleCheckout() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        const items = cartManager.getItems();

        if (items.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        // Disable button and show loading
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<span>Processing...</span>';

        try {
            const validationResult = await this.validateCartInventory({ forceRefresh: true });
            if (!validationResult.valid) {
                this.openCart();
                alert(validationResult.issues.join('\n'));
                this.resetCheckoutButton(checkoutBtn);
                return;
            }

            // Format line items for Shopify
            const lineItems = items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity
            }));

            // Create checkout
            const checkout = await shopifyClient.createCheckout(lineItems);

            // Redirect to Shopify checkout
            window.location.href = checkout.webUrl;
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Sorry, there was an error creating your checkout. Please try again.');
            this.resetCheckoutButton(checkoutBtn);
        }
    }

    /**
     * Format price
     */
    formatPrice(amount, currencyCode = 'USD') {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        });
        return formatter.format(parseFloat(amount));
    }

    isProductOutOfStock(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node).filter(Boolean) || [];

        return variants.length > 0 && variants.every(variant => variant.availableForSale === false);
    }

    formatPriceRange(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node) || [];
        const pricedVariants = variants.filter(variant => variant?.priceV2?.amount && variant?.priceV2?.currencyCode);

        if (pricedVariants.length === 0) {
            const minPrice = product?.priceRange?.minVariantPrice;
            return minPrice ? this.formatPrice(minPrice.amount, minPrice.currencyCode) : 'Price not available';
        }

        const currencyCode = pricedVariants[0].priceV2.currencyCode;
        const amounts = pricedVariants
            .map(variant => parseFloat(variant.priceV2.amount))
            .filter(amount => Number.isFinite(amount));

        if (amounts.length === 0) {
            return 'Price not available';
        }

        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);

        if (minAmount === maxAmount) {
            return this.formatPrice(minAmount, currencyCode);
        }

        return `${this.formatPrice(minAmount, currencyCode)} - ${this.formatPrice(maxAmount, currencyCode)}`;
    }

    formatVariantPrice(variant) {
        if (!variant?.priceV2?.amount || !variant?.priceV2?.currencyCode) {
            return '';
        }

        return this.formatPrice(variant.priceV2.amount, variant.priceV2.currencyCode);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Strip HTML tags
     */
    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    /**
     * Open product detail modal
     */
    async openProductModal(productId) {
        const productModal = document.getElementById('productModal');
        const modalBody = document.getElementById('productModalBody');

        clearTimeout(this.productModalCloseTimeout);
        
        // Show loading state
        modalBody.innerHTML = '<div class="product-detail-loading">Loading product details...</div>';
        productModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.scheduleProductModalScrollbarUpdate();

        try {
            // Fetch full product details
            const product = await shopifyClient.getProductById(productId);
            this.renderProductModal(product);
        } catch (error) {
            console.error('Error loading product:', error);
            modalBody.innerHTML = '<div class="product-detail-loading">Error loading product details. Please try again.</div>';
        }
    }

    /**
     * Close product detail modal
     */
    closeProductModal() {
        const productModal = document.getElementById('productModal');
        const modalBody = document.getElementById('productModalBody');

        productModal.classList.remove('open');
        document.body.style.overflow = '';
        this.scheduleProductModalScrollbarUpdate();

        // Let the close animation finish before clearing the content.
        clearTimeout(this.productModalCloseTimeout);
        this.productModalCloseTimeout = setTimeout(() => {
            if (!productModal.classList.contains('open')) {
                modalBody.innerHTML = '';
            }
        }, 360);
    }

    /**
     * Render product in modal
     */
    renderProductModal(product) {
        const modalBody = document.getElementById('productModalBody');
        const images = product.images?.edges || [];
        const variants = product.variants?.edges || [];
        const mainImage = images[0]?.node;
        const availableVariants = variants.filter(v => v.node.availableForSale);
        const hasMultipleVariants = variants.length > 1;
        const selectedVariant = hasMultipleVariants ? null : (availableVariants[0]?.node || variants[0]?.node);
        const isHandPainted = this.isHandPainted(product);
        
        // Badge HTML for modal
        const badgeHTML = isHandPainted 
            ? `<span class="product-detail-badge product-detail-badge-hand-painted">Painted Canvas</span>`
            : `<span class="product-detail-badge product-detail-badge-digital">Digital Pattern</span>`;

        // Extract mesh size from title
        const meshSize = !hasMultipleVariants ? this.extractMeshSize(product.title) : null;
        const sizeHTML = meshSize 
            ? `<div class="product-detail-size">
                <span class="product-detail-type-label">Size:</span>
                <span class="product-detail-size-value">${meshSize} Mesh</span>
            </div>`
            : '';

        const purchaseActionsHTML = `
            <div class="product-detail-actions">
                <div id="productDetailPrice">
                    ${this.renderProductPriceDisplay(product, selectedVariant, hasMultipleVariants)}
                </div>
                <div id="productPurchaseActions">
                    ${this.renderProductPurchaseActions(product, selectedVariant, hasMultipleVariants)}
                </div>
            </div>
        `;

        // Collect all full-size image URLs for lightbox
        const allImageUrls = images.map(imgEdge => imgEdge.node.url);
        const allImageCaptions = images.map(imgEdge => imgEdge.node.altText || product.title);
        
        // Use transformedSrc (thumbnail) for main display if available, otherwise use full URL
        // Store full URL in data attribute for lightbox
        const mainImageDisplayUrl = mainImage.transformedSrc || mainImage.url;
        const mainImageFullUrl = mainImage.url;

        const imagesHTML = images.length > 0 ? `
            <div class="product-detail-images">
                <img id="productMainImage" 
                     src="${mainImageDisplayUrl}" 
                     data-full-image="${mainImageFullUrl}"
                     alt="${mainImage.altText || product.title}" 
                     class="product-detail-main-image product-image-clickable">
                ${images.length > 1 ? `
                    <div class="product-detail-thumbnails">
                        ${images.map((imgEdge, index) => {
                            const thumbnailUrl = imgEdge.node.transformedSrc || imgEdge.node.url;
                            const fullUrl = imgEdge.node.url;
                            return `
                            <img src="${thumbnailUrl}" 
                                 data-full-image="${fullUrl}"
                                 alt="${imgEdge.node.altText || product.title}" 
                                 class="product-detail-thumbnail product-image-clickable ${index === 0 ? 'active' : ''}"
                                 data-image-url="${imgEdge.node.url}"
                                 data-image-alt="${imgEdge.node.altText || product.title}">
                        `;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        ` : `<div class="product-detail-images">
            <div class="product-detail-main-image" style="background: var(--linen); display: flex; align-items: center; justify-content: center; color: var(--neutral-mid);">No image available</div>
        </div>`;

        const descriptionHTML = product.descriptionHtml 
            ? `<div class="product-detail-description">${product.descriptionHtml}</div>`
            : product.description 
                ? `<div class="product-detail-description"><p>${this.escapeHtml(product.description)}</p></div>`
                : '';

        modalBody.innerHTML = `
            <div class="product-detail-content">
                <div class="product-detail-main-layout">
                    ${imagesHTML}
                    <div class="product-detail-info">
                        <div class="product-detail-header">
                            <h1 class="product-detail-title">${this.escapeHtml(product.title)}</h1>
                            ${sizeHTML}
                        </div>
                        ${purchaseActionsHTML}
                        ${descriptionHTML}
                    </div>
                </div>
            </div>
        `;

        modalBody.scrollTop = 0;
        this.scheduleProductModalScrollbarUpdate();

        // Add event listeners
        this.attachProductModalListeners(product, variants, selectedVariant);
    }

    /**
     * Attach event listeners to product modal
     */
    attachProductModalListeners(product, variants, selectedVariant) {
        // Collect all full-size image URLs for lightbox
        const images = product.images?.edges || [];
        const allImageUrls = images.map(imgEdge => imgEdge.node.url);
        const allImageCaptions = images.map(imgEdge => imgEdge.node.altText || product.title);

        // Main image click - open lightbox
        const mainImage = document.getElementById('productMainImage');
        if (mainImage) {
            mainImage.addEventListener('click', () => {
                const currentIndex = 0; // Main image is always first
                this.openLightbox(allImageUrls, currentIndex, allImageCaptions);
            });
        }

        // Image thumbnail clicks - update main image and open lightbox
        const thumbnails = document.querySelectorAll('.product-detail-thumbnail');
        thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', (e) => {
                // Update main image display
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImage) {
                    // Use the thumbnail's src (which is already transformedSrc) for display
                    const thumbnailDisplayUrl = thumb.src;
                    const fullUrl = thumb.getAttribute('data-full-image') || thumb.getAttribute('data-image-url');
                    
                    mainImage.src = thumbnailDisplayUrl;
                    if (fullUrl) {
                        mainImage.setAttribute('data-full-image', fullUrl);
                    }
                    mainImage.alt = thumb.getAttribute('data-image-alt') || thumb.getAttribute('alt');
                }
                
                // Open lightbox at clicked image
                this.openLightbox(allImageUrls, index, allImageCaptions);
            });
        });

        this.attachProductVariantSelectionListeners(product, variants);

        this.attachProductPurchaseActionListeners(product, selectedVariant);
    }

    attachProductVariantSelectionListeners(product, variants) {
        const priceRows = document.querySelectorAll('.product-detail-price-row[data-variant-id]');
        priceRows.forEach(row => {
            row.addEventListener('click', () => {
                const variantId = row.getAttribute('data-variant-id');
                const selectedVariant = variants.find(v => v.node.id === variantId)?.node;
                const detailPrice = document.getElementById('productDetailPrice');
                const purchaseActions = document.getElementById('productPurchaseActions');

                if (detailPrice) {
                    detailPrice.innerHTML = this.renderProductPriceDisplay(product, selectedVariant, true);
                }

                if (purchaseActions) {
                    purchaseActions.innerHTML = this.renderProductPurchaseActions(product, selectedVariant, true);
                    this.attachProductPurchaseActionListeners(product, selectedVariant);
                }

                this.attachProductVariantSelectionListeners(product, variants);
                this.scheduleProductModalScrollbarUpdate();
            });
        });
    }

    renderProductPriceDisplay(product, selectedVariant, hasMultipleVariants) {
        if (!hasMultipleVariants) {
            const fallbackPrice = selectedVariant
                ? this.formatVariantPrice(selectedVariant)
                : this.formatPriceRange(product);
            if (!fallbackPrice) {
                return '';
            }

            const isUnavailable = selectedVariant?.availableForSale === false;
            return `
                <div class="product-detail-price-group">
                    <div class="product-detail-price ${isUnavailable ? 'product-detail-price-unavailable' : ''}">${fallbackPrice}</div>
                    ${isUnavailable ? '<span class="product-detail-stock-status">Currently Out of Stock</span>' : ''}
                </div>
            `;
        }

        const variants = product?.variants?.edges?.map(edge => edge.node) || [];
        return `
            <div class="product-detail-price-group">
                <div class="product-detail-price-list">
                    ${variants.map(variant => {
                        const optionValue = variant.selectedOptions?.[0]?.value || variant.title;
                        const price = this.formatVariantPrice(variant);
                        const rowClasses = [
                            'product-detail-price-row',
                            selectedVariant?.id === variant.id ? 'selected' : '',
                            !variant.availableForSale ? 'unavailable' : ''
                        ].filter(Boolean).join(' ');

                        return `
                            <button class="${rowClasses}" type="button" data-variant-id="${variant.id}">
                                <span class="product-detail-price-option">${this.escapeHtml(optionValue)}</span>
                                <span class="product-detail-price-value">${price}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
                ${selectedVariant?.availableForSale === false ? '<span class="product-detail-stock-status">Currently Out of Stock</span>' : ''}
            </div>
        `;
    }

    renderProductPurchaseActions(product, selectedVariant, hasMultipleVariants = false) {
        if (hasMultipleVariants && !selectedVariant) {
            return `
                <button class="product-detail-add-to-cart product-detail-select-prompt" type="button" disabled>
                    <div class="add-to-cart-content">
                        <span class="add-to-cart-text">Choose a Mesh Size to Continue</span>
                    </div>
                </button>
            `;
        }

        if (selectedVariant?.availableForSale && selectedVariant?.id) {
            return `
                <div class="product-detail-purchase-group">
                    <div class="product-detail-purchase-row">
                        <div class="product-detail-quantity-control" aria-label="Select quantity">
                            <button type="button" class="product-detail-quantity-btn" data-action="decrease" aria-label="Decrease quantity">-</button>
                            <span class="product-detail-quantity-value" aria-live="polite">1</span>
                            <button type="button" class="product-detail-quantity-btn" data-action="increase" aria-label="Increase quantity">+</button>
                        </div>
                        <button class="product-detail-add-to-cart" 
                                data-product-id="${product.id}"
                                data-variant-id="${selectedVariant.id}"
                                data-default-label="Add to Cart">
                            <div class="add-to-cart-content">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                <span class="add-to-cart-text">Add to Cart</span>
                            </div>
                        </button>
                    </div>
                    <p class="product-detail-stock-note" aria-live="polite"></p>
                </div>
            `;
        }

        return `
            <div class="product-detail-notify-group">
                <button class="product-detail-notify-btn" type="button" data-variant-id="${selectedVariant?.id || ''}">
                    Join Waitlist on Shopify
                </button>
                <p class="product-detail-notify-note">This opens the Shopify product page in a new tab so you can sign up there.</p>
                <p class="product-detail-notify-feedback" aria-live="polite"></p>
            </div>
        `;
    }

    buildModalInventoryState(inventoryRecord, variantId, selectedQuantity) {
        const safeSelectedQuantity = Math.max(selectedQuantity || 1, 1);
        const existingQuantity = cartManager.getVariantQuantity(variantId);
        const totalLimit = getVariantInventoryLimit(inventoryRecord);

        if (totalLimit === null) {
            return {
                selectedQuantity: safeSelectedQuantity,
                canAdd: inventoryRecord?.availableForSale !== false,
                canIncrease: inventoryRecord?.availableForSale !== false,
                canDecrease: safeSelectedQuantity > 1,
                message: inventoryRecord?.error ? 'Live stock is temporarily unavailable.' : '',
                tone: inventoryRecord?.error ? 'warning' : 'neutral'
            };
        }

        const remainingQuantity = Math.max(totalLimit - existingQuantity, 0);
        const clampedQuantity = remainingQuantity > 0
            ? Math.min(safeSelectedQuantity, remainingQuantity)
            : safeSelectedQuantity;

        if (remainingQuantity <= 0 || inventoryRecord?.availableForSale === false) {
            return {
                selectedQuantity: 1,
                canAdd: false,
                canIncrease: false,
                canDecrease: false,
                message: existingQuantity > 0 ? 'All available stock is already in your cart.' : 'Sold out.',
                tone: 'error'
            };
        }

        const remainingLabel = remainingQuantity === 1
            ? 'Only 1 more available.'
            : `Only ${remainingQuantity} more available.`;
        const firstTimeLabel = remainingQuantity === 1
            ? 'Only 1 available.'
            : `Only ${remainingQuantity} available.`;

        let message = '';
        let tone = 'neutral';

        if (existingQuantity > 0) {
            message = `${existingQuantity} already in cart. ${remainingLabel}`;
            tone = 'warning';
        } else if (remainingQuantity <= 5) {
            message = firstTimeLabel;
            tone = 'warning';
        }

        return {
            selectedQuantity: clampedQuantity,
            canAdd: true,
            canIncrease: clampedQuantity < remainingQuantity,
            canDecrease: clampedQuantity > 1,
            message,
            tone
        };
    }

    applyModalInventoryState(state, { quantityValue, quantityButtons, addToCartBtn, stockNote }) {
        if (quantityValue) {
            quantityValue.textContent = String(state.selectedQuantity);
        }

        quantityButtons.forEach(button => {
            const action = button.getAttribute('data-action');
            if (action === 'increase') {
                button.disabled = !state.canIncrease;
            } else if (action === 'decrease') {
                button.disabled = !state.canDecrease;
            }
        });

        if (addToCartBtn) {
            addToCartBtn.disabled = !state.canAdd;
        }

        this.setInventoryMessage(stockNote, state.message, state.tone);
    }

    attachProductPurchaseActionListeners(product, selectedVariant) {
        const quantityValue = document.querySelector('.product-detail-quantity-value');
        const quantityButtons = Array.from(document.querySelectorAll('.product-detail-quantity-btn'));
        const addToCartBtn = document.querySelector('.product-detail-add-to-cart');
        const stockNote = document.querySelector('.product-detail-stock-note');
        const variantId = selectedVariant?.id;

        const syncModalInventory = async ({ forceRefresh = false, requestedQuantity = null } = {}) => {
            if (!quantityValue || !variantId) {
                return null;
            }

            const inventoryRecord = await inventoryManager.getVariantInventory(variantId, { forceRefresh });
            const currentQuantity = requestedQuantity ?? (parseInt(quantityValue.textContent, 10) || 1);
            const state = this.buildModalInventoryState(inventoryRecord, variantId, currentQuantity);
            this.applyModalInventoryState(state, { quantityValue, quantityButtons, addToCartBtn, stockNote });
            return { inventoryRecord, state };
        };

        if (variantId && quantityValue) {
            syncModalInventory();
        }

        quantityButtons.forEach(button => {
            button.addEventListener('click', async () => {
                if (!quantityValue || !variantId) {
                    return;
                }

                const currentQuantity = parseInt(quantityValue.textContent, 10) || 1;
                if (button.getAttribute('data-action') === 'decrease') {
                    const cachedInventory = await inventoryManager.getVariantInventory(variantId);
                    const state = this.buildModalInventoryState(cachedInventory, variantId, currentQuantity - 1);
                    this.applyModalInventoryState(state, { quantityValue, quantityButtons, addToCartBtn, stockNote });
                    return;
                }

                const inventoryResult = await syncModalInventory({ forceRefresh: true, requestedQuantity: currentQuantity });
                if (!inventoryResult?.state?.canIncrease) {
                    return;
                }

                const nextState = this.buildModalInventoryState(
                    inventoryResult.inventoryRecord,
                    variantId,
                    currentQuantity + 1
                );
                this.applyModalInventoryState(nextState, { quantityValue, quantityButtons, addToCartBtn, stockNote });
            });
        });

        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', async () => {
                const selectedQuantity = parseInt(document.querySelector('.product-detail-quantity-value')?.textContent || '1', 10) || 1;
                if (variantId) {
                    const inventoryResult = await syncModalInventory({
                        forceRefresh: true,
                        requestedQuantity: selectedQuantity
                    });

                    if (!inventoryResult?.state?.canAdd) {
                        return;
                    }

                    const quantityToAdd = inventoryResult.state.selectedQuantity;
                    cartManager.addItem(product, variantId, quantityToAdd);

                    addToCartBtn.innerHTML = `
                        <div class="add-to-cart-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span class="add-to-cart-text">${quantityToAdd > 1 ? `Added ${quantityToAdd} Items!` : 'Added!'}</span>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        const defaultLabel = addToCartBtn.getAttribute('data-default-label') || 'Add to Cart';
                        addToCartBtn.innerHTML = `
                            <div class="add-to-cart-content">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                <span class="add-to-cart-text">${defaultLabel}</span>
                            </div>
                        `;
                        syncModalInventory({ requestedQuantity: 1 });
                    }, 1000);
                }
            });
        }

        const notifyBtn = document.querySelector('.product-detail-notify-btn');
        const notifyFeedback = document.querySelector('.product-detail-notify-feedback');

        if (notifyBtn && notifyFeedback && selectedVariant?.id) {
            notifyBtn.addEventListener('click', () => {
                notifyFeedback.textContent = '';
                notifyFeedback.classList.remove('is-error', 'is-success');

                try {
                    const shopifyNotifyUrl = this.buildShopifyNotifyUrl(product, selectedVariant);
                    window.open(shopifyNotifyUrl, '_blank', 'noopener,noreferrer');
                } catch (error) {
                    console.error('Failed to open Shopify waitlist page:', error);
                    notifyFeedback.textContent = error.message || 'Waitlist signup is unavailable right now.';
                    notifyFeedback.classList.add('is-error');
                }

                this.scheduleProductModalScrollbarUpdate();
            });
        }
    }

    extractShopifyNumericId(id) {
        if (!id) return null;
        const match = String(id).match(/(\d+)(?!.*\d)/);
        return match ? parseInt(match[1], 10) : null;
    }

    buildShopifyNotifyUrl(product, variant) {
        const shopifyVariantId = this.extractShopifyNumericId(variant?.id);
        const productHandle = product?.handle;

        if (!productHandle || !shopifyVariantId) {
            throw new Error('Unable to identify this product option for notifications.');
        }

        return `https://${SHOPIFY_CONFIG.domain}/products/${encodeURIComponent(productHandle)}?variant=${shopifyVariantId}`;
    }
}

// Initialize the shop when DOM is ready (collection pages only)
if (document.body.dataset.shopCollection) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ShopApp());
    } else {
        new ShopApp();
    }
}

