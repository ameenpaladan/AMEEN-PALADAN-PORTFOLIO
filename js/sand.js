/* =====================================================================
   SandDissolve — turns the real portrait's own pixels into drifting sand.
   - Samples the exact on-screen photograph (no regeneration, no edits).
   - progress 0 -> picture reproduced by particles; 1 -> fully scattered.
   - Rendered into a raw pixel buffer for speed (tens of thousands of grains).
   ===================================================================== */
(function () {
  'use strict';

  function SandDissolve(canvas, img) {
    this.canvas = canvas;
    this.img = img;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.ready = false;
    this.failed = false;
    this.p = 0;           // dissolve progress 0..1
    this.t = 0;           // time for subtle drift
    this.dpr = 1;
    this.count = 0;
  }

  // tiny deterministic PRNG so the dissolve looks identical every visit
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  SandDissolve.prototype.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    var coarse = window.matchMedia('(pointer:coarse)').matches || w < 820;
    this.dpr = 1;   // sand is rendered at CSS-pixel resolution (fast, and grains stay fine)
    this.W = Math.round(w * this.dpr);
    this.H = Math.round(h * this.dpr);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.frame = this.ctx.createImageData(this.W, this.H);
    this.buf = new Uint32Array(this.frame.data.buffer);
    this.coarse = coarse;
  };

  /**
   * Sample particles from the image as it is currently placed in the stage
   * (call with the zoom already at its final value for a seamless hand-off).
   * @param {DOMRect} rect  on-screen rect of the zoomed image
   */
  SandDissolve.prototype.build = function (rect) {
    this.resize();
    var img = this.img;
    if (!img.complete || !img.naturalWidth) { this.failed = true; return false; }

    var w = window.innerWidth, h = window.innerHeight;
    var budget = this.coarse ? 22000 : 80000;

    // visible part of the image rect (what the viewer actually sees)
    var vx0 = Math.max(0, rect.left), vy0 = Math.max(0, rect.top);
    var vx1 = Math.min(w, rect.right), vy1 = Math.min(h, rect.bottom);
    var vw = vx1 - vx0, vh = vy1 - vy0;
    if (vw <= 0 || vh <= 0) { this.failed = true; return false; }

    var step = Math.max(1, Math.sqrt((vw * vh) / budget));
    var cols = Math.floor(vw / step), rows = Math.floor(vh / step);

    // draw the image into an offscreen canvas at screen scale and read pixels
    var off = document.createElement('canvas');
    off.width = Math.ceil(vw); off.height = Math.ceil(vh);
    var octx = off.getContext('2d', { willReadFrequently: true });
    var sx = (vx0 - rect.left) / rect.width * img.naturalWidth;
    var sy = (vy0 - rect.top) / rect.height * img.naturalHeight;
    var sw = vw / rect.width * img.naturalWidth;
    var sh = vh / rect.height * img.naturalHeight;
    var data;
    try {
      octx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height);
      data = octx.getImageData(0, 0, off.width, off.height).data;
    } catch (e) {            // e.g. opened from file:// -> tainted canvas
      this.failed = true; return false;
    }

    var rand = rng(20240611);
    var n = cols * rows;
    var ox = new Float32Array(n), oy = new Float32Array(n);
    var col = new Uint32Array(n);
    var delay = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    var depth = new Float32Array(n), sz = new Uint8Array(n);
    var k = 0;

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var px = Math.min(off.width - 1, Math.floor((i + rand()) * step));
        var py = Math.min(off.height - 1, Math.floor((j + rand()) * step));
        var idx = (py * off.width + px) * 4;
        var r = data[idx], g = data[idx + 1], b = data[idx + 2];
        var lum = (r * 0.3 + g * 0.59 + b * 0.11);
        if (lum < 7) continue;               // pure-black grains are invisible, skip
        // jittered origin in device pixels
        var X = (vx0 + (i + rand()) * step) * this.dpr;
        var Y = (vy0 + (j + rand()) * step) * this.dpr;
        ox[k] = X; oy[k] = Y;
        col[k] = (r) | (g << 8) | (b << 16);   // original colour, alpha added at draw time
        // dissolve sweeps right -> left and top -> bottom with noise, like wind taking sand
        var nx = (X / this.W);
        var ny = (Y / this.H);
        delay[k] = Math.min(0.62, (1 - nx) * 0.42 + ny * 0.1 + rand() * 0.2);
        depth[k] = 0.35 + rand() * 0.65;      // parallax / speed layer
        // drift direction: mostly up-right with turbulence
        var ang = -0.55 + (rand() - 0.5) * 1.6;
        var spd = (0.25 + rand() * 0.85) * depth[k];
        vx[k] = Math.cos(ang) * spd;
        vy[k] = Math.sin(ang) * spd - 0.12 * rand();
        sz[k] = (rand() < 0.14 && !this.coarse) ? 2 : 1;
        k++;
      }
    }
    this.count = k;
    this.ox = ox; this.oy = oy; this.col = col; this.delay = delay;
    this.vx = vx; this.vy = vy; this.depth = depth; this.sz = sz;
    this.ready = true;
    this.failed = false;
    return true;
  };

  SandDissolve.prototype.render = function (p, time) {
    if (!this.ready) return;
    this.p = p;
    var buf = this.buf, W = this.W, H = this.H;
    buf.fill(0);
    var n = this.count, dpr = this.dpr;
    var reach = Math.max(W, H) * 1.15;   // how far the sand travels overall

    for (var i = 0; i < n; i++) {
      var local = (p - this.delay[i]) / (1 - 0.62 + 0.0001);   // 0..1 for this grain
      var x = this.ox[i], y = this.oy[i], a = 255, m = 0;

      if (local > 0) {
        if (local > 1) local = 1;
        // ease-in: grains loosen slowly, then get carried
        var e = local * local * (3 - 2 * local);
        var wob = Math.sin(time * 0.0011 + i * 0.37) * 6 * dpr * e;
        x += this.vx[i] * reach * e * e * 0.75 + wob;
        y += this.vy[i] * reach * e * e * 0.75 + Math.cos(time * 0.0009 + i * 0.21) * 5 * dpr * e + 50 * dpr * e * e * this.depth[i]; // slight settle/fall
        m = Math.min(1, e * 1.6);
        a = 255 * (1 - Math.pow(e, 2.2));
      }
      if (a < 6) continue;
      if (x < 0 || y < 0 || x >= W - 2 || y >= H - 2) continue;

      var c = this.col[i];
      var r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;
      if (m > 0) {   // as grains leave the photograph they warm toward neutral golden sand
        var lum = r * 0.3 + g * 0.59 + b * 0.11;
        r += (lum * 0.95 + 70 * m - r) * m;
        g += (lum * 0.82 + 52 * m - g) * m;
        b += (lum * 0.62 + 30 * m - b) * m;
      }
      // premultiplied-ish blend over transparent: write straight alpha
      var px = (a << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      var xi = x | 0, yi = y | 0, o = yi * W + xi;
      var s = this.sz[i] * (W > 1800 ? 2 : 1);
      buf[o] = px;
      if (s > 1) { buf[o + 1] = px; buf[o + W] = px; buf[o + W + 1] = px; }
    }
    this.ctx.putImageData(this.frame, 0, 0);
  };

  SandDissolve.prototype.clear = function () {
    if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  window.SandDissolve = SandDissolve;
})();
