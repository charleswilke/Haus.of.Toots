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
        this.numStitches = 40; // Number of stitches along the sidebar - more stitches = tighter spacing
        this.stitchSize = 8; // Size of each stitch
        this.spacing = 1000 / this.numStitches; // Spacing between stitches in SVG units
        this.stitchSpeed = 0.8; // Speed multiplier - higher = stitches appear closer together as you scroll
        
        this.createStitches();
        window.lastScrollY = 0;
    }
    
    createStitches() {
        // Create all X stitch elements
        for (let i = 0; i < this.numStitches; i++) {
            const yPos = (i + 0.5) * this.spacing;
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
// GALLERY CAROUSEL
// ===================================

class GalleryCarousel {
    constructor() {
        this.currentIndex = 0;
        this.items = document.querySelectorAll('.gallery-item');
        this.dots = document.querySelectorAll('.dot');
        this.prevBtn = document.querySelector('.carousel-nav.prev');
        this.nextBtn = document.querySelector('.carousel-nav.next');
        
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goTo(index));
        });
        
        // Auto-advance carousel
        this.startAutoPlay();
    }
    
    update() {
        this.items.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentIndex);
        });
        
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
        });
    }
    
    next() {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.update();
        this.resetAutoPlay();
    }
    
    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.update();
        this.resetAutoPlay();
    }
    
    goTo(index) {
        this.currentIndex = index;
        this.update();
        this.resetAutoPlay();
    }
    
    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => this.next(), 5000);
    }
    
    resetAutoPlay() {
        clearInterval(this.autoPlayInterval);
        this.startAutoPlay();
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
    
    // Gallery carousel
    const carousel = new GalleryCarousel();
    
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
// KEYBOARD NAVIGATION
// ===================================

document.addEventListener('keydown', (e) => {
    const carousel = document.querySelector('.gallery-carousel');
    if (!carousel) return;
    
    if (e.key === 'ArrowLeft') {
        document.querySelector('.carousel-nav.prev').click();
    } else if (e.key === 'ArrowRight') {
        document.querySelector('.carousel-nav.next').click();
    }
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

// Skip to main content
const skipLink = document.createElement('a');
skipLink.href = '#main';
skipLink.textContent = 'Skip to main content';
skipLink.className = 'skip-link';
skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--coral-primary);
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 10000;
`;
skipLink.addEventListener('focus', function() {
    this.style.top = '0';
});
skipLink.addEventListener('blur', function() {
    this.style.top = '-40px';
});
document.body.insertBefore(skipLink, document.body.firstChild);

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

