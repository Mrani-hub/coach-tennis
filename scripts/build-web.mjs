// Construit l'appli à partir de src/app.html (le même fichier que la version web) :
//   www/  → appli Android/iOS (Capacitor)      node scripts/build-web.mjs
//   pwa/  → appli iPhone installable depuis Safari (écran d'accueil)   node scripts/build-web.mjs --pwa
// Tout est embarqué : bibliothèques PDF, lecteur de carnets, polices. L'appli fonctionne sans connexion.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);
const PWA = process.argv.includes('--pwa');
const www = join(root, PWA ? 'pwa' : 'www');
rmSync(www, { recursive: true, force: true });
for (const d of ['', 'lib', 'fonts']) mkdirSync(join(www, d), { recursive: true });

/* 1. Bibliothèques locales */
const libs = {
  'jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js',
  'jspdf.plugin.autotable.min.js': 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js',
  'pdf.min.js': 'pdfjs-dist/build/pdf.min.js',
  'pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js',
  'qrcode.js': 'qrcode-generator/qrcode.js'
};

/* Réglages Google (uscm.config.json) — l'adresse de la version iPhone est déduite du dépôt GitHub si elle est vide */
const cfg = JSON.parse(readFileSync(join(root, 'uscm.config.json'), 'utf8'));
if (!cfg.playerUrl && process.env.GITHUB_REPOSITORY) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  cfg.playerUrl = `https://${owner.toLowerCase()}.github.io/${repo}/`;
}
const cfgJs = `<script>window.USCM_CONFIG=${JSON.stringify({ googleClientId: cfg.googleClientId || '', googleApiKey: cfg.googleApiKey || '', playerUrl: cfg.playerUrl || '' })};</script>`;
if (!cfg.googleClientId || !cfg.googleApiKey) console.warn('⚠ uscm.config.json : identifiants Google vides — le partage avec les joueurs sera désactivé.');
for (const [dst, src] of Object.entries(libs)) copyFileSync(nm(src), join(www, 'lib', dst));

/* 2. Polices (latin + latin étendu seulement) */
let fontCss = '';
for (const [pkg, weights] of [['saira-condensed', [500, 600, 700]], ['source-sans-3', [400, 600, 700]]]) {
  for (const w of weights) {
    const css = readFileSync(nm(`@fontsource/${pkg}/${w}.css`), 'utf8');
    for (const block of css.split(/\n(?=\/\*)/)) {
      const m = block.match(/\/\* (\S+) \*\//);
      if (!m || !/-latin(-ext)?-\d+-normal$/.test(m[1])) continue;
      const file = `${m[1]}.woff2`;
      copyFileSync(nm(`@fontsource/${pkg}/files/${file}`), join(www, 'fonts', file));
      fontCss += block.replace(/src:[^;]+;/, `src: url(./${file}) format('woff2');`).trim() + '\n';
    }
  }
}
writeFileSync(join(www, 'fonts', 'fonts.css'), fontCss);

/* 3. Pont natif (Capacitor) — pas dans la version navigateur */
if (!PWA) await build({ entryPoints: [join(root, 'src/native.js')], bundle: true, format: 'iife', minify: true, target: 'es2019', outfile: join(www, 'native.js'), logLevel: 'warning' });

/* 4. Page de l'appli */
let html = readFileSync(join(root, 'src/app.html'), 'utf8');
const must = (re, what) => { if (!re.test(html)) throw new Error(`build-web : motif introuvable (${what})`); };
must(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, 'polices Google');
must(/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\//, 'jsPDF');
must(/const PDFJS_V='[^']*';/, 'pdf.js');
must(/cdn\.jsdelivr\.net\/npm\/qrcode-generator@[^/]+\/qrcode\.js/, 'QR code');
html = html
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/[^/]+\/jspdf\.umd\.min\.js/, 'lib/jspdf.umd.min.js')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf-autotable\/[^/]+\/jspdf\.plugin\.autotable\.min\.js/, 'lib/jspdf.plugin.autotable.min.js')
  .replace(/const PDFJS_V='[^']*';/, "const PDFJS_V='lib/';")
  .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/qrcode-generator@[^/]+\/qrcode\.js/, 'lib/qrcode.js')
  // Encoches et barres système : variables injectées par Capacitor (Android), env() en secours (iOS)
  .replace(/env\(safe-area-inset-(top|bottom|left|right),\s*0px\)/g, (_, s) => `var(--safe-area-inset-${s}, env(safe-area-inset-${s}, 0px))`)
  .replace('<script src="lib/jspdf.umd.min.js">', cfgJs + '\n' + (PWA ? '' : '<script src="native.js"></script>\n') + '<script src="lib/jspdf.umd.min.js">');

