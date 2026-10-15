import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { story, damp } from './scroll.js'

/*
 * BouquetDecoration:
 * Luxury florist embellishments for the 16-rose hand-tied bouquet:
 *  1. Large 3D Jasmine Blossoms with Rich Botanical Detailing & Living Wave Effect
 *     - Vertex-shader undulating traveling breeze waves across petal surfaces & ruffled tips
 *     - Detailed radial micro-veins, warm golden pollen bleed from the stamen corolla,
 *       and translucent subsurface scattering (SSS) at petal rims
 *     - Golden pollen stamens with glowing amber core emission
 *     - Harmonic wave swaying and breathing across all flower instances
 *  2. Double-Layer Silk Satin Ribbon Wrap with Hand-Tied French Bow & Cascading Streamers
 *     - Positioned at the stem convergence waist (y ~ 0.82)
 *     - Dynamic breeze wave flutter along the ribbon streamers
 *     - Warm champagne ivory satin with fine gold edge trim & silk sheen
 *  3. Fresh Botanical Foliage Collar (Silver Dollar Eucalyptus & Italian Ruscus)
 *     - Radial collar of 16 dimensional leaf blades cradling the underside of the outer roses
 *     - Gentle breeze flutter and realistic waxy foliage materials
 *  4. Shimmering Pearl Corsage Floral Pins
 *     - Iridescent ivory nacre pearl pins catching key sun highlights in the rose crown
 *  5. Pleated Parisian Florist Wrapping Paper Fan (Frosted Vellum with Gold Foil Trim)
 *     - Accordion-pleated frosted wrap flaring from the waist up to the foliage base
 */

