/**
 * PORTFOLIO INTERACTION ENGINE (script.js)
 * Implements smooth scroll, GSAP ScrollTrigger animations,
 * keyboard-accessible letter-roll odometer with proper reset,
 * nav dark-mode adaptation, smooth CTA scroll, and SVG liquid text ripples.
 */

window.addEventListener('DOMContentLoaded', () => {
    // Read user's motion preferences
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Verify library initialization
    const gsapEnabled = typeof gsap !== 'undefined';
    const scrollTriggerEnabled = typeof ScrollTrigger !== 'undefined';
    const lenisEnabled = typeof Lenis !== 'undefined';

    // Register GSAP ScrollTrigger plugin
    if (gsapEnabled && scrollTriggerEnabled) {
        gsap.registerPlugin(ScrollTrigger);
    }

    // ── 1. Init Lenis Smooth Scroll ──
    let lenisInstance = null;
    if (!prefersReduced && lenisEnabled) {
        lenisInstance = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            infinite: false,
        });

        lenisInstance.on('scroll', () => {
            if (scrollTriggerEnabled) ScrollTrigger.update();
        });

        gsap.ticker.add((time) => { lenisInstance.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
    }

    // ── 2. Hero Entrance Animation (Word-by-word staggered reveal) ──
    if (!prefersReduced && gsapEnabled) {
        const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.55 } });
        const line1Words = document.querySelectorAll('.line-1 .word');
        const line2Words = document.querySelectorAll('.line-2 .word');
        const line3Words = document.querySelectorAll('.line-3 .word');
        const fadeEls = document.querySelectorAll('[data-animate="hero-fade"]');

        gsap.set('.hero-headline .word', { y: 30, opacity: 0, filter: 'blur(6px)' });
        gsap.set(fadeEls, { opacity: 0, y: 20 });

        heroTl
            .to(line1Words, { y: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.07 })
            .to(line2Words, { y: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.07 }, '+=0.05')
            .to(line3Words, { y: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.07 }, '+=0.05')
            .to(fadeEls, { opacity: 1, y: 0, stagger: 0.12, duration: 0.8 }, '+=0.1');
    } else {
        document.querySelectorAll('.hero-headline .word').forEach(el => {
            el.style.transform = 'none';
            el.style.opacity = '1';
            el.style.filter = 'none';
        });
        document.querySelectorAll('[data-animate="hero-fade"]').forEach(el => el.style.opacity = '1');
    }

    // ── 3. Nav Bar — Single GSAP Scrub: Full-Width → Floating Pill ──
    const navBar = document.getElementById('main-nav');

    if (navBar && gsapEnabled && scrollTriggerEnabled && !prefersReduced) {
        const navTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: 'body',
                start: 'top top',
                end: '300px top',
                scrub: true,
            }
        });

        navTimeline.to(navBar, {
            top: '16px',
            maxWidth: '600px',
            borderRadius: '9999px',
            height: '52px',
            '--nav-bg-opacity': 0.12,
            boxShadow: 'rgba(0, 0, 0, 0.22) 3px 5px 30px',
            ease: 'none'
        });
    } else if (navBar) {
        navBar.style.setProperty('--nav-bg-opacity', '0.12');
        navBar.style.boxShadow = 'rgba(0, 0, 0, 0.08) 0 2px 10px';
    }

    // ── 4. Active Section Nav Tracker (IntersectionObserver) ──
    const sections = document.querySelectorAll('section[id], footer[id]');
    const navLinks = document.querySelectorAll('.nav-roll-link');

    if (sections.length && navLinks.length) {
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    navLinks.forEach((link) => {
                        const href = link.getAttribute('href');
                        link.classList.toggle('active', href === `#${sectionId}`);
                    });
                }
            });
        }, { root: null, rootMargin: '-30% 0px -50% 0px', threshold: 0 });

        sections.forEach((section) => sectionObserver.observe(section));
    }

    // ── 5. Nav Dark Adaptation — stays legible over dark footer ──
    // Fix 5: Toggle .nav--on-dark when footer enters the viewport
    if (navBar) {
        const footerEl = document.querySelector('footer.footer-tile');
        if (footerEl) {
            const darkObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    navBar.classList.toggle('nav--on-dark', entry.isIntersecting);
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0.03   // toggle once ~3% of footer is visible
            });
            darkObserver.observe(footerEl);
        }
    }

    // ── 6. Nav Label Letter-Roll Odometer — redesigned: no per-char spans ──
    // Each letter-roll link becomes a single clipped container with translateY scrolling
    // through words. This avoids ALL inter-span spacing issues.
    const rollLinks = document.querySelectorAll('.nav-roll-link, .btn-roll-link, .mobile-nav-link');

    rollLinks.forEach((link) => {
        const originalText = link.textContent.trim();
        link.setAttribute('data-text', originalText);

        // Inject screen-reader label
        link.innerHTML = `<span class="sr-only">${originalText}</span>`;

        // Decorative container — hidden from accessibility tree
        const wrapper = document.createElement('span');
        wrapper.className = 'letter-roll-word-wrap';
        wrapper.setAttribute('aria-hidden', 'true');
        link.appendChild(wrapper);

        // Read strip height (one line = one character height)
        const computedH = window.getComputedStyle(link).getPropertyValue('--strip-h');
        const lh = parseInt(computedH) || 16;

        // Build 3 lines: originalText → scrambled → originalText
        // We layout them vertically using <span> blocks, each full-word line
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        const scramble = (text) => {
            return text.split('').map(c => (c === ' ') ? ' ' : alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        };

        const lines = [
            originalText,
            scramble(originalText),
            scramble(originalText),
            scramble(originalText),
            originalText,
        ];

        // Wrapper clips to one line height
        wrapper.style.cssText = `
            display: inline-flex;
            flex-direction: column;
            overflow: hidden;
            height: ${lh}px;
            will-change: transform;
        `;

        const innerTrack = document.createElement('span');
        innerTrack.style.cssText = `
            display: flex;
            flex-direction: column;
            transform: translateY(0px);
        `;
        wrapper.appendChild(innerTrack);

        lines.forEach((lineText) => {
            const lineEl = document.createElement('span');
            lineEl.style.cssText = `
                display: block;
                height: ${lh}px;
                line-height: ${lh}px;
                white-space: nowrap;
                letter-spacing: inherit;
            `;
            lineEl.textContent = lineText;
            innerTrack.appendChild(lineEl);
        });

        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const totalLines = lines.length;
        const restingY = 0;
        const landY = -(lh * (totalLines - 1));

        // mouseenter: roll to final line (same text as first)
        const triggerRoll = () => {
            if (prefersReduced || !gsapEnabled) return;
            gsap.fromTo(innerTrack,
                { y: restingY },
                {
                    y: landY,
                    duration: 0.55,
                    ease: 'power3.out',
                    overwrite: true
                }
            );
        };

        // mouseleave: snap back to resting position
        const resetRoll = () => {
            if (prefersReduced || !gsapEnabled) return;
            gsap.to(innerTrack, {
                y: restingY,
                duration: 0.3,
                ease: 'power2.out',
                overwrite: true
            });
        };

        link._triggerRoll = triggerRoll;

        if (isTouch) {
            setTimeout(triggerRoll, 1200);
        } else {
            link.addEventListener('mouseenter', triggerRoll);
            link.addEventListener('mouseleave', resetRoll);
            link.addEventListener('focus', triggerRoll);
            link.addEventListener('blur', resetRoll);
        }
    });


    // ── 7. "View Work" Smooth Scroll Navigation ──
    const viewWorkCta = document.getElementById('view-work-cta');
    if (viewWorkCta && lenisInstance) {
        viewWorkCta.addEventListener('click', (e) => {
            e.preventDefault();
            lenisInstance.scrollTo('#work', {
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
        });
    }

    // ── 8. Footer Wordmark — Scroll-Entrance Animation (Fix 6) ──
    const wordmark = document.getElementById('liquid-wordmark');

    if (wordmark) {
        if (prefersReduced) {
            // Skip animation: show immediately at final state
            gsap.set(wordmark, { opacity: 1, y: 0, clearProps: 'transform' });
        } else if (gsapEnabled && scrollTriggerEnabled) {
            // Set initial hidden state IN JS so CSS doesn't conflict
            gsap.set(wordmark, { opacity: 0, y: 70 });

            // One-time entrance — fires once, never re-triggers on scroll-up
            ScrollTrigger.create({
                trigger: wordmark,
                start: 'top 90%',
                once: true,
                onEnter: () => {
                    gsap.to(wordmark, {
                        opacity: 1,
                        y: 0,
                        duration: 1.0,
                        ease: 'power3.out',
                    });
                }
            });
        }
    }

    // ── 9. Liquid Wordmark Text Distortion Ripple (SVG displacement map) ──
    const turbNode = document.getElementById('turbulence-node');
    const dispMapNode = document.getElementById('displacement-map-node');

    if (wordmark && turbNode && dispMapNode && gsapEnabled && !prefersReduced) {
        let rippleTimeline = null;

        const triggerRipple = () => {
            if (rippleTimeline) rippleTimeline.kill();

            const filterStates = { baseFreq: 0.05, displacementScale: 25 };

            rippleTimeline = gsap.timeline({
                onUpdate: () => {
                    turbNode.setAttribute('baseFrequency', filterStates.baseFreq);
                    dispMapNode.setAttribute('scale', filterStates.displacementScale);
                }
            });

            rippleTimeline.to(filterStates, {
                baseFreq: 0.0,
                displacementScale: 0,
                duration: 0.75,
                ease: 'power3.out'
            });
        };

        wordmark.addEventListener('mouseenter', triggerRipple);

        if (scrollTriggerEnabled) {
            ScrollTrigger.create({
                trigger: wordmark,
                start: 'top 95%',
                onEnter: triggerRipple
            });
        }
    }

    // ── 10. Bottom Viewport Gradient Mask Progressive Blur ──
    const blurStrip = document.getElementById('blur-strip');
    const footerElement = document.getElementById('contact');

    if (blurStrip && footerElement && gsapEnabled && scrollTriggerEnabled && !prefersReduced) {
        gsap.set(blurStrip, { '--blur-amount': '20px' });

        ScrollTrigger.create({
            trigger: footerElement,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: true,
            onUpdate: (self) => {
                const currentBlur = 20 * (1 - self.progress);
                gsap.set(blurStrip, { '--blur-amount': `${currentBlur}px` });
            }
        });
    } else if (blurStrip) {
        blurStrip.style.display = 'none';
    }

    // ── 11. Mobile Hamburger Menu Toggle & Overlay Control ──
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    if (mobileMenuToggle && mobileNavOverlay) {
        const toggleMenu = (open) => {
            const shouldOpen = open !== undefined ? open : !mobileNavOverlay.classList.contains('is-open');
            
            mobileMenuToggle.classList.toggle('is-active', shouldOpen);
            mobileNavOverlay.classList.toggle('is-open', shouldOpen);
            
            mobileMenuToggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            mobileNavOverlay.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');

            // Prevent background body scroll when mobile menu is open
            if (shouldOpen) {
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                if (lenisInstance) lenisInstance.stop();
            } else {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                if (lenisInstance) lenisInstance.start();
            }

            if (shouldOpen) {
                // Focus first link in drawer for keyboard accessibility
                const firstLink = mobileNavOverlay.querySelector('a');
                if (firstLink) {
                    setTimeout(() => firstLink.focus(), 50);
                }

                // Staggered fade/translate entrance using GSAP
                if (gsapEnabled && !prefersReduced) {
                    gsap.fromTo(mobileNavLinks, 
                        { opacity: 0, y: 20 },
                        { 
                            opacity: 1, 
                            y: 0, 
                            stagger: 0.08, 
                            duration: 0.4, 
                            ease: 'power3.out',
                            overwrite: true
                        }
                    );
                } else {
                    mobileNavLinks.forEach(link => {
                        link.style.opacity = '1';
                        link.style.transform = 'none';
                    });
                }

                // Odometer staggered animation trigger on open
                mobileNavLinks.forEach((link, index) => {
                    if (link._triggerRoll) {
                        setTimeout(() => {
                            link._triggerRoll();
                        }, 120 + index * 60);
                    }
                });
            } else {
                // Focus return
                mobileMenuToggle.focus();
            }
        };

        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Close mobile drawer on overlay background click
        mobileNavOverlay.addEventListener('click', (e) => {
            if (e.target === mobileNavOverlay) {
                toggleMenu(false);
            }
        });

        // Close mobile drawer on overlay link click with smooth Lenis scroll
        mobileNavLinks.forEach((link) => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                
                // If it is a real external file (like About or Resume), allow default browser behavior
                if (targetId && (targetId.includes('about/index.html') || targetId.includes('resume.pdf') || targetId.includes('assets/docs/resume.pdf'))) {
                    toggleMenu(false);
                    return;
                }

                // For anchor hashes, do smooth Lenis scroll
                toggleMenu(false);
                if (targetId && targetId.startsWith('#') && lenisInstance) {
                    e.preventDefault();
                    lenisInstance.scrollTo(targetId, {
                        duration: 1.2,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                    });
                }
            });
        });

        // Focus trap
        mobileNavOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusableElements = mobileNavOverlay.querySelectorAll('a, button');
                const firstFocusable = focusableElements[0];
                const lastFocusable = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstFocusable || document.activeElement === mobileMenuToggle) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });

        // Close mobile drawer on Escape key press
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNavOverlay.classList.contains('is-open')) {
                toggleMenu(false);
            }
        });

        // Copy to clipboard with visual feedback
        const copyEmailBtns = document.querySelectorAll('.copy-email-btn');
        copyEmailBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const emailAddress = 'itsdesaiamit@gmail.com';
                navigator.clipboard.writeText(emailAddress).then(() => {
                    const copyIcon = btn.querySelector('.copy-icon');
                    const checkIcon = btn.querySelector('.check-icon');
                    if (copyIcon && checkIcon) {
                        copyIcon.style.display = 'none';
                        checkIcon.style.display = 'inline';
                        btn.style.color = '#ffffff';
                        setTimeout(() => {
                            copyIcon.style.display = 'inline';
                            checkIcon.style.display = 'none';
                            btn.style.color = '';
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy email address: ', err);
                });
            });
        });
    }
});

