(() => {
'use strict';
const C = window.ADMIN_CONFIG || {};
const early = t => { document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'v-login'); const m = document.getElementById('login-msg'); if (m) m.textContent = t; };
if (typeof supabase === 'undefined') { early('Cannot load the Supabase script (blocked or offline). Check your connection / ad-blocker.'); return; }
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(C.url || '') || /YOUR/.test(C.url + C.anonKey) || !C.anonKey) { early('Setup incomplete: put your Supabase Project URL and anon key in admin/config.js.'); return; }
const sb = supabase.createClient(C.url, C.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
const $ = id => document.getElementById(id);
// Safe DOM builder: text only, never innerHTML.
const h = (tag, a = {}, ...kids) => { const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a)) k === 'class' ? e.className = v : k.startsWith('on') ? e.addEventListener(k.slice(2), v) : e[k] = v;
  e.append(...kids); return e; };
const show = id => document.querySelectorAll('.view').forEach(s => s.hidden = s.id !== id);
const say = (id, t, ok) => { const e = $(id); e.textContent = t || ''; e.className = 'msg' + (ok ? ' ok' : ''); };
const fail = e => say('dash-msg', e ? 'Action failed (check permissions / values).' : '');
const IST = { timeZone: 'Asia/Kolkata' };

let factorId = null, idle, clockTimer, statEls = {};
const IDLE_MS = 15 * 60 * 1000;
const TOPICS = [['linux','Linux','🐧'],['networking','Networking','🌐'],['cloud','Cloud','☁️'],['devops','DevOps','⚙️'],['cybersecurity','Cybersecurity','🛡️']];
const LINKS = [['whatsapp','WhatsApp','💬'],['github','GitHub','🐙'],['linkedin','LinkedIn','💼'],['youtube','YouTube','▶️'],['google','Google','🔍'],['instagram','Instagram','📸'],['portfolio','Portfolio','🕷️']];

/* ---------- auth flow: password -> TOTP 2FA -> aal2 ---------- */
async function route() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return show('v-login');
  const { data: a } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (a?.currentLevel === 'aal2') return dash();
  const { data: f } = await sb.auth.mfa.listFactors();
  const ok = (f?.totp || []).find(x => x.status === 'verified');
  show('v-mfa'); $('mfa-enroll').hidden = !!ok; say('mfa-msg', '');
  if (ok) { factorId = ok.id; return; }
  for (const u of (f?.all || []).filter(x => x.status === 'unverified')) await sb.auth.mfa.unenroll({ factorId: u.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
  if (error) return say('mfa-msg', '2FA setup failed: ' + (error.code || error.message));
  factorId = data.id; $('qr').src = data.totp.qr_code; $('secret').textContent = data.totp.secret;
}
$('login-form').addEventListener('submit', async e => {
  e.preventDefault(); say('login-msg', '');
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  $('password').value = '';
  if (error) return say('login-msg', error.code === 'invalid_credentials' ? 'Invalid credentials.' : 'Login failed: ' + (error.code || error.message || 'network error'));
  route();
});
$('mfa-form').addEventListener('submit', async e => {
  e.preventDefault();
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: $('code').value.trim() });
  $('code').value = '';
  if (error) return say('mfa-msg', 'Invalid code.');
  route();
});
document.querySelectorAll('[data-signout]').forEach(b => b.addEventListener('click', signOut));
async function signOut() { clearInterval(clockTimer); await sb.auth.signOut(); show('v-login'); }
sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') show('v-login'); });
function resetIdle() { clearTimeout(idle); idle = setTimeout(signOut, IDLE_MS); }
['click','keydown','touchstart','mousemove'].forEach(ev => addEventListener(ev, resetIdle, { passive: true }));

/* ---------- one-page dashboard ---------- */
async function dash() {
  const { data } = await sb.rpc('is_admin');
  if (data !== true) { await signOut(); say('login-msg', 'Not authorised.'); return; }
  show('v-dash'); resetIdle(); build();
}
const card = (id, label, title, cls = '') => { const body = h('div', { class: 'body' });
  const el = h('section', { class: 'card w ' + cls, id: 'w-' + id }, h('span', { class: 'pill' }, '// ' + label), h('h2', {}, title), body);
  return { el, body }; };

