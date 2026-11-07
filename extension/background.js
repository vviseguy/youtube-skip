// Toolbar click (or Alt+S): on YouTube, ads.js may handle it as an ad
// action. Otherwise inject content.js, the normal 16x step.
chrome.action.onClicked.addListener(async (tab) => {
  let handled = false;
  try {
    handled = await chrome.tabs.sendMessage(tab.id, { type: "click" });
  } catch {
    // No ads.js in this tab (not YouTube, or the page predates install).
  }
  if (!handled) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  }
});

// Per-tab icon state, reported by ads.js and content.js:
//   idle  - skip glyph (static)
//   ad    - play glyph + "AD" badge (static)
//   step  - liquid fill: level = levelFor(time left), drains with the clock
//   adrun - liquid full, surface keeps moving, pause glyph (click to stop)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "state" || !sender.tab) return;
  setState(sender.tab.id, msg.state, msg.leftMs);
});

const STEP_MS = 900;
// Fill on click follows a log curve of the time left, in clicks
// (k = leftMs / STEP_MS): the first click fills to FIRST_CLICK, then it
// tapers off and reaches the top at about 30 clicks (1 click 25%, 2 40%,
// 4 55%, 8 71%, 16 86%). Emptying is linear: each run keeps a scale
// (ms per full icon) that only grows, set so a click lands on the log curve
// when that is higher than the current scale allows. Between clicks the
// level is simply timeLeft / scale.
const FIRST_CLICK = 0.25;
const TAPER = 0.22;
const levelFor = (leftMs) => {
  const k = Math.max(0, leftMs) / STEP_MS;
  return k <= 1 ? k * FIRST_CLICK : Math.min(1, FIRST_CLICK + TAPER * Math.log(k));
};
const BUBBLE_MS = 700; // time for a bubble to rise from the bottom to the top
const FRAME_MS = 100; // the toolbar icon can take about 10 updates a second

const TITLES = {
  idle: "YouTube Skip: 16x for a few seconds (Alt+S)",
  ad: "Ad playing - click to speed it up",
  step: "Playing at 16x - click to add more time",
  adrun: "Ad at 16x - click to stop",
};

// Settings: "Waves and bubbles" (default on). Off keeps the fill level,
// which shows the time left, but with a flat surface and no bubbles.
let effects = true;
chrome.storage?.sync.get({ effects: true }, (v) => (effects = v.effects));
chrome.storage?.onChanged.addListener((c) => {
  if (c.effects) effects = c.effects.newValue;
});

/** tabId -> { kind, endAt, scale, shown, bubbles, water } for animated tabs. */
const running = new Map();
let loop = 0;

