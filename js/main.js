/* =========================================================
   STACKLY — main.js
   01 helpers · 02 loader · 03 header/nav · 04 scroll reveal
   05 counters/bars · 06 3D tilt + magnetic · 07 hero rotator
   08 flip cards · 09 testimonials · 10 canvas
   12 parallax · 13 cursor · 14 form · 15 back-to-top
    14b auth forms (login / register)
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 01 helpers ---------- */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp   = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp    = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- 01b email validation ----------
     Stricter than a generic address check, and deliberately so:
       sun@gmail.com      valid
       sun123@gmail.com   valid
       sun@123.com        rejected - domain starts with a digit
       sun@123gmail.com   rejected - domain starts with a digit
     Every domain label must begin with a letter, and the TLD must be letters
     only, which is what rules out both invalid examples above. */
  var EMAIL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9_+-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9_+-]*[A-Za-z0-9])?)*@[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

  function emailOk(value) { return EMAIL_RE.test(String(value || '').trim()); }

  /* ---------- 01d password strength ----------
     Strong means all four classes present and long enough; score doubles as the
     meter level, and `missing` is what the submit alert spells out so the user
     is told exactly what to add rather than just "too weak". */
  var PW_MIN = 8;
  var PW_RULES = [
    { re: /[a-z]/,       need: 'a lowercase letter' },
    { re: /[A-Z]/,       need: 'an uppercase letter' },
    { re: /[0-9]/,       need: 'a number' },
    { re: /[^A-Za-z0-9]/, need: 'a symbol' }
  ];
  var PW_WORD = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

  /* the only roles a console session can be opened for; the select also starts
     on the empty placeholder, so an unset role must fail validation */
  var ROLE_SET = { admin: true, client: true };
  var ROLE_HOME = { admin: 'admin-dashboard.html', client: 'client-dashboard.html' };

  function passwordStrength(v) {
    var missing = PW_RULES.filter(function (r) { return !r.re.test(v); })
                          .map(function (r) { return r.need; });
    var score = PW_RULES.length - missing.length;
    if (v.length < PW_MIN) { missing.unshift(PW_MIN + '+ characters'); score = 0; }
    return { score: score, ok: missing.length === 0, missing: missing };
  }

  /* ---------- 01c required-field sweep ----------
     Every form here is novalidate, so nothing stops an empty submit. This lists
     which fields are still blank (reading each label out of the markup so the
     message names them the way the form does) and hands back the first one so
     focus can land on it. */
  function missingFields(form) {
    var out = [];
    $$('input, select, textarea', form).forEach(function (el) {
      if (el.type === 'submit' || el.type === 'button' || el.type === 'hidden') return;
      if (el.type === 'checkbox' || el.type === 'radio') return;   /* see uncheckedBoxes */
      if (!el.required) return;
      if (String(el.value || '').trim() !== '') return;
      /* the visible caption differs between fields: some use <span>, the role select
         uses <label>, and the role field's <span> is the hint, not the caption
         -- so take whichever comes first in the markup */
      var wrap = el.closest ? el.closest('.field') : null;
      var tag = wrap ? wrap.querySelector('label, span') : null;
      out.push({ el: el, label: tag ? tag.textContent.trim() : el.name });
    });
    return out;
  }

  /* A required checkbox is empty too, but "Fill in: terms" reads badly, so these
     are reported separately with their own caption. */
  function uncheckedBoxes(form) {
    var out = [];
    $$('input[type="checkbox"][required], input[type="radio"][required]', form).forEach(function (c) {
      if (c.checked) return;
      var wrap = c.closest ? c.closest('label') : null;
      var tag = wrap ? wrap.querySelector('span') : null;
      out.push({ el: c, label: tag ? tag.textContent.trim() : c.name });
    });
    return out;
  }

  /* ---------- 02 loader ---------- */
  function initLoader() {
    var el = $('#loader'), pct = $('#loaderPct');
    if (!el) return;

    if (REDUCED) { el.classList.add('is-done'); document.body.classList.remove('is-locked'); return; }

    document.body.classList.add('is-locked');
    var v = 0;
    var tick = setInterval(function () {
      v = Math.min(100, v + Math.random() * 14 + 6);
      pct.textContent = String(Math.floor(v)).padStart(2, '0');
      if (v >= 100) {
        clearInterval(tick);
        setTimeout(function () {
          el.classList.add('is-done');
          document.body.classList.remove('is-locked');
        }, 320);
      }
    }, 130);
  }

  /* ---------- 03b dashboard mobile menu ----------
     Below 1120px the dashboard rail is a 64px header with a three-dot
     disclosure button, so the nav costs nothing until it is asked for. */
  function initDashNav() {
    var rail = $('.dash__rail'), toggle = $('.dash-mobile-toggle');
    if (!rail || !toggle) return;

    var set = function (open) {
      rail.classList.toggle('is-mobile-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };

    toggle.addEventListener('click', function () {
      set(!rail.classList.contains('is-mobile-open'));
    });
    /* following a link should leave the menu closed behind you */
    $$('.dash__link', rail).forEach(function (a) {
      a.addEventListener('click', function () { set(false); });
    });
    /* the desktop sidebar is always visible, so never leave a stale open state */
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1120) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && rail.classList.contains('is-mobile-open')) {
        set(false);
        toggle.focus();
      }
    });
  }

  /* ---------- 03 header + nav ---------- */
  function initHeader() {
    var header = $('#header'), toggle = $('#navToggle'), nav = $('#nav');

    $$('.nav__link').forEach(function (l, i) { l.style.setProperty('--i', i); });

    var close = function () {
      document.body.classList.remove('nav-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    };

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }
    $$('.nav__link, .header__auth a').forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    /* The scrim is a body::before pseudo-element, so it reports body as the
       event target. Any click that lands on body while the drawer is open went
       through the scrim (the drawer swallows its own), so treat it as dismiss. */
    document.addEventListener('click', function (e) {
      if (document.body.classList.contains('nav-open') && e.target === document.body) close();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1120) close();
    });

    var bar = $('#scrollBar');
    var onScroll = function () {
      var y = window.scrollY || 0;
      if (header) header.classList.toggle('is-stuck', y > 24);
      if (bar) {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (h > 0 ? clamp(y / h, 0, 1) * 100 : 0) + '%';
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* active section highlight */
  function initSpy() {
    var links = $$('.nav__link');
    if (!links.length) return;
    var map = {};
    var sections = [];
    links.forEach(function (l) {
      var id = l.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var s = document.querySelector(id);
      if (s) { map[id.slice(1)] = l; sections.push(s); }
    });

    var run = function () {
      var line = window.scrollY + window.innerHeight * 0.32;
      var current = sections[0];
      sections.forEach(function (s) { if (s.offsetTop <= line) current = s; });
      links.forEach(function (l) { l.classList.remove('is-active'); });
      if (current && map[current.id]) map[current.id].classList.add('is-active');
    };
    run();
    window.addEventListener('scroll', run, { passive: true });
  }

  /* ---------- 04 scroll reveal ---------- */
  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        en.target.dispatchEvent(new CustomEvent('revealed', { bubbles: true }));
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    items.forEach(function (el) { io.observe(el); });
    return io;
  }

  /* ---------- 05 counters + progress bars ---------- */
  function runCounter(el) {
    var target   = parseFloat(el.dataset.count) || 0;
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var suffix   = el.dataset.suffix || '';
    if (REDUCED) { el.textContent = target.toFixed(decimals) + suffix; return; }

    var dur = 1600, t0 = null;
    var step = function (ts) {
      if (t0 === null) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      el.textContent = (target * easeOut(p)).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initCounters() {
    var nodes = $$('.count');
    var fills = $$('.bars__fill, .meter__fill');
    /* Bars/meters have no "final" CSS state, so they must be filled even when
       the observer is unavailable or nothing ever scrolls them into view. */
    var showFill = function (el) { setTimeout(function () { el.style.width = (el.dataset.fill || 0) + '%'; }, 120); };
    if (!('IntersectionObserver' in window)) { nodes.forEach(runCounter); fills.forEach(showFill); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runCounter(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });

    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        showFill(en.target);
        io2.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    fills.forEach(function (f) { io2.observe(f); });
  }

  /* ---------- 06 3D tilt + magnetic buttons ---------- */
  function initTilt() {
    if (!FINE || REDUCED) return;
    var MAX = 9;

    $$('.tilt').forEach(function (el) {
      var host = el;
      // lift children in Z on hover for a deeper 3D feel
      var move = function (e) {
        var r = host.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var cx = px - 0.5, cy = py - 0.5;

        host.style.setProperty('--ry', (cx * MAX * 2).toFixed(2) + 'deg');
        host.style.setProperty('--rx', (-cy * MAX * 2).toFixed(2) + 'deg');
        host.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        host.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        host.classList.add('is-live');
      };
      var reset = function () {
        host.style.setProperty('--rx', '0deg');
        host.style.setProperty('--ry', '0deg');
        host.classList.remove('is-live');
      };
      host.addEventListener('pointermove', move);
      host.addEventListener('pointerleave', reset);
      host.addEventListener('pointerenter', move);
    });
  }

  function initMagnetic() {
    if (!FINE || REDUCED) return;
    $$('.magnetic').forEach(function (el) {
      var strength = 0.3;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------- 08 hero word rotator ---------- */
  function initRotator() {
    var el = $('[data-rotator]');
    if (!el) return;
    var words;
    try { words = JSON.parse(el.dataset.words || '[]'); } catch (err) { words = []; }
    if (words.length < 2 || REDUCED) return;

    var i = 0;
    setInterval(function () {
      i = (i + 1) % words.length;
      if (el.animate) {
        el.animate(
          [
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
            { opacity: 0, transform: 'translateY(-.4em)', filter: 'blur(6px)' }
          ],
          { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
        );
      }
      setTimeout(function () {
        el.textContent = words[i];
        if (el.animate) {
          el.animate(
            [
              { opacity: 0, transform: 'translateY(.45em)', filter: 'blur(6px)' },
              { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
            ],
            { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
          );
        } else {
          el.textContent = words[i];
        }
      }, 270);
    }, 2600);
  }

  /* ---------- 09 flip cards (touch friendly) ---------- */
  function initFlips() {
    $$('.flip').forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.toggle('is-flipped');
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('is-flipped'); }
      });
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
    });
  }

  /* ---------- 10 testimonials ---------- */
  function initQuotes() {
    var wrap = $('#quotes'), dots = $('#quoteDots');
    if (!wrap || !dots) return;
    var items = $$('.quote', wrap);
    if (items.length < 2) return;

    items.forEach(function (q, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Testimonial ' + (i + 1));
      b.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(b);
    });
    var btns = $$('button', dots);
    var idx = 0, timer = null;

    function go(n) {
      idx = (n + items.length) % items.length;
      items.forEach(function (q, i) { q.classList.toggle('is-active', i === idx); });
      btns.forEach(function (b, i) { b.classList.toggle('is-active', i === idx); });
    }
    function restart() {
      clearInterval(timer);
      if (!REDUCED) timer = setInterval(function () { go(idx + 1); }, 6500);
    }
    go(0); restart();
    wrap.addEventListener('mouseenter', function () { clearInterval(timer); });
    wrap.addEventListener('mouseleave', restart);
  }

  /* ---------- 11 canvas network ---------- */
  function initNetwork() {
    var cv = $('#network');
    if (!cv || REDUCED) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], raf = null, mx = -999, my = -999;

    var C = {
      cyan:   '0,229,255',
      violet: '124,92,255',
      line:   '0,229,255'
    };

    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var density = Math.round((W * H) / 19000);
      var count = clamp(density, 26, 90);
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.34,
          vy: (Math.random() - 0.5) * 0.34,
          r: Math.random() * 1.6 + 0.7,
          h: Math.random() > 0.78 ? C.violet : C.cyan
        });
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      var LINK = W < 700 ? 92 : 128;

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;

        if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;

        // pointer field
        var dx = mx - n.x, dy = my - n.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 22500) {
          var d = Math.sqrt(d2) || 1;
          n.x -= (dx / d) * 0.9;
          n.y -= (dy / d) * 0.9;
        }

        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var ax = n.x - m.x, ay = n.y - m.y;
          var dist = Math.sqrt(ax * ax + ay * ay);
          if (dist < LINK) {
            var a = (1 - dist / LINK) * 0.32;
            ctx.strokeStyle = 'rgba(' + C.line + ',' + a.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = 'rgba(' + n.h + ',.75)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    window.addEventListener('resize', function () { size(); });
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', function () { mx = my = -999; });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    size();
    start();
  }

  /* ---------- 12 parallax ---------- */
  function initParallax() {
    if (REDUCED) return;
    var layers = $$('[data-parallax]');
    if (!layers.length) return;
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.dataset.parallax) || 0.03;
        var mid = r.top + r.height / 2 - vh / 2;
        el.style.translate = '0 ' + (-mid * speed).toFixed(1) + 'px';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 13 cursor glow ---------- */
  function initCursor() {
    if (!FINE || REDUCED) return;
    var cur = $('#cursor');
    if (!cur) return;
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      cur.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); });
    window.addEventListener('pointerdown', function () { cur.classList.add('is-press'); });
    window.addEventListener('pointerup',   function () { cur.classList.remove('is-press'); });

    (function loop() {
      cx = lerp(cx, tx, 0.16); cy = lerp(cy, ty, 0.16);
      cur.style.left = cx.toFixed(1) + 'px';
      cur.style.top  = cy.toFixed(1) + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- 14e password strength meter ---------- */
  function initPasswordFields() {
    $$('[data-pw-meter]').forEach(function (meter) {
      var input = $('input[type="password"]', meter.closest('.pw'));
      if (!input) return;
      var label = $('[data-pw-label]', meter);

      var paint = function () {
        if (!input.value) { meter.hidden = true; return; }
        var s = passwordStrength(input.value);
        meter.hidden = false;
        meter.setAttribute('data-level', String(s.score));
        if (label) label.textContent = s.score === 0 && input.value.length < PW_MIN ? PW_WORD[0] : PW_WORD[s.score];
      };

      input.addEventListener('input', paint);
      /* form.reset() fires no input event, so the meter would stay painted */
      if (input.form) input.form.addEventListener('reset', function () { setTimeout(paint, 0); });
    });

    /* Confirm field: say whether the repeat matches as it is typed, instead of
       making them submit to find out. Editing either box re-runs the verdict,
       because fixing the first password also fixes a mismatch. */
    $$('[data-pw-match]').forEach(function (out) {
      var second = $('input[type="password"]', out.closest('.pw'));
      var form = second && second.form;
      if (!second || !form) return;
      var first = form.elements.namedItem('password');

      var paint = function () {
        var a = first ? first.value : '';
        var b = second.value;
        if (!b) { out.hidden = true; return; }
        out.hidden = false;
        if (!a) {
          out.textContent = '! Enter your password first.';
          out.className = 'pw__match is-bad';
          return;
        }
        var same = a === b;
        out.textContent = same ? '✓ Passwords match.' : '! Passwords do not match.';
        out.className = 'pw__match ' + (same ? 'is-ok' : 'is-bad');
      };

      [second, first].forEach(function (el) {
        if (el) el.addEventListener('input', paint);
      });
      form.addEventListener('reset', function () { setTimeout(paint, 0); });
    });
  }

  /* ---------- 14g hand-off prefill ----------
     register.html redirects here with ?email=..., so the address is already
     known. It is re-checked before use because the param is user-editable and
     the field also strips characters the browser autofill can inject. */
  function initPrefillEmail() {
    var el = $('#loginEmail');
    if (!el || !window.URLSearchParams) return;
    var raw = new URLSearchParams(window.location.search).get('email');
    if (!raw) return;
    var v = raw.trim();
    if (!emailOk(v)) return;
    el.value = v;
  }

  /* ---------- 14c email alert on blur ----------
     Every form uses novalidate, so the browser never surfaces its own message.
     Checking on blur means an address like sun@123.com is called out while the
     field still has focus, instead of only after a failed submit.
     Characters that can never appear in an address are dropped as they are
     typed (same approach as the name field), but an address is only judged
     once it is complete -- "sun@g" is mid-typing, not a mistake, so the
     structural rule has to wait for blur or submit. */
  function initEmailFields() {
    var NOT_MAIL_CHAR = /[^A-Za-z0-9@._+-]/g;

    $$('input[type="email"]').forEach(function (el) {
      var form = el.form;
      if (!form) return;
      var note = form.id === 'contactForm' ? $('#formNote') : $('.form__note', form);
      var BAD = '! Invalid email address. Use a real domain, not a number — e.g. sun@gmail.com';

      /* keep only address-legal characters, then drop the states the grammar
         can never accept: a doubled dot, or a dot at the very front */
      var tidy = function () {
        var v = el.value.replace(NOT_MAIL_CHAR, '').replace(/\.{2,}/g, '.').replace(/^\.+/, '');
        if (v !== el.value) el.value = v;
      };

      var check = function () {
        var v = el.value.trim();
        if (!v) return;                       /* required-ness is the submit's job */
        if (note && !emailOk(v)) {
          note.textContent = BAD;
          note.className = 'form__note err';
        }
      };

      el.addEventListener('input', function () {
        tidy();
        /* once they start correcting it, stop nagging */
        if (note && emailOk(el.value.trim()) && note.className === 'form__note err') {
          note.textContent = '';
          note.className = 'form__note';
        }
      });
      el.addEventListener('paste', function () { setTimeout(tidy, 0); });
      el.addEventListener('blur', function () { tidy(); check(); });
    });
  }

  /* ---------- 14b name field — letters only, 16 characters max ----------
     maxlength alone would still let digits, spaces and symbols through, so the
     value is filtered on the way in: they are stripped rather than rejected,
     which means the field simply refuses to accept them. */
  function initNameFields() {
    $$('input[name="name"]').forEach(function (el) {
      var NOT_LETTER = /[^A-Za-z]/g;

      var clean = function () {
        var v = el.value.replace(NOT_LETTER, '');
        if (v.length > 16) v = v.slice(0, 16);
        if (v !== el.value) el.value = v;
      };

      el.addEventListener('input', clean);
      /* pasted text lands after the input event, so clean again on the next tick */
      el.addEventListener('paste', function () { setTimeout(clean, 0); });
    });
  }

  /* ---------- 14 contact form ---------- */
  function initForm() {
    var form = $('#contactForm'), note = $('#formNote');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      /* NB: form.name would resolve to the FORM's name IDL property,
         so always reach inputs through elements.namedItem(). */
      var nameEl  = form.elements.namedItem('name');
      var emailEl = form.elements.namedItem('email');
      /* 1. nothing may be blank */
      var gaps = missingFields(form);
      if (gaps.length) {
        note.textContent = '! Fill in: ' + gaps.map(function (g) { return g.label; }).join(', ') + '.';
        note.className = 'form__note err';
        gaps[0].el.focus();
        return;
      }

      /* 2. then check the formats */
      var name = nameEl ? nameEl.value.trim() : '';
      var mail = emailEl ? emailEl.value.trim() : '';
      var okMail = emailOk(mail);
      var okName = /^[A-Za-z]{1,16}$/.test(name);

      if (!okName || !okMail) {
        note.textContent = !okName
          ? '! Name must be letters only, up to 16 characters.'
          : '! Invalid email address. Use a real domain, not a number — e.g. sun@gmail.com';
        note.className = 'form__note err';
        return;
      }

      var btn = $('button[type=submit]', form);
      var label = $('span', btn);
      var original = label ? label.textContent : '';
      btn.disabled = true;
      if (label) label.textContent = 'Transmitting…';
      note.textContent = '';
      note.className = 'form__note';
      form.classList.add('is-sent');

      setTimeout(function () {
        btn.disabled = false;
        if (label) label.textContent = original;
        note.textContent = '✓ Brief received. An engineer will reply within one business day.';
        note.className = 'form__note ok';
        form.reset();
      }, 1500);
    });
  }

  /* ---------- 14b auth forms (login / register) ----------
     No backend here: validate client-side, then acknowledge. Wire the same
     shape up to a real endpoint when one exists. */
  function initAuthForms() {
    $$('form[data-auth]').forEach(function (form) {
      var note = $('.form__note', form);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        /* 1. every required field must be filled in, and the terms box ticked */
        var gaps = missingFields(form);
        if (gaps.length) {
          if (note) {
            note.textContent = '! Fill in: ' + gaps.map(function (g) { return g.label; }).join(', ') + '.';
            note.className = 'form__note err';
          }
          gaps[0].el.focus();
          return;
        }
        /* 1b. every required box must actually be ticked */
        var boxes = uncheckedBoxes(form);
        if (boxes.length) {
          if (note) {
            note.textContent = '! You must tick: ' + boxes.map(function (b) { return b.label; }).join(', ') + '.';
            note.className = 'form__note err';
          }
          boxes[0].el.focus();
          return;
        }

        /* 2. then check the formats */
        var mail = form.elements.namedItem('email');
        var pass = form.elements.namedItem('password');
        var role = form.elements.namedItem('role');
        var nameF = form.elements.namedItem('name');
        var nameOk = nameF ? /^[A-Za-z]{1,16}$/.test(nameF.value.trim()) : true;
        var mailOk = mail ? emailOk(mail.value) : true;
        var pw = pass ? passwordStrength(pass.value) : { ok: true, missing: [] };
        var confirm = form.elements.namedItem('password2');
        var matchOk = confirm ? confirm.value === (pass ? pass.value : '') : true;
        var roleOk = role ? ROLE_SET[role.value] === true : true;

        if (!nameOk || !mailOk || !pw.ok || !matchOk || !roleOk) {
          if (note) {
            note.textContent = !nameOk ? '! Name must be letters only, up to 16 characters.'
              : !mailOk ? '! Invalid email address. Use a real domain, not a number — e.g. sun@gmail.com'
              : !roleOk ? '! Choose Administrator or Client.'
              : !pw.ok ? '! Password still needs: ' + pw.missing.join(', ') + '.'
              : '! Passwords do not match.';
            note.className = 'form__note err';
          }
          return;
        }

        var btn = $('button[type=submit]', form);
        var label = $('span', btn);
        if (btn) btn.disabled = true;
        if (label) label.textContent = 'Working…';
        if (note) { note.textContent = ''; note.className = 'form__note'; }
        form.classList.add('is-sent');

        var isRegister = form.getAttribute('data-auth') === 'register';

        setTimeout(function () {
          /* Log in goes straight to the console the role selected. Registration
             creates no session, so it hands off to the login page. */
          if (!isRegister) {
            if (note) {
              note.textContent = role && role.value === 'admin'
                ? '✓ Credentials accepted. Opening the admin console…'
                : '✓ Credentials accepted. Opening your console…';
              note.className = 'form__note ok';
            }
            /* only ROLE_SET members may start a session, so drive the target off it
               rather than off "is it admin?" */
            window.location.href = ROLE_HOME[role.value] || ROLE_HOME.client;
            return;
          }

          /* the address rides along as a query param so nobody retypes it */
          var addr = mail ? mail.value.trim() : '';
          if (note) {
            note.textContent = '✓ Account created. Taking you to the login page…';
            note.className = 'form__note ok';
          }
          window.location.href = 'login.html' + (addr ? '?email=' + encodeURIComponent(addr) : '');
        }, 1400);
      });
    });

    $$('.pw__toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.getAttribute('data-for'));
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Hide' : 'Show';
      });
    });

    /* role select — the hint spells out what each account can actually do, so
       nobody discovers the difference between the roles after logging in */
    var ROLE_HINT = {
      '':      'Pick the kind of account you want.',
      admin:  'Full control: deploy fleets, ship model releases, manage console users.',
      client: 'Read-only: dashboards, live telemetry and reports for the fleets you own.'
    };
    $$('form[data-auth]').forEach(function (form) {
      var sel = $('select[data-role]', form);
      if (!sel) return;
      var hint = $('[data-role-hint]', sel.parentNode);
      if (!hint) return;
      var apply = function () { hint.textContent = ROLE_HINT[sel.value] || ''; };
      sel.addEventListener('change', apply);
      /* the submit handler calls form.reset(), which fires no change event */
      form.addEventListener('reset', function () { setTimeout(apply, 0); });
      apply();
    });
  }

  /* ---------- 15 back to top + year ---------- */
  function initMisc() {
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    var top = $('#toTop');
    if (top) {
      top.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    }

    /* 404 "Go Back": use real history when there is one, otherwise fall back
       to the homepage so the button is never a dead end. */
    var back = $('#backBtn');
    if (back) {
      back.addEventListener('click', function () {
        if (window.history.length > 1 && document.referrer) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      });
    }
  }

  /* ---------- boot ---------- */
  function boot() {
    initLoader();
    initDashNav();
    initHeader();
    initSpy();
    initReveal();
    initCounters();
    initTilt();
    initMagnetic();
    initRotator();
    initFlips();
    initQuotes();
    initNetwork();
    initParallax();
    initCursor();
    initForm();
    initNameFields();
    initEmailFields();
    initPasswordFields();
    initPrefillEmail();
    initAuthForms();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
