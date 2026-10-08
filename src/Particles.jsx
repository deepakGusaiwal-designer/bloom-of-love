import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { story, ramp, damp } from './scroll.js'

// Shared interactive pointer state driven by window events so it works even over DOM text
const interaction = {
  targetX: 0,
  targetY: 0,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  active: 0,
  isDown: false,
  hold: 0,
  pulse: 1.0, // 0 -> 1 expanding shockwave
  pulseX: 0,
  pulseY: 0,
  scrollBoost: 0,
  initialized: false,
}

function initInteractionListeners() {
  if (interaction.initialized || typeof window === 'undefined') return
  interaction.initialized = true

  const updatePointer = (clientX, clientY) => {
    interaction.targetX = (clientX / window.innerWidth) * 2 - 1
    interaction.targetY = -(clientY / window.innerHeight) * 2 + 1
    interaction.active = 1
  }

  window.addEventListener(
    'pointermove',
    (e) => {
      updatePointer(e.clientX, e.clientY)
    },
    { passive: true }
  )

  window.addEventListener(
    'pointerdown',
    (e) => {
      updatePointer(e.clientX, e.clientY)
      interaction.isDown = true
      interaction.pulse = 0.0
      interaction.pulseX = interaction.targetX
      interaction.pulseY = interaction.targetY
    },
    { passive: true }
  )

  window.addEventListener(
    'pointerup',
    () => {
      if (interaction.hold > 0.25) {
        // Release burst shockwave after holding
        interaction.pulse = 0.0
        interaction.pulseX = interaction.x
        interaction.pulseY = interaction.y
      }
      interaction.isDown = false
    },
    { passive: true }
  )

  window.addEventListener(
    'pointerleave',
    () => {
      interaction.active = 0
      interaction.isDown = false
    },
    { passive: true }
  )
}

const ASTRA_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform vec2 uMouseVel;
  uniform float uMouseActive;
  uniform float uHold;
  uniform float uPulse;
  uniform vec2 uPulseOrigin;
  uniform float uScrollBoost;
  uniform float uOpacity;

  attribute vec4 aParam;   // x: t (0..1), y: armAngle, z: phase, w: sizeWeight
  attribute vec3 aOffset;  // x: radial scatter, y: vertical scatter, z: angular scatter
  attribute float aColor;  // 0..1 color palette mix

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float t = aParam.x;
    float armAngle = aParam.y;
    float phase = aParam.z;
    float sizeW = aParam.w;

    // Gentle, unhurried flow along the spiral stream
    float flowT = fract(t + uTime * 0.010);

    // Spiral expansion driven by scroll progress (tight bud -> sweeping cosmic bloom)
    float bloomExpand = mix(0.68, 1.28, smoothstep(0.0, 0.85, uProgress));

    // Logarithmic / golden spiral radius around the rose
    float baseR = (0.12 + pow(flowT, 0.82) * 1.95) * bloomExpand;
    float r = max(0.04, baseR + aOffset.x * (0.25 + 0.75 * flowT));

    // Multi-turn helical swirl angle (slowed down for a calm, graceful orbit)
    float turns = 8.5;
    float theta = flowT * turns + armAngle - uTime * (0.11 + 0.07 * (1.0 - flowT)) + uProgress * 1.8 + uScrollBoost + aOffset.z;

    // Slow organic silk-ribbon undulation
    float waveR = sin(theta * 2.0 - uTime * 0.42 + phase) * 0.06 * flowT;
    float waveY = cos(theta * 1.5 + uTime * 0.35 + phase * 0.5) * 0.08 * flowT;

    // Vertical profile: rises from the stem base, cradles the flower head (y ~ 1.56), and sweeps outward
    float archY = mix(0.25, 2.15, pow(flowT, 0.68)) + sin(flowT * 3.14159) * 0.22;
    float y = archY + aOffset.y * (0.2 + 0.8 * flowT) + waveY;

    float finalR = r + waveR;
    vec3 pos = vec3(cos(theta) * finalR, y, sin(theta) * finalR);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vec4 clipPos = projectionMatrix * mvPosition;
    vec2 ndc = clipPos.xy / max(clipPos.w, 0.0001);

    // Subtle pointer breeze without any circular hover hole or halo
    vec2 toParticle = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(toParticle);
    float softField = exp(-dist * dist * 8.0) * uMouseActive;
    vec2 velWake = uMouseVel * softField * 0.08;

    // Apply gentle view-space velocity wake only when moving the pointer
    float depthScale = max(-mvPosition.z, 0.5) * 0.35;
    mvPosition.xy += velWake * depthScale;

    gl_Position = projectionMatrix * mvPosition;

    // Calm shimmer along the spiral stream (no hover circle flash)
    float streamFade = smoothstep(0.0, 0.08, flowT) * smoothstep(1.0, 0.82, flowT);
    float twinkle = 0.62 + 0.38 * sin(uTime * (1.15 + sizeW * 1.4) + phase);
    vAlpha = clamp(streamFade * twinkle * (0.45 + 0.55 * sizeW) * uOpacity, 0.0, 1.0);

    // Astra color palette: Champagne White-Gold -> Pure Astra Gold -> Deep Amber -> Rose Gold
    vec3 cWhiteGold = vec3(1.0, 0.97, 0.88);
    vec3 cAstraGold = vec3(1.0, 0.82, 0.28);
    vec3 cAmber     = vec3(0.96, 0.58, 0.14);
    vec3 cRoseGold  = vec3(1.0, 0.68, 0.62);

    vec3 col = mix(cAstraGold, cAmber, smoothstep(0.0, 0.6, aColor));
    col = mix(col, cRoseGold, smoothstep(0.55, 0.9, aColor) * (1.0 - flowT * 0.5));
    col = mix(col, cWhiteGold, clamp(pow(sizeW, 2.0) * 0.75, 0.0, 1.0));
    vColor = col;

    // Crisp pinpoint sizing (smaller, ultra-fine stardust)
    float basePt = 0.52 + pow(sizeW, 2.6) * 1.65;
    float ptSize = basePt * uPixelRatio * (2.1 / max(-mvPosition.z, 0.65));
    gl_PointSize = clamp(ptSize, 0.45, 5.5);
  }
