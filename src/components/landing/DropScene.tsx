import { useLayoutEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'

/** Teardrop built by revolving a profile: a circle for the body that flows into a curved tip. */
function makeDropGeometry() {
  const pts: THREE.Vector2[] = []
  const phi0 = 0.35
  for (let i = 0; i <= 48; i++) {
    const a = -Math.PI / 2 + (i / 48) * (phi0 + Math.PI / 2)
    pts.push(new THREE.Vector2(Math.max(0, Math.cos(a)), Math.sin(a)))
  }
  const p0 = new THREE.Vector2(Math.cos(phi0), Math.sin(phi0))
  const ctrl = new THREE.Vector2(p0.x - Math.sin(phi0) * 0.85, p0.y + Math.cos(phi0) * 0.85)
  new THREE.QuadraticBezierCurve(p0, ctrl, new THREE.Vector2(0, 2.35)).getPoints(48).slice(1).forEach((p) => pts.push(p))
  const g = new THREE.LatheGeometry(pts, 128)
  g.translate(0, -0.6, 0)
  return g
}

/** Biconcave disc: the real shape of a red blood cell. */
function makeCellGeometry() {
  // Evans-Fung biconcave profile. rho runs 0..1 from the centre to the rim; sampling uses
  // rho = sin(t) so the rim stays smooth instead of pinching where sqrt(1 - rho^2) drops to zero.
  const R = 0.5
  const half = (rho: number) => Math.sqrt(Math.max(0, 1 - rho * rho)) * (0.2072 + 0.5007 * rho * rho - 0.0702 * rho ** 4) * R
  const top: THREE.Vector2[] = []
  const bottom: THREE.Vector2[] = []
  const N = 56
  for (let i = 0; i <= N; i++) {
    const rho = Math.sin((i / N) * (Math.PI / 2))
    top.push(new THREE.Vector2(rho * R, half(rho)))
    bottom.push(new THREE.Vector2(rho * R, -half(rho)))
  }
  // Lathe wants one continuous profile: centre-top, over the rim, back to centre-bottom.
  const pts = [...top, ...bottom.reverse().slice(1)]
  const g = new THREE.LatheGeometry(pts, 72)
  g.computeVertexNormals()
  return g
}

function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** The pulse: two quick beats, then rest. Nabd means pulse. */
function heartbeat(t: number) {
  const m = t % 1.25
  return Math.exp(-Math.pow((m - 0.12) * 11, 2)) + 0.55 * Math.exp(-Math.pow((m - 0.42) * 11, 2))
}

function Drop({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const geo = useMemo(makeDropGeometry, [])
  useFrame((st) => {
    if (!ref.current || !animate) return
    const b = heartbeat(st.clock.elapsedTime)
    ref.current.scale.set(1 + b * 0.07, 1 + b * 0.05, 1 + b * 0.07)
  })
  return (
    <mesh ref={ref} geometry={geo}>
      <meshPhysicalMaterial color="#c8102e" roughness={0.1} metalness={0.05} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.5} sheen={0.6} sheenColor="#ff6b81" />
    </mesh>
  )
}

/**
 * Cheap stand-in for how a real red cell looks under light:
 * - the thin dimple in the middle absorbs less, so it reads paler and warmer than the thick rim;
 * - a soft glow at grazing angles imitates light scattering through the membrane.
 */
function patchCellShader(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying float vR;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvR = length(position.xz);')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vR;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float thin = 1.0 - smoothstep(0.0, 0.3, vR);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.4, 1.12, 1.0) + vec3(0.07, 0.0, 0.0), thin * 0.6);`,
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.6);
      totalEmissiveRadiance += vec3(0.62, 0.05, 0.07) * rim * 0.9;`,
    )
}

function Cells({ count, animate }: { count: number; animate: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(makeCellGeometry, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    const r = rand(7)
    return Array.from({ length: count }, () => ({
      rad: 2.1 + r() * 1.3,
      a: r() * Math.PI * 2,
      sp: 0.07 + r() * 0.15,
      y: (r() - 0.5) * 4.4,
      s: 0.34 + r() * 0.5,
      sx: 0.94 + r() * 0.12, // slight squash so no two cells are the same shape
      sy: 0.88 + r() * 0.24,
      tone: r(),
      rx: r() * Math.PI,
      rs: (r() - 0.5) * 0.7,
      ph: r() * 6.28,
    }))
  }, [count])

  // Per-cell tint: a range from darker, older-looking cells to bright fresh ones.
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const c = new THREE.Color()
    data.forEach((d, i) => {
      c.setHSL(0.99 + (d.tone - 0.5) * 0.015, 0.86 + d.tone * 0.1, 0.3 + (d.tone - 0.5) * 0.16)
      m.setColorAt(i, c)
    })
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [data])

  useFrame((st) => {
    const m = ref.current
    if (!m) return
    const t = animate ? st.clock.elapsedTime : 0
    data.forEach((d, i) => {
      const a = d.a + t * d.sp
      dummy.position.set(Math.cos(a) * d.rad * 0.85, d.y + Math.sin(t * 0.6 + d.ph) * 0.25, Math.sin(a) * d.rad * 0.65 - 0.4)
      dummy.rotation.set(d.rx + t * d.rs, t * d.rs * 0.7, d.rx)
      dummy.scale.set(d.s * d.sx, d.s * d.sy, d.s * d.sx)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]}>
      {/* Wet, velvety membrane: soft base roughness, a glossy film on top, sheen at grazing angles,
          and a faint inner glow so the dimple never goes dead black (cheap stand-in for light passing through). */}
      <meshPhysicalMaterial
        color="#ffffff"
        roughness={0.42}
        metalness={0}
        clearcoat={0.85}
        clearcoatRoughness={0.22}
        sheen={0.5}
        sheenRoughness={0.45}
        sheenColor="#d93a52"
        emissive="#3d000c"
        emissiveIntensity={0.4}
        envMapIntensity={1.1}
        onBeforeCompile={patchCellShader}
      />
    </instancedMesh>
  )
}

/** Leans toward the pointer and lifts away on scroll so the scene feels attached to the page. */
function Rig({ scrollRef, animate, children }: { scrollRef: MutableRefObject<number>; animate: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const viewport = useThree((s) => s.viewport)
  const width = useThree((s) => s.size.width)
  useFrame((st, dt) => {
    const o = g.current
    if (!o) return
    const p = st.pointer
    const s = Math.min(scrollRef.current / 700, 1)
    // Wide screens: the drop sits right of the headline. Narrow screens: it sits low, behind the cards.
    const wide = width >= 980
    const baseX = wide ? viewport.width * 0.22 : 0
    const baseY = wide ? 0 : -viewport.height * 0.18
    const baseScale = wide ? 1 : 0.72
    o.rotation.y = THREE.MathUtils.damp(o.rotation.y, p.x * 0.55 + s * 1.6, 3, dt)
    o.rotation.x = THREE.MathUtils.damp(o.rotation.x, -p.y * 0.28, 3, dt)
    o.rotation.z = THREE.MathUtils.damp(o.rotation.z, -p.x * 0.12, 3, dt)
    if (!animate) {
      o.position.set(baseX, baseY, 0)
      o.scale.setScalar(baseScale)
      return
    }
    o.position.x = THREE.MathUtils.damp(o.position.x, baseX, 4, dt)
    o.position.y = THREE.MathUtils.damp(o.position.y, baseY + s * 1.4, 3, dt)
    o.scale.setScalar(THREE.MathUtils.damp(o.scale.x, baseScale * (1 - s * 0.35), 3, dt))
  })
  return <group ref={g}>{children}</group>
}

export interface DropSceneProps {
  eventSource: RefObject<HTMLElement | null>
  scrollRef: MutableRefObject<number>
  animate: boolean
  active: boolean
  cells?: number
  onReady?: () => void
}

export default function DropScene({ eventSource, scrollRef, animate, active, cells = 26, onReady }: DropSceneProps) {
  return (
    <Canvas
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
      onCreated={() => onReady?.()}
      frameloop={animate && active ? 'always' : 'demand'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.6], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <pointLight position={[-4, -2, -3]} intensity={30} color="#ff3b5c" />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="rect" intensity={5} position={[0, 5, -9]} scale={[12, 12, 1]} />
          <Lightformer form="rect" intensity={3} position={[-5, 1, -1]} scale={[8, 3, 1]} rotation={[0, Math.PI / 2, 0]} />
          <Lightformer form="rect" intensity={2.5} position={[5, -1, 1]} scale={[6, 2, 1]} rotation={[0, -Math.PI / 2, 0]} />
          <Lightformer form="ring" intensity={4} color="#ffd9df" position={[0, 0, 6]} scale={3} />
        </group>
      </Environment>
      <Rig scrollRef={scrollRef} animate={animate}>
        <Drop animate={animate} />
        <Cells count={cells} animate={animate} />
      </Rig>
    </Canvas>
  )
}
