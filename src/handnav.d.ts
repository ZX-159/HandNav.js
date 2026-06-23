export type HandNavStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopped';
export type HandNavGestureName = 'pinch' | 'twoFinger' | 'peace' | 'thumbsUp' | 'thumbsDown' | 'openPalm' | 'fist' | 'point' | 'hand';
export type HandNavCursorFilter = 'adaptive' | 'lerp';

export interface HandNavPointer {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
}

export interface HandNavGestureDetail {
  name: HandNavGestureName;
  palmWidth: number;
  pinchRatio: number;
  pinching: boolean;
  confidence: Record<string, number>;
  fingers: {
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  thumbVerticalUp: boolean;
  thumbVerticalDown: boolean;
  twoFinger: boolean;
  peace: boolean;
  openPalm: boolean;
  fist: boolean;
  pointing: boolean;
  thumbsUp: boolean;
  thumbsDown: boolean;
  pointer: HandNavPointer;
  hand: {
    landmarks: Array<{ x: number; y: number; z?: number }>;
    worldLandmarks: Array<{ x: number; y: number; z?: number }> | null;
    handedness: string | null;
    handednessScore: number | null;
  };
}

export interface HandNavEvent<T = any> {
  type: string;
  detail: T;
  target: HandNav;
  timeStamp: number;
}

export interface HandNavVideoPreviewOptions {
  width?: number;
  height?: number;
  right?: number;
  bottom?: number;
  opacity?: number;
  borderRadius?: number;
}

export interface HandNavEnabledGestures {
  pinchClick?: boolean;
  twoFingerScroll?: boolean;
  swipe?: boolean;
  dwellClick?: boolean;
  thumbsUp?: boolean;
  thumbsDown?: boolean;
  peace?: boolean;
  openPalm?: boolean;
  fist?: boolean;
}

export interface HandNavCalibration {
  createdAt?: number;
  palmWidthPx?: number;
  naturalPinchRatio?: number;
  movementRangePx?: number;
  pinchThreshold?: number;
  pinchReleaseThreshold?: number;
  minHandSizePx?: number;
}

export interface HandNavOptions {
  tasksVisionUrl?: string;
  wasmPath?: string;
  modelAssetPath?: string;
  delegate?: 'GPU' | 'CPU';
  numHands?: number;
  video?: HTMLVideoElement | null;
  overlay?: boolean;
  overlayContainer?: HTMLElement | null;
  showVideo?: boolean;
  videoPreview?: HandNavVideoPreviewOptions;
  mirror?: boolean;
  camera?: MediaTrackConstraints;
  performanceMode?: 'auto' | 'performance' | 'balanced' | 'quality';
  effectivePerformanceMode?: 'performance' | 'balanced' | 'quality';
  advancedStabilization?: 'auto' | boolean;
  landmarkSmoothing?: number;
  cursorFilter?: HandNavCursorFilter;
  predictiveTracking?: boolean;
  trackingLossPredictionMs?: number;
  smoothing?: number;
  handConfidenceThreshold?: number;
  minHandSizePx?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
  pointer?: boolean;
  pointerElement?: boolean;
  pointerSize?: number;
  pointerZIndex?: number;
  click?: boolean;
  drag?: boolean;
  pinchThreshold?: number;
  pinchReleaseThreshold?: number;
  pinchConfirmMs?: number;
  longPinchMs?: number;
  doublePinchMs?: number;
  dragStartThresholdPx?: number;
  dragOnLongPinch?: boolean;
  pointerDownOnPinch?: boolean;
  clickMaxTravelPx?: number;
  hoverClass?: string;
  pressedClass?: string;
  scroll?: boolean;
  scrollMode?: 'twoFinger' | false;
  scrollAnchor?: 'wrist' | 'indexTip' | 'middleMcp';
  scrollControl?: 'velocity' | 'drag';
  scrollSpeed?: number;
  scrollDeadzonePx?: number;
  scrollActivationDeadzonePx?: number;
  scrollVelocityScale?: number;
  scrollSmoothing?: number;
  scrollMaxStepPx?: number;
  swipe?: boolean;
  swipeThresholdPx?: number;
  swipeVelocityThresholdPxS?: number;
  swipeMaxVerticalPx?: number;
  swipeWindowMs?: number;
  swipeCooldownMs?: number;
  onSwipeLeft?: ((info: { dx: number; dy: number; velocity?: number }) => void) | null;
  onSwipeRight?: ((info: { dx: number; dy: number; velocity?: number }) => void) | null;
  onThumbsUp?: ((detail: any) => void) | null;
  onThumbsDown?: ((detail: any) => void) | null;
  onPeace?: ((detail: any) => void) | null;
  onOpenPalm?: ((detail: any) => void) | null;
  onFist?: ((detail: any) => void) | null;
  gestureHoldDurationMs?: number;
  gestureActionCooldownMs?: number;
  suppressPeaceActionDuringScroll?: boolean;
  dwellClick?: boolean;
  dwellTimeMs?: number;
  dwellRadiusPx?: number;
  enabledGestures?: HandNavEnabledGestures;
  calibration?: HandNavCalibration | null;
  calibrationStorageKey?: string;
  calibrationStageMinMs?: number;
  calibrationMoveMinMs?: number;
  notifications?: boolean;
  notificationAfterMs?: number;
  noHandIgnoreAfterMs?: number;
  notificationPosition?: 'bottom-center' | 'bottom-right' | 'top-center';
  autoStart?: boolean;
  debug?: boolean;
}

export declare class HandNav {
  constructor(options?: HandNavOptions);
  start(): Promise<this>;
  pause(): this;
  resume(): this;
  togglePause(force?: boolean): this;
  stop(): void;
  destroy(): void;
  setOptions(options?: HandNavOptions): this;
  setOverlayVisible(visible: boolean): this;
  toggleOverlay(force?: boolean): this;
  setVideoVisible(visible: boolean): this;
  toggleVideo(force?: boolean): this;
  setMirror(mirror: boolean): this;
  toggleMirror(force?: boolean): this;
  setNotificationsVisible(visible: boolean): this;
  startCalibration(options?: { save?: boolean }): this;
  stopCalibration(): this;
  resetCalibration(): this;
  saveCalibration(calibration?: HandNavCalibration): this;
  getCalibration(): HandNavCalibration | null;
  applyCalibration(calibration: HandNavCalibration, options?: { silent?: boolean }): this;
  on<T = any>(type: string, handler: (event: HandNavEvent<T>) => void): () => void;
  off<T = any>(type: string, handler: (event: HandNavEvent<T>) => void): void;
}

declare const _default: typeof HandNav;
export default _default;
export declare function createHandNav(options?: HandNavOptions): HandNav;
export declare const LANDMARK: Record<string, number>;
export declare const HAND_CONNECTIONS: number[][];