function setState(tabId, state, leftMs) {
  chrome.action.setBadgeText({ tabId, text: state === "ad" ? "AD" : "" }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#222" }).catch(() => {});
  chrome.action.setTitle({ tabId, title: TITLES[state] ?? TITLES.idle }).catch(() => {});

  if (state === "step" || state === "adrun") {
    const prev = running.get(tabId);
    const now = Date.now();
    // Each click (and the start of an ad run) sends up a few bubbles.
    const bubbles = (prev?.bubbles ?? []).filter((b) => now - b.born < BUBBLE_MS);
    for (let i = 0; i < (effects ? 3 : 0); i++) {
      bubbles.push({ x: 3 + Math.random() * 10, born: now + i * 90, r: 0.6 + Math.random() * 0.5 });
    }
    const water = prev?.water ?? makeWater(now);
    water.splash(); // each click splashes the surface
    const left = leftMs ?? STEP_MS;
    const scale =
      state === "step" ? Math.max(prev?.scale ?? 0, left / Math.max(0.01, levelFor(left))) : prev?.scale ?? 0;
    running.set(tabId, {
      kind: state,
      endAt: state === "step" ? now + left : 0,
      scale,
      shown: prev?.shown ?? 0,
      bubbles,
      water,
    });
    if (!loop) loop = setInterval(tick, FRAME_MS);
    tick();
    return;
  }

  running.delete(tabId);
  if (running.size === 0 && loop) {
    clearInterval(loop);
    loop = 0;
  }
  paint(tabId, state === "ad" ? "play" : "skip", 0, 0);
}

function tick() {
  const now = Date.now();
  for (const [tabId, r] of running) {
    // Ad runs have no end time: show them full.
    const target = r.kind === "adrun" ? 1 : Math.min(1, Math.max(0, r.endAt - now) / r.scale);
    r.bubbles = r.bubbles.filter((b) => now - b.born < BUBBLE_MS);
    // Now and then a single bubble, so the liquid stays alive between clicks.
    if (effects && Math.random() < 0.07) {
      r.bubbles.push({ x: 2 + Math.random() * 12, born: now, r: 0.5 + Math.random() * 0.4 });
    }
    r.water.advance(now);
    // Pour up quickly; drain exactly with the clock.
    r.shown = target > r.shown ? r.shown + (target - r.shown) * 0.45 : target;
    if (r.kind === "step" && r.shown <= 0.001) {
      // Time is up; content.js will report the final state.
      running.delete(tabId);
      continue;
    }
    const glyph = r.kind === "adrun" ? "pause" : "fast";
    if (effects) paint(tabId, glyph, r.shown, now, r.bubbles, r.water.surface);
    else paint(tabId, glyph, r.shown, now);
  }
  if (running.size === 0) {
    clearInterval(loop);
    loop = 0;
  }
}

function paint(tabId, glyph, level, t, bubbles = [], surface = flat) {
  // Chrome picks the size that matches the screen: 16 at 100%, 32 at 200%,
  // 40 at 250%, 48 at 300%. Exact sizes stay sharp instead of being scaled.
  const imageData = {};
  for (const size of ICON_SIZES) imageData[size] = draw(size, glyph, level, t, bubbles, surface);
  chrome.action
    .setIcon({ tabId, imageData })
    .catch(() => running.delete(tabId)); // tab closed
}

// The water surface: a small spring simulation. Each click drops two soft,
// unequal, lopsided splashes; the ripples run to the sides and settle, with
// rare small drips while it runs. Tuned (40 columns, gaussian smoothing,
// Catmull-Rom between columns) so the curves are about as round as two
// gentle sine waves, without looking regular. surface(x) for x in [0, 1]
// returns the height offset in 16-unit icon space (positive = lower).
const flat = () => 0;

function makeWater(startAt) {
  const N = 40;
  const RAD = 3;
  const SIM_MS = 1000 / 60;
  const h = new Float32Array(N);
  const v = new Float32Array(N);
  const sm = new Float32Array(N);
  const w = [];
  for (let k = -RAD; k <= RAD; k++) w.push(Math.exp(-((k / (RAD / 2 + 0.5)) ** 2)));
  const wsum = w.reduce((a, b) => a + b);
  const clampI = (i) => Math.min(N - 1, Math.max(0, i));
  let last = startAt;

  // A lopsided bump: steeper on one side than the other.
  const bump = (amp, c, wl, wr) => {
    for (let i = 0; i < N; i++) {
      const d = (i - c) / (i < c ? wl : wr);
      v[i] -= amp * Math.exp(-(d * d));
    }
  };
  // Each click: two smaller, unequal splashes at uneven places, each leaning
  // a random way, so the surface stays irregular instead of one clean peak.
  const splash = (amp) => {
    const left = Math.random() < 0.5;
    const c1 = left ? 5 + Math.random() * 12 : 23 + Math.random() * 12;
    const c2 = left ? 22 + Math.random() * 13 : 5 + Math.random() * 13;
    const lean = () => (Math.random() < 0.5 ? [2.5, 5.5] : [5.5, 2.5]);
    bump(amp * (0.55 + Math.random() * 0.15), c1, ...lean());
    bump(amp * (0.3 + Math.random() * 0.15), c2, ...lean());
  };
  const simStep = () => {
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < N; i++) {
        v[i] += -0.02 * h[i] - 0.025 * v[i];
        h[i] += v[i] * 0.5;
      }
      const lap = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const hl = h[clampI(i - 1)], hr = h[clampI(i + 1)];
        const vl = v[clampI(i - 1)], vr = v[clampI(i + 1)];
        lap[i] = 0.12 * (hl + hr - 2 * h[i]) + 0.05 * (vl + vr - 2 * v[i]);
      }
      for (let i = 0; i < N; i++) v[i] += lap[i];
    }
    if (Math.random() < 0.02) bump(0.18, Math.random() * N, 4, 4); // small drips
  };

  return {
    splash: () => splash(1.5),
    advance(now) {
      // Fixed 60 Hz steps, whatever the frame rate; cap catch-up after sleep.
      let steps = Math.min(30, Math.floor((now - last) / SIM_MS));
      last += steps * SIM_MS;
      if (now - last > 30 * SIM_MS) last = now;
      while (steps-- > 0) simStep();
      for (let i = 0; i < N; i++) {
        let a = 0;
        for (let k = -RAD; k <= RAD; k++) a += w[k + RAD] * h[clampI(i + k)];
        sm[i] = a / wsum;
      }
    },
    surface(x) {
      const p = x * (N - 1);
      const i = Math.floor(p);
      const f = p - i;
      const p0 = sm[clampI(i - 1)], p1 = sm[clampI(i)], p2 = sm[clampI(i + 1)], p3 = sm[clampI(i + 2)];
      return (
        0.95 * 0.5 *
        (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f)
      );
    },
  };
}

