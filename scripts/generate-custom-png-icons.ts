import fs from "fs";
import path from "path";
// @ts-expect-error sharp is provided transitively by Next.js
import sharp from "sharp";

interface IconSpec {
  filename: string;
  accent1: string;
  accent2: string;
  glow: string;
  innerSvg: string;
}

/**
 * Wraps each custom 3D hardware/cinema icon inside a sculpted obsidian-and-titanium
 * squircle badge with multi-stop metallic bevels, inner ambient glow, and top optical glass specular rim,
 * exported on a 100% transparent 512x512 PNG canvas.
 */
function buildCinemaBadgeSvg(spec: IconSpec): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Outer metallic titanium/gold rim -->
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${spec.accent1}" stop-opacity="0.85"/>
      <stop offset="45%" stop-color="#2A3448" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${spec.accent2}" stop-opacity="0.75"/>
    </linearGradient>

    <!-- Deep obsidian glass body -->
    <linearGradient id="bodyBg" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#172033"/>
      <stop offset="52%" stop-color="#0B101B"/>
      <stop offset="100%" stop-color="#060911"/>
    </linearGradient>

    <!-- Ambient volumetric backlight inside the squircle -->
    <radialGradient id="coreGlow" cx="50%" cy="38%" r="58%">
      <stop offset="0%" stop-color="${spec.glow}" stop-opacity="0.46"/>
      <stop offset="55%" stop-color="${spec.accent2}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#060911" stop-opacity="0"/>
    </radialGradient>

    <!-- Top specular glass reflection -->
    <linearGradient id="topSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <!-- Rich metallic accent gradient for the foreground 3D emblem -->
    <linearGradient id="emblemGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF5D6"/>
      <stop offset="38%" stop-color="${spec.accent1}"/>
      <stop offset="100%" stop-color="${spec.accent2}"/>
    </linearGradient>

    <linearGradient id="emblemSub" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E2E8F0"/>
      <stop offset="100%" stop-color="#64748B"/>
    </linearGradient>

    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="${spec.glow}" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Outer Bevel Rim -->
  <rect x="28" y="28" width="456" height="456" rx="116" fill="url(#rim)"/>
  <!-- Inner Obsidian Chamber -->
  <rect x="34" y="34" width="444" height="444" rx="111" fill="url(#bodyBg)"/>
  <rect x="34" y="34" width="444" height="444" rx="111" fill="url(#coreGlow)"/>

  <!-- Precision Corner Calibration Ticks (Nolan IMAX HUD detail) -->
  <g stroke="${spec.accent1}" stroke-opacity="0.32" stroke-width="2.5" stroke-linecap="round">
    <path d="M88 68 H112 M68 88 V112"/>
    <path d="M424 68 H400 M444 88 V112"/>
    <path d="M88 444 H112 M68 424 V400"/>
    <path d="M424 444 H400 M444 424 V400"/>
  </g>

  <!-- Top Optical Specular Arc -->
  <path d="M64 140 C64 78 100 44 172 44 H340 C412 44 448 78 448 140 C360 112 152 112 64 140 Z" fill="url(#topSheen)"/>

  <!-- Foreground 3D Sculpted Icon -->
  <g filter="url(#drop)">
    ${spec.innerSvg}
  </g>