const cut = html.indexOf('</style>') + '</style>'.length;
let head = html.slice(0, cut), body = html.slice(cut);
if (PWA) {
  head = `<link rel="manifest" href="manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Coach USCM">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
` + head;
  body += `
<script>
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && typeof toast === 'function') toast('Coach USCM a été mis à jour'); });
}
/* Ouvert dans Safari sur iPhone/iPad sans être installé : expliquer l'ajout à l'écran d'accueil */
(function () {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let seen = false; try { seen = localStorage.getItem('uscm-install-hint') === '1'; } catch (e) {}
  if (!ios || installed || seen) return;
  const b = document.createElement('div');
  b.className = 'install-hint';
  b.innerHTML = '<b>Installer Coach USCM sur cet iPhone</b><span>Touchez <b>Partager</b> <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg> en bas de Safari, puis <b>Sur l’écran d’accueil</b>. L’appli fonctionnera ensuite sans connexion.</span><button type="button" aria-label="Fermer">✕</button>';
  b.querySelector('button').onclick = () => { b.remove(); try { localStorage.setItem('uscm-install-hint', '1'); } catch (e) {} };
  document.body.appendChild(b);
})();
</script>
<style>
.install-hint{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:50;background:var(--ink);color:var(--bg);border-radius:12px;padding:12px 40px 12px 14px;display:flex;flex-direction:column;gap:4px;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.25)}
.install-hint svg{vertical-align:-3px}
.install-hint button{position:absolute;top:6px;right:6px;background:none;border:0;color:inherit;font-size:16px;padding:6px;cursor:pointer}
</style>`;
}
const base = `<style>
html,body{margin:0}
body{padding-top:var(--safe-area-inset-top, env(safe-area-inset-top, 0px));-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
img{max-width:100%}
</style>`;
writeFileSync(join(www, 'index.html'), `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
${head}
${base}
</head>
<body>
${body}
</body>
</html>
`);
/* 5. Version navigateur : icônes, manifeste, fonctionnement hors ligne */
if (PWA) {
  const sharp = (await import('sharp')).default;
  mkdirSync(join(www, 'icons'), { recursive: true });
  const src = join(root, 'assets/icon-only.png');
  for (const [name, px] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]])
    await sharp(src).resize(px, px).png().toFile(join(www, 'icons', name));
  writeFileSync(join(www, 'manifest.webmanifest'), JSON.stringify({
    name: 'Coach USCM', short_name: 'Coach USCM', lang: 'fr', dir: 'ltr',
    description: 'Planification et suivi des entraînements de tennis jeunes',
    start_url: './', scope: './', display: 'standalone', orientation: 'any',
    background_color: '#1d5c45', theme_color: '#1d5c45', categories: ['sports'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2));
  const files = [];
  const walk = d => { for (const f of readdirSync(join(www, d))) { const r = d ? `${d}/${f}` : f; statSync(join(www, r)).isDirectory() ? walk(r) : files.push(r); } };
  walk('');
  const hash = createHash('sha256'); for (const f of files.sort()) hash.update(f).update(readFileSync(join(www, f)));
  const version = hash.digest('hex').slice(0, 12);
  writeFileSync(join(www, 'sw.js'), `// Coach USCM — fonctionnement hors ligne. Version ${version}
const CACHE = 'coach-uscm-${version}';
const FILES = ${JSON.stringify(['./', ...files])};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() => r.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
`);
}
for (const f of ['index.html', 'fonts/fonts.css', 'lib/pdf.min.js', ...(PWA ? ['sw.js', 'manifest.webmanifest', 'icons/icon-512.png'] : ['native.js'])])
  if (!existsSync(join(www, f))) throw new Error('manquant : ' + f);
console.log(`${PWA ? 'pwa' : 'www'}/ prêt :`, fontCss.split('@font-face').length - 1, 'polices,', Object.keys(libs).length, 'bibliothèques.');
