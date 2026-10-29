import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('product title colors follow collection membership across mixed grids and recommendations', () => {
    const { app } = shop();
    app.collectionContext = { key: 'flash', handle: 'ndlpt-flash-sheet-collection' };
    for (const [handle, expected] of [
        ['main-stage-collection', 'main-stage'],
        ['village-expansion-series', 'village'],
        ['ndlpt-flash-sheet-collection', 'flash'],
        ['accessories', 'accessories']
    ]) {
        assert.equal(app.getProductTitleCollection({ collections: { edges: [{ node: { handle } }] } }), expected);
    }
    assert.equal(app.getProductTitleCollection({ title: 'Cached canvas' }), 'flash');
    assert.equal(app.getProductTitleCollection({ collections: { edges: [
        { node: { handle: 'ndlpt-flash-sheet-collection' } },
        { node: { handle: 'accessories' } }
    ] } }), 'accessories');
    app.collectionContext = null;
    assert.equal(app.getProductTitleCollection({ title: 'She Is Powerful' }), 'main-stage');
    assert.equal(app.getProductTitleCollection({ title: 'Unknown canvas' }), 'default');
});

function element() {
    const classes = new Set();
    const handlers = new Map();
    return {
        style: {}, dataset: {}, children: [], innerHTML: '',
        inert: false, tabIndex: 0, isConnected: true,
        focus() {},
        closest() { return this.inert ? this : null; },
        matches() { return Boolean(this.disabled); },
        getClientRects() { return this.hidden ? [] : [{}]; },
        classList: {
            add: (...names) => names.forEach(name => classes.add(name)),
            remove: (...names) => names.forEach(name => classes.delete(name)),
            contains: name => classes.has(name),
            toggle(name, force = !classes.has(name)) {
                if (force) classes.add(name); else classes.delete(name);
            }
        },
        addEventListener(name, handler) {
            if (!handlers.has(name)) handlers.set(name, new Set());
            handlers.get(name).add(handler);
        },
        removeEventListener(name, handler) { handlers.get(name)?.delete(handler); },
        fire(name, event = {}) {
            event.preventDefault ||= () => {};
            return Promise.all([...(handlers.get(name) || [])].map(fn => fn(event)));
        },
        setAttribute(name, value) { this[name] = String(value); },
        getAttribute(name) { return this[name] ?? null; },
        appendChild(child) { this.children.push(child); },
        contains(child) { return child === this || this.children.includes(child); },
        querySelectorAll() { return []; },
        insertAdjacentElement() {},
    };
}

function environment() {
    const elements = new Map();
    const document = Object.assign(element(), {
        body: element(), readyState: 'loading',
        getElementById(id) {
            if (!elements.has(id)) {
                const node = Object.assign(element(), { id });
                node.focus = () => { document.activeElement = node; };
                elements.set(id, node);
            }
            return elements.get(id);
        },
        createElement: element,
    });
    document.activeElement = document.body;
    document.body.style.overflow = '';
    const window = Object.assign(element(), { innerWidth: 1024 });
    const context = vm.createContext({
        document, window, console: { error() {}, warn() {} },
        getComputedStyle: () => ({ visibility: 'visible' }),
        setTimeout: () => 1, clearTimeout() {},
        requestAnimationFrame: callback => { callback(); return 1; },
        IntersectionObserver: class { observe() {} },
        MutationObserver: class { observe() {} },
    });
    return { document, window, context };
}

function loadClass(env, file, name) {
    vm.runInContext(`${readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')}\nglobalThis.Subject = ${name};`, env.context);
    return Object.create(env.context.Subject.prototype);
}

function shop() {
    const env = environment();
    const app = loadClass(env, 'shop-app.js', 'ShopApp');
    app.scheduleProductModalScrollbarUpdate = () => {};
    app.loadProductRecommendations = () => {};
    app.findLoadedProduct = () => null;
    app.renderProductModal = product => { env.document.getElementById('productModalBody').innerHTML = product.title; };
    return { ...env, app };
}

