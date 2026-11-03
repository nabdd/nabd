import { useMemo, useRef, type MutableRefObject, type RefObject } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
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
  const profile = new THREE.SplineCurve([
    new THREE.Vector2(0, 0.09),
    new THREE.Vector2(0.16, 0.13),
    new THREE.Vector2(0.32, 0.21),
    new THREE.Vector2(0.45, 0.17),
    new THREE.Vector2(0.5, 0),
    new THREE.Vector2(0.45, -0.17),
    new THREE.Vector2(0.32, -0.21),
    new THREE.Vector2(0.16, -0.13),
    new THREE.Vector2(0, -0.09),
  ])
  return new THREE.LatheGeometry(profile.getPoints(48), 56)
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

function Cells({ count, animate }: { count: number; animate: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(makeCellGeometry, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    const r = rand(7)
    return Array.from({ length: count }, () => ({
      rad: 2.5 + r() * 2.4,
      a: r() * Math.PI * 2,
      sp: 0.07 + r() * 0.15,
      y: (r() - 0.5) * 4.4,
      s: 0.34 + r() * 0.5,
      rx: r() * Math.PI,
      rs: (r() - 0.5) * 1.3,
      ph: r() * 6.28,
    }))
  }, [count])

  useFrame((st) => {
    const m = ref.current
    if (!m) return
    const t = animate ? st.clock.elapsedTime : 0
    data.forEach((d, i) => {
      const a = d.a + t * d.sp
      dummy.position.set(Math.cos(a) * d.rad, d.y + Math.sin(t * 0.6 + d.ph) * 0.25, Math.sin(a) * d.rad * 0.65 - 0.4)
      dummy.rotation.set(d.rx + t * d.rs, t * d.rs * 0.7, d.rx)
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]}>
      <meshPhysicalMaterial color="#a50c26" roughness={0.28} clearcoat={0.7} clearcoatRoughness={0.2} envMapIntensity={1.2} />
    </instancedMesh>
  )
}

/** Leans toward the pointer and lifts away on scroll so the scene feels attached to the page. */
function Rig({ scrollRef, children }: { scrollRef: MutableRefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useFrame((st, dt) => {
    const o = g.current
    if (!o) return
    const p = st.pointer
    const s = Math.min(scrollRef.current / 700, 1)
    o.rotation.y = THREE.MathUtils.damp(o.rotation.y, p.x * 0.55 + s * 1.6, 3, dt)
    o.rotation.x = THREE.MathUtils.damp(o.rotation.x, -p.y * 0.28, 3, dt)
    o.rotation.z = THREE.MathUtils.damp(o.rotation.z, -p.x * 0.12, 3, dt)
    o.position.y = THREE.MathUtils.damp(o.position.y, s * 1.4, 3, dt)
    const sc = 1 - s * 0.35
    o.scale.setScalar(THREE.MathUtils.damp(o.scale.x, sc, 3, dt))
  })
  return <group ref={g}>{children}</group>
}

export interface DropSceneProps {
  eventSource: RefObject<HTMLElement | null>
  scrollRef: MutableRefObject<number>
  animate: boolean
  active: boolean
  cells?: number
}

export default function DropScene({ eventSource, scrollRef, animate, active, cells = 26 }: DropSceneProps) {
  return (
    <Canvas
      eventSource={eventSource as RefObject<HTMLElement>}
      eventPrefix="client"
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
      <Rig scrollRef={scrollRef}>
        <Drop animate={animate} />
        <Cells count={cells} animate={animate} />
      </Rig>
    </Canvas>
  )
}
