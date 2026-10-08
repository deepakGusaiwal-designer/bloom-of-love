import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { playCelebrationHarmony } from './LoveMelody.jsx'

const DESTINY_MESSAGES = [
  {
    min: 98,
    title: 'Twin Flames in Eternal Bloom',
    verse:
      'Written in stardust and sealed in velvet crimson — your two souls beat in a single timeless rhythm.',
  },
  {
    min: 95,
    title: 'Destined Soulmates',
    verse:
      'Like a rose and the morning sun, your hearts awaken the deepest beauty in one another.',
  },
  {
    min: 91,
    title: 'Unbreakable Devotion',
    verse:
      'Every petal of your story unfolds with grace, warmth, and a love that only deepens with time.',
  },
]

// Deterministic, romantic high-affinity score (91% - 100%) for any couple pair
function computeLoveScore(name1, name2) {
  const a = name1.trim().toLowerCase()
  const b = name2.trim().toLowerCase()
  if (!a || !b) return 98
  const combined = [a, b].sort().join('♥')
  let hash = 2166136261
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const norm = Math.abs(hash) % 10 // 0..9
  return 91 + norm // 91% .. 100%
}

// Parametric heart curve helper for placing rose petals around the couple's names
function evalHeartPoint(t, scaleX = 235, scaleY = 185, cx = 310, cy = 245) {
  const x = 16 * Math.pow(Math.sin(t), 3)
  const y = -(
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t)
  )
  return {
    x: cx + (x / 16) * scaleX,
    y: cy + (y / 16) * scaleY,
  }
}

