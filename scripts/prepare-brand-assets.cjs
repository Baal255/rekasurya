const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

// CRC32 tabel untuk PNG chunk
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function decodePngRgba(filePath) {
  const b = fs.readFileSync(filePath);
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  const idat = [];
  let o = 8;
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString("ascii", o + 4, o + 8);
    if (type === "IDAT") idat.push(b.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(w * h * 4);
  const stride = w * 4 + 1;
  const row = new Uint8Array(w * 4);
  const prev = new Uint8Array(w * 4);

  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    for (let i = 0; i < w * 4; i++) {
      let v = raw[y * stride + 1 + i];
      const a = i >= 4 ? row[i - 4] : 0;
      const b0 = prev[i];
      const c = i >= 4 ? prev[i - 4] : 0;
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b0) & 255;
      else if (f === 3) v = (v + ((a + b0) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b0 - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b0);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b0 : c)) & 255;
      }
      row[i] = v;
    }
    prev.set(row);
    rgba.set(row, y * w * 4);
  }
  return { w, h, rgba };
}

function encodePngRgba(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = w * 4 + 1;
  const raw = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0; // filter None
    Buffer.from(rgba.subarray(y * w * 4, (y + 1) * w * 4)).copy(raw, y * stride + 1);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

function cropRgba(src, x0, y0, x1, y1, pixelMapper) {
  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const out = new Uint8Array(cw * ch * 4);
  for (let cy = 0; cy < ch; cy++) {
    const sy = y0 + cy;
    for (let cx = 0; cx < cw; cx++) {
      const sx = x0 + cx;
      const si = (sy * src.w + sx) * 4;
      const di = (cy * cw + cx) * 4;
      let r = src.rgba[si];
      let g = src.rgba[si + 1];
      let b = src.rgba[si + 2];
      const a = src.rgba[si + 3];
      if (a > 0 && pixelMapper) {
        [r, g, b] = pixelMapper(r, g, b, a, sx, sy);
      }
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return { w: cw, h: ch, rgba: out };
}

function isNavyPixel(r, g, b) {
  // Primary Navy #062D5B serta piksel anti-aliasing gelap di batasnya (hindari piksel amber hangat r > b + 20)
  return b >= r && r < 180 && g < 190;
}

function isWhiteWordmarkPixel(r, g, b) {
  // Wordmark putih & anti-aliased abu-abu terang, jangan sentuh piksel Amber (R >> B)
  return r > 170 && g > 170 && b > 150 && r - b < 45;
}

function main() {
  const root = process.cwd();
  const srcPath = path.join(root, "REKASURYA LOGO.png");
  const pubDir = path.join(root, "public");
  fs.mkdirSync(pubDir, { recursive: true });

  // Salin logo mentah asli
  fs.copyFileSync(srcPath, path.join(pubDir, "rekasurya-logo.png"));

  const src = decodePngRgba(srcPath);

  // Full logo tight crop (mempertahankan aspect ratio asli objek)
  const fullBox = { x0: 84, y0: 58, x1: 1190, y1: 624 };

  const onDarkFull = cropRgba(
    src,
    fullBox.x0,
    fullBox.y0,
    fullBox.x1,
    fullBox.y1,
    (r, g, b, _a, _sx, sy) => {
      if (sy < 475 && isNavyPixel(r, g, b)) {
        // Ubah navy ke putih agar emblem tajam di latar gelap #062D5B, sambil mempertahankan amber
        return [255, 255, 255];
      }
      return [r, g, b];
    }
  );
  fs.writeFileSync(
    path.join(pubDir, "rekasurya-logo-on-dark.png"),
    encodePngRgba(onDarkFull.w, onDarkFull.h, onDarkFull.rgba)
  );

  const onLightFull = cropRgba(
    src,
    fullBox.x0,
    fullBox.y0,
    fullBox.x1,
    fullBox.y1,
    (r, g, b, _a, _sx, sy) => {
      if (sy >= 475 && isWhiteWordmarkPixel(r, g, b)) {
        // Ubah wordmark putih ke Primary Navy #062D5B agar terbaca di latar putih
        return [6, 45, 91];
      }
      return [r, g, b];
    }
  );
  fs.writeFileSync(
    path.join(pubDir, "rekasurya-logo-on-light.png"),
    encodePngRgba(onLightFull.w, onLightFull.h, onLightFull.rgba)
  );

  // Emblem-only crop untuk top bar / nav kompak
  const markBox = { x0: 368, y0: 58, x1: 932, y1: 462 };

  const onDarkMark = cropRgba(
    src,
    markBox.x0,
    markBox.y0,
    markBox.x1,
    markBox.y1,
    (r, g, b) => {
      if (isNavyPixel(r, g, b)) return [255, 255, 255];
      return [r, g, b];
    }
  );
  fs.writeFileSync(
    path.join(pubDir, "rekasurya-mark-on-dark.png"),
    encodePngRgba(onDarkMark.w, onDarkMark.h, onDarkMark.rgba)
  );

  const onLightMark = cropRgba(src, markBox.x0, markBox.y0, markBox.x1, markBox.y1);
  fs.writeFileSync(
    path.join(pubDir, "rekasurya-mark-on-light.png"),
    encodePngRgba(onLightMark.w, onLightMark.h, onLightMark.rgba)
  );

  console.log("Generated brand assets in public/:", {
    fullSize: `${onDarkFull.w}x${onDarkFull.h}`,
    markSize: `${onDarkMark.w}x${onDarkMark.h}`,
  });
}

main();
