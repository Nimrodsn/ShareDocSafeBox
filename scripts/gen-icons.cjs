// Generates simple placeholder solid-color PWA icons (no image library available).
// Draws a rounded "vault" glyph (a simple padlock silhouette) in flat colors
// directly into a raw RGBA buffer, then PNG-encodes it by hand using zlib.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const BG = [15, 23, 42, 255] // slate-900, matches theme_color
const FG = [99, 102, 241, 255] // indigo-500 (differentiates from the original single-user app's emerald)

function crc32(buf) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function drawPadlock(size, maskable) {
  const px = new Uint8Array(size * size * 4)
  const margin = maskable ? Math.round(size * 0.22) : 0 // keep glyph inside the safe zone for maskable icons
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      px[i] = BG[0]; px[i + 1] = BG[1]; px[i + 2] = BG[2]; px[i + 3] = BG[3]
    }
  }

  const cx = size / 2
  const cy = size / 2 + size * 0.03
  const bodyW = (size - margin * 2) * 0.46
  const bodyH = bodyW * 0.78
  const bodyTop = cy - bodyH * 0.15
  const bodyLeft = cx - bodyW / 2

  const shackleOuterR = bodyW * 0.36
  const shackleInnerR = shackleOuterR - size * 0.045
  const shackleCy = bodyTop - shackleOuterR * 0.55

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      let paint = false

      if (x >= bodyLeft && x <= bodyLeft + bodyW && y >= bodyTop && y <= bodyTop + bodyH) {
        paint = true
      }

      const dx = x - cx
      const dy = y - shackleCy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (y <= shackleCy + 2 && dist <= shackleOuterR && dist >= shackleInnerR) {
        paint = true
      }

      if (paint) {
        px[i] = FG[0]; px[i + 1] = FG[1]; px[i + 2] = FG[2]; px[i + 3] = FG[3]
      }
    }
  }
  return px
}

function encodePng(size, maskable) {
  const px = drawPadlock(size, maskable)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // no filter
    px.subarray(y * size * 4, (y + 1) * size * 4).forEach((v, idx) => {
      raw[y * (size * 4 + 1) + 1 + idx] = v
    })
  }
  const idat = zlib.deflateSync(raw)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

fs.writeFileSync(path.join(outDir, 'icon-192.png'), encodePng(192, false))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), encodePng(512, false))
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), encodePng(512, true))
fs.writeFileSync(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'), encodePng(180, false))

console.log('Icons generated in public/icons and public/apple-touch-icon.png')
