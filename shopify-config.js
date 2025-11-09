// Shopify Storefront API Configuration
const SHOPIFY_CONFIG = {
    // Your store's myshopify.com domain (without https://)
    domain: 'haus-of-toots.myshopify.com', // Update this with Jessie's actual store domain
    
    // Storefront API Access Token (public - safe for client-side)
    storefrontToken: '8af3c2d4e2a79d6d1e5b7737f290c135',
    
    // API Version (try '2024-01' or '2023-10' if '2024-10' doesn't work)
    apiVersion: '2024-01',
    
    // Build the GraphQL endpoint URL
    get endpoint() {
        return `https://${this.domain}/api/${this.apiVersion}/graphql.json`;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SHOPIFY_CONFIG;
}

