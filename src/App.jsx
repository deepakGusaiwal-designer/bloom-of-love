import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import Experience from './Experience.jsx'
import Overlay from './Overlay.jsx'
import LoveMelody from './LoveMelody.jsx'
import { story, ramp, BEATS } from './scroll.js'

gsap.registerPlugin(ScrollTrigger)

const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debug')
const MODEL_URL = '/models/rose.glb'

export default function App() {
  const [modelState, setModelState] = useState('checking') // checking | ready | missing
  const [sceneReady, setSceneReady] = useState(false)
  const handleSceneReady = useCallback(() => setSceneReady(true), [])
  const dreamRef = useRef(null)
  const flareRef = useRef(null)
  const raysRef = useRef(null)
  const growthRef = useRef(null)
  const budmarkRef = useRef(null)

  // Does the rose model exist?
  useEffect(() => {
    let alive = true
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((r) => {
        if (!alive) return
        const type = r.headers.get('content-type') || ''
        // Vite dev server returns index.html for unknown paths — guard against that.
        const looksLikeModel = r.ok && !type.includes('text/html')
        setModelState(looksLikeModel ? 'ready' : 'missing')
      })
      .catch(() => alive && setModelState('missing'))
    return () => {
      alive = false
    }
  }, [])

  // Smooth scroll + master progress
  useLayoutEffect(() => {
    if (modelState !== 'ready') return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lenis = reduced
      ? null
      : new Lenis({ lerp: 0.065, wheelMultiplier: 0.85, smoothWheel: true, syncTouch: true })

    const onTick = (time) => lenis?.raf(time * 1000)
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(onTick)
      gsap.ticker.lagSmoothing(0)
    }

    const master = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        story.progress = self.progress
        story.velocity = self.getVelocity() / 4000

        // DOM atmosphere is cheap enough to drive directly here
        const p = self.progress
        if (dreamRef.current)
          dreamRef.current.style.opacity = ramp(p, [
            [BEATS.blush + 0.06, 0],
            [0.97, 0.85],
          ])
        if (flareRef.current)
          flareRef.current.style.opacity = ramp(p, [
            [BEATS.bloom + 0.01, 0],
            [BEATS.bloom + 0.05, 0.75],
            [BEATS.bloom + 0.12, 0],
          ])
        if (raysRef.current)
          raysRef.current.style.opacity = ramp(p, [
            [BEATS.awaken + 0.08, 0],
            [BEATS.bloom + 0.06, 1],
            [BEATS.eternal, 0.35],
          ])
        if (growthRef.current) growthRef.current.style.height = `${p * 100}%`
        if (budmarkRef.current) {
          budmarkRef.current.style.top = `${p * 100}%`
          const s = 1 + ramp(p, [[0.5, 0], [1, 0.9]])
          budmarkRef.current.style.transform = `translate(-50%, -50%) scale(${s})`
        }
      },
    })

    // Helper to group inline-block word spans into visual lines by vertical offset
    const groupWordsIntoLines = (wordElements) => {
      const lines = []
      let currentLine = []
      let currentTop = null

      wordElements.forEach((word) => {
        const top = word.offsetTop
        if (currentTop === null || Math.abs(top - currentTop) <= 6) {
          currentLine.push(word)
          if (currentTop === null) currentTop = top
        } else {
          lines.push(currentLine)
          currentLine = [word]
          currentTop = top
        }
      })
      if (currentLine.length) lines.push(currentLine)
      return lines
    }

    // Rich GSAP text choreography per section (slower, poetic pacing + line-by-line paragraph fade)
    const timelines = []
    const loopTweens = []

    gsap.utils.toArray('.reveal').forEach((el) => {
      const chars = el.querySelectorAll('.char')
      const subWords = el.querySelectorAll('.sub-word')
      const quoteWords = el.querySelectorAll('.quote-word')
      const quoteCite = el.querySelector('.quote-cite')
      const bodyWords = el.querySelectorAll('.body-word')
      const loveNote = el.querySelector('.love-note')
      const noteWords = el.querySelectorAll('.note-word')
      const tags = el.querySelectorAll('.tag-item')
      const sigText = el.querySelector('.sig-text')
      const sigHeart = el.querySelector('.sig-heart')

      // Measure visual lines while words are in their natural layout position
      const bodyLines = groupWordsIntoLines(bodyWords)
      const noteLines = groupWordsIntoLines(noteWords)

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          end: 'bottom 15%',
          toggleActions: 'play none none reverse',
        },
      })

      // 1. Eyebrow — crisp character-by-character 3D wave
      if (chars.length) {
        tl.fromTo(
          chars,
          { opacity: 0, y: 16, rotateY: 55, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            filter: 'blur(0px)',
            duration: 0.75,
            stagger: 0.024,
            ease: 'back.out(1.6)',
          },
          0
        )
      }

      // 2. Title (Rochester) — sequential handwritten quill stroke + ink fill + specular shine + nib spark
      const wordMasks = el.querySelectorAll('.word-mask')
      let afterTitleCursor = 0.24
      if (wordMasks.length) {
        let writeCursor = 0.12
        wordMasks.forEach((mask) => {
          const wordEl = mask.querySelector('.title-word')
          const wordLen = Math.max(2, (wordEl?.textContent || '').trim().length)
          const dur = 0.26 + wordLen * 0.062
          const proxy = { p: 0 }

          // Initial hidden state
          mask.style.setProperty('--write', '-14%')
          mask.style.setProperty('--shine', '-28%')
          mask.style.setProperty('--shine-alpha', '0')
          mask.style.setProperty('--nib-alpha', '0')

          tl.fromTo(
            mask,
            { y: 9, rotateZ: -2.4 },
            { y: 0, rotateZ: 0, duration: dur, ease: 'power2.out' },
            writeCursor
          )

          tl.fromTo(
            proxy,
            { p: 0 },
            {
              p: 1,
              duration: dur,
              ease: 'sine.inOut',
              onUpdate: () => {
                const p = proxy.p
                const writePct = -14 + p * 152
                const shinePct = -24 + p * 148
                const activeAlpha = p <= 0.01 || p >= 0.99 ? 0 : Math.sin(p * Math.PI)
                const nibX = p * 100
                const nibY = 54 + Math.sin(p * Math.PI * wordLen * 1.2) * 20
                mask.style.setProperty('--write', `${writePct.toFixed(1)}%`)
                mask.style.setProperty('--shine', `${shinePct.toFixed(1)}%`)
                mask.style.setProperty('--shine-alpha', activeAlpha.toFixed(3))
                mask.style.setProperty('--nib-x', `${nibX.toFixed(1)}%`)
                mask.style.setProperty('--nib-y', `${nibY.toFixed(1)}%`)
                mask.style.setProperty('--nib-alpha', activeAlpha.toFixed(3))
              },
            },
            writeCursor
          )

          // Finishing shimmer sweep across each word right as the title finishes writing
          const sweepProxy = { s: 0 }
          tl.fromTo(
            sweepProxy,
            { s: 0 },
            {
              s: 1,
              duration: 0.45,
              ease: 'power2.inOut',
              onUpdate: () => {
                const s = sweepProxy.s
                const shinePct = -26 + s * 152
                const alpha = s <= 0.01 || s >= 0.99 ? 0 : Math.sin(s * Math.PI) * 0.95
                mask.style.setProperty('--shine', `${shinePct.toFixed(1)}%`)
                mask.style.setProperty('--shine-alpha', alpha.toFixed(3))
              },
            },
            writeCursor + dur * 0.72
          )

          writeCursor += dur * 0.76
        })
        // Bottom text follows smoothly right as the handwritten title finishes
        afterTitleCursor = writeCursor + 0.12
      }

      // 3. Hero subtitle — starts ONLY after handwritten title finishes
      if (subWords.length) {
        tl.fromTo(
          subWords,
          { opacity: 0, y: 24, skewX: -10, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            skewX: 0,
            filter: 'blur(0px)',
            duration: 1.25,
            stagger: 0.075,
            ease: 'power3.out',
          },
          afterTitleCursor
        )
        afterTitleCursor += 0.55 + subWords.length * 0.075
      }

      // 4. Blockquote & Citation (Act IV)
      if (quoteWords.length) {
        tl.fromTo(
          quoteWords,
          { opacity: 0, y: 34, rotateX: -45, filter: 'blur(10px)' },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            filter: 'blur(0px)',
            duration: 1.4,
            stagger: 0.085,
            ease: 'expo.out',
          },
          0.25
        )
        afterTitleCursor = 0.25 + quoteWords.length * 0.085 + 0.65
      }
      if (quoteCite) {
        tl.fromTo(
          quoteCite,
          { opacity: 0, y: 14, letterSpacing: '0.75em' },
          {
            opacity: 1,
            y: 0,
            letterSpacing: '0.38em',
            duration: 1.2,
            ease: 'power3.out',
          },
          afterTitleCursor - 0.45
        )
      }

      // 5. Body paragraphs — line-by-line fade starts ONLY after title/quote finishes
      const bodyStart = afterTitleCursor
      if (bodyLines.length) {
        bodyLines.forEach((lineWords, lineIdx) => {
          tl.fromTo(
            lineWords,
            { opacity: 0, y: 24, filter: 'blur(6px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 1.3,
              ease: 'power3.out',
            },
            bodyStart + lineIdx * 0.28
          )
        })
      }

      // 6. Love note — border fade + line-by-line romantic fade (starts after body lines)
      const noteStart = bodyStart + bodyLines.length * 0.28 + 0.25
      if (loveNote) {
        tl.fromTo(
          loveNote,
          { borderColor: 'rgba(242, 184, 198, 0)' },
          { borderColor: 'rgba(242, 184, 198, 0.45)', duration: 1.35, ease: 'power2.out' },
          noteStart
        )
      }
      if (noteLines.length) {
        noteLines.forEach((lineWords, lineIdx) => {
          tl.fromTo(
            lineWords,
            { opacity: 0, y: 20, x: -10, filter: 'blur(6px)' },
            {
              opacity: 1,
              y: 0,
              x: 0,
              filter: 'blur(0px)',
              duration: 1.25,
              ease: 'power3.out',
            },
            noteStart + 0.08 + lineIdx * 0.28
          )
        })
      }

      // 7. Love tags — slow elastic pop
      if (tags.length) {
        tl.fromTo(
          tags,
          { opacity: 0, scale: 0.6, y: 14 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.1,
            stagger: 0.12,
            ease: 'back.out(2)',
          },
          noteStart
        )
      }

      // 8. Finale signature & pulsing heart
      if (sigText) {
        tl.fromTo(
          sigText,
          { opacity: 0, clipPath: 'inset(0 100% 0 0)', y: 12 },
          {
            opacity: 1,
            clipPath: 'inset(0 0% 0 0)',
            y: 0,
            duration: 2.1,
            ease: 'power2.inOut',
          },
          noteStart + 0.1
        )
      }
      if (sigHeart) {
        tl.fromTo(
          sigHeart,
          { opacity: 0, scale: 0 },
          { opacity: 1, scale: 1, duration: 0.95, ease: 'elastic.out(1.2, 0.5)' },
          noteStart + 1.95
        )
        const beat = gsap.to(sigHeart, {
          scale: 1.24,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
        loopTweens.push(beat)
      }

      timelines.push(tl)
    })

    let resizeTimer = null
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh()
      }, 150)
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(resizeTimer)
      gsap.ticker.remove(onTick)
      master.kill()
      timelines.forEach((tl) => {
        tl.scrollTrigger?.kill()
        tl.kill()
      })
      loopTweens.forEach((tw) => tw.kill())
      lenis?.destroy()
    }
  }, [modelState])

  const isMobileOr4K =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 ||
      window.innerWidth >= 2560 ||
      window.matchMedia?.('(pointer: coarse)').matches)

  return (
    <>
      <Leva hidden={!DEBUG} collapsed />

      <div className="stage">
        {modelState === 'ready' && (
          <Canvas
            dpr={isMobileOr4K ? [1, 1.5] : [1, 2]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            camera={{ fov: 36, near: 0.1, far: 60, position: [-0.65, 1.56, 3.23] }}
          >
            <Experience modelUrl={MODEL_URL} onReady={handleSceneReady} />
          </Canvas>
        )}
      </div>

      <div className="dream" ref={dreamRef} />
      <div className="rays" ref={raysRef} />
      <div className="flare" ref={flareRef} />
      <div className="vignette-css" />

      <div className="stem-progress" aria-hidden="true">
        <div className="growth" ref={growthRef} />
        <div className="budmark" ref={budmarkRef} />
      </div>

      <LoveMelody />

      <Overlay />

      <div className={`veil ${sceneReady ? 'hidden' : ''}`}>
        <span>something is about to bloom…</span>
      </div>
    </>
  )
}
