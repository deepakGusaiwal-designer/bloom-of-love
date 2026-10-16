import React, { useEffect, useRef, useState } from 'react'
import { story, BEATS } from './scroll.js'

/*
 * RosePlantScroller:
 * An organic, lush, living rose plant scrollbar on the right edge of the screen:
 *  - Grows from BOTTOM to TOP as the user scrolls (roots at base, bloom at top).
 *  - Packed with dense botanical foliage: compound trifoliate rose leaves, serrated leaflets,
 *    and climbing vine sprigs that sprout progressively.
 *  - Multiple blooming roses:
 *      * Side Bloom I at Act II (bud opens to sweet blossom)
 *      * Side Bloom II at Act III (lush half-open garden rose)
 *      * Side Bloom III at Act IV (blush pink garden bloom)
 *      * Grand Summit Apex Rose at the tip: multi-layered velvety petals, spiraling heart,
 *        luminous golden stamen core, and drifting golden pollen sparkles.
 *  - Interactive: Hovering reveals chapter titles aligned to each node, clicking smoothly glides via Lenis.
 */

const STORY_NODES = [
  { progress: 0.0, label: 'Hero', subtitle: 'A Love Story in Five Acts', y: 495 },
  { progress: 0.20, label: 'Act I', subtitle: 'A Seed of Feeling', y: 399 },
  { progress: 0.38, label: 'Act II', subtitle: 'Love Awakens', y: 312 },
  { progress: 0.58, label: 'Act III', subtitle: 'Full Bloom', y: 216 },
  { progress: 0.76, label: 'Act IV', subtitle: 'The Blush of Devotion', y: 130 },
  { progress: 0.94, label: 'Act V', subtitle: 'Eternal Love & Bouquet', y: 43 },
]

