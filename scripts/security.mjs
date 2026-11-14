import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

export async function prepareSecurity() {
  const page = new URL('../public/index.html', import.meta.url);
  let html = await readFile(page, 'utf8');
  const importMap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
  if (!importMap) throw new Error('Missing import map; cannot generate CSP hash.');
  // HTML parsing normalizes Windows line endings before CSP hashes are checked.
  const hash = createHash('sha256').update(importMap.replace(/\r\n?/g, '\n')).digest('base64');
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'sha256-${hash}' 'wasm-unsafe-eval' https://cdn.jsdelivr.net/npm/three@0.160.0/ https://cdn.jsdelivr.net/npm/gsap@3.12.5/ https://www.gstatic.com/draco/versioned/decoders/1.5.6/`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://api.dicebear.com",
    // GLTFLoader uses ImageBitmapLoader.fetch(blobURL) for embedded GLB textures.
    "connect-src 'self' blob: https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
  if (/<meta http-equiv="Content-Security-Policy"[^>]*>/.test(html)) {
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, meta);
  } else {
    html = html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n  ${meta}\n  <meta name="referrer" content="no-referrer" />`);
  }
  await writeFile(page, html);
  const headers = {
    'Content-Security-Policy': `${policy}; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Strict-Transport-Security': 'max-age=31536000'
  };
  await writeFile(new URL('../public/_headers', import.meta.url),
    '/*\n' + Object.entries(headers).map(([key, value]) => `  ${key}: ${value}`).join('\n') + '\n');
  await writeFile(new URL('../vercel.json', import.meta.url), JSON.stringify({
    buildCommand: 'npm run build', outputDirectory: 'dist',
    headers: [{ source: '/(.*)', headers: Object.entries(headers).map(([key, value]) => ({ key, value })) }]
  }, null, 2) + '\n');
}
