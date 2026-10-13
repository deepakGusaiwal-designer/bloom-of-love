import React, { useCallback, useEffect, useRef, useState } from 'react'

// MIDI note to frequency (Hz)
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Romantic waltz / ballad progression in F Major / D Minor:
// Each step has a bass note, warm pad chord, and a delicate music-box / piano melody phrase
const LOVE_PROGRESSION = [
  // Bar 1: Fmaj9 (F3, A3, C4, E4, G4)
  {
    bass: 53,
    pad: [60, 64, 69],
    melody: [
      { note: 72, time: 0.0, dur: 1.4, vel: 0.85 }, // C5
      { note: 76, time: 0.65, dur: 1.4, vel: 0.78 }, // E5
      { note: 77, time: 1.3, dur: 1.8, vel: 0.92 }, // F5
      { note: 81, time: 2.05, dur: 2.1, vel: 0.95 }, // A5
      { note: 79, time: 3.0, dur: 1.5, vel: 0.80 }, // G5
    ],
  },
  // Bar 2: C/E -> A7sus4/E (E3, G3, C4, E4)
  {
    bass: 52,
    pad: [60, 64, 67],
    melody: [
      { note: 76, time: 0.0, dur: 1.6, vel: 0.88 }, // E5
      { note: 72, time: 0.7, dur: 1.4, vel: 0.72 }, // C5
      { note: 74, time: 1.4, dur: 1.5, vel: 0.82 }, // D5
      { note: 79, time: 2.1, dur: 1.9, vel: 0.90 }, // G5
      { note: 76, time: 3.1, dur: 1.4, vel: 0.75 }, // E5
    ],
  },
  // Bar 3: Dm9 (D3, A3, C4, E4, F4)
  {
    bass: 50,
    pad: [57, 62, 65],
    melody: [
      { note: 77, time: 0.0, dur: 1.6, vel: 0.90 }, // F5
      { note: 74, time: 0.68, dur: 1.4, vel: 0.76 }, // D5
      { note: 69, time: 1.35, dur: 1.5, vel: 0.72 }, // A4
      { note: 72, time: 2.05, dur: 1.6, vel: 0.85 }, // C5
      { note: 76, time: 2.85, dur: 1.6, vel: 0.88 }, // E5
    ],
  },
  // Bar 4: Bbmaj7 -> C7sus4 (Bb2, F3, A3, D4)
  {
    bass: 46,
    pad: [58, 62, 65],
    melody: [
      { note: 74, time: 0.0, dur: 1.8, vel: 0.92 }, // D5
      { note: 72, time: 0.85, dur: 1.4, vel: 0.80 }, // C5
      { note: 69, time: 1.6, dur: 1.5, vel: 0.78 }, // A4
      { note: 72, time: 2.35, dur: 1.4, vel: 0.84 }, // C5
      { note: 79, time: 3.05, dur: 1.6, vel: 0.86 }, // G5
    ],
  },
]

let sharedAudio = {
  ctx: null,
  masterGain: null,
  melodyGain: null,
  reverbNode: null,
  isPlaying: false,
}

function createLushReverb(ctx) {
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * 3.2)
  const impulse = ctx.createBuffer(2, length, sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      const t = i / length
      const env = Math.pow(1 - t, 2.6)
      data[i] = (Math.random() * 2 - 1) * env * 0.45
    }
  }
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

function ensureAudioGraph() {
  if (sharedAudio.ctx) return sharedAudio.ctx
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null

  const ctx = new AudioCtx()
  const masterGain = ctx.createGain()
  masterGain.gain.value = 0.26

  const melodyGain = ctx.createGain()
  melodyGain.gain.value = 1.0
  melodyGain.connect(masterGain)

  const reverb = createLushReverb(ctx)
  const wetGain = ctx.createGain()
  wetGain.gain.value = 0.6

  masterGain.connect(ctx.destination)
  masterGain.connect(reverb)
  reverb.connect(wetGain)
  wetGain.connect(ctx.destination)

  sharedAudio.ctx = ctx
  sharedAudio.masterGain = masterGain
  sharedAudio.melodyGain = melodyGain
  sharedAudio.reverbNode = reverb
  return ctx
}

