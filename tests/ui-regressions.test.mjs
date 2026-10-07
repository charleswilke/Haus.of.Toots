import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function element() {
    const classes = new Set();
    const handlers = new Map();
    return {
        style: {}, dataset: {}, children: [], innerHTML: '',
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
        fire(name, event = {}) { [...(handlers.get(name) || [])].forEach(fn => fn(event)); },
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
            if (!elements.has(id)) elements.set(id, element());
            return elements.get(id);
        },
        createElement: element,
    });
    const window = Object.assign(element(), { innerWidth: 1024 });
    const context = vm.createContext({
        document, window, console: { error() {}, warn() {} },
        setTimeout: () => 1, clearTimeout() {},
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
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.fire('keydown', { key: 'Escape' });
    assert.equal(lightbox.classList.contains('open'), false);
    assert.equal(modal.classList.contains('open'), true);
    assert.equal(document.body.style.overflow, 'hidden');
    document.fire('keydown', { key: 'Escape' });
    assert.equal(modal.classList.contains('open'), false);
    assert.equal(document.body.style.overflow, '');
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
