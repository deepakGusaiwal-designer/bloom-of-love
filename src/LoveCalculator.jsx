import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { playCelebrationHarmony } from './LoveMelody.jsx'
import CrystalizedBall from './CrystalizedBall.jsx'

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

// Pre-rendered offscreen sprite cache so confetti blast uses fast GPU ctx.drawImage (zero per-frame shadowBlur/gradients)
let cachedSprites = null

function getConfettiSprites() {
  if (cachedSprites || typeof document === 'undefined') return cachedSprites

  const palette = [
    { color: '#c91229', highlight: '#ff1e42', tip: '#ffd76a' },
    { color: '#e61938', highlight: '#ff3355', tip: '#ffe49e' },
    { color: '#d49a2a', highlight: '#f5c453', tip: '#fff2bd' },
    { color: '#a80d22', highlight: '#e61938', tip: '#f5b942' },
  ]

  const createSprite = (drawFn) => {
    const c = document.createElement('canvas')
    c.width = 48
    c.height = 48
    const ctx = c.getContext('2d')
    ctx.translate(24, 24)
    drawFn(ctx)
    return c
  }

  const petals = palette.map((pal) =>
    createSprite((ctx) => {
      const grad = ctx.createRadialGradient(0, 4, 2, 0, -4, 19)
      grad.addColorStop(0, '#59040e')
      grad.addColorStop(0.48, pal.color)
      grad.addColorStop(0.86, pal.highlight)
      grad.addColorStop(1, pal.tip)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(0, 14)
      ctx.bezierCurveTo(-14, 8, -19, -8, -9, -16)
      ctx.bezierCurveTo(-4, -19, -1, -16, 0, -13)
      ctx.bezierCurveTo(1, -16, 4, -19, 9, -16)
      ctx.bezierCurveTo(19, -8, 14, 8, 0, 14)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 218, 130, 0.35)'
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(0, 11)
      ctx.quadraticCurveTo(1, -1, 0, -11)
      ctx.stroke()
    })
  )

  const hearts = palette.map((pal) =>
    createSprite((ctx) => {
      ctx.fillStyle = pal.highlight
      ctx.beginPath()
      ctx.moveTo(0, 5)
      ctx.bezierCurveTo(-10, -5, -14, -14, -6, -16)
      ctx.bezierCurveTo(-1, -17, 0, -11, 0, -9)
      ctx.bezierCurveTo(0, -11, 1, -17, 6, -16)
      ctx.bezierCurveTo(14, -14, 10, -5, 0, 5)
      ctx.closePath()
      ctx.fill()
    })
  )

  const spark = createSprite((ctx) => {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10)
    grad.addColorStop(0, '#fff9e6')
    grad.addColorStop(0.4, '#ffd27d')
    grad.addColorStop(1, 'rgba(255, 180, 90, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()
  })

  cachedSprites = { petals, hearts, spark }
  return cachedSprites
}

