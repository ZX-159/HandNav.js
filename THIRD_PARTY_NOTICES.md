# Third-party notices

HandNav.js is MIT licensed, but it is designed to use Google MediaPipe Tasks Vision at runtime.

## Google MediaPipe

- Project: MediaPipe
- Repository: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0
- Copyright: The MediaPipe Authors / Google

This repository does not vendor MediaPipe source code by default. The demo and default configuration load MediaPipe Tasks Vision and the hand landmarker model from Google/jsDelivr-hosted URLs at runtime:

```js
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

If you self-host or redistribute MediaPipe package files, WASM files, model files, or source code, keep the applicable Apache 2.0 license and notices with those redistributed files.

## Documentation and code samples

Google's MediaPipe documentation pages state that documentation content is licensed under Creative Commons Attribution 4.0 and code samples under Apache License 2.0 unless otherwise noted. HandNav.js is an independent wrapper library and is not endorsed by Google.
