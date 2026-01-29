// ===================================
// CARD GALLERY - Trading Card Experience
// ===================================

class CardGallery {
    constructor() {
        this.overlay = null;
        this.cardStack = null;
        this.currentIndex = 0;
        this.currentCategory = 'all';
        this.cards = [];
        this.filteredCards = [];
        this.isOpen = false;
        this.isAnimating = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        // Desktop masonry mode
        this.isMasonryMode = false;
        
        // Gallery data
        this.galleryData = {
            'custom-canvases': {
                name: 'Customs',
                color: '#FFB7C2',
                description: 'One-of-a-kind designs created from your ideas, memories, beloved pets, and more!',
                images: [
                    { src: 'images/recent-canvases/1CustomCanvases/CampFlannelFizz.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CampFlannelFizz.jpg', title: 'Camp Flannel Fizz', subtitle: '', date: '2025-09-15' },
                    { src: 'images/recent-canvases/1CustomCanvases/CowboyBear.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CowboyBear.jpg', title: 'Cowboy Bear', subtitle: '', date: '2025-10-13' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRectangle.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRectangle.jpg', title: 'Happy Hollow Rectangle', subtitle: ' ', date: '2025-09-25' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRound.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRound.jpg', title: 'Happy Hollow Round', subtitle: '', date: '2025-09-26' },
                    { src: 'images/recent-canvases/1CustomCanvases/Mazie.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Mazie.jpg', title: 'Mazie', subtitle: '', date: '2025-07-02' },
                    { src: 'images/recent-canvases/1CustomCanvases/MommyOnly.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-MommyOnly.jpg', title: 'Mommy Only', subtitle: '', date: '2025-10-10' },
                    { src: 'images/recent-canvases/1CustomCanvases/Smiley.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Smiley.jpg', title: 'Smiley', subtitle: '', date: '2025-07-02' },
                    { src: 'images/recent-canvases/1CustomCanvases/Winston.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Winston.jpg', title: 'Wilson', subtitle: '', date: '2025-11-02' },
                    { src: 'images/recent-canvases/1CustomCanvases/YouAreMySunshine2.jpeg', thumb: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-YouAreMySunshine2.jpg', title: 'You Are My Sunshine', subtitle: '', date: '2025-10-20' },
                    { src: 'images/recent-canvases/1CustomCanvases/NotreDameLuggageTagInsert.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-NotreDameLuggageTagInsert.jpg', title: 'Notre Dame Luggage Tag', subtitle: '', date: '2025-11-18' },
                    { src: 'images/recent-canvases/1CustomCanvases/PallMallCigaretteBox.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-PallMallCigaretteBox.jpg', title: 'Pall Mall Box', subtitle: '', date: '2025-11-02' },
                    { src: 'images/recent-canvases/1CustomCanvases/RingBearerPillow.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-RingBearerPillow.jpg', title: 'Ring Bearer Pillow', subtitle: '', date: '2025-11-17' },
                    { src: 'images/recent-canvases/1CustomCanvases/UNOMaverickBagCharm.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-UNOMaverickBagCharm.jpg', title: 'UNO Maverick Charm', subtitle: '', date: '2025-11-10' },
                    { src: 'images/recent-canvases/1CustomCanvases/CustomBelt_HuskersFrenchiesGolfHikingChiefs.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-CustomBelt_HuskersFrenchiesGolfHikingChiefs.jpg', title: 'Custom Belt', subtitle: 'Huskers, Frenchies, Golf, Hiking, Chiefs', date: '2025-11-27' },
                    { src: 'images/recent-canvases/1CustomCanvases/RAKACompanyLogoOrnament.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-RAKACompanyLogoOrnament.jpg', title: 'RAKA Logo Ornament', subtitle: '', date: '2025-12-10' },
                    { src: 'images/recent-canvases/1CustomCanvases/Spode-InspiredPupPlate.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-Spode-InspiredPupPlate.jpg', title: 'Spode-Inspired Pup Plate', subtitle: '', date: '2025-12-12' },
                    { src: 'images/recent-canvases/1CustomCanvases/VailBeanie.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-VailBeanie.jpg', title: 'Vail Beanie', subtitle: '', date: '2025-12-08' },
                    { src: 'images/recent-canvases/1CustomCanvases/EngagementOrnament.jpg', thumb: 'images/recent-canvases/1CustomCanvases/thumb-EngagementOrnament.jpg', title: 'Engagement Ornament', subtitle: '', date: '2026-01-28' }
                ]
            },
            'hot-originals': {
                name: 'HoT Originals',
                color: '#D97EAE',
                description: 'Original designs straight from the Haus of Toots imagination.',
                images: [
                    { src: 'images/recent-canvases/2HoT-originals/SephoraHoliday.jpeg', thumb: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraHoliday.jpg', title: 'Sephora Holiday', subtitle: '', date: '2025-07-09' },
                    { src: 'images/recent-canvases/2HoT-originals/SephoraStandard.jpg', thumb: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraStandard.jpg', title: 'Sephora Standard', subtitle: '', date: '2025-10-24' },
                    { src: 'images/recent-canvases/2HoT-originals/SharpestTool.jpeg', thumb: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SharpestTool.jpg', title: 'Sharpest Tool', subtitle: '', date: '2025-06-10' }
                ]
            },
            'digital-charts': {
                name: 'Digital Charts',
                color: '#F74560',
                description: 'Painted canvases from purchased digital cross-stitch patterns.',
                images: [
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/DuckHunt-by-TurtleStitchShop-Etsy.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-DuckHunt-by-TurtleStitchShop-Etsy.jpg', title: 'Duck Hunt', subtitle: '', date: '2025-10-24' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/FuckOff-by-HoopModernStitch-Etsy.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-FuckOff-by-HoopModernStitch-Etsy.jpg', title: 'Fuck Off', subtitle: 'bold modern statement', date: '2025-11-29' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpg', title: 'Kermit with Pearl Earring', subtitle: 'Vermeer meets Muppets', date: '2025-05-26' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PeeWee-by-StitchedIts-Etsy.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PeeWee-by-StitchedIts-Etsy.jpg', title: 'Pee-Wee Herman', subtitle: '', date: '2025-10-24' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PixelHearts-by-PixellPatterns-Etsy.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PixelHearts-by-PixellPatterns-Etsy.jpg', title: 'Pixel Hearts', subtitle: '', date: '2025-10-24' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PopeKermit-by-CherryMarryStore.jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PopeKermit-by-CherryMarryStore.jpg', title: 'Pope Kermit', subtitle: 'blessed and iconic', date: '2025-05-26' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/Welcome to the Spritz Carlton (customized from a pattern by What\'s the Stitch).jpeg', thumb: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/thumb-Welcome-Spritz-Carlton-customized-WhatstheStitch.jpg', title: 'Welcome to the Spritz Carlton', subtitle: 'customized from What\'s the Stitch pattern', date: '2025-12-18' }
                ]
            }
        };
        
        this.init();
    }

    parseDateToTime(dateValue) {
        // Supports:
        // - YYYY-MM-DD (recommended)
        // - Any Date.parse-able string as a fallback
        if (!dateValue) return 0;

        if (typeof dateValue === 'number' && Number.isFinite(dateValue)) return dateValue;

        const s = String(dateValue).trim();
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const d = Number(m[3]);
            // Use UTC to avoid timezone/date-shift surprises
            return Date.UTC(y, mo - 1, d);
        }

        const t = Date.parse(s);
        return Number.isFinite(t) ? t : 0;
    }
    
    init() {
        this.buildCards();
        this.createOverlay();
        this.attachNavListeners();
        this.attachKeyboardListeners();
    }
    
    buildCards() {
        // Flatten gallery data into cards array
        this.cards = [];
        Object.entries(this.galleryData).forEach(([categoryId, category]) => {
            category.images.forEach(image => {
                this.cards.push({
                    ...image,
                    category: categoryId,
                    categoryName: category.name,
                    categoryDescription: category.description,
                    categoryColor: category.color,
                    // Use date from image data, or default to a very old date if not provided
                    date: image.date || '2000-01-01'
                });
            });
        });
        
        // Sort by date (newest first)
        this.cards.sort((a, b) => {
            const dateA = this.parseDateToTime(a.date);
            const dateB = this.parseDateToTime(b.date);
            return dateB - dateA; // newest first
        });
        
        this.filteredCards = [...this.cards];
    }
    
    createOverlay() {
        // Create main overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'card-gallery-overlay';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-modal', 'true');
        this.overlay.setAttribute('aria-label', 'Gallery');
        
        this.overlay.innerHTML = `
            <!-- Header -->
            <header class="card-gallery-header">
                <div class="card-gallery-brand">
                    <img src="images/hauslogo.png" alt="Haus of Toots" class="card-gallery-logo">
                    <h2 class="card-gallery-title">The Canvas Collection</h2>
                </div>
                <button class="card-gallery-close" aria-label="Close gallery">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </header>
            
            <!-- Category Tabs -->
            <nav class="card-gallery-tabs" role="tablist" aria-label="Gallery categories">
                <button class="card-deck-tab active" data-category="all" role="tab" aria-selected="true">
                    All <span class="tab-count">${this.cards.length}</span>
                </button>
                ${Object.entries(this.galleryData).map(([id, cat]) => `
                    <button class="card-deck-tab" data-category="${id}" data-color="${cat.color}" role="tab" aria-selected="false">
                        ${cat.name} <span class="tab-count">${cat.images.length}</span>
                    </button>
                `).join('')}
            </nav>
            
            <!-- Main Card Area -->
            <main class="card-gallery-main">
                <button class="card-nav card-nav-prev" aria-label="Previous card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                
                <div class="card-stack"></div>
                
                <button class="card-nav card-nav-next" aria-label="Next card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                
                <div class="swipe-hint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Swipe to browse
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
                
                <div class="card-counter">
                    <span class="card-counter-current">1</span> of <span class="card-counter-total">${this.cards.length}</span>
                </div>
            </main>
            
            <!-- Deck Preview -->
            <div class="deck-preview"></div>
            
            <!-- Full Image View -->
            <div class="card-fullview">
                <button class="card-fullview-close" aria-label="Close full view">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="card-fullview-image-wrapper">
                    <img class="card-fullview-image" src="" alt="">
                    <div class="fullview-label"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
        
        this.cardStack = this.overlay.querySelector('.card-stack');
        this.deckPreview = this.overlay.querySelector('.deck-preview');
        this.fullview = this.overlay.querySelector('.card-fullview');
        
        // Attach overlay event listeners
        this.attachOverlayListeners();
    }
    
    attachOverlayListeners() {
        // Close button
        this.overlay.querySelector('.card-gallery-close').addEventListener('click', () => this.close());
        
        // Category tabs
        this.overlay.querySelectorAll('.card-deck-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const category = tab.dataset.category;
                this.filterByCategory(category);
                
                // Update active state
                this.overlay.querySelectorAll('.card-deck-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            });
        });
        
        // Navigation buttons
        this.overlay.querySelector('.card-nav-prev').addEventListener('click', () => this.navigate(-1));
        this.overlay.querySelector('.card-nav-next').addEventListener('click', () => this.navigate(1));
        
        // Full view close
        this.overlay.querySelector('.card-fullview-close').addEventListener('click', () => this.closeFullview());
        this.fullview.addEventListener('click', (e) => {
            if (e.target === this.fullview) this.closeFullview();
        });
        
        // Touch swipe support with improved handling
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isSwiping = false;
        
        this.cardStack.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
            this.isSwiping = false;
        }, { passive: true });
        
        this.cardStack.addEventListener('touchmove', (e) => {
            const deltaX = Math.abs(e.changedTouches[0].screenX - this.touchStartX);
            const deltaY = Math.abs(e.changedTouches[0].screenY - this.touchStartY);
            // If moving more horizontally than vertically, it's a swipe
            if (deltaX > 10 && deltaX > deltaY) {
                this.isSwiping = true;
            }
        }, { passive: true });
        
        this.cardStack.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.touchEndY = e.changedTouches[0].screenY;
            
            const deltaX = Math.abs(this.touchEndX - this.touchStartX);
            const deltaY = Math.abs(this.touchEndY - this.touchStartY);
            
            // Only handle as swipe if horizontal movement was significant
            if (deltaX > 50 && deltaX > deltaY) {
                this.handleSwipe();
            }
        }, { passive: true });
        
        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
    }
    
    attachNavListeners() {
        // Find all gallery nav links and intercept them
        document.querySelectorAll('a[href="gallery.html"], a.nav-link[href="gallery.html"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });
    }
    
    attachKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.isOpen) return;
            
            switch(e.key) {
                case 'Escape':
                    if (this.fullview.classList.contains('active')) {
                        this.closeFullview();
                    } else {
                        this.close();
                    }
                    break;
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
                case ' ':
                case 'Enter':
                    // Open full view for focused card
                    const focusedCard = document.activeElement;
                    if (focusedCard.classList.contains('gallery-card')) {
                        const idx = parseInt(focusedCard.dataset.index);
                        const cardData = this.filteredCards[idx];
                        if (cardData) {
                            this.openFullview(cardData.src, cardData.title);
                        }
                    }
                    break;
            }
        });
    }
    
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        
        // Reset to beginning
        this.currentIndex = 0;
        this.currentCategory = 'all';
        this.filteredCards = [...this.cards];
        
        // Reset tabs
        this.overlay.querySelectorAll('.card-deck-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        this.overlay.querySelector('[data-category="all"]').classList.add('active');
        this.overlay.querySelector('[data-category="all"]').setAttribute('aria-selected', 'true');
        
        // Check for desktop arc mode
        this.checkMasonryMode();
        
        // Show overlay
        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Render cards (arc or stack based on screen size)
        this.render();
        this.renderDeckPreview();
        this.updateCounter();
        this.updateNavButtons();
        
        // Focus close button for accessibility
        setTimeout(() => {
            this.overlay.querySelector('.card-gallery-close').focus();
        }, 100);
        
        // Listen for resize to switch modes or recalculate widths
        this.resizeTimeout = null;
        this.resizeHandler = () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 150); // Debounce resize events
        };
        window.addEventListener('resize', this.resizeHandler);
    }
    
    checkMasonryMode() {
        const wasMasonryMode = this.isMasonryMode;
        this.isMasonryMode = window.innerWidth >= 1024;
        
        if (this.isMasonryMode) {
            this.overlay.classList.add('masonry-mode');
        } else {
            this.overlay.classList.remove('masonry-mode');
        }
        
        return wasMasonryMode !== this.isMasonryMode;
    }
    
    handleResize() {
        const modeChanged = this.checkMasonryMode();
        if (modeChanged) {
            this.render();
            this.updateNavButtons();
        } else if (this.isMasonryMode && this.isOpen) {
            // Recalculate card widths when container size changes
            // This ensures cards wrap properly when screen size changes
            this.recalculateMasonryCardWidths();
        }
    }
    
    recalculateMasonryCardWidths() {
        if (!this.isMasonryMode || !this.cardStack) return;
        
        const cards = this.cardStack.querySelectorAll('.masonry-card');
        cards.forEach(card => {
            const img = card.querySelector('.card-image');
            if (img && img.complete && img.naturalWidth > 0) {
                requestAnimationFrame(() => {
                    this.calculateCardWidth(card, img);
                });
            }
        });
    }
    
    render() {
        if (this.isMasonryMode) {
            this.renderMasonry();
        } else {
            this.renderStack();
        }
    }
    
    close() {
        if (!this.isOpen) return;
        
        // Remove resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
        }
        
        // Exit animation for cards
        const activeCard = this.cardStack.querySelector('.gallery-card.active');
        if (activeCard) {
            activeCard.classList.add('exiting');
        }
        
        setTimeout(() => {
            this.isOpen = false;
            this.overlay.classList.remove('active');
            this.overlay.classList.remove('masonry-mode');
            document.body.style.overflow = '';
            this.cardStack.innerHTML = '';
        }, 300);
    }
    
    filterByCategory(category) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Animate current cards out with shuffle effect
        const currentCards = this.cardStack.querySelectorAll('.gallery-card');
        currentCards.forEach((card) => {
            // Random scatter directions
            const randomX = (Math.random() - 0.5) * 300;
            const randomY = (Math.random() - 0.5) * 200 - 50;
            const randomRotate = (Math.random() - 0.5) * 60;
            
            card.style.setProperty('--shuffle-x', `${randomX}px`);
            card.style.setProperty('--shuffle-y', `${randomY}px`);
            card.style.setProperty('--shuffle-rotate', `${randomRotate}deg`);
            card.classList.add('shuffling-out');
        });
        
        // After shuffle out, update and fan in
        setTimeout(() => {
            this.currentCategory = category;
            this.currentIndex = 0;
            
            if (category === 'all') {
                this.filteredCards = [...this.cards];
            } else {
                this.filteredCards = this.cards.filter(card => card.category === category);
            }
            
            // Ensure filtered cards are still sorted by date (newest first)
            this.filteredCards.sort((a, b) => {
                const dateA = this.parseDateToTime(a.date);
                const dateB = this.parseDateToTime(b.date);
                return dateB - dateA; // newest first
            });
            
            // Re-render cards
            this.render();
            this.renderDeckPreview();
            this.updateCounter();
            this.updateNavButtons();
            
            setTimeout(() => {
                this.isAnimating = false;
            }, 400);
        }, 300);
    }
    
    renderCardsWithDeal() {
        this.cardStack.innerHTML = '';
        
        if (this.filteredCards.length === 0) {
            this.cardStack.innerHTML = '<p style="color: rgba(74, 69, 66, 0.7); text-align: center; background: rgba(255,255,255,0.8); padding: 1rem; border-radius: 8px;">No cards in this deck</p>';
            return;
        }
        
        // Render a subset of cards for performance
        const visibleRange = 3;
        const startIdx = Math.max(0, this.currentIndex - visibleRange);
        const endIdx = Math.min(this.filteredCards.length - 1, this.currentIndex + visibleRange);
        
        for (let i = startIdx; i <= endIdx; i++) {
            const card = this.createCardElement(this.filteredCards[i], i);
            
            // Apply position classes
            if (i === this.currentIndex) {
                card.classList.add('active');
                card.setAttribute('tabindex', '0');
                
                // Add dealing animation
                card.classList.add('dealing');
                card.style.setProperty('--deal-x', '0px');
                card.style.setProperty('--deal-y', '0px');
                card.style.setProperty('--deal-rotation', '0deg');
                
                setTimeout(() => {
                    card.classList.remove('dealing');
                }, 600);
            } else if (i === this.currentIndex - 1) {
                card.classList.add('prev');
            } else if (i === this.currentIndex + 1) {
                card.classList.add('next');
            } else if (i < this.currentIndex - 1) {
                card.classList.add('far-prev');
            } else {
                card.classList.add('far-next');
            }
            
            this.cardStack.appendChild(card);
        }
    }
    
    renderCardsWithShuffle() {
        this.cardStack.innerHTML = '';
        
        if (this.filteredCards.length === 0) {
            this.cardStack.innerHTML = '<p style="color: rgba(74, 69, 66, 0.7); text-align: center; background: rgba(255,255,255,0.8); padding: 1rem; border-radius: 8px;">No cards in this deck</p>';
            return;
        }
        
        // Render a subset of cards for performance
        const visibleRange = 3;
        const startIdx = Math.max(0, this.currentIndex - visibleRange);
        const endIdx = Math.min(this.filteredCards.length - 1, this.currentIndex + visibleRange);
        
        for (let i = startIdx; i <= endIdx; i++) {
            const card = this.createCardElement(this.filteredCards[i], i);
            
            // Apply position classes
            if (i === this.currentIndex) {
                card.classList.add('active');
                card.setAttribute('tabindex', '0');
                
                // Add shuffle-in animation with slight random rotation
                const randomRotate = (Math.random() - 0.5) * 10;
                card.style.setProperty('--shuffle-rotate', `${randomRotate}deg`);
                card.classList.add('shuffling-in');
                
                setTimeout(() => {
                    card.classList.remove('shuffling-in');
                }, 500);
            } else if (i === this.currentIndex - 1) {
                card.classList.add('prev');
            } else if (i === this.currentIndex + 1) {
                card.classList.add('next');
            } else if (i < this.currentIndex - 1) {
                card.classList.add('far-prev');
            } else {
                card.classList.add('far-next');
            }
            
            this.cardStack.appendChild(card);
        }
    }
    
    renderCards(animate = false) {
        this.cardStack.innerHTML = '';
        
        if (this.filteredCards.length === 0) {
            this.cardStack.innerHTML = '<p style="color: #FF8497; text-align: center;">No cards in this deck</p>';
            return;
        }
        
        // Render a subset of cards for performance (current + neighbors)
        const visibleRange = 3;
        const startIdx = Math.max(0, this.currentIndex - visibleRange);
        const endIdx = Math.min(this.filteredCards.length - 1, this.currentIndex + visibleRange);
        
        for (let i = startIdx; i <= endIdx; i++) {
            const card = this.createCardElement(this.filteredCards[i], i);
            
            // Apply position classes
            if (i === this.currentIndex) {
                card.classList.add('active');
                card.setAttribute('tabindex', '0');
            } else if (i === this.currentIndex - 1) {
                card.classList.add('prev');
            } else if (i === this.currentIndex + 1) {
                card.classList.add('next');
            } else if (i < this.currentIndex - 1) {
                card.classList.add('far-prev');
            } else {
                card.classList.add('far-next');
            }
            
            // Add dealing animation
            if (animate && i === this.currentIndex) {
                card.classList.add('dealing');
                card.style.setProperty('--deal-x', '0px');
                card.style.setProperty('--deal-y', '0px');
                card.style.setProperty('--deal-rotation', '0deg');
            }
            
            this.cardStack.appendChild(card);
        }
    }
    
    createCardElement(cardData, index) {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.dataset.index = index;
        card.dataset.categoryColor = cardData.categoryColor; // Add category color for border styling
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${cardData.title} - ${cardData.categoryName}`);
        
        // Check if this card has a "before" image to flip to
        const hasBeforeImage = !!cardData.beforeSrc;
        if (hasBeforeImage) {
            card.classList.add('flippable');
        }
        
        // Determine badge type
        let badgeHtml = '';
        if (cardData.badge) {
            badgeHtml = `<div class="card-status-badge ${cardData.badge}">${cardData.badge}</div>`;
        }
        
        // Build card back HTML if this card has a "before" image
        let cardBackHtml = '';
        if (hasBeforeImage) {
            cardBackHtml = `
                <div class="card-face card-back">
                    <div class="card-image-container card-back-image-container">
                        <img class="card-image card-back-img" data-src="${cardData.beforeSrc}" alt="${cardData.title} - Before">
                        <div class="card-category-badge" data-color="${cardData.categoryColor}">${cardData.categoryName}</div>
                        <div class="card-status-badge before">before</div>
                    </div>
                    <div class="card-info">
                        <h3 class="card-title">${cardData.title}</h3>
                        <p class="card-subtitle">tap to see customized</p>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="card-face card-front">
                <div class="card-image-container loading">
                    <img class="card-image" data-src="${cardData.src}" alt="${cardData.title}">
                    <div class="card-category-badge" data-color="${cardData.categoryColor}">${cardData.categoryName}</div>
                    ${badgeHtml}
                </div>
                <div class="card-info">
                    <h3 class="card-title">${cardData.title}</h3>
                    <p class="card-subtitle">${cardData.subtitle}</p>
                </div>
            </div>
            ${cardBackHtml}
        `;
        
        // Lazy load front image
        const img = card.querySelector('.card-front .card-image');
        const container = card.querySelector('.card-front .card-image-container');
        
        img.onload = () => {
            container.classList.remove('loading');
            
            // In masonry mode, calculate card width based on image aspect ratio
            if (this.isMasonryMode && card.classList.contains('masonry-card')) {
                // Use requestAnimationFrame to ensure layout is ready
                requestAnimationFrame(() => {
                    this.calculateCardWidth(card, img);
                });
            }
        };
        
        // Also handle case where image is already loaded
        if (img.complete && img.naturalWidth > 0) {
            container.classList.remove('loading');
            if (this.isMasonryMode && card.classList.contains('masonry-card')) {
                requestAnimationFrame(() => {
                    this.calculateCardWidth(card, img);
                });
            }
        }
        
        // Load front image after a short delay for animation
        setTimeout(() => {
            img.src = img.dataset.src;
        }, 50);
        
        // Lazy load back image if present
        if (hasBeforeImage) {
            const backImg = card.querySelector('.card-back-img');
            if (backImg) {
                setTimeout(() => {
                    backImg.src = backImg.dataset.src;
                }, 100);
            }
        }
        
        // Track tap state for this card
        let cardTapStart = { time: 0, x: 0, y: 0 };
        let cardWasTapped = false;
        
        // Helper to check if element is in the image area
        const isInImageArea = (element) => {
            if (!element) return false;
            return element.closest('.card-image-container') !== null || 
                   element.classList.contains('card-image') ||
                   element.classList.contains('card-image-container');
        };
        
        // Touch start - record position
        card.addEventListener('touchstart', (e) => {
            cardTapStart.time = Date.now();
            cardTapStart.x = e.touches[0].clientX;
            cardTapStart.y = e.touches[0].clientY;
            cardWasTapped = false;
        }, { passive: true });
        
        // Touch end - check if it was a tap
        card.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - cardTapStart.x);
            const deltaY = Math.abs(touch.clientY - cardTapStart.y);
            const duration = Date.now() - cardTapStart.time;
            
            // It's a tap if: short duration AND minimal movement
            if (duration < 300 && deltaX < 30 && deltaY < 30) {
                cardWasTapped = true;
                e.preventDefault();
                
                // Check what was tapped
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                
                if (card.classList.contains('active') || card.classList.contains('masonry-card')) {
                    if (hasBeforeImage) {
                        // For flippable cards: image area → lightbox, info area → flip
                        if (isInImageArea(target)) {
                            // Open lightbox with after (first) and before (second)
                            this.openBeforeAfterLightbox(cardData.src, cardData.beforeSrc, cardData.title);
                        } else {
                            this.flipCard(card);
                        }
                    } else {
                        this.openFullview(cardData.src, cardData.title);
                    }
                }
            }
        }, { passive: false });
        
        // Click handler for desktop
        card.addEventListener('click', (e) => {
            // Skip if this was already handled by touch
            if (cardWasTapped) {
                cardWasTapped = false;
                return;
            }
            
            if (card.classList.contains('active') || card.classList.contains('masonry-card')) {
                if (hasBeforeImage) {
                    // For flippable cards: image area → lightbox, info area → flip
                    if (isInImageArea(e.target)) {
                        // Open lightbox with after (first) and before (second)
                        this.openBeforeAfterLightbox(cardData.src, cardData.beforeSrc, cardData.title);
                    } else {
                        this.flipCard(card);
                    }
                } else {
                    this.openFullview(cardData.src, cardData.title);
                }
            }
        });
        
        return card;
    }
    
