// ===================================
// SHARED COMPONENTS
// Injects repeated HTML (nav, sidebar, cursor canvas, footer, cart drawer)
// so it only needs to be maintained in one place.
// ===================================

const SharedComponents = {
    nav() {
        return `
    <nav class="top-nav">
        <div class="nav-container">
            <a href="index.html" class="nav-brand">
                <img src="images/hauslogo.png" alt="Haus of Toots logo" class="nav-brand-logo" width="800" height="885">
                <span class="nav-brand-text">Haus <span class="highlight-contrast">of</span> Toots</span>
                <span class="nav-brand-subtitle">- Custom & Customized Needlepoint Canvases</span>
            </a>
            <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation menu" aria-expanded="false">
                <span class="nav-toggle-icon"></span>
                <span class="nav-toggle-icon"></span>
                <span class="nav-toggle-icon"></span>
            </button>
            <div class="nav-links" id="navLinks">
                <a href="about.html" class="nav-link">About</a>
                <a href="gallery.html" class="nav-link">Gallery</a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSd8y7MONwNWWYLNienG8kjcCDZd0De0kJl--dNNfpgUyw4Bfg/viewform?usp=dialog" target="_blank" rel="noopener noreferrer" class="nav-link">Request</a>
                <a href="/shop" class="nav-link">Shop</a>
            </div>
            <button id="cartButton" class="nav-cart-button" aria-label="Open shopping cart">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span id="cartCount" class="nav-cart-count">0 items</span>
            </button>
        </div>
    </nav>`;
    },

    stitchSidebar() {
        return `
    <div class="stitch-sidebar">
        <svg class="stitch-line" viewBox="0 0 60 1000" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="threadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFAAB5;stop-opacity:1" />
                    <stop offset="25%" style="stop-color:#FF8B9A;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#FF6B7A;stop-opacity:1" />
                    <stop offset="75%" style="stop-color:#E85563;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#D04552;stop-opacity:1" />
                </linearGradient>
            </defs>
            <g id="stitchContainer"></g>
            <g id="needle" transform="translate(30, 0)">
                <line x1="-8" y1="-15" x2="8" y2="-15" stroke="#FF6B7A" stroke-width="3" stroke-linecap="round"/>
                <path d="M 0 -15 L 0 5" stroke="#C0C0C0" stroke-width="2"/>
                <circle cx="0" cy="-18" r="2" fill="#C0C0C0"/>
            </g>
        </svg>
    </div>`;
    },

    cursorCanvas() {
        return `<canvas id="cursorCanvas"></canvas>`;
    },

    footer() {
        return `
    <footer class="site-footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-links">
                    <a href="/shop" class="footer-link">Shop Needlepoint</a>
                    <span class="footer-divider">&bull;</span>
                    <a href="index.html#request" class="footer-link">Request Custom Design</a>
                </div>
                <div class="footer-social">
                    <a href="https://instagram.com/haus.of.toots" target="_blank" rel="noopener noreferrer" class="social-link needle-hover">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                        <span>@haus.of.toots</span>
                    </a>
                </div>
                <div class="footer-credits">
                    <p>Made with <span class="heart">&hearts;</span></p>
                    <p class="copyright">&copy; ${new Date().getFullYear()} Haus of Toots. Designs and customizations by Jessie Wilke.</p>
                </div>
            </div>
        </div>
    </footer>`;
    },

    cartDrawer() {
        return `
    <div id="cartDrawer" class="cart-drawer">
        <div class="cart-drawer-overlay"></div>
        <div class="cart-drawer-content">
            <div class="cart-header">
                <h2>Your Cart</h2>
                <button id="closeCart" class="close-cart" aria-label="Close cart">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="cart-body" id="cartBody">
                <div class="cart-empty">
                    <p>Your cart is empty</p>
                    <p class="cart-empty-subtitle">Add some beautiful designs to get started!</p>
                </div>
            </div>
            <div class="cart-footer" id="cartFooter" style="display: none;">
                <div class="cart-total">
                    <span>Total:</span>
                    <span id="cartTotal" class="cart-total-amount">$0.00</span>
                </div>
                <button id="clearCartBtn" class="clear-cart-btn">Clear Cart</button>
                <a href="/shop" id="checkoutBtn" class="checkout-btn">
                    <span>Proceed to Checkout</span>
                    <svg class="needle-icon" width="20" height="20" viewBox="0 0 24 24">
                        <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="2" cy="12" r="2" fill="currentColor"/>
                    </svg>
                </a>
            </div>
        </div>
    </div>`;
    },

    /**
     * Inject all shared components into placeholder elements.
     * Call this at the top of <body> or in a synchronous <script>.
     *
     * Expected placeholders:
     *   <div id="shared-nav"></div>
     *   <div id="shared-stitch-sidebar"></div>
     *   <div id="shared-cursor-canvas"></div>
     *   <div id="shared-footer"></div>
     *   <div id="shared-cart-drawer"></div>
     */
    injectAll() {
        const mappings = {
            'shared-nav': this.nav(),
            'shared-stitch-sidebar': this.stitchSidebar(),
            'shared-cursor-canvas': this.cursorCanvas(),
            'shared-footer': this.footer(),
            'shared-cart-drawer': this.cartDrawer()
        };

        Object.entries(mappings).forEach(([id, html]) => {
            const el = document.getElementById(id);
            if (el) {
                el.outerHTML = html;
            }
        });
    }
};

// Auto-inject when the script runs (synchronous, before DOMContentLoaded)
SharedComponents.injectAll();
