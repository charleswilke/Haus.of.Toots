# Haus of Toots 🧵

Custom Needlepoint Canvases, Made Just for You

## About

A charming, interactive website for Jessie Wilke's custom needlepoint canvas designs. Features delightful animations including scroll-stitching effects, needle hover states, cursor trails, and an animated winking house logo.

## Features

✨ **Interactive Animations**
- Scroll-stitch sidebar that follows your scrolling
- Needle hover effects on buttons and links
- Cursor trail with stitching effect
- Animated logo with winking eye and smoke puffs
- Embroidery hoop gallery carousel

🎨 **Design Elements**
- Custom SVG house logo based on brand identity
- Coral and cream color palette inspired by brand
- Cross-stitch pattern backgrounds
- Stitched borders and decorative elements

♿ **Accessibility**
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Respects `prefers-reduced-motion` preference
- Skip-to-content link

📱 **Responsive Design**
- Mobile-first approach
- Optimized for all screen sizes
- Touch-friendly interactive elements

## Local Development

No build process required! Simply:

1. Clone this repository
2. Open `index.html` in your browser
3. Make changes and refresh to see updates

For a better development experience with live reload, you can use a simple local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

## Customization

### Colors

The color palette is defined in CSS variables in `styles.css`:

```css
--coral-primary: #FF6B7A;
--coral-light: #FF8497;
--coral-dark: #E85563;
--teal-contrast: #1F6F78; /* Complementary teal for contrast headings/text */
--cream: #FAF8F5;
--linen: #F5F1EC;
```

Gallery page buttons use:
```css
--btn-accent: #FF836F;  /* Peachy coral for gallery buttons */
--btn-dark: #E86F5D;    /* Hover state */
```

Additional color palette (Analogous scheme):
```css
#FFB7C2  /* Light pink */
#FF8497  /* Medium pink */
#D97EAE  /* Medium purple-pink */
#F74560  /* Vibrant red-pink */
#F06F51  /* Orange-red */
#1F6F78  /* Deep teal (complementary contrast to coral) */
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance

- Pure HTML/CSS/JavaScript (no frameworks)
- Lightweight (~50KB total)
- Optimized animations with `requestAnimationFrame`
- Respects user preferences for reduced motion

## Credits

**Design & Development:** Built with love for Jessie Wilke  
**Brand Identity:** Haus of Toots  
**Instagram:** [@haus.of.toots](https://instagram.com/haus.of.toots)

---

Made with ♥ and lots of X's

