const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'haus-of-toots.myshopify.com';
const RESTOCK_ROCKET_SHOP_DOMAIN = process.env.RESTOCK_ROCKET_SHOP_DOMAIN || '0e9sd0-v2.myshopify.com';
const RESTOCK_ROCKET_URL = 'https://app.restockrocket.io/api/v1/intents.json';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const validationError = validatePayload(body);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

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
            body: JSON.stringify(body)
        });

        const text = await upstream.text();
        res.status(upstream.status);
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
        return res.send(text);
    } catch (error) {
        console.error('Restock proxy error:', error);
        return res.status(502).json({ error: 'Waitlist signup is temporarily unavailable.' });
    }
};

function validatePayload(body) {
    if (!body || typeof body !== 'object') return 'Invalid request body.';
    const { intent, customer } = body;
    if (!intent || typeof intent !== 'object') return 'Missing intent.';
    if (!customer || typeof customer !== 'object') return 'Missing customer.';
    if (!Number.isFinite(intent.shopify_variant_id)) return 'Missing variant id.';
    if (!Number.isFinite(intent.shopify_product_id)) return 'Missing product id.';
    if (!customer.email || !EMAIL_RE.test(String(customer.email))) return 'Invalid email.';
    return null;
}
