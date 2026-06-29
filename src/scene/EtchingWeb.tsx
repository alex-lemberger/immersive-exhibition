import { useEffect, useRef, useMemo } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { ArtworkLayer } from '../data/schema'

// ─── Canvas dimensions (match etching aspect 1.6:2.05) ──────────────────────
const CW = 512
const CH = 660

// ─── Layer tuning ────────────────────────────────────────────────────────────
const WEB_POINTS     = 20    // ink-anchored ribbon web nodes
const WEB_NEIGHBORS  = 2
const WEB_PROX       = 0.28  // UV radius for web activation
const FADE           = 0.04  // alpha removed per frame via destination-out → trail fade

const CHAIN_MAX      = 280   // max live chain dots
const CHAIN_ALPHA    = 0.48  // starting alpha
const CHAIN_DECAY    = 0.004 // alpha lost per frame
const CHAIN_SPAWN    = 0.006 // UV dist threshold to spawn a new dot
const CHAIN_SPREAD   = 0.045 // random spawn offset from cursor (UV)

const WORM_MAX       = 25
const WORM_STEPS     = 50
const WORM_W_START   = 1.8   // px, tapers with scale
const WORM_SCALE     = 0.95
const WORM_STEP_PX   = 9

// ─── Utilities ───────────────────────────────────────────────────────────────
function resolveUrl(url: string): string {
  return url.startsWith('/')
    ? `${import.meta.env.BASE_URL}${url.slice(1)}`
    : url
}

// ─── Web point ───────────────────────────────────────────────────────────────
interface Pt {
  x: number; y: number
  dx: number; dy: number
  speed: number
  neighbors: number[]
}

function buildWebPoints(data: Uint8ClampedArray, w: number, h: number): Pt[] {
  const ink: [number, number][] = []
  for (let py = 0; py < h; py += 3) {
    for (let px = 0; px < w; px += 3) {
      const i = (py * w + px) * 4
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (lum < 90 && data[i + 3] > 128) ink.push([px / w, py / h])
    }
  }
  if (ink.length < WEB_POINTS) return []

  const pts: Pt[] = []
  for (let i = 0; i < WEB_POINTS; i++) {
    const [px, py] = ink[Math.floor(Math.random() * ink.length)]
    const angle = Math.random() * Math.PI * 2
    pts.push({ x: px, y: py, dx: Math.cos(angle), dy: Math.sin(angle),
               speed: 0.00012 + Math.random() * 0.0001, neighbors: [] })
  }
  for (let i = 0; i < pts.length; i++) {
    const sorted = pts
      .map((p, j) => {
        const dx = pts[i].x - p.x, dy = pts[i].y - p.y
        return { j, d: j === i ? Infinity : dx * dx + dy * dy }
      })
      .sort((a, b) => a.d - b.d)
    pts[i].neighbors = sorted.slice(0, WEB_NEIGHBORS).map(e => e.j)
  }
  return pts
}

// ─── Chain dot (Stars mechanic) ──────────────────────────────────────────────
interface ChainDot {
  x: number; y: number
  alpha: number
  dirX: number; dirY: number  // unit vector
  speed: number
}

// ─── Worm segment (Mechanical Grass mechanic) ────────────────────────────────
interface WormSeg { x: number; y: number; w: number }
interface Worm { segs: WormSeg[]; angle: number; scale: number; step: number }

