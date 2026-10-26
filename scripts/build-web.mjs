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

/* Réglages Google (config-google.json) — l'adresse de la version iPhone est déduite du dépôt GitHub si elle est vide */
const cfg = JSON.parse(readFileSync(join(root, 'config-google.json'), 'utf8'));
if (!cfg.playerUrl && process.env.GITHUB_REPOSITORY) {
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  cfg.playerUrl = `https://${owner.toLowerCase()}.github.io/${repo}/`;
}
const cfgJs = `<script>window.USCM_CONFIG=${JSON.stringify({ googleClientId: cfg.googleClientId || '', googleApiKey: cfg.googleApiKey || '', playerUrl: cfg.playerUrl || '', relaisUrl: cfg.relaisUrl || '', version: process.env.VERSION_NAME || 'dev' })};</script>`;
if (!cfg.googleClientId || !cfg.googleApiKey) console.warn('⚠ config-google.json : identifiants Google vides — le partage avec les joueurs sera désactivé.');
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

/* 3. Tâche de fond Android (vérification du programme) et pont natif — pas dans la version navigateur */
if (!PWA) { mkdirSync(join(www, 'runners'), { recursive: true }); copyFileSync(join(root, 'src/runners/programme.js'), join(www, 'runners/programme.js')); }
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
<meta name="apple-mobile-web-app-title" content="Coach Tennis">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
` + head;
  body += `
<script>
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had) return; try { sessionStorage.setItem('ct-maj', '1'); } catch (e) {} location.reload(); });
  try { if (sessionStorage.getItem('ct-maj')) { sessionStorage.removeItem('ct-maj'); setTimeout(() => typeof toast === 'function' && toast('Coach Tennis a été mis à jour'), 600); } } catch (e) {}
}
/* Ouvert dans Safari sur iPhone/iPad sans être installé : expliquer l'ajout à l'écran d'accueil */
(function () {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installed = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let seen = false; try { seen = localStorage.getItem('uscm-install-hint') === '1'; } catch (e) {}
  if (!ios || installed || seen) return;
  const b = document.createElement('div');
  b.className = 'install-hint';
  b.innerHTML = '<b>Installer Coach Tennis sur cet iPhone</b><span>Touchez <b>Partager</b> <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg> en bas de Safari, puis <b>Sur l’écran d’accueil</b>. L’appli fonctionnera ensuite sans connexion.</span><button type="button" aria-label="Fermer">✕</button>';
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
    name: 'Coach Tennis', short_name: 'Coach Tennis', lang: 'fr', dir: 'ltr',
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
  writeFileSync(join(www, 'sw.js'), `// Coach Tennis — fonctionnement hors ligne. Version ${version}
const CACHE = 'coach-tennis-${version}';
const FILES = ${JSON.stringify(['./', ...files])};
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() => r.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
`);
}
/* 6. Page de confidentialité (demandée par Google pour l'écran de connexion) */
if (PWA) {
  const repo = process.env.GITHUB_REPOSITORY || '';
  const contact = repo ? `<a href="https://github.com/${repo}/issues">la page « Issues » du projet</a>` : 'le responsable de l’application dans votre club';
  writeFileSync(join(www, 'confidentialite.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Coach Tennis – Confidentialité</title>
<style>
:root{--bg:#f2f4ef;--ink:#15231c;--muted:#5b6a61;--court:#1d5c45;--line:#d8e0d6}
@media (prefers-color-scheme:dark){:root{--bg:#0e1612;--ink:#e6eee8;--muted:#9aaaa0;--court:#4aa882;--line:#28382f}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:68ch;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left,0px)) 48px max(16px,env(safe-area-inset-right,0px))}
h1{font-size:28px;line-height:1.2;color:var(--court);margin:0 0 4px}h2{font-size:19px;margin:28px 0 6px}
p,li{color:var(--ink)}small{color:var(--muted)}a{color:var(--court)}ul{padding-left:20px}
</style></head><body><main>
<h1>Coach Tennis — confidentialité</h1>
<small>Dernière mise à jour : ${new Date().toISOString().slice(0, 10)}</small>
<p>Coach Tennis aide les coachs de tennis à planifier et suivre les entraînements de leurs joueurs. Cette page explique quelles données l’application utilise et où elles sont conservées.</p>
<h2>Données enregistrées</h2>
<p>Le coach saisit lui-même les informations utiles à l’entraînement : nom et date de naissance des joueurs, contact des parents, séances, niveaux par thème, comptes rendus, statistiques de match et classements. Ces données sont enregistrées <b>uniquement sur l’appareil du coach</b>. Il n’existe aucun serveur Coach Tennis : l’application n’envoie rien à ses auteurs.</p>
<h2>Google Drive</h2>
<p>Si le coach active l’espace joueur, il se connecte avec son propre compte Google. L’application demande uniquement l’autorisation <b>drive.file</b> : elle ne voit ni ne modifie aucun autre fichier du Drive que ceux qu’elle a elle-même créés. Elle y dépose, dans un dossier « Coach Tennis » :</p>
<ul><li>une sauvegarde des données du coach, visible par lui seul ;</li>
<li>un fichier par joueur ayant un espace actif, <b>chiffré</b> (AES-256). Seule la personne qui détient le lien personnel du joueur peut le lire. Le contact des parents n’y figure pas.</li></ul>
<p>L’application ne lit aucune autre information du compte Google. Elle respecte la politique d’utilisation des données des services d’API Google, y compris les exigences d’utilisation limitée.</p>
<h2>Espace joueur</h2>
<p>Le joueur ouvre le lien envoyé par son coach. Son programme est enregistré sur son appareil pour être consultable hors connexion. Aucun compte n’est créé.</p>
<h2>Ce que l’application ne fait pas</h2>
<ul><li>Pas de publicité, pas de mesure d’audience, pas de traceur.</li><li>Aucune vente ni transmission de données à des tiers.</li></ul>
<h2>Jeunes joueurs</h2>
<p>Les joueurs sont souvent mineurs. Le coach informe les parents et recueille leur accord avant d’activer l’espace d’un joueur.</p>
<h2>Supprimer les données</h2>
<ul><li>Le coach peut retirer l’accès d’un joueur : son fichier est supprimé du Drive et le lien cesse de fonctionner.</li>
<li>Le coach peut effacer toutes ses données dans les réglages, supprimer le dossier « Coach Tennis » de son Drive et révoquer l’accès sur <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.</li>
<li>Désinstaller l’application efface les données de l’appareil.</li></ul>
<h2>Contact</h2>
<p>Pour toute question : ${contact}.</p>
<p><a href="./">Ouvrir Coach Tennis</a></p>
</main></body></html>
`);
}
for (const f of ['index.html', 'fonts/fonts.css', 'lib/pdf.min.js', ...(PWA ? ['sw.js', 'manifest.webmanifest', 'icons/icon-512.png', 'confidentialite.html'] : ['native.js'])])
  if (!existsSync(join(www, f))) throw new Error('manquant : ' + f);
console.log(`${PWA ? 'pwa' : 'www'}/ prêt :`, fontCss.split('@font-face').length - 1, 'polices,', Object.keys(libs).length, 'bibliothèques.');