// Draws a single 3D-shaded velvet rose petal on a 2D canvas context
function drawCanvasRosePetal(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  // 3D tumbling illusion via oscillating X/Y scale
  const flipX = Math.cos(p.tilt) * p.scale
  const flipY = (0.62 + 0.38 * Math.abs(Math.sin(p.pitch))) * p.scale
  ctx.scale(flipX, flipY)
  ctx.globalAlpha = p.alpha

  if (p.type === 'spark') {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10)
    grad.addColorStop(0, '#fff9e6')
    grad.addColorStop(0.4, '#ffd27d')
    grad.addColorStop(1, 'rgba(255, 180, 90, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }

  if (p.type === 'heart') {
    ctx.fillStyle = p.color
    ctx.shadowColor = 'rgba(255, 50, 85, 0.65)'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(0, 5)
    ctx.bezierCurveTo(-10, -5, -14, -14, -6, -16)
    ctx.bezierCurveTo(-1, -17, 0, -11, 0, -9)
    ctx.bezierCurveTo(0, -11, 1, -17, 6, -16)
    ctx.bezierCurveTo(14, -14, 10, -5, 0, 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return
  }

  // Sculpted botanical rose petal silhouette with cleft upper lip
  const grad = ctx.createRadialGradient(0, 4, 2, 0, -4, 20)
  grad.addColorStop(0, '#59040e') // deep velvet base
  grad.addColorStop(0.48, p.color) // lush crimson body
  grad.addColorStop(0.88, p.highlight) // scarlet rim
  grad.addColorStop(1, '#ff99ac') // soft velvet edge sheen

  ctx.fillStyle = grad
  ctx.shadowColor = 'rgba(180, 10, 35, 0.45)'
  ctx.shadowBlur = 8

  ctx.beginPath()
  ctx.moveTo(0, 14) // tapered petal base
  ctx.bezierCurveTo(-14, 8, -19, -8, -9, -16)
  ctx.bezierCurveTo(-4, -19, -1, -16, 0, -13) // soft upper cleft
  ctx.bezierCurveTo(1, -16, 4, -19, 9, -16)
  ctx.bezierCurveTo(19, -8, 14, 8, 0, 14)
  ctx.closePath()
  ctx.fill()

  // Subtle central botanical vein
  ctx.strokeStyle = 'rgba(255, 190, 205, 0.25)'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.moveTo(0, 11)
  ctx.quadraticCurveTo(1, -1, 0, -11)
  ctx.stroke()

  ctx.restore()
}

export default function LoveCalculator() {
  const [partnerOne, setPartnerOne] = useState('')
  const [partnerTwo, setPartnerTwo] = useState('')
  const [result, setResult] = useState(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [blastKey, setBlastKey] = useState(0)

  const canvasRef = useRef(null)
  const cardRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  const handleCardPointerMove = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100
    const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100
    const angle =
      (Math.atan2(y - 50, x - 50) * 180) / Math.PI + 90
    el.style.setProperty('--gx', `${x.toFixed(1)}%`)
    el.style.setProperty('--gy', `${y.toFixed(1)}%`)
    el.style.setProperty('--g-angle', `${angle.toFixed(1)}deg`)
  }, [])

  const handleCardPointerLeave = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--gx', '28%')
    el.style.setProperty('--gy', '18%')
    el.style.setProperty('--g-angle', '135deg')
  }, [])

  // Precompute 24 rose petals along the SVG heart contour around the couple's names
  const wreathPetals = useMemo(() => {
    const count = 24
    const items = []
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2
      const pt = evalHeartPoint(t, 244, 190, 310, 248)
      const nextPt = evalHeartPoint(t + 0.05, 244, 190, 310, 248)
      const tangentDeg =
        (Math.atan2(nextPt.y - pt.y, nextPt.x - pt.x) * 180) / Math.PI
      items.push({
        id: i,
        x: pt.x,
        y: pt.y,
        rot: tangentDeg + 90 + ((i % 3) - 1) * 16,
        scale: 0.72 + (i % 4) * 0.11,
        delay: (i * 0.08).toFixed(2),
        shade: i % 2 === 0 ? '#e31b38' : '#ff3352',
      })
    }
    return items
  }, [])

  // Spawn a massive celebratory Rose Petals + Hearts + Gold Sparkles confetti blast
  const triggerPetalConfettiBlast = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = (canvas.width = window.innerWidth)
    const h = (canvas.height = window.innerHeight)

    const palette = [
      { color: '#c91229', highlight: '#ff2e4c' },
      { color: '#e61938', highlight: '#ff4d6a' },
      { color: '#9e0b20', highlight: '#e01e3c' },
      { color: '#ff2a4b', highlight: '#ff758f' },
    ]

    const newParticles = []
    const total = 195

    for (let i = 0; i < total; i++) {
      // Half erupt from the center-bottom cannon, half shower down from the top canopy
      const fromCannon = i < total * 0.62
      const angle = fromCannon
        ? -Math.PI / 2 + (Math.random() - 0.5) * 1.45
        : Math.PI / 2 + (Math.random() - 0.5) * 0.6
      const speed = fromCannon
        ? 9 + Math.random() * 17
        : 2 + Math.random() * 5.5

      const pal = palette[i % palette.length]
      const typeRoll = Math.random()
      const type =
        typeRoll < 0.74 ? 'petal' : typeRoll < 0.88 ? 'heart' : 'spark'

      newParticles.push({
        type,
        x: fromCannon ? w * (0.35 + Math.random() * 0.3) : Math.random() * w,
        y: fromCannon ? h * 0.68 : -20 - Math.random() * h * 0.35,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 3,
        vy: Math.sin(angle) * speed,
        gravity: 0.14 + Math.random() * 0.08,
        drag: 0.985,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.07,
        tilt: Math.random() * Math.PI * 2,
        vTilt: 0.04 + Math.random() * 0.06,
        pitch: Math.random() * Math.PI * 2,
        vPitch: 0.03 + Math.random() * 0.05,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.035 + Math.random() * 0.03,
        scale: 0.65 + Math.random() * 0.75,
        color: pal.color,
        highlight: pal.highlight,
        alpha: 1,
        decay: 0.0022 + Math.random() * 0.0025,
      })
    }

    particlesRef.current.push(...newParticles)

    if (!rafRef.current) {
      const animate = () => {
        const c = canvasRef.current
        if (!c) return
        const ctx = c.getContext('2d')
        ctx.clearRect(0, 0, c.width, c.height)

        const list = particlesRef.current
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i]
          p.vx *= p.drag
          p.vy = p.vy * p.drag + p.gravity
          p.swayPhase += p.swaySpeed
          p.x += p.vx + Math.sin(p.swayPhase) * 1.35
          p.y += p.vy
          p.rot += p.vRot + Math.cos(p.swayPhase) * 0.015
          p.tilt += p.vTilt
          p.pitch += p.vPitch

          if (p.y > c.height * 0.78) {
            p.alpha -= p.decay * 2.4
          } else {
            p.alpha -= p.decay * 0.45
          }

          if (p.alpha <= 0.01 || p.y > c.height + 60) {
            list.splice(i, 1)
            continue
          }

          drawCanvasRosePetal(ctx, p)
        }

        if (list.length > 0) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          rafRef.current = null
          ctx.clearRect(0, 0, c.width, c.height)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Animate the love percentage counter from 0% -> target%
  useEffect(() => {
    if (!result) {
      setDisplayScore(0)
      return
    }
    let frame = null
    const start = performance.now()
    const duration = 1600
    const target = result.score

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayScore(Math.round(ease * target))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      if (frame) cancelAnimationFrame(frame)
    }
  }, [result, blastKey])

  const handleCalculate = (e) => {
    e.preventDefault()
    const n1 = partnerOne.trim()
    const n2 = partnerTwo.trim()
    if (!n1 || !n2) return

    const score = computeLoveScore(n1, n2)
    const destiny =
      DESTINY_MESSAGES.find((d) => score >= d.min) ||
      DESTINY_MESSAGES[DESTINY_MESSAGES.length - 1]

    setResult({
      name1: n1,
      name2: n2,
      score,
      destiny,
    })
    setBlastKey((k) => k + 1)
    playCelebrationHarmony()
    triggerPetalConfettiBlast()
  }

  const handleReplayBlast = () => {
    setBlastKey((k) => k + 1)
    playCelebrationHarmony()
    triggerPetalConfettiBlast()
  }

  // Split a name into characters adorned with individual tiny rose petals
  const renderPetalAdornedName = (name) => {
    return (
      <span className="petal-name-word" data-text={name}>
        {Array.from(name).map((ch, idx) => (
          <span
            key={idx}
            className="petal-name-char"
            style={{ '--char-idx': idx }}
          >
            <span className="char-letter" data-text={ch}>
              {ch === ' ' ? '\u00A0' : ch}
            </span>
            {ch !== ' ' && idx % 2 === 0 && (
              <svg
                className="char-mini-petal"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 22 C4 17 2 7 7 3 C9.5 1.2 11.2 2.5 12 4.5 C12.8 2.5 14.5 1.2 17 3 C22 7 20 17 12 22 Z"
                  fill="url(#miniPetalGrad)"
                />
              </svg>
            )}
          </span>
        ))}
      </span>
    )
  }

  return (
    <div className="love-calc-wrap">
      {typeof document !== 'undefined' &&
        createPortal(
          <canvas
            ref={canvasRef}
            className="petal-confetti-canvas"
            aria-hidden="true"
          />,
          document.body
        )}

      {/* Optical SVG filter for Liquid Glass refraction & surface distortion */}
      <svg className="liquid-glass-svg-defs" aria-hidden="true">
        <defs>
          <filter
            id="liquidGlassLens"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="2"
              seed="7"
              result="liquidNoise"
            />
            <feGaussianBlur
              in="liquidNoise"
              stdDeviation="3.5"
              result="smoothLiquid"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="smoothLiquid"
              scale="16"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div
        ref={cardRef}
        className="love-calc-card liquid-glass-box"
        onPointerMove={handleCardPointerMove}
        onPointerLeave={handleCardPointerLeave}
      >
        {/* Multi-layer Liquid Glass optical stack */}
        <div className="liquid-glass-backdrop" aria-hidden="true" />
        <div className="liquid-glass-caustics" aria-hidden="true" />
        <div className="liquid-glass-meniscus" aria-hidden="true" />

        <div className="liquid-glass-content">
          <p className="eyebrow calc-eyebrow">Eternal Love Oracle</p>
          <h3 className="calc-heading">Couple Love Calculator</h3>
          <p className="calc-sub">
            Write your names below and let the rose petals reveal your destiny.
          </p>

          <form className="love-calc-form" onSubmit={handleCalculate}>
            <div className="calc-inputs-row">
              <label className="calc-input-group">
                <span className="calc-input-label">Your Name</span>
                <input
                  type="text"
                  className="calc-input"
                  placeholder="e.g. Romeo"
                  value={partnerOne}
                  maxLength={24}
                  onChange={(e) => setPartnerOne(e.target.value)}
                  required
                />
              </label>

              <span className="calc-heart-divider" aria-hidden="true">
                ♥
              </span>

              <label className="calc-input-group">
                <span className="calc-input-label">Beloved’s Name</span>
                <input
                  type="text"
                  className="calc-input"
                  placeholder="e.g. Juliet"
                  value={partnerTwo}
                  maxLength={24}
                  onChange={(e) => setPartnerTwo(e.target.value)}
                  required
                />
              </label>
            </div>

            <button type="submit" className="calc-submit-btn">
              <span>Bloom Our Love</span>
              <span className="btn-heart" aria-hidden="true">
                ♥
              </span>
            </button>
          </form>

          {result && (
            <div key={blastKey} className="couple-shrine">
              {/* Animated Heart Wreath & Rose Petals Frame Around Their Names */}
              <div className="couple-heart-stage">
                <svg
                  className="couple-heart-svg"
                  viewBox="0 0 620 500"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="heartStrokeGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#ff2a4d" />
                      <stop offset="35%" stopColor="#ff94b2" />
                      <stop offset="50%" stopColor="#ffe299" />
                      <stop offset="70%" stopColor="#ff4769" />
                      <stop offset="100%" stopColor="#b80d27" />
                    </linearGradient>

                    <linearGradient
                      id="miniPetalGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#ff4769" />
                      <stop offset="55%" stopColor="#d41432" />
                      <stop offset="100%" stopColor="#6e0515" />
                    </linearGradient>

                    <filter
                      id="heartGlowFilter"
                      x="-20%"
                      y="-20%"
                      width="140%"
                      height="140%"
                    >
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feComposite
                        in="SourceGraphic"
                        in2="blur"
                        operator="over"
                      />
                    </filter>

                    {/* Reusable sculpted rose petal symbol for the heart wreath */}
                    <g id="wreathRosePetal">
                      <path
                        d="M0 13 C-11 8 -14 -5 -6 -12 C-2.5 -14.5 -0.6 -12 0 -9.5 C0.6 -12 2.5 -14.5 6 -12 C14 -5 11 8 0 13 Z"
                        fill="url(#miniPetalGrad)"
                      />
                      <path
                        d="M0 10 Q1 0 0 -8"
                        stroke="rgba(255, 205, 215, 0.35)"
                        strokeWidth="0.8"
                        fill="none"
                      />
                    </g>
                  </defs>

                  {/* Soft outer pulsing crimson aura */}
                  <path
                    className="heart-aura-path"
                    d="M 310 112 C 255 32, 105 46, 75 168 C 46 286, 195 376, 310 456 C 425 376, 574 286, 545 168 C 515 46, 365 32, 310 112 Z"
                    stroke="rgba(255, 50, 85, 0.25)"
                    strokeWidth="8"
                    filter="url(#heartGlowFilter)"
                  />

                  {/* Main animated drawing heart outline around their names */}
                  <path
                    className="heart-draw-path"
                    d="M 310 112 C 255 32, 105 46, 75 168 C 46 286, 195 376, 310 456 C 425 376, 574 286, 545 168 C 515 46, 365 32, 310 112 Z"
                    stroke="url(#heartStrokeGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    filter="url(#heartGlowFilter)"
                  />

                  {/* Traveling specular gold-white shine beam orbiting the heart */}
                  <path
                    className="heart-shine-beam"
                    d="M 310 112 C 255 32, 105 46, 75 168 C 46 286, 195 376, 310 456 C 425 376, 574 286, 545 168 C 515 46, 365 32, 310 112 Z"
                    stroke="#fff6dc"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                  />

                  {/* 24 Velvet Rose Petals framing the heart contour around the couple's names */}
                  {wreathPetals.map((wp) => (
                    <g
                      key={wp.id}
                      className="wreath-petal-node"
                      style={{
                        transform: `translate(${wp.x}px, ${wp.y}px) rotate(${wp.rot}deg) scale(${wp.scale})`,
                        animationDelay: `${wp.delay}s`,
                      }}
                    >
                      <use href="#wreathRosePetal" />
                    </g>
                  ))}
                </svg>

                {/* Couple's Names inside the Animated Rose-Petal Heart */}
                <div className="couple-names-inner">
                  <div className="petal-names-lockup">
                    {renderPetalAdornedName(result.name1)}
                    <span className="couple-ampersand-heart" aria-hidden="true">
                      ♥
                    </span>
                    {renderPetalAdornedName(result.name2)}
                  </div>

                  <div className="love-score-pill">
                    <span className="score-number">{displayScore}%</span>
                    <span className="score-label">{result.destiny.title}</span>
                  </div>

                  <p className="couple-destiny-verse">“{result.destiny.verse}”</p>
                </div>
              </div>

              <div className="shrine-actions">
                <button
                  type="button"
                  className="replay-blast-btn"
                  onClick={handleReplayBlast}
                >
                  <span>Shower Rose Petals Again</span>
                  <span aria-hidden="true">❀</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
