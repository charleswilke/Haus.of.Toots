# Shopify API Troubleshooting Guide

## 🔴 401 Unauthorized Error

If you're seeing a **401 Unauthorized** error, it means the API request is being rejected. Here's how to fix it:

### Step 1: Verify Your Shopify Domain

1. Log into your Shopify Admin
2. Go to **Settings** → **Domains**
3. Find your **myshopify.com** domain (NOT your custom domain)
4. It should look like: `your-store-name.myshopify.com`
5. Update `shopify-config.js` line 4 with the EXACT domain (no https://, no trailing slash)

**Example:**
```javascript
domain: 'haus-of-toots.myshopify.com',  // ✅ Correct
domain: 'https://haus-of-toots.myshopify.com',  // ❌ Wrong
domain: 'haus-of-toots.myshopify.com/',  // ❌ Wrong
```

### Step 2: Verify Your Storefront API Token

1. In Shopify Admin, go to **Settings** → **Apps and sales channels**
2. Click **Develop apps** (or **Manage private apps** in older Shopify)
3. Find your Storefront API app, or create a new one
4. Go to **API credentials** → **Storefront API**
5. Copy the **Storefront API access token**
6. Update `shopify-config.js` line 7 with the token

**Important:** Make sure you're using the **Storefront API** token, NOT the Admin API token!

### Step 3: Enable Storefront API

1. In Shopify Admin, go to **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Name it something like "Storefront API Integration"
4. Go to **Configuration** → **Storefront API**
5. Enable the following scopes:
   - ✅ `unauthenticated_read_product_listings`
   - ✅ `unauthenticated_read_checkouts`
   - ✅ `unauthenticated_write_checkouts`
6. Click **Save**
7. Go to **API credentials** → **Storefront API**
8. Click **Install app** if needed
9. Copy the **Storefront API access token**

### Step 4: Check API Version

The current API version is set to `2024-10`. If this doesn't work:

1. Check Shopify's [API versioning page](https://shopify.dev/docs/api/usage/versioning)
2. Try using `2024-01` or `2023-10` instead
3. Update `shopify-config.js` line 10

### Step 5: Test the API Directly

Open your browser console and run:

```javascript
fetch('https://YOUR-DOMAIN.myshopify.com/api/2024-10/graphql.json', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': 'YOUR-TOKEN'
  },
  body: JSON.stringify({
    query: '{ shop { name } }'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Replace `YOUR-DOMAIN` and `YOUR-TOKEN` with your actual values.

If this works, you should see `{ data: { shop: { name: "..." } } }`.

---

## 🔴 404 Not Found Error

If you're seeing a **404 Not Found** error:

1. **Check the domain** - Make sure it's exactly `your-store.myshopify.com`
2. **Check the API version** - Try `2024-01` or `2023-10` if `2024-10` doesn't work
3. **Check the URL format** - Should be: `https://domain.myshopify.com/api/VERSION/graphql.json`

---

## 🔴 CORS Errors

If you see CORS (Cross-Origin Resource Sharing) errors:

- Storefront API should work from any domain
- If you're still getting CORS errors, check that you're using the Storefront API (not Admin API)
- Make sure you're not trying to use the secret key in client-side code

---

## 🔴 No Products Showing

If the API works but no products show:

1. **Check that products are published** in Shopify
2. **Check product availability** - Make sure they're available for sale
3. **Check product visibility** - Products must be visible in the Online Store channel
4. **Check variants** - Each product needs at least one variant

---

## 🛠️ Quick Debug Checklist

- [ ] Domain is correct in `shopify-config.js` (no https://, no trailing slash)
- [ ] Storefront API token is correct (not the Admin API token)
- [ ] Storefront API is enabled in Shopify Admin
- [ ] Products are published and available
- [ ] API version is valid (try `2024-01` if `2024-10` doesn't work)
- [ ] Browser console shows the correct endpoint URL
- [ ] No typos in the domain or token

---

## 📞 Still Having Issues?

1. **Check the browser console** - Look for the exact error message
2. **Check Network tab** - See the actual HTTP request/response
3. **Verify in Shopify Admin** - Make sure the Storefront API app is installed
4. **Try a different API version** - Some stores might not have the latest version enabled

---

## 🔐 Security Note

The Storefront API token is **safe to use in client-side code**. It's designed to be public. However:

- ❌ **Never** use the Admin API secret key in client-side code
- ✅ **Always** use the Storefront API token for frontend integrations
- ✅ The token you have (`3a2faa1757d00e6a7e2ede3480592555`) looks like a Storefront API token

---

## ✅ Success Indicators

When everything is working correctly, you should see:

1. Products loading in the shop page
2. No errors in the browser console
3. Network requests returning `200 OK` status
4. GraphQL responses with product data


