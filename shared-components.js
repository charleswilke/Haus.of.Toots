// ===================================
// SHARED COMPONENTS
// Injects repeated HTML (nav, sidebar, cursor canvas, footer, cart drawer)
// so it only needs to be maintained in one place.
// ===================================

// ===================================
// SHIPPING NOTICE (temporary, self-expiring)
// Jessie is out of town 9/11 - 9/14. Orders placed after Thu 9/10 ship
// Tue 9/15. Phases: "before" (through the cutoff), "away" (cutoff to the
// ship date), "done" (hidden). Delete this block and the homepage markup
// once the trip is over, or leave it: it hides itself after the ship date.
// ===================================

const ShippingNotice = {
    // Local time on the visitor's machine; a few hours of drift is fine.
    cutoffEnd: new Date(2026, 8, 11, 0, 0, 0),   // first moment after Thu 9/10
    shipDate: new Date(2026, 8, 15, 0, 0, 0),    // Tue 9/15

    // ?notice=before|away previews a phase; ?notice=debug adds arrows to flip
    // between them (homepage postcard only; the cart note follows the real date).
    forced: (() => {
        const v = new URLSearchParams(location.search).get('notice');
        return v === 'before' || v === 'away' ? v : null;
    })(),
    debug: new URLSearchParams(location.search).get('notice') === 'debug',

    phase(now = new Date()) {
        if (this.forced) return this.forced;
        if (now >= this.shipDate) return 'done';
        if (now >= this.cutoffEnd) return 'away';
        return 'before';
    },

    copy(phase) {
        if (phase === 'away') {
            return {
                kicker: 'Shipping Alert',
                body: 'Orders will ship <strong>Tuesday, Sept 15th</strong>.',
                cart: 'Shipping alert: orders will ship Tuesday, Sept 15th.'
            };
        }
        return {
            kicker: 'Shipping Alert',
            body: 'Orders placed after <strong>Thursday, Sept 10th</strong> will ship on <strong>Tuesday, Sept 15th</strong>.',
            cart: 'Shipping alert: orders placed after Thursday, Sept 10th will ship on Tuesday, Sept 15th.'
        };
    },

    cartNote() {
        const phase = this.phase();
        if (phase === 'done') return '';
        return `
                <p class="cart-shipping-note">
                    <span class="cart-shipping-note-icon" aria-hidden="true">✈️</span>
                    <span>${this.copy(phase).cart}</span>
                </p>`;
    },

    // Homepage postcard: markup is static in index.html for the "before"
    // phase; this swaps the copy or removes the section as the dates pass.
    applyHomepage() {
        const section = document.getElementById('shippingNotice');
        if (!section) return;
        const phase = this.phase();
        if (phase === 'done' && !this.debug) {
            section.remove();
            return;
        }
        this.render(section, phase === 'done' ? 'before' : phase);
        if (this.debug) this.addDebugArrows(section);
    },

    render(section, phase) {
        const c = this.copy(phase);
        const kicker = section.querySelector('[data-notice-kicker]');
        const body = section.querySelector('[data-notice-body]');
        if (kicker) kicker.textContent = c.kicker;
        if (body) body.innerHTML = c.body;
        section.dataset.phase = phase;
    },

    addDebugArrows(section) {
        const card = section.querySelector('.shipping-postcard');
        if (!card) return;
        const flip = () => this.render(section, section.dataset.phase === 'away' ? 'before' : 'away');
        [['prev', '\u25C0'], ['next', '\u25B6']].forEach(([side, glyph]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `shipping-debug-arrow shipping-debug-arrow-${side}`;
            btn.setAttribute('aria-label', 'Preview other banner version');
            btn.textContent = glyph;
            btn.addEventListener('click', flip);
            card.appendChild(btn);
        });
    }
};

