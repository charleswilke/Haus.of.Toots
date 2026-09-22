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
        const tag = (dataset.shopTag || '').trim();
        const collectionKey = (dataset.shopCollection || tag).trim();
        const collectionHandle = tag
            ? ''
            : (dataset.shopCollectionHandle || collectionKey).trim();

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
            tag,
            title: (dataset.shopCollectionTitle || '').trim() || collectionKey,
            aliases,
            priorityKeywords: (dataset.shopPriorityKeywords || '')
                .split(',')
                .map(keyword => this.normalizeCollectionText(keyword))
                .filter(Boolean),
            secondaryTitleKeyword: this.normalizeCollectionText(dataset.shopSecondaryTitleKeyword),
            fallbackTitlePrefixes: (dataset.shopFallbackTitlePrefixes || '')
                .split(',')
                .map(prefix => this.normalizeCollectionText(prefix))
                .filter(Boolean),
            freshCatalog: dataset.shopFreshCatalog === 'true',
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
            ...(product.tags || [])
        ].join(' '));
    }

    filterProductsForCollection(products) {
        if (!this.collectionContext) {
            return products;
        }

        if (this.collectionContext.tag) {
            const targetTag = this.collectionContext.tag.toLowerCase();
            return products.filter(product =>
                (product.tags || []).some(tag => String(tag).trim().toLowerCase() === targetTag)
            );
        }

        const aliases = this.collectionContext.aliases.length
            ? this.collectionContext.aliases
            : [this.normalizeCollectionText(this.collectionContext.key)];

        return products.filter(product => {
            const searchableText = this.getCollectionSearchText(product);
            const title = this.normalizeCollectionText(product.title);
            return aliases.some(alias => searchableText.includes(alias)) ||
                (this.collectionContext.fallbackTitlePrefixes || []).some(prefix =>
                    title === prefix || title.startsWith(`${prefix} `)
                );
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
     * Pull the paragraph text out of Shopify's description HTML.
     * Returns an array of paragraphs, each split into its own lines.
     */
    parseCollectionDescription(descriptionHtml) {
        if (!descriptionHtml) {
            return [];
        }

        const parsed = new DOMParser().parseFromString(descriptionHtml, 'text/html');
        parsed.body.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

        const blocks = parsed.body.querySelectorAll('p, li');
        const sources = blocks.length ? Array.from(blocks) : [parsed.body];

        return sources
            .map(node => node.textContent.replace(/[^\S\n]+/g, ' ').trim())
            .filter(Boolean)
            .map(text => text.split('\n').map(line => line.trim()).filter(Boolean));
    }

    /**
     * Swap the hardcoded hero copy for the collection description set in Shopify.
     * The paragraphs are rebuilt from text nodes rather than injected as markup,
     * and an empty description leaves the copy already in the page untouched.
     */
    applyCollectionDescription(descriptionHtml) {
        const existing = document.querySelector('.series-copy .hero-description');
        if (!existing) {
            return;
        }

        const paragraphs = this.parseCollectionDescription(descriptionHtml);
        if (!paragraphs.length) {
            return;
        }

        // One wrapper around the paragraphs so the copy can flow as two
        // columns on wider screens (see .series-description).
        const wrapper = document.createElement('div');
        wrapper.className = 'series-description';

        paragraphs.forEach(lines => {
            const paragraph = document.createElement('p');
            paragraph.className = existing.className;

            lines.forEach((line, index) => {
                if (index > 0) {
                    paragraph.appendChild(document.createElement('br'));
                }
                paragraph.appendChild(document.createTextNode(line));
            });

            wrapper.appendChild(paragraph);
        });

        existing.replaceWith(wrapper);
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
                const options = { forceRefresh: this.collectionContext.freshCatalog };
                const collection = await shopifyClient.getCollectionProducts(this.collectionContext.handle, 50, options);
                if (collection) {
                    this.products = collection.products;
                    this.applyCollectionDescription(collection.descriptionHtml);
                } else {
                    const products = await shopifyClient.getAllProducts(50, options);
                    this.products = this.filterProductsForCollection(products);
                }
            } else {
                const products = this.collectionContext?.tag
                    ? await shopifyClient.getAllProducts(50)
                    : await shopifyClient.getProducts(24);
                this.products = this.filterProductsForCollection(products);
            }
            
            // Hide loading, show products
            loadingState.style.display = 'none';
            productsGrid.style.display = '';
            
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

        // Featured collection keywords take precedence, in the configured order.
        // Stable sorting preserves Shopify's order within each group and for the rest.
        const priorityKeywords = this.collectionContext?.priorityKeywords || [];
        const secondaryTitleKeyword = this.collectionContext?.secondaryTitleKeyword || '';
        const priorityRank = product => {
            const words = this.normalizeCollectionText([
                product.title, product.handle, ...(product.tags || [])
            ].join(' '));
            const rank = priorityKeywords.findIndex(keyword =>
                ` ${words} `.includes(` ${keyword} `)
            );
            if (rank !== -1) return rank;

            const title = this.normalizeCollectionText(product.title);
            const isSecondary = secondaryTitleKeyword &&
                ` ${title} `.includes(` ${secondaryTitleKeyword} `);
            return priorityKeywords.length + (isSecondary ? 0 : 1);
        };
        const sortedProducts = [...this.products].sort((a, b) => {
            if (priorityKeywords.length || secondaryTitleKeyword) {
                return priorityRank(a) - priorityRank(b);
            }

            // Other collection pages retain their hand-painted-first ordering.
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
            card.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                card.click();
            });
        });

        if (window.applyMasonry) window.applyMasonry(productsGrid);
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
     * Detect sticker products (multi-select, no mesh size)
     */
    isStickerProduct(product) {
        if (!product) return false;
        const title = (product.title || '').toLowerCase();
        const productType = (product.productType || '').toLowerCase();
        const tags = (product.tags || []).map(tag => tag.toLowerCase());
        return title.includes('sticker') ||
               productType.includes('sticker') ||
               tags.some(tag => tag.includes('sticker'));
    }

    /**
     * Create HTML for a product card
     */
    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const variants = product.variants?.edges || [];
        const isOutOfStock = this.isProductOutOfStock(product);
        const isPreorder = !isOutOfStock && this.isProductPreorder(product);

        // Keep the natural aspect ratio while letting the browser choose a right-sized,
        // compressed Shopify rendition for the active card layout.
        const fullImageUrl = image?.url || null;
        const imageParam = fullImageUrl?.includes('?') ? '&' : '?';
        const thumbnailUrl = fullImageUrl ? `${fullImageUrl}${imageParam}width=480&quality=65` : null;
        const thumbnailSrcset = fullImageUrl
            ? [360, 480, 600]
                .map(width => `${fullImageUrl}${imageParam}width=${width}&quality=65 ${width}w`)
                .join(', ')
            : null;
        
        const imageHTML = thumbnailUrl
            ? `<img src="${thumbnailUrl}"
                    srcset="${thumbnailSrcset}"
                    sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 899px) calc((100vw - 80px) / 2), 360px"
                    data-full-image="${fullImageUrl}"
                    alt="${this.escapeHtml(image.altText || product.title)}"
                    class="product-image product-image-clickable"
                    loading="lazy"
                    decoding="async">`
            : `<div class="product-no-image">No image available</div>`;

        const cardPriceFormatted = this.formatProductCardPrice(product);
        const cardPriceHTML = cardPriceFormatted.startsWith('From ')
            ? `<span class="product-price-prefix">From</span> <span class="product-price-amount">${this.escapeHtml(cardPriceFormatted.slice(5))}</span>`
            : `<span class="product-price-amount">${this.escapeHtml(cardPriceFormatted)}</span>`;
        const cardMeta = this.getProductCardMeta(product);

        const cardClasses = 'product-card';

        return `
            <div class="${cardClasses}" data-product-id="${product.id}" role="button" tabindex="0" aria-label="View ${this.escapeHtml(product.title)}">
                <div class="product-image-container">
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <div class="product-title-row">
                        <h3 class="product-title" title="${this.escapeHtml(product.title)}">${this.escapeHtml(this.truncateCardTitle(product.title))}</h3>
                        ${isOutOfStock ? '<span class="product-out-of-stock-badge">Out of Stock</span>' : ''}
                        ${isPreorder ? '<span class="product-preorder-badge">Preorder</span>' : ''}
                    </div>
                    <div class="product-card-footer">
                        ${cardMeta ? `<p class="product-card-meta">${this.escapeHtml(cardMeta)}</p>` : ''}
                        <div class="product-price-section">
                            <span class="product-price ${isOutOfStock ? 'product-price-unavailable' : ''}" data-product-id="${product.id}">${cardPriceHTML}</span>
                        </div>
                    </div>
                    ${isOutOfStock ? '<p class="product-waitlist-label">Join the Waitlist</p>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * Shorten long card titles at a word boundary so the 2-line clamp
     * ends cleanly instead of mid-word.
     */
    truncateCardTitle(title, max = 46) {
        if (!title || title.length <= max) return title;
        const cut = title.slice(0, max);
        const atWord = cut.lastIndexOf(' ');
        return `${(atWord > max * 0.6 ? cut.slice(0, atWord) : cut).replace(/[\s(\-–,:]+$/, '')}…`;
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

        // Sticky add-to-cart pill, after the Shopify theme's: a sibling of
        // the scrolling body so it stays put, shown once the buy buttons
        // have scrolled up out of view. Built here rather than in each
        // page's markup so every page with the modal gets it.
        const stickyBar = document.createElement('div');
        stickyBar.className = 'product-sticky-bar';
        stickyBar.setAttribute('role', 'region');
        stickyBar.setAttribute('aria-label', 'Quick add to cart');
        modalBody.insertAdjacentElement('afterend', stickyBar);
        this.productStickyBar = stickyBar;
        this.productStickyBarObserver = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const scrolledPast = !entry.isIntersecting
                && entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0);
            stickyBar.classList.toggle('visible', scrolledPast && stickyBar.innerHTML !== '');
        }, { root: modalBody, threshold: 0 });

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
        element.classList.toggle('is-preorder', tone === 'preorder');
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

    /**
     * A variant is on preorder when Shopify still lets it sell but it has no
     * stock behind it. With the "continue selling when out of stock" inventory
     * policy, availableForSale stays true past zero, so currentlyNotInStock is
     * the only signal that separates a preorder from a genuine in-stock sale.
     */
    isVariantPreorder(variant) {
        return variant?.availableForSale === true && variant?.currentlyNotInStock === true;
    }

    /**
     * Badge the card only when everything a shopper could actually buy is a
     * preorder. A product with one in-stock mesh size and one oversold size
     * still ships today, so it should not read as a preorder at the grid level.
     */
    isProductPreorder(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node).filter(Boolean) || [];
        const purchasable = variants.filter(variant => variant.availableForSale !== false);

        return purchasable.length > 0 && purchasable.every(variant => this.isVariantPreorder(variant));
    }

    renderStockStatus(variant) {
        if (variant?.availableForSale === false) {
            return '<span class="product-detail-stock-status">Currently Out of Stock</span>';
        }

        if (this.isVariantPreorder(variant)) {
            return '<span class="product-detail-stock-status product-detail-stock-status-preorder">Preorder</span>';
        }

        return '';
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

    formatProductCardPrice(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node) || [];
        const pricedVariants = variants.filter(variant => variant?.priceV2?.amount && variant?.priceV2?.currencyCode);

        if (pricedVariants.length === 0) {
            const minPrice = product?.priceRange?.minVariantPrice;
            return minPrice
                ? this.formatCompactPrice(minPrice.amount, minPrice.currencyCode)
                : 'Price not available';
        }

        const currencyCode = pricedVariants[0].priceV2.currencyCode;
        const amounts = pricedVariants
            .map(variant => parseFloat(variant.priceV2.amount))
            .filter(amount => Number.isFinite(amount));

        if (amounts.length === 0) return 'Price not available';

        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        const minimum = this.formatCompactPrice(minAmount, currencyCode);

        return minAmount === maxAmount ? minimum : `From ${minimum}`;
    }

    formatCompactPrice(amount, currencyCode = 'USD') {
        const numericAmount = parseFloat(amount);
        const usesWholeAmount = Number.isInteger(numericAmount);
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: usesWholeAmount ? 0 : 2,
            maximumFractionDigits: 2
        });
        return formatter.format(numericAmount);
    }

    getProductCardMeta(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node).filter(Boolean) || [];
        const meshValues = [];

        variants.forEach(variant => {
            (variant.selectedOptions || []).forEach(option => {
                if (!/mesh/i.test(option?.name || '')) return;
                const value = String(option?.value || '').match(/\d+/)?.[0];
                if (value && !meshValues.includes(value)) meshValues.push(value);
            });
        });

        if (meshValues.length > 0) {
            return `${meshValues.join(' & ')} mesh`;
        }

        const meshTag = (product?.tags || []).find(tag => /^\d+\s*mesh$/i.test(String(tag).trim()));
        if (meshTag) return String(meshTag).toLowerCase();

        const title = String(product?.title || '');
        if (/needle minder/i.test(title)) return 'Magnetic needle minders';
        if (/sticker/i.test(title)) return 'Sticker collection';

        return String(product?.productType || '').replace(/^hand painted\s+/i, '').trim();
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
        this.activeModalProductId = productId;

        // The grid already holds everything the modal needs except the
        // description and any extra gallery images, so paint from that
        // immediately and let the full fetch fill in the rest below.
        const listed = this.findLoadedProduct(productId);
        if (listed) {
            this.renderProductModal(listed);
        } else {
            modalBody.innerHTML = '<div class="product-detail-loading">Loading product details...</div>';
        }
        productModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        this.scheduleProductModalScrollbarUpdate();
        this.loadProductRecommendations(productId);

        try {
            const product = await shopifyClient.getProductById(productId);
            // The user may have closed this modal or opened another product
            // while the fetch was in flight.
            if (this.activeModalProductId !== productId || !productModal.classList.contains('open')) return;
            if (listed) {
                this.hydrateProductModal(listed, product);
            } else {
                this.renderProductModal(product);
            }
        } catch (error) {
            console.error('Error loading product:', error);
            if (!listed) {
                modalBody.innerHTML = '<div class="product-detail-loading">Error loading product details. Please try again.</div>';
            }
        }
    }

    /**
     * Find a product in whatever list this page has already loaded.
     */
    findLoadedProduct(productId) {
        for (const pool of [this.products, this.allProducts, this.filteredProducts, this.recommendedProducts]) {
            const hit = Array.isArray(pool) ? pool.find(p => p && p.id === productId) : null;
            if (hit) return hit;
        }
        return null;
    }

    /**
     * Fill in the parts of an already-rendered modal that the list data
     * lacked: the description and the full image gallery. Merges the full
     * product into the listed object so any later open is complete at once
     * and closures holding the listed product see the new fields.
     */
    hydrateProductModal(listed, product) {
        if (!product) return;
        const modalBody = document.getElementById('productModalBody');
        const content = modalBody.querySelector('.product-detail-content');

        Object.assign(listed, product);
        if (!content) return;

        if (!content.querySelector('.product-detail-description')) {
            const descriptionHTML = this.renderProductDescription(listed);
            const info = content.querySelector('.product-detail-info');
            if (descriptionHTML && info) info.insertAdjacentHTML('beforeend', descriptionHTML);
        }

        const renderedImages = content.querySelectorAll('.product-detail-gallery-image').length;
        const fullImages = listed.images?.edges || [];
        if (fullImages.length > renderedImages) {
            const imagesEl = content.querySelector('.product-detail-images');
            if (imagesEl) {
                imagesEl.outerHTML = this.renderProductImages(listed);
                this.attachProductImageListeners(listed);
            }
        }

        this.scheduleProductModalScrollbarUpdate();
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
        this.productStickyBar?.classList.remove('visible');

        // Let the close animation finish before clearing the content.
        clearTimeout(this.productModalCloseTimeout);
        this.productModalCloseTimeout = setTimeout(() => {
            if (!productModal.classList.contains('open')) {
                modalBody.innerHTML = '';
            }
        }, 360);
    }

    /**
     * Render product in modal. The layout mirrors the Shopify product page:
     * the gallery runs down the left as a single column of full-width
     * images, and everything else sits in a stitched panel on the right,
     * capped by the coral title bar - price, option pills, quantity and buy
     * buttons, then the description inside the same panel.
     */
    renderProductModal(product) {
        const modalBody = document.getElementById('productModalBody');
        const variants = product.variants?.edges || [];
        const hasMultipleVariants = variants.length > 1;
        const selectedVariant = this.getDefaultVariant(product);

        const imagesHTML = this.renderProductImages(product);
        const descriptionHTML = this.renderProductDescription(product);

        modalBody.innerHTML = `
            <div class="product-detail-content">
                <div class="product-detail-main-layout">
                    <div class="product-detail-media">
                        ${imagesHTML}
                        <section id="productRecommendations" class="product-detail-recommendations" aria-label="You may also like">
                            ${this.renderProductRecommendations(product.id)}
                        </section>
                    </div>
                    <div class="product-detail-info">
                        <div class="product-detail-title-bar">
                            <h1 class="product-detail-title">${this.escapeHtml(product.title)}</h1>
                        </div>
                        <div class="product-detail-actions">
                            <div id="productDetailPrice" class="product-detail-price-slot">
                                ${this.renderProductPriceDisplay(product, selectedVariant)}
                            </div>
                            <hr class="product-detail-divider">
                            <div id="productVariantPicker" class="product-detail-variant-slot">
                                ${this.renderProductVariantPicker(product, variants, selectedVariant)}
                            </div>
                            <div id="productPurchaseActions" class="product-detail-purchase-slot">
                                ${this.renderProductPurchaseActions(product, selectedVariant, hasMultipleVariants)}
                            </div>
                        </div>
                        ${descriptionHTML}
                    </div>
                </div>
            </div>
        `;

        modalBody.scrollTop = 0;
        this.scheduleProductModalScrollbarUpdate();

        this.attachProductModalListeners(product, variants, selectedVariant);
        this.attachProductRecommendationListeners();
        this.updateStickyBar(product, selectedVariant);
    }

    /**
     * Fill the sticky pill for the current selection and start watching the
     * buy buttons. Empty (and so never shown) when there is nothing to add:
     * a sold-out variant, or a sticker sheet picked by quantity.
     */
    updateStickyBar(product, selectedVariant) {
        const bar = this.productStickyBar;
        if (!bar) return;

        const canAdd = selectedVariant?.availableForSale && selectedVariant?.id
            && !(this.isStickerProduct(product) && (product.variants?.edges?.length || 0) > 1);
        const image = product.images?.edges?.[0]?.node;
        const optionValue = selectedVariant?.selectedOptions?.[0]?.value;
        const showOption = optionValue && !/^default title$/i.test(optionValue);
        const label = this.isVariantPreorder(selectedVariant) ? 'Preorder' : 'Add to cart';

        bar.innerHTML = canAdd ? `
            <div class="product-sticky-bar-inner">
                ${image ? `<img class="product-sticky-bar-image" src="${image.url}${image.url.includes('?') ? '&' : '?'}width=120" alt="">` : ''}
                <div class="product-sticky-bar-info">
                    <p class="product-sticky-bar-title">${this.escapeHtml(product.title)}</p>
                    ${showOption ? `<p class="product-sticky-bar-variant">${this.escapeHtml(optionValue)}</p>` : ''}
                </div>
                <span class="product-sticky-bar-price">${this.formatVariantPrice(selectedVariant)}</span>
                <button class="product-sticky-bar-button" type="button">
                    <div class="add-to-cart-content">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span class="add-to-cart-text">${label}</span>
                    </div>
                </button>
            </div>
        ` : '';
        if (!canAdd) bar.classList.remove('visible');
        this.productModal?.classList.toggle('has-sticky-bar', Boolean(canAdd));

        // The pill's button drives the real one, so the quantity, the live
        // stock check and the "Added!" feedback all stay in one place.
        bar.querySelector('.product-sticky-bar-button')?.addEventListener('click', () => {
            document.querySelector('.product-detail-add-to-cart')?.click();
        });

        const slot = document.getElementById('productPurchaseActions');
        this.productStickyBarObserver?.disconnect();
        if (slot && canAdd) this.productStickyBarObserver?.observe(slot);
    }

    /**
     * "You may also like", from Shopify's related-products picks - the same
     * four the storefront's product page shows. Fetched alongside the
     * product; whichever of the two renders last still ends up with the
     * row, because renderProductModal reads the cached picks and this
     * paints into the section if it already exists.
     */
    async loadProductRecommendations(productId) {
        if (this.modalRecommendations?.productId === productId) {
            this.paintProductRecommendations(productId);
            return;
        }

        try {
            const products = await shopifyClient.getProductRecommendations(productId, 4);
            if (this.activeModalProductId !== productId) return;
            this.modalRecommendations = { productId, products };
            this.recommendedProducts = products;
            this.paintProductRecommendations(productId);
        } catch (error) {
            console.warn('Product recommendations unavailable:', error);
        }
    }

    paintProductRecommendations(productId) {
        const section = document.getElementById('productRecommendations');
        if (!section) return;
        section.innerHTML = this.renderProductRecommendations(productId);
        this.attachProductRecommendationListeners();
        this.scheduleProductModalScrollbarUpdate();
    }

    renderProductRecommendations(productId) {
        const picks = this.modalRecommendations;
        if (!picks || picks.productId !== productId || picks.products.length === 0) return '';

        return `
            <h2 class="product-detail-recommendations-title">You may also like</h2>
            <div class="product-detail-recommendations-grid">
                ${picks.products.map(product => this.createProductCard(product)).join('')}
            </div>
        `;
    }

    attachProductRecommendationListeners() {
        document.querySelectorAll('#productRecommendations .product-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openProductModal(card.getAttribute('data-product-id'));
            });
            card.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                card.click();
            });
        });
    }

    /**
     * The variant the modal opens on. Like the Shopify product page, the
     * first purchasable option is preselected so the price and buy buttons
     * are live straight away; a fully sold-out product still selects its
     * first variant so the waitlist form has something to attach to.
     * Multi-variant sticker sheets are the exception: they are picked by
     * quantity per design, so nothing is selected up front.
     */
    getDefaultVariant(product) {
        const variants = product?.variants?.edges?.map(edge => edge.node).filter(Boolean) || [];
        if (variants.length > 1 && this.isStickerProduct(product)) return null;
        return variants.find(variant => variant.availableForSale) || variants[0] || null;
    }

    /**
     * Gallery for the product modal: every image at full width in a single
     * column, as on the Shopify product page. Below the tablet breakpoint the
     * same markup becomes a snap-scrolling strip with dots (see the 767px
     * block in shop-styles.css and attachProductImageListeners).
     */
    renderProductImages(product) {
        const images = (product.images?.edges || []).map(edge => edge.node).filter(Boolean);

        if (images.length === 0) {
            return `<div class="product-detail-images">
            <div class="product-detail-image-empty">No image available</div>
        </div>`;
        }

        const dotsHTML = images.length > 1 ? `
                <div class="product-detail-gallery-dots">
                    ${images.map((_, index) => `<button type="button" class="product-detail-gallery-dot${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="Show image ${index + 1} of ${images.length}"></button>`).join('')}
                </div>` : '';

        return `
            <div class="product-detail-images">
                <div class="product-detail-gallery">
                    ${images.map((image, index) => {
                        // A width param keeps the natural aspect ratio; transformedSrc is a cropped square.
                        const sep = image.url.includes('?') ? '&' : '?';
                        return `
                        <img src="${image.url}${sep}width=1200"
                             data-full-image="${image.url}"
                             data-index="${index}"
                             alt="${this.escapeHtml(image.altText || product.title)}"
                             loading="${index === 0 ? 'eager' : 'lazy'}"
                             class="product-detail-gallery-image product-image-clickable">`;
                    }).join('')}
                </div>${dotsHTML}
            </div>
        `;
    }

    /**
     * Render trademark marks as a small superscript. Shopify copy uses either
     * the ™ character (which the site font draws at full cap height) or a
     * literal "TM" glued to the word (e.g. "StitchPerfectTM"); both become
     * <sup>TM</sup>. Only text nodes are touched, so hrefs and attributes are
     * left alone, and the literal form requires a lowercase letter or digit
     * before it so acronyms like "ATM" are skipped. Returns the markup
     * unchanged if there is nothing to superscript.
     */
    superscriptTrademarks(descriptionHtml) {
        const pattern = /\u2122|(?<=[a-z0-9])TM(?![A-Za-z0-9])/g;
        if (!descriptionHtml || !new RegExp(pattern.source).test(descriptionHtml)) {
            return descriptionHtml;
        }

        const parsed = new DOMParser().parseFromString(descriptionHtml, 'text/html');
        const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            const text = node.nodeValue;
            if (!new RegExp(pattern.source).test(text)) return;
            const fragment = parsed.createDocumentFragment();
            let last = 0;
            for (const match of text.matchAll(pattern)) {
                fragment.appendChild(parsed.createTextNode(text.slice(last, match.index)));
                const sup = parsed.createElement('sup');
                sup.textContent = 'TM';
                fragment.appendChild(sup);
                last = match.index + match[0].length;
            }
            fragment.appendChild(parsed.createTextNode(text.slice(last)));
            node.replaceWith(fragment);
        });

        return parsed.body.innerHTML;
    }

    /**
     * Description block for the product modal ('' when the product has none
     * or the list data hasn't been hydrated with it yet).
     */
    renderProductDescription(product) {
        if (product.descriptionHtml) {
            const html = this.superscriptTrademarks(product.descriptionHtml);
            return `<div class="product-detail-description">${html}</div>`;
        }
        if (product.description) {
            return `<div class="product-detail-description"><p>${this.escapeHtml(product.description)}</p></div>`;
        }
        return '';
    }

    /**
     * Attach event listeners to product modal
     */
    attachProductModalListeners(product, variants, selectedVariant) {
        this.attachProductImageListeners(product);

        this.attachProductVariantSelectionListeners(product, variants);

        this.attachProductPurchaseActionListeners(product, selectedVariant);
    }

    /**
     * Lightbox on every gallery image, plus the dots for the mobile strip.
     */
    attachProductImageListeners(product) {
        const images = (product.images?.edges || []).map(edge => edge.node).filter(Boolean);
        const allImageUrls = images.map(image => image.url);
        const allImageCaptions = images.map(image => image.altText || product.title);

        document.querySelectorAll('.product-detail-gallery-image').forEach(img => {
            img.addEventListener('click', () => {
                const index = parseInt(img.getAttribute('data-index'), 10) || 0;
                this.openLightbox(allImageUrls, index, allImageCaptions);
            });
        });

        const gallery = document.querySelector('.product-detail-gallery');
        const dots = Array.from(document.querySelectorAll('.product-detail-gallery-dot'));
        if (!gallery || dots.length < 2) return;

        const setActiveDot = index => dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        gallery.addEventListener('scroll', () => {
            const slideWidth = gallery.clientWidth || 1;
            setActiveDot(Math.round(gallery.scrollLeft / slideWidth));
        }, { passive: true });
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'), 10) || 0;
                gallery.scrollTo({ left: index * gallery.clientWidth, behavior: 'smooth' });
            });
        });
    }

    attachProductVariantSelectionListeners(product, variants) {
        const variantPills = document.querySelectorAll('.product-detail-variant-pill[data-variant-id]');

        if (this.isStickerProduct(product) && variants.length > 1) {
            this.prefetchStickerInventory(product, variants);

            const stepperButtons = document.querySelectorAll('.product-detail-price-row-sticker .sticker-qty-btn');
            stepperButtons.forEach(btn => {
                btn.addEventListener('click', async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (btn.disabled) return;
                    const row = btn.closest('.product-detail-price-row');
                    if (!row || row.classList.contains('unavailable')) return;
                    const qtyEl = row.querySelector('.sticker-qty-value');
                    const decBtn = row.querySelector('.sticker-qty-btn[data-action="decrease"]');
                    if (!qtyEl) return;
                    const action = btn.getAttribute('data-action');
                    const variantId = row.getAttribute('data-variant-id');
                    const variant = variants.find(v => v.node.id === variantId)?.node;
                    let qty = parseInt(qtyEl.textContent, 10) || 0;

                    if (action === 'increase') {
                        const record = await inventoryManager.getVariantInventory(variantId, { forceRefresh: true });
                        const limit = getVariantInventoryLimit(record);
                        if (limit !== null) {
                            const existing = cartManager.getVariantQuantity(variantId);
                            const maxAddable = Math.max(limit - existing, 0);
                            if (qty >= maxAddable) {
                                if (variant) this.applyStickerRowInventory(row, variant, record);
                                this.updateStickerPurchaseSummary(product, variants);
                                return;
                            }
                        }
                        qty += 1;
                    } else {
                        qty = Math.max(0, qty - 1);
                    }

                    qtyEl.textContent = String(qty);
                    row.classList.toggle('selected', qty > 0);
                    if (decBtn) decBtn.disabled = qty <= 0;

                    if (variant) {
                        const cached = await inventoryManager.getVariantInventory(variantId);
                        this.applyStickerRowInventory(row, variant, cached);
                    }
                    this.updateStickerPurchaseSummary(product, variants);
                });
            });

            document.querySelectorAll('.product-detail-price-row-sticker').forEach(row => {
                row.addEventListener('click', (event) => {
                    if (event.target.closest('.sticker-qty-btn')) return;
                    if (row.classList.contains('unavailable')) return;
                    const qtyEl = row.querySelector('.sticker-qty-value');
                    if (!qtyEl) return;
                    const qty = parseInt(qtyEl.textContent, 10) || 0;
                    if (qty > 0) return;
                    const incBtn = row.querySelector('.sticker-qty-btn[data-action="increase"]');
                    if (incBtn && !incBtn.disabled) {
                        incBtn.click();
                    }
                });
            });
            return;
        }

        variantPills.forEach(pill => {
            pill.addEventListener('click', () => {
                if (pill.classList.contains('selected')) return;
                const variantId = pill.getAttribute('data-variant-id');
                const selectedVariant = variants.find(v => v.node.id === variantId)?.node;
                const detailPrice = document.getElementById('productDetailPrice');
                const variantPicker = document.getElementById('productVariantPicker');
                const purchaseActions = document.getElementById('productPurchaseActions');

                if (detailPrice) {
                    detailPrice.innerHTML = this.renderProductPriceDisplay(product, selectedVariant);
                }

                if (variantPicker) {
                    variantPicker.innerHTML = this.renderProductVariantPicker(product, variants, selectedVariant);
                }

                if (purchaseActions) {
                    purchaseActions.innerHTML = this.renderProductPurchaseActions(product, selectedVariant, true);
                    this.attachProductPurchaseActionListeners(product, selectedVariant);
                }

                this.attachProductVariantSelectionListeners(product, variants);
                this.updateStickyBar(product, selectedVariant);
                this.scheduleProductModalScrollbarUpdate();
            });
        });
    }

    renderStickerPurchaseActions(product, selections) {
        const totalCount = selections.reduce((sum, s) => sum + (s.qty || 0), 0);

        if (totalCount === 0) {
            return `
                <button class="product-detail-add-to-cart product-detail-select-prompt" type="button" disabled>
                    <div class="add-to-cart-content">
                        <span class="add-to-cart-text">Choose Stickers to Continue</span>
                    </div>
                </button>
            `;
        }

        const totalAmount = selections.reduce((sum, s) => {
            return sum + parseFloat(s.variant.priceV2?.amount || 0) * s.qty;
        }, 0);
        const currencyCode = selections[0]?.variant?.priceV2?.currencyCode || 'USD';
        const totalFormatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        }).format(totalAmount);

        const stickerLabel = totalCount === 1 ? '1 Sticker' : `${totalCount} Stickers`;
        const buttonLabel = `Add ${stickerLabel} (${totalFormatted})`;

        return `
            <div class="product-detail-purchase-group">
                <div class="product-detail-purchase-row">
                    <button class="product-detail-add-to-cart product-detail-add-stickers"
                            data-product-id="${product.id}"
                            data-default-label="${buttonLabel}">
                        <div class="add-to-cart-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span class="add-to-cart-text">${buttonLabel}</span>
                        </div>
                    </button>
                </div>
            </div>
        `;
    }

    async prefetchStickerInventory(product, variants) {
        try {
            const ids = variants.map(v => v.node.id);
            const inventoryMap = await inventoryManager.getVariantInventoryMap(ids);
            variants.forEach(({ node: variant }) => {
                const row = document.querySelector(
                    `.product-detail-price-row-sticker[data-variant-id="${variant.id}"]`
                );
                if (!row) return;
                this.applyStickerRowInventory(row, variant, inventoryMap[variant.id]);
            });
        } catch (err) {
            console.warn('Sticker inventory prefetch failed:', err);
        }
    }

    applyStickerRowInventory(row, variant, inventoryRecord) {
        if (!row) return;
        const qtyEl = row.querySelector('.sticker-qty-value');
        const incBtn = row.querySelector('.sticker-qty-btn[data-action="increase"]');
        const decBtn = row.querySelector('.sticker-qty-btn[data-action="decrease"]');
        const note = row.querySelector('.sticker-row-stock-note');
        const limit = getVariantInventoryLimit(inventoryRecord);
        const existing = cartManager.getVariantQuantity(variant.id);
        let modalQty = qtyEl ? parseInt(qtyEl.textContent, 10) || 0 : 0;

        if (limit === 0 || inventoryRecord?.availableForSale === false) {
            row.classList.add('unavailable');
            row.classList.remove('selected');
            if (qtyEl) qtyEl.textContent = '0';
            if (incBtn) incBtn.disabled = true;
            if (decBtn) decBtn.disabled = true;
            if (note) note.textContent = existing > 0 ? 'Max reached in cart' : 'Sold out';
            return;
        }

        row.classList.remove('unavailable');

        if (limit === null) {
            if (incBtn) incBtn.disabled = false;
            if (decBtn) decBtn.disabled = modalQty <= 0;
            if (note) note.textContent = inventoryRecord?.error ? 'Live stock unavailable' : '';
            return;
        }

        const maxAddable = Math.max(limit - existing, 0);
        if (modalQty > maxAddable) {
            modalQty = maxAddable;
            if (qtyEl) qtyEl.textContent = String(modalQty);
            row.classList.toggle('selected', modalQty > 0);
        }
        if (incBtn) incBtn.disabled = modalQty >= maxAddable;
        if (decBtn) decBtn.disabled = modalQty <= 0;

        if (note) {
            const remainingAfterModal = maxAddable - modalQty;
            if (existing > 0 && remainingAfterModal <= 0) {
                note.textContent = `${existing} in cart — max reached`;
            } else if (existing > 0) {
                note.textContent = `${existing} in cart, ${remainingAfterModal} more available`;
            } else if (remainingAfterModal <= 0) {
                note.textContent = 'Max reached';
            } else if (remainingAfterModal <= 5) {
                note.textContent = remainingAfterModal === 1
                    ? 'Only 1 left'
                    : `Only ${remainingAfterModal} left`;
            } else {
                note.textContent = '';
            }
        }
    }

    getSelectedStickerVariants(variants) {
        const rows = Array.from(
            document.querySelectorAll('.product-detail-price-row-sticker[data-variant-id]')
        );

        const selections = [];
        rows.forEach(row => {
            const variantId = row.getAttribute('data-variant-id');
            const qtyEl = row.querySelector('.sticker-qty-value');
            const qty = qtyEl ? parseInt(qtyEl.textContent, 10) || 0 : 0;
            if (qty <= 0) return;
            const variant = variants.find(v => v.node.id === variantId)?.node;
            if (variant) selections.push({ variant, qty });
        });
        return selections;
    }

    updateStickerPurchaseSummary(product, variants) {
        const selectedVariants = this.getSelectedStickerVariants(variants);
        const purchaseActions = document.getElementById('productPurchaseActions');
        if (purchaseActions) {
            purchaseActions.innerHTML = this.renderStickerPurchaseActions(product, selectedVariants);
            this.attachStickerAddToCartListener(product, variants);
        }
        this.scheduleProductModalScrollbarUpdate();
    }

    attachStickerAddToCartListener(product, variants) {
        const addBtn = document.querySelector('.product-detail-add-stickers');
        if (!addBtn) return;

        addBtn.addEventListener('click', async () => {
            const selections = this.getSelectedStickerVariants(variants);
            if (selections.length === 0) return;

            const ids = selections.map(s => s.variant.id);
            const inventoryMap = await inventoryManager.getVariantInventoryMap(ids, { forceRefresh: true });
            const adjusted = [];
            selections.forEach(({ variant, qty }) => {
                const record = inventoryMap[variant.id];
                const limit = getVariantInventoryLimit(record);
                const existing = cartManager.getVariantQuantity(variant.id);
                let finalQty = qty;
                if (limit !== null) {
                    const maxAddable = Math.max(limit - existing, 0);
                    finalQty = Math.min(qty, maxAddable);
                }
                if (finalQty > 0) {
                    adjusted.push({ variant, qty: finalQty });
                }

                const row = document.querySelector(
                    `.product-detail-price-row-sticker[data-variant-id="${variant.id}"]`
                );
                if (row) {
                    const qtyEl = row.querySelector('.sticker-qty-value');
                    if (qtyEl) qtyEl.textContent = String(finalQty);
                    row.classList.toggle('selected', finalQty > 0);
                    this.applyStickerRowInventory(row, variant, record);
                }
            });

            if (adjusted.length === 0) {
                this.updateStickerPurchaseSummary(product, variants);
                return;
            }

            adjusted.forEach(({ variant, qty }) => {
                cartManager.addItem(product, variant.id, qty);
            });

            const totalCount = adjusted.reduce((sum, s) => sum + s.qty, 0);
            const label = totalCount === 1 ? '1 Sticker Added!' : `${totalCount} Stickers Added!`;

            addBtn.innerHTML = `
                <div class="add-to-cart-content">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="add-to-cart-text">${label}</span>
                </div>
            `;

            setTimeout(() => {
                document.querySelectorAll('.product-detail-price-row-sticker').forEach(row => {
                    row.classList.remove('selected');
                    const qtyEl = row.querySelector('.sticker-qty-value');
                    if (qtyEl) qtyEl.textContent = '0';
                    const decBtn = row.querySelector('.sticker-qty-btn[data-action="decrease"]');
                    if (decBtn && !row.classList.contains('unavailable')) decBtn.disabled = true;
                });
                this.updateStickerPurchaseSummary(product, variants);
                this.prefetchStickerInventory(product, variants);
            }, 1000);
        });
    }

    /**
     * The headline price: the selected variant's, or the range when nothing
     * is selected (multi-variant sticker sheets). As on the Shopify page it
     * sits under the title and follows the option pills.
     */
    renderProductPriceDisplay(product, selectedVariant) {
        const price = selectedVariant
            ? this.formatVariantPrice(selectedVariant)
            : this.formatPriceRange(product);
        if (!price) {
            return '';
        }

        const isUnavailable = selectedVariant?.availableForSale === false;
        return `
            <div class="product-detail-price-group">
                <div class="product-detail-price ${isUnavailable ? 'product-detail-price-unavailable' : ''}">${price}</div>
                ${this.renderStockStatus(selectedVariant)}
            </div>
        `;
    }

    /**
     * Option pills ("Mesh Size": 13 Mesh / 18 Mesh), after the Shopify
     * theme's button-style variant picker. Sticker sheets keep their
     * per-variant quantity list. Empty for single-variant products.
     */
    renderProductVariantPicker(product, variants, selectedVariant) {
        const nodes = variants.map(edge => edge.node).filter(Boolean);
        if (nodes.length < 2) {
            return '';
        }

        if (this.isStickerProduct(product)) {
            return this.renderStickerVariantList(product, nodes);
        }

        const optionName = nodes[0].selectedOptions?.[0]?.name || 'Option';
        return `
            <fieldset class="product-detail-variant-picker">
                <legend class="product-detail-variant-label">${this.escapeHtml(optionName)}</legend>
                <div class="product-detail-variant-options">
                    ${nodes.map(variant => {
                        const optionValue = variant.selectedOptions?.[0]?.value || variant.title;
                        const isSelected = selectedVariant?.id === variant.id;
                        const pillClasses = [
                            'product-detail-variant-pill',
                            isSelected ? 'selected' : '',
                            !variant.availableForSale ? 'unavailable' : ''
                        ].filter(Boolean).join(' ');

                        return `
                            <button class="${pillClasses}" type="button" data-variant-id="${variant.id}" aria-pressed="${isSelected ? 'true' : 'false'}">
                                ${this.escapeHtml(optionValue)}
                            </button>
                        `;
                    }).join('')}
                </div>
            </fieldset>
        `;
    }

    renderStickerVariantList(product, variants) {
        return `
            <div class="product-detail-price-group">
                <div class="product-detail-price-list">
                    ${variants.map(variant => {
                        const optionValue = variant.selectedOptions?.[0]?.value || variant.title;
                        const price = this.formatVariantPrice(variant);
                        const isUnavailable = !variant.availableForSale;
                        const rowClasses = [
                            'product-detail-price-row',
                            'product-detail-price-row-sticker',
                            isUnavailable ? 'unavailable' : ''
                        ].filter(Boolean).join(' ');

                        return `
                            <div class="${rowClasses}" data-variant-id="${variant.id}">
                                <span class="product-detail-price-option">${this.escapeHtml(optionValue)}</span>
                                <span class="product-detail-price-value">${price}</span>
                                <div class="sticker-qty-stepper" role="group" aria-label="Quantity for ${this.escapeHtml(optionValue)}">
                                    <button type="button" class="sticker-qty-btn" data-action="decrease" disabled aria-label="Decrease quantity">&minus;</button>
                                    <span class="sticker-qty-value" data-variant-id="${variant.id}" aria-live="polite">0</span>
                                    <button type="button" class="sticker-qty-btn" data-action="increase" ${isUnavailable ? 'disabled' : ''} aria-label="Increase quantity">+</button>
                                </div>
                                <span class="sticker-row-stock-note" aria-live="polite"></span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderProductPurchaseActions(product, selectedVariant, hasMultipleVariants = false) {
        if (hasMultipleVariants && this.isStickerProduct(product)) {
            return this.renderStickerPurchaseActions(product, []);
        }

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
            const isPreorder = this.isVariantPreorder(selectedVariant);
            const buttonLabel = isPreorder ? 'Preorder' : 'Add to cart';
            const preorderNote = isPreorder ? `
                        <div class="product-detail-preorder-note">
                            <p>Additional inventory has been ordered and is expected to arrive in 1–2 months. Beyond that, preorders could take up to 4–6 months to arrive.</p>
                            <p><strong>Shipping:</strong> ASAP once inventory arrives. Orders will be fulfilled in the sequence received.</p>
                        </div>
                    ` : '';

            return `
                <div class="product-detail-purchase-group">
                    <div class="product-detail-purchase-row">
                        <div class="product-detail-quantity-control" aria-label="Select quantity">
                            <button type="button" class="product-detail-quantity-btn" data-action="decrease" aria-label="Decrease quantity">-</button>
                            <span class="product-detail-quantity-value" aria-live="polite">1</span>
                            <button type="button" class="product-detail-quantity-btn" data-action="increase" aria-label="Increase quantity">+</button>
                        </div>
                        <button class="product-detail-add-to-cart${isPreorder ? ' product-detail-add-to-cart-preorder' : ''}"
                                data-product-id="${product.id}"
                                data-variant-id="${selectedVariant.id}"
                                data-default-label="${buttonLabel}">
                            <div class="add-to-cart-content">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                <span class="add-to-cart-text">${buttonLabel}</span>
                            </div>
                        </button>
                    </div>
                    <button class="product-detail-buy-now" type="button" data-variant-id="${selectedVariant.id}">Buy it now</button>
                    <p class="product-detail-stock-note" aria-live="polite"></p>
${preorderNote}                </div>
                ${isPreorder ? this.renderNotifyGroup(selectedVariant, { preorder: true }) : ''}
            `;
        }

        return this.renderNotifyGroup(selectedVariant);
    }

    /**
     * The waitlist form. Shown on its own for sold-out variants, and alongside
     * the Preorder button for backordered ones so shoppers who would rather
     * wait for a restock than commit to a long lead time have an option.
     */
    renderNotifyGroup(selectedVariant, { preorder = false } = {}) {
        const heading = preorder ? 'Rather wait for a restock?' : 'Join the waitlist';
        const note = preorder
            ? "Skip the preorder and we'll email you if this option comes back in stock instead."
            : "We'll email you the moment this option is back in stock.";

        return `
            <div class="product-detail-notify-group${preorder ? ' product-detail-notify-group-preorder' : ''}">
                <p class="product-detail-notify-heading">${heading}</p>
                <p class="product-detail-notify-note">${note}</p>
                <form class="product-detail-notify-form" data-variant-id="${selectedVariant?.id || ''}" novalidate>
                    <input class="product-detail-notify-input"
                           type="email"
                           name="email"
                           aria-label="Email address"
                           autocomplete="email"
                           inputmode="email"
                           placeholder="you@example.com"
                           required>
                    <label class="product-detail-notify-optin">
                        <input type="checkbox" name="accepts_marketing">
                        <span>Also send me Haus of Toots updates</span>
                    </label>
                    <button class="product-detail-notify-btn" type="submit">
                        Notify Me
                    </button>
                </form>
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

        const buyNowBtn = document.querySelector('.product-detail-buy-now');
        if (buyNowBtn) {
            buyNowBtn.disabled = !state.canAdd;
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
        if (this.isStickerProduct(product) && (product.variants?.edges?.length || 0) > 1) {
            this.attachStickerAddToCartListener(product, product.variants?.edges || []);
            return;
        }

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
                        const defaultLabel = addToCartBtn.getAttribute('data-default-label') || 'Add to cart';
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

        // Buy it now: straight to checkout with just this item, as on the
        // Shopify page. The saved cart is left alone.
        const buyNowBtn = document.querySelector('.product-detail-buy-now');
        if (buyNowBtn && variantId) {
            buyNowBtn.addEventListener('click', async () => {
                const selectedQuantity = parseInt(quantityValue?.textContent || '1', 10) || 1;
                const inventoryResult = await syncModalInventory({
                    forceRefresh: true,
                    requestedQuantity: selectedQuantity
                });
                if (!inventoryResult?.state?.canAdd) {
                    return;
                }

                const defaultLabel = buyNowBtn.textContent;
                buyNowBtn.disabled = true;
                buyNowBtn.textContent = 'Heading to checkout\u2026';

                try {
                    const checkout = await shopifyClient.createCheckout([
                        { variantId, quantity: inventoryResult.state.selectedQuantity }
                    ]);
                    window.location.href = checkout.webUrl;
                } catch (error) {
                    console.error('Buy now error:', error);
                    alert('Sorry, there was an error starting checkout. Please try again.');
                    buyNowBtn.disabled = false;
                    buyNowBtn.textContent = defaultLabel;
                }
            });
        }

        // Keep the sticky pill's button in step with the real one ("Added!",
        // sold-out disabling) without duplicating any of that logic.
        if (addToCartBtn && this.productStickyBar) {
            const mirror = () => {
                const barBtn = this.productStickyBar.querySelector('.product-sticky-bar-button');
                if (!barBtn) return;
                const text = addToCartBtn.querySelector('.add-to-cart-text')?.textContent;
                const barText = barBtn.querySelector('.add-to-cart-text');
                if (barText && text) barText.textContent = text;
                barBtn.disabled = addToCartBtn.disabled;
            };
            this.stickyBarMirror?.disconnect();
            this.stickyBarMirror = new MutationObserver(mirror);
            this.stickyBarMirror.observe(addToCartBtn, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });
        }

        const notifyForm = document.querySelector('.product-detail-notify-form');
        const notifyFeedback = document.querySelector('.product-detail-notify-feedback');

        if (notifyForm && notifyFeedback && selectedVariant?.id) {
            notifyForm.addEventListener('submit', async (event) => {
                event.preventDefault();

                const submitBtn = notifyForm.querySelector('.product-detail-notify-btn');
                const emailInput = notifyForm.querySelector('.product-detail-notify-input');
                const optInInput = notifyForm.querySelector('input[name="accepts_marketing"]');
                const email = (emailInput?.value || '').trim();

                notifyFeedback.textContent = '';
                notifyFeedback.classList.remove('is-error', 'is-success');

                if (!email || !emailInput.checkValidity()) {
                    notifyFeedback.textContent = 'Please enter a valid email address.';
                    notifyFeedback.classList.add('is-error');
                    emailInput?.focus();
                    return;
                }

                const originalLabel = submitBtn?.textContent;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Adding you…';
                }

                try {
                    await this.submitRestockIntent({
                        email,
                        acceptsMarketing: !!optInInput?.checked,
                        product,
                        variant: selectedVariant
                    });
                    notifyFeedback.textContent = "You're on the list! We'll email you when this option is back.";
                    notifyFeedback.classList.add('is-success');
                    notifyForm.reset();
                } catch (error) {
                    console.error('Restock Rocket signup failed:', error);
                    let fallbackUrl = null;
                    try {
                        fallbackUrl = this.buildShopifyNotifyUrl(product, selectedVariant);
                    } catch (_) {}
                    notifyFeedback.innerHTML = fallbackUrl
                        ? `Sorry, we couldn't sign you up. <a href="${fallbackUrl}" target="_blank" rel="noopener noreferrer">Try signing up on Shopify →</a>`
                        : 'Sorry, waitlist signup is temporarily unavailable. Please try again later.';
                    notifyFeedback.classList.add('is-error');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalLabel || 'Notify Me';
                    }
                    this.scheduleProductModalScrollbarUpdate();
                }
            });
        }
    }

    async submitRestockIntent({ email, acceptsMarketing, product, variant }) {
        const shopifyVariantId = this.extractShopifyNumericId(variant?.id);
        const shopifyProductId = this.extractShopifyNumericId(product?.id);

        if (!shopifyVariantId || !shopifyProductId) {
            throw new Error('Unable to identify this product option.');
        }

        const SHOPIFY_MARKET_ID = 92481683490;
        const variantCount = product?.variants?.edges?.length || 1;
        const variantTitle = variant?.selectedOptions?.[0]?.value || variant?.title || '';

        const payload = {
            intent: {
                shopify_variant_id: shopifyVariantId,
                shopify_product_id: shopifyProductId,
                shopify_market_id: SHOPIFY_MARKET_ID,
                country: 'US',
                quantity: 1,
                source: 'haus-of-toots-site'
            },
            customer: {
                accepts_marketing: !!acceptsMarketing,
                locale: 'en',
                shopify_market_id: SHOPIFY_MARKET_ID,
                email
            },
            product: {
                title: product?.title || '',
                variant_title: variantTitle,
                variant_count: variantCount,
                vendor: product?.vendor || 'Haus of Toots',
                sku: variant?.sku || ''
            }
        };

        const response = await fetch('/api/restock-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Waitlist proxy responded ${response.status}`);
        }

        const data = await response.json().catch(() => ({}));
        if (data?.errors && Object.keys(data.errors).length > 0) {
            throw new Error('Restock Rocket reported a validation error.');
        }
        return data;
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

// Initialize the shop when DOM is ready (collection and tag-driven pages only)
if (document.body.dataset.shopCollection || document.body.dataset.shopTag) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new ShopApp());
    } else {
        new ShopApp();
    }
}
