// A tiny mutable store: GSAP writes scroll progress here,
// the three.js frame loop reads it. No react re-renders on scroll.
export const story = {
  progress: 0, // 0 → 1 target from scroll
  smooth: 0, // frame-damped progress for ultra-smooth 3D motion
  velocity: 0,
}

// Piecewise-linear keyframe ramp with smoothstep easing between stops.
// stops: [[t0, v0], [t1, v1], ...] (t ascending, 0..1)
export function ramp(t, stops) {
  if (t <= stops[0][0]) return stops[0][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, v0] = stops[i]
    const [t1, v1] = stops[i + 1]
    if (t <= t1) {
      let k = (t - t0) / (t1 - t0)
      k = k * k * (3 - 2 * k) // smoothstep — no snapping
      return v0 + (v1 - v0) * k
    }
  }
  return stops[stops.length - 1][1]
}

// Frame-rate independent exponential smoothing (organic damping)
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

// Story beats (fractions of total scroll)
export const BEATS = {
  hero: 0.0,
  seed: 1 / 6, // Section 1 — A Seed of Feeling
  awaken: 2 / 6, // Section 2 — Love Awakens
  bloom: 3 / 6, // Section 3 — Bloom
  blush: 4 / 6, // Section 4 — Blush
  eternal: 5 / 6, // Section 5 — Eternal Love
}