export default function RosePlantScroller() {
  const containerRef = useRef(null)
  const pathRef = useRef(null)
  const tipRef = useRef(null)
  const pathLengthRef = useRef(500)
  const lastRatioRef = useRef(0)
  const [activeTooltip, setActiveTooltip] = useState(null)
  const [growthRatio, setGrowthRatio] = useState(0)

  // Vine path geometry: Organic natural waviness climbing from BOTTOM (y=495) to TOP (y=15)
  const vinePathD = 'M 30 495 C 27 485, 33 465, 30 440 C 24 370, 36 300, 30 230 C 24 160, 36 90, 30 15'

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength()
      pathLengthRef.current = len
    }

    let rafId
    let prevRatio = -1

    const updateLoop = () => {
      const p = story.smooth || 0
      const clampedP = Math.max(0, Math.min(1, p))

      // Direct DOM transforms run at native 60fps with zero React overhead
      if (Math.abs(clampedP - prevRatio) > 0.0003) {
        prevRatio = clampedP

        if (pathRef.current) {
          const totalLen = pathLengthRef.current
          const targetDist = Math.max(0.01, Math.min(totalLen, clampedP * totalLen))
          const pt = pathRef.current.getPointAtLength(targetDist)

          const ptAhead = pathRef.current.getPointAtLength(Math.min(totalLen, targetDist + 2))
          const angle = Math.atan2(ptAhead.y - pt.y, ptAhead.x - pt.x) * (180 / Math.PI) + 90

          pathRef.current.style.strokeDashoffset = totalLen * (1 - clampedP)

          if (tipRef.current) {
            tipRef.current.style.transform = `translate(${pt.x}px, ${pt.y}px) rotate(${angle * 0.4}deg)`
          }
        }

        // Discrete step threshold for leaf sprouts and apex petal expansion:
        // Reduces React virtual DOM reconciliation from 60 fps to only ~50 times total across the full page scroll!
        if (
          Math.abs(clampedP - lastRatioRef.current) >= 0.015 ||
          (clampedP === 0 && lastRatioRef.current !== 0) ||
          (clampedP === 1 && lastRatioRef.current !== 1)
        ) {
          lastRatioRef.current = clampedP
          setGrowthRatio(clampedP)
        }
      }

      rafId = requestAnimationFrame(updateLoop)
    }

    rafId = requestAnimationFrame(updateLoop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const handleNodeClick = (targetP) => {
    if (typeof window !== 'undefined' && window.__lenis) {
      const maxScroll = document.body.scrollHeight - window.innerHeight
      window.__lenis.scrollTo(targetP * maxScroll, { duration: 1.6 })
    }
  }

  // Calculate unrolled stroke dash (starts at bottom, grows upward)
  const totalLength = pathLengthRef.current || 500
  const strokeDashoffset = totalLength * (1 - growthRatio)

  // Helper for progressive sprout scaling
  const getSproutScale = (thresh) => {
    return Math.min(1, Math.max(0, (growthRatio - (thresh - 0.05)) / 0.09))
  }

  return (
    <aside
      ref={containerRef}
      className="rose-plant-scroller"
      aria-label="Story Progress Rose Plant"
      role="navigation"
    >
      {/* Chapter Hover Tooltip (precisely aligned with each node) */}
      {activeTooltip && (
        <div
          className="plant-tooltip"
          style={{ top: `${(activeTooltip.y / 515) * 100}%` }}
        >
          <span className="tooltip-act">{activeTooltip.label}</span>
          <span className="tooltip-sub">{activeTooltip.subtitle}</span>
        </div>
      )}

      <svg
        className="rose-plant-svg"
        viewBox="-15 0 90 515"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Active Growing Stem Botanical Gradient */}
          <linearGradient id="roseStemGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#224d29" />
            <stop offset="25%" stopColor="#357a44" />
            <stop offset="55%" stopColor="#8c1f32" />
            <stop offset="80%" stopColor="#db1d39" />
            <stop offset="100%" stopColor="#ff405d" />
          </linearGradient>

          {/* Leaf Gradients (Dark Forest Rim to Luminous Emerald Heart) */}
          <linearGradient id="leafGradLeft" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#1a3d21" />
            <stop offset="50%" stopColor="#347843" />
            <stop offset="100%" stopColor="#63c279" />
          </linearGradient>
          <linearGradient id="leafGradRight" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#1a3d21" />
            <stop offset="50%" stopColor="#347843" />
            <stop offset="100%" stopColor="#63c279" />
          </linearGradient>

          {/* Golden Pollen Core Glow */}
          <radialGradient id="pollenCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff5b8" stopOpacity="1" />
            <stop offset="55%" stopColor="#f7c844" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e89e17" stopOpacity="0" />
          </radialGradient>

          {/* Deep Velvet Rose Petal Gradient */}
          <radialGradient id="velvetPetalGrad" cx="45%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#ff5772" />
            <stop offset="45%" stopColor="#e61938" />
            <stop offset="80%" stopColor="#960d21" />
            <stop offset="100%" stopColor="#4f030d" />
          </radialGradient>

          {/* Blush Rose Petal Gradient for Side Blooms */}
          <radialGradient id="blushPetalGrad" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ff8597" />
            <stop offset="50%" stopColor="#f03050" />
            <stop offset="90%" stopColor="#a81126" />
          </radialGradient>

          {/* Glowing Aura Filter */}
          <filter id="roseGlowFilter" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Botanical Root / Soil Mound at Bottom */}
        <g className="plant-base-root" opacity="0.9">
          <ellipse cx="30" cy="503" rx="16" ry="4.5" fill="rgba(36, 4, 11, 0.85)" />
          <path d="M 23 501 Q 16 506 10 509" stroke="#25542f" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 37 501 Q 44 506 50 509" stroke="#25542f" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="30" cy="497" r="3.2" fill="#3d824b" />
        </g>

        {/* 2. Dormant Trellis Guide Stem (Shadow Path from Bottom to Top) */}
        <path
          d={vinePathD}
          stroke="rgba(245, 196, 83, 0.12)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* 3. Small Botanical Thorns along the path */}
        <g className="dormant-thorns" opacity="0.5">
          <path d="M 32 440 Q 38 438 41 433 Q 36 433 32 437 Z" fill="#4d232a" />
          <path d="M 28 360 Q 22 358 19 353 Q 24 353 28 357 Z" fill="#5c1f2b" />
          <path d="M 32 270 Q 38 268 41 263 Q 36 263 32 267 Z" fill="#751e2b" />
          <path d="M 28 175 Q 22 173 19 168 Q 24 168 28 172 Z" fill="#8c1b2c" />
          <path d="M 32 90 Q 38 88 41 83 Q 36 83 32 87 Z" fill="#a8192d" />
        </g>

        {/* 4. Active Growing Rose Stem (Animated with strokeDashoffset upward) */}
        <path
          ref={pathRef}
          d={vinePathD}
          stroke="url(#roseStemGrad)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeDasharray={totalLength}
          strokeDashoffset={strokeDashoffset}
          style={{ willChange: 'stroke-dashoffset' }}
        />

        {/* ========================================================= */}
        {/* 5. DENSE BOTANICAL FOLIAGE & LEAVES (CLIMBING UPWARD)   */}
        {/* ========================================================= */}

        {/* --- LEAF GROUP 0: Base Seedling Leaves (y ~ 475, progress ~0.04) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '30px 475px',
            opacity: growthRatio >= 0.03 ? 1 : 0,
            transform: `translate(30px, 475px) scale(${getSproutScale(0.04)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          {/* Left basal leaflet */}
          <path d="M 0 0 C -6 -4, -12 0, -15 -6 C -10 -7, -7 -10, 0 0 Z" fill="url(#leafGradLeft)" />
          {/* Right basal leaflet */}
          <path d="M 0 0 C 6 -4, 12 0, 15 -6 C 10 -7, 7 -10, 0 0 Z" fill="url(#leafGradRight)" />
          <circle cx="0" cy="0" r="1.8" fill="#a8e6b3" />
        </g>

        {/* --- LEAF GROUP 1: Early Climbing Sprig (y ~ 435, progress ~0.13) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '29.6px 435px',
            opacity: growthRatio >= 0.11 ? 1 : 0,
            transform: `translate(29.6px, 435px) scale(${getSproutScale(0.13)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          <path d="M 0 0 Q 6 -2 12 -5" stroke="#357a44" strokeWidth="1.5" fill="none" />
          <path d="M 12 -5 C 20 -10, 24 -4, 26 -14 C 20 -13, 16 -18, 12 -5 Z" fill="url(#leafGradRight)" />
          <path d="M 12 -5 Q 19 -9 25 -14" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="2.0" fill="#ffeaa7" opacity="0.8" />
        </g>

        {/* --- LEAF GROUP 2: Act I Trifoliate Cluster (y = 399, x = 28.3, progress 0.20) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '28.3px 399px',
            opacity: growthRatio >= 0.18 ? 1 : 0,
            transform: `translate(28.3px, 399px) scale(${getSproutScale(0.20)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
          onClick={() => handleNodeClick(0.20)}
          onMouseEnter={() => setActiveTooltip(STORY_NODES[1])}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          {/* Main petiole */}
          <path d="M 0 0 Q -6 -3 -12 -7" stroke="#357a44" strokeWidth="1.6" fill="none" />
          {/* Terminal Central Leaflet */}
          <path d="M -12 -7 C -21 -14, -28 -7, -30 -18 C -23 -17, -19 -23, -12 -7 Z" fill="url(#leafGradLeft)" />
          <path d="M -12 -7 Q -21 -13 -29 -18" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          {/* Lateral Top Leaflet */}
          <path d="M -8 -4 C -13 -11, -19 -9, -21 -17 C -16 -14, -13 -18, -8 -4 Z" fill="url(#leafGradLeft)" opacity="0.9" />
          {/* Lateral Bottom Leaflet */}
          <path d="M -6 -2 C -11 3, -17 2, -20 -3 C -15 -1, -13 -4, -6 -2 Z" fill="url(#leafGradLeft)" opacity="0.9" />
          {/* Dewdrop node */}
          <circle cx="0" cy="0" r="2.4" fill="#ffeaa7" />
        </g>

        {/* --- LEAF GROUP 3: Inter-node Foliage (y ~ 355, progress ~0.29) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '29.2px 355px',
            opacity: growthRatio >= 0.26 ? 1 : 0,
            transform: `translate(29.2px, 355px) scale(${getSproutScale(0.29)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          <path d="M 0 0 Q -5 -2 -11 -5" stroke="#357a44" strokeWidth="1.5" fill="none" />
          <path d="M -11 -5 C -18 -10, -22 -4, -24 -13 C -18 -12, -15 -17, -11 -5 Z" fill="url(#leafGradLeft)" />
          <path d="M -11 -5 Q -17 -9 -23 -13" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="1.8" fill="#ffeaa7" opacity="0.75" />
        </g>

        {/* ========================================================= */}
        {/* SIDE BLOOM 1: Act II Node + Rosebud (y = 312, progress 0.38) */}
        {/* ========================================================= */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '30.9px 312px',
            opacity: growthRatio >= 0.35 ? 1 : 0,
            transform: `translate(30.9px, 312px) scale(${getSproutScale(0.38)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
          onClick={() => handleNodeClick(0.38)}
          onMouseEnter={() => setActiveTooltip(STORY_NODES[2])}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          {/* Leaf pair right */}
          <path d="M 0 0 Q 5 -3 11 -6" stroke="#357a44" strokeWidth="1.6" fill="none" />
          <path d="M 11 -6 C 20 -13, 26 -6, 28 -17 C 22 -15, 18 -21, 11 -6 Z" fill="url(#leafGradRight)" />
          <path d="M 11 -6 Q 19 -12 27 -17" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <path d="M 8 -4 C 14 -10, 19 -8, 22 -15 C 17 -13, 14 -16, 8 -4 Z" fill="url(#leafGradRight)" opacity="0.88" />

          {/* Side Blooming Rosebud (Unfurls upon reaching Act II) */}
          <g
            className="side-bloom-flower"
            transform="translate(18, -12)"
            style={{
              transform: `translate(18px, -12px) scale(${Math.min(1.2, Math.max(0.6, (growthRatio - 0.34) * 2.2))})`,
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Sepal Calyx */}
            <path d="M 0 2 Q -3 6 -4 9 Q -1 5 0 2 Z" fill="#25542f" />
            <path d="M 0 2 Q 3 6 4 9 Q 1 5 0 2 Z" fill="#25542f" />
            {/* Unfurling Pink Petals */}
            <path d="M -4 1 C -7 -2, -6 -7, 0 -8 C 6 -7, 7 -2, 4 1 Z" fill="url(#blushPetalGrad)" />
            <path d="M -2.5 -1 C -4 -4, -3 -6, 0 -6.5 C 3 -6, 4 -4, 2.5 -1 Z" fill="#ff405d" />
            <circle cx="0" cy="-3" r="1.1" fill="#fff5b8" />
          </g>

          <circle cx="0" cy="0" r="2.5" fill="#ffd15c" />
        </g>

        {/* --- LEAF GROUP 4: Inter-node Foliage (y ~ 265, progress ~0.48) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '31.7px 265px',
            opacity: growthRatio >= 0.44 ? 1 : 0,
            transform: `translate(31.7px, 265px) scale(${getSproutScale(0.48)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          <path d="M 0 0 Q -6 -2 -13 -6" stroke="#357a44" strokeWidth="1.5" fill="none" />
          <path d="M -13 -6 C -21 -11, -26 -5, -28 -15 C -21 -14, -18 -19, -13 -6 Z" fill="url(#leafGradLeft)" />
          <path d="M -13 -6 Q -20 -10 -27 -15" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="2.0" fill="#ffeaa7" opacity="0.8" />
        </g>

        {/* ========================================================= */}
        {/* SIDE BLOOM 2: Act III Node + Garden Rose in Half-Bloom (y = 216, progress 0.58) */}
        {/* ========================================================= */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '29.0px 216px',
            opacity: growthRatio >= 0.54 ? 1 : 0,
            transform: `translate(29.0px, 216px) scale(${getSproutScale(0.58)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
          onClick={() => handleNodeClick(0.58)}
          onMouseEnter={() => setActiveTooltip(STORY_NODES[3])}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          {/* Dual Compound Leaf Sprigs */}
          {/* Left Sprig */}
          <path d="M -4 -1 C -14 -6, -21 -2, -24 -12 C -17 -11, -13 -16, -4 -1 Z" fill="url(#leafGradLeft)" />
          <path d="M -4 -1 Q -14 -7 -23 -12" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <path d="M -10 -5 C -18 -12, -24 -8, -27 -16 C -20 -15, -17 -18, -10 -5 Z" fill="url(#leafGradLeft)" opacity="0.85" />

          {/* Right Sprig */}
          <path d="M 4 -1 C 14 -6, 21 -2, 24 -12 C 17 -11, 13 -16, 4 -1 Z" fill="url(#leafGradRight)" />
          <path d="M 4 -1 Q 14 -7 23 -12" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <path d="M 10 -5 C 18 -12, 24 -8, 27 -16 C 20 -15, 17 -18, 10 -5 Z" fill="url(#leafGradRight)" opacity="0.85" />

          {/* Side Garden Rose in Half-Bloom (Opens at Act III) */}
          <g
            className="side-bloom-flower"
            transform="translate(-18, -14)"
            style={{
              transform: `translate(-18px, -14px) scale(${Math.min(1.35, Math.max(0.7, (growthRatio - 0.52) * 2.4))})`,
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Green calyx */}
            <path d="M 0 3 Q -5 8 -7 12 Q -1 7 0 3 Z" fill="#25542f" />
            <path d="M 0 3 Q 5 8 7 12 Q 1 7 0 3 Z" fill="#25542f" />
            {/* Outer Petals */}
            <path d="M -8 -2 C -14 -6, -11 -13, 0 -12 C 11 -13, 14 -6, 8 -2 C 4 2, -4 2, -8 -2 Z" fill="url(#velvetPetalGrad)" />
            {/* Inner Spiral Petals */}
            <path d="M -5 0 C -9 -3, -7 -8, 0 -9 C 7 -8, 9 -3, 5 0 Z" fill="#e61938" />
            <path d="M -2.5 -2 Q 0 -5 2.5 -2 Q 0 0 -2.5 -2 Z" fill="#ff405d" />
            <circle cx="0" cy="-3.5" r="1.4" fill="#fff5b8" />
          </g>

          <circle cx="0" cy="0" r="2.8" fill="#ffd15c" />
        </g>

        {/* --- LEAF GROUP 5: Inter-node Foliage (y ~ 175, progress ~0.67) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '28.3px 175px',
            opacity: growthRatio >= 0.63 ? 1 : 0,
            transform: `translate(28.3px, 175px) scale(${getSproutScale(0.67)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          <path d="M 0 0 Q 6 -2 12 -5" stroke="#357a44" strokeWidth="1.5" fill="none" />
          <path d="M 12 -5 C 20 -10, 25 -4, 27 -14 C 20 -13, 16 -18, 12 -5 Z" fill="url(#leafGradRight)" />
          <path d="M 12 -5 Q 19 -9 26 -14" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="2.0" fill="#ffeaa7" opacity="0.8" />
        </g>

        {/* ========================================================= */}
        {/* SIDE BLOOM 3: Act IV Node + Blooming Blush Rose (y = 130, progress 0.76) */}
        {/* ========================================================= */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '29.8px 130px',
            opacity: growthRatio >= 0.72 ? 1 : 0,
            transform: `translate(29.8px, 130px) scale(${getSproutScale(0.76)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
          onClick={() => handleNodeClick(0.76)}
          onMouseEnter={() => setActiveTooltip(STORY_NODES[4])}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          {/* Foliage */}
          <path d="M 0 0 Q -6 -3 -12 -6" stroke="#357a44" strokeWidth="1.6" fill="none" />
          <path d="M -12 -6 C -21 -12, -26 -5, -28 -16 C -22 -14, -18 -20, -12 -6 Z" fill="url(#leafGradLeft)" />
          <path d="M -12 -6 Q -20 -11 -27 -16" stroke="#8ae39f" strokeWidth="0.8" fill="none" />

          {/* Lush Side Blooming Rose (Unfurls at Act IV) */}
          <g
            className="side-bloom-flower"
            transform="translate(18, -12)"
            style={{
              transform: `translate(18px, -12px) scale(${Math.min(1.3, Math.max(0.65, (growthRatio - 0.70) * 2.3))})`,
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Sepals */}
            <path d="M 0 2 Q -4 6 -5 9 Q -1 5 0 2 Z" fill="#25542f" />
            <path d="M 0 2 Q 4 6 5 9 Q 1 5 0 2 Z" fill="#25542f" />
            {/* Petals */}
            <path d="M -7 -1 C -11 -5, -9 -11, 0 -10 C 9 -11, 11 -5, 7 -1 C 4 2, -4 2, -7 -1 Z" fill="url(#blushPetalGrad)" />
            <path d="M -4.5 1 C -7 -2, -6 -6, 0 -7 C 6 -6, 7 -2, 4.5 1 Z" fill="#ff2446" />
            <path d="M -2 -1 Q 0 -4 2 -1 Q 0 0 -2 -1 Z" fill="#ffe28a" />
          </g>

          <circle cx="0" cy="0" r="2.6" fill="#ffd15c" />
        </g>

        {/* --- LEAF GROUP 6: Upper Climbing Foliage (y ~ 85, progress ~0.85) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '31.4px 85px',
            opacity: growthRatio >= 0.81 ? 1 : 0,
            transform: `translate(31.4px, 85px) scale(${getSproutScale(0.85)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
        >
          <path d="M 0 0 Q -6 -2 -12 -5" stroke="#357a44" strokeWidth="1.5" fill="none" />
          <path d="M -12 -5 C -19 -10, -24 -4, -26 -14 C -19 -13, -16 -18, -12 -5 Z" fill="url(#leafGradLeft)" />
          <path d="M -12 -5 Q -19 -9 -25 -14" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="2.0" fill="#ffeaa7" opacity="0.8" />
        </g>

        {/* --- LEAF GROUP 7: Act V Summit Crown Leaves (y = 43, progress 0.94) --- */}
        <g
          className="plant-leaf-node"
          style={{
            transformOrigin: '31.5px 43px',
            opacity: growthRatio >= 0.90 ? 1 : 0,
            transform: `translate(31.5px, 43px) scale(${getSproutScale(0.94)})`,
            transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          }}
          onClick={() => handleNodeClick(0.94)}
          onMouseEnter={() => setActiveTooltip(STORY_NODES[5])}
          onMouseLeave={() => setActiveTooltip(null)}
        >
          {/* Broad Crown Foliage framing the summit blossom */}
          <path d="M -4 0 C -15 -5, -23 2, -27 -9 C -19 -8, -15 -14, -4 0 Z" fill="url(#leafGradLeft)" />
          <path d="M -4 0 Q -15 -6 -26 -9" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <path d="M 4 0 C 15 -5, 23 2, 27 -9 C 19 -8, 15 -14, 4 0 Z" fill="url(#leafGradRight)" />
          <path d="M 4 0 Q 15 -6 26 -9" stroke="#8ae39f" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="3.2" fill="#ffd15c" />
        </g>

        {/* ========================================================= */}
        {/* 6. GRAND APEX BLOOMING ROSE AT GROWTH TIP (CLIMBING UPWARD) */}
        {/* ========================================================= */}
        <g
          ref={tipRef}
          className="plant-bloom-tip"
          style={{
            transform: 'translate(30px, 495px) rotate(0deg)',
            willChange: 'transform',
          }}
        >
          {/* Multi-layered Radiance Glow Aura */}
          <circle
            cx="0"
            cy="0"
            r={14 + Math.sin(growthRatio * Math.PI) * 7}
            fill="rgba(255, 30, 66, 0.35)"
            filter="url(#roseGlowFilter)"
          />
          <circle
            cx="0"
            cy="0"
            r={8 + growthRatio * 7}
            fill="rgba(255, 209, 92, 0.45)"
            filter="url(#roseGlowFilter)"
          />

          {/* Sepals / Green Calyx underneath the grand blossom */}
          <g className="bud-calyx">
            <path d="M 0 3 Q -6 9 -9 15 Q -2 9 0 3 Z" fill="#1e4d26" />
            <path d="M 0 3 Q 6 9 9 15 Q 2 9 0 3 Z" fill="#1e4d26" />
            <path d="M 0 3 Q -10 4 -15 6 Q -8 3 0 3 Z" fill="#25542f" />
            <path d="M 0 3 Q 10 4 15 6 Q 8 3 0 3 Z" fill="#25542f" />
            <path d="M 0 3 Q 0 10 0 16 Z" stroke="#357a44" strokeWidth="1.8" />
          </g>

          {/* Grand Blooming Rose Petals (Scales and dramatically unfurls as growth increases) */}
          <g
            className="bud-petals grand-rose-head"
            style={{
              transform: `scale(${0.95 + growthRatio * 0.75})`,
              transformOrigin: '0 0',
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* LAYER 1: Outermost Wide Guard Petals (unfurl into rich blooming rose) */}
            {growthRatio > 0.18 && (
              <g className="petals-outer" opacity={Math.min(1, (growthRatio - 0.18) * 3)}>
                {/* Lower left guard petal */}
                <path
                  d="M -11 3 C -18 -3, -17 -13, -6 -14 C 2 -14, 3 -3, -4 5 Z"
                  fill="url(#velvetPetalGrad)"
                />
                {/* Lower right guard petal */}
                <path
                  d="M 11 3 C 18 -3, 17 -13, 6 -14 C -2 -14, -3 -3, 4 5 Z"
                  fill="url(#velvetPetalGrad)"
                />
                {/* Top center wide petal */}
                <path
                  d="M -10 -2 C -17 -9, -13 -20, 0 -19 C 13 -20, 17 -9, 10 -2 C 6 4, -6 4, -10 -2 Z"
                  fill="url(#velvetPetalGrad)"
                />
              </g>
            )}

            {/* LAYER 2: Intermediate Ruffled Petals */}
            {growthRatio > 0.35 && (
              <g className="petals-mid" opacity={Math.min(1, (growthRatio - 0.35) * 2.8)}>
                <path
                  d="M -8 -1 C -14 -6, -12 -15, -2 -14 C 6 -14, 7 -4, 0 2 Z"
                  fill="#d91432"
                />
                <path
                  d="M 8 -1 C 14 -6, 12 -15, 2 -14 C -6 -14, -7 -4, 0 2 Z"
                  fill="#d91432"
                />
                <path
                  d="M -6 -4 C -10 -9, -7 -16, 0 -15 C 7 -16, 10 -9, 6 -4 Z"
                  fill="#eb1a38"
                />
              </g>
            )}

            {/* LAYER 3: Classic Cupped Rose Core & Heart */}
            <path
              d="M -6 2 C -11 -3, -9 -11, 0 -12 C 9 -11, 11 -3, 6 2 C 4 5, -4 5, -6 2 Z"
              fill="url(#velvetPetalGrad)"
            />
            <path
              d="M -4 -1 C -7 -5, -6 -10, 0 -10 C 6 -10, 7 -5, 4 -1 C 3 2, -3 2, -4 -1 Z"
              fill="#e61938"
            />
            <path
              d="M -2.5 -3 C -4 -6, -3 -8, 0 -8 C 3 -8, 4 -6, 2.5 -3 Z"
              fill="#ff3b57"
            />
            <path
              d="M -1.5 -4 Q 0 -7 1.5 -4 Q 0 -2 -1.5 -4 Z"
              fill="#ff6b82"
            />

            {/* LAYER 4: Glowing Golden Pollen Core & Radiating Stamens */}
            {growthRatio > 0.45 && (
              <g className="rose-pollen-core">
                <circle
                  cx="0"
                  cy="-5"
                  r={1.8 + Math.min(2.0, (growthRatio - 0.45) * 3)}
                  fill="url(#pollenCoreGlow)"
                />
                {/* Floating Pollen Sparks */}
                <circle cx="-4" cy="-10" r="0.9" fill="#fff5b8" opacity="0.85" />
                <circle cx="5" cy="-8" r="0.8" fill="#ffd15c" opacity="0.9" />
                <circle cx="0" cy="-14" r="1.1" fill="#fff5b8" opacity="0.95" />
              </g>
            )}
          </g>
        </g>
      </svg>
    </aside>
  )
}
