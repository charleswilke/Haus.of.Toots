const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'haus-of-toots.myshopify.com';
const RESTOCK_ROCKET_SHOP_DOMAIN = process.env.RESTOCK_ROCKET_SHOP_DOMAIN || '0e9sd0-v2.myshopify.com';
const RESTOCK_ROCKET_URL = 'https://app.restockrocket.io/api/v1/intents.json';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SITE_HOSTS = new Set(['hausoftoots.com', 'www.hausoftoots.com']);
const MAX_BODY_BYTES = 4096;
const UPSTREAM_TIMEOUT_MS = 8000;

// Generous enough for a shopper joining several waitlists on a drop day.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_CLIENTS = 5000;

// Lives in one function instance's memory, so it slows a single abusive
// client but is not a hard cap across instances or cold starts.
const recentRequests = new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!isSameSiteRequest(req)) {
        return res.status(403).json({ error: 'Forbidden.' });
    }

    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) {
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
 * Browsers send Origin on every POST, so a page on another site cannot
 * submit signups through a visitor's browser. Matching the request's own
 * host keeps preview deployments and local development working.
 */
function isSameSiteRequest(req) {
    const source = req.headers.origin || req.headers.referer;
    if (!source) return false;

    let sourceHost;
    try {
        sourceHost = new URL(source).host.toLowerCase();
    } catch (error) {
        return false;
    }

    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    return SITE_HOSTS.has(sourceHost) || (requestHost !== '' && sourceHost === requestHost);
}

function clientKey(req) {
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwardedFor || String(req.headers['x-real-ip'] || '') || 'unknown';
}

/**
 * Records a request for this client. Returns 0 when it is allowed, or the
 * number of seconds to wait when the client is over the limit.
 */
function takeRateLimitSlot(key, now = Date.now()) {
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const hits = (recentRequests.get(key) || []).filter(time => time > windowStart);

    if (hits.length >= RATE_LIMIT_MAX) {
        recentRequests.set(key, hits);
        return Math.max(1, Math.ceil((hits[0] + RATE_LIMIT_WINDOW_MS - now) / 1000));
    }

    hits.push(now);
    // Re-inserting keeps the Map ordered by last activity, so the entry
    // evicted below is always the client seen longest ago.
    recentRequests.delete(key);
    recentRequests.set(key, hits);
    if (recentRequests.size > RATE_LIMIT_MAX_CLIENTS) {
        recentRequests.delete(recentRequests.keys().next().value);
    }
    return 0;
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
