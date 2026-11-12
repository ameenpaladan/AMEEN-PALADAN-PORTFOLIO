/* =====================================================================
   AMEEN PASHA — main script
   Order: static content -> accessibility mode -> smooth scroll ->
          cinematic stage (zoom / sand dissolve / memory world) -> reveals
   ===================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var CFG = window.SITE_CONFIG || { contact: {} };
  var WORKS = Array.isArray(window.SITE_WORKS) ? window.SITE_WORKS : [];
  var CATEGORIES = ['Graphic Design', 'VFX Work', 'Video Projects', 'Camera Work', 'Motion Graphics', 'Creative Projects'];

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var animated = hasGSAP && !reduce;
  if (reduce) doc.classList.add('rm');
  if (!hasGSAP) doc.classList.add('no-anim');

  var lenis = null;

  /* ---------------------------------------------------------------
     Small helpers
  --------------------------------------------------------------- */
  function safeUrl(u) {
    try { var x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; }
    catch (e) { return ''; }
  }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------------------------------------------------------------
     Contact + footer (only verified details from config.js are shown)
  --------------------------------------------------------------- */
  function renderContact() {
    var c = CFG.contact || {};
    var list = $('#contactLinks'), foot = $('#footerSocial');
    var items = [];

    if (c.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) items.push({ label: 'Email', text: c.email, href: 'mailto:' + c.email });
    var wa = String(c.whatsapp || '').replace(/\D/g, '');
    if (wa.length >= 8) items.push({ label: 'WhatsApp', text: 'Message on WhatsApp', href: 'https://wa.me/' + wa });
    if (c.instagram && safeUrl(c.instagram)) items.push({ label: 'Instagram', text: 'Instagram', href: safeUrl(c.instagram) });
    (c.others || []).forEach(function (o) {
      if (o && o.label && safeUrl(o.url)) items.push({ label: o.label, text: o.label, href: safeUrl(o.url) });
    });

    if (!items.length) {
      var li = el('li');
      li.appendChild(el('p', { 'class': 'contact__note' }, 'Contact details are being updated — please check back soon.'));
      list.appendChild(li);
      foot.hidden = true;
      return;
    }
    items.forEach(function (it) {
      var li = el('li'), a = el('a', { href: it.href });
      if (/^https?:/.test(it.href)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
      a.appendChild(el('b', { style: 'font-weight:400' }, it.text));
      a.appendChild(el('span', null, it.label + ' ↗'));
      li.appendChild(a); list.appendChild(li);

      var f = el('li'), fa = el('a', { href: it.href }, it.label);
      if (/^https?:/.test(it.href)) { fa.setAttribute('target', '_blank'); fa.setAttribute('rel', 'noopener noreferrer'); }
      f.appendChild(fa); foot.appendChild(f);
    });
  }

  /* ---------------------------------------------------------------
     Gallery + lightbox
  --------------------------------------------------------------- */
  var activeCat = 'All', visibleWorks = [], lbIndex = 0, lastFocus = null;

  function renderFilters() {
    var box = $('#filters');
    var cats = ['All'].concat(CATEGORIES);
    cats.forEach(function (cat) {
      var n = cat === 'All' ? WORKS.length : WORKS.filter(function (w) { return w.category === cat; }).length;
      var b = el('button', { type: 'button', 'aria-pressed': cat === 'All' ? 'true' : 'false', 'data-cat': cat }, cat);
      b.appendChild(el('small', null, String(n)));
      b.addEventListener('click', function () { setCategory(cat); });
      box.appendChild(b);
    });
  }
  function setCategory(cat) {
    activeCat = cat;
    $$('#filters button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat ? 'true' : 'false'); });
    renderGallery(true);
  }
  function renderGallery(animate) {
    var g = $('#gallery');
    visibleWorks = WORKS.filter(function (w) { return activeCat === 'All' || w.category === activeCat; });
    g.innerHTML = '';
    visibleWorks.forEach(function (w, i) {
      var b = el('button', { 'class': 'work', type: 'button', 'aria-label': 'Open project: ' + w.title });
      var img = el('img', { src: w.src, alt: w.alt || w.title, loading: 'lazy', decoding: 'async' });
      var meta = el('span', { 'class': 'work__meta' });
      meta.appendChild(el('span', { 'class': 'work__cat' }, w.category));
      meta.appendChild(el('span', { 'class': 'work__title' }, w.title));
      b.appendChild(img); b.appendChild(meta);
      b.addEventListener('click', function () { openLightbox(i, b); });
      g.appendChild(b);
    });
    $('#galleryEmpty').hidden = visibleWorks.length > 0;
    if (animate && animated) {
      gsap.fromTo($$('.work', g), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' });
      ScrollTrigger.refresh();
    }
  }

  var lb = $('#lightbox');
  function fillLightbox() {
    var w = visibleWorks[lbIndex]; if (!w) return;
    var img = $('#lbImg');
    img.src = w.srcFull || w.src; img.alt = w.alt || w.title;
    $('#lbCat').textContent = w.category;
    $('#lbTitle').textContent = w.title + (w.year ? ' — ' + w.year : '');
    $('#lbDesc').textContent = w.description || '';
    $('.lightbox__nav').classList.toggle('is-single', visibleWorks.length < 2);
  }
  function openLightbox(i, opener) {
    lbIndex = i; lastFocus = opener || document.activeElement; fillLightbox();
    lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add('is-open'); $('#lbClose').focus(); });
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  }
  function closeLightbox() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    setTimeout(function () { if (!lb.classList.contains('is-open')) lb.hidden = true; }, 520);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function stepLightbox(d) {
    if (visibleWorks.length < 2) return;
    lbIndex = (lbIndex + d + visibleWorks.length) % visibleWorks.length; fillLightbox();
  }
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', function () { stepLightbox(-1); });
  $('#lbNext').addEventListener('click', function () { stepLightbox(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      var f = $$('button', lb).filter(function (b) { return b.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------------------------------------------------------
     Navigation
  --------------------------------------------------------------- */
  var nav = $('#nav'), toggle = $('#navToggle');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  $$('#navLinks a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      setMenu(false);
      var t = $(id);
      if (t) {
        e.preventDefault();
        if (lenis) lenis.scrollTo(t, { offset: 0, duration: 1.6 });
        else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      }
    });
  });
  $('.nav__logo').addEventListener('click', function (e) {
    e.preventDefault(); setMenu(false);
    if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false); });

  function navScrollState() {
    var y = window.pageYOffset;
    nav.classList.toggle('is-solid', y > 60);
  }
  window.addEventListener('scroll', navScrollState, { passive: true });
  navScrollState();

  /* ---------------------------------------------------------------
     Build static content first (works with no animation at all)
  --------------------------------------------------------------- */
  $('#year').textContent = new Date().getFullYear();
  renderContact();
  renderFilters();
  renderGallery(false);

  if (!animated) { // static, accessible experience
    if (hasGSAP === false) { /* CSS 'no-anim' class handles layout */ }
    if (window.Ambient) { /* stays off */ }
    return;
  }

  /* ===============================================================
     ANIMATED EXPERIENCE
  =============================================================== */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---- smooth scrolling (desktop wheel/trackpad; touch stays native & fast)
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  var isMobile = function () { return window.innerWidth < 820; };

  // ---- split headings into masked words
  $$('[data-split]').forEach(function (h) {
    var text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.innerHTML = '';
    text.split(/\s+/).forEach(function (word, i, arr) {
      var line = el('span', { 'class': 'sline', 'aria-hidden': 'true' });
      line.style.display = 'inline-block';
      line.appendChild(el('span', null, word));
      h.appendChild(line);
      if (i < arr.length - 1) h.appendChild(document.createTextNode(' '));
    });
  });
  $$('[data-split]').forEach(function (h) {
    gsap.from($$('.sline > span', h), {
      yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.07,
      scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  // ---- generic reveals
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true }); }
  });

  // staggered grids
  [['#software li', '#software'], ['#skillList li', '#skillList'], ['.service', '.services'], ['.camera__list li', '.camera__list']].forEach(function (p) {
    var items = $$(p[0]); if (!items.length) return;
    gsap.from(items, { opacity: 0, y: 36, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: p[1], start: 'top 85%' } });
  });
  gsap.from('.edu__row', { opacity: 0, y: 40, duration: 1, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: '.edu', start: 'top 85%' } });

  // ---- timeline: line draws with scroll, dots light as they are reached
  (function () {
    var tl = $('#timeline'); if (!tl) return;
    var bar = el('span', { 'class': 'timeline__progress', 'aria-hidden': 'true' });
    tl.appendChild(bar);
    gsap.to(bar, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
    $$('.timeline__item', tl).forEach(function (it) {
      gsap.from(it.querySelector('.timeline__card'), { opacity: 0, x: 50, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: it, start: 'top 82%' } });
      gsap.from(it.querySelector('.timeline__date'), { opacity: 0, duration: 1.1, scrollTrigger: { trigger: it, start: 'top 82%' } });
      ScrollTrigger.create({ trigger: it, start: 'top 70%', onEnter: function () { it.classList.add('is-on'); }, onLeaveBack: function () { it.classList.remove('is-on'); } });
    });
  })();

  // ---- subtle parallax on the filmmaking portrait
  gsap.fromTo('.camera__figure img', { yPercent: -7, scale: 1.18 }, { yPercent: 7, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.camera__figure', start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---- active nav link
  $$('#navLinks a').forEach(function (a) {
    var t = $(a.getAttribute('href')); if (!t) return;
    ScrollTrigger.create({
      trigger: t, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (s) { a.classList.toggle('is-active', s.isActive); }
    });
  });

  /* ===============================================================
     CINEMATIC STAGE
     A: face zoom  ->  B: sand dissolve  ->  C: memory world
  =============================================================== */
  var portraitWrap = $('#portraitWrap'), portrait = $('#portrait'), sandCanvas = $('#sand');
  var heroWords = $$('.hero__word'), stageTL = null, stageST = null, sand = null, built = false;
  var ZOOM_ORIGIN = { x: 0.47, y: 0.34 };       // where the face sits inside the photograph
  var sandStart = 0.12, sandSpan = 0.5;         // dissolve front sweep (see sand.js delay model)

  if (window.Ambient) Ambient.init();

  function finalZoomRect() {
    // where the zoomed photograph ends up on screen (analytic, no DOM reads of transforms)
    var vw = window.innerWidth, vh = window.innerHeight;
    var b = { left: portraitWrap.offsetLeft, top: portraitWrap.offsetTop, width: portraitWrap.offsetWidth, height: portraitWrap.offsetHeight };
    var S = isMobile() ? 2.5 : 2.2;
    var ox = b.left + ZOOM_ORIGIN.x * b.width, oy = b.top + ZOOM_ORIGIN.y * b.height;
    var tx = vw * 0.5 - ox, ty = vh * 0.46 - oy;
    return {
      S: S, tx: tx, ty: ty,
      rect: {
        left: ox - S * ZOOM_ORIGIN.x * b.width + tx, top: oy - S * ZOOM_ORIGIN.y * b.height + ty,
        width: S * b.width, height: S * b.height,
        get right() { return this.left + this.width; }, get bottom() { return this.top + this.height; }
      }
    };
  }

  function buildSand(z) {
    if (!window.SandDissolve) return;
    if (!sand) sand = new SandDissolve(sandCanvas, portrait);
    built = sand.build(z.rect);
  }

  function applyDissolve(p, z) {
    // image is erased by a soft front sweeping right -> left, exactly where grains are leaving
    if (p <= 0.0001) {
      portrait.style.webkitMaskImage = portrait.style.maskImage = '';
      portrait.style.opacity = '';
      if (sand && built) sand.clear();
      return;
    }
    var vw = window.innerWidth;
    var nxFront = 1 - (p - sandStart) / sandSpan;                 // screen-space 1 -> -x
    var soft = 0.2;
    var uF = (nxFront * vw - z.rect.left) / z.rect.width;
    var uS = (soft * vw) / z.rect.width;
    var m = 'linear-gradient(90deg,#000 ' + ((uF - uS) * 100).toFixed(2) + '%,transparent ' + ((uF + uS) * 100).toFixed(2) + '%)';
    portrait.style.webkitMaskImage = portrait.style.maskImage = m;
    portrait.style.opacity = uF + uS < 0 ? '0' : '';
    if (built) {
      if (p >= 0.999) sand.clear(); else sand.render(p, performance.now());
    }
  }

  function buildStage() {
    if (stageTL) { stageTL.scrollTrigger && stageTL.scrollTrigger.kill(); stageTL.kill(); stageTL = null; }
    gsap.set(portrait, { clearProps: 'transform' });
    gsap.set(heroWords, { clearProps: 'transform' });

    var z = finalZoomRect();
    buildSand(z);
    var state = { dissolve: 0, world: 0 };
    var worldLines = $$('#worldTitle .line > span');
    var dist = window.innerHeight * (isMobile() ? 4.4 : 5.2);

    gsap.set(portraitWrap, { '--edge': 1 });
    gsap.set(portrait, { transformOrigin: (ZOOM_ORIGIN.x * 100) + '% ' + (ZOOM_ORIGIN.y * 100) + '%' });
    gsap.set(worldLines, { yPercent: 115 });
    gsap.set('.world__kicker, .world__sub', { opacity: 0, y: 24 });
    gsap.set('#world', { opacity: 1 });
    gsap.set('#world', { autoAlpha: 0 });

    stageTL = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.stage', start: 'top top', end: '+=' + dist, pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: false
      },
      onUpdate: function () {
        applyDissolve(state.dissolve, z);
        if (window.Ambient) Ambient.setIntensity(Math.max(0.0001, state.world) < 0.02 ? 0 : state.world);
      }
    });

    // ── A · FACE ZOOM (0 → 3.4) — real camera push-in toward the face
    stageTL.to(portrait, { scale: z.S, x: z.tx, y: z.ty, duration: 3.4, ease: 'power2.inOut' }, 0);
    stageTL.to(portraitWrap, { '--edge': 0, duration: 2.2 }, 0.2);
    stageTL.to(heroWords, { yPercent: -115, duration: 1.3, ease: 'power3.in', stagger: 0.12 }, 0.1);
    stageTL.to('.hero__eyebrow, .hero__role, .hero__cue', { opacity: 0, y: -18, duration: 0.9, stagger: 0.1 }, 0.1);
    stageTL.to('.stage__vignette', { opacity: 1.0, duration: 3.4 }, 0);

    // ── B · SAND DISSOLVE (3.4 → 7.4) — progress feeds the particle engine
    stageTL.to(state, { dissolve: 1, duration: 4.0, ease: 'none' }, 3.4);

    // ── C · MEMORY WORLD (6.2 → 10.6)
    stageTL.to(state, { world: 1, duration: 2.2 }, 6.2);
    stageTL.to('#world', { autoAlpha: 1, duration: 0.3 }, 6.3);
    stageTL.fromTo('.world__kicker', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 6.9);
    stageTL.to(worldLines, { yPercent: 0, duration: 1.5, ease: 'power4.out', stagger: 0.35 }, 7.1);
    stageTL.fromTo('#worldTitle', { scale: 1.1 }, { scale: 1, duration: 3.2, ease: 'power1.out', transformOrigin: '50% 50%' }, 6.9);
    stageTL.fromTo('.world__sub', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 8.4);
    // hold, then the camera drifts through the text and on into the page
    stageTL.to('#world', { scale: 1.08, opacity: 0, duration: 1.2, ease: 'power2.in', transformOrigin: '50% 50%' }, 9.7);
    stageTL.to(state, { world: 0.55, duration: 1.0 }, 9.8);
    stageTL.to({}, { duration: 0.6 }, 10.9);   // brief rest before pin release

    stageST = stageTL.scrollTrigger;
  }

  /* intro: the opening shot arrives, then waits for the first scroll */
  function intro() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(portraitWrap, { opacity: 0, duration: 2.2, ease: 'power2.out' }, 0)
      .from(heroWords, { y: '1.15em', duration: 1.6, stagger: 0.18, ease: 'power4.out' }, 0.5)
      .from('.hero__eyebrow span', { y: '1.4em', opacity: 0, duration: 1.1 }, 0.9)
      .from('.hero__role', { opacity: 0, y: 16, duration: 1.1 }, 1.3)
      .from('.hero__cue', { opacity: 0, duration: 1.1 }, 1.7)
      .from('.nav', { opacity: 0, duration: 1.2 }, 1.2);
  }

  function boot() {
    buildStage();
    intro();
    ScrollTrigger.refresh();
  }

  var started = false;
  function go() { if (started) return; started = true; boot(); }
  var decode = portrait.decode ? portrait.decode() : Promise.resolve();
  decode.catch(function () {}).then(function () { go(); });
  setTimeout(go, 2500);   // never block on a slow image

  // rebuild when the viewport really changes (ignore mobile address-bar jitter)
  var lastW = window.innerWidth, lastH = window.innerHeight, rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 140) return;
      lastW = w; lastH = h;
      if (window.Ambient) Ambient.resize();
      if (started) { buildStage(); ScrollTrigger.refresh(); }
    }, 250);
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (started) ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  // the ambient world follows the page quietly after the stage
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { if (window.Ambient) Ambient.setScroll(window.pageYOffset); } });
})();
