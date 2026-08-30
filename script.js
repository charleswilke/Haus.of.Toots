// ===================================
// LOGO ENTRANCE ANIMATION
// ===================================
// The raster logo paints immediately; this lazily swaps it for the
// pre-processed stitch SVG (images/hauslogo-anim.svg — wordmark crop,
// stitch order, delays, and smoke offsets are all baked in at build
// time) so CSS can run the stitch-in entrance and smoke loop. If the
// fetch fails the raster logo simply stays put.

function swapInStitchLogo() {
    const img = document.getElementById('hausLogo');
    if (!img || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fetch('images/hauslogo-anim.svg?v=20260830', { priority: 'low' })
        .then(res => {
            if (!res.ok) throw new Error('svg fetch failed');
            return res.text();
        })
        .then(text => {
            const svg = new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('svg');
            if (!svg || !svg.querySelector('path')) return;
            svg.setAttribute('class', img.className);
            svg.id = img.id;
            img.replaceWith(svg);
        })
        .catch(() => {});
}

// ===================================
// SCROLL STITCH SIDEBAR
// ===================================

class ScrollStitchSidebar {
    constructor() {
        this.stitchProgress = document.getElementById('stitchProgress');
        this.needle = document.getElementById('needle');
        this.enabled = !!(this.stitchProgress && this.needle);
        this.maxProgress = 0;
    }
    
    update(scrollPercent) {
        if (!this.enabled || !Number.isFinite(scrollPercent)) {
            return;
        }

        const boundedProgress = Math.min(Math.max(scrollPercent, 0), 1);
        this.maxProgress = Math.max(this.maxProgress, boundedProgress);
        this.stitchProgress.setAttribute('height', String(this.maxProgress * 1000));

        const needleY = boundedProgress * 1000;
        this.needle.setAttribute('transform', `translate(30, ${needleY})`);
        this.needle.style.opacity = boundedProgress > 0 ? '1' : '0';
    }
}

let scrollStitchSidebar;

function updateScrollStitch() {
    // Guard against 0/0 → NaN when the page is no taller than the viewport
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;

    if (scrollStitchSidebar) {
        scrollStitchSidebar.update(scrollPercent);
    }
}

// ===================================
// CURSOR TRAIL STITCHING
// ===================================

class CursorTrail {
    constructor() {
        this.canvas = document.getElementById('cursorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.maxPoints = 30;
        this.isAnimating = false;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => this.addPoint(e));
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
        
        // Start animation loop if not already running
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.animate();
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
        
        // Only continue animating if there are active points
        if (this.points.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isAnimating = false;
        }
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

// ===================================
// INITIALIZE EVERYTHING
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Logo stitch entrance (index only — no-ops elsewhere)
    swapInStitchLogo();

    // Scroll stitch sidebar
    scrollStitchSidebar = new ScrollStitchSidebar();
    
    // Combined rAF-throttled scroll handler for stitch sidebar + nav
    let scrollTicking = false;
    const topNavEl = document.querySelector('.top-nav');
    
    function onScroll() {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                updateScrollStitch();
                if (topNavEl) {
                    topNavEl.classList.toggle('scrolled', window.scrollY > 50);
                }
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }
    
    window.addEventListener('scroll', onScroll, { passive: true });
    updateScrollStitch();
    
    // Cursor trail
    if (window.matchMedia('(pointer: fine)').matches && !prefersReducedMotion.matches) {
        new CursorTrail();
    }
    
    // Email link stitching effect - apply to all links in about section
    const aboutLinks = document.querySelectorAll('.about-text a, .about-card a');
    aboutLinks.forEach(link => {
        const linkStitch = new EmailStitchEffect(link);
    });
    
    // Needle hover effects
    initNeedleHovers();
    
    // Smooth scrolling
    initSmoothScroll();
    
});


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
    navLinksContainer.querySelectorAll('.nav-link').forEach(element => {
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
        if (window.innerWidth > 808) {
            navToggle.setAttribute('aria-expanded', 'false');
            navLinksContainer.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}
