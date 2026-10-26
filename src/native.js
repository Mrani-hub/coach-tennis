/* Pont natif Coach USCM : exposé sous window.Native uniquement dans l'appli Android/iOS. */
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SplashScreen } from '@capacitor/splash-screen';

const KEY = 'uscm-coach-v1';
const toB64 = async data => {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};
const hashId = str => { let h = 0; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2000000000 + 1; };

let persistTimer = null, pending = null;
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
  hideSplash() { SplashScreen.hide().catch(() => {}); }
};

if (Capacitor.isNativePlatform()) {
  window.Native = Native;
  const mq = matchMedia('(prefers-color-scheme: dark)');
  Native.themeBars(mq.matches); mq.addEventListener('change', e => Native.themeBars(e.matches));
}