`

const ASTRA_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d2 = dot(uv, uv);
    if (d2 > 0.22) discard;

    // Gaussian optical pinpoint profile — zero square quad or cloudy background
    float core = exp(-d2 * 24.0);
    float alpha = core * vAlpha;
    if (alpha < 0.015) discard;

    gl_FragColor = vec4(vColor, clamp(alpha, 0.0, 1.0));
  }
`

// Gaussian random helper (Box-Muller)
function gaussRand() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/*
 * OpenAI GPT-6 Astra inspired Interactive Luminous Particle Spiral:
 * 12,000 high-density golden micro-particles arranged in 5 intertwined
 * logarithmic spiral ribbons + ambient stardust halo on a pure black void.
 * Reacts to cursor hover (repulsion + vortex swirl), cursor velocity wake,
 * click shockwave rings, press-and-hold gravity well, and scroll velocity.
 */
export function AstraSpiral({ count = 12000, arms = 5 }) {
  const pointsRef = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const size = useThree((s) => s.size)

  useEffect(() => {
    initInteractionListeners()
  }, [])

  const { positions, params, offsets, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const params = new Float32Array(count * 4)
    const offsets = new Float32Array(count * 3)
    const colors = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // 82% in tight spiral ribbon streams, 18% in wider cosmic halo
      const isHalo = i % 5 === 0
      const t = Math.random()
      const armIdx = i % arms
      const armAngle = (armIdx / arms) * Math.PI * 2

      const phase = Math.random() * Math.PI * 2
      // Power distribution so most particles are ultra-fine pinpoints
      const sizeWeight = Math.pow(Math.random(), 2.2)

      params[i * 4 + 0] = t
      params[i * 4 + 1] = armAngle
      params[i * 4 + 2] = phase
      params[i * 4 + 3] = sizeWeight

      const spread = isHalo ? 0.42 : 0.11
      offsets[i * 3 + 0] = gaussRand() * spread // radial ribbon thickness
      offsets[i * 3 + 1] = gaussRand() * (isHalo ? 0.38 : 0.09) // vertical ribbon thickness
      offsets[i * 3 + 2] = gaussRand() * (isHalo ? 0.55 : 0.14) // angular dispersion

      colors[i] = Math.random()
    }

    return { positions, params, offsets, colors }
  }, [count, arms])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ASTRA_VERTEX,
        fragmentShader: ASTRA_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uPixelRatio: { value: 1 },
          uAspect: { value: 1 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uMouseVel: { value: new THREE.Vector2(0, 0) },
          uMouseActive: { value: 0 },
          uHold: { value: 0 },
          uPulse: { value: 1 },
          uPulseOrigin: { value: new THREE.Vector2(0, 0) },
          uScrollBoost: { value: 0 },
          uOpacity: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    []
  )

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)

    // Update smoothed pointer kinematics
    const prevX = interaction.x
    const prevY = interaction.y
    interaction.x = damp(interaction.x, interaction.targetX, 12, dt)
    interaction.y = damp(interaction.y, interaction.targetY, 12, dt)
    const instVx = (interaction.x - prevX) / Math.max(dt, 1e-4)
    const instVy = (interaction.y - prevY) / Math.max(dt, 1e-4)
    interaction.vx = damp(interaction.vx, THREE.MathUtils.clamp(instVx * 0.1, -1.2, 1.2), 8, dt)
    interaction.vy = damp(interaction.vy, THREE.MathUtils.clamp(instVy * 0.1, -1.2, 1.2), 8, dt)
    interaction.hold = damp(interaction.hold, interaction.isDown ? 1 : 0, 6, dt)

    if (interaction.pulse < 1.0) {
      interaction.pulse = Math.min(1.0, interaction.pulse + dt * 1.1)
    }

    // Gentle scroll velocity spin boost
    const velTarget = THREE.MathUtils.clamp(story.velocity * 0.22, -0.5, 0.5)
    interaction.scrollBoost += velTarget * dt * 1.4
    story.velocity = damp(story.velocity, 0, 5, dt)

    // Remove the main background spiral particles when the bouquet becomes visible
    const targetOpacity = 1.0 - THREE.MathUtils.smoothstep(story.smooth, 0.72, 0.84)
    const u = material.uniforms
    u.uOpacity.value = damp(u.uOpacity.value, targetOpacity, 7, dt)

    if (pointsRef.current) {
      pointsRef.current.visible = u.uOpacity.value > 0.005
    }
    if (u.uOpacity.value <= 0.005) return

    const resScale = dpr * THREE.MathUtils.clamp(size.height / 900, 0.72, 1.55)
    u.uTime.value = state.clock.elapsedTime
    u.uProgress.value = story.smooth
    u.uPixelRatio.value = resScale
    u.uAspect.value = size.width / Math.max(size.height, 1)
    u.uMouse.value.set(interaction.x, interaction.y)
    u.uMouseVel.value.set(interaction.vx, interaction.vy)
    u.uMouseActive.value = damp(u.uMouseActive.value, interaction.active, 6, dt)
    u.uHold.value = interaction.hold
    u.uPulse.value = interaction.pulse
    u.uPulseOrigin.value.set(interaction.pulseX, interaction.pulseY)
    u.uScrollBoost.value = interaction.scrollBoost
  })

  return (
    <points ref={pointsRef} material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aParam" args={[params, 4]} />
        <bufferAttribute attach="attributes-aOffset" args={[offsets, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 1]} />
      </bufferGeometry>
    </points>
  )
}

