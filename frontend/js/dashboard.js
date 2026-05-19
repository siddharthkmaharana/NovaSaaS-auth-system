/* ============================================================
   NOVASAAS — dashboard.js
   Dashboard personalisation, confetti burst, checklist with
   localStorage, activity feed, referral link, count-up stats,
   sidebar active state, notification panel, greeting logic
   ============================================================ */

(function () {
  'use strict';

  /* ── HELPERS ─────────────────────────────────────────────── */
  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
  const $id = id => document.getElementById(id);

  /* ════════════════════════════════════════════════════════════
     1. PARSE URL PARAMS + GUARD
     Redirects to index.html if ?verified=true is absent.
  ════════════════════════════════════════════════════════════ */
  const params   = new URLSearchParams(window.location.search);
  const verified = params.get('verified') === 'true';
  const rawName  = decodeURIComponent(params.get('name') || '').trim();
  const userName = rawName || 'Builder';

  function guardAccess() {
    if (!verified) {
      window.location.replace('index.html');
      return false;
    }
    return true;
  }

  /* ════════════════════════════════════════════════════════════
     2. PERSONALISE
     Injects name, initials, join date everywhere on the page.
  ════════════════════════════════════════════════════════════ */
  function getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NS';
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function formatDate(date, opts = {}) {
    return date.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      ...opts,
    });
  }

  function personalise() {
    const initials = getInitials(userName);
    const now      = new Date();
    const shortDate = formatDate(now, { month: 'short', day: 'numeric', year: 'numeric' });
    const greeting  = getGreeting();

    /* Welcome headline */
    const welcomeName = $id('welcome-name');
    if (welcomeName) welcomeName.textContent = userName;

    /* Greeting prefix if element exists */
    const greetingEl = $id('greeting-text');
    if (greetingEl) greetingEl.textContent = `${greeting},`;

    /* Sidebar */
    const sidebarName   = $id('sidebar-name');
    const sidebarAvatar = $id('sidebar-avatar');
    if (sidebarName)   sidebarName.textContent   = userName;
    if (sidebarAvatar) sidebarAvatar.textContent  = initials;

    /* Topbar avatar */
    const topbarAvatar = $id('topbar-avatar');
    if (topbarAvatar) topbarAvatar.textContent = initials;

    /* Dates */
    const joinDate  = $id('join-date');
    const statJoined = $id('stat-joined');
    if (joinDate)   joinDate.textContent  = `Joined ${shortDate}`;
    if (statJoined) statJoined.textContent = shortDate;

    /* Page title */
    document.title = `Dashboard — ${userName} | NovaSaaS`;
  }

  /* ════════════════════════════════════════════════════════════
     3. CONFETTI BURST
     Triple-cannon: centre, left edge, right edge.
     Uses canvas-confetti loaded via CDN in dashboard.html.
  ════════════════════════════════════════════════════════════ */
  function fireConfetti() {
    if (typeof confetti === 'undefined') return;

    const canvas = $id('confetti-canvas');
    const shoot  = canvas
      ? confetti.create(canvas, { resize: true, useWorker: true })
      : confetti;

    const COLORS = ['#00f5d4', '#8b5cf6', '#ffffff', '#f59e0b', '#00c9a7', '#38bdf8'];

    /* Centre */
    shoot({ particleCount: 80, spread: 70, origin: { y: 0.5, x: 0.6 }, colors: COLORS });

    /* Left */
    setTimeout(() => {
      shoot({ particleCount: 55, angle: 60, spread: 58, origin: { x: 0, y: 0.5 }, colors: COLORS });
    }, 280);

    /* Right */
    setTimeout(() => {
      shoot({ particleCount: 55, angle: 120, spread: 58, origin: { x: 1, y: 0.5 }, colors: COLORS });
    }, 520);

    /* Final shower */
    setTimeout(() => {
      shoot({ particleCount: 30, startVelocity: 20, spread: 360, origin: { x: 0.5, y: 0.3 }, colors: COLORS, gravity: 0.6 });
    }, 800);
  }

  /* ════════════════════════════════════════════════════════════
     4. STAT CARD COUNT-UP
  ════════════════════════════════════════════════════════════ */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function countUp(el, target, duration = 1200, decimals = 0) {
    if (!el) return;
    const start = performance.now();
    function frame(now) {
      const t   = Math.min((now - start) / duration, 1);
      const val = easeOutExpo(t) * target;
      el.textContent = decimals ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initStatCards() {
    /* [data-count-target] pattern — future-proof */
    qsa('[data-count-target]').forEach(el => {
      const target   = parseFloat(el.dataset.countTarget);
      const decimals = parseInt(el.dataset.countDecimals || '0', 10);
      const duration = parseInt(el.dataset.countDuration || '1200', 10);
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        countUp(el, target, duration, decimals);
        io.disconnect();
      }, { threshold: 0.5 });
      io.observe(el);
    });

    /* Also handle #stat-projects directly */
    setTimeout(() => {
      countUp($id('stat-projects'), 0, 800);
    }, 600);
  }

  /* ════════════════════════════════════════════════════════════
     5. QUICK START CHECKLIST
     State persisted in localStorage under 'ns_checklist'.
  ════════════════════════════════════════════════════════════ */
  const CHECKLIST_KEY = 'ns_checklist_v1';

  const CHECKLIST_ITEMS = [
    { id: 'c1', title: 'Create your first project',  desc: 'Set up a workspace for your product'           },
    { id: 'c2', title: 'Connect a custom domain',    desc: 'Point your domain to NovaSaaS in one step'     },
    { id: 'c3', title: 'Invite a team member',       desc: 'Collaborate with your co-founders or team'     },
    { id: 'c4', title: 'Explore the API',            desc: 'Check the docs and grab your API key'          },
    { id: 'c5', title: 'Upgrade to Pro',             desc: 'Unlock unlimited projects and AI automations'  },
  ];

  function loadChecklistState() {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveChecklistState(state) {
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state)); }
    catch { /* quota exceeded — silently ignore */ }
  }

  function renderChecklist() {
    const container = $id('checklist') || qs('.checklist__list');
    if (!container) return;

    const state = loadChecklistState();
    CHECKLIST_ITEMS.forEach(item => { if (state[item.id]) item.done = true; else item.done = false; });

    container.innerHTML = '';
    CHECKLIST_ITEMS.forEach(item => {
      const div = document.createElement('div');
      div.className = `checklist__item check-item${item.done ? ' checklist__item--done done' : ''}`;
      div.setAttribute('role', 'checkbox');
      div.setAttribute('aria-checked', String(item.done));
      div.setAttribute('tabindex', '0');
      div.innerHTML = `
        <div class="checklist__box check-box">${item.done ? '✓' : ''}</div>
        <div class="checklist__content check-content">
          <div class="checklist__item-title check-title">${item.title}</div>
          <div class="checklist__item-desc check-desc">${item.desc}</div>
        </div>
        <div class="checklist__arrow check-arrow">→</div>`;

      function toggle() {
        item.done = !item.done;
        const s = loadChecklistState();
        s[item.id] = item.done;
        saveChecklistState(s);
        renderChecklist();
        updateProgress();
        if (item.done) showToast(`"${item.title}" complete! ✓`, 'success');
      }

      div.addEventListener('click', toggle);
      div.addEventListener('keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
      });
      container.appendChild(div);
    });

    updateProgress();
  }

  function updateProgress() {
    const state     = loadChecklistState();
    const doneCount = CHECKLIST_ITEMS.filter(i => state[i.id]).length;
    const total     = CHECKLIST_ITEMS.length;
    const pct       = Math.round((doneCount / total) * 100);

    /* Progress bar */
    const fill = $id('progress-fill') || qs('.checklist__bar-fill, .checklist__progress-bar-fill');
    if (fill) fill.style.width = pct + '%';

    /* Counter text */
    const num = $id('progress-done') || qs('.checklist__progress-num');
    if (num)  num.textContent = doneCount;

    /* Badge */
    const badge = $id('progress-badge') || qs('.dash-card__badge');
    if (badge) badge.textContent = `${doneCount} / ${total}`;

    /* Completion celebration */
    if (doneCount === total) {
      setTimeout(fireConfetti, 200);
      showToast('🎉 All steps complete! You\'re ready to ship.', 'success');
    }
  }

  /* ════════════════════════════════════════════════════════════
     6. ACTIVITY FEED
  ════════════════════════════════════════════════════════════ */
  const ACTIVITY_DATA = [
    { icon: '✓', cls: 'green',  title: `<strong>${userName}</strong> verified their email`,                  time: 'Just now',       isNew: true  },
    { icon: '⚡', cls: 'green',  title: 'Account <strong>activated</strong> on the Free Plan',                time: 'Just now',       isNew: true  },
    { icon: '🎉', cls: 'purple', title: 'Welcome to NovaSaaS! Your workspace is <strong>ready</strong>',      time: 'Just now',       isNew: false },
    { icon: '📧', cls: 'amber',  title: 'Verification email sent to your inbox',                              time: 'A moment ago',   isNew: false },
    { icon: '🔐', cls: 'purple', title: 'Account created and secured with encryption',                        time: 'A moment ago',   isNew: false },
  ];

  function initActivityFeed() {
    const feed = $id('activity-feed') || qs('.activity');
    if (!feed) return;

    /* Update first item with actual name */
    ACTIVITY_DATA[0].title = `<strong>${userName}</strong> verified their email`;

    ACTIVITY_DATA.forEach(a => {
      const div = document.createElement('div');
      div.className = `activity__item${a.isNew ? ' activity__item--new' : ''}`;
      div.innerHTML = `
        <div class="activity__icon activity__icon--${a.cls}">${a.icon}</div>
        <div class="activity__content">
          <div class="activity__title">${a.title}</div>
          <div class="activity__time">${a.time}</div>
        </div>
        <div class="activity__new-dot"></div>`;
      feed.appendChild(div);
    });
  }

  /* ════════════════════════════════════════════════════════════
     7. REFERRAL LINK
  ════════════════════════════════════════════════════════════ */
  function initReferral() {
    const input  = $id('referral-link') || qs('.referral__link-input');
    const copyBtn = $id('copy-btn')     || qs('.referral__copy-btn');
    if (!input) return;

    /* Generate deterministic code from name */
    const code = btoa(encodeURIComponent(userName.toLowerCase().replace(/\s+/g, '-')))
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12);
    const link = `https://novasaas.io/r/${code}`;
    input.value = link;

    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
      } catch {
        /* Fallback for non-secure contexts */
        input.select();
        document.execCommand('copy');
      }
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('referral__copy-btn--copied', 'copied');
      showToast('Referral link copied to clipboard!', 'success');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('referral__copy-btn--copied', 'copied');
      }, 2500);
    });
  }

  /* ════════════════════════════════════════════════════════════
     8. SIDEBAR ACTIVE STATE
  ════════════════════════════════════════════════════════════ */
  function initSidebar() {
    const current = window.location.pathname.split('/').pop() || 'dashboard.html';
    qsa('.sidebar__item, .nav-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      if (href && href !== '#' && current.includes(href.replace(/^.*\//, ''))) {
        item.classList.add('sidebar__item--active', 'active');
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     9. NOTIFICATION PANEL (toggle)
  ════════════════════════════════════════════════════════════ */
  function initNotifications() {
    const btn   = qs('.topbar__icon-btn');
    const panel = qs('.notif-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = panel.style.display === 'block';
      panel.style.display = open ? 'none' : 'block';
      /* Remove dot once opened */
      if (!open) {
        const dot = qs('.topbar__notif-dot');
        if (dot) dot.style.display = 'none';
      }
    });

    document.addEventListener('click', () => { panel.style.display = 'none'; });
  }

  /* ════════════════════════════════════════════════════════════
     10. TREND BAR SPARKLINES
     Heights driven by data-height attribute on each bar.
  ════════════════════════════════════════════════════════════ */
  function initTrendBars() {
    qsa('.stat-card__trend').forEach(trend => {
      const bars = qsa('.stat-card__trend-bar', trend);
      /* Animate heights in on load */
      bars.forEach((bar, i) => {
        const h = bar.dataset.height || `${20 + i * 12}%`;
        bar.style.height = '0%';
        setTimeout(() => {
          bar.style.transition = 'height 0.6s cubic-bezier(0.4,0,0.2,1)';
          bar.style.height = h;
        }, 300 + i * 60);
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     11. SCROLL REVEAL (re-use globals pattern)
  ════════════════════════════════════════════════════════════ */
  function initReveal() {
    const els = qsa('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
  }

  /* ════════════════════════════════════════════════════════════
     12. CUSTOM CURSOR
  ════════════════════════════════════════════════════════════ */
  function initCursor() {
    const dot  = qs('.cursor-dot')  || document.getElementById('cursor');
    const ring = qs('.cursor-ring') || document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    if (window.matchMedia('(max-width: 900px)').matches) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    const interactiveEls = 'a,button,.checklist__item,.doc-link,.sidebar__item,.topbar__icon-btn,.referral__copy-btn';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(interactiveEls)) {
        dot.style.width = dot.style.height = '16px';
        ring.style.width = ring.style.height = '44px';
      }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(interactiveEls)) {
        dot.style.width = dot.style.height = '';
        ring.style.width = ring.style.height = '';
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
     13. TOAST
  ════════════════════════════════════════════════════════════ */
  function showToast(message, type = 'info') {
    let toast = $id('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast auth-toast';
      document.body.appendChild(toast);
    }
    const icons  = { error: '✗', success: '✓', info: '◈' };
    const colors = {
      error  : 'var(--clr-error,   #ff4d6d)',
      success: 'var(--clr-neon,    #00f5d4)',
      info   : 'var(--clr-pulse-light, #8b5cf6)',
    };
    toast.innerHTML = `<span style="color:${colors[type]}">${icons[type]}</span> ${message}`;
    toast.className = `toast auth-toast show ${type}`;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.className = 'toast auth-toast';
    }, 3500);
  }

  /* ════════════════════════════════════════════════════════════
     14. DOC LINKS HOVER (add arrow animation)
  ════════════════════════════════════════════════════════════ */
  function initDocLinks() {
    qsa('.doc-link').forEach(link => {
      link.addEventListener('mouseenter', () => {
        const arrow = qs('.doc-link__arrow', link);
        if (arrow) arrow.style.transform = 'translateX(4px)';
      });
      link.addEventListener('mouseleave', () => {
        const arrow = qs('.doc-link__arrow', link);
        if (arrow) arrow.style.transform = '';
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     15. UPGRADE BUTTON PULSE
     Adds a brief glow pulse to the topbar Upgrade CTA after 3s.
  ════════════════════════════════════════════════════════════ */
  function initUpgradePulse() {
    const btn = qs('.topbar__cta, .welcome-banner__cta');
    if (!btn) return;
    setTimeout(() => {
      btn.style.transition = 'box-shadow 0.4s ease';
      btn.style.boxShadow  = '0 0 32px var(--clr-neon-glow, rgba(0,245,212,0.4))';
      setTimeout(() => { btn.style.boxShadow = ''; }, 800);
    }, 3000);
  }

  /* ════════════════════════════════════════════════════════════
     16. BOOT
  ════════════════════════════════════════════════════════════ */
  function boot() {
    if (!guardAccess()) return;

    personalise();
    initSidebar();
    initActivityFeed();
    initReferral();
    initStatCards();
    renderChecklist();
    initNotifications();
    initTrendBars();
    initReveal();
    initCursor();
    initDocLinks();
    initUpgradePulse();

    /* Confetti fires after a short settle delay */
    setTimeout(fireConfetti, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();