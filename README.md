# YouTube Skip

A tiny Chrome extension. Click its toolbar button and the video on the page plays at **16x speed** for a short time, then goes back to its old speed. Use it to get through an ad fast.

- One click: 16x for about 0.9 seconds, which is about 14 seconds of video.
- Click again while it runs to add more time. Two quick clicks are about 30 seconds of video.

It runs only when you click it. It does not block ads, read your data, or use the network.

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