const DUST_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  varying float vTwinkle;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float twinkle = 0.68 + 0.32 * sin(uTime * 1.35 + aPhase);
    vTwinkle = clamp(twinkle, 0.0, 1.15);
    gl_PointSize = clamp(
      uSize * aScale * (0.85 + 0.3 * twinkle) * uPixelRatio * (130.0 / max(-mvPosition.z, 0.65)),
      0.45,
      5.0
    );
  }
`

const DUST_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d2 = dot(uv, uv);
    if (d2 > 0.22) discard;
    float core = exp(-d2 * 22.0);
    float alpha = core * vTwinkle * uOpacity;
    if (alpha < 0.015) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.97, 0.85), core * 0.5);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`

export function Dust({
  count = 180,
  area = null,
  center = [0, 1, 0],
  orbit = null,
  size = 0.014,
  color = '#ffd700',
  drift = 0.04,
  rise = 0,
  fadeIn = [0, 0.1],
  fadeOut = [2, 2.1],
}) {
  const points = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const viewportSize = useThree((s) => s.size)

  const { positions, scales, phases, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    const seeds = new Float32Array(count * 4)
    for (let i = 0; i < count; i++) {
      if (orbit) {
        const a = Math.random() * Math.PI * 2
        const r = orbit.radius * (0.72 + Math.random() * 0.55)
        positions[i * 3] = Math.cos(a) * r
        positions[i * 3 + 1] = orbit.y + (Math.random() - 0.5) * orbit.wobble
        positions[i * 3 + 2] = Math.sin(a) * r
        seeds[i * 4] = a
        seeds[i * 4 + 1] = r
      } else {
        positions[i * 3] = center[0] + (Math.random() - 0.5) * area[0]
        positions[i * 3 + 1] = center[1] + (Math.random() - 0.5) * area[1]
        positions[i * 3 + 2] = center[2] + (Math.random() - 0.5) * area[2]
      }
      const ph = Math.random() * Math.PI * 2
      seeds[i * 4 + 2] = ph
      seeds[i * 4 + 3] = 0.5 + Math.random()
      scales[i] = 0.45 + Math.random() * 0.85
      phases[i] = ph
    }
    return { positions, scales, phases, seeds }
  }, [count, area, center, orbit])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: size },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [size, color]
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const p = story.smooth

    const fade =
      fadeIn[0] <= 0 && fadeIn[1] <= 0
        ? 1
        : ramp(p, [
            [fadeIn[0], 0],
            [fadeIn[1], 1],
          ])
    const opacity =
      fade *
      ramp(p, [
        [fadeOut[0], 1],
        [fadeOut[1], 0],
      ])

    const resScale = dpr * THREE.MathUtils.clamp(viewportSize.height / 900, 0.72, 1.55)
    material.uniforms.uTime.value = t
    material.uniforms.uPixelRatio.value = resScale
    material.uniforms.uOpacity.value = opacity * 0.9

    if (points.current) points.current.visible = opacity > 0.005
    if (!points.current || opacity <= 0.005) return

    const pos = points.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      const ph = seeds[i * 4 + 2]
      const sp = seeds[i * 4 + 3]
      if (orbit) {
        const a = seeds[i * 4] + t * orbit.speed * 0.55 * sp
        const r = seeds[i * 4 + 1] + Math.sin(t * 0.4 + ph) * 0.05
        pos.array[i * 3] = Math.cos(a) * r
        pos.array[i * 3 + 1] = orbit.y + Math.sin(t * 0.5 * sp + ph) * orbit.wobble * 0.5
        pos.array[i * 3 + 2] = Math.sin(a) * r
      } else {
        pos.array[i * 3] += Math.sin(t * 0.25 * sp + ph) * drift * 0.01
        pos.array[i * 3 + 2] += Math.cos(t * 0.2 * sp + ph * 1.7) * drift * 0.01
        if (rise > 0) {
          pos.array[i * 3 + 1] += rise * 0.009 * sp
          const top = center[1] + area[1] / 2
          if (pos.array[i * 3 + 1] > top) pos.array[i * 3 + 1] = center[1] - area[1] / 2
        } else {
          pos.array[i * 3 + 1] += Math.sin(t * 0.16 * sp + ph) * drift * 0.006
        }
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={points} material={material} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
    </points>
  )
}

