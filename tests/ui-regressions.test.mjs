import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

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
            [...(handlers.get(name) || [])].forEach(fn => fn(event));
        },
        setAttribute(name, value) { this[name] = String(value); },
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
