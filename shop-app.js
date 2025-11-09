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

        productsGrid.innerHTML = this.products.map(product => this.createProductCard(product)).join('');
        
        // Add event listeners to all "Add to Cart" buttons
        const addToCartButtons = productsGrid.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click
                this.handleAddToCart(e);
            });
        });

        // Add click listeners to product cards (but not the add to cart button)
        const productCards = productsGrid.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't open modal if clicking the add to cart button
                if (e.target.closest('.add-to-cart-btn')) {
                    return;
                }
                const productId = card.getAttribute('data-product-id');
                this.openProductModal(productId);
            });
        });
    }

    /**
     * Create HTML for a product card
     */
    createProductCard(product) {
        const image = product.images?.edges?.[0]?.node;
        const variant = product.variants?.edges?.[0]?.node;
        const price = variant?.priceV2 || product.priceRange?.minVariantPrice;
        const available = variant?.availableForSale ?? true;

        const imageHTML = image 
            ? `<img src="${image.url}" alt="${image.altText || product.title}" class="product-image">`
            : `<div class="product-no-image">No image available</div>`;

        const priceFormatted = price 
            ? `${this.formatPrice(price.amount, price.currencyCode)}`
            : 'Price not available';

        const description = this.stripHtml(product.description || product.descriptionHtml || '');

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-container">
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                    ${description ? `<p class="product-description">${this.escapeHtml(description)}</p>` : ''}
                    <div class="product-footer">
                        <span class="product-price">${priceFormatted}</span>
                        <button 
                            class="add-to-cart-btn" 
                            data-product='${this.escapeHtml(JSON.stringify(product))}'
                            data-variant-id="${variant?.id || ''}"
                            ${!available || !variant?.id ? 'disabled' : ''}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            ${available ? 'Add to Cart' : 'Unavailable'}
                        </button>
                    </div>
                </div>
            </div>
        `;
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
        const selectedVariant = variants.find(v => v.node.availableForSale)?.node || variants[0]?.node;
        
        // Group variants by options
        const variantGroups = {};
        variants.forEach(variantEdge => {
            const variant = variantEdge.node;
            variant.selectedOptions?.forEach(option => {
                if (!variantGroups[option.name]) {
                    variantGroups[option.name] = [];
                }
                const value = option.value;
                if (!variantGroups[option.name].find(v => v.value === value)) {
                    variantGroups[option.name].push({
                        value: value,
                        available: variant.availableForSale
                    });
                }
            });
        });

        const addToCartButtonHTML = `
            <div class="product-detail-actions">
                <button class="product-detail-add-to-cart" 
                        data-product-id="${product.id}"
                        data-variant-id="${selectedVariant?.id || ''}"
                        ${!selectedVariant?.availableForSale || !selectedVariant?.id ? 'disabled' : ''}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    ${selectedVariant?.availableForSale ? 'Add to Cart' : 'Unavailable'}
                </button>
            </div>
        `;

        const imagesHTML = images.length > 0 ? `
            <div class="product-detail-images">
                <img id="productMainImage" src="${mainImage.url}" alt="${mainImage.altText || product.title}" class="product-detail-main-image">
                ${images.length > 1 ? `
                    <div class="product-detail-thumbnails">
                        ${images.map((imgEdge, index) => `
                            <img src="${imgEdge.node.url}" 
                                 alt="${imgEdge.node.altText || product.title}" 
                                 class="product-detail-thumbnail ${index === 0 ? 'active' : ''}"
                                 data-image-url="${imgEdge.node.url}"
                                 data-image-alt="${imgEdge.node.altText || product.title}">
                        `).join('')}
                    </div>
                ` : ''}
                ${addToCartButtonHTML}
            </div>
        ` : `<div class="product-detail-images"><div class="product-detail-main-image" style="background: var(--linen); display: flex; align-items: center; justify-content: center; color: var(--neutral-mid);">No image available</div>${addToCartButtonHTML}</div>`;

        const variantsHTML = Object.keys(variantGroups).length > 0 ? `
            <div class="product-detail-variants">
                ${Object.keys(variantGroups).map(optionName => `
                    <div class="product-detail-variant-group">
                        <div class="product-detail-variant-label">${this.escapeHtml(optionName)}</div>
                        <div class="product-detail-variant-options" data-option-name="${this.escapeHtml(optionName)}">
                            ${variantGroups[optionName].map(option => `
                                <button class="product-detail-variant-option ${!option.available ? 'unavailable' : ''}" 
                                        data-option-value="${this.escapeHtml(option.value)}"
                                        ${!option.available ? 'disabled' : ''}>
                                    ${this.escapeHtml(option.value)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        const priceHTML = selectedVariant?.priceV2 
            ? `<div class="product-detail-price">${this.formatPrice(selectedVariant.priceV2.amount, selectedVariant.priceV2.currencyCode)}</div>`
            : product.priceRange?.minVariantPrice 
                ? `<div class="product-detail-price">${this.formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)}</div>`
                : '';

        const descriptionHTML = product.descriptionHtml 
            ? `<div class="product-detail-description">${product.descriptionHtml}</div>`
            : product.description 
                ? `<div class="product-detail-description"><p>${this.escapeHtml(product.description)}</p></div>`
                : '';

        const metaHTML = '';

        modalBody.innerHTML = `
            <div class="product-detail-content">
                ${imagesHTML}
                <div class="product-detail-info">
                    <h1 class="product-detail-title">${this.escapeHtml(product.title)}</h1>
                    ${priceHTML}
                    ${descriptionHTML}
                </div>
            </div>
        `;

        // Add event listeners
        this.attachProductModalListeners(product, variants);
    }

    /**
     * Attach event listeners to product modal
     */
    attachProductModalListeners(product, variants) {
        // Image thumbnail clicks
        const thumbnails = document.querySelectorAll('.product-detail-thumbnail');
        const mainImage = document.getElementById('productMainImage');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImage) {
                    mainImage.src = thumb.getAttribute('data-image-url');
                    mainImage.alt = thumb.getAttribute('data-image-alt');
                }
            });
        });

        // Variant selection (simplified - would need more logic for multiple options)
        const variantOptions = document.querySelectorAll('.product-detail-variant-option:not(.unavailable)');
        variantOptions.forEach(option => {
            option.addEventListener('click', () => {
                const optionGroup = option.closest('.product-detail-variant-options');
                optionGroup.querySelectorAll('.product-detail-variant-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                
                // Find matching variant (simplified - would need proper matching logic)
                const optionName = optionGroup.getAttribute('data-option-name');
                const optionValue = option.getAttribute('data-option-value');
                
                // For now, just update the add to cart button with first available variant
                // In a real implementation, you'd match all selected options to find the right variant
                const addToCartBtn = document.querySelector('.product-detail-add-to-cart');
                const availableVariant = variants.find(v => v.node.availableForSale)?.node;
                if (availableVariant && addToCartBtn) {
                    addToCartBtn.setAttribute('data-variant-id', availableVariant.id);
                    addToCartBtn.disabled = false;
                    addToCartBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        Add to Cart
                    `;
                }
            });
        });

        // Add to cart from modal
        const addToCartBtn = document.querySelector('.product-detail-add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                const variantId = addToCartBtn.getAttribute('data-variant-id');
                if (variantId) {
                    cartManager.addItem(product, variantId, 1);
                    addToCartBtn.textContent = 'Added!';
                    setTimeout(() => {
                        addToCartBtn.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                            Add to Cart
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