const HEART_SAMPLES = 256

// Classic, natural heart curve with a soft cleft and balanced 1:1 proportions
function evalHeartRaw(s) {
  const sinS = Math.sin(s)
  const x = 0.88 * Math.pow(sinS, 3) + 0.12 * sinS
  const y =
    (13 * Math.cos(s) -
      5 * Math.cos(2 * s) -
      2 * Math.cos(3 * s) -
      Math.cos(4 * s)) /
      15.5 +
    0.10
  return { x, y }
}

// Precomputes an arc-length parameterized lookup table for the heart lobe (u: 0 at top cleft -> 1 at bottom tip)
function buildHeartCurveTable(numPoints = HEART_SAMPLES) {
  const fineSteps = 1024
  const rawPts = []
  const arcLengths = [0]
  let totalLen = 0

  for (let i = 0; i <= fineSteps; i++) {
    const s = (i / fineSteps) * Math.PI
    const pt = evalHeartRaw(s)
    rawPts.push(pt)
    if (i > 0) {
      const dx = pt.x - rawPts[i - 1].x
      const dy = pt.y - rawPts[i - 1].y
      totalLen += Math.hypot(dx, dy)
      arcLengths.push(totalLen)
    }
  }

  const uniformPts = []
  const normals = []

  for (let k = 0; k < numPoints; k++) {
    const targetLen = (k / (numPoints - 1)) * totalLen
    let lo = 0
    let hi = fineSteps
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (arcLengths[mid] < targetLen) lo = mid + 1
      else hi = mid
    }
    const idx = Math.max(1, lo)
    const l0 = arcLengths[idx - 1]
    const l1 = arcLengths[idx]
    const frac = l1 > l0 ? (targetLen - l0) / (l1 - l0) : 0
    const p0 = rawPts[idx - 1]
    const p1 = rawPts[idx]
    const x = p0.x + (p1.x - p0.x) * frac
    const y = p0.y + (p1.y - p0.y) * frac
    uniformPts.push(new THREE.Vector2(x, y))
  }

  for (let k = 0; k < numPoints; k++) {
    const prev = uniformPts[Math.max(0, k - 1)]
    const next = uniformPts[Math.min(numPoints - 1, k + 1)]
    let tx = next.x - prev.x
    let ty = next.y - prev.y
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    // Outward normal on the right lobe (clockwise from top cleft to bottom tip)
    normals.push(new THREE.Vector2(-ty, tx))
  }

  return { uniformPts, normals }
}

