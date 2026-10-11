(() => {
'use strict';
const L = document.getElementById('loader'); if (!L) return;
const t0 = Date.now(); let gone = false;
const hide = () => { if (gone) return; gone = true; L.classList.add('done'); setTimeout(() => L.remove(), 700); };
addEventListener('load', () => setTimeout(hide, Math.max(0, 1600 - (Date.now() - t0))));
setTimeout(hide, 5000);
})();
