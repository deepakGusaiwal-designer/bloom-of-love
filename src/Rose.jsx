import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { story, ramp, damp, BEATS } from './scroll.js'

/*
 * Works with any free GLB rose (Sketchfab / Poly Pizza / Kenney):
 *  1. normalizes scale + position so the flower head sits at ~y 1.56
 *  2. classifies petal meshes (by name, then by material redness)
 *  3. injects a vertex-shader "bloom" that folds petals into a closed bud
 *     at progress 0 and lets them unfold organically as you scroll —
 *     no per-petal rigging required, so any model blooms.
 */

const PETAL_WORDS = /petal|rose|flower|bud|blossom|bloom/i
const NOT_PETAL_WORDS = /stem|stalk|leaf|leaves|grass|green|branch|calyx|sepal|thorn|vase|pot|ground|collider/i
const LEAF_WORDS = /leaf|leaves|foliage|grass|pcube/i

// Rich, lifelike velvet crimson tones so every petal fold and vein stays deep and tactile
const DARK = new THREE.Color('#a81c2e') // deep velvet ruby in Act I
const CRIMSON = new THREE.Color('#e8263c') // lush, saturated real-touch crimson in Act III
const SCARLET = new THREE.Color('#ff3b52') // vibrant scarlet-rose in Act IV
const BLUSH_SHEEN = new THREE.Color('#ff9eb0')
const BASE_EMIT = new THREE.Color('#240307')
const GOLD_EMIT = new THREE.Color('#5c1118')

// Subtle botanical color tints across the bouquet so adjacent roses have natural depth and contrast
const BOUQUET_TINTS = [
  { mul: new THREE.Color('#ffffff'), emitMul: 1.0 }, // Classic crimson-scarlet (hero match)
  { mul: new THREE.Color('#c87882'), emitMul: 0.72 }, // Deep Baccara velvet ruby
  { mul: new THREE.Color('#ff9ea8'), emitMul: 1.18 }, // Bright warm scarlet-blush
  { mul: new THREE.Color('#e28894'), emitMul: 0.88 }, // Rich carmine rose
]

// Window-level pointer tracker so bouquet hover works seamlessly even over text overlays
const hoverPointer = {
  x: 0,
  y: 0,
  active: false,
  initialized: false,
}

function initHoverListeners() {
  if (hoverPointer.initialized || typeof window === 'undefined') return
  hoverPointer.initialized = true
  window.addEventListener(
    'pointermove',
    (e) => {
      hoverPointer.x = (e.clientX / window.innerWidth) * 2 - 1
      hoverPointer.y = -(e.clientY / window.innerHeight) * 2 + 1
      hoverPointer.active = true
    },
    { passive: true }
  )
  window.addEventListener(
    'pointerleave',
    () => {
      hoverPointer.active = false
    },
    { passive: true }
  )
}

function isReddish(material) {
  const c = material?.color
  if (!c) return false
  return c.r > 0.18 && c.r > c.g * 1.5 && c.r > c.b * 1.5
}