const HEART_PARTICLE_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uAspect;
  uniform vec2 uMouse;
  uniform vec2 uMouseVel;
  uniform float uMouseActive;

  attribute vec4 aHeartParam; // x: u (0..1), y: side (-1/+1), z: phase, w: sizeWeight
  attribute vec3 aBasePos;    // x, y, z on 3D heart contour
  attribute vec3 aNormal;     // x: nx, y: ny, z: strandAngle
  attribute vec3 aScatter;    // x: radialOffset, y: depthOffset, z: colorMix

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float u = aHeartParam.x;
    float side = aHeartParam.y;
    float phase = aHeartParam.z;
    float sizeW = aHeartParam.w;
    float strandAngle = aNormal.z;

    // Smooth scroll-draw from page start (0.0) to page end (1.0)
    float drawHead = mix(0.04, 1.0, clamp(uProgress, 0.0, 1.0));
    float completion = smoothstep(0.90, 1.0, uProgress);

    // Soft organic breathing of the 3D heart
    float breath = 1.0 + (0.008 + 0.012 * completion) * sin(uTime * 1.6);

    // Feathered scroll-draw mask so particles crystallize organically out of stardust
    float drawnMask = smoothstep(drawHead + 0.075, drawHead - 0.035, u);
    float distToHead = u - drawHead;
    float distBehind = max(drawHead - u, 0.0);

    // Specular shine while filling: bright leading gleam + trailing shimmer wave along newly filled arc
    float fillingActive = smoothstep(0.0, 0.02, uProgress) * (1.0 - smoothstep(0.985, 1.0, uProgress) * 0.35);
    float tipFlare = exp(-(distToHead * distToHead) / (0.044 * 0.044)) * fillingActive;
    float trailShimmer = exp(-distBehind * 7.5) * step(0.0, drawHead - u) *
      (0.5 + 0.5 * sin(u * 36.0 - uTime * 4.6 + phase * 0.4)) * fillingActive;
    float sparkleGlint = pow(0.5 + 0.5 * sin(uTime * 3.4 + phase * 2.3), 8.0) *
      exp(-(distToHead * distToHead) / (0.095 * 0.095)) * fillingActive;
    float fillShine = clamp(tipFlare + trailShimmer * 0.55 + sparkleGlint * 0.75, 0.0, 1.25);

    // Intertwined 3D silk-ribbon wave along the heart contour (tapered near top cleft & bottom tip)
    float endTaper = sin(u * 3.14159265);
    float silkWave = sin(u * 16.0 - uTime * 0.75 + strandAngle) * 0.014 * endTaper;
    float silkDepth = cos(u * 12.0 - uTime * 0.65 + strandAngle) * 0.022 * endTaper;

    // Un-drawn particles float slightly wider and gently condense onto the curve as drawnMask -> 1
    float condense = mix(1.65, 1.0, drawnMask);
    float radialDisp = aScatter.x * condense + silkWave;

    vec2 normalDir = vec2(aNormal.x * side, aNormal.y);
    vec2 pos2D = aBasePos.xy * breath + normalDir * radialDisp;
    float posZ = aBasePos.z + aScatter.y * condense + silkDepth;

    vec3 pos = vec3(pos2D, posZ);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vec4 clipPos = projectionMatrix * mvPosition;
    vec2 ndc = clipPos.xy / max(clipPos.w, 0.0001);

    // Gentle cursor breeze matching AstraSpiral
    vec2 toParticle = (ndc - uMouse) * vec2(uAspect, 1.0);
    float dist = length(toParticle);
    float softField = exp(-dist * dist * 8.0) * uMouseActive;
    vec2 velWake = uMouseVel * softField * 0.065;
    mvPosition.xy += velWake * max(-mvPosition.z, 0.5) * 0.35;

    gl_Position = projectionMatrix * mvPosition;

    // Subtle red base opacity + luminous boost at the filling shine frontier
    float ghostOutline = 0.11;
    float reveal = mix(ghostOutline, 1.0, drawnMask);
    float twinkle = 0.65 + 0.35 * sin(uTime * (1.1 + sizeW * 1.3) + phase);
    float coreWeight = exp(-abs(aScatter.x) * 32.0);

    float baseAlpha = reveal * twinkle * (0.20 + 0.34 * sizeW * coreWeight) * 0.68;
    float shineAlpha = fillShine * (0.32 + 0.38 * coreWeight);
    vAlpha = clamp(baseAlpha + shineAlpha, 0.0, 0.85);

    // Subtle velvet red base palette with bright rose-gold & white-gold specular shine when filling
    vec3 cDeepRuby    = vec3(0.54, 0.04, 0.11);
    vec3 cVelvetRed   = vec3(0.80, 0.10, 0.20);
    vec3 cSoftScarlet = vec3(0.92, 0.22, 0.32);
    vec3 cRoseShine   = vec3(1.00, 0.68, 0.74);
    vec3 cGoldShine   = vec3(1.08, 0.95, 0.86);

    float cMix = aScatter.z;
    vec3 col = mix(cDeepRuby, cVelvetRed, smoothstep(0.0, 0.6, cMix));
    col = mix(col, cSoftScarlet, smoothstep(0.5, 1.0, cMix) * sizeW);
    // Specular shine gleams across the particles as the heart fills
    col = mix(col, cRoseShine, clamp(fillShine * 0.75, 0.0, 1.0));
    col = mix(col, cGoldShine, clamp(pow(fillShine, 1.5) * (0.55 + 0.45 * sizeW), 0.0, 1.0));
    vColor = col;

    // Fine optical pinpoint sizing with a subtle specular swell at the filling shine
    float basePt = (0.68 + pow(sizeW, 2.4) * 1.85) * (1.0 + fillShine * 0.38);
    float ptSize = basePt * uPixelRatio * (2.5 / max(-mvPosition.z, 0.4));
    gl_PointSize = clamp(ptSize, 0.5, 7.2);
  }