function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
}

function stickerShop() {
    const env = shop();
    const { app, document, context } = env;
    const all = { url: 'https://example.com/all.jpg?v=1' };
    const red = { url: 'https://example.com/red.jpg?v=1' };
    const pink = { url: 'https://example.com/pink.jpg?v=1' };
    const variants = [
        { id: 'set', title: 'Full set', image: all },
        { id: 'red', title: 'Red heart', image: { url: 'https://example.com/red.jpg?v=2' } },
        { id: 'pink', title: 'Pink heart', image: pink }
    ].map(node => ({ node }));
    // Photos deliberately differ from variant order.
    const product = { id: 'stickers', title: 'Stickers', images: { edges: [all, pink, red].map(node => ({ node })) }, variants: { edges: variants } };
    const rows = variants.map(({ node }) => {
        const row = element(), button = element(), qty = element(), note = element();
        row.setAttribute('data-variant-id', node.id);
        qty.textContent = '0';
        const increase = element(), decrease = element();
        for (const [control, action] of [[increase, 'increase'], [decrease, 'decrease']]) {
            control.setAttribute('data-action', action);
            control.closest = () => row;
        }
        button.closest = () => null;
        row.querySelector = selector => selector.includes('sticker-preview-option') ? button :
            selector.includes('sticker-qty-value') ? qty : selector.includes('increase') ? increase :
            selector.includes('decrease') ? decrease : note;
        return Object.assign(row, { button, qty, increase, decrease, note });
    });
    const slides = [0, 1, 2].map(index => Object.assign(element(), { offsetLeft: index * 108 }));
    const thumbs = [element(), element(), element()];
    const dots = [element(), element(), element()];
    const caption = element(), gallery = element();
    document.querySelectorAll = selector => selector.includes('sticker-qty-btn') ? rows.flatMap(r => [r.increase, r.decrease]) :
        selector.includes('product-detail-price-row-sticker') ? rows :
        selector === '.product-detail-gallery-image' ? slides :
        selector === '.variant-gallery-thumbnail' ? thumbs :
        selector === '.product-detail-gallery-dot' ? dots : [];
    document.querySelector = selector => selector === '.variant-gallery-caption' ? caption : gallery;
    context.getVariantInventoryLimit = () => 10;
    context.cartManager = { getVariantQuantity: () => 0 };
    context.inventoryManager = { getVariantInventory: async () => ({}) };
    app.activeModalProductId = product.id;
    app.prefetchStickerInventory = () => {};
    app.updateStickerPurchaseSummary = () => {};
    return { ...env, product, variants, rows, slides, thumbs, dots, caption };
}

function minderShop() {
    const env = shop();
    const { app, document } = env;
    const variants = ['Red heart', 'Pink heart', 'Frog It'].map((title, index) => ({ node: {
        id: `minder-${index}`, title, availableForSale: true,
        image: { url: `https://example.com/minder-${index}.jpg` }
    } }));
    const product = { id: 'minders', title: 'Flash Sheet Needle Minders',
        variants: { edges: variants }, images: { edges: variants.map(({ node }) => ({ node: node.image })) } };
    const slides = variants.map(() => element());
    const thumbs = variants.map(() => element());
    const pills = variants.map(({ node }) => {
        const pill = element();
        pill.setAttribute('data-variant-id', node.id);
        return pill;
    });
    const caption = element();
    document.querySelector = selector => selector === '.variant-gallery-caption' ? caption : element();
    document.querySelectorAll = selector => selector === '.product-detail-gallery-image' ? slides :
        selector === '.variant-gallery-thumbnail' ? thumbs :
        selector.includes('.product-detail-variant-pill') ? pills : [];
    app.activeModalProductId = product.id;
    app.selectedProductVariantId = variants[0].node.id;
    app.renderProductPriceDisplay = (_product, variant) => variant.id;
    app.renderProductVariantPicker = (_product, _variants, variant) => variant.id;
    app.renderProductPurchaseActions = (_product, variant) => variant.id;
    app.attachProductPurchaseActionListeners = (_product, variant) => { app.purchaseVariantId = variant.id; };
    app.updateStickyBar = (_product, variant) => { app.stickyVariantId = variant.id; };
    return { ...env, product, variants, slides, thumbs, pills, caption };
}

