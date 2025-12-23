// ===================================
// SHOP APP - Main Application Logic
// ===================================

class ShopApp {
    constructor() {
        this.products = [];
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

    /**
     * Load products from Shopify
     */
    async loadProducts() {
        const loadingState = document.getElementById('loadingState');
        const errorState = document.getElementById('errorState');
        const productsGrid = document.getElementById('productsGrid');

        try {
            this.products = await shopifyClient.getProducts(24);
            
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
            productsGrid.innerHTML = '<p style="text-align: center; color: var(--neutral-mid);">No products available at this time.</p>';
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
        
        // Add event listeners to variant selectors
        const variantSelectors = productsGrid.querySelectorAll('.product-variant-selector');
        variantSelectors.forEach(select => {
            select.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent card click
                this.handleVariantChange(e);
            });
        });

        // Add event listeners to all "Add to Cart" buttons
        const addToCartButtons = productsGrid.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                this.handleAddToCart(e);
            });
        });

        // Add click listeners to product images for lightbox
        const productImages = productsGrid.querySelectorAll('.product-image-clickable');
        productImages.forEach(img => {
            img.addEventListener('click', (e) => {
                // On mobile, let the click propagate to open the product modal
                if (this.isMobileDevice()) {
                    return; // Don't stop propagation, let card click handler open modal
                }
                // On desktop, stop propagation and open lightbox
                e.stopPropagation(); // Prevent card click
                const fullImageUrl = img.getAttribute('data-full-image') || img.src;
                const altText = img.getAttribute('alt') || '';
                this.openLightbox([fullImageUrl], 0, [altText]);
            });
        });

        // Add click listeners to product cards (but not the add to cart button, variant selector, or image on desktop)
        const productCards = productsGrid.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking the add to cart button or variant selector
                if (e.target.closest('.add-to-cart-btn') || 
                    e.target.closest('.product-variant-selector')) {
                    return;
                }
                // On desktop, don't open modal if clicking image (image opens lightbox instead)
                // On mobile, allow image clicks to open modal
                if (!this.isMobileDevice() && e.target.closest('.product-image-clickable')) {
                    return;
                }
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
        const availableVariants = variants.filter(v => v.node.availableForSale);
        const firstVariant = availableVariants[0]?.node || variants[0]?.node;
        const hasMultipleVariants = variants.length > 1;
        const isHandPainted = this.isHandPainted(product);

        // Use transformedSrc for thumbnail if available, otherwise use url with size parameters
        const thumbnailUrl = image?.transformedSrc || (image?.url ? `${image.url}?width=400&height=400&crop=center` : null);
        const fullImageUrl = image?.url || null;
        
        const imageHTML = thumbnailUrl 
            ? `<img src="${thumbnailUrl}" 
                    data-full-image="${fullImageUrl}" 
                    alt="${image.altText || product.title}" 
                    class="product-image product-image-clickable">`
            : `<div class="product-no-image">No image available</div>`;

        // Get variant options (like Size, Canvas Count, etc.)
        const variantOptions = this.getVariantOptionsForProduct(variants);
        
        // Current price (will update with variant selection)
        const currentPrice = firstVariant?.priceV2 || product.priceRange?.minVariantPrice;
        const priceFormatted = currentPrice 
            ? `${this.formatPrice(currentPrice.amount, currentPrice.currencyCode)}`
            : 'Price not available';

        // Variant selector HTML
        const variantSelectorHTML = hasMultipleVariants && variantOptions.length > 0
            ? `<div class="product-variant-selector-wrapper">
                <label class="product-variant-label">
                    ${this.escapeHtml(variantOptions[0].name)}:
                </label>
                <select class="product-variant-selector" data-product-id="${product.id}">
                    ${variants.map((variantEdge, index) => {
                        const variant = variantEdge.node;
                        const optionValue = variant.selectedOptions?.[0]?.value || variant.title;
                        return `<option value="${variant.id}" ${index === 0 ? 'selected' : ''} ${!variant.availableForSale ? 'disabled' : ''}>
                            ${this.escapeHtml(optionValue)}${!variant.availableForSale ? ' (Unavailable)' : ''}
                        </option>`;
                    }).join('')}
                </select>
            </div>`
            : '';

        const description = this.stripHtml(product.description || product.descriptionHtml || '');

        const cardClasses = 'product-card';

        return `
            <div class="${cardClasses}" data-product-id="${product.id}">
                <div class="product-image-container">
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                    ${description ? `<p class="product-description">${this.escapeHtml(description)}</p>` : ''}
                    <div class="product-price-section">
                        <span class="product-price" data-product-id="${product.id}">${priceFormatted}</span>
                    </div>
                    ${variantSelectorHTML}
                    <div class="product-footer">
                        <button 
                            class="add-to-cart-btn" 
                            data-product='${this.escapeHtml(JSON.stringify(product))}'
                            data-variant-id="${firstVariant?.id || ''}"
                            ${!firstVariant?.availableForSale || !firstVariant?.id ? 'disabled' : ''}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            ${firstVariant?.availableForSale ? 'Add to Cart' : 'Unavailable'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get variant options for a product
     */
    getVariantOptionsForProduct(variants) {
        if (variants.length === 0) return [];
        
        const optionNames = [];
        const firstVariant = variants[0]?.node;
        
        if (firstVariant?.selectedOptions) {
            firstVariant.selectedOptions.forEach(option => {
                if (!optionNames.includes(option.name) && option.name !== 'Title') {
                    optionNames.push(option.name);
                }
            });
        }
        
        return optionNames.map(name => ({ name }));
    }

    /**
     * Handle variant selection change on product card
     */
    handleVariantChange(event) {
        const select = event.target;
        const selectedVariantId = select.value;
        const productId = select.getAttribute('data-product-id');
        
        // Find the product
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // Find the selected variant
        const selectedVariant = product.variants.edges.find(v => v.node.id === selectedVariantId)?.node;
        if (!selectedVariant) return;
        
        // Update the add to cart button with new variant ID
        const card = select.closest('.product-card');
        const addToCartBtn = card.querySelector('.add-to-cart-btn');
        const priceDisplay = card.querySelector('.product-price');
        
        if (addToCartBtn) {
            addToCartBtn.setAttribute('data-variant-id', selectedVariantId);
            addToCartBtn.disabled = !selectedVariant.availableForSale;
            addToCartBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                ${selectedVariant.availableForSale ? 'Add to Cart' : 'Unavailable'}
            `;
        }
        
        // Update price display
        if (priceDisplay && selectedVariant.priceV2) {
            priceDisplay.textContent = this.formatPrice(selectedVariant.priceV2.amount, selectedVariant.priceV2.currencyCode);
        }
    }

    /**
     * Handle add to cart button click
     */
    handleAddToCart(event) {
        const button = event.currentTarget;
        const productData = JSON.parse(button.getAttribute('data-product'));
        const variantId = button.getAttribute('data-variant-id');

        if (!variantId) {
            console.error('No variant ID found');
            return;
        }

        // Add to cart
        cartManager.addItem(productData, variantId, 1);

        // Visual feedback
        button.textContent = 'Added!';
        setTimeout(() => {
            button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Add to Cart
            `;
        }, 1000);
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

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        checkoutBtn.addEventListener('click', () => this.handleCheckout());

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

        closeModalBtn.addEventListener('click', () => this.closeProductModal());
        overlay.addEventListener('click', () => this.closeProductModal());

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && productModal.classList.contains('open')) {
                this.closeProductModal();
            }
        });
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
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close cart drawer
     */
    closeCart() {
        const cartDrawer = document.getElementById('cartDrawer');
        cartDrawer.classList.remove('open');
        document.body.style.overflow = '';
    }

    /**
     * Update cart UI
     */
    updateCartUI() {
        const items = cartManager.getItems();
        const totalItems = cartManager.getTotalItems();
        const totalPrice = cartManager.getTotalPrice();
        const currency = cartManager.getCurrency();

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
        } else {
            cartFooter.style.display = 'none';
        }
    }

    /**
     * Create HTML for cart item
     */
    createCartItem(item) {
        const itemTotal = parseFloat(item.price.amount) * item.quantity;
        
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
                const variantId = e.target.getAttribute('data-variant-id');
                const item = cartManager.getItems().find(i => i.variantId === variantId);
                if (item) {
                    cartManager.updateQuantity(variantId, item.quantity - 1);
                }
            });
        });

        document.querySelectorAll('.quantity-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const variantId = e.target.getAttribute('data-variant-id');
                const item = cartManager.getItems().find(i => i.variantId === variantId);
                if (item) {
                    cartManager.updateQuantity(variantId, item.quantity + 1);
                }
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

    /**
     * Handle clear cart
     */
    handleClearCart() {
        if (confirm('Are you sure you want to clear your cart?')) {
            cartManager.clearCart();
        }
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
            
            // Re-enable button
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = `
                <span>Proceed to Checkout</span>
                <svg class="needle-icon" width="20" height="20" viewBox="0 0 24 24">
                    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="2" cy="12" r="2" fill="currentColor"/>
                </svg>
            `;
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
        
        // Show loading state
        modalBody.innerHTML = '<div class="product-detail-loading">Loading product details...</div>';
        productModal.classList.add('open');
        document.body.style.overflow = 'hidden';

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
        
        // Clear content immediately to prevent lingering
        modalBody.innerHTML = '';
        
        // Hide modal immediately
        productModal.style.visibility = 'hidden';
        productModal.style.opacity = '0';
        
        // Remove open class
        productModal.classList.remove('open');
        document.body.style.overflow = '';
        
        // Reset styles after a brief delay to allow for next open animation
        setTimeout(() => {
            productModal.style.visibility = '';
            productModal.style.opacity = '';
        }, 300);
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
        const selectedVariant = availableVariants[0]?.node || variants[0]?.node;
        const hasMultipleVariants = variants.length > 1;
        const isHandPainted = this.isHandPainted(product);
        
        // Badge HTML for modal
        const badgeHTML = isHandPainted 
            ? `<span class="product-detail-badge product-detail-badge-hand-painted">Painted Canvas</span>`
            : `<span class="product-detail-badge product-detail-badge-digital">Digital Pattern</span>`;

        // Extract mesh size from title
        const meshSize = this.extractMeshSize(product.title);
        const sizeHTML = meshSize 
            ? `<div class="product-detail-size">
                <span class="product-detail-type-label">Size:</span>
                <span class="product-detail-size-value">${meshSize} Mesh</span>
            </div>`
            : '';

        // Variant selector HTML (dropdown style for modal)
        const variantSelectorHTML = hasMultipleVariants 
            ? `<div class="product-detail-variant-selector-wrapper">
                <label class="product-detail-variant-label">
                    ${variants[0]?.node.selectedOptions?.[0]?.name || 'Options'}:
                </label>
                <select class="product-detail-variant-selector" data-product-id="${product.id}">
                    ${variants.map((variantEdge, index) => {
                        const variant = variantEdge.node;
                        const optionValue = variant.selectedOptions?.[0]?.value || variant.title;
                        const isFirst = index === 0 && variant.availableForSale;
                        return `<option value="${variant.id}" 
                                    data-price="${variant.priceV2.amount}" 
                                    data-currency="${variant.priceV2.currencyCode}"
                                    ${isFirst ? 'selected' : ''} 
                                    ${!variant.availableForSale ? 'disabled' : ''}>
                            ${this.escapeHtml(optionValue)}${!variant.availableForSale ? ' (Unavailable)' : ''}
                        </option>`;
                    }).join('')}
                </select>
            </div>`
            : '';

        const currentPrice = selectedVariant?.priceV2 || product.priceRange?.minVariantPrice;
        const priceFormatted = currentPrice 
            ? this.formatPrice(currentPrice.amount, currentPrice.currencyCode)
            : '';

        const addToCartButtonHTML = `
            <div class="product-detail-actions">
                ${variantSelectorHTML}
                <button class="product-detail-add-to-cart" 
                        data-product-id="${product.id}"
                        data-variant-id="${selectedVariant?.id || ''}"
                        ${!selectedVariant?.availableForSale || !selectedVariant?.id ? 'disabled' : ''}>
                    <div class="add-to-cart-content">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span class="add-to-cart-text">${selectedVariant?.availableForSale ? 'Add to Cart' : 'Unavailable'}</span>
                        ${priceFormatted ? `<span class="add-to-cart-price">${priceFormatted}</span>` : ''}
                    </div>
                </button>
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
                        ${addToCartButtonHTML}
                    </div>
                </div>
                ${descriptionHTML ? `<div class="product-detail-description-container">${descriptionHTML}</div>` : ''}
            </div>
        `;

        // Add event listeners
        this.attachProductModalListeners(product, variants);
    }

    /**
     * Attach event listeners to product modal
     */
    attachProductModalListeners(product, variants) {
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

        // Variant selector dropdown in modal
        const variantSelector = document.querySelector('.product-detail-variant-selector');
        if (variantSelector) {
            variantSelector.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const variantId = selectedOption.value;
                const price = selectedOption.getAttribute('data-price');
                const currency = selectedOption.getAttribute('data-currency');
                
                // Update add to cart button with new price
                const addToCartBtn = document.querySelector('.product-detail-add-to-cart');
                if (addToCartBtn) {
                    addToCartBtn.setAttribute('data-variant-id', variantId);
                    const selectedVariant = variants.find(v => v.node.id === variantId)?.node;
                    addToCartBtn.disabled = !selectedVariant?.availableForSale;
                    
                    const priceFormatted = price && currency ? this.formatPrice(price, currency) : '';
                    const priceHTML = priceFormatted ? `<span class="add-to-cart-price">${priceFormatted}</span>` : '';
                    
                    addToCartBtn.innerHTML = `
                        <div class="add-to-cart-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span class="add-to-cart-text">${selectedVariant?.availableForSale ? 'Add to Cart' : 'Unavailable'}</span>
                            ${priceHTML}
                        </div>
                    `;
                }
            });
        }

        // Add to cart from modal
        const addToCartBtn = document.querySelector('.product-detail-add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                const variantId = addToCartBtn.getAttribute('data-variant-id');
                if (variantId) {
                    cartManager.addItem(product, variantId, 1);
                    
                    // Get current price to preserve it in the button
                    const selectedOption = document.querySelector('.product-detail-variant-selector')?.options[document.querySelector('.product-detail-variant-selector')?.selectedIndex];
                    const price = selectedOption?.getAttribute('data-price');
                    const currency = selectedOption?.getAttribute('data-currency');
                    const priceFormatted = price && currency ? this.formatPrice(price, currency) : '';
                    const priceHTML = priceFormatted ? `<span class="add-to-cart-price">${priceFormatted}</span>` : '';
                    
                    addToCartBtn.innerHTML = `
                        <div class="add-to-cart-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            <span class="add-to-cart-text">Added!</span>
                            ${priceHTML}
                        </div>
                    `;
                    
                    setTimeout(() => {
                        addToCartBtn.innerHTML = `
                            <div class="add-to-cart-content">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                <span class="add-to-cart-text">Add to Cart</span>
                                ${priceHTML}
                            </div>
                        `;
                    }, 1000);
                }
            });
        }
    }
}

// Initialize the shop when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ShopApp());
} else {
    new ShopApp();
}

