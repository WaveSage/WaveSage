/**
 * Generate PWA / Capacitor splash-friendly PNG icons from an SVG.
 * Run: node scripts/generate-mobile-icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1c2c"/>
      <stop offset="100%" stop-color="#123a4e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <path d="M48 300c70-70 120-40 170-20s90 60 160 10c40-30 70-50 86-40"
        fill="none" stroke="#3ec6e0" stroke-width="28" stroke-linecap="round"/>
  <path d="M64 360c60-50 110-20 150-5s80 35 140 0"
        fill="none" stroke="#7ad7ea" stroke-width="18" stroke-linecap="round" opacity="0.7"/>
  <text x="256" y="210" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif"
        font-size="92" font-weight="700" fill="#e8f4f8">WS</text>
</svg>
`);

const sizes = [192, 512];

for (const size of sizes) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`wrote public/icons/icon-${size}.png`);
}

// Copy 512 into Capacitor resources placeholder
const mobileIcons = join(root, "mobile", "resources");
mkdirSync(mobileIcons, { recursive: true });
writeFileSync(
  join(mobileIcons, "icon.png"),
  await sharp(svg).resize(1024, 1024).png().toBuffer()
);
console.log("wrote mobile/resources/icon.png");
