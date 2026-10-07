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
    fetch('images/hauslogo-anim.svg?v=20260830b', { priority: 'low' })
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
        this.svg = document.querySelector('.stitch-line');
        this.group = this.svg?.querySelector('.sidebar-stitches');
        this.enabled = !!this.group;
        this.maxProgress = 0;
        this.lastProgress = 0;
        this.stitchDuration = 480;
        this.lastStart = -Infinity;
        this.stitches = [];
        this.active = new Set();
        this.frame = null;
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!this.enabled) return;

        this.resize();
        window.addEventListener('resize', () => {
            this.resize();
            updateScrollStitch();
        });
        this.motion.addEventListener('change', () => {
            if (this.motion.matches) this.finishActive();
        });
    }

    resize() {
        this.finishActive();
        const completed = this.stitches.filter(stitch => stitch.started).length;
        const { width, height } = this.svg.getBoundingClientRect();
        const headerBottom = document.querySelector('.top-nav')?.getBoundingClientRect().bottom || 0;
        const startY = Math.max(4, headerBottom + 12);
        this.svg.setAttribute('viewBox', `0 0 ${width || 25} ${height || 1}`);
        this.group.replaceChildren();
        this.stitches = [];
        // Give every stitch its own endpoints and room for the rounded caps.
        // A repeated pattern clipped at the scroll edge cuts stitches in half.
        const count = Math.max(0, Math.floor((height - startY - 8) / 8.4));
        const ns = 'http://www.w3.org/2000/svg';
        for (let i = 0; i < count; i++) {
            const paths = ['sidebar-stitch', 'sidebar-stitch-highlight'].map(className => {
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('class', className);
                path.setAttribute('pathLength', '1');
                path.setAttribute('stroke-dasharray', '1 1');
                path.setAttribute('stroke-dashoffset', '1');
                path.style.visibility = 'hidden';
                this.group.appendChild(path);
                return path;
            });
            const stitch = { paths, x: (width || 25) / 2, y: startY + i * 8.4, started: false };
            this.stitches.push(stitch);
            this.paint(stitch, 1);
        }
        this.stitches.slice(0, completed).forEach(stitch => {
            stitch.started = true;
            this.paint(stitch, 1, true);
        });
    }

    paint(stitch, progress, visible = false) {
        const { x, y } = stitch;
        // Start at the lower left hole. The loose thread bows outward, then
        // pulls straight between the holes after the tip reaches the upper right.
        const draw = Math.min(progress / 0.6, 1);
        const pull = Math.max(0, (progress - 0.6) / 0.4);
        const slack = Math.pow(1 - pull, 3);
        const d = `M ${x - 3.36} ${y + 6.72} Q ${x + slack * 4} ${y + 3.36 + slack * 3} ${x + 3.36} ${y}`;
        stitch.paths.forEach(path => {
            path.setAttribute('d', d);
            path.setAttribute('stroke-dashoffset', String(1 - draw));
            path.style.visibility = visible ? 'visible' : 'hidden';
        });
    }

    finishActive() {
        if (this.frame !== null) cancelAnimationFrame(this.frame);
        this.frame = null;
        this.active.forEach(stitch => this.paint(stitch, 1, true));
        this.active.clear();
    }

    update(scrollPercent) {
        if (!this.enabled || !Number.isFinite(scrollPercent)) return;
        const progress = Math.min(Math.max(scrollPercent, 0), 1);
        const movingDown = progress > this.lastProgress;
        this.lastProgress = progress;
        this.maxProgress = Math.max(this.maxProgress, progress);
        const now = performance.now();
        // Scroll distance only sets the available canvas. Time spent scrolling
        // earns stitches: no backlog and no automatic catch-up after stopping.
        if (!movingDown || this.active.size || now - this.lastStart < this.stitchDuration) return;
        const count = Math.floor(this.maxProgress * this.stitches.length);
        const stitch = this.stitches.slice(0, count).find(stitch => !stitch.started);
        if (!stitch) return;
        stitch.started = true;
        stitch.start = now;
        this.lastStart = now;
        if (this.motion.matches) {
            this.paint(stitch, 1, true);
        } else {
            this.active.add(stitch);
            this.frame = requestAnimationFrame(time => this.animate(time));
        }
    }

    animate(time) {
        this.active.forEach(stitch => {
            const progress = Math.min(Math.max((time - stitch.start) / this.stitchDuration, 0), 1);
            this.paint(stitch, progress, time >= stitch.start);
            if (progress === 1) this.active.delete(stitch);
        });
        this.frame = this.active.size ? requestAnimationFrame(next => this.animate(next)) : null;
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
    function closeNavMenu() {
        if (!navLinksContainer.classList.contains('active')) return;
        navToggle.setAttribute('aria-expanded', 'false');
        navLinksContainer.classList.remove('active');
        const overlayOpen = document.querySelector(
            '#productModal.open, #imageLightbox.open, .card-gallery-overlay.active:not(.card-gallery-inline)'
        );
        if (!overlayOpen) document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', () => {
        if (navLinksContainer.classList.contains('active')) {
            closeNavMenu();
        } else {
            navToggle.setAttribute('aria-expanded', 'true');
            navLinksContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    navLinksContainer.querySelectorAll('.nav-link').forEach(element => {
        element.addEventListener('click', closeNavMenu);
    });

    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navLinksContainer.contains(e.target)) {
            closeNavMenu();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeNavMenu();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 808) closeNavMenu();
    });
}
