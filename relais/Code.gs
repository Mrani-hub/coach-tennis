/**
 * Coach Tennis — relais des confirmations des joueurs.
 *
 * Ce petit script Google tourne sur votre compte Google, gratuitement.
 * Il reçoit les réponses des joueurs (« présent » / « je ne peux pas ») et les
 * range dans une feuille Google Sheets de votre Drive : « Coach Tennis – confirmations des joueurs ».
 * Les coachs les relisent depuis l'appli.
 *
 * Données reçues : identifiant du fichier joueur, identifiant du créneau, réponse,
 * message facultatif. Aucun nom de joueur ne transite ici.
 *
 * Installation : voir README, partie « Confirmations des joueurs ».
 */

const FEUILLE = 'Confirmations';

function feuille_() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('Coach Tennis – confirmations des joueurs');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    const sh = ss.getSheets()[0];
    sh.setName(FEUILLE);
    sh.appendRow(['Date', 'Fichier joueur', 'Créneau', 'Réponse', 'Message', 'Horaire au moment de la réponse']);
    sh.setFrozenRows(1);
  }
  return ss.getSheetByName(FEUILLE);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

const valide_ = s => typeof s === 'string' && /^[A-Za-z0-9_|:.\-]{1,160}$/.test(s);
// Empêche qu'un message soit interprété comme une formule dans Google Sheets
const texte_ = s => { s = String(s || '').slice(0, 300); return /^[=+\-@]/.test(s) ? "'" + s : s; };

/** Le joueur envoie sa réponse. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!valide_(d.f) || !valide_(d.s) || ['ok', 'non'].indexOf(d.st) < 0) return json_({ ok: false, err: 'requête invalide' });
    const verrou = LockService.getScriptLock();
    verrou.waitLock(10000);
    try {
      // L'apostrophe force Google Sheets à garder créneau et horaire en texte (sinon ils seraient convertis en dates)
      feuille_().appendRow([new Date(), d.f, "'" + d.s, d.st, texte_(d.msg), "'" + String(d.g || '').slice(0, 40)]);
    } finally {
      verrou.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, err: String(err) });
  }
}

/** Le coach relit les dernières réponses de ses joueurs (liste d'identifiants de fichiers). */
function doGet(e) {
  const ids = String((e && e.parameter && e.parameter.ids) || '').split(',').filter(valide_).slice(0, 300);
  if (!ids.length) return json_({ ok: true, app: 'coach-tennis-relais', r: [] });
  const voulu = {};
  ids.forEach(i => { voulu[i] = true; });
  const lignes = feuille_().getDataRange().getValues();
  const dernier = {};
  for (let i = 1; i < lignes.length; i++) {
    const [date, f, s, st, m, g] = lignes[i];
    if (voulu[f]) dernier[f + '|' + s] = { f: f, s: s, st: st, m: String(m || '').replace(/^'/, ''), g: String(g || '').replace(/^'/, ''), t: new Date(date).toISOString() };
  }
  return json_({ ok: true, r: Object.keys(dernier).map(k => dernier[k]) });
}
