/**
 * Encodeur PNG minimal, sans dependance externe.
 *
 * Les assets temporaires du jeu sont generes par script plutot que dessines a
 * la main : ils restent ainsi reproductibles a l'identique, et le depot ne se
 * remplit pas de binaires qui changent a chaque regeneration.
 */

import { deflateSync } from 'node:zlib';

const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Une image RGBA en memoire, avec des primitives de dessin au pixel.
 */
export class Bitmap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4); // transparent par defaut
  }

  /** Peint un pixel. Les coordonnees hors cadre sont ignorees. */
  set(x, y, [r, g, b, a = 255]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const offset = (y * this.width + x) * 4;
    this.data[offset] = r;
    this.data[offset + 1] = g;
    this.data[offset + 2] = b;
    this.data[offset + 3] = a;
  }

  /** Peint un rectangle plein. */
  rect(x, y, width, height, color) {
    for (let dy = 0; dy < height; dy += 1) {
      for (let dx = 0; dx < width; dx += 1) {
        this.set(x + dx, y + dy, color);
      }
    }
  }

  /** Peint le contour d'un rectangle, epaisseur 1 pixel. */
  strokeRect(x, y, width, height, color) {
    for (let dx = 0; dx < width; dx += 1) {
      this.set(x + dx, y, color);
      this.set(x + dx, y + height - 1, color);
    }
    for (let dy = 0; dy < height; dy += 1) {
      this.set(x, y + dy, color);
      this.set(x + width - 1, y + dy, color);
    }
  }

  /** Encode l'image en PNG. */
  toPNG() {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr.writeUInt8(8, 8); // 8 bits par canal
    ihdr.writeUInt8(6, 9); // type couleur 6 = RGBA
    ihdr.writeUInt8(0, 10); // compression deflate
    ihdr.writeUInt8(0, 11); // filtrage standard
    ihdr.writeUInt8(0, 12); // pas d'entrelacement

    // Chaque ligne est prefixee d'un octet de filtre. Le filtre 0 (aucun) suffit
    // largement pour du pixel art a palette reduite, et garde le fichier lisible.
    const stride = this.width * 4;
    const raw = Buffer.alloc((stride + 1) * this.height);
    for (let y = 0; y < this.height; y += 1) {
      raw[y * (stride + 1)] = 0;
      Buffer.from(this.data.buffer, this.data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
    }

    return Buffer.concat([
      signature,
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

/**
 * Generateur pseudo-aleatoire deterministe (mulberry32).
 *
 * Une graine fixe garantit que deux executions produisent des fichiers
 * strictement identiques : sans cela, le moindre `npm run gen:placeholders`
 * ferait apparaitre une modification dans git.
 */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
