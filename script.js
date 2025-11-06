// ===================================
// LOGO ENTRANCE ANIMATION
// ===================================

function animateLogo() {
    const logo = document.getElementById('hausLogo');
    if (logo) {
        logo.style.opacity = '0';
        logo.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            logo.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            logo.style.opacity = '1';
            logo.style.transform = 'translateY(0)';
        }, 200);
    }
}

// ===================================
// SCROLL STITCH SIDEBAR
// ===================================

class ScrollStitchSidebar {
    constructor() {
        this.stitchContainer = document.getElementById('stitchContainer');
        this.needle = document.getElementById('needle');
        this.stitches = [];
        this.stitchSize = 3.36; // Size of each stitch (42% of original 8)
        // Authentic needlepoint spacing: stitches share holes
        // The vertical spacing equals the stitch size so top-right of one = bottom-left of next
        this.spacing = this.stitchSize * 2; // Vertical spacing between stitch centers
        this.numStitches = Math.floor(1000 / this.spacing); // Calculate how many stitches fit
        this.stitchSpeed = 0.8; // Speed multiplier - higher = stitches appear closer together as you scroll
        
        this.createStitches();
        window.lastScrollY = 0;
    }
    
    createStitches() {
        // Create all X stitch elements
        for (let i = 0; i < this.numStitches; i++) {
            const yPos = i * this.spacing;
            const stitch = this.createXStitch(yPos, i);
            this.stitches.push(stitch);
            this.stitchContainer.appendChild(stitch.group);
        }
    }
    
    createXStitch(yPos, index) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'x-stitch');
        group.setAttribute('data-index', index);
        
        // Single diagonal stroke: bottom-left to top-right (needlepoint style)
        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', 30 - this.stitchSize);
        line1.setAttribute('y1', yPos + this.stitchSize);
        line1.setAttribute('x2', 30 - this.stitchSize);
        line1.setAttribute('y2', yPos + this.stitchSize);
        line1.setAttribute('stroke', 'url(#threadGradient)');
        line1.setAttribute('stroke-width', '3');
        line1.setAttribute('stroke-linecap', 'round');
        line1.style.filter = 'drop-shadow(0.5px 1px 1.5px rgba(0, 0, 0, 0.25)) drop-shadow(-0.5px 0px 0.5px rgba(255, 255, 255, 0.3))';
        
        group.appendChild(line1);
        
        return {
            group: group,
            line1: line1,
            yPos: yPos,
            progress: 0,
            isAnimating: false
        };
    }
    
    update(scrollPercent) {
        // Update needle position
        const needleY = scrollPercent * 1000;
        this.needle.setAttribute('transform', `translate(30, ${needleY})`);
        
        // Show needle when scrolling
        if (scrollPercent > 0) {
            this.needle.style.opacity = '1';
        } else {
            this.needle.style.opacity = '0';
        }
        
        // Add piercing animation
        const scrollSpeed = Math.abs(window.lastScrollY - window.scrollY);
        if (scrollSpeed > 5) {
            this.needle.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.needle.style.transform = 'scale(1)';
            }, 100);
        }
        
        // Animate stitches based on scroll position
        // Each stitch takes up equal portion of scroll, and must complete before next begins
        // Apply speed multiplier to slow down the stitching
        const totalScrollRange = scrollPercent * this.numStitches * this.stitchSpeed;
        
        this.stitches.forEach((stitch, index) => {
            // Calculate which stitch should be active
            const currentStitchIndex = Math.floor(totalScrollRange);
            
            if (index < currentStitchIndex) {
                // Previous stitches should be fully complete and stay complete
                stitch.progress = 1;
                this.animateStitch(stitch);
            } else if (index === currentStitchIndex) {
                // This is the current stitch being animated
                const stitchProgress = totalScrollRange - currentStitchIndex;
                
                // Only move forward, never backward (stitches don't un-stitch)
                if (stitchProgress > stitch.progress) {
                    // Smoothly interpolate to target progress with slower easing
                    stitch.progress += (stitchProgress - stitch.progress) * 0.15;
                }
                
                this.animateStitch(stitch);
            } else {
                // Future stitches - only reset if they haven't started yet
                // Keep any progress they already have
                if (stitch.progress === 0) {
                    // Not started yet, keep at 0
                } else {
                    // Partially complete, keep the progress
                    this.animateStitch(stitch);
                }
            }
        });
        
        window.lastScrollY = window.scrollY;
    }
    
    animateStitch(stitch) {
        const progress = stitch.progress;
        const size = this.stitchSize;
        const centerX = 30;
        const centerY = stitch.yPos;
        
        // Single diagonal stroke: bottom-left to top-right
        stitch.line1.setAttribute('x2', centerX - size + (size * 2 * progress));
        stitch.line1.setAttribute('y2', centerY + size - (size * 2 * progress));
    }
}