test('needle minder option selection updates its photo, price, and purchase variant together', async () => {
    const { app, document, product, variants, pills, slides, caption } = minderShop();
    assert.equal(app.hasVariantGallery(product), true);
    app.attachProductVariantSelectionListeners(product, variants);
    await pills[1].fire('click');
    assert.equal(app.selectedProductVariantId, 'minder-1');
    assert.equal(app.purchaseVariantId, 'minder-1');
    assert.equal(app.stickyVariantId, 'minder-1');
    assert.equal(document.getElementById('productDetailPrice').innerHTML, 'minder-1');
    assert.equal(document.getElementById('productVariantPicker').innerHTML, 'minder-1');
    assert.equal(document.getElementById('productPurchaseActions').innerHTML, 'minder-1');
    assert.equal(slides[1].classList.contains('is-active'), true);
    assert.equal(caption.textContent, 'Pink heart');
});

test('needle minder thumbnails select the matching purchasable option without recursion', () => {
    const { app, product, slides, caption } = minderShop();
    let updates = 0;
    const update = app.updateStickyBar;
    app.updateStickyBar = (...args) => { updates++; update(...args); };
    app.previewProductGalleryImage(product, 2);
    assert.equal(app.selectedProductVariantId, 'minder-2');
    assert.equal(app.purchaseVariantId, 'minder-2');
    assert.equal(slides[2].classList.contains('is-active'), true);
    assert.equal(caption.textContent, 'Frog It');
    assert.equal(updates, 1);
    // A general overview photo has no associated option and keeps the choice.
    product.images.edges.unshift({ node: { url: 'https://example.com/all-minders.jpg' } });
    app.previewProductGalleryImage(product, 0);
    assert.equal(app.selectedProductVariantId, 'minder-2');
    assert.equal(app.purchaseVariantId, 'minder-2');
});

test('ordinary canvas options retain their existing gallery and purchase behavior', () => {
    const { app, product } = minderShop();
    product.title = 'Needlepoint Canvas';
    assert.equal(app.hasVariantGallery(product), false);
    let previews = 0;
    app.previewProductVariantImage = () => { previews++; };
    app.selectProductVariant(product, 'minder-1');
    assert.equal(app.purchaseVariantId, 'minder-1');
    assert.equal(previews, 0);
});

test('the active gallery control is revealed within its own horizontal strip', () => {
    const { app } = shop();
    const strip = { scrollLeft: 0, scrollWidth: 300, clientWidth: 100,
        getBoundingClientRect: () => ({ left: 10, right: 110 }) };
    const control = { parentElement: strip, getBoundingClientRect: () => ({ left: 160, right: 190 }) };
    app.revealGalleryControl(control);
    assert.equal(strip.scrollLeft, 84);
    control.getBoundingClientRect = () => ({ left: 5, right: 35 });
    app.revealGalleryControl(control);
    assert.equal(strip.scrollLeft, 75);
});

test('sticker photos use assigned images rather than variant order, including unlisted photos', () => {
    const { app, product, variants } = stickerShop();
    assert.equal(app.getVariantGalleryImageIndex(product, variants[1].node), 2);
    assert.equal(app.getVariantGalleryImageIndex(product, variants[2].node), 1);
    variants[2].node.image = { url: 'https://example.com/new-pink.jpg' };
    assert.equal(app.getVariantGalleryImageIndex(product, variants[2].node), 3);
    assert.equal(app.getProductGalleryImages(product).length, 4);
    assert.equal(product.images.edges.length, 3);
    assert.equal(app.getVariantGalleryImageIndex(product, { id: 'no-photo' }), 0);
});

