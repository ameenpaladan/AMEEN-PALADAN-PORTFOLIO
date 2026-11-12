/* =====================================================================
   Ambient — the "memory world": slow floating dust + a soft, drifting
   atmospheric light. Pure canvas 2D, pauses itself when invisible.
   ===================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('ambient');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, motes = [], running = false, last = 0;
  var intensity = 0, scrollY = 0, mx = 0, my = 0, tx = 0, ty = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function size() {
    var coarse = window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 820;
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    W = canvas.width = Math.round(window.innerWidth * dpr);
    H = canvas.height = Math.round(window.innerHeight * dpr);
    var n = coarse ? 46 : 110;
    motes = [];
    for (var i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * W, y: Math.random() * H,
        z: 0.25 + Math.random() * 0.75,
        r: (0.5 + Math.random() * 1.5) * dpr,
        vx: (Math.random() - 0.35) * 0.12,
        vy: -0.05 - Math.random() * 0.18,
        ph: Math.random() * 6.28,
        warm: Math.random() < 0.55
      });
    }
  }

  function beam(t, cx, cy, rad, a) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(216,193,154,' + a + ')');
    g.addColorStop(1, 'rgba(216,193,154,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(48, now - last || 16); last = now;
    tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
    ctx.clearRect(0, 0, W, H);

    // atmospheric light — two huge, very faint, slowly orbiting glows
    var t = now * 0.00012;
    beam(t, W * (0.28 + Math.sin(t * 1.7) * 0.08) - tx * 40 * dpr, H * (0.22 + Math.cos(t * 1.3) * 0.06) - scrollY * 0.02, Math.max(W, H) * 0.55, 0.055);
    beam(t, W * (0.78 + Math.cos(t * 1.2) * 0.07) - tx * 70 * dpr, H * (0.7 + Math.sin(t * 1.9) * 0.08), Math.max(W, H) * 0.45, 0.04);

    // dust motes with depth parallax
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.x += m.vx * dt * m.z * dpr * 0.06 * 16 / 16;
      m.y += m.vy * dt * m.z * dpr * 0.06 * 16 / 16;
      m.ph += dt * 0.0012;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
      if (m.x < -10) m.x = W + 10; else if (m.x > W + 10) m.x = -10;
      var px = m.x - tx * 60 * m.z * dpr;
      var py = m.y - (scrollY * 0.06 * m.z * dpr) % H - ty * 40 * m.z * dpr;
      if (py < 0) py += H;
      var tw = 0.55 + Math.sin(m.ph) * 0.45;
      ctx.globalAlpha = (0.12 + m.z * 0.5) * tw;
      ctx.fillStyle = m.warm ? '#d8c19a' : '#f5f5f5';
      ctx.beginPath();
      ctx.arc(px, py, m.r * m.z, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  function start() { if (running || reduce) return; running = true; last = 0; requestAnimationFrame(frame); }
  function stop() { running = false; ctx.clearRect(0, 0, W, H); }

  window.Ambient = {
    init: function () { size(); },
    setIntensity: function (v) {
      intensity = v;
      canvas.style.opacity = v.toFixed(3);
      if (v > 0.01) start(); else stop();
    },
    setScroll: function (y) { scrollY = y; },
    resize: size
  };

  window.addEventListener('pointermove', function (e) {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (intensity > 0.01) start();
  });
})();