const SharedComponents = {
    nav() {
        return `
    <nav class="top-nav">
        <div class="nav-container">
            <a href="index.html" class="nav-brand" aria-label="Haus of Toots home">
                <img src="images/nav-wordmark-104.webp" srcset="images/nav-wordmark-104.webp 104w, images/nav-wordmark-208.webp 208w" sizes="104px" alt="Haus of Toots" class="nav-brand-logo" width="520" height="247" decoding="async">
            </a>
            <span class="nav-tagline">Cute, Weird &amp; Wildly Specific Needlepoint Canvases</span>
            <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation menu" aria-expanded="false">
                <span class="nav-toggle-icon"></span>
                <span class="nav-toggle-icon"></span>
                <span class="nav-toggle-icon"></span>
            </button>
            <div class="nav-links" id="navLinks">
                <a href="index.html" class="nav-link">Shop</a>
                <a href="hot-at-lns.html" class="nav-link">@ Your LNS</a>
                <a href="https://haus-of-toots.myshopify.com/pages/ws-account-create" class="nav-link" target="_blank" rel="noopener noreferrer">Wholesale</a>
                <a href="about.html" class="nav-link">About</a>
                <a href="gallery.html" class="nav-link">Gallery</a>
            </div>
        </div>
    </nav>
    <button id="cartButton" class="nav-cart-peek" aria-label="Open shopping cart">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <span id="cartCount" class="nav-cart-count">0 items</span>
    </button>`;
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
                <pattern id="stitchPattern" width="60" height="6.72" patternUnits="userSpaceOnUse">
                    <line x1="26.64" y1="6.72" x2="33.36" y2="0" stroke="url(#threadGradient)" stroke-width="3" stroke-linecap="round" />
                </pattern>
                <clipPath id="stitchClip">
                    <rect id="stitchProgress" x="0" y="0" width="60" height="0" />
                </clipPath>
            </defs>
            <rect class="stitch-thread" x="0" y="0" width="60" height="1000" fill="url(#stitchPattern)" clip-path="url(#stitchClip)" />
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
        <div class="footer-stitch-seam"></div>
        <div class="container">
            <div class="footer-content">
                <div class="footer-social">
                    <a href="index.html" class="footer-shop-button social-link">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <span>Shop NDLPT</span>
                    </a>
                    <a href="https://instagram.com/haus.of.toots" target="_blank" rel="noopener noreferrer" class="social-link">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                        <span>@haus.of.toots</span>
                    </a>
                    <a href="mailto:jessie@hausoftoots.com" class="social-link">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <span>Email Me!</span>
                    </a>
                </div>
                <div class="footer-credits">
                    <p class="made-with">Made with <span class="heart">&hearts;</span></p>
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
                </div>${ShippingNotice.cartNote()}
                <button id="clearCartBtn" class="clear-cart-btn">Clear Cart</button>
                <a href="/" id="checkoutBtn" class="checkout-btn">
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
     * Runs automatically when this script executes. Load with `defer` so the
     * whole document (including the footer placeholders) is parsed first.
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

// Auto-inject when the script runs (deferred: after parse, before DOMContentLoaded)
SharedComponents.injectAll();
ShippingNotice.applyHomepage();

/**
 * Masonry layout helper.
 * Distributes children of `grid` into N flex columns using a shortest-column-first
 * algorithm so cards stack at their natural heights with no empty columns.
 */
window.applyMasonry = function applyMasonry(grid) {
    if (!grid) return;
    const cards = Array.from(grid.children).filter(c => !c.classList.contains('masonry-column'));
    // Flatten any prior column wrappers (preserve original order)
    grid.querySelectorAll(':scope > .masonry-column').forEach(col => {
        Array.from(col.children).forEach(child => cards.push(child));
        col.remove();
    });
    if (cards.length === 0) return;

    // Tag with original order so re-runs (e.g. after images load) keep the sort.
    cards.forEach((card, i) => {
        if (card.dataset.masonryOrder === undefined || card.dataset.masonryOrder === '') {
            card.dataset.masonryOrder = String(i);
        }
    });
    cards.sort((a, b) => Number(a.dataset.masonryOrder) - Number(b.dataset.masonryOrder));

    const w = grid.offsetWidth;
    let cols;
    if (w < 600) cols = 1;
    else if (w < 900) cols = 2;
    else cols = 3;
    cols = Math.min(cols, cards.length);

    grid.innerHTML = '';
    const colDivs = [];
    for (let i = 0; i < cols; i++) {
        const c = document.createElement('div');
        c.className = 'masonry-column';
        grid.appendChild(c);
        colDivs.push(c);
    }

    cards.forEach(card => {
        let shortest = colDivs[0];
        for (const c of colDivs) {
            if (c.offsetHeight < shortest.offsetHeight) shortest = c;
        }
        shortest.appendChild(card);
    });

    // Re-balance once images settle, since card heights aren't final until then.
    const imgs = grid.querySelectorAll('img');
    let pending = 0;
    imgs.forEach(img => {
        if (img.complete) return;
        pending++;
        const done = () => {
            pending--;
            if (pending === 0) window.applyMasonry(grid);
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
    });
};

let __masonryResizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(__masonryResizeTimer);
    __masonryResizeTimer = setTimeout(() => {
        document.querySelectorAll('.products-grid').forEach(g => window.applyMasonry(g));
    }, 150);
});
