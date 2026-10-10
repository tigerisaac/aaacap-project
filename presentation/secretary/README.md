# Shield secretary scenes

Six animated scenes showing Shield as a call secretary. `out/secretary-scenes.pptx` holds them as native slides with Google Slides' own animations. There's no video, so nothing loads or stutters when a slide comes up.

| Slide | What happens | Clicks |
|---|---|---|
| 1 | The secretary, a caller and your phone appear (plays by itself). | 0 |
| 2 | Mom is in your contacts, so her call arcs past the secretary and rings you. The secretary takes off her headset ("Not listening"). | 2 |
| 3 | An unknown number reaches the secretary first. She asks who's calling and why. The caller only says "the tax office", so she asks a follow-up: "What is the call about?" A note card fills in what the caller has said. | 3 |
| 4 | The caller answers by demanding gift cards. The answer is flagged, the secretary raises a hand, the line is cut and your phone never rings. | 1 |
| 5 | A second caller gives a reason but no name, so the secretary asks "Who's calling, please?" Once both answers are in, she offers the call to your phone, and you press 1 to connect. | 6 |
| 6 | After you connect, the secretary keeps listening. When the caller asks for a texted code, she ends the call and warns you. | 2 |

Scenes 3–5 show screening as a conversation. Shield asks at most two short follow-up questions, and only about what's still missing (see `docs/SCREENING.md`).

## Add the slides to your deck

1. Open your deck in Google Slides and click the slide the scenes should follow.
2. Choose **File → Import slides → Upload**, then pick `out/secretary-scenes.pptx`.
3. Click **Select all**, then **Import slides**.
4. Open **Insert → Animation** on slide 2 of the scenes. The panel should list Fade-in animations. If it's empty, the import dropped them; see below.

Present as usual. Each click plays the next beat. Some beats chain on by themselves (After previous), so one click can play a short sequence. The speaker notes on each slide list what every click does.

**If the animations didn't come across:** upload the .pptx to Google Drive and open it with Google Slides. That converts the whole file at once. Then copy the six slides and paste them into your deck. Copied slides keep their animations.

## How it's built

Each slide is a full-slide picture of the scene's starting frame. On top of it sit cropped pictures of whatever changes at each beat, each with a Fade-in animation. Each slide starts on the exact frame where the previous one ends, so moving between slides shows no jump.

```bash
npm install
npm run slides            # rebuilds out/secretary-scenes.pptx from index.html
```

The beats and their click/auto timing are listed in `SCENES` at the top of `build-slides.mjs`. All the wording and artwork are in `index.html`. Building needs Google Chrome.

## Present from the browser instead

`index.html` plays the full animation, including the moving call signals and typing, live in Chrome. It works offline.

- **→ / Space / click:** play the next scene.
- **←:** go back one scene.
- **R:** replay the current scene.
- **1–6:** jump to a scene.
- **F:** full screen.

## Videos

`npm run render` writes the same scenes as 1080p, 60 fps videos, `out/01-…mp4` to `out/06-…mp4`, plus `00-all-scenes-preview.mp4` with all of them in one file. They aren't committed. They're useful for sharing a preview. In Google Slides, Drive videos can stutter as they start, so the native slides above are the better way to present.

```bash
npm run render                   # all clips
npm run render -- 4              # only scene 4
npm run render -- --snap 4:3.5   # one still frame (scene 4 at 3.5 s)
```

Rendering needs Google Chrome and `ffmpeg`. The lines the secretary speaks match the real recordings in `backend/src/cloud/announcement-audio/`.
