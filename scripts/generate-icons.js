const fs = require('fs');
const path = require('path');
const { app, nativeImage } = require('electron');
const pngToIco = require('png-to-ico');

// Ensure directories exist
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');
const clientPublicDir = path.join(__dirname, '..', 'client', 'public');

[buildDir, publicDir, clientPublicDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// High-resolution SVG for Nexora Connect
const nexoraSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>

    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>

    <linearGradient id="nGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <linearGradient id="nGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>

    <linearGradient id="nGrad3" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle with Border -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="8" />

  <!-- Ambient Glow -->
  <circle cx="256" cy="256" r="160" fill="#6366f1" opacity="0.18" filter="url(#glow)" />
  <circle cx="340" cy="180" r="100" fill="#06b6d4" opacity="0.15" filter="url(#glow)" />

  <!-- Futuristic Geometric 'N' & Interconnecting Network Mesh -->
  <g filter="url(#subtleGlow)">
    <!-- Left Vertical Pillar of 'N' -->
    <path d="M 140 370 L 140 142 A 18 18 0 0 1 176 142 L 176 370 A 18 18 0 0 1 140 370 Z" fill="url(#nGrad1)" />

    <!-- Diagonal Dynamic Connector of 'N' with Video Camera Aperture Symbol -->
    <path d="M 158 152 L 340 354 A 18 18 0 0 0 372 344 L 372 142 A 18 18 0 0 0 336 142 L 336 298 L 184 130 A 20 20 0 0 0 158 152 Z" fill="url(#nGrad2)" />

    <!-- Right Vertical Pillar of 'N' -->
    <path d="M 336 370 L 336 142 A 18 18 0 0 1 372 142 L 372 370 A 18 18 0 0 1 336 370 Z" fill="url(#nGrad3)" />

    <!-- Center Video Node / Conference Lens -->
    <circle cx="256" cy="256" r="28" fill="#0f172a" stroke="url(#borderGrad)" stroke-width="6" />
    <polygon points="250,244 268,256 250,268" fill="#38bdf8" />

    <!-- Network Connection Nodes -->
    <circle cx="158" cy="142" r="14" fill="#38bdf8" />
    <circle cx="158" cy="370" r="14" fill="#6366f1" />
    <circle cx="354" cy="142" r="14" fill="#8b5cf6" />
    <circle cx="354" cy="370" r="14" fill="#ec4899" />
  </g>
</svg>
`;

app.whenReady().then(async () => {
  try {
    console.log('Rendering high-res Nexora Connect application icon...');

    // Save SVG
    const svgPath = path.join(buildDir, 'icon.svg');
    fs.writeFileSync(svgPath, nexoraSvg, 'utf8');

    // Create 512x512 PNG using Electron nativeImage
    const img512 = nativeImage.createFromBuffer(Buffer.from(nexoraSvg), { width: 512, height: 512 });
    const png512Buffer = img512.toPNG();
    fs.writeFileSync(path.join(buildDir, 'icon.png'), png512Buffer);
    fs.writeFileSync(path.join(publicDir, 'icon.png'), png512Buffer);
    fs.writeFileSync(path.join(clientPublicDir, 'icon.png'), png512Buffer);
    console.log('✅ Created build/icon.png (512x512)');

    // Create 256x256 PNG
    const img256 = nativeImage.createFromBuffer(Buffer.from(nexoraSvg), { width: 256, height: 256 });
    const png256Buffer = img256.toPNG();
    const icon256Path = path.join(buildDir, 'icon-256.png');
    fs.writeFileSync(icon256Path, png256Buffer);

    // Create smaller resolutions for ICO packaging
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngPaths = [];

    for (const size of sizes) {
      const img = nativeImage.createFromBuffer(Buffer.from(nexoraSvg), { width: size, height: size });
      const sizePath = path.join(buildDir, `icon-${size}.png`);
      fs.writeFileSync(sizePath, img.toPNG());
      pngPaths.push(sizePath);
    }

    // Convert PNGs to multi-resolution Windows ICO
    console.log('Packaging into Windows multi-resolution build/icon.ico...');
    const icoBuffer = await pngToIco(pngPaths);
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
    fs.writeFileSync(path.join(clientPublicDir, 'favicon.ico'), icoBuffer);
    console.log('✅ Successfully generated build/icon.ico!');

    app.quit();
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
});
