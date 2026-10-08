import React, { memo, useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { story, ramp, damp, BEATS } from './scroll.js'

export default memo(function Effects() {
  const bloomRef = useRef(null)
  const vignetteRef = useRef(null)

  const samples = useMemo(() => {
    if (typeof window === 'undefined') return 4
    const isTouchOrSmall =
      window.innerWidth < 768 || window.matchMedia?.('(pointer: coarse)').matches
    return isTouchOrSmall ? 0 : 4
  }, [])

  // Use callback refs so @react-three/postprocessing's wrapEffect (which is not
  // forwardRef-wrapped and calls JSON.stringify(props) in React 19) ignores ref.
  const setBloomRef = useCallback((el) => {
    bloomRef.current = el
  }, [])
  const setVignetteRef = useCallback((el) => {
    vignetteRef.current = el
  }, [])

  useFrame((_, dt) => {
    dt = Math.min(dt, 1 / 20)
    const p = story.smooth

    if (bloomRef.current) {
      const target = ramp(p, [
        [0, 0.14],
        [BEATS.awaken, 0.24],
        [BEATS.bloom + 0.08, 0.52], // soft specular glow without blurring petals
        [BEATS.blush + 0.08, 0.62],
        [1, 0.42],
      ])
      bloomRef.current.intensity = damp(bloomRef.current.intensity, target, 4, dt)
    }

    if (vignetteRef.current) {
      const u = vignetteRef.current.uniforms?.get?.('darkness')
      if (u) u.value = ramp(p, [[0, 0.52], [BEATS.bloom, 0.42], [1, 0.38]])
    }
  })

  return (
    <EffectComposer multisampling={samples}>
      <Bloom
        ref={setBloomRef}
        intensity={0.14}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
      <Vignette ref={setVignetteRef} eskil={false} offset={0.25} darkness={0.45} />
    </EffectComposer>
  )
})


