import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

test('built CSP authorizes the exact import map and blocks inline script handlers', async () => {
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  const map = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(map.replace(/\r\n?/g, '\n')).digest('base64');
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert(policy.includes(`'sha256-${hash}'`));
  const scripts = policy.split('; ').find(part => part.startsWith('script-src '));
  assert(!scripts.includes("'unsafe-inline'"));
  assert(!scripts.includes("'unsafe-eval'"));
  for (const rule of ["object-src 'none'", "base-uri 'none'", "form-action 'none'", "script-src-attr 'none'", "worker-src 'self' blob:"]) {
    assert(policy.includes(rule));
  }
  const vercel = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const headers = Object.fromEntries(vercel.headers[0].headers.map(({key, value}) => [key, value]));
  assert.equal(headers['Content-Security-Policy'], `${policy}; frame-ancestors 'none'`);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  const netlify = await readFile(new URL('dist/_headers', root), 'utf8');
  for (const [key, value] of Object.entries(headers)) assert(netlify.includes(`${key}: ${value}`));
});

test('cake text preserves line breaks and treats HTML payloads as text', async () => {
  const source = await readFile(new URL('public/assets/js/main.js', root), 'utf8');
  const fn = source.slice(source.indexOf('function setTextWithBreaks('), source.indexOf('function updateCakeText('));
  const context = vm.createContext({document: {
    createElement: tag => ({tag}), createTextNode: text => ({text})
  }});
  vm.runInContext(fn, context);
  const nodes = [];
  const element = {replaceChildren: () => {nodes.length = 0;}, appendChild: node => nodes.push(node)};
  context.setTextWithBreaks(element, 'Hello<br><img src=x onerror=alert(1)>');
  assert.equal(nodes[0].text, 'Hello');
  assert.equal(nodes[1].tag, 'br');
  assert.equal(nodes[2].text, '<img src=x onerror=alert(1)>');
  assert(!/\.innerHTML\s*=/.test(source));
});

test('embedded cake textures are permitted by both deployed CSP policies', async () => {
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  const header = config.headers[0].headers.find(item => item.key === 'Content-Security-Policy').value;
  for (const policy of [meta, header]) {
    const sources = policy.split('; ').find(rule => rule.startsWith('connect-src ')).split(/\s+/);
    assert(sources.includes('blob:'), 'ImageBitmapLoader fetches embedded textures through blob URLs');
    assert(!sources.includes('*'), 'Keep network sources restricted');
    const images = policy.split('; ').find(rule => rule.startsWith('img-src ')).split(/\s+/);
    assert(images.includes('blob:'), 'ImageLoader fallback also needs blob images');
  }
  for (const name of ['STRAWB', 'CHOCO', 'FRUITC']) {
    const bytes = await readFile(new URL(`dist/assets/models/${name}.glb`, root));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    const jsonLength = bytes.readUInt32LE(12);
    const model = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
    assert(model.images.length > 0);
    for (const image of model.images) {
      assert(Number.isInteger(image.bufferView), `${name} must retain its embedded textures`);
      assert(model.bufferViews[image.bufferView].byteLength > 0);
    }
  }
});
