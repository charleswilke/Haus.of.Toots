// ===================================
// SHOPIFY STOREFRONT API CLIENT
// ===================================

class ShopifyClient {
    constructor(config) {
        this.config = config;
        this.inventorySource = 'unknown';
    }

    getProductListingUrl(handle) {
        if (!handle) {
            return null;
        }

        return `https://${this.config.domain}/products/${encodeURIComponent(handle)}`;
    }

    async fetchRaw(query, variables = {}) {
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

            return response.json();
        } catch (error) {
            console.error('Shopify API Error:', error);
            throw error;
        }
    }

    /**
     * Make a GraphQL request to Shopify Storefront API
     */
    async fetch(query, variables = {}) {
        const json = await this.fetchRaw(query, variables);

        if (json.errors) {
            console.error('GraphQL Errors:', json.errors);
            const errorMessage = json.errors[0]?.message || 'GraphQL request failed';
            throw new Error(`GraphQL Error: ${errorMessage}`);
        }

        return json.data;
    }

    /**
     * Get all products from the store
     */
    async getProducts(first = 24) {
        const query = `
            query GetProducts($first: Int!) {
                products(first: $first) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            id
                            handle
                            title
                            description
                            descriptionHtml
                            productType
                            updatedAt
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
                                        currentlyNotInStock
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
     * Get a single page of products from the store
     */
    async getProductsPage(first = 50, after = null) {
        const query = `
            query GetProductsPage($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    edges {
                        node {
                            id
                            handle
                            title
                            description
                            descriptionHtml
                            productType
                            updatedAt
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
                                        currentlyNotInStock
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

        const data = await this.fetch(query, { first, after });
        return {
            products: data.products.edges.map(edge => edge.node),
            pageInfo: data.products.pageInfo
        };
    }

    /**
     * Get every product from the store via pagination
     */
    async getAllProducts(pageSize = 50) {
        const products = [];
        let hasNextPage = true;
        let after = null;

        while (hasNextPage) {
            const page = await this.getProductsPage(pageSize, after);
            products.push(...page.products);
            hasNextPage = Boolean(page.pageInfo?.hasNextPage);
            after = page.pageInfo?.endCursor || null;
        }

        return products;
    }

    /**
     * Get products for a specific collection handle
     */
    async getCollectionProducts(handle, first = 50) {
        const query = `
            query GetCollectionProducts($handle: String!, $first: Int!) {
                collection(handle: $handle) {
                    id
                    title
                    handle
                    products(first: $first) {
                        edges {
                            node {
                                id
                                handle
                                title
                                description
                                descriptionHtml
                                productType
                            updatedAt
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
                                            currentlyNotInStock
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
            }
        `;

        const data = await this.fetch(query, { handle, first });
        return data.collection?.products?.edges?.map(edge => edge.node) || null;
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
                                currentlyNotInStock
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
                                currentlyNotInStock
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

    async getVariantInventoryByIds(variantIds) {
        const normalizedIds = [...new Set((variantIds || []).filter(Boolean))];
        if (normalizedIds.length === 0) {
            return {};
        }

        if (this.inventorySource !== 'server') {
            try {
                const storefrontInventory = await this.getVariantInventoryFromStorefront(normalizedIds);
                this.inventorySource = 'storefront';
                return storefrontInventory;
            } catch (error) {
                if (!this.shouldFallbackToServerInventory(error)) {
                    throw error;
                }

                try {
                    const serverInventory = await this.getVariantInventoryFromServer(normalizedIds);
                    this.inventorySource = 'server';
                    return serverInventory;
                } catch (serverError) {
                    if (error.partialInventory && Object.keys(error.partialInventory).length > 0) {
                        this.inventorySource = 'storefront';
                        return error.partialInventory;
                    }

                    throw serverError;
                }
            }
        }

        try {
            return await this.getVariantInventoryFromServer(normalizedIds);
        } catch (error) {
            this.inventorySource = 'unknown';
            try {
                const storefrontInventory = await this.getVariantInventoryFromStorefront(normalizedIds);
                this.inventorySource = 'storefront';
                return storefrontInventory;
            } catch (storefrontError) {
                if (storefrontError.partialInventory && Object.keys(storefrontError.partialInventory).length > 0) {
                    this.inventorySource = 'storefront';
                    return storefrontError.partialInventory;
                }

                throw error;
            }
        }
    }

    async getVariantInventoryFromStorefront(variantIds) {
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

        const json = await this.fetchRaw(query, { ids: variantIds });
        const partialInventory = this.mapInventoryNodes(json.data?.nodes || [], 'storefront');

        if (json.errors?.length) {
            const inventoryError = new Error(json.errors[0]?.message || 'Unable to read Shopify inventory.');
            inventoryError.code = 'SHOPIFY_INVENTORY_SCOPE_MISSING';
            inventoryError.graphQLErrors = json.errors;
            inventoryError.partialInventory = partialInventory;

            if (this.shouldFallbackToServerInventory(inventoryError)) {
                throw inventoryError;
            }

            console.error('GraphQL Errors:', json.errors);
            throw inventoryError;
        }

        return partialInventory;
    }

    async getVariantInventoryFromServer(variantIds) {
        const response = await fetch('/api/shopify/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ variantIds })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload?.error || 'Unable to fetch inventory from the server.');
        }

        return this.mapInventoryNodes(payload.items || [], payload.source || 'server');
    }

    mapInventoryNodes(nodes, source = 'unknown') {
        return (nodes || []).reduce((result, node) => {
            if (!node?.id) {
                return result;
            }

            result[node.id] = normalizeInventoryRecord({
                id: node.id,
                availableForSale: node.availableForSale,
                currentlyNotInStock: node.currentlyNotInStock,
                quantityAvailable: node.quantityAvailable,
                source
            });

            return result;
        }, {});
    }

    shouldFallbackToServerInventory(error) {
        if (!error) {
            return false;
        }

        const graphQLErrors = error.graphQLErrors || [];
        return graphQLErrors.some(graphQLError => {
            const requiredAccess = graphQLError?.extensions?.requiredAccess || '';
            const message = graphQLError?.message || error.message || '';
            return requiredAccess.includes('unauthenticated_read_product_inventory')
                || message.includes('unauthenticated_read_product_inventory')
                || message.includes('quantityAvailable');
        });
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

    getVariantQuantity(variantId) {
        const item = this.items.find(cartItem => cartItem.variantId === variantId);
        return item ? item.quantity : 0;
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

function normalizeInventoryRecord(record = {}) {
    const quantityAvailable = Number.isFinite(record.quantityAvailable)
        ? Math.max(0, Math.floor(record.quantityAvailable))
        : null;

    return {
        id: record.id || null,
        availableForSale: record.availableForSale !== false,
        currentlyNotInStock: Boolean(record.currentlyNotInStock),
        quantityAvailable,
        source: record.source || 'unknown',
        checkedAt: Date.now(),
        error: record.error || null
    };
}

function getVariantInventoryLimit(record) {
    if (!record) {
        return null;
    }

    if (record.availableForSale === false) {
        return 0;
    }

    if (record.currentlyNotInStock) {
        return null;
    }

    return Number.isFinite(record.quantityAvailable) ? record.quantityAvailable : null;
}

function getInventoryPresentation(record, quantity = 1, context = 'cart') {
    if (!record) {
        return {
            limit: null,
            canIncrease: true,
            message: '',
            tone: 'neutral'
        };
    }

    const limit = getVariantInventoryLimit(record);

    if (limit === null) {
        return {
            limit,
            canIncrease: record.availableForSale !== false,
            message: record.error ? 'Live stock is temporarily unavailable.' : '',
            tone: record.error ? 'warning' : 'neutral'
        };
    }

    if (limit <= 0 || record.availableForSale === false) {
        return {
            limit: 0,
            canIncrease: false,
            message: 'Sold out.',
            tone: 'error'
        };
    }

    if (quantity > limit) {
        return {
            limit,
            canIncrease: false,
            message: `Only ${limit} available. Reduce quantity to continue.`,
            tone: 'error'
        };
    }

    if (quantity === limit) {
        return {
            limit,
            canIncrease: false,
            message: context === 'modal' ? `Only ${limit} available.` : `Max ${limit} available in cart.`,
            tone: 'warning'
        };
    }

    if (limit <= 5) {
        return {
            limit,
            canIncrease: true,
            message: `Only ${limit} left.`,
            tone: 'warning'
        };
    }

    return {
        limit,
        canIncrease: true,
        message: '',
        tone: 'neutral'
    };
}

class InventoryManager {
    constructor(client, cacheTtlMs = 15000) {
        this.client = client;
        this.cacheTtlMs = cacheTtlMs;
        this.cache = new Map();
    }

    async getVariantInventory(variantId, options = {}) {
        const inventoryMap = await this.getVariantInventoryMap([variantId], options);
        return inventoryMap[variantId] || null;
    }

    async getVariantInventoryMap(variantIds, { forceRefresh = false } = {}) {
        const ids = [...new Set((variantIds || []).filter(Boolean))];
        const results = {};
        const uncachedIds = [];

        ids.forEach(id => {
            const cached = this.cache.get(id);
            if (!forceRefresh && cached && (Date.now() - cached.checkedAt) < this.cacheTtlMs) {
                results[id] = cached;
                return;
            }

            uncachedIds.push(id);
        });

        if (uncachedIds.length > 0) {
            try {
                const freshInventory = await this.client.getVariantInventoryByIds(uncachedIds);
                uncachedIds.forEach(id => {
                    const normalizedRecord = normalizeInventoryRecord(
                        freshInventory[id] || { id, error: 'Inventory unavailable.' }
                    );
                    this.cache.set(id, normalizedRecord);
                    results[id] = normalizedRecord;
                });
            } catch (error) {
                console.error('Inventory lookup failed:', error);
                uncachedIds.forEach(id => {
                    const fallbackRecord = normalizeInventoryRecord({
                        id,
                        error: error.message || 'Inventory unavailable.'
                    });
                    this.cache.set(id, fallbackRecord);
                    results[id] = fallbackRecord;
                });
            }
        }

        return results;
    }
}

// ===================================
// INITIALIZE GLOBAL INSTANCES
// ===================================

const shopifyClient = new ShopifyClient(SHOPIFY_CONFIG);
const cartManager = new CartManager();
const inventoryManager = new InventoryManager(shopifyClient);

