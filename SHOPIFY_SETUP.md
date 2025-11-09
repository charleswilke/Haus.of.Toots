# Shopify Integration Setup Guide

## 🎉 Your Shopify integration is ready!

This guide will help you complete the setup and start selling Jessie's digital products.

---

## ⚠️ IMPORTANT: Required Configuration

### 1. Update Your Shopify Domain

Open `shopify-config.js` and update line 3 with Jessie's actual Shopify store domain:

```javascript
domain: 'hausoftoots.myshopify.com',  // Replace with actual domain
```

**How to find your Shopify domain:**
- Log into Shopify Admin
- Go to Settings → Domains
- Look for the `.myshopify.com` domain (NOT the custom domain)
- Example: `jessies-shop-123.myshopify.com`

---

## 🔑 API Credentials (Already Configured)

The following credentials are already set up in `shopify-config.js`:

- **Storefront API Token:** `3a2faa1757d00e6a7e2ede3480592555`
- **API Version:** `2024-10`

---

## 📁 Files Created

### Core Files
- **`shopify-config.js`** - API configuration
- **`shopify.js`** - Shopify client and cart manager
- **`shop.html`** - Shop page HTML
- **`shop-styles.css`** - Shop page styles
- **`shop-app.js`** - Shop page application logic

### Updated Files
- **`index.html`** - Added shop navigation links
- **`styles.css`** - Added button and footer styles

---

## 🚀 How It Works

### Product Display
1. When visitors open `shop.html`, products are fetched from Shopify
2. Products display with images, titles, descriptions, and prices
3. Visitors can add products to their cart

### Shopping Cart
1. Cart is stored locally in the browser (localStorage)
2. Visitors can adjust quantities or remove items
3. Cart persists between page visits

### Checkout Process
1. When ready to checkout, the app creates a Shopify checkout
2. Visitors are redirected to Shopify's hosted checkout page
3. Shopify handles payment processing and digital delivery
4. No custom payment handling needed!

---

## 🎨 Features

### ✅ What's Included
- Beautiful product grid matching your site design
- Responsive cart drawer
- Local cart storage (persists in browser)
- Shopify-hosted checkout (secure payment processing)
- Digital product delivery (handled by Shopify)
- Loading states and error handling
- Mobile-friendly design

### 🔐 Security
- All API calls use the Storefront API (public, safe for client-side)
- Checkout handled by Shopify (PCI compliant)
- No sensitive data stored in browser

---

## 🛍️ Setting Up Products in Shopify

To ensure products work correctly:

1. **Digital Products:**
   - Install the "Digital Downloads" app in Shopify
   - Attach digital files to products
   - Shopify will automatically deliver files after purchase

2. **Product Requirements:**
   - Each product must have at least one variant
   - Set variant availability
   - Add product images (recommended)
   - Write clear descriptions

3. **Testing:**
   - Use Shopify's test mode for checkout testing
   - Test the complete purchase flow
   - Verify digital delivery works

---

## 🧪 Testing Your Integration

### Local Testing
1. Open `shop.html` in a browser
2. Products should load (if domain is configured correctly)
3. Test adding items to cart
4. Test cart functionality (add, remove, update quantities)

### Checkout Testing
1. Add products to cart
2. Click "Proceed to Checkout"
3. You'll be redirected to Shopify checkout
4. Use Shopify's test card numbers to test payments

---

## 🐛 Troubleshooting

### Products Not Loading?
- ✅ Check browser console (F12) for errors
- ✅ Verify domain in `shopify-config.js` is correct
- ✅ Ensure Storefront API is enabled in Shopify
- ✅ Verify the API token is correct

### Checkout Not Working?
- ✅ Ensure products have variants
- ✅ Check that products are marked as "available"
- ✅ Verify Shopify store is not in password-protected mode

### Cart Issues?
- ✅ Check browser localStorage (may be disabled in private mode)
- ✅ Clear browser cache and localStorage
- ✅ Check browser console for JavaScript errors

---

## 📱 Mobile Support

The shop is fully responsive and works great on:
- Desktop browsers
- Tablets
- Mobile phones

Test on multiple devices to ensure everything looks perfect!

---

## 🎯 Next Steps

1. **Update the domain** in `shopify-config.js` (REQUIRED!)
2. Add products to your Shopify store
3. Test the complete shopping experience
4. Deploy your site
5. Start selling! 🎉

---

## 💡 Tips for Success

- **Product Photos:** Use high-quality, square images (1:1 ratio)
- **Descriptions:** Write clear, detailed product descriptions
- **Pricing:** Ensure prices are set correctly in Shopify
- **Digital Delivery:** Test the digital download flow thoroughly
- **Mobile Testing:** Always test on real mobile devices

---

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Shopify settings
3. Test with a simple product first
4. Check Shopify's Storefront API documentation

---

## 🔄 Updates & Maintenance

### To Update Products
Just update them in Shopify! Changes appear automatically on your site.

### To Update Styles
Edit `shop-styles.css` to match your brand.

### To Update Functionality
Edit `shop-app.js` for behavior changes.

---

**Happy Selling! 🎊**

