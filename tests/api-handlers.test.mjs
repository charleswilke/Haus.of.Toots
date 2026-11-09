import assert from 'node:assert/strict';
import test from 'node:test';

// package.json sets "type": "module", so the Vercel functions in api/ must be
// ES modules with a default-export handler. A CommonJS export crashes them at
// load time in production.

function mockResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; },
        send(payload) { this.body = payload; return this; }
    };
}

async function withFetchStub(stub, run) {
    const original = globalThis.fetch;
    globalThis.fetch = stub;
    try {
        return await run();
    } finally {
        globalThis.fetch = original;
    }
}

const refuseNetwork = () => { throw new Error('Unexpected network call'); };

for (const path of ['../api/restock-intent.js', '../api/shopify/inventory.js']) {
    test(`${path} loads and exports a handler`, async () => {
        const { default: handler } = await import(path);
        assert.equal(typeof handler, 'function');
    });

    test(`${path} rejects non-POST requests`, async () => {
        const { default: handler } = await import(path);
        const res = mockResponse();
        await withFetchStub(refuseNetwork, () => handler({ method: 'GET' }, res));
        assert.equal(res.statusCode, 405);
        assert.equal(res.headers.Allow, 'POST');
    });
}

// Each test posts from its own address so the per-client rate limit, which
// lives in the module for the whole test run, never carries across tests.
let nextClient = 1;

function restockRequest(body, headerOverrides = {}) {
    const headers = {
        host: 'hausoftoots.com',
        origin: 'https://hausoftoots.com',
        'content-type': 'application/json',
        'x-forwarded-for': `203.0.113.${nextClient++}`,
        ...headerOverrides
    };
    for (const name of Object.keys(headers)) {
        if (headers[name] === undefined) delete headers[name];
    }
    return { method: 'POST', headers, body };
}

async function postRestock(body, headerOverrides, fetchStub = refuseNetwork) {
    const { default: handler } = await import('../api/restock-intent.js');
    const res = mockResponse();
    await withFetchStub(fetchStub, () => handler(restockRequest(body, headerOverrides), res));
    return res;
}

const validSignup = () => ({
    intent: { shopify_variant_id: 1, shopify_product_id: 2 },
    customer: { email: 'stitcher@example.com' }
});

test('restock-intent rejects an invalid payload without calling upstream', async () => {
    assert.equal((await postRestock({ intent: {}, customer: {} })).statusCode, 400);
    assert.equal((await postRestock('{not json')).statusCode, 400);

    const longEmail = validSignup();
    longEmail.customer.email = `${'a'.repeat(250)}@example.com`;
    assert.equal((await postRestock(longEmail)).statusCode, 400);
});

test('restock-intent forwards only known fields and relays the upstream reply', async () => {
    let forwarded = null;
    const stub = async (url, options) => {
        forwarded = { url, body: JSON.parse(options.body) };
        return {
            status: 201,
            headers: { get: () => 'application/json' },
            text: async () => '{"ok":true}'
        };
    };
    const body = {
        intent: {
            shopify_variant_id: 1,
            shopify_product_id: 2,
            shopify_market_id: 3,
            quantity: 500,
            source: 'somewhere-else',
            unexpected: 'dropped'
        },
        customer: { email: '  stitcher@example.com ', accepts_marketing: 'yes', tags: ['vip'] },
        product: { title: 'T'.repeat(400), sku: 'HOT-1', variant_count: 2 },
        unexpected: { anything: true }
    };

    const res = await postRestock(body, {}, stub);

    assert.equal(forwarded.url, 'https://app.restockrocket.io/api/v1/intents.json');
    assert.deepEqual(forwarded.body, {
        intent: {
            shopify_variant_id: 1,
            shopify_product_id: 2,
            country: 'US',
            quantity: 1,
            source: 'haus-of-toots-site',
            shopify_market_id: 3
        },
        customer: {
            accepts_marketing: false,
            locale: 'en',
            email: 'stitcher@example.com',
            shopify_market_id: 3
        },
        product: {
            title: 'T'.repeat(255),
            variant_title: '',
            variant_count: 2,
            vendor: 'Haus of Toots',
            sku: 'HOT-1'
        }
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body, '{"ok":true}');
});

test('restock-intent only accepts requests from the site itself', async () => {
    const elsewhere = await postRestock(validSignup(), { origin: 'https://example.com' });
    assert.equal(elsewhere.statusCode, 403);

    const lookalike = await postRestock(validSignup(), { origin: 'https://hausoftoots.com.example.com' });
    assert.equal(lookalike.statusCode, 403);

    const noSource = await postRestock(validSignup(), { origin: undefined });
    assert.equal(noSource.statusCode, 403);

    // A preview deployment or local server posting to itself gets through
    // the origin check and reaches payload validation.
    const preview = await postRestock({}, {
        host: 'haus-of-toots-abc123.vercel.app',
        origin: 'https://haus-of-toots-abc123.vercel.app'
    });
    assert.equal(preview.statusCode, 400);

    const refererOnly = await postRestock({}, { origin: undefined, referer: 'https://hausoftoots.com/village' });
    assert.equal(refererOnly.statusCode, 400);
});

test('restock-intent rejects non-JSON and oversized requests', async () => {
    const formPost = await postRestock(JSON.stringify(validSignup()), { 'content-type': 'text/plain' });
    assert.equal(formPost.statusCode, 415);

    const declaredLarge = await postRestock(validSignup(), { 'content-length': '50000' });
    assert.equal(declaredLarge.statusCode, 413);

    const actuallyLarge = validSignup();
    actuallyLarge.product = { title: 'x'.repeat(5000) };
    assert.equal((await postRestock(actuallyLarge)).statusCode, 413);
});

test('restock-intent rate-limits one client without affecting others', async () => {
    const client = { 'x-forwarded-for': '198.51.100.7' };
    for (let i = 0; i < 20; i++) {
        assert.equal((await postRestock({}, client)).statusCode, 400);
    }

    const limited = await postRestock({}, client);
    assert.equal(limited.statusCode, 429);
    assert.ok(Number(limited.headers['Retry-After']) > 0);

    assert.equal((await postRestock({}, { 'x-forwarded-for': '198.51.100.8' })).statusCode, 400);
});

test('inventory rejects a request with no variant IDs', async () => {
    const { default: handler } = await import('../api/shopify/inventory.js');
    const res = mockResponse();
    await withFetchStub(refuseNetwork, () => handler({ method: 'POST', body: { variantIds: [] } }, res));
    assert.equal(res.statusCode, 400);
});
