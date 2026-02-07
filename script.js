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
// INITIALIZE EVERYTHING
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Logo entrance animation
    animateLogo();
    
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
    const cursorTrail = new CursorTrail();
    
    // Rotating carousel (auto-rotating images in hoops)
    const rotatingCarousel = new RotatingCarousel();
    
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

