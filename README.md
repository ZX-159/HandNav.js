# HandNav.js

Drop-in hand-tracking navigation for websites and web apps. HandNav turns a webcam into a gesture controller:

- **Point** with your index fingertip to move a virtual cursor.
- **Pinch** thumb + index finger to click.
- **Raise two fingers** and move vertically to scroll.
- **Swipe left/right** to trigger page, carousel, route, or history navigation.

HandNav is framework-agnostic JavaScript. Use it in plain HTML, React, Vue, Svelte, Next.js client components, dashboards, kiosks, presentations, galleries, and web apps.

> Camera permission is required. Processing runs in the browser through MediaPipe Tasks Vision; no video is intentionally sent to your server by this library.

---

## Why this implementation?

I researched the practical browser options and chose **MediaPipe Tasks Vision `HandLandmarker`** as the default engine.

### Options considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| MediaPipe Tasks Vision `HandLandmarker` | Modern MediaPipe web API, 21 hand landmarks, world landmarks, handedness, GPU delegate support, direct `detectForVideo()` API | Requires loading WASM + model | **Chosen**: best control for navigation gestures |
| MediaPipe Tasks Vision `GestureRecognizer` | Built-in canned gestures | Canned classes do not cover all navigation gestures such as robust pinch-scroll combinations | Good alternative for simple gesture labels |
| TensorFlow.js `@tensorflow-models/hand-pose-detection` | Flexible TFJS/MediaPipe runtimes | More dependencies and setup choices | Good, but heavier for a drop-in navigation lib |
| Legacy `@mediapipe/hands` Solution API | Mature and widely used | Older API surface; Tasks Vision is the current direction | Useful fallback, not default |

HandNav uses landmarks instead of only canned gestures because navigation needs continuous pointer coordinates, pinch distance, scroll deltas, and swipe velocity.

---

## Project structure

```text
handnav-js/
├─ src/
│  ├─ handnav.js          # Library source, ESM + window.HandNav global
│  └─ handnav.d.ts        # TypeScript declarations
├─ demo/
│  └─ index.html          # Full demo page
├─ examples/
├─ index.html           # Root redirect/landing page for hosted demo
├─ _headers             # Cloudflare Pages headers, including camera Permissions-Policy
├─ package.json
├─ wrangler.jsonc       # Cloudflare Workers Static Assets config
├─ CLOUDFLARE.md        # Cloudflare deployment guide
├─ LICENSE
└─ README.md
```

---

## Quick start: run it on your computer

### Option A: No installation, just Python

1. Download or copy this project folder to your computer.
2. Open a terminal in the project folder.
3. Run:

```bash
python3 -m http.server 8080
```

On Windows, if `python3` does not work, try:

```bash
py -m http.server 8080
```

4. Open this URL in Chrome, Edge, Firefox, or Safari:

```text
http://localhost:8080/demo/
```

5. Click **Start hand control** and allow camera permission.

### Option B: npm script

```bash
npm run serve
```

Then open:

```text
http://localhost:8080/demo/
```

Camera access requires `https://` or `localhost`. Opening `demo/index.html` by double-clicking it may not work because browsers restrict camera access on `file://` pages.

### 2. Use it as a wrapper in your app

HandNav is meant to be a small wrapper around camera setup, MediaPipe hand tracking, gesture recognition, and app actions. A developer should only need to create one controller, choose enabled gestures, and wire callbacks.

```html
<button id="startHandNav">Start hand navigation</button>
<button id="pauseHandNav">Pause</button>

<script type="module">
  import HandNav from './src/handnav.js';

  const handNav = new HandNav({
    // Production default: keep debug visuals off.
    showVideo: false,
    overlay: false,

    // Choose what gestures your app supports.
    enabledGestures: {
      pinchClick: true,
      twoFingerScroll: true,
      swipe: true,
      dwellClick: false,
      thumbsUp: true,
      openPalm: true,
      fist: false
    },

    // Map gestures to your app.
    onSwipeLeft: () => goToNextPage(),
    onSwipeRight: () => goToPreviousPage(),
    onThumbsUp: () => likeCurrentItem(),
    onOpenPalm: () => pauseExperience()
  });

  document.getElementById('startHandNav').addEventListener('click', () => handNav.start());
  document.getElementById('pauseHandNav').addEventListener('click', () => handNav.togglePause());

  function goToNextPage() { console.log('next'); }
  function goToPreviousPage() { console.log('previous'); }
  function likeCurrentItem() { console.log('liked'); }
  function pauseExperience() { console.log('paused'); }
</script>
```

