# Sweet Celebration

Static 3D cake website. No dependency installation or bundler is required.

## Structure

```text
public/                 Website files
  index.html            Main entry page
  assets/
    css/styles.css      Styles
    js/main.js          Application logic
    models/             GLB cake models
    images/             Existing image library
experiments/            Separate necklace projects and their references
scripts/build.mjs       Copies only public/ into dist/
dist/                   Generated deployment output (ignored by Git)
```

`experiments/` is preserved for development and is excluded from deployment.
`FRUITCC.glb` and unused images are preserved. All five gallery frames use
fixed local photos configured in `galleryPhotos` in `public/assets/js/main.js`.
The same photos load on desktop, tablet, and mobile. Clicking a frame opens
its full photo and message; photo uploading is disabled.

## Build and deploy

Requires Node.js 18 or newer.

```sh
npm run build
```

Use `npm run build` as the hosting build command and `dist` as the publish/output
directory. For manual static hosting, upload the contents of `dist/`.
No backend server or SPA redirect rule is needed.

Serve `public/` during development or `dist/` to preview a build using an HTTP
static server. Opening the HTML directly with `file://` can block ES modules
and model loading. Asset URLs support hosting under a subdirectory.

The site uses external services for Three.js, GSAP, Draco decoding, Google
Fonts, and avatar artwork, so an internet connection is required. Gallery
photos are bundled locally. Edited messages currently live only in browser
memory and reset when the page reloads.

## Security

`npm run build` refreshes the Content Security Policy and its import-map hash,
along with `public/_headers` and `vercel.json`. Commit these generated settings
with your source. Netlify and Vercel hosting configurations are included.
Use HTTPS on your deployment.

The policy restricts scripts to this site and the pinned library/decoder paths,
blocks inline script handlers, plugins, form submissions, and base URL changes.
Inline styles remain allowed for the existing GSAP animations and layout;
WebAssembly compilation and blob workers remain allowed for Draco decoding.
Blob fetches and blob images are allowed for textures embedded in GLB models;
both are needed for the ImageBitmapLoader and ImageLoader browser paths.
HTTP headers add protection against framing, MIME sniffing, and unnecessary
browser permissions. A meta CSP and referrer policy also protect other static
hosts, but those hosts must configure the HTTP headers themselves for framing
and the additional protections to apply. The `_headers` file is host-specific.

Run `npm test` to verify CSP hashes, matching host headers, and safe text rendering.
Third-party CDN code is still trusted; this setup does not vendor or audit those
libraries. There is no login, server database, or upload endpoint. Public photos
and JavaScript remain downloadable by visitors; never put secrets in `public/`.
Production response headers and browser behavior still need checking after deploy.
