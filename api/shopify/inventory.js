const DEFAULT_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'haus-of-toots.myshopify.com';
const DEFAULT_STOREFRONT_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || '2025-10';
const DEFAULT_ADMIN_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-10';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const variantIds = [...new Set((body.variantIds || []).filter(Boolean))].slice(0, 50);

        if (variantIds.length === 0) {
            return res.status(400).json({ error: 'At least one variant ID is required.' });
        }

        const payload = await fetchInventoryPayload(variantIds);
        return res.status(200).json(payload);
    } catch (error) {
        console.error('Inventory API error:', error);
        return res.status(500).json({ error: error.message || 'Unable to fetch inventory.' });
    }
};

async function fetchInventoryPayload(variantIds) {
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (adminToken) {
        return fetchAdminInventory(variantIds, adminToken);
    }

    const storefrontToken = process.env.SHOPIFY_STOREFRONT_INVENTORY_TOKEN || process.env.SHOPIFY_STOREFRONT_TOKEN;
    if (storefrontToken) {
        return fetchStorefrontInventory(variantIds, storefrontToken);
    }

    throw new Error('Shopify inventory endpoint is not configured. Add SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STOREFRONT_INVENTORY_TOKEN.');
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
        body: JSON.stringify({ query, variables })
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
