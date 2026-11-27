/**
 * @file scripts/generate-icon.js
 * @description 使用纯 Node.js 与 zlib 编程生成 MarkForge 圆角深色应用图标 PNG 及多尺寸 ICO 资源文件
 * @module 构建与打包脚本
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const width = 256;
const height = 256;

function makePng() {
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      // Rounded rect mask (corner radius 40)
      const dx = Math.min(x, width - 1 - x);
      const dy = Math.min(y, height - 1 - y);
      const cornerDist = Math.max(0, 40 - dx) ** 2 + Math.max(0, 40 - dy) ** 2;
      const isInside = cornerDist <= 40 * 40;

      if (!isInside) {
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        continue;
      }

      // Deep dark sleek background (#121216 to #1e1e28)
      let r = Math.floor(20 + (x / width) * 15);
      let g = Math.floor(22 + (y / height) * 20);
      let b = Math.floor(32 + ((x + y) / (width * 2)) * 30);

      // Draw "M" logo
      // Left vertical bar: x in [60, 84], y in [70, 190]
      // Right vertical bar: x in [172, 196], y in [70, 190]
      // Left diagonal: [84, 128]
      // Right diagonal: [128, 172]
      const inLeftBar = x >= 60 && x <= 84 && y >= 70 && y <= 190;
      const inRightBar = x >= 172 && x <= 196 && y >= 70 && y <= 190;
      const inLeftDiag = x >= 84 && x <= 128 && Math.abs(y - (70 + (x - 84) * 1.8)) <= 12;
      const inRightDiag = x >= 128 && x <= 172 && Math.abs(y - (150 - (x - 128) * 1.8)) <= 12;

      if (inLeftBar || inRightBar || inLeftDiag || inRightDiag) {
        // Vibrant Cyan (#38BDF8)
        r = 56;
        g = 189;
        b = 248;
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = 255;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const combined = Buffer.concat([typeBuf, data]);
    const crc = crc32(combined);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, combined, crcBuf]);
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return c ^ 0xffffffff;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdrData),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const pngBuffer = makePng();

// Make ICO file wrapping PNG
function makeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count: 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // width 256 -> 0
  entry.writeUInt8(0, 1); // height 256 -> 0
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset

  return Buffer.concat([header, entry, png]);
}

const dir = path.join(__dirname, '../resources');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(dir, 'icon.ico'), makeIco(pngBuffer));

console.log('256x256 PNG and ICO created successfully!');
