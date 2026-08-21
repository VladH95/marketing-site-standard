// Generates src/content/image-dimensions.json — { "/images/...": { w, h } }
// for every raster image under public/images. next/image needs intrinsic
// dimensions for markdown-rendered images (unknown at author time); this map
// supplies them at build. Runs before `next build` (see package.json), so a
// freshly dropped image is picked up automatically.
//
// Header parsing only (PNG IHDR / JPEG SOF) — zero dependencies.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public");
const SCAN = path.join(ROOT, "images");
const OUT = path.join(process.cwd(), "src/content/image-dimensions.json");

function pngSize(buf) {
  // 8-byte signature + IHDR: width @16, height @20 (big-endian)
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0–SOF15 except DHT(C4)/JPG(C8)/DAC(CC) carry dimensions
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const map = {};
let count = 0;
const unreadable = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    // Skip symlinked directories: they can point outside the project and can
    // form cycles, and neither is something an image scan should chase.
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) { walk(fp); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;
    const buf = fs.readFileSync(fp);
    const size = ext === ".png" ? pngSize(buf) : jpegSize(buf);
    if (!size || !size.w || !size.h) {
      // An image whose header will not parse is either corrupt or mislabelled
      // (a .png that is really a .webp is the common one). Either way the page
      // that uses it renders without dimensions and shifts as it loads. This
      // is the first step of the build chain, so failing here is the whole
      // point of the chain — warning and continuing would let it ship.
      unreadable.push(path.relative(process.cwd(), fp));
      continue;
    }
    map["/" + path.relative(ROOT, fp).split(path.sep).join("/")] = size;
    count++;
  }
}

// A site with no markdown-authored images is a normal site, not a broken one.
// Without this the script exits on an unhandled readdir and prints a stack
// trace, which reads like the gate itself is broken.
if (fs.existsSync(SCAN)) {
  walk(SCAN);
} else {
  console.log(`gen-image-dimensions: no ${path.relative(process.cwd(), SCAN)} — nothing to measure`);
}

if (unreadable.length) {
  console.error(
    `\n❌ ${unreadable.length} image(s) could not be read:\n` +
      unreadable.map((f) => `     ${f}`).join("\n") +
      `\n\n  Usually a file with the wrong extension (a .webp or .avif saved as\n` +
      `  .png) or a truncated upload. Re-export it, or rename it to its real\n` +
      `  format.\n\n✖ Image dimensions FAILED. Deploy blocked.\n`
  );
  process.exit(1);
}

// The destination may not exist yet on a fresh scaffold — the map is written
// into the content tree, and a project can legitimately have no content
// directory before its first article.
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(map, null, 0) + "\n");
console.log(`✓ image-dimensions.json — ${count} images`);
