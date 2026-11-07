if (typeof SPEED === "undefined") {
  var SPEED = 16;
  var prev_speed = SPEED;
  var click_count = 0;
}

function fastPlay() {
  click_count++;
  let curr_speed = document.getElementsByTagName("video")[0].playbackRate;

  if (curr_speed != SPEED) {
    prev_speed = curr_speed;
  }

  document.getElementsByTagName("video")[0].playbackRate = SPEED;

  setTimeout(() => {
    click_count--;
    if (click_count == 0)
      document.getElementsByTagName("video")[0].playbackRate = prev_speed;
  }, 900 * click_count);
}

console.log("FastPlay will begin in a moment.");

fastPlay();
