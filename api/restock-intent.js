import { clientKey, createRateLimiter, isJsonRequest, isSameSiteRequest } from './_lib/guards.js';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'haus-of-toots.myshopify.com';
const RESTOCK_ROCKET_SHOP_DOMAIN = process.env.RESTOCK_ROCKET_SHOP_DOMAIN || '0e9sd0-v2.myshopify.com';
const RESTOCK_ROCKET_URL = 'https://app.restockrocket.io/api/v1/intents.json';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_BODY_BYTES = 4096;
const UPSTREAM_TIMEOUT_MS = 8000;

// Generous enough for a shopper joining several waitlists on a drop day.
const takeRateLimitSlot = createRateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!isSameSiteRequest(req)) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!isJsonRequest(req)) {
        return res.status(415).json({ error: 'Expected a JSON request.' });
    }

    if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Request is too large.' });
    }

    const retryAfterSeconds = takeRateLimitSlot(clientKey(req));
    if (retryAfterSeconds) {
        res.setHeader('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({ error: 'Too many signups. Please try again in a few minutes.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (error) {
        return res.status(400).json({ error: 'Invalid request body.' });
    }

    if (JSON.stringify(body).length > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Request is too large.' });
    }

    const { payload, error: validationError } = buildPayload(body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const upstream = await fetch(RESTOCK_ROCKET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Origin': `https://${SHOPIFY_DOMAIN}`,
                'Referer': `https://${SHOPIFY_DOMAIN}/`,
                'User-Agent': 'HausOfToots-RestockProxy/1.0',
                'X-Shopify-Shop-Domain': RESTOCK_ROCKET_SHOP_DOMAIN
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
        });

        const text = await upstream.text();
        res.status(upstream.status);
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
        return res.send(text);
    } catch (error) {
        console.error('Restock proxy error:', error);
        return res.status(502).json({ error: 'Waitlist signup is temporarily unavailable.' });
    }
}

/**
 * Builds the upstream payload from known fields only, so nothing the
 * caller adds is forwarded under the shop's name.
 */
function buildPayload(body) {
    if (!isPlainObject(body)) return { error: 'Invalid request body.' };
    const { intent, customer, product } = body;
    if (!isPlainObject(intent)) return { error: 'Missing intent.' };
    if (!isPlainObject(customer)) return { error: 'Missing customer.' };
    if (!isPositiveId(intent.shopify_variant_id)) return { error: 'Missing variant id.' };
    if (!isPositiveId(intent.shopify_product_id)) return { error: 'Missing product id.' };

    const email = typeof customer.email === 'string' ? customer.email.trim() : '';
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return { error: 'Invalid email.' };

    const details = isPlainObject(product) ? product : {};
    const payload = {
        intent: {
            shopify_variant_id: intent.shopify_variant_id,
            shopify_product_id: intent.shopify_product_id,
            country: 'US',
            quantity: 1,
            source: 'haus-of-toots-site'
        },
        customer: {
            accepts_marketing: customer.accepts_marketing === true,
            locale: 'en',
            email
        },
        product: {
            title: clip(details.title, 255),
            variant_title: clip(details.variant_title, 255),
            variant_count: Number.isInteger(details.variant_count) && details.variant_count > 0
                ? Math.min(details.variant_count, 250)
                : 1,
            vendor: clip(details.vendor, 255) || 'Haus of Toots',
            sku: clip(details.sku, 64)
        }
    };

    const marketId = [intent.shopify_market_id, customer.shopify_market_id].find(isPositiveId);
    if (marketId) {
        payload.intent.shopify_market_id = marketId;
        payload.customer.shopify_market_id = marketId;
    }

    return { payload };
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveId(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function clip(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}
