# YouTube Skip

[![Download the latest version](https://img.shields.io/github/v/release/vviseguy/youtube-skip?label=Download&style=for-the-badge&color=e62117)](https://github.com/vviseguy/youtube-skip/releases/latest/download/youtube-skip.zip)

Get through video ads fast. Click the button (or press **Alt+S**) and the video plays at **16x speed** for a moment, then goes back to normal. On YouTube it can also see when an ad starts and speed through it for you.

- Works in **Chrome on a computer**. It also works in Edge and Brave. It does not work on phones, Firefox, or Safari.
- Works on YouTube and Amazon Prime Video, and most other sites with a normal video player.
- Does **not** work on live streams. A live video cannot play faster than it is broadcast.
- It does not block ads. The ad still plays, only much faster.
- It does not collect anything about you and does not connect to the internet.
- Not made by or connected to YouTube or Google.

## Install (about 2 minutes)

This extension is not in the Chrome Web Store, so you add it by hand:

1. **Download** [youtube-skip.zip](https://github.com/vviseguy/youtube-skip/releases/latest/download/youtube-skip.zip).
2. **Unzip it.** Windows: right-click the file → **Extract All** → **Extract**. Mac: double-click it.
   Put the unzipped folder somewhere you will keep it, such as Documents. **If you delete or move this folder later, the extension stops working.**
3. **Open the extensions page.** Copy `chrome://extensions` into the address bar and press Enter. (In Edge, use `edge://extensions`.)
4. Turn on **Developer mode** (switch at the top right).
5. Click **Load unpacked** and choose the unzipped folder (the one that has `manifest.json` inside).
6. **Pin the button.** Click the puzzle-piece icon at the top right of Chrome, then the pin next to YouTube Skip. If you do not pin it, you cannot see the button.
7. **Refresh any YouTube tabs** that were already open, so ad sensing can start there.

**What the warnings mean:**
- Chrome says the extension can **"read and change your data on youtube.com"**. This lets it see when an ad plays and change the video speed. It does nothing on other sites until you click it.
- Chrome may show a note about **developer mode extensions** when it starts. That is normal for extensions added by hand. You can close it.

## How to use it

**On any video site:** click the button or press **Alt+S**. Each click skips about **14 seconds** of video. Click 2 times quickly to skip about 30 seconds.

**On YouTube ads:** choose how it acts in the settings. To open them, right-click the button and choose **Options**.

| Setting | What happens when an ad plays |
|---|---|
| **Indicator** (default) | The button shows **AD**. Clicks work as usual. |
| **Click to start** | One click speeds up the whole ad. Normal speed comes back when the ad ends. |
| **Automatic** | Every ad speeds up by itself and stops when the ad ends. Click the button to let that ad play normally. |

**What the button shows:**

| Button | Meaning |
|---|---|
| ▶\| | Ready |
| ▶ with **AD** | An ad is playing |
| ⏩ | Playing at 16x for a moment |
| ⏸ | Ad playing at 16x. Click to stop. |

## Updates

**It does not update by itself.** To get a new version:

1. Download the zip again from the button at the top.
2. Unzip it and replace the files in your old folder.
3. On `chrome://extensions`, click the circular arrow on YouTube Skip.

## Something is wrong?

- **I cannot see the button:** pin it (Install step 6).
- **Options is missing:** you have an old version. Update it (see Updates).
- **AD never shows on YouTube:** refresh the YouTube tab. If it still does not show, YouTube may have changed its site. Please [open an issue](https://github.com/vviseguy/youtube-skip/issues).
- **Alt+S does nothing:** another extension may use Alt+S. Open `chrome://extensions/shortcuts` and choose a different key.
- **Nothing happens on a live stream:** this is expected. Live video cannot be sped up.
- **Nothing happens on a site:** the site may not use a normal video player. The extension cannot speed up that video.

## For developers

The extension is plain JavaScript in [`extension/`](extension) with no build step. To release a new version:

1. Change `"version"` in `extension/manifest.json`, for example to `1.2.1`.
2. Commit, then tag and push:

   ```bash
   git tag v1.2.1 && git push origin main v1.2.1
   ```

The `release` workflow zips `extension/` and attaches `youtube-skip.zip` to a GitHub Release. It stops if the tag and the manifest version are different. Ad sensing uses the `ad-showing` class on YouTube's player element ([`ads.js`](extension/ads.js)).

## License

MIT