// Icons are drawn in code: a red rounded box with a white glyph. While a
// run is active, white "liquid" fills from the bottom with a wavy surface,
// and below the surface the colors invert (white box, red glyph). Red
// bubbles rise through the liquid and disappear at the surface.
const RED = "#e61a1a";
const WHITE = "#ffffff";

const ICON_SIZES = [16, 32, 40, 48];

// Icon geometry in 16-unit space. top/height: the red shape's band (full
// width); n: superellipse roundness; glyph: scale of the white glyph around
// the shape's centre. 1.43 : 1 with n = 3.7 was the measured closest smooth
// fit to the usual video-button proportions; glyphs are 25% smaller to match.
const SHAPE = { top: 2.4, height: 11.2, n: 3.7, glyph: 0.75 };

// The red shape. With sh.n set: a superellipse (|x/a|^n + |y/b|^n = 1),
// one smooth outline with no seams, sides bowed and corners rounded by a
// single number n (higher = squarer). Otherwise: a rounded box whose sides
// can bow out slightly (sh.radius, sh.bulge).
function shapePath(g, s, sh) {
  if (sh.n) {
    const a = (8 - (sh.inset ?? 0)) * s, b = (sh.height / 2) * s;
    const cx = 8 * s, cy = (sh.top + sh.height / 2) * s, e = 2 / sh.n;
    g.beginPath();
    for (let i = 0; i < 96; i++) {
      const th = (i / 96) * Math.PI * 2, c = Math.cos(th), si = Math.sin(th);
      const x = cx + a * Math.sign(c) * Math.abs(c) ** e;
      const y = cy + b * Math.sign(si) * Math.abs(si) ** e;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
    return;
  }
  // Sides are inset by the bulge so the bowed edges stay inside the icon.
  const l = sh.bulge * s, r = (16 - sh.bulge) * s, t = sh.top * s, b = (sh.top + sh.height) * s;
  const k = sh.radius * s, q = sh.bulge * s, cx = 8 * s, cy = t + (b - t) / 2;
  g.beginPath();
  g.moveTo(l + k, t);
  g.quadraticCurveTo(cx, t - q, r - k, t);
  g.quadraticCurveTo(r, t, r, t + k);
  g.quadraticCurveTo(r + q, cy, r, b - k);
  g.quadraticCurveTo(r, b, r - k, b);
  g.quadraticCurveTo(cx, b + q, l + k, b);
  g.quadraticCurveTo(l, b, l, b - k);
  g.quadraticCurveTo(l - q, cy, l, t + k);
  g.quadraticCurveTo(l, t, l + k, t);
  g.closePath();
}

function draw(size, glyph, level, t, bubbles = [], surface = flat, sh = SHAPE) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  // At 16 px the waves and bubbles are about 1 px and get lost, so make the
  // waves taller and the bubbles at least 2 px there. Larger sizes are exact.
  const tiny = size <= 16;
  const waveBoost = tiny ? 1.7 : 1;
  const minBubbleR = tiny ? 1 : 0.6;
  const s = size / 16;
  const box = () => shapePath(g, s, sh);
  // Glyph coordinates are designed for a 12-unit box centred at (8, 8);
  // gx/gy map them onto the current shape and glyph scale.
  const mid = sh.top + sh.height / 2;
  const gx = (x) => (8 + (x - 8) * sh.glyph) * s;
  const gy = (y) => (mid + (y - 8) * sh.glyph) * s;
  const gw = (w) => w * sh.glyph * s;
  const tri = (x0, x1) => {
    g.beginPath();
    g.moveTo(gx(x0), gy(4.5));
    g.lineTo(gx(x1), gy(8));
    g.lineTo(gx(x0), gy(11.5));
    g.closePath();
    g.fill();
  };
  const drawGlyph = (color) => {
    g.fillStyle = color;
    // Every glyph's bounding box is centred on x = 8 (and y = 8).
    if (glyph === "skip") {
      tri(4.7, 9.7); // 4.7 .. 11.3
      g.fillRect(gx(9.7), gy(4.5), gw(1.6), gw(7));
    } else if (glyph === "play") {
      tri(5.25, 10.75);
    } else if (glyph === "fast") {
      tri(3, 8);
      tri(8, 13);
    } else if (glyph === "pause") {
      g.fillRect(gx(5), gy(4.5), gw(2), gw(7));
      g.fillRect(gx(9), gy(4.5), gw(2), gw(7));
    }
  };

  // 1. Base: red box, white glyph.
  box();
  g.fillStyle = RED;
  g.fill();
  drawGlyph(WHITE);

  if (level > 0.001) {
    // 2. Liquid below a wavy surface, with inverted colors.
    const bulge = sh.n ? 0 : sh.bulge ?? 0;
    const y = (sh.top - bulge) * s + (sh.height + 2 * bulge) * s * (1 - level);
    g.save();
    box();
    g.clip();
    g.beginPath();
    g.moveTo(0, size);
    for (let x = 0; x <= size + 0.01; x += Math.max(0.5, s / 2)) {
      g.lineTo(x, y + surface(x / size) * s * waveBoost);
    }
    g.lineTo(size, size);
    g.closePath();
    g.clip();
    g.fillStyle = WHITE;
    g.fillRect(0, 0, size, size);
    drawGlyph(RED);
    g.fillStyle = RED;
    for (const b of bubbles) {
      const age = (t - b.born) / BUBBLE_MS;
      if (age < 0 || age > 1) continue;
      const by = (sh.top + sh.height) * s - age * sh.height * s; // bottom of the box to the top
      if (by < y) continue; // popped at the surface (clip hides the rest)
      const wobble = Math.sin(age * 9 + b.x) * 0.6 * s;
      g.beginPath();
      g.arc(b.x * s + wobble, by, Math.max(minBubbleR, b.r * s), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // 3. Red outline so the shape holds on light toolbars.
    g.save();
    box();
    g.clip();
    box();
    g.lineWidth = 2 * Math.max(1, 1.1 * s);
    g.strokeStyle = RED;
    g.stroke();
    g.restore();
  }
  return g.getImageData(0, 0, size, size);
}

// Replace the packaged PNG toolbar icon with the drawn ready icon, so the
// default matches the animated states. (Runs each time the worker starts.)
{
  const imageData = {};
  for (const size of ICON_SIZES) imageData[size] = draw(size, "skip", 0, 0);
  chrome.action.setIcon({ imageData }).catch(() => {});
}