`

/*
 * Organic 3D Stardust Silk Heart behind the rose:
 * Built with the same optical micro-particle silk-stream architecture as AstraSpiral
 * (no flat 2D plane cutout). Appropriately sized to cradle the rose bloom and upper stem,
 * progressively crystallizing from page start (0%) to page end (100%).
 */
export function HeartShape({ count = 9000 }) {
  const groupRef = useRef()
  const swayRef = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const size = useThree((s) => s.size)

  useEffect(() => {
    initInteractionListeners()
  }, [])

  const { positions, heartParams, normals, scatters } = useMemo(() => {
    const { uniformPts, normals: curveNormals } = buildHeartCurveTable(HEART_SAMPLES)

    const positions = new Float32Array(count * 3)
    const heartParams = new Float32Array(count * 4)
    const normals = new Float32Array(count * 3)
    const scatters = new Float32Array(count * 3)

    const strands = 4
    const halfCount = Math.max(1, Math.floor(count / 2))

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1
      const lobeIdx = Math.floor(i / 2)
      // Stratified sampling along the arc for an organic, clump-free silk stream
      const u = THREE.MathUtils.clamp((lobeIdx + Math.random()) / halfCount, 0.0, 1.0)
      const isHalo = i % 5 === 0
      const strandIdx = i % strands
      const strandAngle = (strandIdx / strands) * Math.PI * 2

      const scaled = u * (HEART_SAMPLES - 1)
      const idx = Math.min(HEART_SAMPLES - 2, Math.floor(scaled))
      const frac = scaled - idx
      const p0 = uniformPts[idx]
      const p1 = uniformPts[idx + 1]
      const n0 = curveNormals[idx]
      const n1 = curveNormals[idx + 1]

      const bx = (p0.x + (p1.x - p0.x) * frac) * side
      const by = p0.y + (p1.y - p0.y) * frac
      // Subtle 3D depth arch so the upper heart lobes curve naturally in 3D space
      const bz = Math.sin(u * Math.PI) * 0.08

      const nx = n0.x + (n1.x - n0.x) * frac
      const ny = n0.y + (n1.y - n0.y) * frac

      // Taper scatter slightly at the top cleft and bottom tip so the heart points stay crisp
      const cuspTaper = 0.35 + 0.65 * Math.sin(u * Math.PI)
      const radialSpread = (isHalo ? 0.055 : 0.014) * cuspTaper
      const depthSpread = (isHalo ? 0.075 : 0.022) * cuspTaper

      positions[i * 3 + 0] = bx
      positions[i * 3 + 1] = by
      positions[i * 3 + 2] = bz

      const phase = Math.random() * Math.PI * 2
      const sizeWeight = Math.pow(Math.random(), 2.2)

      heartParams[i * 4 + 0] = u
      heartParams[i * 4 + 1] = side
      heartParams[i * 4 + 2] = phase
      heartParams[i * 4 + 3] = sizeWeight

      normals[i * 3 + 0] = nx
      normals[i * 3 + 1] = ny
      normals[i * 3 + 2] = strandAngle

      scatters[i * 3 + 0] = gaussRand() * radialSpread
      scatters[i * 3 + 1] = gaussRand() * depthSpread
      scatters[i * 3 + 2] = Math.random()
    }

    return { positions, heartParams, normals, scatters }
  }, [count])

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HEART_PARTICLE_VERTEX,
        fragmentShader: ASTRA_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uPixelRatio: { value: 1 },
          uAspect: { value: 1 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uMouseVel: { value: new THREE.Vector2(0, 0) },
          uMouseActive: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.NormalBlending,
      }),
    []
  )

  const lookCenter = useMemo(() => new THREE.Vector3(), [])
  const viewDir = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)
    const t = state.clock.elapsedTime
    const p = THREE.MathUtils.clamp(story.smooth, 0, 1)
    const aspect = size.width / Math.max(size.height, 1)

    const resScale = dpr * THREE.MathUtils.clamp(size.height / 900, 0.72, 1.55)
    const pu = particleMaterial.uniforms
    pu.uTime.value = t
    pu.uProgress.value = p
    pu.uPixelRatio.value = resScale
    pu.uAspect.value = aspect
    pu.uMouse.value.set(interaction.x, interaction.y)
    pu.uMouseVel.value.set(interaction.vx, interaction.vy)
    pu.uMouseActive.value = interaction.active

    // Position the 3D stardust heart behind the rose bloom at a slightly larger, balanced size
    if (groupRef.current) {
      const lookY = ramp(p, [
        [0, 1.42],
        [0.5, 1.52],
        [1, 1.55],
      ])
      lookCenter.set(0, lookY, 0)
      viewDir.subVectors(lookCenter, state.camera.position)
      const camToRoseDist = viewDir.length()
      viewDir.normalize()

      const depthBehindRose = 0.58
      const dHeart = camToRoseDist + depthBehindRose

      groupRef.current.position.copy(lookCenter).addScaledVector(viewDir, depthBehindRose)
      groupRef.current.lookAt(state.camera.position)

      // Constrain by both vertical half-height (~62%) and horizontal half-width (~72%), expanding slightly at the bottom to cradle the full bouquet
      const fovRad = THREE.MathUtils.degToRad(state.camera.fov || 36)
      const halfScreenH = dHeart * Math.tan(fovRad * 0.5)
      const halfScreenW = halfScreenH * aspect
      const bouquetExpand = 1.0 + THREE.MathUtils.smoothstep(p, 0.76, 0.98) * 0.14
      const heartScale = Math.min(halfScreenH * 0.62, halfScreenW * 0.72) * bouquetExpand

      groupRef.current.translateY(0.01 * heartScale)
      groupRef.current.scale.setScalar(heartScale)
    }

    // Gentle 3D breeze and pointer tilt so the heart feels alive in 3D space
    if (swayRef.current) {
      const targetRotY = interaction.x * 0.12 + Math.sin(t * 0.45) * 0.03
      const targetRotX = -interaction.y * 0.08 + Math.cos(t * 0.38) * 0.02
      swayRef.current.rotation.y = damp(swayRef.current.rotation.y, targetRotY, 4, dt)
      swayRef.current.rotation.x = damp(swayRef.current.rotation.x, targetRotX, 4, dt)
    }
  })

  return (
    <group ref={groupRef}>
      <group ref={swayRef}>
        <points material={particleMaterial} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-aBasePos" args={[positions, 3]} />
            <bufferAttribute attach="attributes-aHeartParam" args={[heartParams, 4]} />
            <bufferAttribute attach="attributes-aNormal" args={[normals, 3]} />
            <bufferAttribute attach="attributes-aScatter" args={[scatters, 3]} />
          </bufferGeometry>
        </points>
      </group>
    </group>
  )
}

// Builds a curved, cupped 3D botanical rose petal mesh
function buildRosePetalGeometry() {
  const geo = new THREE.PlaneGeometry(1, 1, 10, 12)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv

  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i) * 2.0 - 1.0 // -1 .. 1 across width
    const v = uv.getY(i) // 0 (base) .. 1 (top lip)

    // Rounded heart/teardrop rose petal width profile
    const widthProfile =
      Math.pow(Math.sin(Math.PI * Math.pow(v, 0.68)), 0.85) *
      (0.52 + 0.52 * Math.sin(Math.PI * v * 0.65))
    const x = u * widthProfile * 0.54

    // Softly scalloped upper petal lip
    const y =
      (v - 0.5) * 1.06 -
      0.055 * Math.pow(v, 3.0) * Math.cos(u * Math.PI) -
      0.03 * Math.pow(v, 4.0) * (1.0 - u * u)

    // 3D cupped bowl + longitudinal arch + reflexed outer lip curl
    const cupZ = u * u * 0.22 * Math.sin(Math.PI * v)
    const archZ = -Math.sin(Math.PI * v) * 0.14
    const lipCurlZ = -Math.pow(v, 3.0) * (0.45 + 0.55 * u * u) * 0.11
    const z = cupZ + archZ + lipCurlZ

    pos.setXYZ(i, x, y, z)
  }

  geo.computeVertexNormals()
  return geo
}

const PETAL_RAIN_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSpreadX;
  uniform vec2 uWind;

  attribute vec4 aSeed; // x: baseX, y: fallOffset, z: baseZ, w: speed
  attribute vec4 aRot;  // x: phase1, y: phase2, z: petalScale, w: colorVar

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying float vColorVar;
  varying float vLifeAlpha;

  mat3 rotateXYZ(vec3 r) {
    float cx = cos(r.x), sx = sin(r.x);
    float cy = cos(r.y), sy = sin(r.y);
    float cz = cos(r.z), sz = sin(r.z);
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, -sx, 0.0, sx, cx);
    mat3 ry = mat3(cy, 0.0, sy, 0.0, 1.0, 0.0, -sy, 0.0, cy);
    mat3 rz = mat3(cz, -sz, 0.0, sz, cz, 0.0, 0.0, 0.0, 1.0);
    return rz * ry * rx;
  }

  void main() {
    vUv = uv;
    vColorVar = aRot.w;

    // Continuous vertical descent from y = 3.45 down to y = -0.25
    float fallProgress = fract(aSeed.y + uTime * 0.078 * aSeed.w);
    float worldY = mix(3.45, -0.25, fallProgress);

    // Smooth entry/exit fade at top & bottom of the rain volume
    vLifeAlpha = smoothstep(0.0, 0.12, fallProgress) * smoothstep(1.0, 0.84, fallProgress);

    // Pendulum leaf-gliding sway in X and Z + cursor breeze
    float swayT = uTime * (1.05 + 0.38 * aSeed.w) + aRot.x;
    float swayX = sin(swayT) * 0.30 + cos(swayT * 0.52 + aRot.y) * 0.15 + uWind.x * 0.28;
    float swayZ = cos(swayT * 0.76 + aRot.y) * 0.24;

    vec3 centerPos = vec3(aSeed.x * uSpreadX + swayX, worldY, aSeed.z + swayZ);

    // Real-time aerodynamic flutter along the petal edge
    vec3 localPos = position;
    float flutter = sin(uTime * 4.2 + aRot.x * 2.0 + uv.y * 3.8 + uv.x * 2.2) * 0.065 * uv.y;
    localPos.z += flutter;

    // 3D tumbling and banking angles as the petal glides through the air
    vec3 angles = vec3(
      uTime * (0.65 * aSeed.w) + aRot.x + sin(swayT) * 0.45,
      uTime * (0.82 * aSeed.w) + aRot.y,
      cos(swayT) * 0.62 + sin(uTime * 0.5 + aRot.x) * 0.35
    );
    mat3 rotMat = rotateXYZ(angles);

    vec3 worldPos = centerPos + rotMat * (localPos * aRot.z);
    vec3 rotatedNormal = normalize(rotMat * normal);

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    vViewPos = -mvPosition.xyz;
    vViewNormal = normalize(normalMatrix * rotatedNormal);

    gl_Position = projectionMatrix * mvPosition;
  }
`

