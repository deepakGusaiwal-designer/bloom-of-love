# The Bloom of Love

A cinematic, scroll-driven love story told by a single rose. Built with React, React Three Fiber, GSAP ScrollTrigger, Lenis smooth scroll, and postprocessing bloom.

The rose sleeps as a closed bud in near-darkness. As you scroll, it turns toward you, its petals unfold one act at a time, sunlight enters from the side, dewdrops catch the light, a soft blush and golden rim appear — and it finishes fully bloomed, breathing quietly under a dreamy gradient.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and scroll slowly.

The rose model is already included at `public/models/rose.glb` (a single red rose with stem and leaves, converted from OBJ, Draco-compressed to ~700 KB). See `MODEL.md` if you'd like to swap in a different one.

An internet connection is needed on first run: fonts load from Google Fonts and the HDRI environment ("sunset" preset) streams from the pmnd.rs asset CDN.

## The five acts

| Scroll | Act | What happens |
| --- | --- | --- |
| 0 – 17% | Hero | Closed bud, near-black, minimal light, scroll indicator |
| 17 – 33% | A Seed of Feeling | Rose turns toward you, stem sways in wind, camera pushes in, pollen appears |
| 33 – 50% | Love Awakens | Outer petals loosen, color deepens, background warms to burgundy, subtle depth of field |
| 50 – 67% | Bloom | Full opening, sunlight from one side, dewdrop sparkles, brief lens flare, light rays, camera circles |
| 67 – 83% | Blush | Pink sheen on petals, golden rim light, shimmering particles orbit, petals breathe, the Aristotle quote fades in |
| 83 – 100% | Eternal Love | Camera pulls back, glowing particles rise, dreamy gradient, only breathing remains |

## How the bloom works (with any model)

Free rose models are almost always exported already open, without per-petal rigs. Instead of requiring rigged petals, `src/Rose.jsx` injects a small vertex shader into the petal materials: at progress 0 it folds vertices inward and upward around the flower's axis (a closed bud), and unfolds them organically as `uBloom` rises — outer petals travel further than inner ones, so the opening reads as petals unfolding individually. The same shader adds the breathing.

Petal meshes are detected by name (`petal`, `rose`, `bud`…), then by material redness as a fallback, and the whole model is auto-centered and auto-scaled — so nearly any GLB rose drops in and works.

## Tuning without scrolling

Append `?debug` to the URL for a Leva panel with a **manual scrub** slider (drive the whole story by hand), plus exposure control.

## Performance notes

- Model is lazy-loaded (Suspense) behind a fade veil; Draco-compressed GLBs are supported automatically.
- All particles are GPU point clouds with a single generated sprite — no texture downloads, no per-particle objects.
- Scroll writes to a mutable store; the frame loop reads it. Zero React re-renders while scrolling.
- DPR capped at 1.8, postprocessing uses mipmap bloom and a half-height DoF pass.
- `prefers-reduced-motion` disables smooth scrolling and reveal animations.

## Project structure

```
src/
  App.jsx         Lenis + ScrollTrigger master timeline, DOM atmosphere (rays, flare, dream gradient)
  Overlay.jsx     The written story — hero, acts, quote, finale
  Experience.jsx  Camera choreography, light choreography, environment, particles
  Rose.jsx        GLB loading, auto-fit, petal detection, bloom + breath shader, color story
  Particles.jsx   Pollen / dust / orbiting shimmer / rising lights
  Effects.jsx     Bloom, depth of field, vignette — all scrubbed by scroll
  scroll.js       Progress store, keyframe ramp, damping, act boundaries
```
