# YouTube Skip

A tiny Chrome extension. Click its toolbar button (or press **Alt+S**) and the video on the page plays at **16x speed** for a short time, then goes back to its old speed. Use it to get through an ad fast.

- One click: 16x for 0.9 seconds, which is about 14 seconds of video.
- Each extra click while it runs adds the same 0.9 seconds. Two quick clicks are about 30 seconds of video.
- If the page has more than one video, it uses the one that is playing.
- To change the shortcut, open `chrome://extensions/shortcuts`.

## YouTube ads

On YouTube, the extension can tell when an ad is playing (the player shows the `ad-showing` class). Choose a mode in the extension's **Options** (right-click the icon):

| Mode | During an ad |
|---|---|
| **Indicator** (default) | The icon shows **AD**. Clicks do the normal 16x step. |
| **Click to start** | One click plays 16x until the ad ends. |
| **Automatic** | 16x starts when an ad starts and stops when it ends. Click to stop it for that ad. |

The icon shows the state: ▶| ready, ▶ + AD an ad is playing, ⏩ 16x step running, ⏸ ad at 16x (click to stop). Outside ads and on other sites, each click is the normal 16x step.

On YouTube it reads the page to see ads. On other sites it runs only when you click it or press the shortcut. It does not block ads, collect data, or use the network.

## Install

1. Download **[youtube-skip.zip](https://github.com/vviseguy/youtube-skip/releases/latest/download/youtube-skip.zip)** (the newest release).
2. Extract the zip to a folder you will keep.
3. Open `chrome://extensions` and turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted folder.
5. Optional: pin the extension so the button is always in the toolbar.

To update, download the new zip, replace the folder contents, and click the reload icon on the extension card.

## Release a new version

1. Change `"version"` in `extension/manifest.json`, for example to `1.0.2`.
2. Commit, then tag and push:

   ```bash
   git tag v1.0.2 && git push origin main v1.0.2
   ```

The `release` workflow zips `extension/` and attaches `youtube-skip.zip` to a GitHub Release. It stops if the tag and the manifest version are different.

## License

MIT
