// Injected on each click of the toolbar button (or Alt+S).
// Each click plays the video at 16x for 0.9 s more of real time
// (about 14 s of video), then the old speed comes back.
// State lives on window so it survives re-injection into the same tab.
(() => {
  const SPEED = 16;
  const STEP_MS = 900;

  // Prefer the video that is playing; else the first one on the page.
  const videos = [...document.querySelectorAll("video")];
  const video = videos.find((v) => !v.paused) ?? videos[0];
  if (!video) {
    console.log("YouTube Skip: no video on this page.");
    return;
  }

  const state = (window.__youtubeSkip ??= {
    video: null,
    prevSpeed: 1,
    endAt: 0,
    timer: 0,
  });

  const restore = () => {
    clearTimeout(state.timer);
    state.timer = 0;
    if (state.video) state.video.playbackRate = state.prevSpeed;
    state.video = null;
  };

  // A run on a different video (e.g. the page swapped players): end it first.
  if (state.timer && state.video !== video) restore();

  const now = Date.now();
  if (!state.timer) {
    state.video = video;
    state.prevSpeed = video.playbackRate;
    state.endAt = now;
  }

  // Every click adds the same amount of time.
  state.endAt = Math.max(state.endAt, now) + STEP_MS;
  video.playbackRate = SPEED;
  clearTimeout(state.timer);
  state.timer = setTimeout(restore, state.endAt - now);
})();
