#!/usr/bin/env node
/**
 * Zero-dependency icon generator for Trayarunya Copilot.
 * Renders the brand mark (gradient rounded square + white T + gold spark)
 * at 4x supersampling and writes proper PNGs via zlib. Usage:
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'icons');
mkdirSync(outDir, { recursive: true });

/* ----------------------------- PNG encoding ----------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------- drawing -------------------------------- */

function inRoundedRect(x, y, r) {
  // unit square with corner radius r
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function renderIcon(size) {
  const SS = 4;
  const S = size * SS;
  const px = new Float64Array(S * S * 4);

  const grad = {
    from: [0xff, 0xaf, 0x06], // brand amber
    to: [0x14, 0xbb, 0x87],   // brand teal
  };

  for (let yi = 0; yi < S; yi += 1) {
    for (let xi = 0; xi < S; xi += 1) {
      const x = (xi + 0.5) / S;
      const y = (yi + 0.5) / S;
      const i = (yi * S + xi) * 4;

      if (!inRoundedRect(x, y, 0.22)) continue; // transparent outside

      // diagonal gradient background
      const t = Math.min(Math.max((x + y) / 2, 0), 1);
      let r = lerp(grad.from[0], grad.to[0], t);
      let g = lerp(grad.from[1], grad.to[1], t);
      let b = lerp(grad.from[2], grad.to[2], t);

      // subtle top sheen
      if (y < 0.5) {
        const sheen = (0.5 - y) * 0.18;
        r += (255 - r) * sheen;
        g += (255 - g) * sheen;
        b += (255 - b) * sheen;
      }

      // white "T"
      const inTopBar = x >= 0.22 && x <= 0.78 && y >= 0.27 && y <= 0.41;
      const inStem = x >= 0.43 && x <= 0.57 && y > 0.41 && y <= 0.80;
      if (inTopBar || inStem) {
        r = 250; g = 250; b = 255;
      }

      // white spark (top-right)
      const dx = x - 0.80;
      const dy = y - 0.175;
      if (dx * dx + dy * dy <= 0.055 * 0.055) {
        r = 255; g = 255; b = 255;
      }

      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }

  // box-downsample SS×SS → 1
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const i = ((y * SS + sy) * S + (x * SS + sx)) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(out, size, size);
}

for (const size of [16, 32, 48, 128]) {
  const file = join(outDir, `icon${size}.png`);
  writeFileSync(file, renderIcon(size));
  console.log(`✓ ${file}`);
}
console.log('Icons generated.');