test('only the previewed sticker is highlighted while chosen quantities remain independent', () => {
    const { app, product, rows, slides, thumbs, caption } = stickerShop();
    rows[1].qty.textContent = '2';
    rows[2].qty.textContent = '1';
    app.previewProductVariantImage(product, 'red');
    assert.equal(slides[2].classList.contains('is-active'), true);
    assert.equal(rows[1].classList.contains('is-previewing'), true);
    app.previewProductVariantImage(product, 'pink');
    assert.equal(rows.filter(row => row.classList.contains('is-previewing')).length, 1);
    assert.equal(rows[1].classList.contains('is-previewing'), false);
    assert.equal(rows[2].button.getAttribute('aria-pressed'), 'true');
    assert.equal(slides[1].classList.contains('is-active'), true);
    assert.equal(slides[2].classList.contains('is-active'), false);
    assert.equal(thumbs[1].getAttribute('aria-pressed'), 'true');
    assert.equal(caption.textContent, 'Pink heart');
    assert.deepEqual(rows.map(row => row.qty.textContent), ['0', '2', '1']);
    // Thumbnail browsing uses the same state as option selection.
    app.previewProductGalleryImage(product, 0);
    assert.equal(rows[0].classList.contains('is-previewing'), true);
    assert.equal(rows[2].classList.contains('is-previewing'), false);
    assert.deepEqual(rows.map(row => row.qty.textContent), ['0', '2', '1']);
});

test('preview clicks do not add quantities, and steppers preview their own design', async () => {
    const { app, product, variants, rows, slides } = stickerShop();
    app.attachProductVariantSelectionListeners(product, variants);
    await rows[1].fire('click', { target: rows[1].button });
    assert.equal(rows[1].qty.textContent, '0');
    assert.equal(slides[2].classList.contains('is-active'), true);
    const click = { stopPropagation() {} };
    await rows[1].increase.fire('click', click);
    await rows[2].increase.fire('click', click);
    assert.deepEqual(rows.map(row => row.qty.textContent), ['0', '1', '1']);
    assert.equal(rows.filter(row => row.classList.contains('is-previewing')).length, 1);
    assert.equal(rows[2].classList.contains('is-previewing'), true);
    assert.equal(rows.some(row => row.classList.contains('selected')), false);
    await rows[1].decrease.fire('click', click);
    assert.deepEqual(rows.map(row => row.qty.textContent), ['0', '0', '1']);
    assert.equal(rows[1].classList.contains('is-previewing'), true);
});

test('rapid sticker increments preserve every click while inventory requests are pending', async () => {
    const { app, product, variants, rows, context } = stickerShop();
    const pending = deferred();
    context.inventoryManager.getVariantInventory = (_id, options) => options?.forceRefresh ? pending.promise : Promise.resolve({});
    app.attachProductVariantSelectionListeners(product, variants);
    const first = rows[1].increase.fire('click', { stopPropagation() {} });
    const second = rows[1].increase.fire('click', { stopPropagation() {} });
    pending.resolve({});
    await Promise.all([first, second]);
    assert.equal(rows[1].qty.textContent, '2');
    assert.equal(rows.filter(row => row.classList.contains('is-previewing')).length, 1);
});

test('events from an old sticker gallery cannot alter a different product modal', () => {
    const { app, product, rows, caption } = stickerShop();
    app.previewProductVariantImage(product, 'red');
    app.activeModalProductId = 'another-product';
    app.previewProductVariantImage(product, 'pink');
    assert.equal(caption.textContent, 'Red heart');
    assert.equal(rows[1].classList.contains('is-previewing'), true);
    assert.equal(rows[2].classList.contains('is-previewing'), false);
});