You can also use the factory helper:

```js
import { createHandNav } from './src/handnav.js';

const handNav = createHandNav({ overlay: false, showVideo: false });
```

---

## CDN-style usage

You can host `src/handnav.js` yourself and import it from your domain:

```html
<script type="module">
  import HandNav from 'https://your-domain.com/handnav.js';

  const nav = new HandNav({ autoStart: false });
  await nav.start();
</script>
```

If you use a classic script workflow, the module also attaches `window.HandNav` after it loads, but module import is recommended.

---

## Hosting the library and demo on Cloudflare

This project is a static site: HTML, JS, CSS, and documentation. It can be hosted on **Cloudflare Pages** or **Cloudflare Workers Static Assets**.

### Recommended: Cloudflare Pages from Git

1. Push this folder to a GitHub/GitLab repository.
2. In Cloudflare Dashboard, go to **Workers & Pages** → **Create** → **Pages** → connect your repository.
3. Use these build settings:

```text
Framework preset: None
Build command:    leave blank
Build output:     .
Root directory:   /, unless this project is inside a subfolder
```

4. Deploy.
5. Open:

```text
https://your-project.pages.dev/demo/
```

Cloudflare Pages serves over HTTPS, so browser camera access works after the user grants permission.

### Deploy with Wrangler CLI

Install/login once:

```bash
npm install
npx wrangler login
```

Deploy to Cloudflare Pages:

```bash
npm run deploy:pages
```

Or deploy as a Worker with static assets using the included `wrangler.jsonc`:

```bash
npm run deploy:cloudflare
```

The included `wrangler.jsonc` points Cloudflare at the current folder as static assets:

```jsonc
{
  "name": "handnav-js-demo",
  "compatibility_date": "2026-06-19",
  "assets": {
    "directory": ".",
    "html_handling": "auto-trailing-slash"
  }
}
```

### If the camera prompt does not appear after deployment

Check these first:

1. Open the real deployed URL, for example `https://your-project.pages.dev/demo/`. Do not test inside an embedded dashboard preview or another iframe.
2. Confirm the URL is `https://`, not `http://` and not `file://`.
3. Click the browser site-controls icon near the address bar and allow camera permission for the site.
4. Open DevTools Console and look for the demo diagnostic message.
5. Make sure `_headers` was deployed. It includes:

```text
/*
  Permissions-Policy: camera=(self), microphone=()
```

The demo now shows a browser support diagnostic panel and a clearer error if camera startup fails.

### Production implementation recommendation

For a real app, you usually host only:

```text
src/handnav.js
src/handnav.d.ts, optional
```

Then import it from your app:

```js
import HandNav from '/src/handnav.js';
```

For npm packaging later, publish the package and import:

```js
import HandNav from 'handnav-js';
```

---

## Gestures

| Gesture | Detection | Default behavior / event |
|---|---|---|
| Point | Index fingertip landmark | Moves virtual cursor; emits `gesture` with `name: 'point'` |
| Pinch | Thumb tip near index tip | Optional click/drag-style pointer events; emits `pinchstart`, `pinchend`, `click` |
| Dwell click | Pointer remains steady for a duration | Optional click without pinching; emits `dwellstart`, `dwellprogress`, `dwellclick` |
| Two-finger / Peace | Index + middle extended, ring + pinky folded | Optional scroll; emits `peace`, `peacehold`, `peacestart` |
| Swipe left/right | Wrist movement over a short time window | Calls `onSwipeLeft` / `onSwipeRight`; emits `swipeleft`, `swiperight` |
| Thumbs up | Thumb vertical up, other fingers folded | Calls `onThumbsUp`; emits `thumbsUp` and `thumbsup` |
| Thumbs down | Thumb vertical down, other fingers folded | Calls `onThumbsDown`; emits `thumbsDown` and `thumbsdown` |
| Open palm | Four fingers extended | Calls `onOpenPalm`; emits `openPalm` and `openpalm` |
| Fist | Fingers folded | Calls `onFist`; emits `fist` |