</svg>`;
}

const ICONS: IconSpec[] = [
  {
    filename: "globe.png",
    accent1: "#FF9F7A",
    accent2: "#FF5E36",
    glow: "#FF7A59",
    innerSvg: `
      <circle cx="256" cy="256" r="128" fill="#0F172A" fill-opacity="0.7" stroke="url(#emblemGrad)" stroke-width="14"/>
      <ellipse cx="256" cy="256" rx="68" ry="128" fill="none" stroke="url(#emblemGrad)" stroke-width="11"/>
      <ellipse cx="256" cy="256" rx="128" ry="52" fill="none" stroke="url(#emblemGrad)" stroke-width="11"/>
      <line x1="128" y1="256" x2="384" y2="256" stroke="#FFF5D6" stroke-width="8" stroke-opacity="0.7"/>
      <line x1="256" y1="128" x2="256" y2="384" stroke="#FFF5D6" stroke-width="8" stroke-opacity="0.7"/>
      <circle cx="316" cy="204" r="14" fill="#FFF5D6"/>
      <circle cx="196" cy="306" r="11" fill="#FF9F7A"/>
    `,
  },
  {
    filename: "flag-pole.png",
    accent1: "#5CE6B5",
    accent2: "#129C6B",
    glow: "#19B37D",
    innerSvg: `
      <rect x="148" y="118" width="18" height="276" rx="9" fill="url(#emblemSub)"/>
      <circle cx="157" cy="112" r="16" fill="#FFF5D6"/>
      <path d="M174 134 C230 114 274 156 336 136 L364 148 V266 C302 286 246 242 174 264 Z" fill="url(#emblemGrad)"/>
      <path d="M204 176 H322 M204 214 H288" stroke="#081018" stroke-width="12" stroke-linecap="round" stroke-opacity="0.55"/>
    `,
  },
  {
    filename: "keycap.png",
    accent1: "#B69EFF",
    accent2: "#6B46FF",
    glow: "#7C5CFF",
    innerSvg: `
      <!-- 3D Mechanical Keycap Base -->
      <rect x="122" y="146" width="268" height="236" rx="46" fill="#1E1B4B" stroke="url(#emblemGrad)" stroke-width="12"/>
      <!-- Raised Keycap Top Face -->
      <rect x="150" y="158" width="212" height="176" rx="34" fill="url(#emblemGrad)"/>
      <rect x="164" y="170" width="184" height="150" rx="26" fill="#0D1322"/>
      <!-- Glowing WPM Command Glyph -->
      <path d="M206 220 L230 276 L256 232 L282 276 L306 220" fill="none" stroke="url(#emblemGrad)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    `,
  },
  {
    filename: "calculator.png",
    accent1: "#FFD470",
    accent2: "#E59400",
    glow: "#FFB020",
    innerSvg: `
      <rect x="140" y="116" width="232" height="280" rx="38" fill="#0D1322" stroke="url(#emblemGrad)" stroke-width="14"/>
      <rect x="170" y="148" width="172" height="64" rx="16" fill="url(#emblemGrad)"/>
      <g fill="url(#emblemGrad)">
        <circle cx="196" cy="258" r="18"/>
        <circle cx="256" cy="258" r="18"/>
        <circle cx="316" cy="258" r="18"/>
        <circle cx="196" cy="312" r="18"/>
        <circle cx="256" cy="312" r="18"/>
        <rect x="298" y="294" width="36" height="72" rx="16" fill="#FFF5D6"/>
        <circle cx="196" cy="356" r="18"/>
        <circle cx="256" cy="356" r="18"/>
      </g>
    `,
  },
  {
    filename: "letter-tiles.png",
    accent1: "#FF8AB5",
    accent2: "#E62E73",
    glow: "#FF4D8D",
    innerSvg: `
      <g transform="rotate(-10 210 230)">
        <rect x="122" y="142" width="154" height="154" rx="30" fill="#0F172A" stroke="url(#emblemGrad)" stroke-width="12"/>
        <path d="M168 254 L199 178 L230 254 M178 232 H220" fill="none" stroke="url(#emblemGrad)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <g transform="rotate(8 304 286)">
        <rect x="232" y="206" width="158" height="158" rx="30" fill="url(#emblemGrad)"/>
        <path d="M282 252 H342 L282 320 H342" fill="none" stroke="#090D16" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `,
  },
  {
    filename: "stopwatch.png",
    accent1: "#6CE8FF",
    accent2: "#009BB8",
    glow: "#00B8D9",
    innerSvg: `
      <rect x="226" y="102" width="60" height="22" rx="10" fill="url(#emblemGrad)"/>
      <rect x="244" y="120" width="24" height="24" fill="url(#emblemSub)"/>
      <path d="M342 152 L366 130" stroke="url(#emblemGrad)" stroke-width="16" stroke-linecap="round"/>
      <circle cx="256" cy="272" r="122" fill="#0B111E" stroke="url(#emblemGrad)" stroke-width="16"/>
      <circle cx="256" cy="272" r="96" fill="none" stroke="#6CE8FF" stroke-width="4" stroke-dasharray="10 14" stroke-opacity="0.6"/>
      <path d="M256 272 L256 196 M256 272 L312 296" stroke="#FFF5D6" stroke-width="14" stroke-linecap="round"/>
      <circle cx="256" cy="272" r="14" fill="url(#emblemGrad)"/>
    `,
  },
  {
    filename: "magnifier.png",
    accent1: "#A3B8FF",
    accent2: "#4D70FF",
    glow: "#6C8CFF",
    innerSvg: `
      <line x1="312" y1="312" x2="386" y2="386" stroke="url(#emblemGrad)" stroke-width="28" stroke-linecap="round"/>
      <circle cx="234" cy="234" r="108" fill="#0B1222" stroke="url(#emblemGrad)" stroke-width="16"/>
      <circle cx="234" cy="234" r="74" fill="none" stroke="#A3B8FF" stroke-width="6" stroke-opacity="0.45"/>
      <path d="M188 196 A64 64 0 0 1 268 184" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-opacity="0.8"/>
    `,
  },
  {
    filename: "ruler-slider.png",
    accent1: "#5CE6D8",
    accent2: "#0E998C",
    glow: "#12B5A6",
    innerSvg: `
      <g stroke="url(#emblemSub)" stroke-width="12" stroke-linecap="round">
        <line x1="136" y1="168" x2="376" y2="168"/>
        <line x1="136" y1="256" x2="376" y2="256"/>
        <line x1="136" y1="344" x2="376" y2="344"/>
      </g>
      <g stroke="url(#emblemGrad)" stroke-width="12" stroke-linecap="round">
        <line x1="136" y1="168" x2="296" y2="168"/>
        <line x1="136" y1="256" x2="204" y2="256"/>
        <line x1="136" y1="344" x2="328" y2="344"/>
      </g>
      <circle cx="296" cy="168" r="24" fill="url(#emblemGrad)" stroke="#090D16" stroke-width="6"/>
      <circle cx="204" cy="256" r="24" fill="#FFF5D6" stroke="#090D16" stroke-width="6"/>
      <circle cx="328" cy="344" r="24" fill="url(#emblemGrad)" stroke="#090D16" stroke-width="6"/>
    `,
  },
  {
    filename: "color-swatch.png",
    accent1: "#F6C878",
    accent2: "#FF4D8D",
    glow: "#E8A849",
    innerSvg: `
      <circle cx="256" cy="204" r="74" fill="#FF4D8D" fill-opacity="0.88"/>
      <circle cx="206" cy="292" r="74" fill="#38BDF8" fill-opacity="0.88"/>
      <circle cx="306" cy="292" r="74" fill="#FACC15" fill-opacity="0.88"/>
      <circle cx="256" cy="262" r="32" fill="#FFF5D6" fill-opacity="0.95"/>
    `,
  },
  {
    filename: "trophy-gold.png",
    accent1: "#FFF0C2",
    accent2: "#D99126",
    glow: "#E8A849",
    innerSvg: `
      <path d="M168 132 H344 V224 C344 282 304 316 256 316 C208 316 168 282 168 224 Z" fill="url(#emblemGrad)"/>
      <path d="M168 156 H128 C128 212 146 244 176 252 M344 156 H384 C384 212 366 244 336 252" fill="none" stroke="url(#emblemGrad)" stroke-width="16" stroke-linecap="round"/>
      <rect x="236" y="312" width="40" height="54" fill="url(#emblemGrad)"/>
      <rect x="180" y="364" width="152" height="32" rx="14" fill="url(#emblemGrad)"/>
      <polygon points="256,166 268,194 298,198 275,218 281,248 256,232 231,248 237,218 214,198 244,194" fill="#0B101B" fill-opacity="0.55"/>
    `,
  },
  {
    filename: "trophy-silver.png",
    accent1: "#F8FAFC",
    accent2: "#94A3B8",
    glow: "#CBD5E1",
    innerSvg: `
      <path d="M168 132 H344 V224 C344 282 304 316 256 316 C208 316 168 282 168 224 Z" fill="url(#emblemGrad)"/>
      <path d="M168 156 H128 C128 212 146 244 176 252 M344 156 H384 C384 212 366 244 336 252" fill="none" stroke="url(#emblemGrad)" stroke-width="16" stroke-linecap="round"/>
      <rect x="236" y="312" width="40" height="54" fill="url(#emblemGrad)"/>
      <rect x="180" y="364" width="152" height="32" rx="14" fill="url(#emblemGrad)"/>
    `,
  },
  {
    filename: "trophy-bronze.png",
    accent1: "#FDBA8C",
    accent2: "#B45309",
    glow: "#D97746",
    innerSvg: `
      <path d="M168 132 H344 V224 C344 282 304 316 256 316 C208 316 168 282 168 224 Z" fill="url(#emblemGrad)"/>
      <path d="M168 156 H128 C128 212 146 244 176 252 M344 156 H384 C384 212 366 244 336 252" fill="none" stroke="url(#emblemGrad)" stroke-width="16" stroke-linecap="round"/>
      <rect x="236" y="312" width="40" height="54" fill="url(#emblemGrad)"/>
      <rect x="180" y="364" width="152" height="32" rx="14" fill="url(#emblemGrad)"/>
    `,
  },
];