export default function LoveCalculator() {
  const [partnerOne, setPartnerOne] = useState('')
  const [partnerTwo, setPartnerTwo] = useState('')
  const [result, setResult] = useState(null)
  const [blastKey, setBlastKey] = useState(0)

  const canvasRef = useRef(null)
  const scoreNumRef = useRef(null)
  const ballSectionRef = useRef(null)
  const particlesRef = useRef([])
  const rafRef = useRef(null)

  // Fast, hardware-accelerated sprite confetti blast (reduced petal count for smooth experience)
  const triggerPetalConfettiBlast = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sprites = getConfettiSprites()
    if (!sprites) return

    const w = (canvas.width = window.innerWidth)
    const h = (canvas.height = window.innerHeight)
    canvas.style.display = 'block'

    const isSmall = typeof window !== 'undefined' && window.innerWidth < 768
    const total = isSmall ? 80 : 130
    const newParticles = []

    const spawnWave = (count, delayOffsetY = 0) => {
      for (let i = 0; i < count; i++) {
        const fromCannon = i < count * 0.65
        const angle = fromCannon
          ? -Math.PI / 2 + (Math.random() - 0.5) * 1.55
          : Math.PI / 2 + (Math.random() - 0.5) * 0.7
        const speed = fromCannon
          ? 9 + Math.random() * 18
          : 2.5 + Math.random() * 6

        const shadeIdx = i % 4
        const typeRoll = Math.random()
        const sprite =
          typeRoll < 0.78
            ? sprites.petals[shadeIdx]
            : typeRoll < 0.90
              ? sprites.hearts[shadeIdx]
              : sprites.spark

        newParticles.push({
          sprite,
          x: fromCannon ? w * (0.32 + Math.random() * 0.36) : Math.random() * w,
          y: fromCannon ? h * 0.72 - delayOffsetY : -30 - Math.random() * h * 0.4 - delayOffsetY,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 3.2,
          vy: Math.sin(angle) * speed,
          gravity: 0.14 + Math.random() * 0.08,
          drag: 0.985,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.075,
          tilt: Math.random() * Math.PI * 2,
          vTilt: 0.045 + Math.random() * 0.06,
          pitch: Math.random() * Math.PI * 2,
          vPitch: 0.035 + Math.random() * 0.05,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.032 + Math.random() * 0.03,
          scale: 0.65 + Math.random() * 0.78,
          alpha: 1,
          decay: 0.0024 + Math.random() * 0.0028,
        })
      }
    }

    spawnWave(total)
    // Cascading secondary burst from above for an ongoing romantic shower
    spawnWave(Math.round(total * 0.35), 60)

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
          p.x += p.vx + Math.sin(p.swayPhase) * 1.25
          p.y += p.vy
          p.rot += p.vRot + Math.cos(p.swayPhase) * 0.014
          p.tilt += p.vTilt
          p.pitch += p.vPitch

          if (p.y > c.height * 0.78) {
            p.alpha -= p.decay * 2.4
          } else {
            p.alpha -= p.decay * 0.45
          }

          if (p.alpha <= 0.015 || p.y > c.height + 50) {
            list.splice(i, 1)
            continue
          }

          const flipX = Math.cos(p.tilt) * p.scale
          const flipY = (0.62 + 0.38 * Math.abs(Math.sin(p.pitch))) * p.scale
          const cosR = Math.cos(p.rot)
          const sinR = Math.sin(p.rot)

          ctx.globalAlpha = p.alpha
          ctx.setTransform(
            cosR * flipX,
            sinR * flipX,
            -sinR * flipY,
            cosR * flipY,
            p.x,
            p.y
          )
          ctx.drawImage(p.sprite, -24, -24, 48, 48)
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1

        if (list.length > 0) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          rafRef.current = null
          ctx.clearRect(0, 0, c.width, c.height)
          c.style.display = 'none'
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

  // Animate the love percentage counter directly via DOM ref & smoothly scroll to the Crystalized Ball section
  useEffect(() => {
    if (!result) return

    // Refresh ScrollTrigger & Lenis bounds after the Crystalized Ball section mounts, then scroll to it
    const refreshId = requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      const el = ballSectionRef.current
      if (!el) return
      const lenis = typeof window !== 'undefined' ? window.__lenis : null
      if (lenis) {
        lenis.resize()
        lenis.scrollTo(el, { offset: -20, duration: 1.15 })
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })

    let frame = null
    const start = performance.now()
    const duration = 1400
    const target = result.score

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      if (scoreNumRef.current) {
        scoreNumRef.current.textContent = `${Math.round(ease * target)}%`
      }
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(refreshId)
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
    setTimeout(() => {
      triggerPetalConfettiBlast()
    }, 650)
  }

  const handleReplayBlast = () => {
    setBlastKey((k) => k + 1)
    playCelebrationHarmony()
    triggerPetalConfettiBlast()
    setTimeout(() => {
      triggerPetalConfettiBlast()
    }, 650)
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
                  fill="#e61e3d"
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
            style={{ display: 'none' }}
            aria-hidden="true"
          />,
          document.body
        )}

      <div className="love-calc-card liquid-glass-box">
        {/* Lightweight GPU-composited Liquid Glass layers (zero SVG displacement filters) */}
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
            <div
              id="crystalized-ball-section"
              ref={ballSectionRef}
              className="couple-shrine"
            >
              {/* React Bits Crystalized Ball framing the couple's names & love score */}
              <div className="couple-ball-stage">
                <CrystalizedBall
                  preset="plasma"
                  color="#ff1e42"
                  size={0.90}
                  className="couple-crystal-ball"
                />

                {/* Couple's Names inside the Crystalized Ball */}
                <div key={blastKey} className="couple-names-inner">
                  <div className="petal-names-lockup">
                    {renderPetalAdornedName(result.name1)}
                    <span className="couple-ampersand-heart" aria-hidden="true">
                      ♥
                    </span>
                    {renderPetalAdornedName(result.name2)}
                  </div>

                  <div className="love-score-pill">
                    <span ref={scoreNumRef} className="score-number">
                      {result.score}%
                    </span>
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
