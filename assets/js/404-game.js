/*
 * 404 — "Glide through the refusals"
 * 天馬（Tema_Q の Q）を羽ばたかせて、AI の拒否文でできた壁の隙間をすり抜けるミニゲーム。
 *   SPACE / ↑ / W / クリック / タップ … 羽ばたく
 *   金色のオーブ（Abliterated）        … 次の壁を1枚だけすり抜けられる
 * 途中でこのサイトのプロジェクトにちなんだ小ネタが出ます（2 / 16 / 49 / 200 枚目）。
 */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  /* ---------- 画面 ---------- */
  var W = 720, H = 420;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var css = getComputedStyle(document.documentElement);
  function token(name, fallback) {
    var v = css.getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  var C = {
    text: token('--text', '#17160f'),
    muted: token('--text-muted', '#55524a'),
    dim: token('--text-dim', '#8b8678'),
    accent: token('--accent', '#a9812f'),
    accentDim: token('--accent-dim', '#7d5f22'),
    border: token('--border', '#ddd8cc'),
    surface: token('--surface', '#f4f3ee')
  };
  var SERIF = '"Cormorant Garamond", "Hiragino Mincho ProN", "Yu Mincho", serif';
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  var SANS = '"Manrope", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", sans-serif';

  if (document.fonts && document.fonts.load) {
    ['600 24px "Cormorant Garamond"', 'italic 500 24px "Cormorant Garamond"', '400 12px "JetBrains Mono"', '400 14px "Manrope"']
      .forEach(function (f) { document.fonts.load(f).catch(function () {}); });
  }

  /* ---------- パラメータ ---------- */
  var PX = 160;          // 天馬の x 位置
  var R = 15;            // 天馬の半径
  var GRAVITY = 1450;
  var FLAP = -400;
  var MAX_FALL = 640;
  var WALL_W = 62;
  var SPACING = 290;

  var REFUSALS = [
    "Sorry, I can't help with that.",
    "I'm unable to assist with that request.",
    '申し訳ありませんが、そのご依頼にはお応えできません。',
    'As an AI language model, I cannot…'
  ];
  var WALL_TEXT = "I can't help with that.  ";

  var MILESTONES = {
    2: 'TaQuants — +2-bit quality',
    16: 'Swap-MoE — 16GB DRAM is enough',
    49: 'SCAPE — up to 49× faster',
    200: 'Swap-MoE — +200B parameters'
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 状態 ---------- */
  var state = 'ready';   // ready | play | over
  var t = 0, bgx = 0, last = 0, overAt = 0, shake = 0;
  var p, walls, orbs, trail, score, ghost, toast, speed, refusal;
  var best = 0;
  try { best = parseInt(localStorage.getItem('tq404best') || '0', 10) || 0; } catch (e) { best = 0; }

  function gapSize() { return Math.max(104, 140 - score * 0.8); }

  function addWall(x) {
    var g = gapSize();
    var cy = 64 + g / 2 + Math.random() * (H - 128 - g);
    walls.push({ x: x, cy: cy, gap: g, passed: false, checked: false, ghosted: false });
    if (score >= 3 && Math.random() < 0.25) {
      orbs.push({ x: x + SPACING / 2 + WALL_W / 2, y: 70 + Math.random() * (H - 140) });
    }
  }

  function reset() {
    p = { y: H / 2, vy: 0 };
    walls = []; orbs = []; trail = [];
    score = 0; ghost = 0; toast = null; speed = 170; shake = 0;
    var x = W + 110;
    for (var i = 0; i < 4; i++) { addWall(x); x += SPACING; }
  }

  function say(text) { toast = { text: text, until: t + 2.2 }; }

  function die() {
    state = 'over';
    overAt = performance.now();
    shake = reduceMotion ? 0 : 9;
    refusal = REFUSALS[Math.floor(Math.random() * REFUSALS.length)];
    if (score > best) {
      best = score;
      try { localStorage.setItem('tq404best', String(best)); } catch (e) { /* ignore */ }
    }
  }

  function flap() {
    if (state === 'ready') {
      state = 'play';
    } else if (state === 'over') {
      if (performance.now() - overAt < 450) return;
      reset();
      state = 'play';
    }
    p.vy = FLAP;
    if (!reduceMotion) {
      for (var i = 0; i < 4; i++) {
        trail.push({ x: PX - 6, y: p.y + 6, vx: -40 - Math.random() * 40, vy: 20 + Math.random() * 40, life: 1 });
      }
    }
  }

  /* ---------- 更新 ---------- */
  function step(dt) {
    t += dt;

    if (state === 'ready') {
      p.y = H / 2 + Math.sin(t * 3) * 8;
      bgx += 20 * dt;
      return;
    }
    if (state === 'over') {
      p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
      p.y = Math.min(p.y + p.vy * dt, H - R);
      shake = Math.max(0, shake - 30 * dt);
      updateTrail(dt);
      return;
    }

    speed = 170 + Math.min(score * 2.2, 100);
    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
    p.y += p.vy * dt;
    if (p.y < R) { p.y = R; if (p.vy < 0) p.vy = 0; }
    if (p.y > H - R) { die(); return; }

    var dx = speed * dt;
    bgx += dx;
    var i, w, o;
    for (i = 0; i < walls.length; i++) walls[i].x -= dx;
    for (i = 0; i < orbs.length; i++) orbs[i].x -= dx;

    while (walls[walls.length - 1].x < W + 80) addWall(walls[walls.length - 1].x + SPACING);
    while (walls.length && walls[0].x < -WALL_W - 20) walls.shift();
    while (orbs.length && orbs[0].x < -40) orbs.shift();

    // オーブ
    for (i = orbs.length - 1; i >= 0; i--) {
      o = orbs[i];
      var ox = o.x - PX, oy = o.y - p.y;
      if (ox * ox + oy * oy < (R + 12) * (R + 12)) {
        orbs.splice(i, 1);
        ghost = Math.min(ghost + 1, 2);
        say('ABLITERATED — next wall passes through');
      }
    }

    // 壁
    for (i = 0; i < walls.length; i++) {
      w = walls[i];
      if (!w.passed && w.x + WALL_W < PX - R) {
        w.passed = true;
        score++;
        if (MILESTONES[score]) say(MILESTONES[score]);
      }
      if (PX + R > w.x && PX - R < w.x + WALL_W) {
        if (!w.checked) {
          w.checked = true;
          if (ghost > 0) { w.ghosted = true; ghost--; }
        }
        if (!w.ghosted) {
          var top = w.cy - w.gap / 2, bot = w.cy + w.gap / 2;
          if (p.y - (R - 3) < top || p.y + (R - 3) > bot) { die(); return; }
        }
      }
    }
    updateTrail(dt);
  }

  function updateTrail(dt) {
    for (var i = trail.length - 1; i >= 0; i--) {
      var q = trail[i];
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 2.2;
      if (q.life <= 0) trail.splice(i, 1);
    }
  }

  /* ---------- 描画 ---------- */
  function drawGrid() {
    ctx.strokeStyle = 'rgba(23,22,15,0.05)';
    ctx.lineWidth = 1;
    var off = -((bgx * 0.5) % 80);
    ctx.beginPath();
    for (var x = off; x < W; x += 80) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
    for (var y = 40; y < H; y += 80) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
  }

  function drawBar(x, y, w, h, ghosted) {
    if (h <= 0) return;
    ctx.save();
    ctx.globalAlpha = ghosted ? 0.35 : 1;
    ctx.fillStyle = 'rgba(23,22,15,0.06)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.border;
    ctx.setLineDash(ghosted ? [4, 4] : []);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = C.dim;
    ctx.font = '400 10px ' + MONO;
    ctx.textBaseline = 'middle';
    for (var cx = x + 14; cx < x + w; cx += 17) {
      ctx.save();
      ctx.translate(cx, y + h);
      ctx.rotate(-Math.PI / 2);
      var s = '', n = Math.ceil(h / 60) + 1;
      for (var k = 0; k < n; k++) s += WALL_TEXT;
      ctx.fillText(s, 4, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWall(w) {
    var top = w.cy - w.gap / 2, bot = w.cy + w.gap / 2;
    drawBar(w.x, 0, WALL_W, top, w.ghosted);
    drawBar(w.x, bot, WALL_W, H - bot, w.ghosted);
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = w.ghosted ? 0.4 : 1;
    ctx.fillRect(w.x, top - 2, WALL_W, 2);
    ctx.fillRect(w.x, bot, WALL_W, 2);
    ctx.globalAlpha = 1;
  }

  function drawOrb(o) {
    var r = 11 + Math.sin(t * 4) * 1.2;
    var g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, r * 2.4);
    g.addColorStop(0, 'rgba(169,129,47,0.35)');
    g.addColorStop(1, 'rgba(169,129,47,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(t * 0.8);
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = C.accentDim;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(o.x - 5, o.y + 5); ctx.lineTo(o.x + 5, o.y - 5); ctx.stroke();
  }

  function drawWing(side, flapPhase) {
    ctx.save();
    ctx.rotate(side * (0.25 + Math.sin(flapPhase) * 0.5));
    ctx.fillStyle = 'rgba(169,129,47,0.28)';
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-26, side * -6, -34, side * -22);
    ctx.quadraticCurveTo(-18, side * -16, -12, side * -12);
    ctx.quadraticCurveTo(-18, side * -9, -8, side * -5);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawPegasus() {
    var ghostly = ghost > 0;
    ctx.save();
    ctx.translate(PX, p.y);
    var tilt = state === 'play' || state === 'over' ? Math.max(-0.5, Math.min(0.9, p.vy / 700)) : 0;
    ctx.rotate(tilt);
    var phase = t * (state === 'play' && p.vy < 0 ? 26 : 9);
    if (ghostly) ctx.globalAlpha = 0.7;
    drawWing(1, phase);
    drawWing(-1, phase + 0.6);
    var g = ctx.createLinearGradient(-R, -R, R, R);
    g.addColorStop(0, '#c9a24a');
    g.addColorStop(1, C.accentDim);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    if (ghostly) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(0, 0, R + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.rotate(-tilt);
    ctx.fillStyle = '#fff';
    ctx.font = '600 21px ' + SERIF;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Q', 0, 1);
    ctx.restore();
  }

  function drawTrail() {
    for (var i = 0; i < trail.length; i++) {
      var q = trail[i];
      ctx.fillStyle = 'rgba(169,129,47,' + (q.life * 0.5).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, 2 + q.life * 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function panel(w, h, cx) {
    var x = (cx == null ? W / 2 : cx) - w / 2, y = (H - h) / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.border;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = C.accent;
    ctx.fillRect(x, y, 3, h);
  }

  function drawHud() {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.dim;
    ctx.font = '400 11px ' + MONO;
    ctx.textAlign = 'left';
    ctx.fillText('TOKENS', 18, 28);
    ctx.fillStyle = C.text;
    ctx.font = '500 26px ' + SERIF;
    ctx.fillText(String(score), 18, 54);
    ctx.textAlign = 'right';
    ctx.fillStyle = C.dim;
    ctx.font = '400 11px ' + MONO;
    ctx.fillText('BEST ' + best, W - 18, 28);
    if (ghost > 0) {
      ctx.fillStyle = C.accentDim;
      ctx.fillText('ABLITERATED ×' + ghost, W - 18, 46);
    }
  }

  function drawToast() {
    if (!toast) return;
    var left = toast.until - t;
    if (left <= 0) { toast = null; return; }
    ctx.save();
    ctx.globalAlpha = Math.min(1, left * 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '400 12px ' + MONO;
    var w = ctx.measureText(toast.text).width + 32;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect((W - w) / 2, 70, w, 28);
    ctx.strokeStyle = C.accent;
    ctx.strokeRect((W - w) / 2 + 0.5, 70.5, w - 1, 27);
    ctx.fillStyle = C.accentDim;
    ctx.fillText(toast.text, W / 2, 88);
    ctx.restore();
  }

  function drawReady() {
    var cx = W / 2 + 70;      // 天馬（左側）と重ならないよう右へずらす
    panel(400, 118, cx);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    ctx.font = 'italic 500 27px ' + SERIF;
    ctx.fillText('Glide through the refusals', cx, H / 2 - 14);
    ctx.fillStyle = C.muted;
    ctx.font = '400 13px ' + SANS;
    ctx.fillText('AIの「お断り」の壁を、天馬で飛び越えよう。', cx, H / 2 + 12);
    ctx.fillStyle = C.accentDim;
    ctx.font = '400 11px ' + MONO;
    ctx.fillText('SPACE / CLICK / TAP', cx, H / 2 + 38);
  }

  function drawOver() {
    panel(500, 156);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    ctx.font = 'italic 500 25px ' + SERIF;
    ctx.fillText(refusal, W / 2, H / 2 - 22, 460);
    ctx.fillStyle = C.muted;
    ctx.font = '400 12px ' + MONO;
    ctx.fillText('TOKENS ' + score + '   ·   BEST ' + best + (score > 0 && score >= best ? '  ★ NEW' : ''), W / 2, H / 2 + 12);
    if (performance.now() - overAt > 450 && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = C.accentDim;
      ctx.fillText('SPACE / TAP — try again', W / 2, H / 2 + 44);
    }
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawGrid();
    for (var i = 0; i < orbs.length; i++) drawOrb(orbs[i]);
    for (i = 0; i < walls.length; i++) drawWall(walls[i]);
    drawTrail();
    drawPegasus();
    ctx.restore();
    if (state !== 'ready') drawHud();
    drawToast();
    if (state === 'ready') drawReady();
    if (state === 'over') drawOver();
  }

  /* ---------- ループ / 入力 ---------- */
  function frame(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.033) : 0;
    last = ts;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { last = 0; });

  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.code !== 'Space' && e.code !== 'ArrowUp' && e.code !== 'KeyW') return;
    var tag = e.target && e.target.tagName;
    if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    flap();
  });
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    flap();
  });

  reset();
  requestAnimationFrame(frame);

  // 自動テスト用（通常は公開されません）
  if (window.__TQ_TEST) {
    window.__tq404 = {
      flap: flap,
      step: step,
      get: function () { return { state: state, score: score, ghost: ghost, p: p, walls: walls, orbs: orbs, best: best, toast: toast }; },
      set: function (o) { if (o.score != null) score = o.score; if (o.ghost != null) ghost = o.ghost; },
      PX: PX, R: R, WALL_W: WALL_W
    };
  }
})();