let scrollStitchSidebar;

function updateScrollStitch() {
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    
    if (scrollStitchSidebar) {
        scrollStitchSidebar.update(scrollPercent);
    }
}

window.lastScrollY = 0;

// ===================================
// CURSOR TRAIL STITCHING
// ===================================

class CursorTrail {
    constructor() {
        this.canvas = document.getElementById('cursorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.maxPoints = 30;
        this.isDrawing = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => this.addPoint(e));
        
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    addPoint(e) {
        this.points.push({
            x: e.clientX,
            y: e.clientY,
            age: 0
        });
        
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            point.age += 1;
            
            // Draw stitch
            if (i > 0) {
                const prevPoint = this.points[i - 1];
                const opacity = 1 - (point.age / 60);
                
                if (opacity > 0) {
                    this.ctx.strokeStyle = `rgba(255, 107, 122, ${opacity * 0.6})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.lineCap = 'round';
                    
                    // Dashed stitch line
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevPoint.x, prevPoint.y);
                    this.ctx.lineTo(point.x, point.y);
                    this.ctx.stroke();
                    
                    // Small X marks at intervals
                    if (i % 3 === 0) {
                        this.ctx.setLineDash([]);
                        this.ctx.strokeStyle = `rgba(255, 107, 122, ${opacity * 0.8})`;
                        this.ctx.lineWidth = 1.5;
                        
                        const size = 3;
                        this.ctx.beginPath();
                        this.ctx.moveTo(point.x - size, point.y - size);
                        this.ctx.lineTo(point.x + size, point.y + size);
                        this.ctx.moveTo(point.x + size, point.y - size);
                        this.ctx.lineTo(point.x - size, point.y + size);
                        this.ctx.stroke();
                    }
                }
            }
        }
        
        // Remove old points
        this.points = this.points.filter(p => p.age < 60);
        
        requestAnimationFrame(() => this.animate());
    }
}

// ===================================
// ROTATING CAROUSEL (auto-rotating images in hoops)
// ===================================

class RotatingCarousel {
    constructor() {
        // Find all rotating carousels
        this.carousels = document.querySelectorAll('.rotating-carousel');
        
        if (this.carousels.length > 0) {
            this.initializeCarousels();
        }
    }
    
    initializeCarousels() {
        this.carousels.forEach(carousel => {
            const images = carousel.querySelectorAll('.rotating-image');
            if (images.length > 1) {
                let currentIndex = 0;
                
                setInterval(() => {
                    // Remove active from current
                    images[currentIndex].classList.remove('active');
                    
                    // Move to next image
                    currentIndex = (currentIndex + 1) % images.length;
                    
                    // Add active to next
                    images[currentIndex].classList.add('active');
                }, 3000);
            }
        });
    }
}


// ===================================
// EMAIL LINK STITCHING EFFECT
// ===================================

class EmailStitchEffect {
    constructor(emailLink) {
        this.emailLink = emailLink;
        this.stitches = [];
        this.numStitches = 0;
        this.currentStitch = 0;
        this.stitchSize = 4;
        // Authentic needlepoint spacing: stitches share holes
        this.spacing = this.stitchSize * 2; // Same as scroll stitches - tight grouping
        this.animationFrame = null;
        this.isAnimating = false;
        
        this.createStitchContainer();
        this.setupHoverListeners();
    }
    
    createStitchContainer() {
        // Create SVG container
        this.container = document.createElement('div');
        this.container.className = 'email-stitch-container';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('preserveAspectRatio', 'none');
        
        this.stitchGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.svg.appendChild(this.stitchGroup);
        this.container.appendChild(this.svg);
        
        this.emailLink.style.position = 'relative';
        this.emailLink.appendChild(this.container);
    }
    
    setupHoverListeners() {
        this.emailLink.addEventListener('mouseenter', () => {
            if (!this.isAnimating) {
                this.startStitching();
            }
        });
        
        this.emailLink.addEventListener('mouseleave', () => {
            this.resetStitches();
        });
    }
    
    startStitching() {
        // Calculate number of stitches based on link width
        const linkWidth = this.emailLink.offsetWidth;
        this.numStitches = Math.floor(linkWidth / this.spacing);
        
        // Clear existing stitches
        this.stitchGroup.innerHTML = '';
        this.stitches = [];
        this.currentStitch = 0;
        this.isAnimating = true;
        
        // Create stitch elements
        for (let i = 0; i < this.numStitches; i++) {
            const xPos = (i * this.spacing) + (this.spacing / 2);
            const stitch = this.createXStitch(xPos);
            this.stitches.push(stitch);
            this.stitchGroup.appendChild(stitch.group);
        }
        
        // Start animation
        this.animateNextStitch();
    }
    
    createXStitch(xPos) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        // Single diagonal stroke: bottom-left to top-right (needlepoint style)
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', xPos - this.stitchSize);
        line.setAttribute('y1', 7 + this.stitchSize);
        line.setAttribute('x2', xPos - this.stitchSize);
        line.setAttribute('y2', 7 + this.stitchSize);
        line.setAttribute('stroke', '#FF6B7A');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0');
        line.style.filter = 'drop-shadow(0.5px 1px 1px rgba(0, 0, 0, 0.2))';
        
        group.appendChild(line);
        
        return {
            group: group,
            line: line,
            xPos: xPos,
            progress: 0
        };
    }
    
    animateNextStitch() {
        if (this.currentStitch >= this.stitches.length) {
            this.isAnimating = false;
            return;
        }
        
        const stitch = this.stitches[this.currentStitch];
        const duration = 80; // milliseconds per stitch
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic for smooth deceleration
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            // Fade in the line as it starts drawing
            if (progress > 0) {
                stitch.line.setAttribute('opacity', '1');
            }
            
            // Animate the stitch growing from bottom-left to top-right
            const size = this.stitchSize;
            const centerX = stitch.xPos;
            const centerY = 7;
            
            stitch.line.setAttribute('x2', centerX - size + (size * 2 * easedProgress));
            stitch.line.setAttribute('y2', centerY + size - (size * 2 * easedProgress));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Move to next stitch
                this.currentStitch++;
                this.animateNextStitch();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    resetStitches() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Fade out existing stitches
        this.stitches.forEach((stitch, index) => {
            setTimeout(() => {
                if (stitch.group.parentNode) {
                    stitch.group.style.transition = 'opacity 0.2s ease';
                    stitch.group.style.opacity = '0';
                }
            }, index * 15);
        });
        
        // Clear after fade
        setTimeout(() => {
            this.stitchGroup.innerHTML = '';
            this.stitches = [];
        }, 300);
    }
}

// ===================================
// NEEDLE HOVER EFFECTS
// ===================================

function initNeedleHovers() {
    const needleElements = document.querySelectorAll('.needle-hover');
    
    needleElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.position = 'relative';
        });
    });
}

// ===================================
// SMOOTH SCROLL FOR ANCHORS
// ===================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const offset = 80;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// ===================================
// INTERSECTION OBSERVER FOR ANIMATIONS
// ===================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        section.style.opacity = '0';
        observer.observe(section);
    });
}

// ===================================
// EMBROIDERY HOOP ROTATION
// ===================================

function initHoopInteractions() {
    const hoops = document.querySelectorAll('.embroidery-hoop');
    
    hoops.forEach(hoop => {
        hoop.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            this.style.transform = 'rotate(5deg) scale(1.05)';
        });
        
        hoop.addEventListener('mouseleave', function() {
            this.style.transform = 'rotate(0deg) scale(1)';
        });
    });
}

// ===================================
// CROSS STITCH PATTERN GENERATOR
// ===================================

function animateCrossStitchPattern() {
    const pattern = document.querySelector('[id^="crossStitch"]');
    if (pattern) {
        // Add subtle animation to the cross stitch pattern
        let offset = 0;
        setInterval(() => {
            offset += 0.5;
            // This creates a subtle "shimmer" effect
        }, 50);
    }
}

// ===================================
// EXPANDABLE GALLERY CARDS
// ===================================

class ExpandableGallery {
    constructor() {
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = this.lightbox.querySelector('.lightbox-image');
        this.lightboxCaption = this.lightbox.querySelector('.lightbox-caption');
        this.closeBtn = this.lightbox.querySelector('.lightbox-close');
        this.prevBtn = this.lightbox.querySelector('.lightbox-prev');
        this.nextBtn = this.lightbox.querySelector('.lightbox-next');
        
        this.currentImages = [];
        this.currentIndex = 0;
        this.categoryName = '';
        this.currentExpandedCard = null;
        
        // Gallery data with all images from new folders
        this.galleries = {
            'custom-canvases': {
                name: 'Custom Canvases',
                images: [
                    { src: 'images/recent-canvases/1CustomCanvases/Winston.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Winston.jpg', alt: 'Winston' },
                    { src: 'images/recent-canvases/1CustomCanvases/Mazie-and-Smiley.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Mazie-and-Smiley.jpg', alt: 'Mazie & Smiley' },
                    { src: 'images/recent-canvases/1CustomCanvases/CampFlannelFizz.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CampFlannelFizz.jpg', alt: 'Camp Flannel & Fizz' },
                    { src: 'images/recent-canvases/1CustomCanvases/CowboyBear.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CowboyBear.jpg', alt: 'Cowboy Bear' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRectangle.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRectangle.jpg', alt: 'Happy Hollow (Rectangle)' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRound.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRound.jpg', alt: 'Happy Hollow (Round)' },
                    { src: 'images/recent-canvases/1CustomCanvases/Mazie.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Mazie.jpg', alt: 'Mazie' },
                    { src: 'images/recent-canvases/1CustomCanvases/MommyOnly.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-MommyOnly.jpg', alt: 'Mommy Only' },
                    { src: 'images/recent-canvases/1CustomCanvases/Smiley.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Smiley.jpg', alt: 'Smiley' },
                    { src: 'images/recent-canvases/1CustomCanvases/YouAreMySunshine2.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-YouAreMySunshine2.jpg', alt: 'You Are My Sunshine' }
                ]
            },
            'hot-originals': {
                name: 'HoT Originals',
                images: [
                    { src: 'images/recent-canvases/2HoT-originals/SephoraHoliday.jpeg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraHoliday.jpg', alt: 'Sephora (Holiday)' },
                    { src: 'images/recent-canvases/2HoT-originals/SephoraStandard.jpg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraStandard.jpg', alt: 'Sephora (Standard)' },
                    { src: 'images/recent-canvases/2HoT-originals/SharpestTool.jpeg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SharpestTool.jpg', alt: 'Sharpest Tool' }
                ]
            },
            'digital-charts': {
                name: 'Painted from Purchased Digital Charts',
                images: [
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/DuckHunt-by-TurtleStitchShop-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-DuckHunt-by-TurtleStitchShop-Etsy.jpg', alt: 'Duck Hunt (by TurtleStitchShop on Etsy)' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/FuckOff-by-HoopModernStitch-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-FuckOff-by-HoopModernStitch-Etsy.jpg', alt: 'Fuck Off (by HoopModernStitch on Etsy)' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpg', alt: 'Kermit with the Pearl Earring (by CherryMarryStore on Etsy)' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PeeWee-by-StitchedIts-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PeeWee-by-StitchedIts-Etsy.jpg', alt: 'Pee-Wee Herman (by StitchedIts on Etsy)' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PixelHearts-by-PixellPatterns-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PixelHearts-by-PixellPatterns-Etsy.jpg', alt: 'Pixel Hearts (by PixellPatterns on Etsy)' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PopeKermit-by-CherryMarryStore.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PopeKermit-by-CherryMarryStore.jpg', alt: 'Pope Kermit (by CherryMarryStore on Etsy)' }
                ]
            },
            'customizations': {
                name: 'Canvas Customizations',
                images: [
                    { src: 'images/recent-canvases/4CanvasCustomizations/Pinehurst-Customization-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Pinehurst-Customization-Before.jpg', alt: 'Pinehurst (Before)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Pinehurst-Customization-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Pinehurst-Customization-After.jpg', alt: 'Pinehurst (After)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-Before.jpg', alt: 'Lance Stocking (Before)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-After.jpg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-After.jpg', alt: 'Lance Stocking (After)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-After2.jpg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-After2.jpg', alt: 'Lance Stocking (After 2)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Kathryn-StockingCustomization-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Kathryn-StockingCustomization-After.jpg', alt: 'Kathryn Stocking (After)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/MM-CanvasMonogram-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-MM-CanvasMonogram-Before.jpg', alt: 'MM Canvas Monogram (Before)' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/MM-CanvasMonogram-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-MM-CanvasMonogram-After.jpg', alt: 'MM Canvas Monogram (After)' }
                ]
            }
        };
        
        this.init();
    }
    
    init() {
        // Add click handlers to gallery cards
        document.querySelectorAll('.gallery-card').forEach(card => {
            // Make sure we only have one listener per card
            const handleClick = (e) => {
                // Don't toggle if clicking a thumbnail
                if (e.target.closest('.thumbnail-item')) return;
                
                // Only process clicks on this specific card's preview area
                if (!e.target.closest('.gallery-card-preview')) {
                    return;
                }
                
                e.stopPropagation();
                e.preventDefault();
                const galleryId = card.dataset.gallery;
                this.toggleGallery(card, galleryId);
            };
            
            card.addEventListener('click', handleClick);
            
            // Keyboard accessibility
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    const galleryId = card.dataset.gallery;
                    this.toggleGallery(card, galleryId);
                }
            });
        });
        
        // Lightbox navigation handlers
        this.closeBtn.addEventListener('click', () => this.closeLightbox());
        this.prevBtn.addEventListener('click', () => this.navigate(-1));
        this.nextBtn.addEventListener('click', () => this.navigate(1));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;
            
            switch(e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
            }
        });
        
        // Close on background click
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
    }
    
    toggleGallery(card, galleryId) {
        const gallery = this.galleries[galleryId];
        if (!gallery) return;
        
        const isExpanded = card.getAttribute('aria-expanded') === 'true';
        
        // Close ALL other expanded cards first
        document.querySelectorAll('.gallery-card[aria-expanded="true"]').forEach(expandedCard => {
            if (expandedCard !== card) {
                this.collapseCard(expandedCard);
            }
        });
        
        if (isExpanded) {
            // Collapse this card
            this.collapseCard(card);
        } else {
            // Expand this card
            this.expandCard(card, galleryId, gallery);
        }
    }
    
    expandCard(card, galleryId, gallery) {
        card.setAttribute('aria-expanded', 'true');
        this.currentExpandedCard = card;
        
        // Generate thumbnails
        const thumbnailContainer = card.querySelector('.gallery-card-thumbnails');
        const thumbnailsGrid = document.createElement('div');
        thumbnailsGrid.className = 'thumbnails-grid';
        
        gallery.images.forEach((image, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail-item';
            thumbnail.setAttribute('role', 'button');
            thumbnail.setAttribute('tabindex', '0');
            thumbnail.setAttribute('aria-label', `View ${image.alt}`);
            
            // Add before/after badge for customization gallery
            if (galleryId === 'customizations') {
                const altLower = image.alt.toLowerCase();
                if (altLower.includes('before')) {
                    thumbnail.classList.add('before-after-badge');
                    thumbnail.setAttribute('data-badge', 'Before');
                } else if (altLower.includes('after')) {
                    thumbnail.classList.add('before-after-badge');
                    thumbnail.setAttribute('data-badge', 'After');
                }
            }
            
            const img = document.createElement('img');
            img.src = image.thumbnail || image.src; // Use thumbnail if available, fallback to full
            img.alt = image.alt;
            img.loading = 'lazy';
            
            // Add class for stocking images to enable top-alignment
            if (image.src.toLowerCase().includes('stocking') || (image.thumbnail && image.thumbnail.toLowerCase().includes('stocking'))) {
                img.classList.add('stocking-image');
            }
            
            thumbnail.appendChild(img);
            
            // Click to open in lightbox
            thumbnail.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openLightbox(galleryId, index);
            });
            
            // Keyboard support
            thumbnail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openLightbox(galleryId, index);
                }
            });
            
            thumbnailsGrid.appendChild(thumbnail);
        });
        
        thumbnailContainer.innerHTML = '';
        thumbnailContainer.appendChild(thumbnailsGrid);
        
        // Update preview text - preserve the title
        const previewText = card.querySelector('.gallery-preview-text');
        if (previewText) {
            const title = gallery.name;
            previewText.innerHTML = `<strong>${title}</strong> <span class="gallery-action-text">(Click a thumbnail to view full size)</span>`;
        }
    }
    
    collapseCard(card) {
        card.setAttribute('aria-expanded', 'false');
        const thumbnailContainer = card.querySelector('.gallery-card-thumbnails');
        
        // Clear thumbnails after animation
        setTimeout(() => {
            if (card.getAttribute('aria-expanded') === 'false') {
                thumbnailContainer.innerHTML = '';
            }
        }, 500);
        
        // Reset preview text - preserve the title
        const previewText = card.querySelector('.gallery-preview-text');
        if (previewText) {
            const galleryId = card.dataset.gallery;
            const gallery = this.galleries[galleryId];
            if (gallery) {
                const title = gallery.name;
                previewText.innerHTML = `<strong>${title}</strong> <span class="gallery-action-text">(Click to view all designs)</span>`;
            }
        }
        
        if (this.currentExpandedCard === card) {
            this.currentExpandedCard = null;
        }
    }
    
    openLightbox(galleryId, startIndex = 0) {
        const gallery = this.galleries[galleryId];
        if (!gallery) return;
        
        this.currentImages = gallery.images;
        this.categoryName = gallery.name;
        this.currentIndex = startIndex;
        
        this.showImage();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus close button for accessibility
        this.closeBtn.focus();
    }
    
    showImage() {
        if (this.currentImages.length === 0) return;
        
        const image = this.currentImages[this.currentIndex];
        this.lightboxImage.src = image.src;
        this.lightboxImage.alt = image.alt;
        this.lightboxCaption.textContent = `${image.alt} — ${this.categoryName} (${this.currentIndex + 1} of ${this.currentImages.length})`;
        
        // Add before/after badge to lightbox image
        const lightboxContent = this.lightbox.querySelector('.lightbox-content');
        const existingBadge = lightboxContent.querySelector('.lightbox-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Only add badge for customization gallery
        if (this.categoryName === 'Canvas Customizations') {
            const altLower = image.alt.toLowerCase();
            if (altLower.includes('before') || altLower.includes('after')) {
                const badge = document.createElement('div');
                badge.className = 'lightbox-badge';
                badge.textContent = altLower.includes('before') ? 'Before' : 'After';
                badge.setAttribute('data-type', altLower.includes('before') ? 'before' : 'after');
                lightboxContent.insertBefore(badge, this.lightboxCaption);
            }
        }
        
        // Show/hide navigation buttons
        if (this.currentImages.length <= 1) {
            this.prevBtn.style.display = 'none';
            this.nextBtn.style.display = 'none';
        } else {
            this.prevBtn.style.display = 'flex';
            this.nextBtn.style.display = 'flex';
        }
    }
    
    navigate(direction) {
        this.currentIndex += direction;
        
        // Loop around
        if (this.currentIndex < 0) {
            this.currentIndex = this.currentImages.length - 1;
        } else if (this.currentIndex >= this.currentImages.length) {
            this.currentIndex = 0;
        }
        
        this.showImage();
    }
    
    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===================================
// INITIALIZE EVERYTHING
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Logo entrance animation
    animateLogo();
    
    // Scroll stitch sidebar
    scrollStitchSidebar = new ScrollStitchSidebar();
    window.addEventListener('scroll', updateScrollStitch, { passive: true });
    updateScrollStitch();
    
    // Cursor trail
    const cursorTrail = new CursorTrail();
    
    // Rotating carousel (auto-rotating images in hoops)
    const rotatingCarousel = new RotatingCarousel();
    
    // Expandable gallery cards with lightbox
    const expandableGallery = new ExpandableGallery();
    
    // Email link stitching effect - apply to all links in about section
    const aboutLinks = document.querySelectorAll('.about-text a, .about-card a');
    aboutLinks.forEach(link => {
        const linkStitch = new EmailStitchEffect(link);
    });
    
    // Needle hover effects
    initNeedleHovers();
    
    // Smooth scrolling
    initSmoothScroll();
    
    // Scroll animations
    initScrollAnimations();
    
    // Hoop interactions
    initHoopInteractions();
    
    // Cross stitch pattern animation
    animateCrossStitchPattern();
    
});


// ===================================
// PERFORMANCE OPTIMIZATION
// ===================================

// Debounce function for resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize scroll performance
let ticking = false;
function optimizedScroll(callback) {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            callback();
            ticking = false;
        });
        ticking = true;
    }
}

// ===================================
// ACCESSIBILITY ENHANCEMENTS
// ===================================

// Announce page region changes for screen readers
const announcer = document.createElement('div');
announcer.setAttribute('role', 'status');
announcer.setAttribute('aria-live', 'polite');
announcer.setAttribute('aria-atomic', 'true');
announcer.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
`;
document.body.appendChild(announcer);

// ===================================
// ERROR HANDLING
// ===================================

window.addEventListener('error', (e) => {
    console.error('An error occurred:', e.error);
    // Gracefully degrade animations if errors occur
});

// ===================================
// REDUCED MOTION PREFERENCE
// ===================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    // Disable cursor trail for users who prefer reduced motion
    const canvas = document.getElementById('cursorCanvas');
    if (canvas) {
        canvas.style.display = 'none';
    }
}

console.log('✨ Haus of Toots is ready to stitch! ✨');

