
// Game Configuration Constants

// Interaction - Viewport-Relative Drag Thresholds (% of min viewport dimension)
export const BASE_DRAG_THRESHOLD_RATIO = 0.035; // 3.5% of viewport (e.g., ~25px on 1000px screen)
export const MAX_DRAG_THRESHOLD_RATIO = 0.22; // 15% of viewport (e.g., ~100px on 1000px screen)
export const RAPID_CLICK_MS = 700; // Time window to count as rapid consecutive click
export const THRESHOLD_INCREMENT_RATIO = 0.05; // Added per consecutive click (1% per click)

export const RIGHT_CLICK_DRAG_THRESHOLD_RATIO = 0.003; // Right click (Rotate/Focus) - More sensitive
export const DRAG_THRESHOLD_TIME_MS = 200;

// Camera
export const ROTATION_SENSITIVITY = 0.0033;
export const CAMERA_SMOOTHING = 0; // 0 = Disable smoothing (Instant), 0.1 = Smooth
export const SLIDE_DURATION_MS = 450;
export const FRICTION = 0.95; // Momentum friction (higher = smoother, less friction)

// Mining
export const MINE_COOLDOWN_MS = 250;
