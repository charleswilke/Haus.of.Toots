# Card Back Implementation

This document describes the flip card back feature that was implemented for the gallery cards. This feature can be re-enabled in the future if desired.

## Overview

Each gallery card had two faces:
- **Front**: Shows the image, title, subtitle, and category badge
- **Back**: Shows the Haus of Toots logo, title, category, description, and a "View Full Size" button

## How It Worked

### HTML Structure (in `card-gallery.js` `createCardElement()`)

```html
<div class="gallery-card">
    <div class="card-face card-front">
        <div class="card-image-container">
            <img class="card-image" src="..." alt="...">
            <div class="card-category-badge">Category Name</div>
        </div>
        <div class="card-info">
            <h3 class="card-title">Title</h3>
            <p class="card-subtitle">Subtitle</p>
        </div>
        <div class="flip-hint">Tap to flip</div>
    </div>
    <div class="card-face card-back">
        <div class="card-back-content">
            <img class="card-back-logo" src="images/hauslogo.png" alt="Haus of Toots">
            <h3 class="card-back-title">Title</h3>
            <p class="card-back-category">Category Name</p>
            <p class="card-back-description">Category description text</p>
            <button class="card-back-cta" data-src="full-image.jpg">View Full Size</button>
        </div>
    </div>
</div>
```

### CSS Classes (in `card-gallery.css`)

Key classes for the flip animation:

```css
/* Card faces share common styles */
.card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 16px;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
}

/* Front face */
.card-front {
    background: linear-gradient(145deg, #FAF8F5 0%, #F5F1EC 100%);
    z-index: 2;
}

/* Back face - rotated 180deg by default */
.card-back {
    background: linear-gradient(145deg, #3D3633 0%, #2D2926 100%);
    transform: rotateY(180deg);
}

/* When card is flipped */
.gallery-card.flipped {
    transform: rotateY(180deg);
}

/* Flip animations */
.gallery-card.flipping .card-front {
    animation: frontFadeOut 0.5s ease-in-out forwards;
}

.gallery-card.flipping-back .card-front {
    animation: frontFadeIn 0.5s ease-in-out forwards;
}
```

### JavaScript Logic (in `card-gallery.js`)

The `flipCard()` method handled the flip:

```javascript
flipCard(card) {
    // Only flip active cards or masonry cards
    if (!card.classList.contains('active') && !card.classList.contains('masonry-card')) return;
    if (card.classList.contains('flipping') || card.classList.contains('flipping-back')) return;
    
    const isFlipped = card.classList.contains('flipped');
    
    if (isFlipped) {
        // Flip back to front
        card.classList.add('flipping-back');
        setTimeout(() => {
            card.classList.remove('flipped');
            card.classList.remove('flipping-back');
        }, 500);
    } else {
        // Flip to back
        card.classList.add('flipping');
        setTimeout(() => {
            card.classList.add('flipped');
            card.classList.remove('flipping');
        }, 500);
    }
}
```

### Card Back Styling

The back had a dark theme with:
- Diagonal stripe pattern (cross-stitch aesthetic)
- Haus of Toots logo
- Card title and category
- Category description
- Pink CTA button

```css
.card-back {
    border: 2px solid rgba(255, 107, 122, 0.3);
}

.card-back::before {
    /* Subtle cross-stitch pattern */
    background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(255, 107, 122, 0.05) 10px,
        rgba(255, 107, 122, 0.05) 20px
    );
}

.card-back-cta {
    background: linear-gradient(135deg, #FF6B7A 0%, #E85563 100%);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
}
```

## Re-enabling the Feature

To bring back the card flip:

1. **In `createCardElement()`**: Re-add the card back HTML structure
2. **In click handlers**: Call `this.flipCard(card)` instead of `this.openFullview()`
3. **Ensure CSS exists**: The `.card-back` styles should still be in `card-gallery.css`

## Related Files

- `card-gallery.js` - Card creation and flip logic
- `card-gallery.css` - All card styling including back face

