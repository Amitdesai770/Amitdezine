/**
 * ABOUT PAGE - Story Section: Pinned Scroll-Reveal (v4 — gsap.matchMedia)
 *
 * Uses gsap.matchMedia() so animations are fully created/cleaned up
 * when the viewport crosses the 833px/834px boundary (resize, rotate, DevTools).
 *
 * Desktop (>= 834px, no prefers-reduced-motion):
 *   - Illustration entrance (scale + fade) once.
 *   - story-pin-wrap pinned for 280vh of scroll.
 *   - Phase 1 → left zone fades in, P1 words reveal grey→black.
 *   - Phase 2 → right zone fades in, P2 words reveal grey→black.
 *   - Phase 3 → bottom zone fades in, P3+P3b words reveal.
 *   - P1 parallax drift -32px Y over Phase 2+3; P2 drift -24px Y over Phase 3.
 *
 * Mobile (<= 833px, no prefers-reduced-motion):
 *   - No pin. Illustration fades + scales in via scrubbed ScrollTrigger.
 *   - Each paragraph zone fades in, words reveal grey→black individually,
 *     scrubbed against each paragraph's scroll position.
 *
 * prefers-reduced-motion (any width):
 *   - No animation. All content immediately at final black/visible state.
 */

window.addEventListener('DOMContentLoaded', () => {

    const gsapReady = typeof gsap !== 'undefined';
    const stReady   = typeof ScrollTrigger !== 'undefined';

    if (!gsapReady) return;
    if (stReady) gsap.registerPlugin(ScrollTrigger);

    // DOM refs
    const pinWrap        = document.getElementById('story-pin-wrap');
    const bottomZone     = document.getElementById('story-bottom-zone');
    const leftZone       = document.querySelector('.story-zone--left');
    const rightZone      = document.querySelector('.story-zone--right');
    const illustrationEl = document.querySelector('.story-illustration');

    if (!pinWrap) return;

    // ── Word Splitter ────────────────────────────────────────────────────────
    // Wraps each word in <span class="story-word [mods]">.
    // Detects <strong class="story-em"> → story-word--em
    //         <em    class="story-it">  → story-word--italic
    function splitStoryPara(paraEl) {
        if (!paraEl || paraEl.dataset.split === '1') return;
        const tokens = [];

        function walkNode(node, extraClasses) {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent.split(/(\s+)/).forEach(part => {
                    if (/^\s+$/.test(part)) {
                        tokens.push({ type: 'space', text: part });
                    } else if (part.length) {
                        tokens.push({ type: 'word', text: part, classes: extraClasses });
                    }
                });
            } else if (node.nodeName === 'STRONG' && node.classList.contains('story-em')) {
                Array.from(node.childNodes).forEach(c => walkNode(c, [...extraClasses, 'story-word--em']));
            } else if (node.nodeName === 'EM' && node.classList.contains('story-it')) {
                Array.from(node.childNodes).forEach(c => walkNode(c, [...extraClasses, 'story-word--italic']));
            } else if (node.nodeName === 'BR') {
                tokens.push({ type: 'br' });
            }
        }

        Array.from(paraEl.childNodes).forEach(n => walkNode(n, []));
        paraEl.innerHTML = '';
        tokens.forEach(token => {
            if (token.type === 'space') {
                paraEl.appendChild(document.createTextNode(token.text));
            } else if (token.type === 'word') {
                const span = document.createElement('span');
                span.className = ['story-word', ...token.classes].join(' ');
                span.textContent = token.text;
                paraEl.appendChild(span);
            } else if (token.type === 'br') {
                paraEl.appendChild(document.createElement('br'));
            }
        });
        paraEl.dataset.split = '1';
    }

    // Split all paragraphs once (safe to call multiple times due to dataset.split guard)
    ['story-p1', 'story-p2', 'story-p3', 'story-p3b'].forEach(id =>
        splitStoryPara(document.getElementById(id))
    );

    // ── Helper: force static/visible state (used by mobile + reduced-motion) ─
    function setStaticState() {
        [leftZone, rightZone, bottomZone].forEach(z => {
            if (z) { z.style.opacity = '1'; z.style.transform = 'none'; }
        });
        if (illustrationEl) {
            illustrationEl.style.opacity  = '1';
            illustrationEl.style.transform = 'none';
        }
        document.querySelectorAll('.story-word').forEach(w => {
            w.style.color = 'var(--color-ink)';
        });
        document.querySelectorAll('.story-word--em').forEach(w => {
            w.classList.add('is-revealed');
        });
    }

    // ── Phase helper (desktop pinned timeline) ───────────────────────────────
    // Consolidated bold snap — ONE tween per phase at 99% of phase end.
    // Previously per-word tweens extended timeline past TOTAL_DUR causing stuck-scroll.
    function addPhase(tl, words, startPos, phaseDur) {
        if (!words.length) return;
        const eachInterval = phaseDur / words.length;

        // Grey → black stagger across phaseDur
        tl.to(words, {
            color: 'var(--color-ink)',
            stagger: { each: eachInterval, ease: 'none' },
            duration: 0.001,
            ease: 'none',
        }, startPos);

        // Bold snap: single consolidated tween within the phase range
        const emWords = words.filter(w => w.classList.contains('story-word--em'));
        if (emWords.length) {
            tl.to(emWords, {
                fontWeight: 700,
                duration: 0.001,
                ease: 'none',
            }, startPos + phaseDur * 0.99);
        }
    }

    // ── gsap.matchMedia ──────────────────────────────────────────────────────
    // All animation setup is wrapped inside matchMedia so GSAP automatically
    // creates/cleans up triggers on resize and orientation change.
    if (!stReady) {
        // No ScrollTrigger — fall back to static immediately
        setStaticState();
        return;
    }

    const mm = gsap.matchMedia();

    // ── 1. Reduced motion (any width) ───────────────────────────────────────
    mm.add('(prefers-reduced-motion: reduce)', () => {
        setStaticState();
    });

    // ── 2. Desktop with motion ──────────────────────────────────────────────
    mm.add('(min-width: 834px) and (prefers-reduced-motion: no-preference)', () => {

        const p1Words = Array.from(document.querySelectorAll('#story-p1 .story-word'));
        const p2Words = Array.from(document.querySelectorAll('#story-p2 .story-word'));
        const p3Words = [
            ...Array.from(document.querySelectorAll('#story-p3 .story-word')),
            ...Array.from(document.querySelectorAll('#story-p3b .story-word')),
        ];

        // Initial hidden states
        gsap.set([...p1Words, ...p2Words, ...p3Words], { color: 'rgba(0,0,0,0.15)' });
        if (leftZone)       gsap.set(leftZone,       { opacity: 0, y: 0 });
        if (rightZone)      gsap.set(rightZone,      { opacity: 0, y: 0 });
        if (bottomZone)     gsap.set(bottomZone,     { opacity: 0 });
        if (illustrationEl) gsap.set(illustrationEl, { opacity: 0, scale: 0.88 });

        // Illustration entrance (one-shot, before pin activates)
        if (illustrationEl) {
            gsap.to(illustrationEl, {
                opacity: 1,
                scale: 1,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: { trigger: pinWrap, start: 'top 85%', once: true },
            });
        }

        // Proportional phase durations (word count → scroll share)
        const totalWords = p1Words.length + p2Words.length + p3Words.length;
        const TOTAL_DUR  = 9;
        const p1Dur = (p1Words.length / totalWords) * TOTAL_DUR;
        const p2Dur = (p2Words.length / totalWords) * TOTAL_DUR;
        const p3Dur = (p3Words.length / totalWords) * TOTAL_DUR;
        const p1Start = 0;
        const p2Start = p1Dur;
        const p3Start = p1Dur + p2Dur;
        const P1_FADE  = p1Dur * 0.08;
        const P2_FADE  = p2Dur * 0.08;

        // Pinned scrub timeline (owns the pin + word reveals + parallax drift)
        const storyTl = gsap.timeline({
            scrollTrigger: {
                trigger: pinWrap,
                start: 'top top',
                end: () => `+=${window.innerHeight * 2.8}`,
                pin: true,
                scrub: 0.8,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            },
        });

        // Phase 1
        if (leftZone)  storyTl.to(leftZone,  { opacity: 1, duration: P1_FADE, ease: 'power2.out' }, p1Start);
        addPhase(storyTl, p1Words, p1Start + P1_FADE, p1Dur - P1_FADE);

        // Phase 2
        if (rightZone) storyTl.to(rightZone, { opacity: 1, duration: P2_FADE, ease: 'power2.out' }, p2Start);
        addPhase(storyTl, p2Words, p2Start + P2_FADE, p2Dur - P2_FADE);

        // Phase 3
        if (bottomZone) storyTl.to(bottomZone, { opacity: 1, duration: p3Dur * 0.06, ease: 'none' }, p3Start);
        addPhase(storyTl, p3Words, p3Start + (p3Dur * 0.08), p3Dur * 0.92);

        // Parallax drift: P1 and P2 recede upward AFTER their own reveals complete.
        // Both drift tweens end at exactly TOTAL_DUR — no timeline extension.
        if (leftZone)  storyTl.fromTo(leftZone,  { y: 0 }, { y: -32, ease: 'none', duration: TOTAL_DUR - p2Start }, p2Start);
        if (rightZone) storyTl.fromTo(rightZone, { y: 0 }, { y: -24, ease: 'none', duration: TOTAL_DUR - p3Start }, p3Start);

        // Return cleanup (gsap.matchMedia calls this when query no longer matches)
        return () => {
            storyTl.scrollTrigger && storyTl.scrollTrigger.kill();
            storyTl.kill();
        };
    });

    // ── 3. Mobile with motion ───────────────────────────────────────────────
    // Non-pinned scroll-reveal: each paragraph fades in and reveals words
    // as the user scrolls naturally through the single-column stack.
    mm.add('(max-width: 833px) and (prefers-reduced-motion: no-preference)', () => {

        const p1Words = Array.from(document.querySelectorAll('#story-p1 .story-word'));
        const p2Words = Array.from(document.querySelectorAll('#story-p2 .story-word'));
        const p3Words = [
            ...Array.from(document.querySelectorAll('#story-p3 .story-word')),
            ...Array.from(document.querySelectorAll('#story-p3b .story-word')),
        ];

        // Initial grey words
        gsap.set([...p1Words, ...p2Words, ...p3Words], { color: 'rgba(0,0,0,0.15)' });

        // Illustration: fade + scale in as it scrolls into view
        if (illustrationEl) {
            gsap.set(illustrationEl, { opacity: 0, scale: 0.92 });
            gsap.to(illustrationEl, {
                opacity: 1,
                scale: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: illustrationEl,
                    start: 'top 88%',
                    end:   'top 60%',
                    scrub: true,
                },
            });
        }

        // Helper: create zone fade + word reveal scroll trigger for one paragraph
        function revealMobilePara(paraEl, words, zoneEl) {
            if (!paraEl || !words.length) return;

            // Zone container fades in as paragraph enters viewport
            if (zoneEl) {
                gsap.set(zoneEl, { opacity: 0 });
                gsap.to(zoneEl, {
                    opacity: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: paraEl,
                        start:   'top 90%',
                        end:     'top 72%',
                        scrub:   true,
                    },
                });
            }

            // Word color reveal: grey → black, staggered + scrubbed
            // Starts as paragraph top crosses 82% of viewport height (entering from bottom),
            // guaranteeing 0% progress (100% grey, word 1 included) when first visible.
            gsap.fromTo(words,
                { color: 'rgba(0,0,0,0.15)' },
                {
                    color: 'var(--color-ink)',
                    stagger: { each: 0.012, ease: 'none' },
                    ease: 'none',
                    immediateRender: true,
                    scrollTrigger: {
                        trigger: paraEl,
                        start:   'top 82%',
                        end:     'top 28%',
                        scrub:   true,
                    },
                }
            );

            // Bold snap: em-words snap when paragraph is mostly visible
            const emWords = words.filter(w => w.classList.contains('story-word--em'));
            if (emWords.length) {
                ScrollTrigger.create({
                    trigger:       paraEl,
                    start:         'top 60%',
                    toggleActions: 'play none none reverse',
                    onEnter:    () => gsap.set(emWords, { fontWeight: 700 }),
                    onLeaveBack: () => gsap.set(emWords, { fontWeight: 400 }),
                });
            }
        }

        const p1El = document.getElementById('story-p1');
        const p2El = document.getElementById('story-p2');
        const p3El = document.getElementById('story-p3');

        revealMobilePara(p1El, p1Words, leftZone);
        revealMobilePara(p2El, p2Words, rightZone);
        revealMobilePara(p3El, p3Words, bottomZone);
    });

    // Refresh on resize
    window.addEventListener('resize', () => ScrollTrigger.refresh());

});