// 15 copies around the central hero rose = a lush 16-rose hand-tied dome bouquet at the bottom scroll
// Distances (distMul, dropMul) are scaled by the model's actual measured flower-head radius so roses pack tightly
const BOUQUET_LAYOUT = [
  // Inner crown ring (6 roses) — tightly hugging the central hero rose in a hexagonal floral halo
  { angleDeg: 15, ring: 1, tiltRad: 0.24, distMul: 1.56, dropMul: -0.16, scale: 0.95, spinY: 1.1, stagger: 0.0 },
  { angleDeg: 75, ring: 1, tiltRad: 0.23, distMul: 1.52, dropMul: -0.12, scale: 0.96, spinY: -1.7, stagger: 0.05 },
  { angleDeg: 135, ring: 1, tiltRad: 0.24, distMul: 1.56, dropMul: -0.14, scale: 0.94, spinY: 2.2, stagger: 0.10 },
  { angleDeg: 195, ring: 1, tiltRad: 0.25, distMul: 1.58, dropMul: -0.18, scale: 0.95, spinY: -0.8, stagger: 0.15 },
  { angleDeg: 255, ring: 1, tiltRad: 0.26, distMul: 1.54, dropMul: -0.22, scale: 0.93, spinY: 1.6, stagger: 0.20 },
  { angleDeg: 315, ring: 1, tiltRad: 0.25, distMul: 1.56, dropMul: -0.20, scale: 0.94, spinY: -2.4, stagger: 0.25 },
  // Outer floral collar ring (9 roses) — nestled in the valleys around the inner ring for a full hemispherical dome
  { angleDeg: 0, ring: 2, tiltRad: 0.44, distMul: 2.78, dropMul: -0.58, scale: 0.88, spinY: -2.1, stagger: 0.32 },
  { angleDeg: 42, ring: 2, tiltRad: 0.42, distMul: 2.72, dropMul: -0.52, scale: 0.90, spinY: 0.9, stagger: 0.38 },
  { angleDeg: 86, ring: 2, tiltRad: 0.40, distMul: 2.66, dropMul: -0.46, scale: 0.89, spinY: -1.3, stagger: 0.44 },
  { angleDeg: 130, ring: 2, tiltRad: 0.42, distMul: 2.72, dropMul: -0.52, scale: 0.88, spinY: 2.6, stagger: 0.50 },
  { angleDeg: 174, ring: 2, tiltRad: 0.44, distMul: 2.78, dropMul: -0.58, scale: 0.87, spinY: -2.8, stagger: 0.56 },
  { angleDeg: 215, ring: 2, tiltRad: 0.45, distMul: 2.74, dropMul: -0.64, scale: 0.86, spinY: 1.4, stagger: 0.62 },
  { angleDeg: 252, ring: 2, tiltRad: 0.46, distMul: 2.68, dropMul: -0.68, scale: 0.85, spinY: -0.6, stagger: 0.68 },
  { angleDeg: 288, ring: 2, tiltRad: 0.46, distMul: 2.68, dropMul: -0.68, scale: 0.86, spinY: 2.0, stagger: 0.74 },
  { angleDeg: 324, ring: 2, tiltRad: 0.45, distMul: 2.74, dropMul: -0.62, scale: 0.87, spinY: -1.5, stagger: 0.80 },
]

