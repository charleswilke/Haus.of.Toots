# Haus of Toots 🧵

Custom Needlepoint Canvases, Made Just for You

## About

A charming, interactive website for Jessie Toots' custom needlepoint canvas designs. Features delightful animations including scroll-stitching effects, needle hover states, cursor trails, and an animated winking house logo.

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

## Deployment

### Setting up GitHub Actions for DreamHost

This site includes automatic deployment to DreamHost via SFTP using GitHub Actions.

#### Required Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. `SFTP_SERVER` - Your DreamHost SFTP server: `chawil155.dreamhosters.com`
2. `SFTP_USERNAME` - Your SFTP username: `jessieToots`
3. `SFTP_PASSWORD` - Your SFTP password (the one you set for the jessieToots user)

#### How it Works

1. Push changes to the `main` branch
2. GitHub Actions automatically triggers the deployment workflow
3. Files are uploaded to your DreamHost server via SFTP to `/home/jessieToots/hausoftoots.com/`
4. Your site is live at hausoftoots.com!

You can also manually trigger deployment from the Actions tab in GitHub.

### Manual Deployment

If you prefer to deploy manually:

1. Connect to your DreamHost server via SFTP:
   - Host: `chawil155.dreamhosters.com`
   - Username: `jessieToots`
   - Port: 21 (FTPS)
   - Remote directory: `/home/jessieToots/hausoftoots.com/`
2. Upload all files (`index.html`, `styles.css`, `script.js`, and the `images` folder)
3. Your site is ready!

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
--coral-light: #FFB3BA;
--coral-dark: #E85563;
--cream: #FAF8F5;
--linen: #F5F1EC;
```

### Google Form

Update the Google Form URL in `index.html` (line with the Request Form button href).

### Gallery Images

Replace the placeholder SVG content in the gallery items with your actual needlepoint design images.

### Instagram Handle

Update the Instagram link in the footer section if needed.

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

**Design & Development:** Built with love for Jessie Toots  
**Brand Identity:** Haus of Toots  
**Instagram:** [@haus.of.toots](https://instagram.com/haus.of.toots)

---

Made with ♥ and lots of X's