test('desktop resize and menu dismissal preserve an open modal scroll lock', () => {
    const env = environment();
    const { document, window, context } = env;
    const modal = document.getElementById('productModal');
    const nav = document.getElementById('navLinks');
    const toggle = document.getElementById('navToggle');
    document.querySelector = () => modal.classList.contains('open') ? modal : null;
    const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
    vm.runInContext(source.slice(source.indexOf('// Hamburger menu toggle')), context);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    window.fire('resize');
    assert.equal(document.body.style.overflow, 'hidden');
    toggle.fire('click');
    document.fire('click', { target: element() });
    assert.equal(nav.classList.contains('active'), false);
    assert.equal(document.body.style.overflow, 'hidden');
    modal.classList.remove('open');
    toggle.fire('click');
    document.fire('keydown', { key: 'Escape' });
    assert.equal(document.body.style.overflow, '');
});

test('Escape closes the lightbox first, retaining the product modal and scroll lock', () => {
    const { app, document } = shop();
    const modal = document.getElementById('productModal');
    const lightbox = document.getElementById('imageLightbox');
    modal.querySelector = () => element();
    lightbox.querySelector = () => element();
    app.setupProductModalListeners();
    app.setupLightboxListeners();
    modal.classList.add('open');
    app.activateDialog(modal, document.getElementById('closeProductModal'));
    lightbox.classList.add('open');
    app.activateDialog(lightbox, document.getElementById('closeLightbox'));
    document.fire('keydown', { key: 'Escape' });
    assert.equal(lightbox.classList.contains('open'), false);
    assert.equal(modal.classList.contains('open'), true);
    assert.equal(document.body.style.overflow, 'hidden');
    document.fire('keydown', { key: 'Escape' });
    assert.equal(modal.classList.contains('open'), false);
    assert.equal(document.body.style.overflow, '');
});

test('dialog keyboard navigation wraps and skips disabled or hidden controls', () => {
    const { app, document } = shop();
    app.setupDialogAccessibility();
    const modal = document.getElementById('productModal');
    const first = document.getElementById('closeProductModal');
    const disabled = Object.assign(element(), { disabled: true });
    const hidden = Object.assign(element(), { hidden: true });
    const last = document.getElementById('buyButton');
    modal.children = [first, disabled, hidden, last];
    modal.querySelectorAll = () => modal.children;
    modal.classList.add('open');
    app.activateDialog(modal, first);
    document.fire('keydown', { key: 'Tab', shiftKey: true });
    assert.equal(document.activeElement, last);
    document.fire('keydown', { key: 'Tab' });
    assert.equal(document.activeElement, first);
    document.activeElement = document.body;
    document.fire('focusin', { target: document.body });
    assert.equal(document.activeElement, first);
    modal.querySelectorAll = () => [];
    document.fire('keydown', { key: 'Tab' });
    assert.equal(document.activeElement, modal);
});

test('nested dialogs restore focus, background inert state, and the original scroll setting', () => {
    const { app, document } = shop();
    app.setupDialogAccessibility();
    const modal = document.getElementById('productModal');
    const lightbox = document.getElementById('imageLightbox');
    const cart = document.getElementById('cartDrawer');
    const background = element();
    const alreadyInert = Object.assign(element(), { inert: true });
    const card = document.getElementById('productCard');
    const image = document.getElementById('galleryImage');
    modal.children = [image];
    background.children = [card];
    document.body.children = [background, alreadyInert, modal, lightbox, cart];
    document.body.style.overflow = 'clip';
    card.focus();
    modal.classList.add('open');
    app.activateDialog(modal, document.getElementById('closeProductModal'));
    assert.equal(background.inert, true);
    assert.equal(modal.inert, false);
    assert.equal(document.body.style.overflow, 'hidden');
    image.focus();
    lightbox.classList.add('open');
    app.activateDialog(lightbox, document.getElementById('closeLightbox'));
    assert.equal(modal.inert, true);
    app.closeLightbox();
    assert.equal(document.activeElement, image);
    assert.equal(modal.inert, false);
    assert.equal(lightbox.inert, true);
    assert.equal(document.body.style.overflow, 'hidden');
    // Switching to a recommendation must retain the original product card.
    app.activateDialog(modal, document.getElementById('closeProductModal'));
    app.closeProductModal();
    assert.equal(document.activeElement, card);
    assert.equal(background.inert, false);
    assert.equal(alreadyInert.inert, true);
    assert.equal(modal.inert, true);
    assert.equal(lightbox.inert, true);
    assert.equal(document.body.style.overflow, 'clip');
});