function build() {
  clearInterval(clockTimer); statEls = {}; say('dash-msg', '');
  const ws = [hero(), statsRow(), shortcuts(), tasks(), notes(), progress(), devices(), drive(), servers(), messages(), projects(), skills()];
  $('grid').replaceChildren(...ws.map(w => w.el));
  ws.forEach(w => w.refresh?.()); refreshStats();
}
function hero() {
  const greet = h('h1', { class: 'big' }), clock = h('div', { class: 'clock' }), date = h('div', { class: 'date' });
  const tick = () => { const d = new Date();
    clock.textContent = d.toLocaleTimeString('en-IN', { ...IST, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    date.textContent = d.toLocaleDateString('en-IN', { ...IST, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · IST (Asia/Kolkata)';
    const hr = Number(new Intl.DateTimeFormat('en-GB', { ...IST, hour: '2-digit', hour12: false }).format(d)) % 24;
    greet.textContent = `${hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'}, ${C.name || 'Web-Head'}!`; };
  tick(); clockTimer = setInterval(tick, 1000);
  return { el: h('section', { class: 'hero full' }, h('span', { class: 'pill' }, '// Welcome'), greet, clock, date) };
}
function statsRow() {
  const s = (k, label, to) => { const b = h('b', {}, '–'); statEls[k] = b;
    return h('button', { type: 'button', class: 'stat', onclick: () => $('w-' + to)?.scrollIntoView({ behavior: 'smooth' }) }, b, h('span', {}, label)); };
  return { el: h('div', { class: 'stats full' }, s('tasks', 'Open tasks', 'tasks'), s('msgs', 'Unread messages', 'messages'), s('learn', 'Learning average', 'progress'), s('dev', 'Devices on', 'devices')) };
}
async function refreshStats() {
  const q = t => sb.from(t).select('*'); const [t, m, p, d] = await Promise.all([q('tasks'), q('messages'), q('progress'), q('devices')]);
  if (t.error || m.error || p.error || d.error) return;
  statEls.tasks && (statEls.tasks.textContent = t.data.filter(x => !x.done).length);
  statEls.msgs && (statEls.msgs.textContent = m.data.filter(x => !x.is_read).length);
  statEls.learn && (statEls.learn.textContent = Math.round(TOPICS.reduce((s, [k]) => s + (p.data.find(r => r.topic === k)?.percent || 0), 0) / TOPICS.length) + '%');
  statEls.dev && (statEls.dev.textContent = d.data.filter(x => x.is_on).length + '/' + d.data.length);
}
function shortcuts() {
  const { el, body } = card('shortcuts', 'Shortcuts', 'Quick Links');
  body.append(h('div', { class: 'tiles' }, ...LINKS.filter(([k]) => /^https:\/\//.test(C.shortcuts?.[k] || '')).map(([k, l, ic], i) => {
    const a = h('a', { class: 'tile', href: C.shortcuts[k], target: '_blank', rel: 'noopener noreferrer', title: l }, h('i', {}, ic), h('span', {}, l));
    a.style.animationDelay = i * 50 + 'ms'; return a; })));
  return { el };
}

/* ---------- tasks ---------- */
function tasks() {
  const { el, body } = card('tasks', 'Tasks', 'Task Manager'), list = h('div');
  const title = h('input', { type: 'text', placeholder: 'New task…', maxLength: 200, required: true });
  const pri = h('select', {}, ...['low','medium','high'].map(v => h('option', { value: v, selected: v === 'medium' }, v)));
  const due = h('input', { type: 'date' });
  const form = h('form', { class: 'inline' }, title, pri, due, h('button', { type: 'submit' }, 'Add'));
  const refresh = async () => {
    const { data, error } = await sb.from('tasks').select('*').order('done').order('created_at', { ascending: false });
    if (error) return fail(error);
    list.replaceChildren(...data.map(t => h('div', { class: 'item task' + (t.done ? ' done' : '') },
      h('input', { type: 'checkbox', checked: t.done, onchange: async e => { fail((await sb.from('tasks').update({ done: e.target.checked }).eq('id', t.id)).error); refresh(); refreshStats(); } }),
      h('span', { class: 'grow' }, t.title), h('span', { class: 'tag ' + t.priority }, t.priority), h('span', { class: 'mut' }, t.due || ''),
      h('button', { type: 'button', class: 'danger', title: 'Delete', onclick: async () => { fail((await sb.from('tasks').delete().eq('id', t.id)).error); refresh(); refreshStats(); } }, '✕')))); };
  form.addEventListener('submit', async e => { e.preventDefault();
    const { error } = await sb.from('tasks').insert({ title: title.value.trim(), priority: pri.value, due: due.value || null });
    fail(error); if (!error) { title.value = ''; refresh(); refreshStats(); } });
  body.append(form, list); return { el, refresh };
}

/* ---------- learning progress ---------- */
function progress() {
  const { el, body } = card('progress', 'Learning', 'Learning Progress');
  const refresh = async () => {
    const { data, error } = await sb.from('progress').select('*'); if (error) return fail(error);
    body.replaceChildren(...TOPICS.map(([k, label, ic]) => {
      const pct = data.find(r => r.topic === k)?.percent || 0; let exists = data.some(r => r.topic === k);
      const val = h('strong', {}, pct + '%'), fill = h('div', { class: 'fill' }); fill.style.width = pct + '%';
      const rng = h('input', { type: 'range', min: 0, max: 100, step: 5, value: pct });
      rng.addEventListener('input', () => { val.textContent = rng.value + '%'; fill.style.width = rng.value + '%'; });
      rng.addEventListener('change', async () => { const percent = Number(rng.value);
        const { error } = await (exists ? sb.from('progress').update({ percent, updated_at: new Date().toISOString() }).eq('topic', k) : sb.from('progress').insert({ topic: k, percent }));
        fail(error); if (!error) { exists = true; refreshStats(); } });
      return h('div', {}, h('div', { class: 'row' }, h('span', {}, ic + ' ' + label), val), h('div', { class: 'bar' }, fill), rng); })); };
  return { el, refresh };
}

/* ---------- messages ---------- */
function messages() {
  const { el, body } = card('messages', 'Inbox', 'Contact Messages');
  const refresh = async () => {
    const { data, error } = await sb.from('messages').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) return fail(error);
    body.replaceChildren(...(data.length ? data : [null]).map(m => !m ? h('p', { class: 'mut' }, 'No messages.') :
      h('div', { class: 'item' + (m.is_read ? '' : ' unread') },
        h('div', { class: 'row' }, h('strong', {}, m.name), h('span', {}, m.email), h('span', {}, new Date(m.created_at).toLocaleString('en-IN', IST))), h('p', {}, m.message),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'ghost', onclick: async () => { fail((await sb.from('messages').update({ is_read: !m.is_read }).eq('id', m.id)).error); refresh(); refreshStats(); } }, m.is_read ? 'Mark unread' : 'Mark read'),
          h('button', { type: 'button', class: 'danger', onclick: async () => { if (confirm('Delete this message?')) { fail((await sb.from('messages').delete().eq('id', m.id)).error); refresh(); refreshStats(); } } }, 'Delete'))))); };
  return { el, refresh };
}