// ─── Component ───────────────────────────────────────────────────────────────
export function EtchingWeb({ layer, size }: { layer: ArtworkLayer; size: [number, number] }) {
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)
  const ctxRef      = useRef<CanvasRenderingContext2D | null>(null)
  const textureRef  = useRef<THREE.CanvasTexture | null>(null)
  const meshRef     = useRef<THREE.Mesh>(null)

  // Web
  const webPtsRef   = useRef<Pt[]>([])
  // Chains
  const chainRef    = useRef<ChainDot[]>([])
  const lastSpawnUv = useRef(new THREE.Vector2(-1, -1))
  // Worms
  const wormsRef    = useRef<Worm[]>([])
  // Flow tangent (stable, sampled once — matches shader's vec2(0.5))
  const flowRef     = useRef<[number, number]>([1, 0])

  // Pointer state
  const pointerUv     = useRef(new THREE.Vector2(0.5, 0.5))
  const prevPointerUv = useRef(new THREE.Vector2(0.5, 0.5))
  const pointerActive = useRef(false)
  const activationRef = useRef(0)

  // ── Bootstrap canvas, texture, sample etching ─────────────────────────────
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = CW; canvas.height = CH
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d')!
    ctxRef.current = ctx
    ctx.clearRect(0, 0, CW, CH)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.premultiplyAlpha = false
    textureRef.current = texture

    if (!layer.texture) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = resolveUrl(layer.texture)
    img.onload = () => {
      const tmp = document.createElement('canvas')
      tmp.width = CW; tmp.height = CH
      const tc = tmp.getContext('2d')!
      tc.drawImage(img, 0, 0, CW, CH)
      const { data } = tc.getImageData(0, 0, CW, CH)
      webPtsRef.current = buildWebPoints(data, CW, CH)

      // Derive dominant flow tangent from image gradient (Sobel-lite at center)
      const cx = Math.floor(CW / 2), cy = Math.floor(CH / 2)
      const gx = (data[((cy) * CW + cx + 1) * 4] - data[((cy) * CW + cx - 1) * 4]) / 255
      const gy = (data[((cy + 1) * CW + cx) * 4] - data[((cy - 1) * CW + cx) * 4]) / 255
      // Tangent = perpendicular to gradient
      const len = Math.sqrt(gx * gx + gy * gy) || 1
      flowRef.current = [-gy / len, gx / len]
    }

    return () => { texture.dispose() }
  }, [layer.texture])

  // ── Material (additive blending — black canvas areas add nothing) ──────────
  const material = useMemo(() =>
    new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.NormalBlending, depthWrite: false }),
  [])

  useEffect(() => {
    if (!textureRef.current) return
    material.map = textureRef.current
    material.needsUpdate = true
  })

  // ── Pointer ───────────────────────────────────────────────────────────────
  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) pointerUv.current.copy(e.uv)
    pointerActive.current = true
  }
  const onPointerLeave = () => { pointerActive.current = false }

  // ── Frame loop ────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    const ctx  = ctxRef.current
    const tex  = textureRef.current
    const web  = webPtsRef.current
    if (!ctx || !tex) return

    // Smooth activation
    const target = pointerActive.current ? 1 : 0
    activationRef.current += (target - activationRef.current) * Math.min(delta * 1.8, 1)
    const act = activationRef.current
    if (act < 0.01) return

    const puv = pointerUv.current
    const [ftx, fty] = flowRef.current

    // ── Fade trails — reduce alpha of all canvas pixels ──────────────────
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = `rgba(0,0,0,${FADE})`
    ctx.fillRect(0, 0, CW, CH)
    ctx.globalCompositeOperation = 'source-over'

    // ── Vignette — redrawn every frame to survive the fade ────────────────
    const vig = ctx.createRadialGradient(CW * 0.5, CH * 0.5, CW * 0.22, CW * 0.5, CH * 0.5, CW * 0.78)
    vig.addColorStop(0,   'rgba(0,0,0,0)')
    vig.addColorStop(0.6, 'rgba(0,0,0,0)')
    vig.addColorStop(1,   'rgba(0,0,0,0.55)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, CW, CH)

    // ─────────────────────────────────────────────────────────────────────
    // LAYER 1 — Web (Ribbons-2): ink-anchored nodes draw lines to neighbors
    // ─────────────────────────────────────────────────────────────────────
    if (web.length > 0) {
      ctx.lineWidth = 1
      for (const pt of web) {
        const ddx = pt.x - puv.x, ddy = pt.y - puv.y
        const prox = Math.max(0, 1 - Math.sqrt(ddx * ddx + ddy * ddy) / WEB_PROX)
        const lineAlpha = (0.035 + prox * 0.45) * act

        const spd = pt.speed * (1 + prox * 3) * delta * 60
        pt.x += pt.dx * spd; pt.y += pt.dy * spd
        if (pt.x < 0 || pt.x > 1) pt.dx *= -1
        if (pt.y < 0 || pt.y > 1) pt.dy *= -1
        pt.x = Math.max(0, Math.min(1, pt.x))
        pt.y = Math.max(0, Math.min(1, pt.y))

        if (lineAlpha < 0.005) continue
        for (const ni of pt.neighbors) {
          const nb = web[ni]
          ctx.beginPath()
          ctx.moveTo(pt.x * CW, pt.y * CH)
          ctx.lineTo(nb.x * CW, nb.y * CH)
          ctx.strokeStyle = `rgba(0,0,0,${lineAlpha})`
          ctx.stroke()
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LAYER 2 — Chains (Stars): cursor stirs chained particles that drift
    //           along flow direction and link to previous 3 dots
    // ─────────────────────────────────────────────────────────────────────
    const chains = chainRef.current

    // Spawn new dot when cursor moves enough
    const moveDist = puv.distanceTo(lastSpawnUv.current)
    if (pointerActive.current && moveDist > CHAIN_SPAWN && chains.length < CHAIN_MAX) {
      const ox = (Math.random() - 0.5) * 2 * CHAIN_SPREAD
      const oy = (Math.random() - 0.5) * 2 * CHAIN_SPREAD
      // Direction: flow tangent + slight random spread
      const spread = (Math.random() - 0.5) * 0.6
      const dx = ftx + spread * -fty
      const dy = fty + spread *  ftx
      const dl = Math.sqrt(dx * dx + dy * dy) || 1
      chains.push({
        x: puv.x + ox, y: puv.y + oy,
        alpha: CHAIN_ALPHA * act,
        dirX: dx / dl, dirY: dy / dl,
        speed: 0.0006 + Math.random() * 0.0005,
      })
      lastSpawnUv.current.copy(puv)
    }

    // Move + draw chains
    ctx.lineWidth = 0.8
    for (let i = chains.length - 1; i >= 0; i--) {
      const d = chains[i]
      d.alpha -= CHAIN_DECAY
      if (d.alpha <= 0) { chains.splice(i, 1); continue }

      d.x += d.dirX * d.speed * delta * 60
      d.y += d.dirY * d.speed * delta * 60

      // Draw dot
      const a = d.alpha * act
      ctx.fillStyle = `rgba(0,0,0,${a})`
      ctx.beginPath()
      ctx.arc(d.x * CW, d.y * CH, 1.2, 0, Math.PI * 2)
      ctx.fill()

      // Link to previous 3 dots (chain)
      for (let back = 1; back <= 3; back++) {
        const prev = chains[i - back]
        if (!prev) break
        ctx.beginPath()
        ctx.strokeStyle = `rgba(0,0,0,${a * (1 - back * 0.25)})`
        ctx.moveTo(prev.x * CW, prev.y * CH)
        ctx.lineTo(d.x * CW, d.y * CH)
        ctx.stroke()
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LAYER 3 — Worms (Mechanical Grass): cursor motion spawns tapering strands
    // ─────────────────────────────────────────────────────────────────────
    const worms = wormsRef.current
    const velX = puv.x - prevPointerUv.current.x
    const velY = puv.y - prevPointerUv.current.y
    const speed = Math.sqrt(velX * velX + velY * velY)

    if (pointerActive.current && speed > 0.003 && worms.length < WORM_MAX) {
      const angle = Math.atan2(velY * CH, velX * CW)
      const first: WormSeg = { x: puv.x * CW, y: puv.y * CH, w: WORM_W_START }
      worms.push({ segs: [first, first], angle, scale: 1, step: 0 })
    }
    prevPointerUv.current.copy(puv)

    for (let i = worms.length - 1; i >= 0; i--) {
      const wm = worms[i]
      if (wm.step >= WORM_STEPS) { worms.splice(i, 1); continue }

      const last = wm.segs[wm.segs.length - 1]
      wm.angle += (Math.random() - 0.5) * 0.18
      wm.scale *= WORM_SCALE

      const nx = last.x + Math.cos(wm.angle) * WORM_STEP_PX * wm.scale
      const ny = last.y + Math.sin(wm.angle) * WORM_STEP_PX * wm.scale
      const nw = WORM_W_START * wm.scale

      wm.segs.push({ x: nx, y: ny, w: nw })
      wm.step++

      // Draw tapered stroke segment
      const fade = (1 - wm.step / WORM_STEPS) * act * 0.6
      ctx.strokeStyle = `rgba(0,0,0,${fade})`
      ctx.lineWidth = Math.max(0.3, nw)
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(nx, ny)
      ctx.stroke()
    }

    tex.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} position={[0, 0, layer.z + 0.005]}
      onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <planeGeometry args={[size[0], size[1]]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
