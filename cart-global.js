// ===================================
// GLOBAL CART FUNCTIONALITY
// For non-shop pages (index, about, gallery)
// ===================================

// Only initialize if cartManager exists (from shopify.js)
if (typeof cartManager !== 'undefined') {
    // Initialize cart UI on page load
    document.addEventListener('DOMContentLoaded', () => {
        setupCartListeners();
        updateCartUI();
        
        // Subscribe to cart changes
        cartManager.subscribe(() => updateCartUI());
    });

    /**
     * Setup cart-related event listeners
     */
    function setupCartListeners() {
        // Cart button
        const cartButton = document.getElementById('cartButton');
        if (cartButton) {
            cartButton.addEventListener('click', () => openCart());
        }

        // Close cart button
        const closeCartBtn = document.getElementById('closeCart');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => closeCart());
        }

        // Cart overlay
        const cartDrawer = document.getElementById('cartDrawer');
        if (cartDrawer) {
            const overlay = cartDrawer.querySelector('.cart-drawer-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => closeCart());
            }
        }

        // Clear cart button
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => handleClearCart());
        }

        // Checkout button - just redirects to shop page
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            // Already a link to /shop, no need to add click handler
        }
    }

    /**
     * Open cart drawer
     */
    function openCart() {
        const cartDrawer = document.getElementById('cartDrawer');
        if (cartDrawer) {
            cartDrawer.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close cart drawer
     */
    function closeCart() {
        const cartDrawer = document.getElementById('cartDrawer');
        if (cartDrawer) {
            cartDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    /**
     * Update cart UI
     */
    function updateCartUI() {
        const items = cartManager.getItems();
        const totalItems = cartManager.getTotalItems();
        const totalPrice = cartManager.getTotalPrice();
        const currency = cartManager.getCurrency();

        // Update cart count badge
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            if (totalItems > 0) {
                cartCount.textContent = totalItems === 1 ? '1 item' : `${totalItems} items`;
                cartCount.classList.remove('hidden');
            } else {
                cartCount.textContent = '0 items';
                cartCount.classList.remove('hidden');
            }
        }

        // Update cart body
        const cartBody = document.getElementById('cartBody');
        if (cartBody) {
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
                        ${items.map(item => createCartItem(item)).join('')}
                    </div>
                `;

                // Add event listeners to cart item controls
                attachCartItemListeners();
            }
        }

        // Update cart footer
        const cartFooter = document.getElementById('cartFooter');
        const cartTotal = document.getElementById('cartTotal');
        
        if (cartFooter && cartTotal) {
            if (items.length > 0) {
                cartFooter.style.display = 'block';
                cartTotal.textContent = formatPrice(totalPrice.toString(), currency);
            } else {
                cartFooter.style.display = 'none';
            }
        }
    }

    /**
     * Create HTML for cart item
     */
    function createCartItem(item) {
        return `
            <div class="cart-item" data-variant-id="${item.variantId}">
                ${item.productImage 
                    ? `<img src="${item.productImage}" alt="${item.productTitle}" class="cart-item-image">`
                    : `<div class="cart-item-image" style="background: var(--neutral-light);"></div>`
                }
                <div class="cart-item-details">
                    <div class="cart-item-title">${escapeHtml(item.productTitle)}</div>
                    ${item.variantInfo ? `<div class="cart-item-variant">${escapeHtml(item.variantInfo)}</div>` : ''}
                    <div class="cart-item-price">${formatPrice(item.price.amount, item.price.currencyCode)}</div>
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
    function attachCartItemListeners() {
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
    function handleClearCart() {
        if (confirm('Are you sure you want to clear your cart?')) {
            cartManager.clearCart();
        }
    }

    /**
     * Format price
     */
    function formatPrice(amount, currencyCode = 'USD') {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        });
        return formatter.format(parseFloat(amount));
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}




