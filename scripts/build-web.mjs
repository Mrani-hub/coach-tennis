// Construit le dossier www/ de l'appli mobile à partir de src/app.html (même fichier que la version web).
// Tout est embarqué : bibliothèques PDF, lecteur de carnets, polices. L'appli fonctionne sans connexion.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);
const www = join(root, 'www');
rmSync(www, { recursive: true, force: true });
for (const d of ['', 'lib', 'fonts']) mkdirSync(join(www, d), { recursive: true });

/* 1. Bibliothèques locales */
const libs = {
  'jspdf.umd.min.js': 'jspdf/dist/jspdf.umd.min.js',
  'jspdf.plugin.autotable.min.js': 'jspdf-autotable/dist/jspdf.plugin.autotable.min.js',
  'pdf.min.js': 'pdfjs-dist/build/pdf.min.js',
  'pdf.worker.min.js': 'pdfjs-dist/build/pdf.worker.min.js'
};
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

/* 3. Pont natif (Capacitor) */
await build({ entryPoints: [join(root, 'src/native.js')], bundle: true, format: 'iife', minify: true, target: 'es2019', outfile: join(www, 'native.js'), logLevel: 'warning' });

/* 4. Page de l'appli */
let html = readFileSync(join(root, 'src/app.html'), 'utf8');
const must = (re, what) => { if (!re.test(html)) throw new Error(`build-web : motif introuvable (${what})`); };
must(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, 'polices Google');
must(/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\//, 'jsPDF');
must(/const PDFJS_V='[^']*';/, 'pdf.js');
html = html
  .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\s*/, '')
  .replace(/<link rel="preconnect"[^>]*>\s*/, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/[^/]+\/jspdf\.umd\.min\.js/, 'lib/jspdf.umd.min.js')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf-autotable\/[^/]+\/jspdf\.plugin\.autotable\.min\.js/, 'lib/jspdf.plugin.autotable.min.js')
  .replace(/const PDFJS_V='[^']*';/, "const PDFJS_V='lib/';")
  // Encoches et barres système : variables injectées par Capacitor (Android), env() en secours (iOS)
  .replace(/env\(safe-area-inset-(top|bottom|left|right),\s*0px\)/g, (_, s) => `var(--safe-area-inset-${s}, env(safe-area-inset-${s}, 0px))`)
  .replace('<script src="lib/jspdf.umd.min.js">', '<script src="native.js"></script>\n<script src="lib/jspdf.umd.min.js">');

const cut = html.indexOf('</style>') + '</style>'.length;
const head = html.slice(0, cut), body = html.slice(cut);
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
for (const f of ['index.html', 'native.js', 'fonts/fonts.css', 'lib/pdf.min.js']) if (!existsSync(join(www, f))) throw new Error('manquant : ' + f);
console.log('www/ prêt :', fontCss.split('@font-face').length - 1, 'polices,', Object.keys(libs).length, 'bibliothèques.');