async function main() {
  const outDir = path.join(process.cwd(), "public", "assets", "png");
  fs.mkdirSync(outDir, { recursive: true });

  for (const spec of ICONS) {
    const svg = buildCinemaBadgeSvg(spec);
    const outPath = path.join(outDir, spec.filename);
    await sharp(Buffer.from(svg))
      .resize(512, 512)
      .png({ compressionLevel: 9, quality: 95 })
      .toFile(outPath);
  }

  // Also generate the master App / Phone Home-Screen Icon (Trophy Gold + Orbital Ring)
  const appIconSvg = buildCinemaBadgeSvg({
    filename: "app-icon.png",
    accent1: "#FFF0C2",
    accent2: "#D99126",
    glow: "#E8A849",
    innerSvg: `
      <circle cx="256" cy="256" r="134" fill="none" stroke="url(#emblemGrad)" stroke-width="10" stroke-opacity="0.55"/>
      <ellipse cx="256" cy="256" rx="164" ry="52" transform="rotate(-22 256 256)" fill="none" stroke="url(#emblemGrad)" stroke-width="12"/>
      <circle cx="256" cy="256" r="68" fill="url(#emblemGrad)"/>
      <circle cx="236" cy="236" r="18" fill="#FFFFFF" fill-opacity="0.65"/>
    `,
  });

  const publicDir = path.join(process.cwd(), "public");
  const appDir = path.join(process.cwd(), "src", "app");

  await sharp(Buffer.from(appIconSvg)).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  await sharp(Buffer.from(appIconSvg)).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  await sharp(Buffer.from(appIconSvg)).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png"));
  await sharp(Buffer.from(appIconSvg)).resize(180, 180).png().toFile(path.join(appDir, "apple-icon.png"));
  await sharp(Buffer.from(appIconSvg)).resize(64, 64).png().toFile(path.join(appDir, "icon.png"));

  console.log(`Generated ${ICONS.length} custom transparent PNG icons in ${outDir} + mobile app icons!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
