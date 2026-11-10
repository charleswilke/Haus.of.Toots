import { clientKey, createRateLimiter, isJsonRequest, isSameSiteRequest } from '../_lib/guards.js';

const DEFAULT_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'haus-of-toots.myshopify.com';
const DEFAULT_STOREFRONT_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || '2025-10';
const DEFAULT_ADMIN_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-10';

const VARIANT_ID_RE = /^gid:\/\/shopify\/ProductVariant\/\d{1,20}$/;
const MAX_VARIANT_IDS = 50;
const MAX_BODY_BYTES = 8192;
const UPSTREAM_TIMEOUT_MS = 8000;

// The storefront asks for stock on every product view, quantity change and
// cart update, so this has to leave room for a busy shopper on a drop day.
const takeRateLimitSlot = createRateLimiter({ max: 300, windowMs: 10 * 60 * 1000 });

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
        return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (error) {
        return res.status(400).json({ error: 'Invalid request body.' });
    }

    const requestedIds = body?.variantIds;
    if (!Array.isArray(requestedIds)) {
        return res.status(400).json({ error: 'At least one variant ID is required.' });
    }

    // Anything that is not a variant ID is dropped rather than failing the
    // whole lookup, so one stale cart entry cannot hide stock for the rest.
    const variantIds = [...new Set(
        requestedIds.filter(id => typeof id === 'string' && VARIANT_ID_RE.test(id))
    )].slice(0, MAX_VARIANT_IDS);
    if (variantIds.length === 0) {
        return res.status(400).json({ error: 'At least one variant ID is required.' });
    }

    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const storefrontToken = process.env.SHOPIFY_STOREFRONT_INVENTORY_TOKEN || process.env.SHOPIFY_STOREFRONT_TOKEN;
    if (!adminToken && !storefrontToken) {
        console.error('Inventory API is not configured. Add SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STOREFRONT_INVENTORY_TOKEN.');
        return res.status(503).json({ error: 'Inventory lookup is unavailable.' });
    }

    try {
        const payload = adminToken
            ? await fetchAdminInventory(variantIds, adminToken)
            : await fetchStorefrontInventory(variantIds, storefrontToken);
        return res.status(200).json(payload);
    } catch (error) {
        // Shopify's error text can describe the store's setup, so it goes
        // to the function logs and never to the caller.
        console.error('Inventory API error:', error);
        return res.status(502).json({ error: 'Unable to fetch inventory.' });
    }
}

async function fetchAdminInventory(variantIds, token) {
    const query = `
        query GetVariantInventory($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on ProductVariant {
                    id
                    sellableOnlineQuantity
                    inventoryQuantity
                    inventoryPolicy
                }
            }
        }
    `;

    const data = await runGraphqlRequest({
        url: `https://${DEFAULT_DOMAIN}/admin/api/${DEFAULT_ADMIN_VERSION}/graphql.json`,
        tokenHeader: 'X-Shopify-Access-Token',
        token,
        query,
        variables: { ids: variantIds }
    });

    return {
        source: 'admin',
        items: (data.nodes || []).filter(Boolean).map(node => {
            const quantityAvailable = Number.isFinite(node.sellableOnlineQuantity)
                ? node.sellableOnlineQuantity
                : (Number.isFinite(node.inventoryQuantity) ? node.inventoryQuantity : null);
            const allowsBackorder = node.inventoryPolicy === 'CONTINUE';

            return {
                id: node.id,
                availableForSale: allowsBackorder || (Number.isFinite(quantityAvailable) ? quantityAvailable > 0 : true),
                currentlyNotInStock: allowsBackorder && (!Number.isFinite(quantityAvailable) || quantityAvailable <= 0),
                quantityAvailable
            };
        })
    };
}

async function fetchStorefrontInventory(variantIds, token) {
    const query = `
        query GetVariantInventory($ids: [ID!]!) {
            nodes(ids: $ids) {
                ... on ProductVariant {
                    id
                    availableForSale
                    currentlyNotInStock
                    quantityAvailable
                }
            }
        }
    `;

    const data = await runGraphqlRequest({
        url: `https://${DEFAULT_DOMAIN}/api/${DEFAULT_STOREFRONT_VERSION}/graphql.json`,
        tokenHeader: 'X-Shopify-Storefront-Access-Token',
        token,
        query,
        variables: { ids: variantIds }
    });

    return {
        source: 'storefront-server',
        items: (data.nodes || []).filter(Boolean)
    };
}

async function runGraphqlRequest({ url, tokenHeader, token, query, variables }) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            [tokenHeader]: token
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Shopify request failed with ${response.status}: ${responseText}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
        throw new Error(payload.errors[0]?.message || 'Shopify inventory query failed.');
    }

    return payload.data || {};
}
