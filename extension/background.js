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
//   idle  - skip glyph (default icon)
//   ad    - skip glyph + "AD" badge (an ad is playing)
//   step  - fast-forward glyph (normal 16x step running)
//   adrun - pause glyph (16x until the ad ends; click to stop)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type !== "state" || !sender.tab) return;
  setState(sender.tab.id, msg.state);
});

function setState(tabId, state) {
  const glyph = { idle: "skip", ad: "play", step: "fast", adrun: "pause" }[state] ?? "skip";
  chrome.action.setIcon({ tabId, imageData: { 16: draw(16, glyph), 32: draw(32, glyph) } }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text: state === "ad" ? "AD" : "" }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#222" }).catch(() => {});
  const titles = {
    idle: "YouTube Skip: 16x for a few seconds (Alt+S)",
    ad: "Ad playing - click to speed it up",
    step: "Playing at 16x - click to add more time",
    adrun: "Ad at 16x - click to stop",
  };
  chrome.action.setTitle({ tabId, title: titles[state] ?? titles.idle }).catch(() => {});
}

// Icons are drawn in code: red rounded box with a white glyph.
function draw(size, glyph) {
  const c = new OffscreenCanvas(size, size);
  const g = c.getContext("2d");
  const s = size / 16;
  g.fillStyle = glyph === "pause" ? "#c4302b" : "#ff0000";
  g.beginPath();
  g.roundRect(0, 2 * s, 16 * s, 12 * s, 3.5 * s);
  g.fill();
  g.fillStyle = "#fff";
  const tri = (x0, x1) => {
    g.beginPath();
    g.moveTo(x0 * s, 4.5 * s);
    g.lineTo(x1 * s, 8 * s);
    g.lineTo(x0 * s, 11.5 * s);
    g.closePath();
    g.fill();
  };
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
  return g.getImageData(0, 0, size, size);
}