export default function Rose({ url, onReady }) {
  const { scene: model } = useGLTF(url)
  const { gl, size: viewportSize } = useThree()
  const group = useRef()
  const sway = useRef()
  const heroRoseRef = useRef()
  const bouquetRef = useRef()
  const bouquetClones = useRef([])
  const headMetrics = useRef({ y: 1.46, radius: 0.22 })
  const heroHover = useRef(0)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    initHoverListeners()
  }, [])

  // uniforms shared by every petal and leaf material
  const shared = useMemo(
    () => ({
      uBloom: { value: 0 },
      uTime: { value: 0 },
      uBreath: { value: 0 },
    }),
    []
  )

  const petalMats = useRef([])
  const colorTmp = useMemo(() => new THREE.Color(), [])
  const emitTmp = useMemo(() => new THREE.Color(), [])
  const pivotOffset = useMemo(() => new THREE.Vector3(), [])
  const projVec = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    if (!model || !group.current) return

    // ---------- 1 · normalize (idempotent across StrictMode / re-runs) ----------
    model.position.set(0, 0, 0)
    model.rotation.set(0, 0, 0)
    model.scale.setScalar(1)
    model.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 1e-4)
    const scale = 1.75 / maxDim
    model.scale.setScalar(scale)
    model.updateMatrixWorld(true)

    const box2 = new THREE.Box3().setFromObject(model)
    const center2 = box2.getCenter(new THREE.Vector3())
    model.position.x = -center2.x
    model.position.z = -center2.z
    model.position.y = -box2.min.y // base on the floor
    model.updateMatrixWorld(true)

    // ---------- 2 · classify meshes & sharpen textures ----------
    const maxAniso = gl.capabilities.getMaxAnisotropy?.() || 8
    const meshes = []
    model.traverse((o) => {
      if (o.isMesh) {
        if (!o.userData.origMaterial) o.userData.origMaterial = o.material
        if (o.geometry && !o.userData.normalsComputed) {
          o.geometry.computeVertexNormals()
          o.userData.normalsComputed = true
        }
        const origMat = o.userData.origMaterial
        if (origMat?.map) {
          origMat.map.anisotropy = maxAniso
          origMat.map.minFilter = THREE.LinearMipmapLinearFilter
          origMat.map.magFilter = THREE.LinearFilter
          origMat.map.needsUpdate = true
        }
        meshes.push(o)
      }
    })

    let petals = meshes.filter((m) => {
      const mat = m.userData.origMaterial || m.material
      const texName = mat?.map?.name || mat?.map?.image?.currentSrc || ''
      const n = `${m.name} ${mat?.name ?? ''} ${texName}`
      if (NOT_PETAL_WORDS.test(n)) return false
      if (PETAL_WORDS.test(n)) return true
      return isReddish(mat)
    })
    // A model that is only a flower head, with unhelpful names:
    if (petals.length === 0) petals = meshes.filter((m) => !NOT_PETAL_WORDS.test(m.name))
    if (petals.length === 0) petals = meshes

    // ---------- 2b · leaf waving shader + stem setup ----------
    const nonPetals = meshes.filter((m) => !petals.includes(m))

    // Find stem horizontal axis in world space (defaults to x=0, z=0)
    const stemWorldCenter = new THREE.Vector3(0, 0.8, 0)
    nonPetals.forEach((m) => {
      const origMat = m.userData.origMaterial || m.material
      const texName = origMat?.map?.name || origMat?.map?.image?.currentSrc || ''
      const n = `${m.name} ${origMat?.name ?? ''} ${texName}`
      m.geometry.computeBoundingBox()
      const bSize = m.geometry.boundingBox.getSize(new THREE.Vector3())
      const isLeafMesh = LEAF_WORDS.test(n) || Math.max(bSize.x, bSize.z) > bSize.y * 0.25
      if (!isLeafMesh) {
        const sb = new THREE.Box3().setFromObject(m)
        sb.getCenter(stemWorldCenter)
      }
    })

    nonPetals.forEach((mesh) => {
      const origMat = mesh.userData.origMaterial || mesh.material
      const texName = origMat?.map?.name || origMat?.map?.image?.currentSrc || ''
      const n = `${mesh.name} ${origMat?.name ?? ''} ${texName}`
      mesh.geometry.computeBoundingBox()
      const bSize = mesh.geometry.boundingBox.getSize(new THREE.Vector3())
      const isLeafMesh = LEAF_WORDS.test(n) || Math.max(bSize.x, bSize.z) > bSize.y * 0.25

      const mat = origMat.clone()
      mat.side = THREE.DoubleSide
      mat.roughness = 0.58
      mat.envMapIntensity = 1.25

      if (isLeafMesh) {
        mesh.frustumCulled = false
        const localStem = mesh.worldToLocal(stemWorldCenter.clone())
        const leafSpan = Math.max(bSize.x, bSize.z) * 0.5

        const leafUniforms = {
          uTime: shared.uTime,
          uStemAxis: { value: new THREE.Vector2(localStem.x, localStem.z) },
          uLeafSpan: { value: leafSpan },
        }

        mat.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, leafUniforms)
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>
               uniform float uTime;
               uniform vec2 uStemAxis;
               uniform float uLeafSpan;`
            )
            .replace(
              '#include <beginnormal_vertex>',
              `#include <beginnormal_vertex>
               vec2 relLeafN = position.xz - uStemAxis;
               float spanN = max(uLeafSpan, 0.0001);
               float rLeafN = clamp(length(relLeafN) / spanN, 0.0, 1.2);
               float wLeafN = smoothstep(0.06, 0.85, rLeafN);
               float phaseN = sign(relLeafN.x) * 1.4 + (position.y / spanN) * 1.2;
               float slopeN = cos(uTime * 2.0 - rLeafN * 3.0 + phaseN) * wLeafN * 0.22;
               objectNormal = normalize(objectNormal + vec3(0.0, slopeN, slopeN * 0.5));`
            )
            .replace(
              '#include <begin_vertex>',
              `vec3 transformed = vec3(position);
               vec2 relLeaf = position.xz - uStemAxis;
               float safeSpan = max(uLeafSpan, 0.0001);
               float rLeaf = clamp(length(relLeaf) / safeSpan, 0.0, 1.2);
               // Keep leaf base anchored to the stem (0 near stem, 1 toward leaf tip)
               float tipWeight = smoothstep(0.06, 0.88, rLeaf);
               float leafPhase = sign(relLeaf.x) * 1.4 + (position.y / safeSpan) * 1.2;

               // Traveling breeze wave along the leaf blade + gentle tip flutter
               float primaryWave = sin(uTime * 2.0 - rLeaf * 3.0 + leafPhase);
               float flutterWave = cos(uTime * 3.6 - rLeaf * 4.8 + leafPhase * 1.7) * 0.35;
               float wave = (primaryWave + flutterWave) * tipWeight;

               transformed.y += wave * safeSpan * 0.11;
               transformed.z += cos(uTime * 1.6 - rLeaf * 2.4 + leafPhase) * tipWeight * safeSpan * 0.065;
               transformed.x += primaryWave * tipWeight * safeSpan * 0.022 * (-sign(relLeaf.x));`
            )
        }
        mat.customProgramCacheKey = () => `rose-leaf-wave-${mesh.uuid}`
        mat.needsUpdate = true
      }

      mesh.material = mat
    })

    // the flower head = bounds of the petal meshes
    const headBox = new THREE.Box3()
    petals.forEach((m) => headBox.expandByObject(m))
    const headCenter = headBox.getCenter(new THREE.Vector3())
    const headSize = headBox.getSize(new THREE.Vector3())
    const headRadius = Math.max(headSize.x, headSize.z) * 0.5
    headMetrics.current = {
      y: headCenter.y,
      radius: THREE.MathUtils.clamp(headRadius, 0.15, 0.28),
    }

    // ---------- 3 · petal materials + real-touch velvet & wave shader ----------
    petalMats.current = []

    petals.forEach((mesh, meshIdx) => {
      mesh.frustumCulled = false

      const src = mesh.userData.origMaterial || mesh.material
      const baseMat = new THREE.MeshPhysicalMaterial()
      if (src) {
        for (const k of [
          'map', 'normalMap', 'normalScale', 'roughnessMap', 'metalnessMap',
          'aoMap', 'aoMapIntensity', 'emissiveMap', 'alphaMap', 'envMapIntensity',
          'roughness', 'metalness', 'transparent', 'opacity', 'alphaTest', 'vertexColors',
        ]) {
          if (src[k] !== undefined && src[k] !== null) {
            if (src[k]?.isVector2 || src[k]?.isColor) baseMat[k].copy(src[k])
            else baseMat[k] = src[k]
          }
        }
        if (src.color) baseMat.color.copy(src.color)
      }
      // Real-touch plush velvet epidermis + subtle dewy sheen + translucent depth
      baseMat.sheen = 1.0
      baseMat.sheenColor = BLUSH_SHEEN.clone()
      baseMat.sheenRoughness = 0.36
      baseMat.clearcoat = 0.24
      baseMat.clearcoatRoughness = 0.38
      baseMat.roughness = 0.62
      baseMat.metalness = 0.01
      baseMat.ior = 1.42
      baseMat.envMapIntensity = 1.45
      baseMat.emissive = BASE_EMIT.clone()
      baseMat.side = THREE.DoubleSide

      // per-mesh head-center in this mesh's local space
      const localCenter = mesh.worldToLocal(headCenter.clone())
      const worldScale = mesh.getWorldScale(new THREE.Vector3())
      const localRadius = headRadius / Math.max((worldScale.x + worldScale.z) / 2, 1e-4)

      const uniforms = {
        ...shared,
        uCenter: { value: localCenter },
        uRadius: { value: localRadius },
      }

      const compilePetalShader = (shader) => {
        Object.assign(shader.uniforms, uniforms)
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
             uniform float uBloom;
             uniform float uTime;
             uniform float uBreath;
             uniform vec3 uCenter;
             uniform float uRadius;
             varying float vPetalRadial;
             varying float vPetalHeight;
             varying float vPetalWave;
             varying float vPetalVein;`
          )
          .replace(
            '#include <beginnormal_vertex>',
            `#include <beginnormal_vertex>
             vec3 relN = position - uCenter;
             float safeRadN = max(uRadius, 0.0001);
             float rnN = clamp(length(relN.xz) / safeRadN, 0.0, 1.2);
             float ynN = relN.y / safeRadN;
             float angleN = atan(relN.z, relN.x);
             float tipWeightN = smoothstep(0.10, 0.90, rnN) * smoothstep(-0.45, 0.45, ynN);
             float waveAmpN = mix(0.55, 1.0, uBloom);
             float waveSlopeN = cos(uTime * 1.9 - rnN * 3.4 + angleN * 2.0 + ynN * 1.5) * tipWeightN * waveAmpN * 0.16;
             vec3 domeNormal = normalize(vec3(relN.x, safeRadN * 0.72, relN.z) + 1e-4);
             objectNormal = normalize(mix(objectNormal, domeNormal, 0.14) + vec3(waveSlopeN * 0.5, waveSlopeN, waveSlopeN * 0.5));`
          )
          .replace(
            '#include <begin_vertex>',
            `vec3 relB = position - uCenter;
             float rB = length(relB.xz);
             float safeRad = max(uRadius, 0.0001);
             float rnB = clamp(rB / safeRad, 0.0, 1.2);
             // C2 smooth radial curve so petals never crease or kink
             float curveB = smoothstep(0.0, 1.05, rnB);
             float ynB = relB.y / safeRad;
             float closeB = 1.0 - uBloom;
             // outer petals cup smoothly inward and upward into a rosebud
             float pullB = mix(1.0, 0.42 + 0.16 * (1.0 - curveB), closeB * curveB);
             float liftB = closeB * curveB * safeRad * 0.42;
             float squashB = mix(1.0, 0.88, closeB);
             vec3 transformed = uCenter + vec3(relB.x * pullB, relB.y * squashB + liftB, relB.z * pullB);

             // Subtle organic traveling wave + delicate petal-lip flutter
             float angleB = atan(relB.z, relB.x);
             float tipWeightB = smoothstep(0.10, 0.90, rnB) * smoothstep(-0.45, 0.45, ynB);
             float waveAmp = mix(0.55, 1.0, uBloom);
             float primaryWave = sin(uTime * 1.9 - rnB * 3.4 + angleB * 2.0 + ynB * 1.5);
             float lipFlutter = cos(uTime * 3.2 - rnB * 5.0 + angleB * 3.0 - ynB * 2.2) * 0.38;
             float totalWave = (primaryWave + lipFlutter) * tipWeightB * waveAmp;

             vec3 radialDir = normalize(vec3(relB.x, safeRad * 0.32, relB.z) + 1e-4);
             vec3 tangentDir = normalize(vec3(-relB.z, 0.0, relB.x) + 1e-4);

             // Breathing + traveling petal wave displacement
             float breatheB = sin(uTime * 1.1 + ynB * 1.8 + curveB * 2.4);
             transformed += radialDir * (breatheB * uBreath * 0.016 + totalWave * 0.025) * safeRad;
             transformed.y += primaryWave * tipWeightB * waveAmp * safeRad * 0.019;
             transformed += tangentDir * lipFlutter * tipWeightB * waveAmp * safeRad * 0.010;

             vPetalRadial = rnB;
             vPetalHeight = clamp((ynB + 0.5) / 1.1, 0.0, 1.0);
             vPetalWave = totalWave;
             vPetalVein = sin(angleB * 24.0 + sin(rnB * 11.0 + angleB * 4.0) * 1.3);`
          )

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
             varying float vPetalRadial;
             varying float vPetalHeight;
             varying float vPetalWave;
             varying float vPetalVein;`
          )
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
             // Deep velvet fold ambient occlusion near petal base + precomputed radial vein tint
             float veinDetail = smoothstep(0.12, 0.88, vPetalRadial) * vPetalVein * 0.035;
             float cavityAO = mix(0.56, 1.06, smoothstep(0.04, 0.72, vPetalRadial * 0.65 + vPetalHeight * 0.55));
             diffuseColor.rgb *= (cavityAO + veinDetail);`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
             roughnessFactor = clamp(roughnessFactor + vPetalVein * 0.045 - vPetalRadial * 0.04, 0.28, 0.85);`
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
             // Real-touch warm ruby subsurface scattering at thin outer petal edges + velvet grazing sheen
             float edgeThin = smoothstep(0.32, 0.92, vPetalRadial) * smoothstep(0.15, 0.88, vPetalHeight);
             vec3 sssGlow = vec3(0.82, 0.08, 0.16) * edgeThin * (0.24 + 0.14 * max(0.0, vPetalWave));
             totalEmissiveRadiance += sssGlow;`
          )
      }

      // Lightweight standard material for the 15 bouquet clones (avoids 15x dual-lobe clearcoat+sheen BRDF overdraw)
      const cloneBaseMat = new THREE.MeshStandardMaterial({
        map: baseMat.map || null,
        normalMap: baseMat.normalMap || null,
        roughnessMap: baseMat.roughnessMap || null,
        aoMap: baseMat.aoMap || null,
        roughness: 0.54,
        metalness: 0.02,
        envMapIntensity: 1.45,
        emissive: BASE_EMIT.clone(),
        side: THREE.DoubleSide,
      })
      if (baseMat.normalScale) cloneBaseMat.normalScale.copy(baseMat.normalScale)

      const heroCacheKey = `rose-hero-v4-${meshIdx}`
      const cloneCacheKey = `rose-clone-v4-${meshIdx}`
      const variantMats = BOUQUET_TINTS.map((_, tIdx) => {
        const m = tIdx === 0 ? baseMat : cloneBaseMat.clone()
        m.userData.tintIdx = tIdx
        m.onBeforeCompile = compilePetalShader
        m.customProgramCacheKey = () => (tIdx === 0 ? heroCacheKey : cloneCacheKey)
        m.needsUpdate = true
        petalMats.current.push(m)
        return m
      })

      mesh.userData.petalVariantMats = variantMats
      mesh.material = variantMats[0]
    })

    // ---------- 4 · create bouquet copies of the current normalized & shaded rose ----------
    const headY = headMetrics.current.y
    if (bouquetRef.current) {
      while (bouquetRef.current.children.length > 0) {
        bouquetRef.current.remove(bouquetRef.current.children[0])
      }
      bouquetClones.current = BOUQUET_LAYOUT.map((cfg, idx) => {
        // Pivot around the flower head center (0, headY, 0) so dome packing is exact and stems cross at the waist
        const pivotGroup = new THREE.Group()
        pivotGroup.rotation.order = 'YXZ'
        pivotGroup.position.set(0, headY, 0)
        pivotGroup.scale.setScalar(0.001)
        pivotGroup.visible = false

        // stemHolder offsets the rose by -headY so rotation.y spins purely around the rose's own stem axis
        const stemHolder = new THREE.Group()
        stemHolder.position.set(0, -headY, 0)

        const tintIdx = (idx % 3) + 1
        const clone = model.clone(true)

        // Assign botanical shade variant to each cloned rose's petals for natural bouquet depth
        const origMeshes = []
        model.traverse((c) => {
          if (c.isMesh) origMeshes.push(c)
        })
        let mCursor = 0
        clone.traverse((child) => {
          if (child.isMesh) {
            child.frustumCulled = false
            const origMesh = origMeshes[mCursor++]
            if (origMesh?.userData?.petalVariantMats) {
              child.material = origMesh.userData.petalVariantMats[tintIdx]
            }
          }
        })

        stemHolder.add(clone)
        pivotGroup.add(stemHolder)
        bouquetRef.current.add(pivotGroup)

        const phi = THREE.MathUtils.degToRad(cfg.angleDeg)
        return {
          pivotGroup,
          stemHolder,
          cfg,
          h: Math.cos(phi),
          v: Math.sin(phi),
          phase: idx * 1.15 + 0.4,
          hover: 0,
          cushion: 0,
        }
      })
    }

    onReadyRef.current?.()
  }, [model, shared, gl])

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 20)
    const p = story.smooth
    const t = state.clock.elapsedTime
    const aspect = viewportSize.width / Math.max(viewportSize.height, 1)
    const px = hoverPointer.active ? hoverPointer.x : state.pointer.x
    const py = hoverPointer.active ? hoverPointer.y : state.pointer.y
    const isPointerActive = hoverPointer.active || Math.hypot(state.pointer.x, state.pointer.y) > 0.01

    // ---------- opening choreography ----------
    const bloomTarget = ramp(p, [
      [0, 0.15], // slightly cupped bud so inner petals are already distinct
      [BEATS.seed, 0.28],
      [BEATS.awaken, 0.52], // outer petals loosen smoothly
      [BEATS.bloom, 0.92],
      [BEATS.blush, 1.0], // fully open
    ])
    shared.uBloom.value = damp(shared.uBloom.value, bloomTarget, 3.8, dt)
    shared.uTime.value = t
    shared.uBreath.value = ramp(p, [
      [0, 0.16],
      [BEATS.awaken, 0.28],
      [BEATS.blush, 0.55],
      [1, 0.42],
    ])

    // ---------- bouquet emergence + interactive per-rose hover physics ----------
    const bouquetMaster = THREE.MathUtils.smoothstep(p, 0.76, 0.97)
    const { y: headY, radius: headR } = headMetrics.current

    // 1. Central Hero Rose hover interaction (active across all scroll sections & in the bouquet center)
    if (heroRoseRef.current && group.current) {
      let hDx = 0
      let hDy = 0
      let targetHeroHover = 0
      if (isPointerActive) {
        projVec
          .set(0, headY, 0)
          .applyMatrix4(group.current.matrixWorld)
          .project(state.camera)
        hDx = (projVec.x - px) * aspect
        hDy = projVec.y - py
        const hDist = Math.hypot(hDx, hDy)
        if (hDist < 0.24) {
          targetHeroHover = Math.pow(1 - hDist / 0.24, 1.5)
        }
      }
      heroHover.current = damp(heroHover.current, targetHeroHover, 10, dt)
      const hh = heroHover.current

      heroRoseRef.current.position.set(
        -hDx * hh * 0.025,
        bouquetMaster * 0.035 + hh * 0.035,
        hh * 0.055
      )
      heroRoseRef.current.rotation.z = damp(
        heroRoseRef.current.rotation.z,
        hDx * hh * 0.28,
        8,
        dt
      )
      heroRoseRef.current.rotation.x = damp(
        heroRoseRef.current.rotation.x,
        -hDy * hh * 0.28,
        8,
        dt
      )
      heroRoseRef.current.scale.setScalar(1 + hh * 0.11)
    }

    // 2. Bouquet Clones emergence + individual rose hover swell & neighbor cushion parting
    const groupMatWorld = group.current?.matrixWorld
    for (let i = 0; i < bouquetClones.current.length; i++) {
      const item = bouquetClones.current[i]
      const { pivotGroup, stemHolder, cfg, h, v, phase } = item
      const startP = 0.76 + cfg.stagger * 0.09
      const endP = startP + 0.13
      const localB = THREE.MathUtils.clamp((p - startP) / (endP - startP), 0, 1)

      if (localB <= 0.002) {
        pivotGroup.visible = false
        pivotGroup.scale.setScalar(0.001)
        item.hover = 0
        item.cushion = 0
        continue
      }

      pivotGroup.visible = true
      const ease = 1 - Math.pow(1 - localB, 3)
      const splayEase = ease + Math.sin(ease * Math.PI) * 0.045

      const domeDist = cfg.distMul * headR * splayEase
      const domeDrop = cfg.dropMul * headR * ease
      const basePosX = h * domeDist
      const basePosY = headY + (v * headR * 0.52 + domeDrop) * ease
      const basePosZ = -v * domeDist * 0.88

      let dx = 0
      let dy = 0
      let dist = 10
      let targetHover = 0
      let targetCushion = 0

      // Fast direct matrixWorld transform (avoids 15 recursive getWorldPosition scene-graph traversals)
      if (isPointerActive && groupMatWorld) {
        projVec
          .set(basePosX, basePosY, basePosZ)
          .applyMatrix4(groupMatWorld)
          .project(state.camera)
        dx = (projVec.x - px) * aspect
        dy = projVec.y - py
        dist = Math.hypot(dx, dy)

        if (dist < 0.21) {
          targetHover = Math.pow(1 - dist / 0.21, 1.55) * ease
        } else if (dist < 0.36) {
          targetCushion = Math.sin(((0.36 - dist) / 0.31) * Math.PI) * ease
        }
      }

      item.hover = damp(item.hover, targetHover, 11, dt)
      item.cushion = damp(item.cushion, targetCushion, 9, dt)

      const dirX = dist > 1e-4 && dist < 1 ? dx / dist : h
      const dirY = dist > 1e-4 && dist < 1 ? dy / dist : v

      // Individual gentle breeze sway + lively flutter when hovered
      const flutterBoost = 1 + item.hover * 1.8
      const breezeZ = Math.sin(t * 1.15 * flutterBoost + phase) * 0.015 * ease
      const breezeX = Math.cos(t * 0.95 * flutterBoost + phase * 1.3) * 0.013 * ease

      // Outward dome roll & pitch + interactive hover tilt toward cursor + neighbor cushion parting
      const pitchFactor = v >= 0 ? 0.65 : 0.78
      const hoverTiltZ = dx * item.hover * 0.42 - dirX * item.cushion * 0.11
      const hoverTiltX = -dy * item.hover * 0.42 + dirY * item.cushion * 0.11

      pivotGroup.rotation.z = -h * cfg.tiltRad * splayEase + breezeZ + hoverTiltZ
      pivotGroup.rotation.x = -v * cfg.tiltRad * pitchFactor * splayEase + breezeX + hoverTiltX

      // Spin around the rose's own stem axis + subtle playful twist on hover
      stemHolder.rotation.y = cfg.spinY * ease + item.hover * 0.26

      const hoverLift = item.hover * 0.085
      const cushionPush = item.cushion * 0.028

      pivotGroup.position.set(
        basePosX + h * hoverLift * 0.45 + dirX * cushionPush,
        basePosY + hoverLift * 0.65 + dirY * cushionPush * 0.6,
        basePosZ + hoverLift * 0.75
      )

      const baseScale = cfg.scale * Math.pow(ease, 0.55)
      const hoverScale = baseScale * (1 + item.hover * 0.18)
      pivotGroup.scale.setScalar(Math.max(0.001, hoverScale))
    }

    if (group.current) {
      group.current.rotation.order = 'YXZ'

      // Swell in scale as the rose blooms right toward the user's face, then frame the full bouquet at the bottom
      const s = ramp(p, [
        [0, 0.90],
        [BEATS.seed, 0.98],
        [BEATS.awaken, 1.08],
        [BEATS.bloom, 1.24],
        [BEATS.blush, 1.20],
        [BEATS.eternal, 1.06],
        [1, 0.98],
      ])
      const curScale = damp(group.current.scale.x, s, 4.5, dt)
      group.current.scale.setScalar(curScale)

      // Track the camera's orbit angle so forward pitch (rotation.x) bows the flower crown toward the viewer
      const camAzimuth = ramp(p, [
        [0, -0.25],
        [BEATS.seed, -0.08],
        [BEATS.awaken, 0.1],
        [BEATS.bloom, 0.32],
        [BEATS.blush, 0.62],
        [BEATS.eternal, 0.85],
        [1, 1.0],
      ])
      const turnOffset = ramp(p, [
        [0, -0.42],
        [BEATS.awaken, -0.12],
        [BEATS.bloom, 0.0],
        [BEATS.blush, 0.05],
        [1, 0.0],
      ])
      const targetRotY = camAzimuth + turnOffset + px * 0.12

      // Forward bloom tilt (bows the open rose & bouquet dome toward the user) + organic floating nod
      const targetRotX =
        ramp(p, [
          [0, 0.10],
          [BEATS.seed, 0.18],
          [BEATS.awaken, 0.30],
          [BEATS.bloom, 0.46],
          [BEATS.blush, 0.42],
          [1, 0.35],
        ]) +
        Math.sin(t * 0.65) * 0.04 -
        py * 0.09

      // Expressive lateral head-tilt + gentle floating sway
      const targetRotZ =
        ramp(p, [
          [0, 0.08],
          [BEATS.awaken, -0.05],
          [BEATS.bloom, 0.10],
          [BEATS.blush, -0.08],
          [1, 0.02],
        ]) +
        Math.cos(t * 0.52) * 0.035 +
        px * 0.08

      group.current.rotation.y = damp(group.current.rotation.y, targetRotY, 4.5, dt)
      group.current.rotation.x = damp(group.current.rotation.x, targetRotX, 4.5, dt)
      group.current.rotation.z = damp(group.current.rotation.z, targetRotZ, 4.5, dt)

      // Pivot around the flower head center (y = 1.46) so tilting faces the user without drifting off-center
      pivotOffset.set(0, 1.46 * curScale, 0).applyEuler(group.current.rotation)
      group.current.position.set(-pivotOffset.x, 1.46 - pivotOffset.y, -pivotOffset.z)
    }
    if (sway.current) {
      // gentle, fluid breeze in the stem
      const wind = ramp(p, [[0, 0.85], [BEATS.blush, 0.4], [1, 0.25]])
      const targetZ = Math.sin(t * 0.55) * 0.018 * wind + Math.sin(t * 1.3) * 0.004 * wind
      const targetX = Math.cos(t * 0.42) * 0.011 * wind
      sway.current.rotation.z = damp(sway.current.rotation.z, targetZ, 6, dt)
      sway.current.rotation.x = damp(sway.current.rotation.x, targetX, 6, dt)
    }

    // ---------- color story (with botanical bouquet shade variants + hover glow) ----------
    const k1 = ramp(p, [[0, 0], [BEATS.bloom, 1]]) // velvet ruby → lush crimson
    const k2 = ramp(p, [[BEATS.bloom, 0], [BEATS.blush + 0.06, 1]]) // crimson → vibrant scarlet
    const sheenK = ramp(p, [[0, 0.45], [BEATS.blush + 0.08, 1]])
    const glowK = ramp(p, [[0, 0.24], [BEATS.bloom, 0.42], [1, 0.65]])

    colorTmp.lerpColors(DARK, CRIMSON, k1)
    if (k2 > 0) colorTmp.lerp(SCARLET, k2 * 0.55)
    emitTmp.lerpColors(BASE_EMIT, GOLD_EMIT, k1)

    for (const mat of petalMats.current) {
      const tintIdx = mat.userData.tintIdx || 0
      const tint = BOUQUET_TINTS[tintIdx] || BOUQUET_TINTS[0]
      const hoverBoost = tintIdx === 0 ? heroHover.current * 0.25 : 0
      mat.color.copy(colorTmp).multiply(tint.mul)
      if (mat.sheenColor) {
        mat.sheenColor.copy(BLUSH_SHEEN)
        mat.sheen = Math.min(1.0, 0.65 + sheenK * 0.35 + hoverBoost)
      }
      mat.emissive.copy(emitTmp).multiplyScalar((glowK + hoverBoost) * tint.emitMul)
    }
  })

  return (
    <group ref={sway}>
      <group ref={group}>
        <group ref={heroRoseRef}>
          <primitive object={model} />
        </group>
        <group ref={bouquetRef} />
      </group>
    </group>
  )
}