---

## API

### Constructor

```js
const nav = new HandNav(options);
```

### Methods

```js
await nav.start();              // request camera, load model, start tracking
nav.pause();                    // pause detection; keeps camera/model ready
nav.resume();                   // resume detection after pause
nav.togglePause();              // pause if running, resume if paused
nav.stop();                     // stop camera and remove UI overlay
nav.destroy();                  // stop and release listeners/model

nav.setOverlayVisible(true);    // show/hide hand landmark canvas overlay
nav.toggleOverlay();            // toggle the hand tracking overlay
nav.setVideoVisible(true);      // show/hide small webcam preview frame
nav.toggleVideo();              // toggle webcam preview frame
nav.setOptions({ overlay: false, showVideo: true });

nav.on(type, fn);               // subscribe to events; returns unsubscribe function
nav.off(type, fn);              // remove listener
```

### Common options

```js
const nav = new HandNav({
  // MediaPipe assets
  tasksVisionUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest',
  wasmPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
  modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  delegate: 'GPU',

  // Camera
  camera: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 60 }
  },
  mirror: true,
  showVideo: false,
  videoPreview: {
    width: 180,
    height: 135,
    right: 12,
    bottom: 12,
    opacity: 0.85,
    borderRadius: 14
  },

  // UI
  overlay: true,
  pointerElement: true,
  pointerSize: 26,
  smoothing: 0.35,

  // Noise filtering / false-positive reduction
  handConfidenceThreshold: 0.45,
  minHandSizePx: 42,

  // Click
  click: true,
  pinchThreshold: 0.35,
  pinchReleaseThreshold: 0.48,
  clickMaxTravelPx: 28,

  // Scroll
  scroll: true,
  scrollMode: 'twoFinger',
  scrollAnchor: 'wrist',      // more stable than fingertip scrolling
  scrollControl: 'velocity',  // stable page scrolling; 'drag' is also available
  scrollSpeed: 1.25,
  scrollDeadzonePx: 1.2,
  scrollActivationDeadzonePx: 16,
  scrollVelocityScale: 0.32,
  scrollSmoothing: 0.26,
  scrollMaxStepPx: 68,

  // Swipe
  swipe: true,
  swipeThresholdPx: 160,
  swipeWindowMs: 520,
  swipeCooldownMs: 900,
  onSwipeLeft: () => {},
  onSwipeRight: () => {},

  // Additional gestures and app-level actions
  dwellClick: false,
  dwellTimeMs: 950,
  dwellRadiusPx: 24,
  gestureHoldDurationMs: 700,
  gestureActionCooldownMs: 1200,
  onThumbsUp: () => {},
  onThumbsDown: () => {},
  onPeace: () => {},
  onOpenPalm: () => {},
  onFist: () => {},

  // Developer-level gesture toggles
  enabledGestures: {
    pinchClick: true,
    twoFingerScroll: true,
    swipe: true,
    dwellClick: false,
    thumbsUp: true,
    thumbsDown: true,
    peace: true,
    openPalm: true,
    fist: true
  }
});
```

---

## Events

```js
nav.on('status', (e) => console.log(e.detail.state));
nav.on('hand', (e) => console.log(e.detail.hand));
nav.on('gesture', (e) => console.log(e.detail.name, e.detail.pointer));
nav.on('hover', (e) => console.log(e.detail.element));
nav.on('pinchstart', (e) => {});
nav.on('pinchend', (e) => {});
nav.on('click', (e) => console.log('clicked', e.detail.element));
nav.on('scroll', (e) => console.log(e.detail.amount));
nav.on('swipeleft', () => {});
nav.on('swiperight', () => {});
nav.on('thumbsUp', () => {});
nav.on('thumbsDown', () => {});
nav.on('peace', () => {});
nav.on('openPalm', () => {});
nav.on('fist', () => {});
nav.on('dwellprogress', (e) => console.log(e.detail.progress));
nav.on('dwellclick', (e) => console.log('dwell clicked', e.detail.element));
nav.on('lost', () => console.log('No hand detected'));
nav.on('error', (e) => console.error(e.detail));

// Listen to everything
nav.on('*', (e) => console.log(e.type, e.detail));
```

