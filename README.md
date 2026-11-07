# YouTube Skip

[![Download the latest version](https://img.shields.io/github/v/release/vviseguy/youtube-skip?label=Download&style=for-the-badge&color=e62117)](https://github.com/vviseguy/youtube-skip/releases/latest/download/youtube-skip.zip)

For the parts of a video you would rather not sit through: ads, endless intros, or the scene everyone warned you about.

A small Chrome extension that briefly plays a video at 16x speed. Each click (or press of Alt+S) plays about 15 seconds of video in under a second, and clicks add together. On YouTube, it can also detect ads and speed through them.

- It runs in Chrome, Edge, and Brave on a computer. It does not run on phones, Firefox, or Safari.
- It works on YouTube, Amazon Prime Video, and most other sites that use a standard video player.
- It does not work on live streams, because a live video cannot play faster than it is broadcast.
- It does not block ads; the ad still plays, only faster.
- It collects no data and makes no network requests.
- It is not affiliated with YouTube or Google.

## Install

The extension is not in the Chrome Web Store, so it must be added manually:

1. Download [youtube-skip.zip](https://github.com/vviseguy/youtube-skip/releases/latest/download/youtube-skip.zip).
2. Unzip it. On Windows, right-click the file and choose **Extract All**. On a Mac, double-click it.
   Keep the unzipped folder in a permanent location, such as Documents. If the folder is later moved or deleted, the extension stops working.
3. Open the extensions page by typing `chrome://extensions` into the address bar. In Edge, use `edge://extensions`.
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
6. Pin the button: click the puzzle-piece icon at the top right of the browser, then click the pin next to YouTube Skip. Otherwise, the button stays hidden.
7. Refresh any YouTube tabs that were already open, so that ad detection can start in them.

About the warnings Chrome shows:

- Chrome says the extension can "read and change your data on youtube.com". This is how it detects ads and changes the video speed. On other sites, it does nothing until you click it.
- Chrome may show a notice about developer mode extensions when it starts. This is normal for manually installed extensions, and it can be dismissed.

## How to use it

### Clicks add together

Each click plays about 15 seconds of video in under a second (16x speed for 0.9 seconds). If you click again before that time ends, the time adds on. The total is the same no matter how quickly you click.

| Clicks | Video played at 16x |
|---|---|
| 1 | about 14 seconds |
| 2 | about 29 seconds |
| 3 | about 43 seconds |
| 4 | about 58 seconds |

A simple rule: divide the seconds remaining by 15, and click that many times. Each click is actually a little under 15 seconds, so this leaves a small margin, and the video returns to normal speed slightly before the ad ends.

This works on any site with a video.

### YouTube ad settings

To choose how the extension handles YouTube ads, right-click the button and choose **Options**.

| Setting | During a YouTube ad |
|---|---|
| **Indicator** (default) | The button shows "AD". Clicks add time as usual. |
| **Click to start** | One click plays the whole ad at 16x. Normal speed returns when the ad ends. |
| **Automatic** | Each ad plays at 16x by itself, and normal speed returns when the ad ends. Click the button to play that ad at normal speed. |

In **Click to start** and **Automatic**, a click during an ad starts or stops the speed-up instead of adding time. Outside ads, clicks add time as usual.

### What the button shows

| Button | Meaning |
|---|---|
| ▶\| | Ready |
| ▶ with "AD" | An ad is playing |
| ⏩ filling with white | Playing at 16x. The first click fills about a quarter, and each further click adds a little less. The level drains steadily as the time runs out, so it shows the time left. |
| ⏸ filled with white | An ad is playing at 16x. Click to stop. |

The water in the icon moves when you click, and bubbles rise as it drains. To turn this off, open **Options** and clear **Waves and bubbles**. The icon still fills and drains.

## Updating

The extension does not update itself. To install a new version:

1. Download the zip again using the button at the top of this page.
2. Unzip it and replace the files in your existing folder.
3. On `chrome://extensions`, click the reload arrow on YouTube Skip.

## Troubleshooting

- **The button is not visible.** Pin it (Install, step 6).
- **There is no Options menu.** You have an older version. See Updating.
- **"AD" never appears on YouTube.** Refresh the YouTube tab. If it still does not appear, YouTube may have changed its page; please [open an issue](https://github.com/vviseguy/youtube-skip/issues).
- **Alt+S does nothing.** Another extension may use the same shortcut. Choose a different one at `chrome://extensions/shortcuts`.
- **Nothing happens on a live stream.** This is expected; live video cannot be sped up.
- **Nothing happens on another site.** The site may not use a standard video player.

## For developers

The extension is plain JavaScript in [`extension/`](extension), with no build step. To release a new version:

1. Change `"version"` in `extension/manifest.json`, for example to `1.2.1`.
2. Commit, then tag and push:

   ```bash
   git tag v1.2.1 && git push origin main v1.2.1
   ```

The `release` workflow zips `extension/` and attaches `youtube-skip.zip` to a GitHub Release. It fails if the tag does not match the manifest version. Ad detection uses the `ad-showing` class on YouTube's player element (see [`ads.js`](extension/ads.js)).

## License

MIT
