/*
 * HandNav.js - Drop-in hand tracking navigation for websites and web apps.
 * Uses MediaPipe Tasks Vision HandLandmarker in the browser.
 *
 * Public API:
 *   const nav = new HandNav(options)
 *   await nav.start()
 *   nav.pause()
 *   nav.resume()
 *   nav.stop()
 *   nav.setOverlayVisible(true)
 *   nav.setVideoVisible(true)
 *   nav.on('gesture', handler)
 */

const DEFAULTS = {
  tasksVisionUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest",
  wasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  delegate: "GPU",
  numHands: 1,
  video: null,
  overlay: true,
  overlayContainer: null,
  showVideo: false,
  videoPreview: {
    width: 180,
    height: 135,
    right: 12,
    bottom: 12,
    opacity: 0.85,
    borderRadius: 14
  },
  mirror: true,
  camera: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 60 }
  },
  performanceMode: "auto", // "auto", "performance", "balanced", or "quality"
  advancedStabilization: "auto", // "auto", true, or false
  landmarkSmoothing: 0.42,
  cursorFilter: "adaptive", // "adaptive" or "lerp"
  predictiveTracking: true,
  trackingLossPredictionMs: 160,
  smoothing: 0.35,
  handConfidenceThreshold: 0.45,
  minHandSizePx: 42,
  minHandDetectionConfidence: 0.58,
  minHandPresenceConfidence: 0.58,
  minTrackingConfidence: 0.55,
  pointer: true,
  pointerElement: true,
  pointerSize: 26,
  pointerZIndex: 2147483647,
  click: true,
  drag: true,
  pinchThreshold: 0.35,
  pinchReleaseThreshold: 0.48,
  pinchConfirmMs: 35,
  longPinchMs: 650,
  doublePinchMs: 360,
  dragStartThresholdPx: 16,
  dragOnLongPinch: false,
  pointerDownOnPinch: false,
  clickMaxTravelPx: 28,
  hoverClass: "handnav-hover",
  pressedClass: "handnav-pressed",
  scroll: true,
  scrollMode: "twoFinger", // "twoFinger" or false
  scrollAnchor: "wrist", // "wrist", "indexTip", or "middleMcp"
  scrollControl: "velocity", // "velocity" or "drag"
  scrollSpeed: 1.25,
  scrollDeadzonePx: 1.2,
  scrollActivationDeadzonePx: 16,
  scrollVelocityScale: 0.32,
  scrollSmoothing: 0.26,
  scrollMaxStepPx: 68,
  swipe: true,
  swipeThresholdPx: 160,
  swipeVelocityThresholdPxS: 650,
  swipeMaxVerticalPx: 120,
  swipeWindowMs: 520,
  swipeCooldownMs: 900,
  onSwipeLeft: null,
  onSwipeRight: null,
  onThumbsUp: null,
  onThumbsDown: null,
  onPeace: null,
  onOpenPalm: null,
  onFist: null,
  gestureHoldDurationMs: 700,
  gestureActionCooldownMs: 1200,
  suppressPeaceActionDuringScroll: true,
  dwellClick: false,
  dwellTimeMs: 950,
  dwellRadiusPx: 24,
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
  },
  calibration: null,
  calibrationStorageKey: "handnav:calibration",
  calibrationStageMinMs: 1500,
  calibrationMoveMinMs: 2200,
  notifications: true,
  notificationAfterMs: 700,
  noHandIgnoreAfterMs: 2600,
  notificationPosition: "bottom-center", // "bottom-center", "bottom-right", "top-center"
  autoStart: false,
  debug: false
};

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

const LANDMARK = Object.freeze({
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
});

