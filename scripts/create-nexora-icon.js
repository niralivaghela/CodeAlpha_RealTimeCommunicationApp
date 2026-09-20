const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;

const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');

[buildDir, publicDir, clientPublicDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// CRC32 implementation for PNG chunks
function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  return table;
}
const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Write a PNG chunk: Length (4B) + Type (4B) + Data + CRC32 (4B)
function makeChunk(typeStr, dataBuf) {
  const len = dataBuf.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(typeStr, 4, 4, 'ascii');
  dataBuf.copy(chunk, 8);
  const toCrc = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(toCrc), 8 + len);
  return chunk;
}

// Generate an RGBA PNG buffer from a pixel generator function
function generatePng(size) {
  const width = size;
  const height = size;

  // Raw scanlines: each row starts with filter byte 0x00, then RGBA pixels
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Normalized coordinates from -1 to 1
      const nx = (x / (width - 1)) * 2 - 1;
      const ny = (y / (height - 1)) * 2 - 1;

      // Squircle distance: (x^4 + y^4)^(1/4)
      const squircle = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), 0.25);

      if (squircle > 0.92) {
        // Outside squircle -> Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Background Gradient: Deep Slate to Indigo/Violet
      const t = (nx + ny + 2) / 4; // 0 to 1
      let r = Math.round(10 + 20 * t);
      let g = Math.round(14 + 15 * t);
      let b = Math.round(28 + 60 * t);
      let a = 255;

      // Border glow
      if (squircle > 0.85) {
        r = Math.round(56 + 100 * t);
        g = Math.round(180 + 40 * t);
        b = Math.round(248);
      }

      // Draw the stylized "N" letter & network mesh
      // Normalized box [-0.65, 0.65]
      const px = nx;
      const py = ny;

      const inPillarLeft = px >= -0.55 && px <= -0.28 && py >= -0.55 && py <= 0.55;
      const inPillarRight = px >= 0.28 && px <= 0.55 && py >= -0.55 && py <= 0.55;

      // Diagonal of "N": line from (-0.45, -0.5) to (0.45, 0.5)
      // Distance from point to line y = x * (1.0 / 0.9)
      const diagDist = Math.abs(py - px * 1.15);
      const inDiag = diagDist < 0.16 && px >= -0.45 && px <= 0.45 && py >= -0.55 && py <= 0.55;

      if (inPillarLeft) {
        // Cyan-to-Indigo vertical gradient
        const pT = (py + 0.55) / 1.1;
        r = Math.round(56 * (1 - pT) + 99 * pT);
        g = Math.round(189 * (1 - pT) + 102 * pT);
        b = Math.round(248 * (1 - pT) + 241 * pT);
      } else if (inDiag) {
        // Indigo-to-Electric Violet diagonal gradient
        const dT = (px + 0.45) / 0.9;
        r = Math.round(99 * (1 - dT) + 217 * dT);
        g = Math.round(102 * (1 - dT) + 70 * dT);
        b = Math.round(241 * (1 - dT) + 239 * dT);
      } else if (inPillarRight) {
        // Violet-to-Pink gradient
        const pT = (py + 0.55) / 1.1;
        r = Math.round(217 * (1 - pT) + 168 * pT);
        g = Math.round(70 * (1 - pT) + 85 * pT);
        b = Math.round(239 * (1 - pT) + 247 * pT);
      }

      // Central camera lens circle at (0, 0)
      const centerDist = Math.sqrt(px * px + py * py);
      if (centerDist < 0.14) {
        r = 15;
        g = 23;
        b = 42;
      }
      if (centerDist >= 0.12 && centerDist < 0.15) {
        // Ring
        r = 56;
        g = 189;
        b = 248;
      }
      // Inner camera lens triangle/point
      if (centerDist < 0.08 && px >= -0.04 && px <= 0.05 && Math.abs(py) < (0.05 - px * 0.4)) {
        r = 56;
        g = 189;
        b = 248;
      }

      // Anti-aliasing around squircle boundary
      if (squircle > 0.90) {
        a = Math.round(255 * ((0.92 - squircle) / 0.02));
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA (6)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // 3. IDAT Chunk (compressed image data)
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // 4. IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function main() {
  console.log('Generating high-resolution Nexora Connect brand icons in pure Node...');

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuf = generatePng(size);
    const p = path.join(buildDir, `icon-${size}.png`);
    fs.writeFileSync(p, pngBuf);
    pngBuffers.push(pngBuf);
  }

  // Save primary 256 and 512
  const png256 = pngBuffers[pngBuffers.length - 1];
  const png512 = generatePng(512);

  fs.writeFileSync(path.join(buildDir, 'icon.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), png256);
  fs.writeFileSync(path.join(clientPublicDir, 'icon.png'), png256);
  console.log('✅ Created build/icon.png and client/public/icon.png');

  // Generate multi-resolution icon.ico
  console.log('Converting to multi-resolution Windows ICO...');
  const icon256Path = path.join(buildDir, 'icon-256.png');
  const icoBuf = await pngToIco(icon256Path);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  fs.writeFileSync(path.join(clientPublicDir, 'favicon.ico'), icoBuf);

  console.log(`✅ Successfully generated build/icon.ico (${icoBuf.length} bytes) with 7 icon sizes (16 to 256px)!`);
}

main().catch(console.error);