/* ---------- generic CRUD widget ---------- */
function editor(name, cfg, body, after) {
  const list = h('div'), wrap = h('details', { class: 'add' });
  body.append(wrap, list);
  const reload = async () => {
    const { data, error } = await sb.from(name).select('*').order(cfg.order[0], { ascending: cfg.order[1] }).order('id');
    if (error) return fail(error);
    list.replaceChildren(...(data.length ? data : [null]).map(r => !r ? h('p', { class: 'mut' }, 'Nothing yet.') :
      h('div', { class: 'item' }, h('div', { class: 'row' }, h('strong', {}, cfg.title(r)), cfg.tag ? cfg.tag(r) : ''),
        cfg.sub ? h('p', {}, cfg.sub(r) || '') : '', cfg.extra ? cfg.extra(r, () => { reload(); after?.(); }) : '',
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'ghost', onclick: () => form(r) }, 'Edit'),
          h('button', { type: 'button', class: 'danger', onclick: async () => { if (confirm('Delete?')) { fail((await sb.from(name).delete().eq('id', r.id)).error); reload(); after?.(); } } }, 'Delete'))))); };
  function form(r) {
    const inputs = {};
    const f = h('form', {}, ...cfg.fields.map(([k, t, opts]) => {
      const v = r ? r[k] : (cfg.defaults?.[k] ?? (t === 'bool' ? false : t === 'number' ? 0 : t === 'tags' ? [] : t === 'select' ? opts[0] : ''));
      const i = t === 'textarea' ? h('textarea', { rows: 3, value: v ?? '' }) : t === 'bool' ? h('input', { type: 'checkbox', checked: !!v })
        : t === 'select' ? h('select', {}, ...opts.map(o => h('option', { value: o, selected: o === v }, o)))
        : h('input', { type: t === 'number' ? 'number' : 'text', step: 'any', value: t === 'tags' ? (v || []).join(', ') : (v ?? '') });
      inputs[k] = [i, t]; return h('label', {}, k, i); }), h('button', { type: 'submit' }, r ? 'Save changes' : 'Add'));
    f.addEventListener('submit', async e => { e.preventDefault(); const row = {};
      for (const [k, [i, t]] of Object.entries(inputs))
        row[k] = t === 'bool' ? i.checked : t === 'number' ? Number(i.value) : t === 'tags' ? i.value.split(',').map(s => s.trim()).filter(Boolean) : (i.value.trim() || null);
      const { error } = await (r ? sb.from(name).update(row).eq('id', r.id) : sb.from(name).insert(row));
      fail(error); if (!error) { form(null); reload(); after?.(); } });
    wrap.replaceChildren(h('summary', {}, r ? 'Editing…' : '+ Add'), f); wrap.open = !!r;
  }
  form(null); return reload;
}
function gen(id, label, title, table, cfg, cls, after) {
  const { el, body } = card(id, label, title, cls); const c = body;
  return { el, body, refresh: editor(table, cfg, c, after) };
}
const switchEl = (checked, onchange) => h('input', { type: 'checkbox', checked, onchange, title: 'Toggle' });

