// Turns design/logo-source.jpg (dark letters on white) into transparent PNGs for light, dark and brand backgrounds.
import sharp from 'sharp'

const { data, info } = await sharp('design/logo-source.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info
const bg = [data[0], data[1], data[2]]
const variants = { light: (c) => c, dark: (c, red) => (red ? c : [242, 240, 237]), mono: () => [255, 255, 255] }

let minX = w, minY = h, maxX = 0, maxY = 0
const alpha = new Float32Array(w * h)
for (let i = 0; i < w * h; i++) {
  const o = i * 4
  let a = Math.max((bg[0] - data[o]) / bg[0], (bg[1] - data[o + 1]) / bg[1], (bg[2] - data[o + 2]) / bg[2])
  a = a < 0.08 ? 0 : Math.min(1, a * 1.08)
  alpha[i] = a
  if (a > 0.2) {
    const x = i % w, y = (i / w) | 0
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
}
const pad = 6
const box = { left: Math.max(0, minX - pad), top: Math.max(0, minY - pad), width: Math.min(w, maxX + pad) - Math.max(0, minX - pad), height: Math.min(h, maxY + pad) - Math.max(0, minY - pad) }

for (const [name, tint] of Object.entries(variants)) {
  const out = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, a = alpha[i]
    if (a === 0) continue
    // Remove the white background contribution to recover the true ink colour.
    const c = [0, 1, 2].map((k) => Math.max(0, Math.min(255, (data[o + k] - bg[k] * (1 - a)) / a)))
    const red = c[0] - Math.max(c[1], c[2]) > 60
    const t = tint(c, red)
    out[o] = t[0]; out[o + 1] = t[1]; out[o + 2] = t[2]; out[o + 3] = Math.round(a * 255)
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).extract(box).resize({ width: 720 }).png({ compressionLevel: 9 }).toFile(`src/assets/logo-${name}.png`)
}
console.log('crop', box, 'aspect', (box.width / box.height).toFixed(2))
