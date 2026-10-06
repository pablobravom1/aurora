// Aurora · RS App — ícono de la app (A con check, degradado violeta-rosado), generado como PNG.
const zlib = require('zlib');
const N = 512;
let cache = null;

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// [x1, y1, x2, y2, radio] en coordenadas 0..1: la A, el check y dos líneas de lista.
const SHAPES = [
  [0.5, 0.18, 0.25, 0.78, 0.0525], [0.5, 0.18, 0.75, 0.78, 0.0525],
  [0.425, 0.635, 0.48, 0.685, 0.0225], [0.48, 0.685, 0.575, 0.585, 0.0225],
  [0.362, 0.855, 0.638, 0.855, 0.012], [0.412, 0.9, 0.588, 0.9, 0.012]
];
function build() {
  const c1 = [88, 63, 222], c2 = [236, 72, 153];
  const raw = Buffer.alloc((N * 3 + 1) * N);
  let o = 0;
  for (let y = 0; y < N; y++) {
    raw[o++] = 0;
    for (let x = 0; x < N; x++) {
      const t = (x * 0.35 + y * 0.65) / N;
      let cov = 0;
      const px = (x + 0.5) / N, py = (y + 0.5) / N;
      for (const s of SHAPES) {
        const d = (segDist(px, py, s[0], s[1], s[2], s[3]) - s[4]) * N;
        cov = Math.max(cov, Math.max(0, Math.min(1, 0.5 - d)));
      }
      for (let i = 0; i < 3; i++) raw[o++] = Math.round((c1[i] + (c2[i] - c1[i]) * t) * (1 - cov) + 255 * cov);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = function handler(req, res) {
  if (!cache) cache = build();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(cache);
};
