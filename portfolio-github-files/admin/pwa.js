(() => {
'use strict';
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
const btn = document.getElementById('install'); let ev = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; if (btn) btn.hidden = false; });
btn?.addEventListener('click', async () => { if (!ev) return; ev.prompt(); await ev.userChoice; ev = null; btn.hidden = true; });
addEventListener('appinstalled', () => { if (btn) btn.hidden = true; });
// iPhone/iPad have no install prompt: show the manual hint in the browser only
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const tip = document.getElementById('ios-tip'); if (tip && ios && !standalone) tip.hidden = false;
})();
