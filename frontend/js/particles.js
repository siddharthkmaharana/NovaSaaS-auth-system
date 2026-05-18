/* ============================================================
   NOVASAAS — particles.js
   Canvas particle engine: mouse repel, connecting lines,
   touch support, resize handling, FPS throttle, twinkle
   ============================================================ */

(function () {
  'use strict';

  /* ── CONFIG ──────────────────────────────────────────────── */
  const CFG = {
    COUNT_DESKTOP:   110,
    COUNT_TABLET:     70,
    COUNT_MOBILE:     40,
    COLOR_PRIMARY:   '0,245,212',
    COLOR_SECONDARY: '139,92,246',
    MIN_RADIUS:  0.6,
    MAX_RADIUS:  2.4,
    MIN_ALPHA:   0.18,
    MAX_ALPHA:   0.58,
    MIN_SPEED:   0.08,
    MAX_SPEED:   0.38,
    LINE_DIST:       110,
    LINE_ALPHA_MAX:  0.18,
    MOUSE_RADIUS:    120,
    MOUSE_FORCE:     0.07,
    FRICTION:        0.988,
    FPS_CAP:         60,
  };

  /* ── STATE ───────────────────────────────────────────────── */
  let canvas, ctx;
  let W = 0, H = 0;
  let particles = [];
  let mouse     = { x: -9999, y: -9999 };
  let raf       = null;
  let lastFrame = 0;
  let running   = false;
  const FRAME_MS = 1000 / CFG.FPS_CAP;

  /* ── HELPERS ─────────────────────────────────────────────── */
  const rand  = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function particleCount() {
    if (W >= 1024) return CFG.COUNT_DESKTOP;
    if (W >= 640)  return CFG.COUNT_TABLET;
    return CFG.COUNT_MOBILE;
  }

  /* ── PARTICLE FACTORY ────────────────────────────────────── */
  function createParticle(x, y) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(CFG.MIN_SPEED, CFG.MAX_SPEED);
    const isPurple = Math.random() < 0.15;
    return {
      x: x ?? rand(0, W),
      y: y ?? rand(0, H),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r:  rand(CFG.MIN_RADIUS, CFG.MAX_RADIUS),
      alpha:         rand(CFG.MIN_ALPHA, CFG.MAX_ALPHA),
      baseAlpha:     rand(CFG.MIN_ALPHA, CFG.MAX_ALPHA),
      color:         isPurple ? CFG.COLOR_SECONDARY : CFG.COLOR_PRIMARY,
      twinkleOffset: rand(0, Math.PI * 2),
      twinkleSpeed:  rand(0.008, 0.025),
    };
  }

  /* ── INIT ────────────────────────────────────────────────── */
  function initParticles() {
    particles = Array.from({ length: particleCount() }, () => createParticle());
  }

  /* ── RESIZE ──────────────────────────────────────────────── */
  function resize() {
    const hero = canvas.parentElement;
    W = canvas.width  = hero ? hero.offsetWidth  : window.innerWidth;
    H = canvas.height = hero ? hero.offsetHeight : window.innerHeight;
    particles.forEach(p => {
      p.x = clamp(p.x, 0, W);
      p.y = clamp(p.y, 0, H);
    });
  }

  /* ── DRAW LOOP ───────────────────────────────────────────── */
  function draw(timestamp) {
    if (!running) return;
    raf = requestAnimationFrame(draw);

    if (timestamp - lastFrame < FRAME_MS) return;
    lastFrame = timestamp;

    ctx.clearRect(0, 0, W, H);

    const len = particles.length;

    /* update + draw dots */
    for (let i = 0; i < len; i++) {
      const p = particles[i];

      /* mouse repel */
      const dx   = p.x - mouse.x;
      const dy   = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.MOUSE_RADIUS && dist > 0) {
        const force = (CFG.MOUSE_RADIUS - dist) / CFG.MOUSE_RADIUS;
        p.vx += (dx / dist) * force * CFG.MOUSE_FORCE;
        p.vy += (dy / dist) * force * CFG.MOUSE_FORCE;
      }

      p.vx *= CFG.FRICTION;
      p.vy *= CFG.FRICTION;
      p.x  += p.vx;
      p.y  += p.vy;

      /* wrap edges */
      if (p.x < -10)    p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10)    p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      /* twinkle */
      p.twinkleOffset += p.twinkleSpeed;
      p.alpha = clamp(p.baseAlpha + Math.sin(p.twinkleOffset) * 0.12, 0.08, 0.72);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha.toFixed(3)})`;
      ctx.fill();
    }

    /* connecting lines */
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a  = particles[i];
        const b  = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.LINE_DIST) {
          const alpha = CFG.LINE_ALPHA_MAX * (1 - d / CFG.LINE_DIST);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${a.color === b.color ? a.color : CFG.COLOR_PRIMARY},${alpha.toFixed(3)})`;
          ctx.lineWidth   = 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  /* ── EVENTS ──────────────────────────────────────────────── */
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }
  function onTouchMove(e) {
    if (!e.touches.length) return;
    const r = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - r.left;
    mouse.y = e.touches[0].clientY - r.top;
  }
  function onMouseLeave() { mouse.x = -9999; mouse.y = -9999; }
  function onVisibilityChange() {
    running = !document.hidden;
    if (running) { lastFrame = 0; raf = requestAnimationFrame(draw); }
  }

  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  /* ── PUBLIC API ──────────────────────────────────────────── */
  function init(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    initParticles();

    canvas.addEventListener('mousemove',  onMouseMove,  { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true });
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', debounce(() => {
      resize();
      const target = particleCount();
      while (particles.length < target) particles.push(createParticle());
      if (particles.length > target) particles.length = target;
    }, 200));
    document.addEventListener('visibilitychange', onVisibilityChange);

    running = true;
    raf = requestAnimationFrame(draw);
  }

  function destroy() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    canvas.removeEventListener('mousemove',  onMouseMove);
    canvas.removeEventListener('touchmove',  onTouchMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  window.NovaSaaSParticles = { init, destroy };
})();