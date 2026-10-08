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

// Plays a celebratory romantic harp / celesta glissando when the Love Calculator blasts petals
export function playCelebrationHarmony() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!sharedAudio.ctx) {
      sharedAudio.ctx = new AudioCtx()
      sharedAudio.masterGain = sharedAudio.ctx.createGain()
      sharedAudio.masterGain.gain.value = 0.26
      sharedAudio.reverbNode = createLushReverb(sharedAudio.ctx)

      const wetGain = sharedAudio.ctx.createGain()
      wetGain.gain.value = 0.55
      sharedAudio.masterGain.connect(sharedAudio.ctx.destination)
      sharedAudio.masterGain.connect(sharedAudio.reverbNode)
      sharedAudio.reverbNode.connect(wetGain)
      wetGain.connect(sharedAudio.ctx.destination)
    }

    const ctx = sharedAudio.ctx
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

export default function LoveMelody() {
  const [playing, setPlaying] = useState(false)
  const barIdxRef = useRef(0)
  const timerRef = useRef(null)
  const userToggledOffRef = useRef(false)

  const initAudio = useCallback(() => {
    if (sharedAudio.ctx) return sharedAudio.ctx
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null

    const ctx = new AudioCtx()
    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.24

    const reverb = createLushReverb(ctx)
    const wetGain = ctx.createGain()
    wetGain.gain.value = 0.62

    masterGain.connect(ctx.destination)
    masterGain.connect(reverb)
    reverb.connect(wetGain)
    wetGain.connect(ctx.destination)

    sharedAudio.ctx = ctx
    sharedAudio.masterGain = masterGain
    sharedAudio.reverbNode = reverb
    return ctx
  }, [])

  const scheduleBar = useCallback(() => {
    const ctx = sharedAudio.ctx
    const master = sharedAudio.masterGain
    if (!ctx || !master || !sharedAudio.isPlaying) return

    const bar = LOVE_PROGRESSION[barIdxRef.current % LOVE_PROGRESSION.length]
    barIdxRef.current += 1
    const now = ctx.currentTime + 0.05
    const barDuration = 3.9

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
      gain.connect(master)
      osc.start(now)
      osc.stop(now + barDuration + 0.1)
    }

    // 2. Soft lush string pad chord
    bar.pad.forEach((midi, i) => {
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(midiToFreq(midi), now)
      // Slight detune for warm chorus richness
      osc.detune.setValueAtTime((i - 1) * 4, now)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(900, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(0.065, now + 0.85)
      gain.gain.exponentialRampToValueAtTime(0.001, now + barDuration + 0.4)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      osc.start(now)
      osc.stop(now + barDuration + 0.5)
    })

    // 3. Delicate piano / music-box love melody notes
    bar.melody.forEach((m) => {
      const start = now + m.time
      const dur = m.dur
      const freq = midiToFreq(m.note)

      // Fundamental warm piano tone
      const osc1 = ctx.createOscillator()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(freq, start)

      // Soft harmonic overtone for celesta / piano bell warmth
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
      noteGain.connect(master)

      osc1.start(start)
      osc2.start(start)
      osc1.stop(start + dur + 0.08)
      osc2.stop(start + dur + 0.08)
    })
  }, [])

  const startMelody = useCallback(async () => {
    const ctx = initAudio()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        return
      }
    }
    if (ctx.state !== 'running') return
    if (sharedAudio.isPlaying) return

    sharedAudio.isPlaying = true
    setPlaying(true)
    scheduleBar()
    clearInterval(timerRef.current)
    timerRef.current = setInterval(scheduleBar, 3900)
  }, [initAudio, scheduleBar])

  const stopMelody = useCallback(() => {
    sharedAudio.isPlaying = false
    setPlaying(false)
    clearInterval(timerRef.current)
    if (sharedAudio.ctx && sharedAudio.ctx.state === 'running') {
      sharedAudio.ctx.suspend()
    }
  }, [])

  const toggleMelody = useCallback(() => {
    if (sharedAudio.isPlaying) {
      userToggledOffRef.current = true
      stopMelody()
    } else {
      userToggledOffRef.current = false
      startMelody()
    }
  }, [startMelody, stopMelody])

  // Gently auto-start on first user gesture if allowed by browser
  useEffect(() => {
    const onFirstGesture = () => {
      if (!userToggledOffRef.current && !sharedAudio.isPlaying) {
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
      className={`melody-toggle ${playing ? 'playing' : ''}`}
      onClick={toggleMelody}
      aria-label={playing ? 'Pause love melody' : 'Play love melody'}
      title={playing ? 'Pause Love Melody' : 'Play Love Melody'}
    >
      <span className="melody-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="melody-label">{playing ? 'Love Melody' : 'Play Melody'}</span>
    </button>
  )
}