const PETAL_RAIN_FRAGMENT = /* glsl */ `
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying float vColorVar;
  varying float vLifeAlpha;

  void main() {
    float alpha = uOpacity * vLifeAlpha;
    if (alpha < 0.01) discard;

    vec3 N = normalize(vViewNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vViewPos);

    // Rich real-touch velvet rose palette (deep ruby base -> lush crimson -> scarlet rim)
    vec3 cDarkRuby = vec3(0.42, 0.02, 0.07);
    vec3 cCrimson  = vec3(0.84, 0.07, 0.16);
    vec3 cScarlet  = vec3(0.98, 0.18, 0.28);
    vec3 cBlushRim = vec3(1.00, 0.55, 0.64);

    vec3 petalCol = mix(cCrimson, cScarlet, vColorVar * 0.65 + vUv.y * 0.35);
    petalCol = mix(cDarkRuby, petalCol, smoothstep(0.0, 0.42, vUv.y));

    // Subtle botanical radial petal veins
    float centeredU = vUv.x - 0.5;
    float veinWave = sin(centeredU * 38.0 + sin(vUv.y * 9.0) * 1.2);
    petalCol *= 0.95 + 0.05 * veinWave;

    // Soft three-point illumination + velvet grazing sheen + subsurface translucency
    vec3 L1 = normalize(vec3(0.6, 0.8, 0.5));
    vec3 L2 = normalize(vec3(-0.5, 0.3, -0.7));
    float diff1 = max(dot(N, L1), 0.0);
    float diff2 = max(dot(N, L2), 0.0);
    float backLight = max(dot(-N, L1), 0.0);

    float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.2);

    vec3 litColor = petalCol * (0.38 + diff1 * 0.68 + diff2 * 0.25);
    // Warm ruby subsurface scattering through thin petal edges
    litColor += vec3(0.92, 0.10, 0.20) * backLight * (0.28 + 0.32 * vUv.y);
    // Soft plush velvet rim sheen
    litColor = mix(litColor, cBlushRim, fresnel * 0.32);

    gl_FragColor = vec4(litColor, clamp(alpha, 0.0, 1.0));
  }
`

