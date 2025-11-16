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
// UNIFIED GALLERY WITH LAZY LOADING
// ===================================

class UnifiedGallery {
    constructor() {
        this.galleryGrid = document.getElementById('galleryGrid');
        this.galleryHero = document.getElementById('galleryHero');
        this.filterChips = document.querySelectorAll('.filter-chip');
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = this.lightbox.querySelector('.lightbox-image');
        this.lightboxCaption = this.lightbox.querySelector('.lightbox-caption');
        this.closeBtn = this.lightbox.querySelector('.lightbox-close');
        this.prevBtn = this.lightbox.querySelector('.lightbox-prev');
        this.nextBtn = this.lightbox.querySelector('.lightbox-next');
        
        this.currentFilter = 'all';
        this.allImages = [];
        this.currentImages = [];
        this.currentIndex = 0;
        this.heroIndex = 0;
        this.heroInterval = null;
        this.hasFilteredOnce = false; // Track if user has clicked a filter
        
        // Featured pieces with stories
        this.featuredPieces = [
            {
                src: 'images/recent-canvases/1CustomCanvases/Winston.jpeg',
                thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Winston.jpg',
                title: 'Winston',
                story: 'A beloved French Bulldog with the sweetest underbite. His owner wanted to capture his personality in needlepoint—complete with that mischievous gleam in his eye.'
            },
            {
                src: 'images/recent-canvases/1CustomCanvases/HappyHollowRectangle.jpeg',
                thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRectangle.jpg',
                title: 'Happy Hollow',
                story: 'A custom piece celebrating a family\'s favorite summer camp. Every detail matters—from the lake to the cabins—because these memories are woven into their story.'
            },
            {
                src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpeg',
                thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpg',
                title: 'Kermit with the Pearl Earring',
                story: 'Because sometimes you need Vermeer meets the Muppets. Painted from a digital chart by CherryMarryStore—equal parts classy and whimsical.'
            }
        ];
        
        // Gallery data with all images from new folders (with micro-stories)
        this.galleries = {
            'custom-canvases': {
                name: 'Custom Canvases',
                images: [
                    { src: 'images/recent-canvases/1CustomCanvases/Winston.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Winston.jpg', alt: 'Winston', story: 'custom pet portrait' },
                    { src: 'images/recent-canvases/1CustomCanvases/Mazie-and-Smiley.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Mazie-and-Smiley.jpg', alt: 'Mazie & Smiley', story: 'sibling duo' },
                    { src: 'images/recent-canvases/1CustomCanvases/CampFlannelFizz.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CampFlannelFizz.jpg', alt: 'Camp Flannel & Fizz', story: 'preppy summer vibes' },
                    { src: 'images/recent-canvases/1CustomCanvases/CowboyBear.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-CowboyBear.jpg', alt: 'Cowboy Bear', story: 'wild west cuteness' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRectangle.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRectangle.jpg', alt: 'Happy Hollow', story: 'summer camp memories' },
                    { src: 'images/recent-canvases/1CustomCanvases/HappyHollowRound.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-HappyHollowRound.jpg', alt: 'Happy Hollow (Round)', story: 'camp crest variation' },
                    { src: 'images/recent-canvases/1CustomCanvases/Mazie.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Mazie.jpg', alt: 'Mazie', story: 'custom pet portrait' },
                    { src: 'images/recent-canvases/1CustomCanvases/MommyOnly.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-MommyOnly.jpg', alt: 'Mommy Only', story: 'playful family sign' },
                    { src: 'images/recent-canvases/1CustomCanvases/Smiley.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-Smiley.jpg', alt: 'Smiley', story: 'custom pet portrait' },
                    { src: 'images/recent-canvases/1CustomCanvases/YouAreMySunshine2.jpeg', thumbnail: 'images/recent-canvases/1CustomCanvases/hot-thumbnail-YouAreMySunshine2.jpg', alt: 'You Are My Sunshine', story: 'sentimental keepsake' }
                ]
            },
            'hot-originals': {
                name: 'HoT Originals',
                images: [
                    { src: 'images/recent-canvases/2HoT-originals/SephoraHoliday.jpeg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraHoliday.jpg', alt: 'Sephora', story: 'holiday edition design' },
                    { src: 'images/recent-canvases/2HoT-originals/SephoraStandard.jpg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SephoraStandard.jpg', alt: 'Sephora', story: 'original design' },
                    { src: 'images/recent-canvases/2HoT-originals/SharpestTool.jpeg', thumbnail: 'images/recent-canvases/2HoT-originals/hot-thumbnail-SharpestTool.jpg', alt: 'Sharpest Tool', story: 'witty wordplay piece' }
                ]
            },
            'digital-charts': {
                name: 'Digital Charts',
                images: [
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/DuckHunt-by-TurtleStitchShop-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-DuckHunt-by-TurtleStitchShop-Etsy.jpg', alt: 'Duck Hunt', story: 'nostalgic gamer classic' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/FuckOff-by-HoopModernStitch-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-FuckOff-by-HoopModernStitch-Etsy.jpg', alt: 'Fuck Off', story: 'bold modern statement' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-Kermit-w-PearlEarring-by-CherryMarryStore-Etsy.jpg', alt: 'Kermit with Pearl Earring', story: 'art history meets Muppets' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PeeWee-by-StitchedIts-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PeeWee-by-StitchedIts-Etsy.jpg', alt: 'Pee-Wee Herman', story: 'cult classic character' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PixelHearts-by-PixellPatterns-Etsy.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PixelHearts-by-PixellPatterns-Etsy.jpg', alt: 'Pixel Hearts', story: 'retro 8-bit love' },
                    { src: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/PopeKermit-by-CherryMarryStore.jpeg', thumbnail: 'images/recent-canvases/3PaintedFromPurchasedDigitalCharts/hot-thumbnail-PopeKermit-by-CherryMarryStore.jpg', alt: 'Pope Kermit', story: 'blessed and iconic' }
                ]
            },
            'customizations': {
                name: 'Customizations',
                images: [
                    { src: 'images/recent-canvases/4CanvasCustomizations/Pinehurst-Customization-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Pinehurst-Customization-Before.jpg', alt: 'Pinehurst (Before)', story: 'original canvas' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Pinehurst-Customization-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Pinehurst-Customization-After.jpg', alt: 'Pinehurst (After)', story: 'personalized update' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-Before.jpg', alt: 'Lance Stocking (Before)', story: 'original canvas' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-After.jpg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-After.jpg', alt: 'Lance Stocking (After)', story: 'name added' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Lance-StockingCustomization-After2.jpg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Lance-StockingCustomization-After2.jpg', alt: 'Lance Stocking', story: 'finished detail' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/Kathryn-StockingCustomization-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-Kathryn-StockingCustomization-After.jpg', alt: 'Kathryn Stocking', story: 'personalized stocking' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/MM-CanvasMonogram-Before.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-MM-CanvasMonogram-Before.jpg', alt: 'MM Monogram (Before)', story: 'original canvas' },
                    { src: 'images/recent-canvases/4CanvasCustomizations/MM-CanvasMonogram-After.jpeg', thumbnail: 'images/recent-canvases/4CanvasCustomizations/hot-thumbnail-MM-CanvasMonogram-After.jpg', alt: 'MM Monogram (After)', story: 'custom monogram added' }
                ]
            }
        };
        
        this.init();
    }
    
    init() {
        // Build flat array of all images with category info
        this.buildImageArray();
        
        // Setup hero carousel
        this.setupHero();
        
        // Generate gallery items
        this.generateGallery();
        
        // Update filter counts
        this.updateFilterCounts();
        
        // Setup filter chips
        this.setupFilters();
        
        // Setup lazy loading
        this.setupLazyLoading();
        
        // Setup lightbox
        this.setupLightbox();
    }
    
    buildImageArray() {
        // Create flat array of all images with category metadata
        Object.entries(this.galleries).forEach(([categoryId, category]) => {
            category.images.forEach(image => {
                this.allImages.push({
                    ...image,
                    category: categoryId,
                    categoryName: category.name
                });
            });
        });
    }
    
    setupHero() {
        if (!this.galleryHero) return;
        
        const imageContainer = this.galleryHero.querySelector('.gallery-hero-image');
        const title = this.galleryHero.querySelector('.hero-story-title');
        const text = this.galleryHero.querySelector('.hero-story-text');
        const dotsContainer = this.galleryHero.querySelector('.hero-story-dots');
        
        // Wait for images to be built, then create hero slides from all gallery items
        setTimeout(() => {
            if (this.allImages.length === 0) return;
            
            // Create featured pieces from all gallery items with micro-stories
            this.heroSlides = this.allImages.map(img => ({
                src: img.src,
                thumbnail: img.thumbnail,
                title: img.alt,
                story: `${img.story || img.categoryName} • ${img.categoryName}`
            }));
            
            // Limit dots to reasonable number for UI
            const maxDots = 10;
            const dotStep = Math.ceil(this.heroSlides.length / maxDots);
            
            // Create dots for navigation (show up to 10 dots)
            for (let i = 0; i < Math.min(maxDots, this.heroSlides.length); i++) {
                const dot = document.createElement('div');
                dot.className = 'hero-story-dot';
                if (i === 0) dot.classList.add('active');
                const slideIndex = i * dotStep;
                dot.addEventListener('click', () => this.showHeroSlide(slideIndex));
                dotsContainer.appendChild(dot);
            }
            
            // Show first slide
            this.showHeroSlide(0);
            
            // Auto-rotate every 6 seconds through all images
            this.heroInterval = setInterval(() => {
                this.heroIndex = (this.heroIndex + 1) % this.heroSlides.length;
                this.showHeroSlide(this.heroIndex);
            }, 6000);
            
            // Pause on hover
            this.galleryHero.addEventListener('mouseenter', () => {
                if (this.heroInterval) {
                    clearInterval(this.heroInterval);
                    this.heroInterval = null;
                }
            });
            
            this.galleryHero.addEventListener('mouseleave', () => {
                if (!this.heroInterval) {
                    this.heroInterval = setInterval(() => {
                        this.heroIndex = (this.heroIndex + 1) % this.heroSlides.length;
                        this.showHeroSlide(this.heroIndex);
                    }, 6000);
                }
            });
        }, 100);
    }
    
    showHeroSlide(index) {
        if (!this.heroSlides || this.heroSlides.length === 0) return;
        
        this.heroIndex = index;
        const piece = this.heroSlides[index];
        
        const heroContent = this.galleryHero.querySelector('.gallery-hero-content');
        const imageContainer = this.galleryHero.querySelector('.gallery-hero-image');
        const category = this.galleryHero.querySelector('.hero-story-category');
        const title = this.galleryHero.querySelector('.hero-story-title');
        const text = this.galleryHero.querySelector('.hero-story-text');
        const dots = this.galleryHero.querySelectorAll('.hero-story-dot');
        
        // Reset and trigger card dealing animation
        heroContent.style.animation = 'none';
        setTimeout(() => {
            heroContent.style.animation = 'dealCard 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }, 10);
        
        // Slide out current image, then slide in new one (card dealing effect)
        imageContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        imageContainer.style.transform = 'translateX(-30px) scale(0.95)';
        imageContainer.style.opacity = '0';
        
        setTimeout(() => {
            imageContainer.innerHTML = `<img src="${piece.thumbnail || piece.src}" alt="${piece.title}">`;
            
            // Reset position and slide in
            imageContainer.style.transform = 'translateX(30px) scale(0.95)';
            
            setTimeout(() => {
                imageContainer.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease';
                imageContainer.style.transform = 'translateX(0) scale(1)';
                imageContainer.style.opacity = '1';
            }, 50);
        }, 300);
        
        // Parse category from story (format: "story • category")
        const storyParts = piece.story.split(' • ');
        const categoryName = storyParts[1] || piece.story;
        const storyText = storyParts[0] || piece.story;
        
        // Update content with pop-in animations (reset and replay)
        category.style.animation = 'none';
        title.style.animation = 'none';
        text.style.animation = 'none';
        
        setTimeout(() => {
            category.textContent = categoryName;
            title.textContent = piece.title;
            text.textContent = storyText;
            
            // Trigger bounce-in animations
            setTimeout(() => {
                category.style.animation = 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                title.style.animation = 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards';
                text.style.animation = 'popIn 0.4s ease-out 0.2s forwards';
            }, 300);
        }, 10);
        
        // Update navigation dots
        const maxDots = 10;
        const dotStep = Math.ceil(this.heroSlides.length / maxDots);
        const activeDot = Math.floor(index / dotStep);
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === activeDot);
        });
    }
    
    generateGallery() {
        this.galleryGrid.innerHTML = '';
        
        this.allImages.forEach((image, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item-unified hidden'; // Start hidden
            item.dataset.category = image.category;
            item.dataset.index = index;
            item.setAttribute('role', 'button');
            item.setAttribute('tabindex', '0');
            item.setAttribute('aria-label', `View ${image.alt}`);
            
            // Create image element with lazy loading
            const img = document.createElement('img');
            img.className = 'gallery-item-image';
            img.dataset.src = image.thumbnail || image.src;
            img.alt = image.alt;
            img.setAttribute('data-lazy', 'true');
            
            // Create micro-story caption
            const caption = document.createElement('div');
            caption.className = 'gallery-item-caption';
            
            const captionTitle = document.createElement('div');
            captionTitle.className = 'gallery-item-caption-title';
            captionTitle.textContent = image.alt;
            
            const captionSubtitle = document.createElement('div');
            captionSubtitle.className = 'gallery-item-caption-subtitle';
            captionSubtitle.textContent = image.story || image.categoryName;
            
            caption.appendChild(captionTitle);
            caption.appendChild(captionSubtitle);
            
            item.appendChild(img);
            item.appendChild(caption);
            
            // Add before/after badge for customizations
            if (image.category === 'customizations') {
                const altLower = image.alt.toLowerCase();
                if (altLower.includes('before')) {
                    const badge = document.createElement('div');
                    badge.className = 'gallery-item-badge before';
                    badge.textContent = 'Before';
                    item.appendChild(badge);
                } else if (altLower.includes('after')) {
                    const badge = document.createElement('div');
                    badge.className = 'gallery-item-badge after';
                    badge.textContent = 'After';
                    item.appendChild(badge);
                }
            }
            
            // Click handler
            item.addEventListener('click', () => this.openLightbox(index));
            
            // Keyboard support
            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openLightbox(index);
                }
            });
            
            this.galleryGrid.appendChild(item);
        });
    }
    
    updateFilterCounts() {
        // Count images per category
        const counts = {
            'all': this.allImages.length
        };
        
        Object.keys(this.galleries).forEach(categoryId => {
            counts[categoryId] = this.allImages.filter(img => img.category === categoryId).length;
        });
        
        // Update chip counts
        this.filterChips.forEach(chip => {
            const filter = chip.dataset.filter;
            const countElem = chip.querySelector('.chip-count');
            if (countElem && counts[filter] !== undefined) {
                countElem.textContent = counts[filter];
            }
        });
    }
    
    setupFilters() {
        this.filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filter;
                this.applyFilter(filter);
                
                // Update active state
                this.filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
    }
    
    applyFilter(filter) {
        this.currentFilter = filter;
        const items = this.galleryGrid.querySelectorAll('.gallery-item-unified');
        
        // Track if this is the first filter interaction
        if (!this.hasFilteredOnce) {
            this.hasFilteredOnce = true;
        }
        
        items.forEach((item, index) => {
            const itemCategory = item.dataset.category;
            
            if (filter === 'all' || itemCategory === filter) {
                item.classList.remove('hidden');
                // Stagger animation
                setTimeout(() => {
                    item.classList.add('loaded');
                }, index * 30);
            } else {
                item.classList.add('hidden');
                item.classList.remove('loaded');
            }
        });
    }
    
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-lazy');
                        
                        img.onload = () => {
                            const item = img.closest('.gallery-item-unified');
                            if (item && !item.classList.contains('hidden')) {
                                item.classList.add('loaded');
                            }
                        };
                    }
                    
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        // Observe all lazy images
        const lazyImages = this.galleryGrid.querySelectorAll('img[data-lazy]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    setupLightbox() {
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
    
    openLightbox(startIndex = 0) {
        // Get current filtered images
        const visibleItems = Array.from(this.galleryGrid.querySelectorAll('.gallery-item-unified:not(.hidden)'));
        this.currentImages = visibleItems.map(item => {
            const index = parseInt(item.dataset.index);
            return this.allImages[index];
        });
        
        // Find the index in the filtered list
        const globalIndex = parseInt(startIndex);
        const filteredIndex = this.currentImages.findIndex(img => {
            return this.allImages.indexOf(img) === globalIndex;
        });
        
        this.currentIndex = filteredIndex >= 0 ? filteredIndex : 0;
        
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
        this.lightboxCaption.textContent = `${image.alt} — ${image.categoryName} (${this.currentIndex + 1} of ${this.currentImages.length})`;
        
        // Add before/after badge to lightbox image
        const lightboxContent = this.lightbox.querySelector('.lightbox-content');
        const existingBadge = lightboxContent.querySelector('.lightbox-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Only add badge for customization category
        if (image.category === 'customizations') {
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
    
    // Unified gallery with lazy loading and filters
    const unifiedGallery = new UnifiedGallery();
    
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

// ===================================
// TOP NAVIGATION
// ===================================

// Add scroll effect to navigation
const topNav = document.querySelector('.top-nav');
if (topNav) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            topNav.classList.add('scrolled');
        } else {
            topNav.classList.remove('scrolled');
        }
    });
}

