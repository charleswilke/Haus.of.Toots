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

test('restock-intent rejects an invalid payload without calling upstream', async () => {
    const { default: handler } = await import('../api/restock-intent.js');
    const res = mockResponse();
    await withFetchStub(refuseNetwork, () => handler({ method: 'POST', body: { intent: {}, customer: {} } }, res));
    assert.equal(res.statusCode, 400);
});

test('restock-intent forwards a valid payload and relays the upstream reply', async () => {
    const { default: handler } = await import('../api/restock-intent.js');
    const res = mockResponse();
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
        intent: { shopify_variant_id: 1, shopify_product_id: 2 },
        customer: { email: 'stitcher@example.com' }
    };

    await withFetchStub(stub, () => handler({ method: 'POST', body }, res));

    assert.equal(forwarded.url, 'https://app.restockrocket.io/api/v1/intents.json');
    assert.deepEqual(forwarded.body, body);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body, '{"ok":true}');
});

test('inventory rejects a request with no variant IDs', async () => {
    const { default: handler } = await import('../api/shopify/inventory.js');
    const res = mockResponse();
    await withFetchStub(refuseNetwork, () => handler({ method: 'POST', body: { variantIds: [] } }, res));
    assert.equal(res.statusCode, 400);
});
