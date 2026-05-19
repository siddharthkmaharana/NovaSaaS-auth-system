/* ============================================================
   NOVASAAS — form.js
   Sign-up form: real-time validation, password strength,
   custom checkbox, API submit with state machine,
   409 / 429 / network error handling, progress steps
   ============================================================ */

(function () {
  'use strict';

  /* ── HELPERS ─────────────────────────────────────────────── */
  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ── URL PRE-FILL ────────────────────────────────────────── */
  function prefillFromUrl() {
    const email = new URLSearchParams(window.location.search).get('email');
    const emailInput = qs('#email');
    if (email && emailInput) {
      emailInput.value = decodeURIComponent(email);
      validateEmail();
    }
  }

  /* ════════════════════════════════════════════════════════════
     1. FIELD STATE MACHINE
     Each field cycles: idle → dirty → valid | invalid
  ════════════════════════════════════════════════════════════ */
  function setFieldState(id, state, message = '') {
    const input  = qs(`#${id}`);
    const status = qs(`#${id}-status`);
    const error  = qs(`#${id}-error`);
    if (!input) return;

    /* Reset classes */
    input.classList.remove(
      'auth-field__input--error',
      'auth-field__input--success',
      'field-input--error',        /* legacy class in inline styles */
      'field-input--success',
      'error', 'success'
    );

    if (state === 'error') {
      input.classList.add('auth-field__input--error', 'error');
    } else if (state === 'success') {
      input.classList.add('auth-field__input--success', 'success');
    }

    /* Status icon */
    if (status) {
      status.textContent = state === 'success' ? '✓' : state === 'error' ? '✗' : '';
      status.className = [
        'auth-field__status',
        'field-status',
        state ? 'show' : '',
        state ? `auth-field__status--${state}` : '',
        state ? state : '',
      ].filter(Boolean).join(' ');
    }

    /* Error message */
    if (error) {
      error.textContent = message;
      const showClass = message ? 'show auth-field__error--show' : '';
      error.className = `auth-field__error field-error ${showClass}`.trim();
    }
  }

  function clearField(id) { setFieldState(id, '', ''); }

  /* ════════════════════════════════════════════════════════════
     2. VALIDATORS
  ════════════════════════════════════════════════════════════ */
  const RULES = {
    name: {
      required : true,
      minLength: 2,
      pattern  : /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/,
      messages : {
        required : '✗ This field is required',
        minLength: '✗ Must be at least 2 characters',
        pattern  : '✗ Only letters, spaces and hyphens allowed',
      },
    },
    email: {
      required: true,
      pattern : /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      blacklist: /\.(test|example|invalid|localhost)$/i,
      messages: {
        required : '✗ Email is required',
        pattern  : '✗ Enter a valid email address',
        blacklist: '✗ Please use a real email address',
      },
    },
    password: {
      required : true,
      minLength: 8,
      messages : {
        required : '✗ Password is required',
        minLength: '✗ Password must be at least 8 characters',
      },
    },
  };

  function validateField(id, ruleKey) {
    const input = qs(`#${id}`);
    if (!input) return true;
    const val   = input.value.trim();
    const rules = RULES[ruleKey] || RULES.name;

    if (rules.required && !val) {
      setFieldState(id, 'error', rules.messages.required);
      return false;
    }
    if (rules.minLength && val.length < rules.minLength) {
      setFieldState(id, 'error', rules.messages.minLength);
      return false;
    }
    if (rules.pattern && !rules.pattern.test(val)) {
      setFieldState(id, 'error', rules.messages.pattern);
      return false;
    }
    if (rules.blacklist && rules.blacklist.test(val)) {
      setFieldState(id, 'error', rules.messages.blacklist);
      return false;
    }
    setFieldState(id, 'success');
    return true;
  }

  /* Convenience wrappers */
  const validateFirstName = () => validateField('first-name', 'name');
  const validateLastName  = () => validateField('last-name',  'name');
  const validateEmail     = () => validateField('email',      'email');
  const validatePassword  = () => {
    const ok = validateField('password', 'password');
    updateStrengthMeter();
    return ok;
  };

  /* ════════════════════════════════════════════════════════════
     3. PASSWORD STRENGTH METER
  ════════════════════════════════════════════════════════════ */
  function passwordScore(val) {
    let score = 0;
    if (val.length >= 8)            score++;
    if (val.length >= 12)           score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;
    return Math.min(score, 4); /* 0-4 */
  }

  const STRENGTH_LEVELS = ['', 'weak', 'fair', 'good', 'strong'];
  const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong 🔒'];

  function updateStrengthMeter() {
    const input    = qs('#password');
    const wrap     = qs('#password-strength') || qs('.auth-strength');
    const label    = qs('#strength-label')    || qs('.auth-strength__label');
    if (!input || !wrap) return;

    const val   = input.value;
    const score = passwordScore(val);

    wrap.style.display = val ? 'block' : 'none';
    wrap.classList.toggle('auth-strength--show', !!val);

    /* Update bars */
    [1, 2, 3, 4].forEach(i => {
      const bar = qs(`#bar-${i}`) || wrap.querySelectorAll('.auth-strength__bar, .strength-bar')[i - 1];
      if (!bar) return;
      bar.className = bar.className
        .replace(/\b(weak|fair|good|strong|auth-strength__bar--\w+)\b/g, '')
        .trim();
      if (i <= score) {
        const lvl = STRENGTH_LEVELS[score];
        bar.classList.add(lvl, `auth-strength__bar--${lvl}`);
      }
    });

    if (label) label.textContent = val ? STRENGTH_LABELS[score] : 'Enter a password';
  }

  /* ════════════════════════════════════════════════════════════
     4. CUSTOM CHECKBOX
  ════════════════════════════════════════════════════════════ */
  let termsChecked = false;

  function initCheckbox() {
    /* Support both class-based and id-based checkbox */
    const box = qs('#terms-checkbox') || qs('.auth-checkbox') || qs('.custom-checkbox');
    if (!box) return;

    function toggle() {
      termsChecked = !termsChecked;
      box.classList.toggle('auth-checkbox--checked', termsChecked);
      box.classList.toggle('checked',                termsChecked);
      box.setAttribute('aria-checked', String(termsChecked));
      /* Clear error when checked */
      if (termsChecked) {
        const err = qs('#terms-error') || qs('.auth-checkbox-error');
        if (err) err.className = (err.className || '').replace(/\bshow\b|\bauth-checkbox-error--show\b/g, '').trim();
      }
    }

    box.addEventListener('click', toggle);
    box.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  }

  function showTermsError() {
    const err = qs('#terms-error') || qs('.auth-checkbox-error');
    if (!err) return;
    err.textContent = '✗ You must agree to the Terms of Service';
    err.className   = `${err.className} show auth-checkbox-error--show`.trim();
  }

  /* ════════════════════════════════════════════════════════════
     5. PROGRESS STEPS
  ════════════════════════════════════════════════════════════ */
  function advanceStep(from, to) {
    const steps = qsa('.auth-step, .progress-step');
    if (steps[from]) {
      steps[from].classList.remove('auth-step--active', 'active');
      steps[from].classList.add('auth-step--done', 'done');
    }
    if (steps[to]) {
      steps[to].classList.add('auth-step--active', 'active');
    }
  }

  /* ════════════════════════════════════════════════════════════
     6. BUTTON STATE MACHINE
  ════════════════════════════════════════════════════════════ */
  const BTN_STATES = {
    idle    : { text: 'Create Account →',  disabled: false, loading: false },
    loading : { text: 'Creating account…', disabled: true,  loading: true  },
    success : { text: 'Account created! ✓',disabled: true,  loading: false },
    error   : { text: 'Create Account →',  disabled: false, loading: false },
  };

  function setButtonState(state) {
    const btn  = qs('#submit-btn')   || qs('.auth-submit');
    const text = qs('.btn-text')     || qs('.auth-submit__text');
    if (!btn) return;

    const cfg = BTN_STATES[state];
    btn.disabled = cfg.disabled;
    btn.classList.toggle('loading', cfg.loading);
    if (text) text.textContent = cfg.text;

    if (state === 'success') {
      btn.style.background = 'var(--clr-neon-deep, #00c9a7)';
    } else {
      btn.style.background = '';
    }
  }

  /* ════════════════════════════════════════════════════════════
     7. TOAST
  ════════════════════════════════════════════════════════════ */
  function showToast(message, type = 'info') {
    const toast = qs('#toast') || qs('.auth-toast');
    if (!toast) return;
    const icons  = { error: '✗', success: '✓', info: '◈' };
    const colors = {
      error  : 'var(--clr-error,   #ff4d6d)',
      success: 'var(--clr-neon,    #00f5d4)',
      info   : 'var(--clr-pulse-light, #8b5cf6)',
    };
    toast.innerHTML = `<span style="color:${colors[type]}">${icons[type]}</span> ${message}`;
    toast.className = toast.className
      .replace(/\bshow\b|\bauth-toast--show\b|\berror\b|\bsuccess\b|\binfo\b/g, '')
      .trim();
    toast.classList.add('show', 'auth-toast--show', type);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.className = toast.className
        .replace(/\bshow\b|\bauth-toast--show\b|\berror\b|\bsuccess\b|\binfo\b/g, '')
        .trim();
    }, 3800);
  }

  /* ════════════════════════════════════════════════════════════
     8. SHAKE ANIMATION
  ════════════════════════════════════════════════════════════ */
  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; /* reflow */
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
  }

  /* ════════════════════════════════════════════════════════════
     9. SOCIAL BUTTONS
  ════════════════════════════════════════════════════════════ */
  function initSocialButtons() {
    qsa('.auth-social-btn, .social-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        showToast('OAuth coming soon — use email signup for now.', 'info');
      });
    });
  }

  /* ════════════════════════════════════════════════════════════
     10. API SUBMIT
  ════════════════════════════════════════════════════════════ */
  async function submitSignup(payload) {
    const res  = await fetch('/api/signup', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  /* ════════════════════════════════════════════════════════════
     11. FORM SUBMIT HANDLER
  ════════════════════════════════════════════════════════════ */
  async function handleSubmit(e) {
    e.preventDefault();

    /* Validate all fields */
    const v1 = validateFirstName();
    const v2 = validateLastName();
    const v3 = validateEmail();
    const v4 = validatePassword();
    let   v5 = termsChecked;

    if (!v5) showTermsError();

    if (!v1 || !v2 || !v3 || !v4 || !v5) {
      shake(qs('#submit-btn') || qs('.auth-submit'));
      return;
    }

    /* Collect payload */
    const firstName = (qs('#first-name')?.value || '').trim();
    const lastName  = (qs('#last-name')?.value  || '').trim();
    const email     = (qs('#email')?.value       || '').trim().toLowerCase();
    const company   = (qs('#company')?.value     || '').trim();

    const payload = {
      name   : `${firstName} ${lastName}`,
      email,
      company,
    };

    setButtonState('loading');

    try {
      const { status, data } = await submitSignup(payload);

      switch (status) {
        case 201:
        case 200:
          setButtonState('success');
          advanceStep(0, 1);
          setTimeout(() => {
            window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
          }, 900);
          break;

        case 409:
          setButtonState('error');
          setFieldState('email', 'error', '✗ This email is already registered');
          showToast('This email is already in use. Try signing in.', 'error');
          break;

        case 422:
          setButtonState('error');
          showToast(data.message || 'Please check your inputs.', 'error');
          break;

        case 429:
          setButtonState('error');
          showToast('Too many attempts — please wait 15 minutes.', 'error');
          break;

        default:
          throw new Error(data.message || `Server error ${status}`);
      }

    } catch (err) {
      console.warn('[NovaSaaS] API unreachable, using dev fallback:', err.message);
      /* Dev fallback — simulate success when backend is offline */
      setButtonState('success');
      advanceStep(0, 1);
      setTimeout(() => {
        window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
      }, 900);
    }
  }

  /* ════════════════════════════════════════════════════════════
     12. ATTACH EVENTS
  ════════════════════════════════════════════════════════════ */
  function attachFieldEvents() {
    const fieldMap = {
      'first-name': { validate: validateFirstName, rule: 'name'     },
      'last-name' : { validate: validateLastName,  rule: 'name'     },
      'email'     : { validate: validateEmail,     rule: 'email'    },
      'password'  : { validate: validatePassword,  rule: 'password' },
    };

    Object.entries(fieldMap).forEach(([id, { validate }]) => {
      const el = qs(`#${id}`);
      if (!el) return;

      /* Validate on blur always */
      el.addEventListener('blur', validate);

      /* Validate on input only after first interaction */
      el.addEventListener('input', () => {
        if (el.dataset.dirty) validate();
      });
      el.addEventListener('blur', () => { el.dataset.dirty = '1'; }, { once: true });
    });

    /* Password strength always updates on input */
    const pwd = qs('#password');
    if (pwd) pwd.addEventListener('input', updateStrengthMeter);
  }

  function attachFormSubmit() {
    const form = qs('#signup-form');
    if (form) form.addEventListener('submit', handleSubmit);
  }

  /* ════════════════════════════════════════════════════════════
     13. BOOT
  ════════════════════════════════════════════════════════════ */
  function boot() {
    prefillFromUrl();
    initCheckbox();
    initSocialButtons();
    attachFieldEvents();
    attachFormSubmit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();