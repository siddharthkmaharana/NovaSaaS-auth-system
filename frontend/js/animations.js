/* ============================================================
   NOVASAAS — animations.js
   Scroll reveals, typewriter, stats counter, magnetic CTA,
   nav scroll, pricing toggle, feature card mouse glow,
   testimonials marquee, CTA form redirect
   ============================================================ */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════
     1. UTILITY
  ════════════════════════════════════════════════════════════ */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutExpo(t)  { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ════════════════════════════════════════════════════════════
     2. SCROLL REVEAL
     Adds .visible to every .reveal element when it enters
     the viewport. Uses IntersectionObserver for performance.
  ════════════════════════════════════════════════════════════ */
  function initScrollReveal() {
    const els = qsa('.reveal');
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach(el => io.observe(el));
  }

  /* ════════════════════════════════════════════════════════════
     3. TYPEWRITER
     Cycles phrases with type → pause → delete → next loop.
     Target: #typewriter-text  Caret: .hero__caret (CSS blink)
  ════════════════════════════════════════════════════════════ */
  function initTypewriter() {
    const el = qs('#typewriter-text');
    if (!el) return;

    const phrases = [
      'Ship Faster Than Ever.',
      'Scale Without Limits.',
      'Convert More Leads.',
      'Automate Everything.',
    ];

    let phraseIndex  = 0;
    let charIndex    = 0;
    let deleting     = false;
    let paused       = false;

    /* Timing (ms) */
    const SPEED_TYPE   = 72;
    const SPEED_DELETE = 42;
    const PAUSE_AFTER  = 2400;
    const PAUSE_BEFORE = 380;

    function tick() {
      if (paused) return;
      const phrase = phrases[phraseIndex];

      if (!deleting) {
        charIndex++;
        el.textContent = phrase.slice(0, charIndex);
        if (charIndex === phrase.length) {
          paused = true;
          setTimeout(() => { deleting = true; paused = false; tick(); }, PAUSE_AFTER);
          return;
        }
        setTimeout(tick, SPEED_TYPE);
      } else {
        charIndex--;
        el.textContent = phrase.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          paused = true;
          setTimeout(() => { paused = false; tick(); }, PAUSE_BEFORE);
          return;
        }
        setTimeout(tick, SPEED_DELETE);
      }
    }

    /* Initial delay so page load animations settle first */
    setTimeout(tick, 1400);
  }

  /* ════════════════════════════════════════════════════════════
     4. STATS COUNTER
     Animates [data-target] numbers up from 0 on first viewport
     entry. Supports decimals and custom suffixes.
  ════════════════════════════════════════════════════════════ */
  function initStatsCounter() {
    const statEls = qsa('[data-target]');
    if (!statEls.length) return;

    function animateCount(el) {
      const target   = parseFloat(el.dataset.target);
      const suffix   = el.dataset.suffix   || '';
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const duration = 2200;
      const start    = performance.now();

      function frame(now) {
        const t   = Math.min((now - start) / duration, 1);
        const val = easeOutExpo(t) * target;
        el.textContent = (decimals
          ? val.toFixed(decimals)
          : Math.floor(val).toLocaleString()
        ) + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          animateCount(e.target);
          io.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );

    statEls.forEach(el => io.observe(el));
  }

  /* ════════════════════════════════════════════════════════════
     5. NAV SCROLL BEHAVIOUR
     Adds .scrolled to #navbar after 40px scroll.
  ════════════════════════════════════════════════════════════ */
  function initNavScroll() {
    const nav = qs('#navbar') || qs('.nav');
    if (!nav) return;

    function update() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ════════════════════════════════════════════════════════════
     6. NAV HAMBURGER
  ════════════════════════════════════════════════════════════ */
  function initHamburger() {
    const btn   = qs('#hamburger') || qs('.nav__hamburger');
    const links = qs('#nav-links')  || qs('.nav__links');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));

      /* Animate bars */
      const bars = Array.from(btn.querySelectorAll('span, .nav__hamburger-bar'));
      if (open) {
        bars[0] && (bars[0].style.transform = 'rotate(45deg) translate(5px,5px)');
        bars[1] && (bars[1].style.opacity   = '0');
        bars[2] && (bars[2].style.transform = 'rotate(-45deg) translate(5px,-5px)');
      } else {
        bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
      }
    });

    /* Close on link click (mobile) */
    qsa('a', links).forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        const bars = Array.from(btn.querySelectorAll('span, .nav__hamburger-bar'));
        bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     7. PRICING TOGGLE
     Switches between monthly / annual prices on all
     [data-monthly] + [data-annual] elements.
  ════════════════════════════════════════════════════════════ */
  function initPricingToggle() {
    const toggle = qs('#billing-toggle') || qs('.toggle');
    if (!toggle) return;

    let annual = false;

    function applyPrices() {
      qsa('[data-monthly]').forEach(el => {
        const from = annual ? el.dataset.monthly : el.dataset.annual;
        const to   = annual ? el.dataset.annual  : el.dataset.monthly;
        animatePrice(el, parseFloat(from || '0'), parseFloat(to || '0'));
      });

      /* Label highlight */
      const labelMonthly = qs('[data-label="monthly"]');
      const labelAnnual  = qs('[data-label="annual"]');
      if (labelMonthly) labelMonthly.classList.toggle('active', !annual);
      if (labelAnnual)  labelAnnual.classList.toggle('active',   annual);
    }

    function animatePrice(el, from, to) {
      const dur   = 380;
      const start = performance.now();
      function frame(now) {
        const t   = Math.min((now - start) / dur, 1);
        const val = from + (to - from) * easeOutCubic(t);
        el.textContent = Math.round(val);
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    toggle.addEventListener('click', () => {
      annual = !annual;
      toggle.classList.toggle('active', annual);
      toggle.classList.toggle('on',     annual);
      applyPrices();
    });
  }

  /* ════════════════════════════════════════════════════════════
     8. FEATURE CARD MOUSE GLOW
     Sets --mx / --my CSS vars so the radial gradient in CSS
     follows the cursor inside each [data-mouse-glow] card.
  ════════════════════════════════════════════════════════════ */
  function initCardMouseGlow() {
    qsa('[data-mouse-glow]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r  = card.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width  * 100).toFixed(2) + '%';
        const my = ((e.clientY - r.top)  / r.height * 100).toFixed(2) + '%';
        card.style.setProperty('--mx', mx);
        card.style.setProperty('--my', my);
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     9. MAGNETIC CTA BUTTON
     Adds a subtle magnetic pull on the primary hero button.
  ════════════════════════════════════════════════════════════ */
  function initMagneticButton() {
    const btn = qs('.btn-primary, .hero__btn-primary');
    if (!btn) return;

    const STRENGTH = 0.32;

    btn.addEventListener('mousemove', e => {
      const r  = btn.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;
      const dx = (e.clientX - cx) * STRENGTH;
      const dy = (e.clientY - cy) * STRENGTH;
      btn.style.transform = `translate(${dx}px, ${dy}px) translateY(-2px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  }

  /* ════════════════════════════════════════════════════════════
     10. TESTIMONIALS MARQUEE
     Builds cards from JS data and appends a duplicate set
     so the CSS marquee animation loops seamlessly.
  ════════════════════════════════════════════════════════════ */
  function initTestimonialsMarquee() {
    const track = qs('#marquee-track') || qs('.marquee-track');
    if (!track || track.children.length) return; /* already populated */

    const DATA = [
      { quote: 'NovaSaaS cut our infra setup time from 3 weeks to 2 hours. We shipped our MVP in a single sprint.',          name: 'Priya K.',    role: 'CTO @ Launchpad',      init: 'PK' },
      { quote: 'The analytics alone are worth it. Real-time cohort data changed how we think about retention.',               name: 'Marcus T.',   role: 'Founder @ Loopify',    init: 'MT' },
      { quote: 'We replaced 8 tools with NovaSaaS. The team was skeptical. Now they will not go back.',                      name: 'Sarah L.',    role: 'Head of Product @ Stackr', init: 'SL' },
      { quote: 'Billing automation saved us 20 hours a month. The dunning flows work like magic.',                            name: 'Ahmed R.',    role: 'CEO @ Gridline',       init: 'AR' },
      { quote: 'Onboarding took 9 minutes. I timed it. The docs are the best I have seen in SaaS.',                          name: 'Yuki M.',     role: 'Engineer @ Driftwave', init: 'YM' },
      { quote: 'We went from 0 to 10,000 users in 6 weeks. NovaSaaS scaled without a hiccup.',                               name: 'Elena V.',    role: 'Co-Founder @ Vortex',  init: 'EV' },
      { quote: 'The AI automation flows are next-level. We set up lead scoring in 20 minutes. Zero code.',                    name: 'Daniel W.',   role: 'Growth @ Pulsar',      init: 'DW' },
      { quote: 'Customer support is shockingly good. They replied in 4 minutes on a Sunday. Blew my mind.',                  name: 'Camille F.',  role: 'Founder @ Nocturn',    init: 'CF' },
    ];

    function buildCard(d) {
      const el = document.createElement('div');
      el.className = 'testi-card';
      el.innerHTML = `
        <div class="testi-card__stars">★★★★★</div>
        <p class="testi-card__quote">"${d.quote}"</p>
        <div class="testi-card__author">
          <div class="testi-card__avatar">${d.init}</div>
          <div>
            <div class="testi-card__name">${d.name}</div>
            <div class="testi-card__role">${d.role}</div>
          </div>
        </div>`;
      return el;
    }

    /* Original set + duplicate for seamless loop */
    const all = [...DATA, ...DATA];
    all.forEach(d => track.appendChild(buildCard(d)));
  }

  /* ════════════════════════════════════════════════════════════
     11. CTA INLINE FORM (landing page email capture)
     Validates email then redirects to signup with prefill.
  ════════════════════════════════════════════════════════════ */
  function initCtaForm() {
    const btn   = qs('#cta-submit-btn');
    const input = qs('#cta-email-input');
    if (!btn || !input) return;

    function isValidEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function submit() {
      const val = input.value.trim();
      if (!val || !isValidEmail(val)) {
        input.style.borderColor = 'var(--clr-error, #ff4d6d)';
        input.focus();
        /* Shake */
        input.style.animation = 'none';
        requestAnimationFrame(() => {
          input.style.animation = 'field-shake 0.4s ease';
        });
        return;
      }
      input.style.borderColor = '';
      window.location.href = `signup.html?email=${encodeURIComponent(val)}`;
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
      input.style.borderColor = '';
      input.style.animation   = '';
    });
  }

  /* ════════════════════════════════════════════════════════════
     12. SMOOTH ANCHOR SCROLL
     Intercepts in-page hash links and scrolls smoothly,
     offsetting for the fixed navbar height.
  ════════════════════════════════════════════════════════════ */
  function initSmoothScroll() {
    const NAV_H = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '68', 10
    );

    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id  = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_H - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  /* ════════════════════════════════════════════════════════════
     13. CUSTOM CURSOR
     Moves .cursor-dot instantly; .cursor-ring lags behind.
  ════════════════════════════════════════════════════════════ */
  function initCustomCursor() {
    const dot  = qs('.cursor-dot');
    const ring = qs('.cursor-ring');
    if (!dot || !ring) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    document.addEventListener('mousedown', () => {
      dot.classList.add('click');
      ring.classList.add('click');
    });
    document.addEventListener('mouseup', () => {
      dot.classList.remove('click');
      ring.classList.remove('click');
    });

    /* Interactive elements → expand cursor */
    const selectors = 'a,button,[data-mouse-glow],.checklist__item,.auth-perk,.pricing-card,.feature-card';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(selectors)) {
        dot.classList.add('hover');
        ring.classList.add('hover');
      }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(selectors)) {
        dot.classList.remove('hover');
        ring.classList.remove('hover');
      }
    });

    (function loop() {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ════════════════════════════════════════════════════════════
     14. SECTION TAG ANIMATION
     Stagger-reveals section tags with a slide + fade.
  ════════════════════════════════════════════════════════════ */
  function initSectionTags() {
    const tags = qsa('.section-tag:not(.reveal)');
    if (!tags.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.animation = 'fadeRight 0.6s var(--ease-out, cubic-bezier(.4,0,.2,1)) both';
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });

    tags.forEach(t => io.observe(t));
  }

  /* ════════════════════════════════════════════════════════════
     15. HOW-IT-WORKS CONNECTOR LINE DRAW
     Draws the SVG line between steps on scroll entry.
  ════════════════════════════════════════════════════════════ */
  function initHowConnector() {
    const steps = qs('.how__steps');
    if (!steps) return;

    const line = steps.querySelector('::before'); /* CSS-handled; animate opacity */
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        steps.classList.add('visible');
        io.unobserve(steps);
      });
    }, { threshold: 0.3 });

    io.observe(steps);
  }

  /* ════════════════════════════════════════════════════════════
     16. BOOT — run all inits on DOMContentLoaded
  ════════════════════════════════════════════════════════════ */
  function boot() {
    initScrollReveal();
    initTypewriter();
    initStatsCounter();
    initNavScroll();
    initHamburger();
    initPricingToggle();
    initCardMouseGlow();
    initMagneticButton();
    initTestimonialsMarquee();
    initCtaForm();
    initSmoothScroll();
    initCustomCursor();
    initSectionTags();
    initHowConnector();

    /* Init particles if canvas present */
    const canvas = document.getElementById('particles-canvas');
    if (canvas && window.NovaSaaSParticles) {
      window.NovaSaaSParticles.init(canvas);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();