export type HandNavStatus = 'idle' | 'starting' | 'running' | 'paused' | 'stopped';
export type HandNavGestureName = 'pinch' | 'twoFinger' | 'peace' | 'thumbsUp' | 'thumbsDown' | 'openPalm' | 'fist' | 'point' | 'hand';

export interface HandNavPointer {
  x: number;
  y: number;
  rawX: number;
  rawY: number;
}

export interface HandNavGestureDetail {
  name: HandNavGestureName;
  pinchRatio: number;
  pinching: boolean;
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
  smoothing?: number;
  pointer?: boolean;
  pointerElement?: boolean;
  pointerSize?: number;
  pointerZIndex?: number;
  click?: boolean;
  pinchThreshold?: number;
  pinchReleaseThreshold?: number;
  clickMaxTravelPx?: number;
  hoverClass?: string;
  pressedClass?: string;
  scroll?: boolean;
  scrollMode?: 'twoFinger' | false;
  scrollSpeed?: number;
  scrollDeadzonePx?: number;
  swipe?: boolean;
  swipeThresholdPx?: number;
  swipeMaxVerticalPx?: number;
  swipeWindowMs?: number;
  swipeCooldownMs?: number;
  onSwipeLeft?: ((info: { dx: number; dy: number }) => void) | null;
  onSwipeRight?: ((info: { dx: number; dy: number }) => void) | null;
  onThumbsUp?: ((detail: any) => void) | null;
  onThumbsDown?: ((detail: any) => void) | null;
  onPeace?: ((detail: any) => void) | null;
  onOpenPalm?: ((detail: any) => void) | null;
  onFist?: ((detail: any) => void) | null;
  gestureHoldDurationMs?: number;
  gestureActionCooldownMs?: number;
  dwellClick?: boolean;
  dwellTimeMs?: number;
  dwellRadiusPx?: number;
  enabledGestures?: HandNavEnabledGestures;
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
  on<T = any>(type: string, handler: (event: HandNavEvent<T>) => void): () => void;
  off<T = any>(type: string, handler: (event: HandNavEvent<T>) => void): void;
}

declare const _default: typeof HandNav;
export default _default;
export declare const LANDMARK: Record<string, number>;
export declare const HAND_CONNECTIONS: number[][];