Event callback shape:

```js
{
  type: 'gesture',
  detail: { /* event-specific data */ },
  target: nav,
  timeStamp: performance.now()
}
```

---

## Scrolling stability

Two-finger scrolling uses a wrist-based velocity controller by default. This is more stable for full-page scrolling because fingertip landmarks jitter more and document scrolling changes the content under the cursor.

```js
const nav = new HandNav({
  scrollAnchor: 'wrist',        // 'wrist', 'indexTip', or 'middleMcp'
  scrollControl: 'velocity',    // recommended for pages
  scrollSpeed: 1.25,
  scrollActivationDeadzonePx: 16,
  scrollVelocityScale: 0.32,
  scrollSmoothing: 0.26,
  scrollMaxStepPx: 68
});
```

If you want old-style drag scrolling for a small custom container:

```js
const nav = new HandNav({
  scrollControl: 'drag',
  scrollSpeed: 1.4,
  scrollDeadzonePx: 2
});
```

Avoid CSS that transforms large layout containers on `.handnav-hover`; transforms on hovered sections can make the page appear to shake while hand scrolling. Use `outline` or `box-shadow` instead. HandNav also disables hand hover while two-finger scrolling is active.

## Reducing background noise and false positives

HandNav cannot remove camera background pixels like a full segmentation model, but it now filters tracking results before they become app gestures:

- keeps only hands above `handConfidenceThreshold`
- ignores tiny distant hands with `minHandSizePx`
- uses only the largest confident hand by default
- smooths pointer and scroll input
- suppresses peace-sign app actions while the same gesture is being used for scrolling

Recommended noisy-room setup:

```js
const nav = new HandNav({
  numHands: 1,
  handConfidenceThreshold: 0.55,
  minHandSizePx: 58,
  smoothing: 0.28,
  scrollAnchor: 'wrist',
  scrollControl: 'velocity',
  suppressPeaceActionDuringScroll: true
});
```

If tracking does not start because your hand is far from the camera, lower `minHandSizePx` back toward `42`.

## Choosing which gestures your app supports

Disable gestures globally at initialization:

```js
const nav = new HandNav({
  dwellClick: true,
  enabledGestures: {
    pinchClick: true,
    dwellClick: true,
    twoFingerScroll: false,
    swipe: true,
    thumbsUp: true,
    thumbsDown: false,
    peace: true,
    openPalm: true,
    fist: false
  }
});
```

Change enabled gestures at runtime, for example from a developer settings panel:

```js
nav.setOptions({
  enabledGestures: {
    ...nav.options.enabledGestures,
    dwellClick: true,
    fist: false
  },
  dwellClick: true
});
```

Map held gestures to app actions:

```js
const nav = new HandNav({
  onThumbsUp: () => likeCurrentItem(),
  onThumbsDown: () => dislikeCurrentItem(),
  onPeace: () => openCommandPalette(),
  onOpenPalm: () => pausePresentation(),
  onFist: () => closeModal()
});
```

Or use events:

```js
nav.on('thumbsUp', () => likeCurrentItem());
nav.on('openPalm', () => pausePresentation());
```

## Implementing page navigation

### History navigation

```js
const nav = new HandNav({
  onSwipeLeft: () => history.forward(),
  onSwipeRight: () => history.back()
});
```

### Carousel navigation

```js
const nav = new HandNav({
  onSwipeLeft: () => carousel.next(),
  onSwipeRight: () => carousel.previous()
});
```

### SPA route navigation

