# Peaks Altitude OS — CANONICAL REPO [Static | Expedition Strategy Game]

Ambient expedition strategy prototype and first playable build.

## Core Loop

1. Prepare the expedition without a clock.
2. Launch the climb.
3. Expedition time runs at `1 real minute = 1 climbing hour`.
4. The Mountain Master pauses the climb when the team hits an obstacle.
5. Choose a response, review the modifiers, roll the check, then resume.
6. Summit results score speed, losses, oxygen strategy, budget, and risk.

## Local Preview

Serve this folder with any static web server and open `index.html`.

```sh
python3 -m http.server 5174
```

Then open `http://localhost:5174`.

The browser notification button enables Mountain Master alerts while the app is open or running in a background tab.
