// Coach Tennis — vérification du programme en arrière-plan (Android).
// Exécuté par le système environ toutes les 15 à 30 minutes, hors de l'appli.
// Ne lit que le marqueur public du fichier Drive (numéro de version + texte court),
// jamais le contenu chiffré du programme.

function lire(cle) {
  const v = CapacitorKV.get(cle);
  const s = typeof v === 'string' ? v : v && v.value;
  try { return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

function numero(texte) {
  let h = 0;
  for (let i = 0; i < texte.length; i++) h = (h * 31 + texte.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000000) + 5000;
}

addEventListener('configurer', (resolve, reject, args) => {
  try {
    CapacitorKV.set('ct-sources', JSON.stringify(args || {}));
    resolve();
  } catch (e) {
    reject(e);
  }
});

addEventListener('verifierProgramme', async (resolve, reject) => {
  try {
    const cfg = lire('ct-sources');
    if (!cfg || !cfg.key || !cfg.list || !cfg.list.length) { resolve(); return; }
    let change = false;
    for (const s of cfg.list) {
      try {
        const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(s.f) +
          '?fields=appProperties&key=' + encodeURIComponent(cfg.key));
        if (!res.ok) continue;
        const j = JSON.parse(await res.text());
        const ap = (j && j.appProperties) || {};
        const r = parseInt(ap.r || '0', 10);
        if (r > (s.r || 0)) {
          CapacitorNotifications.schedule([{
            id: numero(s.f + ':' + r),
            title: 'Coach Tennis · ' + (s.prenom || 'ton programme'),
            body: ap.n || 'Ton coach a mis à jour ton programme',
            smallIcon: 'ic_stat_uscm',
            autoCancel: true
          }]);
          s.r = r;
          change = true;
        }
      } catch (e) { /* réseau indisponible : on réessaiera au prochain passage */ }
    }
    if (change) CapacitorKV.set('ct-sources', JSON.stringify(cfg));
    resolve();
  } catch (e) {
    reject(e);
  }
});