test('an earlier failed product request cannot overwrite the current product', async () => {
    const { app, document, context } = shop();
    const first = deferred(), second = deferred();
    context.shopifyClient = { getProductById: id => id === 'first' ? first.promise : second.promise };
    const oldOpen = app.openProductModal('first');
    const newOpen = app.openProductModal('second');
    second.resolve({ title: 'Current product' });
    await newOpen;
    first.reject(new Error('Slow network failure'));
    await oldOpen;
    assert.equal(document.getElementById('productModalBody').innerHTML, 'Current product');
});

test('reopening the same product ignores a stale response from its previous visit', async () => {
    const { app, document, context } = shop();
    const first = deferred(), second = deferred();
    let calls = 0;
    context.shopifyClient = { getProductById: () => ++calls === 1 ? first.promise : second.promise };
    const oldOpen = app.openProductModal('same');
    app.closeProductModal();
    const newOpen = app.openProductModal('same');
    second.resolve({ title: 'Fresh product' });
    await newOpen;
    first.resolve({ title: 'Stale product' });
    await oldOpen;
    assert.equal(document.getElementById('productModalBody').innerHTML, 'Fresh product');
});

test('gallery ignores height-only resizes but adapts to width and breakpoint changes', () => {
    const env = environment();
    const app = loadClass(env, 'card-gallery.js', 'CardGallery');
    Object.assign(app, { isOpen: true, isMasonryMode: true, layoutWidth: 1024, masonryColumnCount: 4, overlay: element() });
    let renders = 0, balances = 0;
    app.render = () => renders++;
    app.balanceMasonryColumns = () => balances++;
    app.updateNavButtons = () => {};
    env.window.innerHeight = 600;
    app.handleResize();
    assert.equal(balances, 0);
    env.window.innerWidth = 1100;
    app.handleResize();
    assert.equal(balances, 1);
    env.window.innerWidth = 900;
    app.handleResize();
    assert.equal(renders, 1);
    env.window.innerWidth = 390;
    app.handleResize();
    assert.equal(renders, 2);
    assert.equal(app.isMasonryMode, false);
});

test('gallery balances cached and newly settled images once and ignores obsolete renders', () => {
    const env = environment();
    const app = loadClass(env, 'card-gallery.js', 'CardGallery');
    const images = [Object.assign(element(), { complete: true }), Object.assign(element(), { complete: false })];
    const stack = element();
    Object.defineProperty(stack, 'innerHTML', { set() { this.children = []; } });
    stack.querySelectorAll = () => images;
    Object.assign(app, { cardStack: stack, filteredCards: [{}, {}], createCardElement: element });
    let balances = 0;
    app.balanceMasonryColumns = () => balances++;
    app.renderMasonry();
    assert.equal(balances, 0);
    images[1].fire('error');
    assert.equal(balances, 1);
    images[1].fire('load');
    assert.equal(balances, 1);
    images[1].complete = true;
    app.renderMasonry();
    assert.equal(balances, 2);
    images[1].complete = false;
    app.renderMasonry();
    stack.innerHTML = '';
    images[1].fire('load');
    assert.equal(balances, 2);
});
