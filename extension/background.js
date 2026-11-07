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
//   step  - liquid fill: level = time left / FULL_MS, drains with the clock
//   adrun - liquid full, surface keeps rolling, pause glyph (click to stop)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "state" || !sender.tab) return;
  setState(sender.tab.id, msg.state, msg.leftMs);
});

const STEP_MS = 900;
const FULL_MS = 4 * STEP_MS; // 4 clicks fill the icon to MAX_LEVEL
const MAX_LEVEL = 0.75; // never fill to the top, so the surface stays visible
const BUBBLE_MS = 700; // time for a bubble to rise from the bottom to the top
const FRAME_MS = 100; // the toolbar icon can take about 10 updates a second

const TITLES = {
  idle: "YouTube Skip: 16x for a few seconds (Alt+S)",
  ad: "Ad playing - click to speed it up",
  step: "Playing at 16x - click to add more time",
  adrun: "Ad at 16x - click to stop",
};

/** tabId -> { kind, endAt, shown, bubbles, water } for animated tabs. */
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
    for (let i = 0; i < 3; i++) {
      bubbles.push({ x: 3 + Math.random() * 10, born: now + i * 90, r: 0.6 + Math.random() * 0.5 });
    }
    const water = prev?.water ?? makeWater(now);
    water.splash(); // each click splashes the surface
    running.set(tabId, {
      kind: state,
      endAt: state === "step" ? now + (leftMs ?? STEP_MS) : 0,
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
    const target =
      MAX_LEVEL * (r.kind === "adrun" ? 1 : Math.min(1, Math.max(0, r.endAt - now) / FULL_MS));
    r.bubbles = r.bubbles.filter((b) => now - b.born < BUBBLE_MS);
    r.water.advance(now);
    // Pour up quickly; drain exactly with the clock.
    r.shown = target > r.shown ? r.shown + (target - r.shown) * 0.45 : target;
    if (r.kind === "step" && r.shown <= 0.001) {
      // Time is up; content.js will report the final state.
      running.delete(tabId);
      continue;
    }
    paint(tabId, r.kind === "adrun" ? "pause" : "fast", r.shown, now, r.bubbles, r.water.surface);
  }
  if (running.size === 0) {
    clearInterval(loop);
    loop = 0;
  }
}

function paint(tabId, glyph, level, t, bubbles = [], surface = flat) {
  const imageData = {
    16: draw(16, glyph, level, t, bubbles, surface),
    32: draw(32, glyph, level, t, bubbles, surface),
  };
  chrome.action
    .setIcon({ tabId, imageData })
    .catch(() => running.delete(tabId)); // tab closed
}

// The water surface: a small spring simulation. Each click drops a soft
// splash at a random point; the ripples run to the sides and settle, with
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

  const bump = (amp) => {
    const c = 6 + Math.random() * (N - 12);
    for (let i = 0; i < N; i++) v[i] -= amp * Math.exp(-(((i - c) / 5) ** 2));
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
    if (Math.random() < 0.02) bump(0.18); // small drips
  };

  return {
    splash: () => bump(1.3),
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

function draw(size, glyph, level, t, bubbles = [], surface = flat) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const s = size / 16;
  const box = () => {
    g.beginPath();
    g.roundRect(0, 2 * s, 16 * s, 12 * s, 3.5 * s);
  };
  const tri = (x0, x1) => {
    g.beginPath();
    g.moveTo(x0 * s, 4.5 * s);
    g.lineTo(x1 * s, 8 * s);
    g.lineTo(x0 * s, 11.5 * s);
    g.closePath();
    g.fill();
  };
  const drawGlyph = (color) => {
    g.fillStyle = color;
    if (glyph === "skip") {
      tri(5, 10);
      g.fillRect(10 * s, 4.5 * s, 1.6 * s, 7 * s);
    } else if (glyph === "play") {
      tri(5.5, 11);
    } else if (glyph === "fast") {
      tri(3, 8);
      tri(8, 13);
    } else if (glyph === "pause") {
      g.fillRect(5 * s, 4.5 * s, 2 * s, 7 * s);
      g.fillRect(9 * s, 4.5 * s, 2 * s, 7 * s);
    }
  };

  // 1. Base: red box, white glyph.
  box();
  g.fillStyle = RED;
  g.fill();
  drawGlyph(WHITE);

  if (level > 0.001) {
    // 2. Liquid below a wavy surface, with inverted colors.
    const y = 2 * s + 12 * s * (1 - level);
    g.save();
    box();
    g.clip();
    g.beginPath();
    g.moveTo(0, size);
    for (let x = 0; x <= size + 0.01; x += Math.max(0.5, s / 2)) {
      g.lineTo(x, y + surface(x / size) * s);
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
      const by = 14 * s - age * 12 * s; // bottom of the box to the top
      if (by < y) continue; // popped at the surface (clip hides the rest)
      const wobble = Math.sin(age * 9 + b.x) * 0.6 * s;
      g.beginPath();
      g.arc(b.x * s + wobble, by, Math.max(0.6, b.r * s), 0, Math.PI * 2);
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
