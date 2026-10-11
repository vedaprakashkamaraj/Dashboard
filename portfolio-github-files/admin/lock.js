(() => {
'use strict';
const L = document.getElementById('lock'); if (!L) return;
const bar = document.getElementById('slk'), kn = document.getElementById('slkn'), fill = document.getElementById('slkf'), txt = document.getElementById('slkt');
const tm = document.getElementById('lk-time'), dt = document.getElementById('lk-date'), IST = { timeZone: 'Asia/Kolkata' };
const tick = () => { const d = new Date();
  tm.textContent = d.toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', hour12: true });
  dt.textContent = d.toLocaleDateString('en-IN', { ...IST, weekday: 'long', day: 'numeric', month: 'long' }); };
tick(); let clk = setInterval(tick, 1000);
const K = 52, PAD = 4; let x = 0, max = 0, drag = false, sx = 0, x0 = 0, busy = false;
const calc = () => { max = Math.max(1, bar.clientWidth - K - PAD * 2); };
function set(v, anim) { x = Math.max(0, Math.min(max, v)); bar.classList.toggle('snap', !!anim);
  kn.style.transform = `translateX(${x}px)`; fill.style.width = (x > 1 ? x + K / 2 + PAD : 0) + 'px';
  const p = x / max; txt.style.opacity = Math.max(0, 1 - p * 1.6); kn.setAttribute('aria-valuenow', Math.round(p * 100)); }
function finish() { busy = true; set(max, true); txt.textContent = ''; setTimeout(() => { if (subtle) showPin(); else open(); }, 230); }
kn.addEventListener('pointerdown', e => { if (busy) return; calc(); drag = true; sx = e.clientX; x0 = x; bar.classList.add('drag'); bar.classList.remove('snap'); kn.setPointerCapture(e.pointerId); e.preventDefault(); });
kn.addEventListener('pointermove', e => { if (drag) set(x0 + e.clientX - sx, false); });
function up() { if (!drag) return; drag = false; bar.classList.remove('drag'); if (x >= max * .82) finish(); else set(0, true); }
kn.addEventListener('pointerup', up); kn.addEventListener('pointercancel', up);
kn.addEventListener('keydown', e => { if (busy) return; calc();
  if (e.key === 'ArrowRight') { set(x + max * .25, true); if (x >= max * .82) finish(); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { set(x - max * .25, true); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === ' ') { finish(); e.preventDefault(); } });
addEventListener('resize', () => { calc(); if (!busy) set(0, false); });

/* ---- PIN: PBKDF2-hashed, stored on this device only (convenience lock) ---- */
const WIPE = L.dataset.wipe || '', PINK = 'vp-lock-pin', FAILK = 'vp-lock-fail', LEN = 4;
const subtle = window.crypto && crypto.subtle;
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
const T = document.getElementById('pin-t'), D = document.getElementById('pin-d'), M = document.getElementById('pin-m'), PADEL = document.getElementById('pin-pad');
let buf = '', first = null, mode = 'enter', locked = false, lt;
const open = () => { L.classList.add('open'); clearInterval(clk); };
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a))), ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hash(pin, salt) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, k, 256)); }
const getFail = () => { try { return JSON.parse(ls.get(FAILK)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } };
const dots = () => [...D.children].forEach((i, k) => i.classList.toggle('on', k < buf.length));
const msg = t => { M.textContent = t; };
function shake(t) { dots(); msg(t); D.classList.remove('shake'); void D.offsetWidth; D.classList.add('shake'); }
function lockout(until) { locked = true; clearInterval(lt);
  const u = () => { const s = Math.ceil((until - Date.now()) / 1000); if (s <= 0) { clearInterval(lt); locked = false; msg(''); } else msg('Too many tries. Wait ' + s + 's'); };
  u(); lt = setInterval(u, 500); }
function showPin() { L.classList.add('pin'); mode = ls.get(PINK) ? 'enter' : 'create'; buf = ''; first = null; dots();
  T.textContent = mode === 'create' ? 'Create a 4-digit PIN' : 'Enter PIN'; msg(''); const f = getFail(); if (f.until > Date.now()) lockout(f.until); }
function cancel() { L.classList.remove('pin'); buf = ''; first = null; msg(''); busy = false; txt.textContent = 'slide to open dashboard'; set(0, false); }
function press(k) { if (locked) return; if (k === 'del') { buf = buf.slice(0, -1); dots(); return; } if (buf.length >= LEN) return; buf += k; dots(); if (buf.length === LEN) setTimeout(submit, 120); }
async function submit() {
  const pin = buf; buf = '';
  if (mode === 'create') {
    if (first === null) { first = pin; T.textContent = 'Confirm PIN'; dots(); return; }
    if (pin !== first) { first = null; T.textContent = 'Create a 4-digit PIN'; shake("PINs didn't match. Try again"); return; }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    ls.set(PINK, JSON.stringify({ s: b64(salt), h: await hash(pin, salt) })); ls.del(FAILK); return open();
  }
  let rec = null; try { rec = JSON.parse(ls.get(PINK)); } catch (e) {}
  if (!rec) return showPin();
  if (await hash(pin, ub64(rec.s)) === rec.h) { ls.del(FAILK); return open(); }
  const f = getFail(); f.n++;
  if (f.n % 5 === 0) { f.until = Date.now() + Math.min(3600e3, 30e3 * 2 ** (f.n / 5 - 1)); ls.set(FAILK, JSON.stringify(f)); shake(''); lockout(f.until); return; }
  ls.set(FAILK, JSON.stringify(f)); shake('Wrong PIN. ' + (5 - f.n % 5) + ' tries left');
}
PADEL.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) press(b.dataset.k); });
document.getElementById('pin-cancel').addEventListener('click', cancel);
document.getElementById('pin-forgot').addEventListener('click', () => {
  if (!confirm(WIPE ? 'This erases ALL dashboard data saved on this device and removes the PIN. Continue?' : 'Remove the PIN and set a new one?')) return;
  ls.del(PINK); ls.del(FAILK); if (WIPE) { ls.del(WIPE); location.reload(); } else showPin(); });
addEventListener('keydown', e => { if (!L.classList.contains('pin')) return; if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Escape') cancel(); });

/* power button (and anything with #power) locks the screen again */
function lockNow() { if (!L.classList.contains('open')) return;
  clearInterval(lt); locked = false; L.classList.remove('open', 'pin'); buf = ''; first = null; msg('');
  busy = false; txt.textContent = 'slide to open dashboard'; calc(); set(0, false); tick(); clearInterval(clk); clk = setInterval(tick, 1000); }
const pw = document.getElementById('power'); if (pw) pw.addEventListener('click', lockNow);
document.addEventListener('vp-lock', lockNow);
L.querySelectorAll('[data-signout]').forEach(b => b.addEventListener('click', () => setTimeout(open, 60)));
calc();
})();