    flipCard(card) {
        // Only flip active/masonry cards
        if (!card.classList.contains('active') && !card.classList.contains('masonry-card')) return;
        if (card.classList.contains('flipping') || card.classList.contains('flipping-back')) return;
        
        const isFlipped = card.classList.contains('flipped');
        
        if (isFlipped) {
            // Flip back to front (show "after")
            card.classList.add('flipping-back');
            setTimeout(() => {
                card.classList.remove('flipped');
                card.classList.remove('flipping-back');
            }, 500);
        } else {
            // Flip to back (show "before")
            card.classList.add('flipping');
            setTimeout(() => {
                card.classList.add('flipped');
                card.classList.remove('flipping');
            }, 500);
        }
    }
    
    
    navigate(steps) {
        if (this.isAnimating) return;
        if (this.filteredCards.length <= 1) return;
        
        this.isAnimating = true;
        
        // Unflip current card if flipped
        const currentCard = this.cardStack.querySelector('.gallery-card.active');
        if (currentCard && currentCard.classList.contains('flipped')) {
            currentCard.classList.remove('flipped');
        }
        
        // Update index (wrap around)
        if (steps > 0) {
            this.currentIndex = (this.currentIndex + 1) % this.filteredCards.length;
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.filteredCards.length) % this.filteredCards.length;
        }
        