// Helper to generate a curved 3D leaf blade geometry with longitudinal midrib crease and transverse arch
function createLeafGeometry(length = 0.24, width = 0.12, segmentsL = 10, segmentsW = 6, pointed = false) {
  const geo = new THREE.BufferGeometry()
  const numVerts = (segmentsL + 1) * (segmentsW + 1)
  const positions = new Float32Array(numVerts * 3)
  const normals = new Float32Array(numVerts * 3)
  const uvs = new Float32Array(numVerts * 2)
  const indices = []

  let vIdx = 0
  for (let i = 0; i <= segmentsL; i++) {
    const v = i / segmentsL // 0 at base, 1 at tip
    let wFactor
    if (pointed) {
      wFactor = Math.sin(Math.pow(v, 0.72) * Math.PI)
    } else {
      wFactor = Math.sin(Math.pow(v, 0.55) * Math.PI) * (1.0 - v * 0.2)
    }

    const curWidth = width * wFactor
    const yOffset = v * length
    const arch = -Math.pow(v, 2.2) * (length * 0.32)

    for (let j = 0; j <= segmentsW; j++) {
      const u = (j / segmentsW) * 2 - 1
      const absU = Math.abs(u)

      const x = u * (curWidth * 0.5)
      const crease = Math.pow(absU, 1.4) * (curWidth * 0.18)
      const z = arch + crease

      positions[vIdx * 3 + 0] = x
      positions[vIdx * 3 + 1] = yOffset
      positions[vIdx * 3 + 2] = z

      uvs[vIdx * 2 + 0] = (u + 1) * 0.5
      uvs[vIdx * 2 + 1] = v

      vIdx++
    }
  }

  for (let i = 0; i < segmentsL; i++) {
    for (let j = 0; j < segmentsW; j++) {
      const a = i * (segmentsW + 1) + j
      const b = (i + 1) * (segmentsW + 1) + j
      const c = (i + 1) * (segmentsW + 1) + (j + 1)
      const d = i * (segmentsW + 1) + (j + 1)

      indices.push(a, b, d)
      indices.push(b, c, d)
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// Procedural dynamic ribbon streamer geometry
function createRibbonStreamerGeometry(segments = 24, width = 0.038) {
  const geo = new THREE.BufferGeometry()
  const numVerts = (segments + 1) * 2
  const positions = new Float32Array(numVerts * 3)
  const normals = new Float32Array(numVerts * 3)
  const uvs = new Float32Array(numVerts * 2)
  const indices = []

  for (let i = 0; i <= segments; i++) {
    const v = i / segments
    const y = -v * 0.44
    const halfW = (width * (1.0 - v * 0.15)) * 0.5

    positions[i * 6 + 0] = -halfW
    positions[i * 6 + 1] = y
    positions[i * 6 + 2] = 0

    positions[i * 6 + 3] = halfW
    positions[i * 6 + 4] = y
    positions[i * 6 + 5] = 0

    uvs[i * 4 + 0] = 0
    uvs[i * 4 + 1] = v
    uvs[i * 4 + 2] = 1
    uvs[i * 4 + 3] = v

    normals[i * 6 + 0] = 0
    normals[i * 6 + 1] = 0
    normals[i * 6 + 2] = 1

    normals[i * 6 + 3] = 0
    normals[i * 6 + 4] = 0
    normals[i * 6 + 5] = 1

    if (i < segments) {
      const a = i * 2
      const b = i * 2 + 1
      const c = (i + 1) * 2
      const d = (i + 1) * 2 + 1
      indices.push(a, c, b)
      indices.push(b, c, d)
    }
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

export default function BouquetDecoration({ headY = 1.46, headRadius = 0.22 }) {
  const { scene: jasmineSource } = useGLTF('/models/jasmine.glb')

  const rootRef = useRef()
  const jasmineGroupRef = useRef()
  const foliageRef = useRef()
  const pearlRef = useRef()
  const paperRef = useRef()
  const ribbonRef = useRef()
  const streamersRef = useRef({ left: null, right: null })
  const smoothEmerge = useRef(0)

  // ----------------------------------------------------
  // 1. Materials with Botanical Detailing & Petal Wave Shader
  // ----------------------------------------------------
  const materials = useMemo(() => {
    // Champagne Ivory Silk Satin
    const satinMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#fdf7ee'),
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 0.45,
      clearcoatRoughness: 0.35,
      sheen: 1.0,
      sheenColor: new THREE.Color('#fff9eb'),
      sheenRoughness: 0.32,
      side: THREE.DoubleSide,
    })

    // Warm Gold Foil Hem / Trim
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dfbc67'),
      roughness: 0.28,
      metalness: 0.82,
      envMapIntensity: 1.8,
    })

    // Silver Dollar Eucalyptus (soft sage dusty green with subtle waxy bloom)
    const eucalyptMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#4c6b57'),
      roughness: 0.52,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })

    // Italian Ruscus (glossy deep emerald green)
    const ruscusMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1f4528'),
      roughness: 0.36,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })

    // Lustrous Iridescent Pearl Pins
    const pearlMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#fffbf4'),
      roughness: 0.12,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      sheen: 1.0,
      sheenColor: new THREE.Color('#ffe2ea'),
      ior: 1.62,
      envMapIntensity: 2.2,
    })

    // Frosted Vellum Florist Wrapping Paper (accordion collar)
    const paperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#191214'),
      roughness: 0.48,
      metalness: 0.05,
      side: THREE.DoubleSide,
    })

    // -------------------------------------------------------------------
    // JASMINE PETAL MATERIAL: Real-Touch Velvet + Veins + Wave Shader
    // -------------------------------------------------------------------
    const jasminePetalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#fffdfa'),
      roughness: 0.28,
      metalness: 0.01,
      sheen: 1.0,
      sheenColor: new THREE.Color('#fff7e8'),
      sheenRoughness: 0.32,
      clearcoat: 0.32,
      clearcoatRoughness: 0.28,
      ior: 1.48,
      side: THREE.DoubleSide,
    })

    const petalUniforms = {
      uTime: { value: 0 },
      uWaveAmp: { value: 1.0 },
    }

    jasminePetalMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, petalUniforms)
      jasminePetalMat.userData.shader = shader

      // Vertex Shader: Undulating Traveling Petal Waves & Lip Flutter
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uWaveAmp;
           varying vec3 vLocalPos;
           varying float vRadial;
           varying float vAngle;
           varying float vWaveFactor;`
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           vec3 lpN = position;
           float rN = length(lpN.xz);
           float tipWN = smoothstep(0.02, 0.14, rN);
           float flowerPhaseN = sin(dot(modelMatrix[3].xyz, vec3(12.98, 78.23, 45.16))) * 6.28;
           float angleN = atan(lpN.z, lpN.x);
           float waveSlope = cos(uTime * 3.2 - rN * 32.0 + angleN * 3.0 + flowerPhaseN) * tipWN * uWaveAmp * 0.28;
           objectNormal = normalize(objectNormal + vec3(-waveSlope * 0.5, waveSlope, -waveSlope * 0.5));`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vec3 lp = position;
           float r = length(lp.xz);
           float angle = atan(lp.z, lp.x);

           // Deterministic organic phase offset unique to each flower instance in the bouquet
           float flowerPhase = sin(dot(modelMatrix[3].xyz, vec3(12.98, 78.23, 45.16))) * 6.28;

           // Anchor base at corolla tube (0 near stem, 1 at petal blade and tip)
           float tipWeight = smoothstep(0.022, 0.138, r);

           // Undulating traveling breeze waves across petal surface
           float wave1 = sin(uTime * 3.2 - r * 30.0 + angle * 3.0 + flowerPhase);
           float wave2 = cos(uTime * 5.4 - r * 46.0 + angle * 5.0 + flowerPhase * 1.4) * 0.38;
           float petalWave = (wave1 + wave2) * tipWeight * uWaveAmp;

           // Lateral curling flutter along petal edges
           float edgeFlutter = sin(uTime * 4.2 + angle * 5.0 + flowerPhase) * tipWeight * 0.0035 * uWaveAmp;

           transformed.y += petalWave * 0.016;
           transformed.x += cos(angle + 1.57) * edgeFlutter;
           transformed.z += sin(angle + 1.57) * edgeFlutter;

           vLocalPos = position;
           vRadial = r;
           vAngle = angle;
           vWaveFactor = petalWave;`
        )

      // Fragment Shader: Micro-Vein Detailing, Core Golden Pollen Bleed & Translucent SSS
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalPos;
           varying float vRadial;
           varying float vAngle;
           varying float vWaveFactor;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           // 1. Organic radial micro-veins along the petal blade
           float mainVein = smoothstep(0.03, 0.13, vRadial) * sin(vAngle * 25.0 + sin(vRadial * 35.0) * 1.2);
           float fineVein = sin(vAngle * 60.0 + vRadial * 50.0) * 0.5 + 0.5;
           float veinPattern = (mainVein * 0.045 + fineVein * 0.025) * smoothstep(0.025, 0.10, vRadial);

           // 2. Warm golden honey stamen gradient bleeding into the inner petal throat
           float coreGlow = exp(-vRadial * 26.0);
           vec3 coreGold = vec3(1.0, 0.82, 0.36);
           diffuseColor.rgb = mix(diffuseColor.rgb, coreGold, clamp(coreGlow * 0.85, 0.0, 1.0));

           // 3. Delicate petal vein shadow & fold ambient occlusion
           diffuseColor.rgb *= (1.0 - veinPattern * 0.65);

           // 4. Petal corolla base depth shadow
           float baseCavity = smoothstep(0.015, 0.07, vRadial);
           diffuseColor.rgb *= mix(0.72, 1.0, baseCavity);`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           // Dewy velvet texture variations across veins and petal tip
           roughnessFactor = clamp(roughnessFactor + sin(vAngle * 25.0) * 0.04 - vRadial * 0.05, 0.22, 0.65);`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           // 5. Translucent subsurface scattering (SSS) glow at petal tips & edges
           float edgeTranslucency = smoothstep(0.07, 0.145, vRadial) * (0.35 + 0.25 * max(0.0, vWaveFactor));
           vec3 sssWarmth = vec3(1.0, 0.94, 0.84) * edgeTranslucency * 0.28;

           // Warm golden core emission bleeding outward
           float innerPollen = exp(-vRadial * 35.0) * 0.45;
           vec3 pollenGlow = vec3(1.0, 0.78, 0.28) * innerPollen;

           totalEmissiveRadiance += sssWarmth + pollenGlow;`
        )
    }
    jasminePetalMat.customProgramCacheKey = () => 'jasmine-petal-wave-v1'

    // Jasmine Stamen Material: Glowing Golden Pollen Center
    const jasmineCenterMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffbe26'),
      emissive: new THREE.Color('#d98410'),
      emissiveIntensity: 0.75,
      roughness: 0.38,
      metalness: 0.05,
    })

    // Jasmine Calyx & Stem Material: Fresh Emerald Botanical Cuticle
    const jasmineGreeneryMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c4623'),
      roughness: 0.40,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })

    return {
      satinMat,
      goldTrimMat,
      eucalyptMat,
      ruscusMat,
      pearlMat,
      paperMat,
      jasminePetalMat,
      jasmineCenterMat,
      jasmineGreeneryMat,
    }
  }, [])

  // ----------------------------------------------------
  // 2. Foliage Leaves Configuration (16 leaves framing outer roses)
  // ----------------------------------------------------
  const eucalyptGeo = useMemo(() => createLeafGeometry(0.24, 0.14, 10, 6, false), [])
  const ruscusGeo = useMemo(() => createLeafGeometry(0.28, 0.10, 10, 6, true), [])

  const foliageLeaves = useMemo(() => {
    const list = []
    const count = 16
    for (let i = 0; i < count; i++) {
      const isRuscus = i % 2 === 1
      const phi = (i / count) * Math.PI * 2 + 0.1
      const radius = 0.58 + (i % 3) * 0.05
      const y = headY - 0.24 + (i % 2) * 0.035

      const x = Math.cos(phi) * radius
      const z = Math.sin(phi) * radius

      const rotY = -phi + Math.PI * 0.5
      const rotX = 0.82 + (i % 2) * 0.12
      const rotZ = Math.sin(phi * 2) * 0.15

      list.push({
        isRuscus,
        phi,
        radius,
        baseY: y,
        basePos: [x, y, z],
        rot: [rotX, rotY, rotZ],
        scale: 0.92 + (i % 4) * 0.08,
        phase: i * 0.75,
        speed: 0.9 + (i % 3) * 0.18,
      })
    }
    return list
  }, [headY])

  // ----------------------------------------------------
  // 3. Large 3D Jasmine Blossoms (Substantially Increased Size)
  // ----------------------------------------------------
  const jasmineConfigs = useMemo(() => {
    const list = []

    // A. Crown & Valleys Jasmine Blooms (8 prominent, large flowers in the crevices between roses)
    // Sized large (scale 0.82 - 0.95 -> diameter ~0.25 - 0.29m, ~60% size of each rose!)
    const crownCount = 8
    for (let i = 0; i < crownCount; i++) {
      const angle = (i / crownCount) * Math.PI * 2 + 0.32
      const dist = 0.42 + (i % 2) * 0.06
      const y = headY - 0.03 + (i % 3) * 0.03
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      list.push({
        category: 'crown',
        phi: angle,
        baseDist: dist,
        baseY: y,
        basePos: [x, y, z],
        scale: 0.84 + (i % 3) * 0.10,
        rot: [
          0.38 + (i % 2) * 0.12,
          angle + Math.PI * 0.5 + (i % 3) * 0.25,
          (i % 2 === 0 ? 1 : -1) * 0.22,
        ],
        phase: i * 0.85,
        speed: 0.85 + (i % 2) * 0.15,
      })
    }

    // B. Outer Foliage Collar Jasmine Blooms (8 large flowers resting on greenery collar)
    const collarCount = 8
    for (let i = 0; i < collarCount; i++) {
      const angle = (i / collarCount) * Math.PI * 2 + 0.72
      const dist = 0.64 + (i % 2) * 0.05
      const y = headY - 0.21 + (i % 2) * 0.035
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

      list.push({
        category: 'collar',
        phi: angle,
        baseDist: dist,
        baseY: y,
        basePos: [x, y, z],
        scale: 0.76 + (i % 3) * 0.09,
        rot: [
          0.78 + (i % 2) * 0.14,
          angle + Math.PI * 0.5,
          Math.sin(angle * 2) * 0.24,
        ],
        phase: i * 0.95 + 1.2,
        speed: 0.82 + (i % 2) * 0.14,
      })
    }

    // C. Waist Corsage Jasmine Accents (3 large flowers nestled at the ribbon bow)
    const waistItems = [
      { pos: [-0.082, 0.845, 0.12], scale: 0.64, rot: [0.18, -0.35, 0.28], phase: 0.3 },
      { pos: [0.082, 0.845, 0.12], scale: 0.64, rot: [0.18, 0.35, -0.28], phase: 0.7 },
      { pos: [0.0, 0.885, 0.126], scale: 0.68, rot: [0.12, 0.0, 0.0], phase: 0.5 },
    ]
    waistItems.forEach((w) => {
      list.push({
        category: 'waist',
        phi: 0,
        baseDist: 0.12,
        baseY: w.pos[1],
        basePos: w.pos,
        scale: w.scale,
        rot: w.rot,
        phase: w.phase,
        speed: 0.9,
      })
    })

    // D. Ambient Drifting Jasmine Blooms (6 large blossoms gracefully floating near bouquet)
    const driftCount = 6
    for (let i = 0; i < driftCount; i++) {
      const angle = (i / driftCount) * Math.PI * 2 + 0.18
      const dist = 0.98 + (i % 3) * 0.12
      const y = headY - 0.25 + Math.sin(angle * 2) * 0.35
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist * 0.85

      list.push({
        category: 'ambient',
        phi: angle,
        baseDist: dist,
        baseY: y,
        basePos: [x, y, z],
        scale: 0.90 + (i % 3) * 0.12,
        rot: [
          (Math.random() - 0.5) * 0.5,
          angle + Math.PI * 0.5 + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.5,
        ],
        phase: i * 1.1 + 0.4,
        speed: 0.55 + (i % 2) * 0.15,
      })
    }

    return list
  }, [headY])

  // Clone 3D Jasmine models with upgraded real-touch ivory velvet & golden stamen materials
  const jasmineClones = useMemo(() => {
    if (!jasmineSource) return []
    return jasmineConfigs.map((cfg) => {
      const container = new THREE.Group()
      const clone = jasmineSource.clone(true)

      clone.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false
          const origMat = child.material
          if (origMat) {
            const matName = origMat.name || child.name || ''
            if (matName.includes('Petal')) {
              child.material = materials.jasminePetalMat
            } else if (matName.includes('Center')) {
              child.material = materials.jasmineCenterMat
            } else if (matName.includes('Green')) {
              child.material = materials.jasmineGreeneryMat
            } else {
              const m = origMat.clone()
              m.side = THREE.DoubleSide
              child.material = m
            }
          }
        }
      })

      container.add(clone)
      return { container, cfg }
    })
  }, [jasmineSource, jasmineConfigs, materials])

  // ----------------------------------------------------
  // 4. Pearl Pins Positions (in crown crevices)
  // ----------------------------------------------------
  const pearlPins = useMemo(() => {
    const count = 7
    const pins = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.22
      const r = 0.28 + (i % 2) * 0.04
      const y = headY + 0.03 + (i % 3) * 0.02
      pins.push({
        pos: [Math.cos(angle) * r, y, Math.sin(angle) * r],
        scale: 0.016,
      })
    }
    return pins
  }, [headY])

  // ----------------------------------------------------
  // 5. Pleated Parisian Florist Paper Wrap Geometry
  // ----------------------------------------------------
  const pleatedWrapGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const folds = 18
    const numVerts = (folds + 1) * 2
    const positions = new Float32Array(numVerts * 3)
    const normals = new Float32Array(numVerts * 3)
    const uvs = new Float32Array(numVerts * 2)
    const indices = []

    const yBottom = 0.81
    const yTop = 1.18
    const rBottom = 0.108
    const rTopBase = 0.62

    for (let i = 0; i <= folds; i++) {
      const phi = (i / folds) * Math.PI * 2
      const pleat = Math.sin(phi * folds) * 0.042

      positions[i * 6 + 0] = Math.cos(phi) * rBottom
      positions[i * 6 + 1] = yBottom
      positions[i * 6 + 2] = Math.sin(phi) * rBottom

      const rT = rTopBase + pleat
      positions[i * 6 + 3] = Math.cos(phi) * rT
      positions[i * 6 + 4] = yTop - pleat * 0.4
      positions[i * 6 + 5] = Math.sin(phi) * rT

      uvs[i * 4 + 0] = i / folds
      uvs[i * 4 + 1] = 0
      uvs[i * 4 + 2] = i / folds
      uvs[i * 4 + 3] = 1

      if (i < folds) {
        const a = i * 2
        const b = i * 2 + 1
        const c = (i + 1) * 2
        const d = (i + 1) * 2 + 1
        indices.push(a, b, c)
        indices.push(c, b, d)
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [])

  // ----------------------------------------------------
  // 6. French Bow Ribbon Streamers Geometries
  // ----------------------------------------------------
  const leftStreamerGeo = useMemo(() => createRibbonStreamerGeometry(22, 0.036), [])
  const rightStreamerGeo = useMemo(() => createRibbonStreamerGeometry(26, 0.038), [])

  // ----------------------------------------------------
  // 7. Animation Frame Loop: Smooth Emergence, Wave Physics & Flutter
  // ----------------------------------------------------
  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)
    const p = story.smooth
    const t = state.clock.elapsedTime

    // Synchronize emergence with bouquetMaster (emerges as 16 roses fan out)
    const targetEmerge = THREE.MathUtils.smoothstep(p, 0.74, 0.95)
    smoothEmerge.current = damp(smoothEmerge.current, targetEmerge, 4.5, dt)
    const em = smoothEmerge.current

    if (rootRef.current) {
      if (em <= 0.002) {
        rootRef.current.visible = false
        return
      }
      rootRef.current.visible = true
    }

    const ease = 1 - Math.pow(1 - em, 3)

    // Update Jasmine Petal Wave Shader Uniforms
    if (materials.jasminePetalMat.userData.shader?.uniforms) {
      materials.jasminePetalMat.userData.shader.uniforms.uTime.value = t
      materials.jasminePetalMat.userData.shader.uniforms.uWaveAmp.value = em
    }

    // A. Large 3D Jasmine Blossoms Emergence & Organic Wave Swaying
    if (jasmineGroupRef.current && jasmineClones.length > 0) {
      for (let i = 0; i < jasmineClones.length; i++) {
        const { container, cfg } = jasmineClones[i]

        // Natural harmonic wave sway of each blossom head in the breeze
        const headWaveX = Math.sin(t * 1.8 * cfg.speed + cfg.phase) * 0.05 * em
        const headWaveY = Math.cos(t * 1.4 * cfg.speed + cfg.phase * 1.3) * 0.035 * em
        const headWaveZ = Math.sin(t * 2.2 * cfg.speed + cfg.phase * 0.7) * 0.045 * em

        if (cfg.category === 'crown') {
          // Inner crown blossoms fan outward into the valleys between roses
          const splay = ease + Math.sin(ease * Math.PI) * 0.04
          const curR = cfg.baseDist * splay
          const curY = headY + (cfg.baseY - headY) * ease + headWaveY

          container.position.set(
            Math.cos(cfg.phi) * curR,
            curY,
            Math.sin(cfg.phi) * curR
          )
          container.rotation.set(
            cfg.rot[0] + headWaveX,
            cfg.rot[1] + headWaveZ * 0.5,
            cfg.rot[2] + headWaveZ
          )
          container.scale.setScalar(cfg.scale * Math.pow(ease, 0.55))
        } else if (cfg.category === 'collar') {
          // Foliage collar blossoms nestled on eucalyptus leaves
          const splay = ease + Math.sin(ease * Math.PI) * 0.03
          const curR = cfg.baseDist * splay

          container.position.set(
            Math.cos(cfg.phi) * curR,
            cfg.baseY + headWaveY * 0.6,
            Math.sin(cfg.phi) * curR
          )
          container.rotation.set(
            cfg.rot[0] + headWaveX * 0.8,
            cfg.rot[1],
            cfg.rot[2] + headWaveZ * 0.8
          )
          container.scale.setScalar(cfg.scale * Math.pow(ease, 0.55))
        } else if (cfg.category === 'waist') {
          // Accenting the waist ribbon bow
          container.position.set(
            cfg.basePos[0],
            cfg.basePos[1] + headWaveY * 0.4,
            cfg.basePos[2]
          )
          container.rotation.set(
            cfg.rot[0] + headWaveX * 0.5,
            cfg.rot[1],
            cfg.rot[2] + headWaveZ * 0.5
          )
          container.scale.setScalar(cfg.scale * Math.pow(ease, 0.65))
        } else if (cfg.category === 'ambient') {
          // Ambient drifting blossoms hovering gracefully near the bouquet
          const driftX = Math.sin(t * 0.45 * cfg.speed + cfg.phase) * 0.07
          const driftY = Math.cos(t * 0.38 * cfg.speed + cfg.phase * 1.2) * 0.06
          const driftZ = Math.sin(t * 0.32 * cfg.speed) * 0.06

          container.position.set(
            cfg.basePos[0] * ease + driftX,
            cfg.basePos[1] + driftY,
            cfg.basePos[2] * ease + driftZ
          )
          container.rotation.set(
            cfg.rot[0] + Math.sin(t * 0.6 + cfg.phase) * 0.10,
            cfg.rot[1] + Math.cos(t * 0.5 + cfg.phase) * 0.10,
            cfg.rot[2] + Math.sin(t * 0.7 + cfg.phase) * 0.08
          )
          container.scale.setScalar(cfg.scale * Math.pow(ease, 0.55))
        }
      }
    }

    // B. Foliage leaves collar: fan out gracefully under outer roses
    if (foliageRef.current) {
      const leaves = foliageRef.current.children
      for (let i = 0; i < leaves.length && i < foliageLeaves.length; i++) {
        const leaf = leaves[i]
        const cfg = foliageLeaves[i]
        const splayEase = ease + Math.sin(ease * Math.PI) * 0.04
        const curRadius = cfg.radius * splayEase
        const flutter = Math.sin(t * 1.4 * cfg.speed + cfg.phase) * 0.05 * em
        const swayY = Math.cos(t * 1.1 * cfg.speed + cfg.phase * 1.2) * 0.035 * em

        leaf.position.set(
          Math.cos(cfg.phi) * curRadius,
          cfg.baseY,
          Math.sin(cfg.phi) * curRadius
        )
        leaf.rotation.x = cfg.rot[0] + flutter
        leaf.rotation.z = cfg.rot[2] + swayY
        leaf.scale.setScalar(cfg.scale * Math.pow(ease, 0.6))
      }
    }

    // C. Pearl pins: nestled in the rose crown
    if (pearlRef.current) {
      pearlRef.current.position.set(0, headY, 0)
      const pScale = Math.pow(ease, 0.55)
      pearlRef.current.scale.setScalar(Math.max(0.001, pScale))
    }

    // D. Pleated florist wrapping paper: flutes open from stem waist
    if (paperRef.current) {
      paperRef.current.position.set(0, 0.81, 0)
      paperRef.current.scale.set(ease, ease, ease)
    }

    // E. Ribbon & Bow at stem waist: scales up right at y = 0.82
    if (ribbonRef.current) {
      ribbonRef.current.position.set(0, 0.82, 0)
      const rScale = Math.pow(ease, 0.7)
      ribbonRef.current.scale.setScalar(Math.max(0.001, rScale))
    }

    // Dynamic wave flutter along the cascading ribbon streamers
    const updateStreamer = (geo, isRight = false) => {
      const posAttr = geo.attributes.position
      const count = posAttr.count / 2
      const width = isRight ? 0.038 : 0.036
      const totalLen = (isRight ? 0.44 : 0.38) * ease
      const driftDir = isRight ? 1 : -1
      const phaseOffset = isRight ? 1.2 : 0.0

      for (let i = 0; i < count; i++) {
        const v = i / (count - 1)
        const y = -v * totalLen

        const wave1 = Math.sin(t * 2.2 - v * 4.5 + phaseOffset) * 0.016 * v * em
        const wave2 = Math.cos(t * 1.6 - v * 3.2 + phaseOffset * 1.4) * 0.012 * v * em

        const curlX = Math.pow(v, 1.4) * (0.12 * driftDir) + wave1
        const curlZ = Math.sin(v * Math.PI) * 0.035 + wave2

        const halfW = (width * (1.0 - v * 0.12)) * 0.5
        const twistAngle = Math.sin(v * 2.8 + t * 0.8) * 0.35 * v

        const cosT = Math.cos(twistAngle)
        const sinT = Math.sin(twistAngle)

        const leftX = curlX - halfW * cosT
        const rightX = curlX + halfW * cosT
        const leftZ = curlZ + halfW * sinT
        const rightZ = curlZ - halfW * sinT

        posAttr.setXYZ(i * 2 + 0, leftX, y, leftZ)
        posAttr.setXYZ(i * 2 + 1, rightX, y, rightZ)
      }
      posAttr.needsUpdate = true
      geo.computeVertexNormals()
    }

    if (streamersRef.current.left) updateStreamer(leftStreamerGeo, false)
    if (streamersRef.current.right) updateStreamer(rightStreamerGeo, true)
  })

  return (
    <group ref={rootRef} visible={false}>
      {/* ================================================================ */}
      {/* 1. PLEATED PARISIAN FLORIST WRAPPING PAPER FAN COLLAR             */}
      {/* ================================================================ */}
      <group ref={paperRef}>
        <group position={[0, -0.81, 0]}>
          <mesh geometry={pleatedWrapGeo} material={materials.paperMat} />
          {/* Gold foil rim line along pleated paper top */}
          <mesh position={[0, 1.18, 0]} material={materials.goldTrimMat}>
            <torusGeometry args={[0.62, 0.0035, 12, 64]} />
          </mesh>
        </group>
      </group>

      {/* ================================================================ */}
      {/* 2. FRESH BOTANICAL FOLIAGE COLLAR (Eucalyptus & Ruscus)          */}
      {/* ================================================================ */}
      <group ref={foliageRef}>
        {foliageLeaves.map((leaf, idx) => (
          <mesh
            key={idx}
            geometry={leaf.isRuscus ? ruscusGeo : eucalyptGeo}
            material={leaf.isRuscus ? materials.ruscusMat : materials.eucalyptMat}
            position={leaf.basePos}
            rotation={leaf.rot}
            scale={leaf.scale}
          />
        ))}
      </group>

      {/* ================================================================ */}
      {/* 3. LARGE 3D JASMINE BLOSSOMS (WITH DETAILING & WAVE EFFECT)      */}
      {/* ================================================================ */}
      <group ref={jasmineGroupRef}>
        {jasmineClones.map((item, idx) => (
          <primitive key={idx} object={item.container} />
        ))}
      </group>

      {/* ================================================================ */}
      {/* 4. SHIMMERING IRIDESCENT PEARL CORSAGE PINS                      */}
      {/* ================================================================ */}
      <group ref={pearlRef}>
        <group position={[0, -headY, 0]}>
          {pearlPins.map((pin, idx) => (
            <mesh key={idx} position={pin.pos} material={materials.pearlMat}>
              <sphereGeometry args={[pin.scale, 20, 20]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================ */}
      {/* 5. FRENCH SILK SATIN RIBBON TIE & BOW (AT STEM WAIST y ~ 0.82)   */}
      {/* ================================================================ */}
      <group ref={ribbonRef}>
        {/* Double-layered Satin Ribbon Band wrapping around stems */}
        <mesh material={materials.satinMat}>
          <cylinderGeometry args={[0.106, 0.098, 0.075, 32, 1, true]} />
        </mesh>
        {/* Upper Gold Accent Cord */}
        <mesh position={[0, 0.038, 0]} material={materials.goldTrimMat}>
          <torusGeometry args={[0.1065, 0.003, 12, 48]} />
        </mesh>
        {/* Lower Gold Accent Cord */}
        <mesh position={[0, -0.038, 0]} material={materials.goldTrimMat}>
          <torusGeometry args={[0.0985, 0.003, 12, 48]} />
        </mesh>

        {/* Hand-Tied French Bow at the front of the waist band (z = 0.108) */}
        <group position={[0, 0.005, 0.108]}>
          {/* Central Knot */}
          <mesh material={materials.satinMat} scale={[1.35, 1.0, 0.85]}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>
          <mesh material={materials.goldTrimMat} scale={[1.38, 0.45, 0.88]}>
            <torusGeometry args={[0.024, 0.003, 12, 24]} />
          </mesh>

          {/* Left Bow Loop (Volumetric Curved Ribbon Loop) */}
          <group position={[-0.045, 0.022, 0]} rotation={[0.15, -0.22, 0.42]}>
            <mesh material={materials.satinMat} scale={[1.4, 0.85, 0.45]}>
              <torusGeometry args={[0.052, 0.016, 16, 32, Math.PI * 1.65]} />
            </mesh>
            {/* Inner secondary loop accent for luxury floral depth */}
            <mesh material={materials.satinMat} scale={[0.85, 0.55, 0.35]}>
              <torusGeometry args={[0.042, 0.012, 14, 28, Math.PI * 1.6]} />
            </mesh>
          </group>

          {/* Right Bow Loop (Volumetric Curved Ribbon Loop) */}
          <group position={[0.045, 0.022, 0]} rotation={[0.15, 0.22, -0.42]}>
            <mesh material={materials.satinMat} scale={[1.4, 0.85, 0.45]}>
              <torusGeometry args={[0.052, 0.016, 16, 32, Math.PI * 1.65]} />
            </mesh>
            {/* Inner secondary loop accent */}
            <mesh material={materials.satinMat} scale={[0.85, 0.55, 0.35]}>
              <torusGeometry args={[0.042, 0.012, 14, 28, Math.PI * 1.6]} />
            </mesh>
          </group>

          {/* Left Cascading Ribbon Streamer */}
          <mesh
            ref={(el) => (streamersRef.current.left = el)}
            position={[-0.018, -0.012, 0.006]}
            geometry={leftStreamerGeo}
            material={materials.satinMat}
          />

          {/* Right Cascading Ribbon Streamer */}
          <mesh
            ref={(el) => (streamersRef.current.right = el)}
            position={[0.018, -0.012, 0.006]}
            geometry={rightStreamerGeo}
            material={materials.satinMat}
          />
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/jasmine.glb')