function deepMerge(base, patch = {}) {
  const out = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    const isElement = typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
    if (value && typeof value === "object" && !Array.isArray(value) && !isElement) {
      out[key] = deepMerge(base[key] || {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.hypot(dx, dy, dz);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function isInputLike(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export class HandNav {
  constructor(options = {}) {
    this.options = deepMerge(DEFAULTS, options);
    this.applyPerformanceProfile(options);
    this.state = "idle";
    this.video = this.options.video || document.createElement("video");
    this.stream = null;
    this.handLandmarker = null;
    this.raf = 0;
    this.listeners = new Map();
    this.pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, rawX: 0, rawY: 0 };
    this.lastHovered = null;
    this.pinchDown = false;
    this.pinchStart = null;
    this.pinchMachine = { state: "idle" };
    this.lastClickAt = 0;
    this.lastScrollY = null;
    this.scrollSession = null;
    this.history = [];
    this.lastSwipeAt = 0;
    this.lastVideoTime = -1;
    this.createdVideo = !this.options.video;
    this.resizeHandler = null;
    this.dwell = null;
    this.gestureHolds = new Map();
    this.lastGestureActions = new Map();
    this.lastDetectionMeta = { rawCount: 0 };
    this.lastHandSeenAt = 0;
    this.lostSince = null;
    this.notificationTimer = 0;
    this.stabilizedLandmarks = null;
    this.pointerFilter = { initialized: false, x: this.pointer.x, y: this.pointer.y, vx: 0, vy: 0, lastAt: performance.now() };
    this.calibrationSession = null;
    this.calibration = this.options.calibration || this.loadCalibration();
    if (this.calibration) this.applyCalibration(this.calibration, { silent: true });

    this.root = null;
    this.cursorEl = null;
    this.canvas = null;
    this.ctx = null;
    this.noticeEl = null;

    if (this.options.autoStart) {
      queueMicrotask(() => this.start().catch((err) => this.emit("error", err)));
    }
  }

  applyPerformanceProfile(userOptions = {}) {
    const mode = this.options.performanceMode;
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4;
    const highPower = cores >= 8 && memory >= 4;
    const lowPower = cores <= 4 || memory <= 2;
    const effectiveMode = mode === "auto" ? (highPower ? "quality" : lowPower ? "performance" : "balanced") : mode;

    if (effectiveMode === "quality") {
      if (userOptions.advancedStabilization === undefined) this.options.advancedStabilization = true;
      if (userOptions.handConfidenceThreshold === undefined) this.options.handConfidenceThreshold = 0.5;
      if (userOptions.minHandDetectionConfidence === undefined) this.options.minHandDetectionConfidence = 0.62;
      if (userOptions.minHandPresenceConfidence === undefined) this.options.minHandPresenceConfidence = 0.62;
      if (userOptions.minTrackingConfidence === undefined) this.options.minTrackingConfidence = 0.58;
    }
    if (effectiveMode === "performance") {
      if (userOptions.advancedStabilization === undefined) this.options.advancedStabilization = false;
      if (userOptions.camera === undefined) {
        this.options.camera = deepMerge(this.options.camera, { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } });
      }
    }
    this.options.effectivePerformanceMode = effectiveMode;
  }

  async start() {
    if (this.state === "paused") return this.resume();
    if (this.state === "running" || this.state === "starting") return this;
    this.state = "starting";
    this.emit("status", { state: this.state });

    try {
      this.ensureUi();
      await this.setupCamera();
      await this.setupModel();

      this.state = "running";
      this.emit("status", { state: this.state });
      this.loop();
      return this;
    } catch (err) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.state = "idle";
      this.resetInteractionState();
      this.emit("status", { state: this.state, error: err });
      this.emit("error", this.normalizeError(err));
      throw err;
    }
  }

  pause() {
    if (this.state !== "running") return this;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.state = "paused";
    this.resetInteractionState();
    this.setCursorVisible(false);
    this.clearCanvas();
    this.emit("status", { state: this.state });
    this.emit("pause", {});
    return this;
  }

  resume() {
    if (this.state !== "paused") return this;
    this.state = "running";
    this.lastVideoTime = -1;
    this.emit("status", { state: this.state });
    this.emit("resume", {});
    this.loop();
    return this;
  }

  togglePause(force) {
    const shouldPause = typeof force === "boolean" ? force : this.state === "running";
    return shouldPause ? this.pause() : this.resume();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.state = "stopped";
    this.resetInteractionState();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
    if (this.createdVideo && this.video.parentNode) this.video.remove();
    if (this.root && this.root.parentNode) this.root.remove();
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    this.root = null;
    this.canvas = null;
    this.ctx = null;
    this.cursorEl = null;
    this.noticeEl = null;
    this.emit("status", { state: this.state });
  }

  destroy() {
    this.stop();
    this.listeners.clear();
    if (this.handLandmarker && typeof this.handLandmarker.close === "function") {
      this.handLandmarker.close();
    }
  }

  setOptions(options = {}) {
    this.options = deepMerge(this.options, options);
    if ("overlay" in options) this.setOverlayVisible(!!options.overlay);
    if ("showVideo" in options) this.setVideoVisible(!!options.showVideo);
    if (options.videoPreview) this.applyVideoStyle();
    if (options.calibration) this.applyCalibration(options.calibration, { silent: true });
    this.emit("options", { options: this.options });
    return this;
  }

  setOverlayVisible(visible) {
    this.options.overlay = !!visible;
    if (visible) {
      this.ensureUi();
      this.ensureCanvas();
      if (this.canvas) this.canvas.style.display = "block";
    } else {
      this.clearCanvas();
      if (this.canvas) this.canvas.style.display = "none";
    }
    this.emit("overlay", { visible: !!visible });
    return this;
  }

  toggleOverlay(force) {
    const visible = typeof force === "boolean" ? force : !this.options.overlay;
    return this.setOverlayVisible(visible);
  }

  setVideoVisible(visible) {
    this.options.showVideo = !!visible;
    this.ensureUi();
    this.applyVideoStyle();
    this.emit("video", { visible: !!visible });
    return this;
  }

  toggleVideo(force) {
    const visible = typeof force === "boolean" ? force : !this.options.showVideo;
    return this.setVideoVisible(visible);
  }

  setMirror(mirror) {
    this.options.mirror = !!mirror;
    this.applyVideoStyle();
    this.clearCanvas();
    this.emit("mirror", { mirror: this.options.mirror });
    return this;
  }

  toggleMirror(force) {
    const mirror = typeof force === "boolean" ? force : !this.options.mirror;
    return this.setMirror(mirror);
  }

  resetInteractionState() {
    this.releasePinchDueToLoss();
    this.pinchDown = false;
    this.pinchStart = null;
    this.pinchMachine = { state: "idle" };
    this.lastClickAt = 0;
    this.lastScrollY = null;
    this.scrollSession = null;
    this.history = [];
    this.dwell = null;
    this.stabilizedLandmarks = null;
    this.pointerFilter = { initialized: false, x: this.pointer.x, y: this.pointer.y, vx: 0, vy: 0, lastAt: performance.now() };
    this.gestureHolds.clear();
    this.lastHovered?.classList?.remove(this.options.hoverClass);
    this.lastHovered = null;
    this.cursorEl?.classList.remove(this.options.pressedClass);
    this.styleCursorPressed(false);
  }

  loadCalibration() {
    try {
      if (!this.options.calibrationStorageKey || typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(this.options.calibrationStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveCalibration(calibration = this.calibration) {
    if (!calibration) return this;
    try {
      if (this.options.calibrationStorageKey && typeof localStorage !== "undefined") {
        localStorage.setItem(this.options.calibrationStorageKey, JSON.stringify(calibration));
      }
    } catch {}
    return this;
  }

  resetCalibration() {
    this.calibration = null;
    this.calibrationSession = null;
    try {
      if (this.options.calibrationStorageKey && typeof localStorage !== "undefined") localStorage.removeItem(this.options.calibrationStorageKey);
    } catch {}
    this.emit("calibration", { state: "reset" });
    return this;
  }

  applyCalibration(calibration, { silent = false } = {}) {
    if (!calibration) return this;
    this.calibration = calibration;
    const patch = {};
    if (Number.isFinite(calibration.pinchThreshold)) patch.pinchThreshold = calibration.pinchThreshold;
    if (Number.isFinite(calibration.pinchReleaseThreshold)) patch.pinchReleaseThreshold = calibration.pinchReleaseThreshold;
    if (Number.isFinite(calibration.minHandSizePx)) patch.minHandSizePx = calibration.minHandSizePx;
    this.options = deepMerge(this.options, patch);
    if (!silent) this.emit("calibration", { state: "applied", calibration });
    return this;
  }

  startCalibration({ save = true } = {}) {
    const stages = this.getCalibrationStages();
    this.calibrationSession = {
      save,
      stages,
      stageIndex: 0,
      stage: stages[0].id,
      stageStartedAt: performance.now(),
      samples: {},
      palmSamples: [],
      pinchSamples: [],
      moveSamples: []
    };
    this.notify(stages[0].message, "info");
    this.emit("calibration", { state: "started", stage: stages[0].id, stageInfo: stages[0], stageIndex: 0, totalStages: stages.length });
    return this;
  }

  getCalibrationStages() {
    return [
      { id: "openPalmCenter", kind: "openPalm", label: "Open palm", angle: "center", message: "Calibration: open palm, centered" },
      { id: "openPalmLeft", kind: "openPalm", label: "Palm left side", angle: "left", message: "Calibration: open palm on the left side" },
      { id: "openPalmRight", kind: "openPalm", label: "Palm right side", angle: "right", message: "Calibration: open palm on the right side" },
      { id: "pinchCenter", kind: "pinch", label: "Pinch", angle: "center", message: "Calibration: pinch thumb and index" },
      { id: "pinchLeft", kind: "pinch", label: "Pinch left side", angle: "left", message: "Calibration: pinch on the left side" },
      { id: "pinchRight", kind: "pinch", label: "Pinch right side", angle: "right", message: "Calibration: pinch on the right side" },
      { id: "moveRange", kind: "move", label: "Movement range", angle: "move", message: "Calibration: move your hand left and right" }
    ];
  }

  calibrationStageMatches(stage, gesture, wrist) {
    const normalizedX = wrist.x / Math.max(1, window.innerWidth);
    const inZone = stage.angle === "left"
      ? normalizedX < 0.43
      : stage.angle === "right"
        ? normalizedX > 0.57
        : normalizedX >= 0.32 && normalizedX <= 0.68;
    if (stage.kind === "openPalm") return gesture.openPalm && inZone;
    if (stage.kind === "pinch") return (gesture.pinching || gesture.pinchRatio < this.options.pinchReleaseThreshold) && inZone;
    if (stage.kind === "move") return true;
    return false;
  }

  stopCalibration() {
    this.calibrationSession = null;
    this.hideNotice();
    this.emit("calibration", { state: "stopped" });
    return this;
  }

  getCalibration() {
    return this.calibration;
  }

  updateCalibration(gesture, landmarks) {
    const session = this.calibrationSession;
    if (!session) return;
    const now = performance.now();
    const stage = session.stages[session.stageIndex];
    const palmWidthPx = this.handSizePx(landmarks);
    const wrist = this.toScreen(landmarks[LANDMARK.WRIST]);
    const stageAge = now - session.stageStartedAt;
    const samples = session.samples[stage.id] ||= [];

    let accepted = this.calibrationStageMatches(stage, gesture, wrist);
    if (stage.kind === "openPalm") {
      if (accepted) {
        samples.push({ palmWidthPx, x: wrist.x, t: now });
        session.palmSamples.push(palmWidthPx);
      }
    } else if (stage.kind === "pinch") {
      if (accepted) {
        samples.push({ pinchRatio: gesture.pinchRatio, palmWidthPx, x: wrist.x, t: now });
        session.pinchSamples.push(gesture.pinchRatio);
      }
    } else if (stage.kind === "move") {
      samples.push({ x: wrist.x, t: now });
      session.moveSamples.push(wrist.x);
    }

    let progress;
    if (stage.kind === "move") {
      const range = session.moveSamples.length ? Math.max(...session.moveSamples) - Math.min(...session.moveSamples) : 0;
      progress = clamp(range / (window.innerWidth * 0.30), 0, 1);
    } else {
      const sampleProgress = samples.length / 28;
      const timeProgress = accepted ? stageAge / this.options.calibrationStageMinMs : 0;
      progress = clamp(Math.min(sampleProgress, timeProgress), 0, 1);
    }

    this.notify(stage.message, "info");
    this.emit("calibration", {
      state: "progress",
      stage: stage.id,
      stageInfo: stage,
      stageIndex: session.stageIndex,
      totalStages: session.stages.length,
      progress,
      accepted
    });

    const done = stage.kind === "move"
      ? session.moveSamples.length > 8 && (Math.max(...session.moveSamples) - Math.min(...session.moveSamples)) > window.innerWidth * 0.30 && stageAge > this.options.calibrationMoveMinMs
      : samples.length >= 28 && stageAge > this.options.calibrationStageMinMs;

    if (!done) return;

    session.stageIndex += 1;
    if (session.stageIndex < session.stages.length) {
      const next = session.stages[session.stageIndex];
      session.stage = next.id;
      session.stageStartedAt = now;
      this.notify(next.message, "info");
      this.emit("calibration", { state: "stage", stage: next.id, stageInfo: next, stageIndex: session.stageIndex, totalStages: session.stages.length });
      return;
    }

    const avgPalm = session.palmSamples.reduce((a, b) => a + b, 0) / Math.max(1, session.palmSamples.length);
    const sortedPinches = session.pinchSamples.slice().sort((a, b) => a - b);
    const lowPinch = sortedPinches[Math.floor(sortedPinches.length * 0.2)] ?? Math.min(...session.pinchSamples);
    const range = session.moveSamples.length ? Math.max(...session.moveSamples) - Math.min(...session.moveSamples) : 0;
    const calibration = {
      createdAt: Date.now(),
      palmWidthPx: avgPalm,
      naturalPinchRatio: lowPinch,
      movementRangePx: range,
      pinchThreshold: clamp(lowPinch + 0.08, 0.18, 0.42),
      pinchReleaseThreshold: clamp(lowPinch + 0.18, 0.32, 0.58),
      minHandSizePx: clamp(avgPalm * 0.38, 34, 90)
    };
    this.applyCalibration(calibration, { silent: true });
    if (session.save) this.saveCalibration(calibration);
    this.calibrationSession = null;
    this.notify("Calibration complete", "info");
    window.setTimeout(() => this.hideNotice(), 1500);
    this.emit("calibration", { state: "complete", calibration, totalStages: session.stages.length });
  }

  setNotificationsVisible(visible) {
    this.options.notifications = !!visible;
    if (!visible) this.hideNotice();
    return this;
  }

  notify(message, type = "info") {
    if (!this.options.notifications) return;
    this.ensureUi();
    this.ensureNotice();
    this.noticeEl.textContent = message;
    this.noticeEl.setAttribute("data-type", type);
    this.noticeEl.style.opacity = "1";
    this.noticeEl.style.transform = this.noticeTransform(true);
  }

  hideNotice() {
    if (!this.noticeEl) return;
    this.noticeEl.style.opacity = "0";
    this.noticeEl.style.transform = this.noticeTransform(false);
  }

  on(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  emit(type, detail = {}) {
    const event = { type, detail, target: this, timeStamp: performance.now() };
    this.listeners.get(type)?.forEach((handler) => handler(event));
    this.listeners.get("*")?.forEach((handler) => handler(event));
    return event;
  }

  ensureUi() {
    if (!this.root) {
      this.root = document.createElement("div");
      this.root.setAttribute("data-handnav", "root");
      Object.assign(this.root.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: String(this.options.pointerZIndex),
        overflow: "hidden"
      });
      (this.options.overlayContainer || document.body).appendChild(this.root);
    }

    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("data-handnav", "video");
    this.video.muted = true;
    if (this.createdVideo && !this.video.parentNode) document.body.appendChild(this.video);
    this.applyVideoStyle();

    if (this.options.overlay) this.ensureCanvas();

    if (this.options.pointerElement && !this.cursorEl) {
      this.cursorEl = document.createElement("div");
      this.cursorEl.setAttribute("data-handnav", "cursor");
      const s = this.options.pointerSize;
      Object.assign(this.cursorEl.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: `${s}px`,
        height: `${s}px`,
        marginLeft: `${-s / 2}px`,
        marginTop: `${-s / 2}px`,
        borderRadius: "999px",
        background: "rgba(58, 134, 255, 0.16)",
        border: "2px solid rgba(58, 134, 255, 0.95)",
        boxShadow: "0 0 0 8px rgba(58, 134, 255, 0.12), 0 8px 30px rgba(0,0,0,0.22)",
        transform: `translate(${this.pointer.x}px, ${this.pointer.y}px)`,
        transition: "width 120ms, height 120ms, margin 120ms, background 120ms, border-color 120ms",
        willChange: "transform",
        pointerEvents: "none"
      });
      this.root.appendChild(this.cursorEl);
    }
  }

  applyVideoStyle() {
    if (!this.video) return;
    const p = this.options.videoPreview || {};
    const visible = !!this.options.showVideo;
    Object.assign(this.video.style, {
      position: "fixed",
      right: `${p.right ?? 12}px`,
      bottom: `${p.bottom ?? 12}px`,
      width: visible ? `${p.width ?? 180}px` : "1px",
      height: visible ? `${p.height ?? 135}px` : "1px",
      opacity: visible ? String(p.opacity ?? 0.85) : "0",
      transform: this.options.mirror ? "scaleX(-1)" : "none",
      borderRadius: `${p.borderRadius ?? 14}px`,
      border: visible ? "1px solid rgba(255,255,255,0.28)" : "0",
      boxShadow: visible ? "0 14px 42px rgba(0,0,0,0.35)" : "none",
      background: "#000",
      zIndex: String(this.options.pointerZIndex - 1),
      pointerEvents: "none"
    });
  }

  ensureCanvas() {
    if (this.canvas) return;
    this.canvas = document.createElement("canvas");
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    Object.assign(this.canvas.style, {
      width: "100vw",
      height: "100vh",
      display: this.options.overlay ? "block" : "none"
    });
    this.ctx = this.canvas.getContext("2d");
    this.root.appendChild(this.canvas);
    if (!this.resizeHandler) {
      this.resizeHandler = () => {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      };
      window.addEventListener("resize", this.resizeHandler);
    }
  }

  ensureNotice() {
    if (this.noticeEl) return;
    this.noticeEl = document.createElement("div");
    this.noticeEl.setAttribute("data-handnav", "notice");
    const pos = this.options.notificationPosition;
    const style = {
      position: "fixed",
      maxWidth: "min(360px, calc(100vw - 32px))",
      padding: "10px 14px",
      borderRadius: "999px",
      background: "rgba(8, 17, 31, 0.82)",
      color: "#eef5ff",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 14px 45px rgba(0,0,0,0.28)",
      backdropFilter: "blur(14px)",
      font: "600 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 180ms ease, transform 180ms ease",
      zIndex: String(this.options.pointerZIndex),
      left: pos.includes("center") ? "50%" : "auto",
      right: pos.includes("right") ? "16px" : "auto",
      top: pos.startsWith("top") ? "16px" : "auto",
      bottom: pos.startsWith("bottom") ? "20px" : "auto",
      transform: this.noticeTransform(false)
    };
    Object.assign(this.noticeEl.style, style);
    this.root.appendChild(this.noticeEl);
  }

  noticeTransform(visible) {
    const y = visible ? "0" : "8px";
    return this.options.notificationPosition.includes("center") ? `translate(-50%, ${y})` : `translateY(${y})`;
  }

  async setupCamera() {
    if (!window.isSecureContext) {
      throw new Error("Camera access requires a secure context. Open the site from https:// or http://localhost, not file:// or an embedded preview.");
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not expose navigator.mediaDevices.getUserMedia. Check HTTPS, browser support, and camera permissions policy.");
    }

    this.emit("camera", { state: "requesting" });
    if (!this.video.srcObject) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: this.options.camera, audio: false });
      } catch (err) {
        throw this.cameraError(err);
      }
      this.video.srcObject = this.stream;
    }
    await this.video.play();
    this.emit("camera", { state: "ready", stream: this.stream });
  }

  cameraError(err) {
    const name = err?.name || "CameraError";
    const messages = {
      NotAllowedError: "Camera permission was blocked or dismissed. Allow camera access in the browser site settings and try again.",
      PermissionDeniedError: "Camera permission was denied. Allow camera access in the browser site settings and try again.",
      NotFoundError: "No camera was found on this device.",
      NotReadableError: "The camera is already in use by another app or browser tab.",
      OverconstrainedError: "The requested camera constraints are not available. Try changing the camera options.",
      SecurityError: "Camera access is blocked by browser security policy. Use HTTPS and avoid restricted iframes.",
      AbortError: "The browser could not start the camera. Try refreshing the page."
    };
    const error = new Error(messages[name] || err?.message || "Unable to start camera.");
    error.name = name;
    error.originalError = err;
    return error;
  }

  normalizeError(err) {
    if (err instanceof Error) return err;
    const error = new Error(String(err));
    error.originalError = err;
    return error;
  }

  async setupModel() {
    if (this.handLandmarker) return;
    const mod = await import(this.options.tasksVisionUrl);
    const vision = await mod.FilesetResolver.forVisionTasks(this.options.wasmPath);
    this.handLandmarker = await mod.HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.options.modelAssetPath,
        delegate: this.options.delegate
      },
      runningMode: "VIDEO",
      numHands: this.options.numHands,
      minHandDetectionConfidence: this.options.minHandDetectionConfidence,
      minHandPresenceConfidence: this.options.minHandPresenceConfidence,
      minTrackingConfidence: this.options.minTrackingConfidence
    });
  }

  loop = () => {
    if (this.state !== "running") return;
    try {
      if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.video.currentTime;
        const result = this.handLandmarker.detectForVideo(this.video, performance.now());
        this.processResult(result);
      }
    } catch (err) {
      this.emit("error", err);
      if (this.options.debug) console.error(err);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  processResult(result) {
    const hands = this.normalizeResult(result);
    if (!hands.length) {
      this.clearCanvas();
      this.setCursorVisible(false);
      this.lastScrollY = null;
      this.scrollSession = null;
      if (this.predictPointerWhenLost()) return;
      this.releasePinchDueToLoss();
      this.stabilizedLandmarks = null;
      this.handleNoHands(this.lastDetectionMeta);
      this.emit("lost", this.lastDetectionMeta);
      return;
    }

    let hand = hands[0];
    hand = { ...hand, landmarks: this.stabilizeLandmarks(hand.landmarks) };
    this.lastHandSeenAt = performance.now();
    this.lostSince = null;
    this.hideNotice();
    this.setCursorVisible(true);
    this.updatePointer(hand.landmarks);
    this.draw(hand.landmarks);

    const gesture = this.classify(hand.landmarks);
    this.updateCalibration(gesture, hand.landmarks);
    const payload = { ...gesture, hand, pointer: { ...this.pointer } };
    this.emit("hand", payload);
    this.emit("gesture", payload);

    if (this.options.pointer && !gesture.twoFinger) this.updateHover();
    if (gesture.twoFinger) this.clearHover();
    if (this.options.click && this.isGestureEnabled("pinchClick")) this.handlePinch(gesture);
    if (this.options.dwellClick && this.isGestureEnabled("dwellClick")) this.handleDwellClick(gesture);
    if (this.options.scroll && this.isGestureEnabled("twoFingerScroll")) this.handleScroll(gesture, hand.landmarks);
    if (this.options.swipe && this.isGestureEnabled("swipe")) this.handleSwipe(hand.landmarks);
    this.handleHeldGestures(gesture);
  }

  normalizeResult(result) {
    const out = [];
    const landmarks = result?.landmarks || [];
    let bestRejected = null;
    for (let i = 0; i < landmarks.length; i++) {
      const handednessScore = result.handedness?.[i]?.[0]?.score ?? 1;
      const sizePx = this.handSizePx(landmarks[i]);
      const rejected = handednessScore < this.options.handConfidenceThreshold
        ? "low-confidence"
        : sizePx < this.options.minHandSizePx
          ? "too-small"
          : null;
      if (rejected) {
        const candidate = { reason: rejected, handednessScore, sizePx };
        if (!bestRejected || (sizePx * handednessScore) > (bestRejected.sizePx * bestRejected.handednessScore)) bestRejected = candidate;
        continue;
      }
      out.push({
        landmarks: landmarks[i],
        worldLandmarks: result.worldLandmarks?.[i] || null,
        handedness: result.handedness?.[i]?.[0]?.categoryName || null,
        handednessScore,
        sizePx
      });
    }
    // Prefer the largest confident hand. This helps ignore small/background hands or false positives.
    out.sort((a, b) => (b.sizePx * b.handednessScore) - (a.sizePx * a.handednessScore));
    this.lastDetectionMeta = { rawCount: landmarks.length, acceptedCount: out.length, bestRejected };
    return out;
  }

  handSizePx(landmarks) {
    if (!landmarks?.length) return 0;
    const a = this.toScreen(landmarks[LANDMARK.INDEX_MCP]);
    const b = this.toScreen(landmarks[LANDMARK.PINKY_MCP]);
    const c = this.toScreen(landmarks[LANDMARK.WRIST]);
    const d = this.toScreen(landmarks[LANDMARK.MIDDLE_TIP]);
    return Math.max(Math.hypot(a.x - b.x, a.y - b.y), Math.hypot(c.x - d.x, c.y - d.y) * 0.55);
  }

  shouldUseAdvancedStabilization() {
    if (this.options.advancedStabilization === true) return true;
    if (this.options.advancedStabilization === false) return false;
    return this.options.effectivePerformanceMode !== "performance";
  }

  stabilizeLandmarks(landmarks) {
    if (!this.shouldUseAdvancedStabilization() || !this.stabilizedLandmarks) {
      this.stabilizedLandmarks = landmarks.map((p) => ({ ...p }));
      return this.stabilizedLandmarks;
    }
    const baseAlpha = clamp(this.options.landmarkSmoothing, 0.05, 0.95);
    this.stabilizedLandmarks = landmarks.map((point, i) => {
      const prev = this.stabilizedLandmarks[i] || point;
      const movement = Math.hypot(point.x - prev.x, point.y - prev.y, (point.z || 0) - (prev.z || 0));
      const adaptiveAlpha = clamp(baseAlpha + movement * 9, baseAlpha, 0.88);
      return {
        x: lerp(prev.x, point.x, adaptiveAlpha),
        y: lerp(prev.y, point.y, adaptiveAlpha),
        z: lerp(prev.z || 0, point.z || 0, adaptiveAlpha)
      };
    });
    return this.stabilizedLandmarks;
  }

  handleNoHands(meta = {}) {
    const now = performance.now();
    if (this.lostSince == null) this.lostSince = now;
    const lostFor = now - this.lostSince;
    const sinceSeen = this.lastHandSeenAt ? now - this.lastHandSeenAt : Infinity;

    if (meta.rawCount > 0 && meta.bestRejected && lostFor >= this.options.notificationAfterMs) {
      if (meta.bestRejected.reason === "too-small") this.notify("Move your hand a little closer", "warn");
      else this.notify("Hold your hand steady in the camera view", "warn");
      return;
    }

    if (sinceSeen < this.options.noHandIgnoreAfterMs && lostFor >= this.options.notificationAfterMs) {
      this.notify("Hand not detected — move back into camera view", "info");
      return;
    }

    if (sinceSeen >= this.options.noHandIgnoreAfterMs) this.hideNotice();
  }

  toScreen(point) {
    const nx = this.options.mirror ? 1 - point.x : point.x;
    return {
      x: clamp(nx, 0, 1) * window.innerWidth,
      y: clamp(point.y, 0, 1) * window.innerHeight,
      z: point.z || 0
    };
  }

  updatePointer(landmarks) {
    const tip = this.toScreen(landmarks[LANDMARK.INDEX_TIP]);
    const now = performance.now();
    const filter = this.pointerFilter;
    const dt = Math.max(8, Math.min(80, now - (filter.lastAt || now))) / 1000;
    this.pointer.rawX = tip.x;
    this.pointer.rawY = tip.y;

    if (!filter.initialized) {
      filter.initialized = true;
      filter.x = tip.x;
      filter.y = tip.y;
      filter.vx = 0;
      filter.vy = 0;
      filter.lastAt = now;
    }

    const instantVx = (tip.x - filter.x) / dt;
    const instantVy = (tip.y - filter.y) / dt;
    filter.vx = lerp(filter.vx || 0, instantVx, 0.32);
    filter.vy = lerp(filter.vy || 0, instantVy, 0.32);

    const speed = Math.hypot(filter.vx, filter.vy);
    const base = clamp(this.options.smoothing, 0.05, 0.95);
    const t = this.options.cursorFilter === "adaptive"
      ? clamp(base + speed / 2800, base, 0.86)
      : base;

    filter.x = lerp(filter.x, tip.x, t);
    filter.y = lerp(filter.y, tip.y, t);
    filter.lastAt = now;

    this.pointer.x = filter.x;
    this.pointer.y = filter.y;
    this.moveCursorElement();
  }

  moveCursorElement() {
    if (this.cursorEl) {
      this.cursorEl.style.transform = `translate(${this.pointer.x}px, ${this.pointer.y}px)`;
    }
  }

  predictPointerWhenLost() {
    if (!this.options.predictiveTracking || !this.pointerFilter?.initialized || !this.lastHandSeenAt) return false;
    const now = performance.now();
    const lostFor = now - this.lastHandSeenAt;
    if (lostFor > this.options.trackingLossPredictionMs) return false;
    const dt = Math.max(0, Math.min(0.05, (now - this.pointerFilter.lastAt) / 1000));
    const decay = Math.max(0, 1 - lostFor / this.options.trackingLossPredictionMs);
    this.pointerFilter.x = clamp(this.pointerFilter.x + this.pointerFilter.vx * dt * decay, 0, window.innerWidth);
    this.pointerFilter.y = clamp(this.pointerFilter.y + this.pointerFilter.vy * dt * decay, 0, window.innerHeight);
    this.pointerFilter.vx *= 0.82;
    this.pointerFilter.vy *= 0.82;
    this.pointerFilter.lastAt = now;
    this.pointer.x = this.pointerFilter.x;
    this.pointer.y = this.pointerFilter.y;
    this.setCursorVisible(true);
    this.moveCursorElement();
    this.emit("prediction", { pointer: { ...this.pointer }, lostFor });
    return true;
  }

  classify(lm) {
    const palmWidth = Math.max(distance(lm[LANDMARK.INDEX_MCP], lm[LANDMARK.PINKY_MCP]), 0.001);
    const pinchRatio = distance(lm[LANDMARK.THUMB_TIP], lm[LANDMARK.INDEX_TIP]) / palmWidth;
    const fingers = {
      index: lm[LANDMARK.INDEX_TIP].y < lm[LANDMARK.INDEX_PIP].y,
      middle: lm[LANDMARK.MIDDLE_TIP].y < lm[LANDMARK.MIDDLE_PIP].y,
      ring: lm[LANDMARK.RING_TIP].y < lm[LANDMARK.RING_PIP].y,
      pinky: lm[LANDMARK.PINKY_TIP].y < lm[LANDMARK.PINKY_PIP].y
    };
    const thumbVerticalUp = lm[LANDMARK.THUMB_TIP].y < lm[LANDMARK.THUMB_IP].y && lm[LANDMARK.THUMB_IP].y < lm[LANDMARK.THUMB_MCP].y;
    const thumbVerticalDown = lm[LANDMARK.THUMB_TIP].y > lm[LANDMARK.THUMB_IP].y && lm[LANDMARK.THUMB_IP].y > lm[LANDMARK.THUMB_MCP].y;
    const extendedCount = Object.values(fingers).filter(Boolean).length;
    const otherFingersFolded = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
    const peace = fingers.index && fingers.middle && !fingers.ring && !fingers.pinky;
    // Scrolling should be forgiving: ring/pinky landmarks can briefly jitter as extended.
    const twoFinger = fingers.index && fingers.middle && extendedCount <= 3;
    const openPalm = extendedCount >= 4;
    const fist = extendedCount === 0 && !thumbVerticalUp && !thumbVerticalDown;
    const pointing = fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;
    const thumbsUp = thumbVerticalUp && otherFingersFolded;
    const thumbsDown = thumbVerticalDown && otherFingersFolded;
    const pinching = this.pinchDown
      ? pinchRatio < this.options.pinchReleaseThreshold
      : pinchRatio < this.options.pinchThreshold;

    const pinchConfidence = pinching
      ? clamp((this.options.pinchReleaseThreshold - pinchRatio) / Math.max(0.001, this.options.pinchReleaseThreshold - this.options.pinchThreshold), 0, 1)
      : clamp(1 - Math.abs(pinchRatio - this.options.pinchThreshold) / Math.max(0.001, this.options.pinchThreshold), 0, 1);
    const confidence = {
      pinch: pinchConfidence,
      twoFinger: twoFinger ? 0.86 : 0,
      openPalm: openPalm ? clamp(extendedCount / 4, 0, 1) : 0,
      fist: fist ? 0.82 : 0,
      thumbsUp: thumbsUp ? 0.82 : 0,
      thumbsDown: thumbsDown ? 0.82 : 0
    };

    return {
      name: pinching ? "pinch" : thumbsUp ? "thumbsUp" : thumbsDown ? "thumbsDown" : peace ? "peace" : openPalm ? "openPalm" : fist ? "fist" : pointing ? "point" : "hand",
      palmWidth,
      pinchRatio,
      pinching,
      confidence,
      fingers,
      thumbVerticalUp,
      thumbVerticalDown,
      twoFinger,
      peace,
      openPalm,
      fist,
      pointing,
      thumbsUp,
      thumbsDown
    };
  }

  isGestureEnabled(name) {
    return this.options.enabledGestures?.[name] !== false;
  }

  handleDwellClick(gesture) {
    const canDwell = gesture.pointing || gesture.openPalm;
    if (!canDwell || this.pinchDown) {
      this.dwell = null;
      return;
    }
    const now = performance.now();
    const target = this.clickTarget();
    if (!this.dwell) {
      this.dwell = { x: this.pointer.x, y: this.pointer.y, startedAt: now, target, fired: false };
      this.emit("dwellstart", { element: target, pointer: { ...this.pointer } });
      return;
    }
    const travel = Math.hypot(this.pointer.x - this.dwell.x, this.pointer.y - this.dwell.y);
    if (travel > this.options.dwellRadiusPx || target !== this.dwell.target) {
      this.dwell = { x: this.pointer.x, y: this.pointer.y, startedAt: now, target, fired: false };
      this.emit("dwellstart", { element: target, pointer: { ...this.pointer } });
      return;
    }
    const progress = clamp((now - this.dwell.startedAt) / this.options.dwellTimeMs, 0, 1);
    this.emit("dwellprogress", { progress, element: target, pointer: { ...this.pointer } });
    if (!this.dwell.fired && progress >= 1) {
      this.dwell.fired = true;
      this.dispatchMouse("click", target);
      if (isInputLike(target)) target.focus({ preventScroll: true });
      this.emit("dwellclick", { element: target, pointer: { ...this.pointer } });
    }
  }

  handleHeldGestures(gesture) {
    const candidates = ["thumbsUp", "thumbsDown", "peace", "openPalm", "fist"];
    const now = performance.now();
    for (const name of candidates) {
      const suppressPeace = name === "peace" && this.options.suppressPeaceActionDuringScroll && gesture.twoFinger && this.options.scroll && this.isGestureEnabled("twoFingerScroll");
      if (suppressPeace || !gesture[name] || !this.isGestureEnabled(name)) {
        this.gestureHolds.delete(name);
        continue;
      }
      if (!this.gestureHolds.has(name)) {
        this.gestureHolds.set(name, now);
        this.emit(`${name}start`, { gesture, pointer: { ...this.pointer } });
        continue;
      }
      const heldFor = now - this.gestureHolds.get(name);
      this.emit(`${name}hold`, { heldFor, gesture, pointer: { ...this.pointer } });
      const last = this.lastGestureActions.get(name) || 0;
      if (heldFor >= this.options.gestureHoldDurationMs && now - last >= this.options.gestureActionCooldownMs) {
        this.lastGestureActions.set(name, now);
        this.emit(name, { heldFor, gesture, pointer: { ...this.pointer } });
        this.emit(name.toLowerCase(), { heldFor, gesture, pointer: { ...this.pointer } });
        this.callGestureCallback(name, { heldFor, gesture, pointer: { ...this.pointer } });
      }
    }
  }

  callGestureCallback(name, detail) {
    const map = {
      thumbsUp: "onThumbsUp",
      thumbsDown: "onThumbsDown",
      peace: "onPeace",
      openPalm: "onOpenPalm",
      fist: "onFist"
    };
    const callback = this.options[map[name]];
    if (typeof callback === "function") callback(detail);
  }

  clearHover() {
    this.lastHovered?.classList?.remove(this.options.hoverClass);
    this.lastHovered = null;
  }

  updateHover() {
    let el = document.elementFromPoint(this.pointer.x, this.pointer.y);
    if (el === document.body || el === document.documentElement) el = null;
    if (el === this.lastHovered) return;
    this.lastHovered?.classList?.remove(this.options.hoverClass);
    this.lastHovered = el;
    this.lastHovered?.classList?.add(this.options.hoverClass);
    this.emit("hover", { element: el, pointer: { ...this.pointer } });
  }

  handlePinch(gesture) {
    const now = performance.now();
    const sm = this.pinchMachine || { state: "idle" };

    if (gesture.pinching && sm.state === "idle") {
      const target = this.clickTarget();
      this.pinchMachine = {
        state: "candidate",
        startedAt: now,
        target,
        startX: this.pointer.x,
        startY: this.pointer.y,
        dragging: false,
        pointerDown: false
      };
      this.emit("pinchcandidate", { element: target, pointer: { ...this.pointer }, confidence: gesture.confidence?.pinch ?? 0 });
      return;
    }

    if (gesture.pinching && sm.state === "candidate" && now - sm.startedAt >= this.options.pinchConfirmMs) {
      sm.state = "active";
      sm.pointerDown = false;
      this.pinchDown = true;
      this.pinchStart = { x: sm.startX, y: sm.startY, target: sm.target, startedAt: sm.startedAt };
      this.cursorEl?.classList.add(this.options.pressedClass);
      this.styleCursorPressed(true);
      if (this.options.pointerDownOnPinch) {
        sm.pointerDown = true;
        this.dispatchMouse("pointerdown", sm.target, { buttons: 1 });
        this.dispatchMouse("mousedown", sm.target, { buttons: 1 });
      }
      this.emit("pinchstart", { element: sm.target, pointer: { ...this.pointer }, confidence: gesture.confidence?.pinch ?? 0 });
      return;
    }

    if (gesture.pinching && sm.state === "active") {
      const travel = Math.hypot(this.pointer.x - sm.startX, this.pointer.y - sm.startY);
      const duration = now - sm.startedAt;
      if (!sm.dragging && this.options.drag && (travel >= this.options.dragStartThresholdPx || (this.options.dragOnLongPinch && duration >= this.options.longPinchMs))) {
        sm.dragging = true;
        if (!sm.pointerDown) {
          sm.pointerDown = true;
          this.dispatchMouse("pointerdown", sm.target, { buttons: 1 });
          this.dispatchMouse("mousedown", sm.target, { buttons: 1 });
        }
        this.emit("dragstart", { element: sm.target, pointer: { ...this.pointer }, travel, duration });
      }
      if (sm.pointerDown) {
        this.dispatchMouse("pointermove", sm.target, { buttons: 1 });
        this.dispatchMouse("mousemove", sm.target, { buttons: 1 });
      }
      this.applyNativeDragFallback(sm.target);
      if (sm.dragging) this.emit("drag", { element: sm.target, pointer: { ...this.pointer }, travel, duration });
      return;
    }

    if (!gesture.pinching && sm.state === "candidate") {
      const travel = Math.hypot(this.pointer.x - sm.startX, this.pointer.y - sm.startY);
      const duration = now - sm.startedAt;
      if (travel <= this.options.clickMaxTravelPx) {
        const target = sm.target || this.clickTarget();
        this.dispatchMouse("click", target, { buttons: 0 });
        if (isInputLike(target)) target.focus({ preventScroll: true });
        this.lastClickAt = now;
        this.emit("click", { element: target, pointer: { ...this.pointer }, travel, duration, quick: true, confidence: gesture.confidence?.pinch ?? 0 });
      } else {
        this.emit("pinchcancel", { pointer: { ...this.pointer } });
      }
      this.pinchMachine = { state: "idle" };
      return;
    }

    if (!gesture.pinching && sm.state === "active") {
      const upTarget = this.clickTarget();
      const target = sm.target || upTarget;
      const travel = Math.hypot(this.pointer.x - sm.startX, this.pointer.y - sm.startY);
      const duration = now - sm.startedAt;
      if (sm.pointerDown) {
        this.dispatchMouse("pointerup", target, { buttons: 0 });
        this.dispatchMouse("mouseup", target, { buttons: 0 });
      }

      const shouldClick = !sm.dragging && travel <= this.options.clickMaxTravelPx;
      if (shouldClick) {
        const clickTarget = sm.target || upTarget;
        this.dispatchMouse("click", clickTarget, { buttons: 0 });
        if (now - this.lastClickAt <= this.options.doublePinchMs) {
          this.dispatchMouse("dblclick", clickTarget, { buttons: 0 });
          this.emit("doubleclick", { element: clickTarget, pointer: { ...this.pointer }, travel, duration });
        }
        this.lastClickAt = now;
        if (isInputLike(clickTarget)) clickTarget.focus({ preventScroll: true });
        this.emit("click", { element: clickTarget, pointer: { ...this.pointer }, travel, duration, confidence: gesture.confidence?.pinch ?? 0 });
      }
      if (sm.dragging) {
        this.applyNativeDragFallback(target, true);
        this.emit("dragend", { element: target, pointer: { ...this.pointer }, travel, duration });
      }
      this.cursorEl?.classList.remove(this.options.pressedClass);
      this.styleCursorPressed(false);
      this.pinchDown = false;
      this.pinchStart = null;
      this.pinchMachine = { state: "idle" };
      this.emit("pinchend", { element: target, pointer: { ...this.pointer }, travel, duration });
    }
  }

  applyNativeDragFallback(target, final = false) {
    if (!target || target.tagName !== "INPUT" || target.type !== "range") return;
    const rect = target.getBoundingClientRect();
    if (!rect.width) return;
    const min = Number(target.min || 0);
    const max = Number(target.max || 100);
    const step = target.step === "any" ? 0 : Number(target.step || 1);
    const ratio = clamp((this.pointer.x - rect.left) / rect.width, 0, 1);
    let value = min + ratio * (max - min);
    if (step > 0) value = Math.round(value / step) * step;
    value = clamp(value, min, max);
    if (String(target.value) !== String(value)) {
      target.value = String(value);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (final) target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  releasePinchDueToLoss() {
    const sm = this.pinchMachine;
    if (!sm || sm.state === "idle") return;
    if (sm.state === "active" && sm.target) {
      if (sm.pointerDown) {
        this.dispatchMouse("pointerup", sm.target, { buttons: 0 });
        this.dispatchMouse("mouseup", sm.target, { buttons: 0 });
      }
      if (sm.dragging) this.emit("dragend", { element: sm.target, pointer: { ...this.pointer }, cancelled: true });
      this.emit("pinchend", { element: sm.target, pointer: { ...this.pointer }, cancelled: true });
    } else {
      this.emit("pinchcancel", { pointer: { ...this.pointer }, reason: "tracking-lost" });
    }
    this.cursorEl?.classList.remove(this.options.pressedClass);
    this.styleCursorPressed(false);
    this.pinchDown = false;
    this.pinchStart = null;
    this.pinchMachine = { state: "idle" };
  }

  clickTarget() {
    return document.elementFromPoint(this.pointer.x, this.pointer.y) || document.body;
  }

  dispatchMouse(type, target, overrides = {}) {
    if (!target) return;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: this.pointer.x,
      clientY: this.pointer.y,
      screenX: this.pointer.x,
      screenY: this.pointer.y,
      view: window,
      buttons: overrides.buttons ?? (this.pinchDown ? 1 : 0),
      button: overrides.button ?? 0,
      pointerId: 991,
      pointerType: "hand",
      isPrimary: true,
      ...overrides
    };
    const EventCtor = type.startsWith("pointer") && window.PointerEvent ? PointerEvent : MouseEvent;
    target.dispatchEvent(new EventCtor(type, eventInit));
  }

  handleScroll(gesture, landmarks) {
    if (this.options.scrollMode !== "twoFinger" || !gesture.twoFinger || this.pinchDown || !landmarks) {
      this.lastScrollY = null;
      this.scrollSession = null;
      return;
    }

    const anchor = this.getScrollAnchorPoint(landmarks);
    const y = anchor.y;
    const now = performance.now();

    if (!this.scrollSession) {
      const target = this.clickTarget();
      this.scrollSession = {
        scroller: this.findScroller(target),
        startY: y,
        y,
        lastY: y,
        accumulator: 0,
        lastFrameAt: now,
        startedAt: now
      };
      this.lastScrollY = y;
      this.emit("scrollstart", { element: this.scrollSession.scroller, pointer: { ...this.pointer } });
      return;
    }

    const smoothing = clamp(this.options.scrollSmoothing, 0, 1);
    const smoothY = lerp(this.scrollSession.y, y, smoothing);
    const dt = Math.max(8, Math.min(50, now - this.scrollSession.lastFrameAt));
    this.scrollSession.lastFrameAt = now;
    this.scrollSession.y = smoothY;
    this.lastScrollY = smoothY;

    let scrollAmount = 0;
    if (this.options.scrollControl === "drag") {
      let dy = smoothY - this.scrollSession.lastY;
      this.scrollSession.lastY = smoothY;
      this.scrollSession.accumulator += dy;
      if (Math.abs(this.scrollSession.accumulator) < this.options.scrollDeadzonePx) return;
      dy = clamp(this.scrollSession.accumulator, -this.options.scrollMaxStepPx, this.options.scrollMaxStepPx);
      this.scrollSession.accumulator = 0;
      scrollAmount = dy * this.options.scrollSpeed;
    } else {
      const offset = smoothY - this.scrollSession.startY;
      const deadzone = this.options.scrollActivationDeadzonePx;
      if (Math.abs(offset) < deadzone) return;
      const direction = Math.sign(offset);
      const activeOffset = offset - direction * deadzone;
      const frameScale = dt / 16.67;
      scrollAmount = clamp(
        activeOffset * this.options.scrollVelocityScale * this.options.scrollSpeed * frameScale,
        -this.options.scrollMaxStepPx,
        this.options.scrollMaxStepPx
      );
    }

    this.scrollSession.scroller.scrollBy({ top: scrollAmount, behavior: "auto" });
    this.emit("scroll", { amount: scrollAmount, element: this.scrollSession.scroller, pointer: { ...this.pointer } });
  }

  getScrollAnchorPoint(landmarks) {
    const anchor = this.options.scrollAnchor;
    if (anchor === "indexTip") return this.toScreen(landmarks[LANDMARK.INDEX_TIP]);
    if (anchor === "middleMcp") return this.toScreen(landmarks[LANDMARK.MIDDLE_MCP]);
    return this.toScreen(landmarks[LANDMARK.WRIST]);
  }

  findScroller(start) {
    let el = start;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = getComputedStyle(el);
      const canScroll = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
      if (canScroll) return el;
      el = el.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  handleSwipe(lm) {
    const now = performance.now();
    const wrist = this.toScreen(lm[LANDMARK.WRIST]);
    this.history.push({ t: now, x: wrist.x, y: wrist.y });
    const windowStart = now - this.options.swipeWindowMs;
    this.history = this.history.filter((p) => p.t >= windowStart);
    if (now - this.lastSwipeAt < this.options.swipeCooldownMs || this.history.length < 3) return;
    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = Math.max(1, last.t - first.t);
    const velocity = Math.abs(dx) / (dt / 1000);
    if (Math.abs(dx) < this.options.swipeThresholdPx || velocity < this.options.swipeVelocityThresholdPxS || Math.abs(dy) > this.options.swipeMaxVerticalPx) return;

    this.lastSwipeAt = now;
    this.history = [];
    if (dx < 0) {
      if (typeof this.options.onSwipeLeft === "function") this.options.onSwipeLeft({ dx, dy, velocity });
      else window.dispatchEvent(new CustomEvent("handnav:swipeleft", { detail: { dx, dy, velocity } }));
      this.emit("swipeleft", { dx, dy, velocity });
    } else {
      if (typeof this.options.onSwipeRight === "function") this.options.onSwipeRight({ dx, dy, velocity });
      else window.dispatchEvent(new CustomEvent("handnav:swiperight", { detail: { dx, dy, velocity } }));
      this.emit("swiperight", { dx, dy, velocity });
    }
  }

  setCursorVisible(visible) {
    if (this.cursorEl) this.cursorEl.style.opacity = visible ? "1" : "0";
  }

  styleCursorPressed(pressed) {
    if (!this.cursorEl) return;
    const s = this.options.pointerSize * (pressed ? 0.72 : 1);
    this.cursorEl.style.width = `${s}px`;
    this.cursorEl.style.height = `${s}px`;
    this.cursorEl.style.marginLeft = `${-s / 2}px`;
    this.cursorEl.style.marginTop = `${-s / 2}px`;
    this.cursorEl.style.background = pressed ? "rgba(255, 77, 109, 0.22)" : "rgba(58, 134, 255, 0.16)";
    this.cursorEl.style.borderColor = pressed ? "rgba(255, 77, 109, 0.95)" : "rgba(58, 134, 255, 0.95)";
  }

  clearCanvas() {
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(lm) {
    if (!this.options.overlay || !this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(58, 134, 255, 0.7)";
    ctx.lineWidth = 3;
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = this.toScreen(lm[a]);
      const pb = this.toScreen(lm[b]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.strokeStyle = "rgba(58,134,255,0.9)";
    ctx.lineWidth = 2;
    for (const p of lm) {
      const sp = this.toScreen(p);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function createHandNav(options = {}) {
  return new HandNav(options);
}

export { LANDMARK, HAND_CONNECTIONS };
export default HandNav;

if (typeof window !== "undefined") {
  window.HandNav = HandNav;
  window.createHandNav = createHandNav;
}
