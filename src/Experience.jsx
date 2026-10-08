import React, { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { useControls } from 'leva'

import Rose from './Rose.jsx'
import { AstraSpiral, Dust, HeartShape, PetalRain } from './Particles.jsx'
import Effects from './Effects.jsx'
import { story, ramp, damp, BEATS } from './scroll.js'

const BG_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`

const BG_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uAspect;
  uniform vec2 uResolution;
  varying vec2 vUv;

  // High-frequency screen-space hash for noisy gradient stipple
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // 2D Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(
      0.211324865405187,
      0.366025403784439,
     -0.577350269189626,
      0.024390243902439
    );
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Smooth macro-scale rotational FBM for large sweeping swirls
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 3; i++) {
      v += a * (0.5 + 0.5 * snoise(p));
      p = rot * p * 1.65 + vec2(1.7, 9.2);
      a *= 0.45;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    // Low spatial multiplier (0.55 instead of 1.65) -> ~3x larger macro swirls
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) * 0.55;

    float t = uTime * 0.06 + uProgress * 0.85;

    // Large sweeping vortex twist
    vec2 c1 = p - vec2(-0.18 * sin(t * 0.6), 0.14 * cos(t * 0.5));
    float d1 = length(c1);
    float ang1 = atan(c1.y, c1.x) + 2.1 * exp(-d1 * 1.1) * sin(t * 0.5 + 1.0);
    vec2 swirledP = vec2(cos(ang1), sin(ang1)) * d1;

    // Macro domain warping for broad, fluid swirl ribbons
    vec2 q = vec2(
      fbm(swirledP + t * 0.12),
      fbm(swirledP + vec2(3.4, 1.2) - t * 0.10)
    );

    vec2 r = vec2(
      fbm(swirledP + 1.45 * q + vec2(1.7, 4.2) + t * 0.09),
      fbm(swirledP + 1.45 * q + vec2(5.3, 2.8) - t * 0.08)
    );

    float swirlField = fbm(swirledP + 1.35 * r);

    // Isolate only the top ~20% of the swirl crests; ~80% of canvas stays 0.0 (pure black)
    float redMask = smoothstep(0.62, 0.90, swirlField);
    float crestMask = smoothstep(0.76, 0.96, swirlField);

    // High-frequency screen-space grain for noisy stippled gradient
    vec2 pixel = gl_FragCoord.xy;
    float n1 = hash12(pixel);
    float n2 = hash12(pixel * 0.5 + vec2(37.0, 19.0));
    float grain = (n1 * 0.65 + n2 * 0.35); // [0.0, 1.0]

    // Stipple the swirl transition and interior without polluting the 80% black void
    float edgeStipple = smoothstep(0.52, 0.88, swirlField + (grain - 0.5) * 0.22);
    float noisyRed = redMask * (0.55 + 0.45 * grain) * 0.6 + edgeStipple * 0.4;
    float noisyCrest = crestMask * (0.5 + 0.5 * grain);

    // 80% pure black, 20% dark crimson swirl (calibrated for linear-to-sRGB pipeline)
    vec3 cBlack     = vec3(0.0003, 0.0002, 0.0003); // #000000 pure dark black
    vec3 cDarkBlood = vec3(0.014,  0.0010, 0.0025); // deep dark oxblood
    vec3 cCrimson   = vec3(0.042,  0.0022, 0.0065); // moody dark red swirl

    vec3 col = mix(cBlack, cDarkBlood, noisyRed);
    col = mix(col, cCrimson, noisyCrest * 0.75);

    // Soft vignette to keep outer edges pure black
    float dist = length((uv - 0.5) * vec2(1.1, 1.0));
    float vig = smoothstep(1.05, 0.25, dist);
    col *= vig;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`

function StripeBackground() {
  const size = useThree((s) => s.size)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BG_VERTEX,
        fragmentShader: BG_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uAspect: { value: 1 },
          uResolution: { value: new THREE.Vector2(1920, 1080) },
        },
        depthWrite: false,
        depthTest: false,
      }),
    []
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uProgress.value = story.smooth
    material.uniforms.uAspect.value = size.width / Math.max(size.height, 1)
    material.uniforms.uResolution.value.set(size.width, size.height)
  })

  return (
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export default function Experience({ modelUrl, onReady }) {
  const { scene, camera, size } = useThree()

  const isMobileGPU = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 ||
        window.matchMedia?.('(pointer: coarse)').matches),
    []
  )

  // ---- Leva (development only, visible with ?debug) ----
  const debug = useControls('forever in bloom', {
    scrub: { value: false, label: 'manual scrub' },
    progress: { value: 0, min: 0, max: 1, step: 0.001 },
    exposure: { value: 1, min: 0.2, max: 2 },
  })
  const debugRef = useRef(debug)
  debugRef.current = debug

  // ---- lights ----
  const keyRef = useRef() // warm sun, enters from the right during Bloom
  const fillRef = useRef() // soft white
  const rimRef = useRef() // golden rim, awakens during Blush
  const ambRef = useRef()
  const heartRef = useRef() // faint glow inside the flower, Eternal

  const target = useMemo(() => new THREE.Vector3(), [])
  const lookAtTarget = useMemo(() => new THREE.Vector3(0, 1.44, 0), [])
  const lookAt = useMemo(() => new THREE.Vector3(0, 1.44, 0), [])

  const fog = useMemo(() => new THREE.FogExp2('#180b0f', 0.012), [])
  scene.background = null
  scene.fog = fog

  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)
    if (debugRef.current.scrub) {
      story.progress = debugRef.current.progress
    }
    // Master frame-damped progress for ultra-smooth transitions across all components
    story.smooth = damp(story.smooth, story.progress, 5.5, dt)
    const p = story.smooth

    const aspect = size.width / Math.max(size.height, 1)
    // On portrait viewports (aspect < 1), horizontal FOV narrows; pull back smoothly so the bloom never clips
    const portraitPullback =
      aspect < 1.0
        ? THREE.MathUtils.clamp(1.0 / Math.pow(aspect, 0.56), 1.0, 1.65)
        : 1.0

    // ---------- camera: poised start → intimate close-up zoom as rose blooms in user's face → pulls back to frame the full 12-rose bouquet at bottom ----------
    const baseRadius = ramp(p, [
      [0, 3.15],
      [BEATS.seed, 2.45],
      [BEATS.awaken, 1.72],
      [BEATS.bloom, 1.16], // close-up zoom: petals bloom right toward the user's face
      [BEATS.blush, 1.24],
      [BEATS.eternal, 1.95],
      [1, 2.48], // frames the full 12-rose bouquet & 3D stardust heart at the bottom
    ])
    const radius = baseRadius * portraitPullback

    const azimuth = ramp(p, [
      [0, -0.25],
      [BEATS.seed, -0.08],
      [BEATS.awaken, 0.1],
      [BEATS.bloom, 0.32],
      [BEATS.blush, 0.62],
      [BEATS.eternal, 0.85],
      [1, 1.0],
    ])
    const height = ramp(p, [
      [0, 1.58],
      [BEATS.awaken, 1.66],
      [BEATS.bloom, 1.74],
      [BEATS.blush, 1.76],
      [1, 1.82],
    ])

    // subtle parallax from the pointer — never sudden, scaled gently on narrow portrait screens
    pointer.current.x = damp(pointer.current.x, state.pointer.x, 2.5, dt)
    pointer.current.y = damp(pointer.current.y, state.pointer.y, 2.5, dt)
    const parallaxScale = THREE.MathUtils.clamp(aspect, 0.6, 1.0)

    const az = azimuth + pointer.current.x * 0.055 * parallaxScale
    target.set(
      Math.sin(az) * radius,
      height + pointer.current.y * 0.07 * parallaxScale,
      Math.cos(az) * radius
    )
    camera.position.x = damp(camera.position.x, target.x, 5.0, dt)
    camera.position.y = damp(camera.position.y, target.y, 5.0, dt)
    camera.position.z = damp(camera.position.z, target.z, 5.0, dt)

    lookAtTarget.set(0, ramp(p, [[0, 1.42], [BEATS.bloom, 1.48], [1, 1.48]]), 0)
    lookAt.x = damp(lookAt.x, lookAtTarget.x, 5.0, dt)
    lookAt.y = damp(lookAt.y, lookAtTarget.y, 5.0, dt)
    lookAt.z = damp(lookAt.z, lookAtTarget.z, 5.0, dt)
    camera.lookAt(lookAt)

    // Subtle cinematic Dutch tilt on the camera during the bloom & pointer sway
    const camRoll =
      ramp(p, [
        [0, -0.03],
        [BEATS.awaken, 0.02],
        [BEATS.bloom, 0.055],
        [BEATS.blush, -0.035],
        [1, 0.0],
      ]) -
      pointer.current.x * 0.025 * parallaxScale
    camera.rotation.z += camRoll

    // ---------- atmosphere ----------
    fog.density = ramp(p, [[0, 0.014], [BEATS.bloom, 0.008], [1, 0.012]])
    scene.environmentIntensity = ramp(p, [
      [0, 0.38],
      [BEATS.awaken, 0.58],
      [BEATS.bloom, 0.85],
      [1, 0.78],
    ])

    // ---------- light choreography (clear three-point illumination from Act I) ----------
    if (ambRef.current)
      ambRef.current.intensity = ramp(p, [[0, 0.35], [BEATS.awaken, 0.5], [BEATS.bloom, 0.7], [1, 0.65]])
    if (keyRef.current) {
      keyRef.current.intensity = ramp(p, [
        [0, 1.4],
        [BEATS.awaken, 2.2],
        [BEATS.bloom + 0.05, 3.6], // sunlight enters from one side
        [1, 2.8],
      ])
      // the sun swings slightly lower and warmer as the story settles
      keyRef.current.position.set(2.6, ramp(p, [[0, 3.4], [1, 2.2]]), 1.6)
      keyRef.current.color.setHSL(0.08, 0.72, ramp(p, [[0, 0.68], [BEATS.bloom, 0.74], [1, 0.7]]))
    }
    if (fillRef.current)
      fillRef.current.intensity = ramp(p, [[0, 0.55], [BEATS.awaken, 0.8], [1, 1.0]])
    if (rimRef.current)
      rimRef.current.intensity = ramp(p, [[0, 0.9], [BEATS.awaken, 1.4], [BEATS.blush + 0.08, 2.8], [1, 2.2]])
    if (heartRef.current)
      heartRef.current.intensity = ramp(p, [[0, 0.25], [BEATS.bloom, 0.55], [1, 1.1]])

    state.gl.toneMappingExposure = debugRef.current.exposure
  })

  return (
    <>
      <StripeBackground />

      <ambientLight ref={ambRef} intensity={0.35} color="#f7ece0" />
      {/* warm golden key — the sun */}
      <directionalLight ref={keyRef} position={[2.6, 3.2, 1.6]} color="#ffd29d" intensity={1.4} />
      {/* soft white fill */}
      <directionalLight ref={fillRef} position={[-3, 1.8, 2.8]} color="#eef2fa" intensity={0.55} />
      {/* golden rim from behind — crisp petal silhouette */}
      <directionalLight ref={rimRef} position={[-1.6, 2.4, -2.8]} color="#ffe0b2" intensity={0.9} />
      {/* soft warmth inside the bloom */}
      <pointLight ref={heartRef} position={[0, 1.56, 0]} color="#ff8577" intensity={0.25} distance={2.8} decay={1.8} />

      <Suspense fallback={null}>
        <Environment preset="sunset" background={false} />
      </Suspense>

      <Suspense fallback={null}>
        <Rose url={modelUrl} onReady={onReady} />
      </Suspense>

      {/* Scroll-drawn luminous 3D heart shape & stardust behind the rose (start to end of page) */}
      <HeartShape count={isMobileGPU ? 6500 : 9000} />

      {/* 3D velvet red rose petal rain that showers down when the bouquet is visible */}
      <PetalRain count={isMobileGPU ? 75 : 120} />

      {/* OpenAI GPT-6 Astra style luminous particle spiral */}
      <AstraSpiral count={isMobileGPU ? 8500 : 12000} arms={5} />

      {/* Subtle rising golden stardust near the bloom (removed when bouquet is visible) */}
      <Dust
        count={isMobileGPU ? 160 : 240}
        area={[3.2, 3.4, 3.2]}
        center={[0, 1.65, 0]}
        size={0.014}
        color="#ffe699"
        rise={0.12}
        drift={0.03}
        fadeIn={[0, 0]}
        fadeOut={[0.72, 0.84]}
      />

      <Effects />
    </>
  )
}

