/* Pont natif Coach Tennis : exposé sous window.Native uniquement dans l'appli Android/iOS. */
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { BackgroundRunner } from '@capacitor/background-runner';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const KEY = 'uscm-coach-v1';
const toB64 = async data => {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};
const hashId = str => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000 + 1; };

let persistTimer = null, pending = null, googleInit = false;
const Native = {
  platform: Capacitor.getPlatform(),
  async restore() { try { const r = await Preferences.get({ key: KEY }); return r.value || null; } catch (e) { return null; } },
  persist(json) {
    pending = json; clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { Preferences.set({ key: KEY, value: pending }).catch(() => {}); }, 400);
  },
  flush() { if (pending !== null) { clearTimeout(persistTimer); return Preferences.set({ key: KEY, value: pending }).catch(() => {}); } },

  /* Enregistre le fichier puis ouvre la feuille de partage (Drive, WhatsApp, e-mail, Fichiers…). */
  async saveFile(filename, data, title) {
    const res = await Filesystem.writeFile({ path: filename, data: await toB64(data), directory: Directory.Cache });
    try { await Share.share({ title: title || filename, files: [res.uri], dialogTitle: title || filename }); }
    catch (e) { if (!/cancel/i.test(String(e && (e.message || e)))) throw e; return 'cancelled'; }
    return 'shared';
  },

  /* Rappels de séances */
  async notifPermission(ask) {
    try { let p = await LocalNotifications.checkPermissions(); if (p.display !== 'granted' && ask) p = await LocalNotifications.requestPermissions(); return p.display === 'granted'; }
    catch (e) { return false; }
  },
  async schedule(items) {
    try {
      const pend = await LocalNotifications.getPending();
      if (pend.notifications.length) await LocalNotifications.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
      if (!items.length || !(await Native.notifPermission(false))) return 0;
      await LocalNotifications.schedule({ notifications: items.slice(0, 60).map(n => ({
        id: hashId(n.key), title: n.title, body: n.body, schedule: { at: n.at, allowWhileIdle: true }, extra: { tab: 'jour' } })) });
      return Math.min(60, items.length);
    } catch (e) { console.warn('rappels', e); return 0; }
  },

  onBack(handler) { App.addListener('backButton', () => { if (!handler()) App.minimizeApp(); }); },
  onPause(handler) { App.addListener('pause', handler); },

  async themeBars(dark) {
    try {
      await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Light : SystemBarsStyle.Dark, bar: SystemBarType.StatusBar });
      await SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light, bar: SystemBarType.NavigationBar });
    } catch (e) {}
  },
  hideSplash() { SplashScreen.hide().catch(() => {}); },

  /* Vérification du programme en arrière-plan (joueur) */
  bgConfigurer(details) {
    BackgroundRunner.dispatchEvent({ label: 'ma.coachtennis.app.verification', event: 'configurer', details }).catch(() => {});
  },

  /* ---- Mise à jour dans l'appli (sans réinstaller l'APK) ----
     Le contenu de l'appli (HTML/JS) est téléchargé en zip depuis le site de l'appli puis activé ;
     l'APK n'est à réinstaller que si la partie native change (version native < natifMin). */
  majOta: true,
  async majPret() { try { await CapacitorUpdater.notifyAppReady(); } catch (e) {} },
  async majBuild() { try { return Number((await App.getInfo()).build) || 0; } catch (e) { return 0; } },
  /* Paquet déjà téléchargé pour cette version ? */
  async majTrouve(version) {
    try { const { bundles } = await CapacitorUpdater.list(); const L = bundles.filter(b => b.version === version); return L.find(b => b.status !== 'error') || L[0] || null; } catch (e) { return null; }
  },
  async majTelecharger(url, version, onProgress) {
    const old = await Native.majTrouve(version); if (old && old.status !== 'error') return old;
    let h = null; if (onProgress) h = await CapacitorUpdater.addListener('download', ev => onProgress(ev.percent || 0));
    try { return await CapacitorUpdater.download({ url, version }); } finally { if (h) h.remove(); }
  },
  /* Active la nouvelle version : l'appli redémarre aussitôt sur la nouvelle version */
  async majAppliquer(bundle) { await Native.flush(); await CapacitorUpdater.set({ id: bundle.id }); },

  /* Petites valeurs durables (mode coach/joueur, programmes suivis par un joueur) */
  async kvGet(key) { try { return (await Preferences.get({ key })).value; } catch (e) { return null; } },
  kvSet(key, value) { Preferences.set({ key, value }).catch(() => {}); },

  /* Connexion Google native (Android) : jeton d'accès Google Drive limité aux fichiers de l'appli */
  async googleLogin(webClientId, scopes) {
    if (!googleInit) { await SocialLogin.initialize({ google: { webClientId, mode: 'online' } }); googleInit = true; }
    const res = await SocialLogin.login({ provider: 'google', options: { scopes, forceRefreshToken: true } });
    const tok = res && res.result && res.result.accessToken && res.result.accessToken.token;
    if (!tok) throw new Error('Google n’a pas accordé l’accès à Drive. Réessayez et acceptez l’accès aux fichiers.');
    return tok;
  }
};

if (Capacitor.isNativePlatform()) {
  window.Native = Native;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  Native.themeBars(mq.matches); mq.addEventListener('change', e => Native.themeBars(e.matches));
}