// Highlight active page in navigation
const currentPage = window.location.pathname;
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    const linkPath = new URL(link.href).pathname;
    // Check if the link matches current page, accounting for index.html being the root
    if (linkPath === currentPage || 
        (currentPage === '/' && linkPath.endsWith('index.html')) ||
        (currentPage.endsWith('index.html') && linkPath === '/')) {
        link.classList.add('active');
    }
});

// Hamburger menu toggle
const navToggle = document.getElementById('navToggle');
const navLinksContainer = document.getElementById('navLinks');

if (navToggle && navLinksContainer) {
    navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navLinksContainer.classList.toggle('active');
        
        // Prevent body scroll when menu is open
        if (!isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close menu when clicking on a link or cart button
    navLinksContainer.querySelectorAll('.nav-link, .nav-cart-button').forEach(element => {
        element.addEventListener('click', () => {
            navToggle.setAttribute('aria-expanded', 'false');
            navLinksContainer.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navLinksContainer.contains(e.target)) {
            if (navLinksContainer.classList.contains('active')) {
                navToggle.setAttribute('aria-expanded', 'false');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
    
    // Close menu on window resize if it's larger than 768px
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navToggle.setAttribute('aria-expanded', 'false');
            navLinksContainer.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

console.log('✨ Haus of Toots is ready to stitch! ✨');