function notes() { return gen('notes', 'Notes', 'Quick Notes', 'notes', { order: ['created_at', false],
  fields: [['title','text'],['body','textarea']], title: r => r.title, sub: r => r.body }); }
function projects() { return gen('projects', 'Public', 'Portfolio Projects', 'projects', { order: ['sort', true], defaults: { published: true },
  fields: [['title','text'],['description','textarea'],['tags','tags'],['url','text'],['sort','number'],['published','bool']],
  title: r => r.title, tag: r => h('span', { class: 'tag' }, r.published ? 'published' : 'hidden') }); }
function skills() { return gen('skills', 'Public', 'Skills', 'skills', { order: ['sort', true], defaults: { published: true, level: 50 },
  fields: [['name','text'],['category','text'],['level','number'],['sort','number'],['published','bool']],
  title: r => `${r.name} (${r.category}, ${r.level}%)`, tag: r => h('span', { class: 'tag' }, r.published ? 'published' : 'hidden') }); }

/* ---------- home automation (state stored in DB; see notes in reply) ---------- */
function devices() {
  const w = gen('devices', 'Home Automation', 'Smart Home', 'devices', { order: ['room', true],
    fields: [['name','text'],['room','text'],['kind','select',['light','fan','ac','plug','camera','lock','other']],['is_on','bool']],
    title: r => r.name, sub: r => `${r.room || '—'} · ${r.kind}`, tag: r => h('span', { class: 'tag ' + (r.is_on ? 'ON' : 'OFF') }, r.is_on ? 'ON' : 'OFF'),
    extra: (r, done) => h('label', { class: 'row' }, 'Power', switchEl(r.is_on, async e => { fail((await sb.from('devices').update({ is_on: e.target.checked }).eq('id', r.id)).error); done(); })) }, '', refreshStats);
  const all = on => async () => { fail((await sb.from('devices').update({ is_on: on }).gte('id', 0)).error); w.refresh(); refreshStats(); };
  w.body.prepend(h('div', { class: 'row' }, h('button', { type: 'button', onclick: all(true) }, 'All on'), h('button', { type: 'button', class: 'ghost', onclick: all(false) }, 'All off')));
  return w;
}

/* ---------- Google Drive storage (manual entry; no Google tokens in browser) ---------- */
function drive() {
  const w = gen('drive', 'Storage', 'Google Drive Storage', 'drive_storage', { order: ['id', true], defaults: { total_gb: 15 },
    fields: [['label','text'],['used_gb','number'],['total_gb','number']], title: r => r.label,
    tag: r => h('span', { class: 'tag' }, Math.round(r.used_gb / r.total_gb * 100) + '%'),
    extra: r => { const f = h('div', { class: 'fill' }); f.style.width = Math.min(100, r.used_gb / r.total_gb * 100) + '%';
      return h('div', {}, h('div', { class: 'bar' }, f), h('span', { class: 'mut' }, `${r.used_gb} GB used of ${r.total_gb} GB`)); } });
  w.body.prepend(h('p', { class: 'mut' }, 'Entered by hand. Live sync needs Google sign-in handled on a server, never in this page. '),
    h('a', { class: 'tile', href: 'https://drive.google.com/drive/quota', target: '_blank', rel: 'noopener noreferrer' }, h('i', {}, '🗂️'), h('span', {}, 'Open Drive storage')));
  return w;
}

/* ---------- server config (inventory only: NEVER passwords or keys) ---------- */
function servers() {
  const w = gen('servers', 'Servers', 'Server Config', 'servers', { order: ['name', true],
    fields: [['name','text'],['host','text'],['role','text'],['os','text'],['cpu_cores','number'],['ram_gb','number'],['status','select',['online','offline','maintenance']],['notes','textarea']],
    title: r => r.name, tag: r => h('span', { class: 'tag ' + r.status }, r.status),
    sub: r => `${r.host || '—'} · ${r.role || ''} · ${r.os || ''} · ${r.cpu_cores || 0} cores / ${r.ram_gb || 0} GB RAM\n${r.notes || ''}`.trim() });
  w.body.prepend(h('p', { class: 'mut' }, 'Inventory and notes only. Never store passwords, SSH keys or API tokens here.'));
  return w;
}

route();
})();