        // Simple re-render (arc or stack based on mode)
        this.render();
        this.updateDeckPreviewActive();
        this.updateCounter();
        this.updateNavButtons();
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 250);
    }
    
    renderStack() {
        this.cardStack.innerHTML = '';
        
        if (this.filteredCards.length === 0) {
            this.cardStack.innerHTML = '<p style="color: rgba(74, 69, 66, 0.7); text-align: center; background: rgba(255,255,255,0.8); padding: 1rem; border-radius: 8px;">No cards in this deck</p>';
            return;
        }
        
        const total = this.filteredCards.length;
        
        // Render previous cards (peeking from left) - furthest first
        if (total > 2) {
            const prevIdx2 = (this.currentIndex - 2 + total) % total;
            const prevCard2 = this.createCardElement(this.filteredCards[prevIdx2], prevIdx2);
            prevCard2.classList.add('stack-prev-2');
            this.cardStack.appendChild(prevCard2);
        }
        
        if (total > 1) {
            const prevIdx1 = (this.currentIndex - 1 + total) % total;
            const prevCard1 = this.createCardElement(this.filteredCards[prevIdx1], prevIdx1);
            prevCard1.classList.add('stack-prev-1');
            this.cardStack.appendChild(prevCard1);
        }
        
        // Render next cards (peeking from right) - furthest first
        if (total > 2) {
            const nextIdx2 = (this.currentIndex + 2) % total;
            const nextCard2 = this.createCardElement(this.filteredCards[nextIdx2], nextIdx2);
            nextCard2.classList.add('stack-2');
            this.cardStack.appendChild(nextCard2);
        }
        
        if (total > 1) {
            const nextIdx1 = (this.currentIndex + 1) % total;
            const nextCard1 = this.createCardElement(this.filteredCards[nextIdx1], nextIdx1);
            nextCard1.classList.add('stack-1');
            this.cardStack.appendChild(nextCard1);
        }
        
        // Active card last (on top of DOM, highest z-index)
        const activeData = this.filteredCards[this.currentIndex];
        const activeCard = this.createCardElement(activeData, this.currentIndex);
        activeCard.classList.add('active');
        activeCard.setAttribute('tabindex', '0');
        this.cardStack.appendChild(activeCard);
    }
    
    renderMasonry() {
        this.cardStack.innerHTML = '';
        
        if (this.filteredCards.length === 0) {
            this.cardStack.innerHTML = '<p style="color: rgba(74, 69, 66, 0.7); text-align: center; background: rgba(255,255,255,0.8); padding: 1rem; border-radius: 8px;">No cards in this category</p>';
            return;
        }
        
        // Render all filtered cards in a grid
        this.filteredCards.forEach((cardData, index) => {
            const card = this.createCardElement(cardData, index);
            card.classList.add('masonry-card');
            card.setAttribute('tabindex', '0');
            this.cardStack.appendChild(card);
        });
        
        // After a brief delay to ensure layout, calculate widths for any already-loaded images
        setTimeout(() => {
            this.recalculateMasonryCardWidths();
        }, 200);
    }
    
    navigateTo(targetIndex) {
        if (this.isAnimating) return;
        if (targetIndex === this.currentIndex) return;
        
        this.isAnimating = true;
        this.currentIndex = targetIndex;
        
        this.render();
        this.updateDeckPreviewActive();
        this.updateCounter();
        this.updateNavButtons();
        
        setTimeout(() => {
            this.isAnimating = false;
        }, 300);
    }
    
    handleSwipe() {
        const swipeThreshold = 50;
        const deltaX = this.touchEndX - this.touchStartX;
        
        if (Math.abs(deltaX) > swipeThreshold) {
            if (deltaX > 0) {
                this.navigate(-1); // Swipe right = previous
            } else {
                this.navigate(1); // Swipe left = next
            }
        }
    }
    
    renderDeckPreview() {
        this.deckPreview.innerHTML = '';
        
        // Add horizontal scroll on mouse wheel (if not already added)
        if (!this.deckPreview.dataset.wheelListener) {
            this.deckPreview.dataset.wheelListener = 'true';
            this.deckPreview.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    this.deckPreview.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }
        
        // Show all thumbnails - let them scroll horizontally
        this.filteredCards.forEach((card, i) => {
            const mini = document.createElement('button');
            mini.className = 'deck-mini-card';
            mini.dataset.index = i;
            if (i === this.currentIndex) mini.classList.add('active');
            mini.setAttribute('aria-label', `Jump to ${card.title}`);
            mini.innerHTML = `<img src="${card.thumb || card.src}" alt="${card.title}" loading="lazy">`;
            
            mini.addEventListener('click', () => {
                if (this.isAnimating) return;
                if (i === this.currentIndex) return;
                
                this.isAnimating = true;
                
                // Unflip if needed
                const currentCard = this.cardStack.querySelector('.gallery-card.active');
                if (currentCard && currentCard.classList.contains('flipped')) {
                    currentCard.classList.remove('flipped');
                }
                
                this.currentIndex = i;
                
                // Re-render cards
                this.render();
                this.updateDeckPreviewActive();
                this.updateCounter();
                this.updateNavButtons();
                
                setTimeout(() => {
                    this.isAnimating = false;
                }, 300);
            });
            
            this.deckPreview.appendChild(mini);
        });
    }
    
    updateDeckPreviewActive() {
        const minis = this.deckPreview.querySelectorAll('.deck-mini-card');
        
        minis.forEach((mini) => {
            const idx = parseInt(mini.dataset.index);
            mini.classList.toggle('active', idx === this.currentIndex);
        });
        
        // Scroll to center the active thumbnail
        const activeMini = this.deckPreview.querySelector('.deck-mini-card.active');
        if (activeMini && this.deckPreview) {
            const containerWidth = this.deckPreview.offsetWidth;
            const cardLeft = activeMini.offsetLeft;
            const cardWidth = activeMini.offsetWidth;
            const scrollTo = cardLeft - (containerWidth / 2) + (cardWidth / 2);
            
            this.deckPreview.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    }
    
    updateCounter() {
        const current = this.overlay.querySelector('.card-counter-current');
        const total = this.overlay.querySelector('.card-counter-total');
        
        current.textContent = this.currentIndex + 1;
        total.textContent = this.filteredCards.length;
    }
    
    updateNavButtons() {
        const prevBtn = this.overlay.querySelector('.card-nav-prev');
        const nextBtn = this.overlay.querySelector('.card-nav-next');
        
        prevBtn.disabled = this.currentIndex === 0;
        nextBtn.disabled = this.currentIndex === this.filteredCards.length - 1;
    }
    
    openFullview(src, title) {
        const img = this.fullview.querySelector('.card-fullview-image');
        img.src = src;
        img.alt = title;
        this.fullview.classList.add('active');
        // Hide navigation for single image
        this.hideFullviewNav();
        // Clear multi-image state
        this.fullviewImages = null;
        this.fullviewIndex = 0;
    }
    
    openBeforeAfterLightbox(afterSrc, beforeSrc, title) {
        // Store images array: after first, before second
        this.fullviewImages = [
            { src: afterSrc, label: 'After' },
            { src: beforeSrc, label: 'Before' }
        ];
        this.fullviewIndex = 0;
        this.fullviewTitle = title;
        
        // Show first image (after)
        this.showFullviewImage(0);
        this.fullview.classList.add('active');
        
        // Show navigation
        this.showFullviewNav();
    }
    
    showFullviewImage(index) {
        if (!this.fullviewImages || index < 0 || index >= this.fullviewImages.length) return;
        
        const img = this.fullview.querySelector('.card-fullview-image');
        const imageData = this.fullviewImages[index];
        img.src = imageData.src;
        img.alt = `${this.fullviewTitle} - ${imageData.label}`;
        this.fullviewIndex = index;
        
        // Update nav button states
        this.updateFullviewNav();
        
        // Update label badge
        this.updateFullviewLabel(imageData.label);
    }
    
    showFullviewNav() {
        let nav = this.fullview.querySelector('.fullview-nav');
        if (!nav) {
            // Create navigation elements
            nav = document.createElement('div');
            nav.className = 'fullview-nav';
            nav.innerHTML = `
                <button class="fullview-nav-prev" aria-label="Previous image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button class="fullview-nav-next" aria-label="Next image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            `;
            this.fullview.appendChild(nav);
            
            // Attach event listeners
            nav.querySelector('.fullview-nav-prev').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.fullviewIndex > 0) {
                    this.showFullviewImage(this.fullviewIndex - 1);
                }
            });
            nav.querySelector('.fullview-nav-next').addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.fullviewImages && this.fullviewIndex < this.fullviewImages.length - 1) {
                    this.showFullviewImage(this.fullviewIndex + 1);
                }
            });
        }
        nav.style.display = 'block';
        
        // Show the label badge
        const labelEl = this.fullview.querySelector('.fullview-label');
        if (labelEl) {
            labelEl.style.display = 'block';
        }
    }
    
    hideFullviewNav() {
        const nav = this.fullview.querySelector('.fullview-nav');
        if (nav) {
            nav.style.display = 'none';
        }
        // Hide the label badge for single images
        const labelEl = this.fullview.querySelector('.fullview-label');
        if (labelEl) {
            labelEl.style.display = 'none';
        }
    }
    
    updateFullviewNav() {
        const nav = this.fullview.querySelector('.fullview-nav');
        if (!nav || !this.fullviewImages) return;
        
        const prevBtn = nav.querySelector('.fullview-nav-prev');
        const nextBtn = nav.querySelector('.fullview-nav-next');
        
        prevBtn.style.opacity = this.fullviewIndex > 0 ? '1' : '0.3';
        prevBtn.style.pointerEvents = this.fullviewIndex > 0 ? 'auto' : 'none';
        nextBtn.style.opacity = this.fullviewIndex < this.fullviewImages.length - 1 ? '1' : '0.3';
        nextBtn.style.pointerEvents = this.fullviewIndex < this.fullviewImages.length - 1 ? 'auto' : 'none';
    }
    
    updateFullviewLabel(label) {
        const labelEl = this.fullview.querySelector('.fullview-label');
        if (labelEl) {
            labelEl.textContent = label;
            labelEl.className = 'fullview-label ' + label.toLowerCase();
        }
    }
    
    closeFullview() {
        this.fullview.classList.remove('active');
        this.fullviewImages = null;
        this.fullviewIndex = 0;
    }
    
    calculateCardWidth(card, img) {
        // Get the card's fixed height from computed styles
        const cardHeight = card.offsetHeight;
        
        // Get image natural dimensions
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        if (!imgWidth || !imgHeight || !cardHeight) return;
        
        // Get card info section height (title + subtitle + padding)
        const cardInfo = card.querySelector('.card-info');
        // Wait for next frame to ensure info height is calculated
        requestAnimationFrame(() => {
            const infoHeight = cardInfo ? cardInfo.offsetHeight : 60;
            
            // Calculate available height for image container
            // Card has 16px margin top, 8px margin bottom for image, plus info section
            const imageContainerHeight = cardHeight - 16 - 8 - infoHeight - 16;
            
            // Set explicit height on the front image container
            const imageContainer = card.querySelector('.card-image-container');
            if (imageContainer) {
                imageContainer.style.height = `${imageContainerHeight}px`;
                imageContainer.style.flex = 'none'; // Override flex: 1
                // Use CSS aspect-ratio to let width be determined naturally
                imageContainer.style.aspectRatio = `${imgWidth} / ${imgHeight}`;
                imageContainer.style.width = 'auto'; // Let aspect-ratio determine width
            }
            
            // Also set explicit height on the back image container (for before/after cards)
            const backImageContainer = card.querySelector('.card-back-image-container');
            if (backImageContainer) {
                backImageContainer.style.height = `${imageContainerHeight}px`;
                backImageContainer.style.flex = 'none';
                // Back uses same aspect ratio as front for consistent card width
                backImageContainer.style.aspectRatio = `${imgWidth} / ${imgHeight}`;
                backImageContainer.style.width = 'auto';
            }
            
            // After image container width is set, calculate card width
            requestAnimationFrame(() => {
                if (imageContainer) {
                    const imageContainerWidth = imageContainer.offsetWidth;
                    const naturalCardWidth = imageContainerWidth + 32; // + margins
                    card.style.width = `${naturalCardWidth}px`;
                }
            });
        });
    }
}

// Initialize when DOM is ready
let cardGallery;

document.addEventListener('DOMContentLoaded', () => {
    cardGallery = new CardGallery();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardGallery;
}

