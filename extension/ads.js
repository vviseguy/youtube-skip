// YouTube ad watcher (content script on www.youtube.com only).
// Signal (same as ad-muter): the player element has the `ad-showing` class
// for exactly as long as a video ad plays.
//
// Modes (settings page):
//   indicator - show "AD" on the toolbar icon; clicks do the normal 16x step
//   click     - a click during an ad plays 16x until the ad ends
//   auto      - 16x starts when an ad starts and ends when it ends;
//               a click during an auto run stops it for that ad
// Outside ads, clicks always do the normal 16x step (content.js).
(() => {
  if (window.__ytSkipAds) return;

  const SPEED = 16;
  const PLAYER = "#movie_player, .html5-video-player";
  const AD_CLASS = "ad-showing";

  let mode = "indicator";
  let adShowing = false;
  let run = null; // { kind: "auto" | "click", video, prevSpeed }
  let suppressed = false; // user stopped the auto run for this ad
  let lastReported = "";

  const player = () => document.querySelector(PLAYER);
  const video = () => player()?.querySelector("video") ?? null;

  const report = () => {
    const state = run ? "adrun" : adShowing ? "ad" : "idle";
    if (state === lastReported) return;
    lastReported = state;
    try {
      chrome.runtime.sendMessage({ type: "state", state });
    } catch {
      // Extension was reloaded; this old script is orphaned. Ignore.
    }
  };

  const startRun = (kind) => {
    const v = video();
    if (!v) return false;
    // An ad run replaces any normal 16x step that is still going.
    const step = window.__youtubeSkip;
    if (step?.timer) {
      clearTimeout(step.timer);
      step.timer = 0;
      step.video = null;
    }
    run = { kind, video: v, prevSpeed: v.playbackRate === SPEED ? 1 : v.playbackRate };
    v.playbackRate = SPEED;
    return true;
  };

  const endRun = () => {
    if (!run) return;
    // YouTube often resets the speed itself when the ad ends; only undo
    // our 16x if it is still there, so the user's own speed is kept.
    if (run.video.playbackRate === SPEED) run.video.playbackRate = run.prevSpeed;
    run = null;
  };

  const check = () => {
    const p = player();
    const nowAd = p ? p.classList.contains(AD_CLASS) : false;
    if (nowAd !== adShowing) {
      adShowing = nowAd;
      if (adShowing) {
        suppressed = false;
        if (mode === "auto") startRun("auto");
      } else {
        endRun();
        suppressed = false;
      }
    }
    // Keep 16x through ad pods: YouTube can reset the speed per ad.
    if (run && adShowing) {
      const v = video();
      if (v && v !== run.video) run.video = v;
      if (run.video.playbackRate !== SPEED) run.video.playbackRate = SPEED;
    }
    report();
  };

  // Toolbar click, routed here by background.js. Returns true when handled;
  // false means "not an ad action", and background.js does the normal step.
  const onClick = () => {
    if (run) {
      endRun();
      if (adShowing) suppressed = true;
      report();
      return true;
    }
    if (adShowing && (mode === "click" || mode === "auto")) {
      const ok = startRun("click");
      report();
      return ok;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "click") sendResponse(onClick());
  });

  chrome.storage.sync.get({ mode: "indicator" }, (s) => {
    mode = s.mode;
    if (mode === "auto" && adShowing && !run && !suppressed) startRun("auto");
    check();
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (!changes.mode) return;
    mode = changes.mode.newValue;
    if (mode === "auto" && adShowing && !run && !suppressed) startRun("auto");
    if (mode === "indicator" && run) endRun();
    report();
  });

  // Fast path: watch the player's class. Fallback: a 500 ms poll, which also
  // covers YouTube's page changes that replace the player.
  let observed = null;
  setInterval(() => {
    const p = player();
    if (p && p !== observed && typeof MutationObserver !== "undefined") {
      observed = p;
      new MutationObserver(check).observe(p, { attributes: true, attributeFilter: ["class"] });
    }
    check();
  }, 500);

  // Lets content.js re-show the right icon when a normal step ends.
  window.__ytSkipAds = {
    report: () => {
      lastReported = "";
      report();
    },
  };
  check();
})();
