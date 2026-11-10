import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Cart items are read back from localStorage, so every value that lands in
// an HTML attribute has to be escaped. The cart is rendered by shop-app.js
// on shop pages and by cart-global.js everywhere else.

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// Both files indent these functions four spaces, closing on a line of their own.
function sliceBlock(source, startMarker) {
    const start = source.indexOf(startMarker);
    assert.notEqual(start, -1, `could not find ${startMarker}`);
    const end = source.indexOf('\n    }\n', start);
    return source.slice(start, end + '\n    }'.length);
}

function shopAppRenderer() {
    const source = read('shop-app.js');
    const methods = ['createCartItem(item) {', 'escapeHtml(text) {', "formatPrice(amount, currencyCode = 'USD') {"]
        .map(marker => sliceBlock(source, marker));
    const app = new Function(`return ({ ${methods.join(',\n')} });`)();
    return item => app.createCartItem(item);
}

function cartGlobalRenderer() {
    const source = read('cart-global.js');
    const functions = ['function createCartItem(item) {', 'function escapeHtml(text) {', 'function formatPrice(amount, currencyCode']
        .map(marker => sliceBlock(source, marker));
    return new Function(`${functions.join('\n')}\nreturn createCartItem;`)();
}

const hostileItem = {
    variantId: 'gid://shopify/ProductVariant/1" data-injected="yes',
    productTitle: 'Tootsie\'s "Big" Canvas <script>alert(1)</script>',
    productImage: 'https://cdn.shopify.com/a.webp" onerror="alert(1)',
    variantInfo: '13 Mesh',
    quantity: '2"><b>',
    price: { amount: '95.00', currencyCode: 'USD' }
};

for (const [file, renderer] of [['shop-app.js', shopAppRenderer], ['cart-global.js', cartGlobalRenderer]]) {
    test(`${file} escapes every stored value in cart item markup`, () => {
        const html = renderer()(hostileItem);

        assert.doesNotMatch(html, /data-injected="yes"/);
        assert.doesNotMatch(html, /onerror="alert/);
        assert.doesNotMatch(html, /<script>/);
        assert.doesNotMatch(html, /<b>/);

        assert.match(html, /alt="Tootsie&#039;s &quot;Big&quot; Canvas &lt;script&gt;/);
        assert.match(html, /src="https:\/\/cdn\.shopify\.com\/a\.webp&quot; onerror=&quot;alert\(1\)"/);
        assert.match(html, /data-variant-id="gid:\/\/shopify\/ProductVariant\/1&quot; data-injected=&quot;yes"/);
        assert.match(html, /<span class="quantity-value">0<\/span>/);
    });

    test(`${file} renders an ordinary cart item unchanged`, () => {
        const html = renderer()({
            variantId: 'gid://shopify/ProductVariant/44750460813346',
            productTitle: 'Costco Storefront Needlepoint Canvas',
            productImage: 'https://cdn.shopify.com/s/files/1/costco.webp?v=1&width=200',
            variantInfo: '18 Mesh',
            quantity: 3,
            price: { amount: '95.00', currencyCode: 'USD' }
        });

        assert.match(html, /<div class="cart-item" data-variant-id="gid:\/\/shopify\/ProductVariant\/44750460813346">/);
        assert.match(html, /src="https:\/\/cdn\.shopify\.com\/s\/files\/1\/costco\.webp\?v=1&amp;width=200"/);
        assert.match(html, /alt="Costco Storefront Needlepoint Canvas"/);
        assert.match(html, /<span class="quantity-value">3<\/span>/);
        assert.match(html, /\$95\.00/);
    });
}
