// ===================================
// SHOPIFY STOREFRONT API CLIENT
// ===================================

class ShopifyClient {
    constructor(config) {
        this.config = config;
    }

    /**
     * Make a GraphQL request to Shopify Storefront API
     */
    async fetch(query, variables = {}) {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': this.config.storefrontToken
                },
                body: JSON.stringify({ query, variables })
            });

            // Check HTTP status first
            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP Error:', response.status, response.statusText);
                console.error('Response:', errorText);
                
                if (response.status === 401) {
                    throw new Error('Unauthorized: Check your Shopify domain and Storefront API token. Make sure the Storefront API is enabled in your Shopify admin.');
                } else if (response.status === 404) {
                    throw new Error(`Store not found: Check that the domain "${this.config.domain}" is correct.`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }

            const json = await response.json();

            // Check for GraphQL errors
            if (json.errors) {
                console.error('GraphQL Errors:', json.errors);
                const errorMessage = json.errors[0]?.message || 'GraphQL request failed';
                throw new Error(`GraphQL Error: ${errorMessage}`);
            }

            return json.data;
        } catch (error) {
            console.error('Shopify API Error:', error);
            throw error;
        }
    }

    /**
     * Get all products from the store
     */
    async getProducts(first = 24) {
        const query = `
            query GetProducts($first: Int!) {
                products(first: $first) {
                    edges {
                        node {
                            id
                            handle
                            title
                            description
                            descriptionHtml
                            productType
                            tags
                            images(first: 1) {
                                edges {
                                    node {
                                        url
                                        altText
                                        transformedSrc(maxWidth: 400, maxHeight: 400, crop: CENTER)
                                    }
                                }
                            }
                            variants(first: 50) {
                                edges {
                                    node {
                                        id
                                        title
                                        availableForSale
                                        priceV2 {
                                            amount
                                            currencyCode
                                        }
                                        selectedOptions {
                                            name
                                            value
                                        }
                                    }
                                }
                            }
                            priceRange {
                                minVariantPrice {
                                    amount
                                    currencyCode
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await this.fetch(query, { first });
        return data.products.edges.map(edge => edge.node);
    }

    /**
     * Get a single product by handle with full details
     */
    async getProductByHandle(handle) {
        const query = `
            query GetProductByHandle($handle: String!) {
                product(handle: $handle) {
                    id
                    handle
                    title
                    description
                    descriptionHtml
                    productType
                    tags
                    vendor
                    images(first: 10) {
                        edges {
                            node {
                                url
                                altText
                                width
                                height
                                transformedSrc(maxWidth: 400, maxHeight: 400, crop: CENTER)
                            }
                        }
                    }
                    variants(first: 50) {
                        edges {
                            node {
                                id
                                title
                                availableForSale
                                priceV2 {
                                    amount
                                    currencyCode
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                    }
                    priceRange {
                        minVariantPrice {
                            amount
                            currencyCode
                        }
                        maxVariantPrice {
                            amount
                            currencyCode
                        }
                    }
                    seo {
                        title
                        description
                    }
                }
            }
        `;

        const data = await this.fetch(query, { handle });
        return data.product;
    }

    /**
     * Get a single product by ID with full details
     */
    async getProductById(id) {
        const query = `
            query GetProductById($id: ID!) {
                product(id: $id) {
                    id
                    handle
                    title
                    description
                    descriptionHtml
                    productType
                    tags
                    vendor
                    images(first: 10) {
                        edges {
                            node {
                                url
                                altText
                                width
                                height
                                transformedSrc(maxWidth: 400, maxHeight: 400, crop: CENTER)
                            }
                        }
                    }
                    variants(first: 50) {
                        edges {
                            node {
                                id
                                title
                                availableForSale
                                priceV2 {
                                    amount
                                    currencyCode
                                }
                                selectedOptions {
                                    name
                                    value
                                }
                            }
                        }
                    }
                    priceRange {
                        minVariantPrice {
                            amount
                            currencyCode
                        }
                        maxVariantPrice {
                            amount
                            currencyCode
                        }
                    }
                    seo {
                        title
                        description
                    }
                }
            }
        `;

        const data = await this.fetch(query, { id });
        return data.product;
    }

    /**
     * Create a cart and get checkout URL
     */
    async createCheckout(lineItems) {
        const mutation = `
            mutation CartCreate($input: CartInput!) {
                cartCreate(input: $input) {
                    cart {
                        id
                        checkoutUrl
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        // Convert lineItems format for Cart API
        const cartInput = {
            lines: lineItems.map(item => ({
                merchandiseId: item.variantId,
                quantity: item.quantity
            }))
        };

        const data = await this.fetch(mutation, { input: cartInput });
        
        if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
            const error = data.cartCreate.userErrors[0];
            throw new Error(error.message);
        }

        // Return in same format as before for compatibility
        return {
            id: data.cartCreate.cart.id,
            webUrl: data.cartCreate.cart.checkoutUrl
        };
    }
}

// ===================================
// CART MANAGER
// ===================================

class CartManager {
    constructor() {
        this.storageKey = 'hausoftoots_cart';
        this.items = this.loadCart();
        this.listeners = [];
    }

    /**
     * Load cart from localStorage
     */
    loadCart() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    /**
     * Save cart to localStorage
     */
    saveCart() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
            this.notifyListeners();
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    /**
     * Add item to cart
     */
    addItem(product, variantId, quantity = 1) {
        const existingItem = this.items.find(item => item.variantId === variantId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Find the selected variant to get its details
            const selectedVariant = product.variants?.edges?.find(v => v.node.id === variantId)?.node;
            
            // Build variant info string from all selected options
            let variantInfo = '';
            if (selectedVariant?.selectedOptions && selectedVariant.selectedOptions.length > 0) {
                variantInfo = selectedVariant.selectedOptions
                    .map(opt => `${opt.name}: ${opt.value}`)
                    .join(', ');
            } else if (selectedVariant?.title) {
                variantInfo = selectedVariant.title;
            }

            this.items.push({
                variantId,
                productId: product.id,
                productTitle: product.title,
                productImage: product.images?.edges?.[0]?.node?.url,
                price: selectedVariant?.priceV2 || product.variants?.edges?.[0]?.node?.priceV2,
                variantInfo: variantInfo,
                quantity
            });
        }

        this.saveCart();
    }

    /**
     * Remove item from cart
     */
    removeItem(variantId) {
        this.items = this.items.filter(item => item.variantId !== variantId);
        this.saveCart();
    }

    /**
     * Update item quantity
     */
    updateQuantity(variantId, quantity) {
        const item = this.items.find(item => item.variantId === variantId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(variantId);
            } else {
                item.quantity = quantity;
                this.saveCart();
            }
        }
    }

    /**
     * Clear entire cart
     */
    clearCart() {
        this.items = [];
        this.saveCart();
    }

    /**
     * Get all cart items
     */
    getItems() {
        return this.items;
    }

    /**
     * Get total item count
     */
    getTotalItems() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * Get cart total price
     */
    getTotalPrice() {
        return this.items.reduce((total, item) => {
            return total + (parseFloat(item.price.amount) * item.quantity);
        }, 0);
    }

    /**
     * Get currency code
     */
    getCurrency() {
        return this.items.length > 0 ? this.items[0].price.currencyCode : 'USD';
    }

    /**
     * Subscribe to cart changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of cart changes
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.items));
    }
}

// ===================================
// INITIALIZE GLOBAL INSTANCES
// ===================================

const shopifyClient = new ShopifyClient(SHOPIFY_CONFIG);
const cartManager = new CartManager();