/*
 * 3D Red Rose Petal Rain:
 * Activates when the bouquet becomes visible at the bottom of the scroll,
 * showering 3D curved, veined velvet-red rose petals that glide, bank, and flutter.
 */
export function PetalRain({ count = 110 }) {
  const meshRef = useRef()
  const size = useThree((s) => s.size)

  const geometry = useMemo(() => {
    const baseGeo = buildRosePetalGeometry()
    const instGeo = new THREE.InstancedBufferGeometry()
    instGeo.index = baseGeo.index
    instGeo.attributes.position = baseGeo.attributes.position
    instGeo.attributes.normal = baseGeo.attributes.normal
    instGeo.attributes.uv = baseGeo.attributes.uv

    const seeds = new Float32Array(count * 4)
    const rots = new Float32Array(count * 4)

    for (let i = 0; i < count; i++) {
      // Spread across the scene in front of, around, and behind the bouquet
      seeds[i * 4 + 0] = (Math.random() - 0.5) * 3.8 // baseX
      seeds[i * 4 + 1] = Math.random() // staggered vertical phase 0..1
      seeds[i * 4 + 2] = (Math.random() - 0.45) * 2.4 // baseZ
      seeds[i * 4 + 3] = 0.62 + Math.random() * 0.65 // fall speed

      rots[i * 4 + 0] = Math.random() * Math.PI * 2 // phase1
      rots[i * 4 + 1] = Math.random() * Math.PI * 2 // phase2
      rots[i * 4 + 2] = 0.058 + Math.random() * 0.048 // 3D petal scale
      rots[i * 4 + 3] = Math.random() // crimson/scarlet color variation
    }

    instGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    instGeo.setAttribute('aRot', new THREE.InstancedBufferAttribute(rots, 4))
    instGeo.instanceCount = count
    baseGeo.dispose()
    return instGeo
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PETAL_RAIN_VERTEX,
        fragmentShader: PETAL_RAIN_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uSpreadX: { value: 1 },
          uWind: { value: new THREE.Vector2(0, 0) },
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    []
  )

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)
    const p = story.smooth
    // Fade in the red petal rain right as the bouquet becomes visible
    const targetAlpha = THREE.MathUtils.smoothstep(p, 0.76, 0.90)
    const curAlpha = damp(material.uniforms.uOpacity.value, targetAlpha, 5, dt)

    material.uniforms.uOpacity.value = curAlpha
    material.uniforms.uTime.value = state.clock.elapsedTime
    const aspect = size.width / Math.max(size.height, 1)
    material.uniforms.uSpreadX.value = THREE.MathUtils.clamp(aspect * 0.85, 0.55, 1.35)
    material.uniforms.uWind.value.set(interaction.vx, interaction.vy)

    if (meshRef.current) {
      meshRef.current.visible = curAlpha > 0.005
    }
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} visible={false} frustumCulled={false} />
}




