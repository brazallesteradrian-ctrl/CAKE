import { cp, mkdir, rm } from 'node:fs/promises';
import { prepareSecurity } from './security.mjs';

const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
await prepareSecurity();

// Always replace only this project's generated deployment directory.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log('Build complete. Deploy the dist/ directory.');