// Plays a celebratory romantic harp / celesta glissando when the Love Calculator blasts petals
export function playCelebrationHarmony() {
  try {
    const ctx = ensureAudioGraph()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Sparkling Fmaj9 harp glissando
    const harpNotes = [65, 69, 72, 76, 77, 81, 84, 88, 89, 93]
    const now = ctx.currentTime
    harpNotes.forEach((midi, idx) => {
      const start = now + idx * 0.065
      const dur = 2.2
      const osc = ctx.createOscillator()
      const bell = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(midiToFreq(midi), start)
      bell.type = 'triangle'
      bell.frequency.setValueAtTime(midiToFreq(midi + 12), start)

      const bellGain = ctx.createGain()
      bellGain.gain.setValueAtTime(0.18, start)
      bellGain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(0.16, start + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0008, start + dur)

      osc.connect(gain)
      bell.connect(bellGain)
      bellGain.connect(gain)
      gain.connect(sharedAudio.masterGain)

      osc.start(start)
      bell.start(start)
      osc.stop(start + dur + 0.05)
      bell.stop(start + dur + 0.05)
    })
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

// Heart path centered in a 36x36 viewBox
const HEART_PATH =
  'M18 31.2 C18 31.2 4.5 22.4 4.5 12.6 C4.5 7.9 8.2 4.5 12.6 4.5 C15.3 4.5 16.9 5.9 18 7.6 C19.1 5.9 20.7 4.5 23.4 4.5 C27.8 4.5 31.5 7.9 31.5 12.6 C31.5 22.4 18 31.2 18 31.2 Z'

export default function LoveMelody() {
  const [playing, setPlaying] = useState(() => Boolean(sharedAudio.isPlaying))
  const barIdxRef = useRef(0)
  const timerRef = useRef(null)
  const activeNodesRef = useRef([])
  const userInteractedWithBtnRef = useRef(false)

  const clearScheduledNodes = useCallback(() => {
    const nodes = activeNodesRef.current
    activeNodesRef.current = []
    nodes.forEach((node) => {
      try {
        node.stop()
      } catch {
        // already stopped
      }
      try {
        node.disconnect()
      } catch {
        // ignore
      }
    })
  }, [])

  const scheduleBar = useCallback(() => {
    const ctx = sharedAudio.ctx
    const melodyBus = sharedAudio.melodyGain
    if (!ctx || !melodyBus || !sharedAudio.isPlaying) return

    const bar = LOVE_PROGRESSION[barIdxRef.current % LOVE_PROGRESSION.length]
    barIdxRef.current += 1
    const now = ctx.currentTime + 0.05
    const barDuration = 3.9

    const registerOsc = (osc) => {
      activeNodesRef.current.push(osc)
      osc.onended = () => {
        const idx = activeNodesRef.current.indexOf(osc)
        if (idx !== -1) activeNodesRef.current.splice(idx, 1)
      }
    }

    // 1. Warm acoustic bass note
    {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(midiToFreq(bar.bass), now)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(340, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.20, now + 0.18)
      gain.gain.exponentialRampToValueAtTime(0.001, now + barDuration)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(melodyBus)
      osc.start(now)
      osc.stop(now + barDuration + 0.1)
      registerOsc(osc)
    }

    // 2. Soft lush string pad chord
    bar.pad.forEach((midi, i) => {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(midiToFreq(midi), now)
      osc.detune.setValueAtTime((i - 1) * 4, now)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(900, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.065, now + 0.85)
      gain.gain.exponentialRampToValueAtTime(0.001, now + barDuration + 0.4)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(melodyBus)
      osc.start(now)
      osc.stop(now + barDuration + 0.5)
      registerOsc(osc)
    })

    // 3. Delicate piano / music-box love melody notes
    bar.melody.forEach((m) => {
      const start = now + m.time
      const dur = m.dur
      const freq = midiToFreq(m.note)

      const osc1 = ctx.createOscillator()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, start)

      const osc2 = ctx.createOscillator()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(freq * 2, start)

      const overtoneGain = ctx.createGain()
      overtoneGain.gain.setValueAtTime(0.12 * m.vel, start)
      overtoneGain.gain.exponentialRampToValueAtTime(0.0005, start + 0.38)

      const noteGain = ctx.createGain()
      const peak = 0.15 * m.vel
      noteGain.gain.setValueAtTime(0.0001, start)
      noteGain.gain.linearRampToValueAtTime(peak, start + 0.028)
      noteGain.gain.exponentialRampToValueAtTime(peak * 0.42, start + 0.35)
      noteGain.gain.exponentialRampToValueAtTime(0.0008, start + dur)

      osc1.connect(noteGain)
      osc2.connect(overtoneGain)
      overtoneGain.connect(noteGain)
      noteGain.connect(melodyBus)

      osc1.start(start)
      osc2.start(start)
      osc1.stop(start + dur + 0.08)
      osc2.stop(start + dur + 0.08)
      registerOsc(osc1)
      registerOsc(osc2)
    })
  }, [])

  const startMelody = useCallback(async () => {
    const ctx = ensureAudioGraph()
    if (!ctx) return

    // Synchronously mark as playing so rapid clicks never race
    sharedAudio.isPlaying = true
    setPlaying(true)

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        sharedAudio.isPlaying = false
        setPlaying(false)
        return
      }
    }

    // Check if user toggled off while resume was pending
    if (!sharedAudio.isPlaying) return

    if (sharedAudio.melodyGain) {
      const now = ctx.currentTime
      sharedAudio.melodyGain.gain.cancelScheduledValues(now)
      sharedAudio.melodyGain.gain.setValueAtTime(1.0, now)
    }

    clearInterval(timerRef.current)
    scheduleBar()
    timerRef.current = setInterval(scheduleBar, 3900)
  }, [scheduleBar])

  const stopMelody = useCallback(() => {
    sharedAudio.isPlaying = false
    setPlaying(false)
    clearInterval(timerRef.current)
    timerRef.current = null

    const ctx = sharedAudio.ctx
    const melodyBus = sharedAudio.melodyGain
    if (ctx && melodyBus) {
      try {
        const now = ctx.currentTime
        melodyBus.gain.cancelScheduledValues(now)
        melodyBus.gain.setValueAtTime(Math.max(melodyBus.gain.value, 0.0001), now)
        melodyBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.08)
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      if (!sharedAudio.isPlaying) {
        clearScheduledNodes()
      }
    }, 90)
  }, [clearScheduledNodes])

  const toggleMelody = useCallback(
    (e) => {
      e.stopPropagation()
      userInteractedWithBtnRef.current = true
      if (sharedAudio.isPlaying) {
        stopMelody()
      } else {
        startMelody()
      }
    },
    [startMelody, stopMelody]
  )

  // Auto-start once on first non-button page interaction if user hasn't clicked the button yet
  useEffect(() => {
    const onFirstGesture = (e) => {
      if (e.target && e.target.closest && e.target.closest('.melody-toggle')) {
        return
      }
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      if (!userInteractedWithBtnRef.current && !sharedAudio.isPlaying) {
        startMelody()
      }
    }
    window.addEventListener('pointerdown', onFirstGesture, { passive: true })
    window.addEventListener('keydown', onFirstGesture, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      clearInterval(timerRef.current)
    }
  }, [startMelody])

  return (
    <button
      type="button"
      className={`melody-toggle ${playing ? 'playing' : 'muted'}`}
      onClick={toggleMelody}
      aria-pressed={playing}
      aria-label={playing ? 'Turn sound off' : 'Turn sound on'}
      title={playing ? 'Sound On — Click to Mute' : 'Sound Off — Click to Play'}
    >
      <span className="melody-heart-wrap" aria-hidden="true">
        <svg
          className="melody-heart-svg"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="heartFillRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff2e50" />
              <stop offset="100%" stopColor="#d80e32" />
            </linearGradient>
          </defs>

          {/* Solid Love Red heart fill */}
          <path className="heart-core-fill" d={HEART_PATH} fill="url(#heartFillRed)" />

          {/* Clean smooth heart border */}
          <path className="heart-base-border" d={HEART_PATH} />
        </svg>
      </span>

      <span className="melody-label">{playing ? 'Sound On' : 'Sound Off'}</span>
    </button>
  )
}