```js
const routes = ['/home', '/products', '/contact'];
let index = 0;

const nav = new HandNav({
  onSwipeLeft: () => {
    index = Math.min(routes.length - 1, index + 1);
    router.push(routes[index]);
  },
  onSwipeRight: () => {
    index = Math.max(0, index - 1);
    router.push(routes[index]);
  }
});
```

---

## React example

```jsx
import { useEffect, useRef } from 'react';
import HandNav from './handnav.js';

export default function HandNavButton() {
  const navRef = useRef(null);

  useEffect(() => {
    navRef.current = new HandNav({
      onSwipeLeft: () => console.log('next'),
      onSwipeRight: () => console.log('previous')
    });
    return () => navRef.current?.destroy();
  }, []);

  return (
    <button onClick={() => navRef.current.start()}>
      Start hand navigation
    </button>
  );
}
```

For Next.js, use this only in a client component (`'use client'`) because it depends on `window`, `document`, and camera APIs.

---

## Pause, webcam preview, and overlay controls

Pause is different from stop:

- `pause()` stops hand detection and interaction events but keeps the camera/model ready.
- `resume()` restarts detection quickly.
- `stop()` turns off the camera tracks and removes the UI elements.

```js
const nav = new HandNav({ showVideo: true, overlay: true });

await nav.start();
nav.pause();
nav.resume();
nav.togglePause();
```

Developers can show or hide the small camera preview frame and the hand landmark overlay at runtime:

```js
nav.setVideoVisible(true);      // show small webcam frame
nav.setVideoVisible(false);     // hide webcam frame
nav.toggleVideo();

nav.setOverlayVisible(true);    // draw hand landmarks/connections
nav.setOverlayVisible(false);   // hide tracking overlay
nav.toggleOverlay();
```

Configure the preview frame size and position:

```js
const nav = new HandNav({
  showVideo: true,
  videoPreview: {
    width: 220,
    height: 165,
    right: 16,
    bottom: 16,
    opacity: 0.9,
    borderRadius: 18
  }
});
```

For production, you can disable both visual debugging aids while keeping gestures active:

```js
const nav = new HandNav({ overlay: false, showVideo: false });
```

## Styling hover/pressed states

HandNav adds classes to hovered/pressed elements:

```css
.handnav-hover {
  outline: 3px solid #3a86ff;
}

.handnav-pressed {
  transform: scale(0.98);
}
```

The cursor overlay is created automatically. Disable it if you want your own UI:

```js
const nav = new HandNav({ pointerElement: false, overlay: false });
nav.on('gesture', (e) => renderMyCursor(e.detail.pointer));
```

---

## Privacy and security notes

- Browsers require user permission for camera access.
- Camera access generally requires `https://` or `localhost`.
- This library does not upload video frames.
- MediaPipe WASM/model files are loaded from Google/jsDelivr by default. For stricter privacy or offline deployments, self-host these assets and set `tasksVisionUrl`, `wasmPath`, and `modelAssetPath`.

Example self-hosted configuration:

```js
const nav = new HandNav({
  tasksVisionUrl: '/vendor/mediapipe/tasks-vision.js',
  wasmPath: '/vendor/mediapipe/wasm',
  modelAssetPath: '/models/hand_landmarker.task'
});
```

---

## Performance tips

- Keep `numHands: 1` for navigation.
- Use `delegate: 'GPU'` when available; the library can be changed to `'CPU'` if needed.
- Lower camera resolution if your page is heavy.
- Disable `overlay` drawing in production if you only need gestures.

```js
const nav = new HandNav({
  overlay: false,
  camera: { width: { ideal: 480 }, height: { ideal: 360 } }
});
```

---

## Limitations

- Good lighting improves detection.
- Very busy backgrounds may reduce tracking quality.
- Synthetic click events work for normal web elements, but some browser/security-sensitive controls may require real user input.
- Gesture thresholds may need tuning for specific cameras, distances, or accessibility needs.

---

## Development

Run syntax check:

```bash
npm run check
```

Serve demo:

```bash
npm run serve
```

Then open `http://localhost:8080/demo/`.

---

## License

MIT
