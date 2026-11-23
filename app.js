(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const A = window.anime, S = window.SITE, F = window.FALLBACK;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get(k) { try { return JSON.parse(localStorage.getItem('tir_' + k)); } catch { return null; } },
                set(k, v) { try { localStorage.setItem('tir_' + k, JSON.stringify(v)); } catch {} } };
let LANG = store.get('lang') === 'kz' ? 'kz' : 'ru';
const T = () => I18N[LANG];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (u = String(u || '').trim(), /^https:\/\/[^\s"'<>]+$/i.test(u) || /^images\/[\w\-./]+$/i.test(u) ? u : '');
const yes = v => /^(да|иә|yes|true|1)$/i.test(String(v || '').trim());
const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const money = n => num(n) + ' ₸';
const L = o => o[LANG] || o.ru;

/* ---------- CSV (Google Таблица) ---------- */
function csv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
async function load(name) {
  const url = safeUrl(S.sheets[name]);
  if (url) try { const r = await fetch(url, { cache: 'no-store' }); if (r.ok) return csv(await r.text()); } catch {}
  return csv(F[name]);
}

/* ---------- Данные ---------- */
let MENU = [], CATS = [], GAL = [];
const ICONS = [
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 30h44v16a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8z"/><path d="M10 38h44M10 30c4-10 40-10 44 0"/><circle cx="32" cy="16" r="4"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M8 40c6-16 18-24 24-24s18 8 24 24c-6 4-14 6-24 6S14 44 8 40z"/><path d="M22 22l4 22M42 22l-4 22M32 16v30"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 34h40v20H12zM16 24h32v10H16z"/><path d="M12 44c6 3 10-3 16 0s10 3 16 0 8-3 8 0M32 10v8"/></svg>',
  '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 24h34v14a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z"/><path d="M46 28h4a6 6 0 0 1 0 12h-5M22 10c-3 4 3 6 0 10M32 10c-3 4 3 6 0 10"/></svg>'];
const ph = (ci, label = T().photoSoon) => `<div class="ph c${ci % 5}">${ICONS[ci % 4]}<span>${esc(label)}</span></div>`;
const pic = (it, cls = '') => it.img ? `<img src="${esc(it.img)}" alt="${esc(L(it.name))}" loading="lazy" class="${cls}">` : ph(it.ci);

function parseMenu(rows) {
  CATS = [];
  MENU = rows.filter(r => r.id && r.name_ru).map(r => {
    let ci = CATS.findIndex(c => c.ru === r.cat_ru);
    if (ci < 0) ci = CATS.push({ ru: r.cat_ru, kz: r.cat_kz || r.cat_ru }) - 1;
    const options = (r.options || '').split(';').map(o => o.split('=')).filter(o => o.length === 2 && +o[1] > 0)
      .map(([l, p]) => ({ label: l.trim(), price: +p }));
    return { id: r.id, ci, name: { ru: r.name_ru, kz: r.name_kz }, desc: { ru: r.desc_ru, kz: r.desc_kz },
      price: Math.max(0, +r.price || 0), from: yes(r.from), options, img: safeUrl(r.image),
      on: r.available === '' || r.available === undefined ? true : yes(r.available) };
  });
}
const byId = id => MENU.find(m => m.id === id);
const priceText = (it, p = it.price, from = it.from) =>
  !p ? T().byDeal : from ? (LANG === 'kz' ? `${money(p)} ${T().from}` : `${T().from} ${money(p)}`) : money(p);

/* ---------- Язык ---------- */
function applyLang() {
  document.documentElement.lang = LANG === 'kz' ? 'kk' : 'ru';
  $$('[data-i18n]').forEach(el => { const v = T()[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-ph]').forEach(el => el.placeholder = T()[el.dataset.i18nPh]);
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
  $('#cartBtn').setAttribute('aria-label', T().cart);
}
function setLang(l) { LANG = l; store.set('lang', l); renderAll(); animateTitle(); }

/* ---------- Навигация ---------- */
function renderNav() {
  const cats = CATS.map((c, i) => `<a href="#menu" data-cat="${i}">${esc(L(c).split(/ и | және /)[0])}</a>`).join('');
  $('#nav').innerHTML = `<a href="#home">${T().home}</a><a href="#menu" data-cat="all">${T().menu}</a>${cats}<a href="#about">${T().about}</a><a href="#gallery">${T().gallery}</a><a href="#contacts">${T().contacts}</a>`;
}
$('#nav').addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return;
  if (a.dataset.cat) { state.cat = a.dataset.cat; renderCatalog(); } toggleNav(false); });
const toggleNav = open => { $('#nav').classList.toggle('open', open); $('#burger').setAttribute('aria-expanded', open); };
$('#burger').onclick = () => toggleNav(!$('#nav').classList.contains('open'));

/* ---------- Каталог ---------- */
const state = { cat: 'all', q: '', sort: '' };
function card(it) {
  return `<article class="card${it.on ? '' : ' off'}" data-id="${esc(it.id)}" tabindex="0" aria-label="${esc(L(it.name))}">
    <div class="pic">${pic(it)}${it.on ? '' : `<span class="badge">${T().soldout}</span>`}</div>
    <div class="card-body"><h3>${esc(L(it.name))}</h3><p>${esc(L(it.desc))}</p>
    <div class="card-foot"><span class="price">${priceText(it)}</span>
    <button type="button" class="btn small js-add" ${it.on ? '' : 'disabled'}>${T().add}</button></div></div></article>`;
}
function renderCatalog() {
  $('#chips').innerHTML = [['all', T().all], ...CATS.map((c, i) => [String(i), L(c)])]
    .map(([k, t]) => `<button type="button" class="chip${state.cat === k ? ' on' : ''}" data-k="${k}">${esc(t)}</button>`).join('');
  const q = state.q.toLowerCase();
  let list = MENU.filter(m => (state.cat === 'all' || m.ci === +state.cat) && (!q || (m.name.ru + ' ' + m.name.kz).toLowerCase().includes(q)));
  if (state.sort) list = [...list].sort((a, b) => ((a.price || 1e9) - (b.price || 1e9)) * (state.sort === 'asc' ? 1 : -1));
  let html;
  if (!list.length) html = `<p class="empty-list">${T().nothing}</p>`;
  else if (state.cat === 'all' && !q && !state.sort)
    html = CATS.map((c, i) => `<h3 class="cat-title" id="cat-${i}">${esc(L(c))}</h3><div class="grid">${list.filter(m => m.ci === i).map(card).join('')}</div>`).join('');
  else html = `<div class="grid">${list.map(card).join('')}</div>`;
  $('#catalog').innerHTML = html;
  reveal($$('#catalog .card'));
}
$('#chips').onclick = e => { const b = e.target.closest('.chip'); if (b) { state.cat = b.dataset.k; renderCatalog(); } };
$('#search').oninput = e => { state.q = e.target.value.trim().slice(0, 40); renderCatalog(); };
$('#sort').onchange = e => { state.sort = e.target.value; renderCatalog(); };
$('#catalog').addEventListener('click', e => {
  const c = e.target.closest('.card'); if (!c) return;
  const it = byId(c.dataset.id);
  if (e.target.closest('.js-add')) { addToCart(it, it.options[0]?.label || '', 1, $('.pic', c)); return; }
  location.hash = '#/p/' + it.id;
});
$('#catalog').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('card')) location.hash = '#/p/' + e.target.dataset.id; });

/* Анимация появления карточек (Anime.js) */
const io = 'IntersectionObserver' in window && A && !reduce ? new IntersectionObserver(entries => {
  const els = entries.filter(e => e.isIntersecting).map(e => (io.unobserve(e.target), e.target));
  if (els.length) A({ targets: els, opacity: [0, 1], translateY: [34, 0], duration: 700, delay: A.stagger(70), easing: 'easeOutCubic' });
}, { rootMargin: '0px 0px -40px' }) : null;
function reveal(els) { els.forEach(el => io ? io.observe(el) : (el.style.opacity = 1)); }

/* ---------- Окно товара (отдельная ссылка #/p/id) ---------- */
let pm = null;
function openProduct(id) {
  const it = byId(id); if (!it) return;
  pm = { it, qty: 1, opt: 0 }; renderProduct(); openLayer('#productModal');
}
function renderProduct() {
  const { it, qty, opt } = pm, o = it.options[opt], unit = o ? o.price : it.price;
  $('#pmBox').innerHTML = `<button type="button" class="x js-close" aria-label="${T().close}">×</button>
    <div class="pm-pic">${pic(it)}</div>
    <div class="pm-body"><h2 id="pmName">${esc(L(it.name))}</h2>
      <div><div class="label">${T().composition}</div><p>${esc(L(it.desc))}</p></div>
      ${it.options.length ? `<div><div class="label">${T().size}</div><div class="opts">${it.options.map((x, i) =>
        `<button type="button" class="chip${i === opt ? ' on' : ''}" data-opt="${i}">${esc(x.label)}</button>`).join('')}</div></div>` : ''}
      <div class="price" style="font-size:26px">${priceText(it, unit, it.from && !o)}</div>
      <div><div class="label">${T().qty}</div><div class="stepper"><button type="button" data-d="-1" aria-label="−">−</button><span>${qty}</span><button type="button" data-d="1" aria-label="+">+</button></div></div>
      <button type="button" class="btn shine js-padd" ${it.on ? '' : 'disabled'}>${it.on ? T().addLong + (unit ? ' · ' + money(unit * qty) : '') : T().soldout}</button>
    </div>`;
}
$('#pmBox').addEventListener('click', e => {
  const t = e.target;
  if (t.closest('.js-close')) return closeProduct();
  if (t.dataset.opt) { pm.opt = +t.dataset.opt; renderProduct(); }
  if (t.dataset.d) { pm.qty = Math.min(99, Math.max(1, pm.qty + +t.dataset.d)); renderProduct(); }
  if (t.closest('.js-padd')) { addToCart(pm.it, pm.it.options[pm.opt]?.label || '', pm.qty, $('.pm-pic', $('#pmBox'))); closeProduct(); }
});
function closeProduct() { if (location.hash.startsWith('#/p/')) history.replaceState(null, '', location.pathname + location.search); closeLayer('#productModal'); }
function route() { const m = location.hash.match(/^#\/p\/([\w-]+)/); if (m) openProduct(m[1]); else if ($('#productModal').classList.contains('open')) closeLayer('#productModal'); }
addEventListener('hashchange', route);

/* ---------- Слои (модалки) ---------- */
function openLayer(sel) { $(sel).classList.add('open'); document.body.classList.add('lock'); }
function closeLayer(sel) { $(sel).classList.remove('open'); if (!$$('.modal.open,.drawer.open,.lightbox.open').length) document.body.classList.remove('lock'); }
$$('.modal,.drawer,.lightbox').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.id === 'productModal' ? closeProduct() : closeLayer('#' + m.id); }));
addEventListener('keydown', e => { if (e.key !== 'Escape') return; const o = $$('.modal.open,.drawer.open,.lightbox.open').pop(); if (o) o.id === 'productModal' ? closeProduct() : closeLayer('#' + o.id); });

/* ---------- Корзина ---------- */
let cart = (store.get('cart') || []).filter(x => x && typeof x.id === 'string' && x.qty > 0);
const line = c => { const it = byId(c.id); if (!it) return null; const o = it.options.find(x => x.label === c.opt);
  return { it, unit: o ? o.price : it.price, name: L(it.name) + (c.opt ? ` (${c.opt})` : '') }; };
const lines = () => cart.map(c => ({ c, ...line(c) })).filter(x => x.it);
const totals = () => lines().reduce((s, x) => ({ sum: s.sum + x.unit * x.c.qty, qty: s.qty + x.c.qty, deal: s.deal || !x.unit }), { sum: 0, qty: 0, deal: false });
function saveCart() { store.set('cart', cart); const { qty } = totals(); $('#cartCount').textContent = qty;
  if (A && !reduce) A({ targets: '#cartCount', scale: [1.5, 1], duration: 600, easing: 'easeOutElastic(1,.5)' }); }
function addToCart(it, opt, qty, fromEl) {
  if (!it.on) return;
  const ex = cart.find(c => c.id === it.id && c.opt === opt);
  ex ? ex.qty = Math.min(99, ex.qty + qty) : cart.push({ id: it.id, opt, qty });
  flyToCart(fromEl); setTimeout(saveCart, reduce || !A ? 0 : 650); renderCart();
  toast(`«${L(it.name)}» ${T().added}`);
}
function flyToCart(el) { // «Полёт в корзину» (Anime.js)
  if (!A || reduce || !el) return;
  const a = el.getBoundingClientRect(), b = $('#cartBtn').getBoundingClientRect(), f = document.createElement('div');
  f.className = 'fly'; f.innerHTML = el.innerHTML; document.body.append(f);
  const x0 = a.left + a.width / 2 - 35, y0 = a.top + a.height / 2 - 35;
  A({ targets: f, translateX: [x0, b.left + b.width / 2 - 35], translateY: [y0, b.top + b.height / 2 - 35], scale: [1.2, .2], opacity: [1, .6],
      duration: 650, easing: 'easeInOutCubic', complete: () => f.remove() });
}
function renderCart() {
  const L_ = lines(), { sum, qty, deal } = totals();
  $('#cartBox').innerHTML = `<div class="dr-head"><h3>${T().cart}</h3><button type="button" class="x js-cclose" aria-label="${T().close}">×</button></div>` +
  (!L_.length ? `<div class="empty-cart"><svg viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="56" fill="#F3E7D7"/><path d="M32 50h56l-5 34a6 6 0 0 1-6 5H43a6 6 0 0 1-6-5z" fill="#fff" stroke="#593D30" stroke-width="3"/><path d="M48 50a12 12 0 0 1 24 0" stroke="#593D30" stroke-width="3"/><path d="M60 78c-9-6-7-14 0-10 7-4 9 4 0 10z" fill="#D8B99A"/></svg>
     <h4 style="font:700 26px var(--serif)">${T().cartEmpty}</h4><p class="muted">${T().cartEmptySub}</p><button type="button" class="btn js-tomenu">${T().toMenu}</button></div>` :
  `<div class="dr-list">${L_.map(({ c, it, unit, name }, i) => `<div class="row"><div class="th">${pic(it)}</div>
     <div><h4>${esc(name)}</h4><small>${unit ? `${money(unit)} × ${c.qty} = <b>${money(unit * c.qty)}</b>` : T().byDeal}</small>
     <button type="button" class="rm" data-rm="${i}">${T().remove}</button></div>
     <div class="r"><div class="stepper"><button type="button" data-i="${i}" data-d="-1" aria-label="−">−</button><span>${c.qty}</span><button type="button" data-i="${i}" data-d="1" aria-label="+">+</button></div></div></div>`).join('')}</div>
   <div class="dr-foot"><div class="sum"><span>${T().items}</span><b>${qty} ${T().pcs}</b></div>
     <div class="sum big"><span>${T().total}</span><span>${money(sum)}</span></div>${deal ? `<p class="muted">${T().plusDeal}</p>` : ''}
     <button type="button" class="btn shine js-co">${T().checkout}</button><button type="button" class="btn btn-ghost js-cclose">${T().continue}</button></div>`);
}
$('#cartBox').addEventListener('click', e => {
  const t = e.target, d = t.dataset;
  if (t.closest('.js-cclose')) return closeLayer('#cart');
  if (t.closest('.js-tomenu')) { closeLayer('#cart'); return $('#menu').scrollIntoView(); }
  if (t.closest('.js-co')) { closeLayer('#cart'); return openCheckout(); }
  const live = lines();
  if (d.rm !== undefined) cart = cart.filter(c => c !== live[+d.rm].c);
  else if (d.d) { const c = live[+d.i].c; c.qty = Math.min(99, c.qty + +d.d); if (c.qty < 1) cart = cart.filter(x => x !== c); }
  else return;
  saveCart(); renderCart();
});
const openCart = () => { renderCart(); openLayer('#cart'); };
$('#cartBtn').onclick = openCart;
$$('.js-cart').forEach(a => a.onclick = e => { e.preventDefault(); openCart(); });
$('#heroOrder').onclick = () => lines().length ? openCart() : $('#menu').scrollIntoView();

/* ---------- Оформление заказа + WhatsApp ---------- */
const form = { name: '', phone: '', method: 'pickup', addr: '', time: '', comment: '', ok: false };
const delivery = () => yes(S.delivery);
function openCheckout() { if (!lines().length) return openCart(); renderForm(); openLayer('#checkout'); }
const fld = (k, label, type = 'text', max = 60, opt = false, err = '') => `<label class="field" data-f="${k}"><span class="label">${label}${opt ? ` <span class="muted">(${T().optional})</span>` : ''}</span>
  ${type === 'area' ? `<textarea name="${k}" maxlength="${max}">${esc(form[k])}</textarea>` : `<input name="${k}" type="${type}" maxlength="${max}" value="${esc(form[k])}" ${type === 'tel' ? 'inputmode="tel" autocomplete="tel"' : k === 'name' ? 'autocomplete="given-name"' : ''}>`}
  ${err ? `<span class="err">${err}</span>` : ''}</label>`;
function renderForm() {
  if (!delivery()) form.method = 'pickup';
  $('#coBox').innerHTML = `<button type="button" class="x js-xco" aria-label="${T().close}">×</button><form class="co" novalidate><h3>${T().checkout}</h3>
    ${fld('name', T().name, 'text', 40, false, T().errName)}${fld('phone', T().phone, 'tel', 20, false, T().errPhone)}
    <div class="field"><span class="label">${T().method}</span><div class="seg">
      <label><input type="radio" name="method" value="pickup" ${form.method === 'pickup' ? 'checked' : ''}><span>${T().pickup}</span></label>
      ${delivery() ? `<label><input type="radio" name="method" value="delivery" ${form.method === 'delivery' ? 'checked' : ''}><span>${T().delivery}</span></label>` : ''}</div></div>
    ${form.method === 'delivery' ? fld('addr', T().addr, 'text', 120, false, T().errAddr) : ''}
    ${fld('time', T().time, 'text', 40, true)}${fld('comment', T().comment, 'area', 300, true)}
    <label class="check" data-f="ok"><input type="checkbox" name="ok" ${form.ok ? 'checked' : ''}><span>${T().consent} <a href="privacy.html" target="_blank">${T().privacyLink}</a></span></label>
    <p class="err muted" id="okErr" hidden style="color:#a0503c">${T().errConsent}</p>
    <button type="submit" class="btn shine" style="width:100%">${T().next}</button></form>`;
}
$('#coBox').addEventListener('input', e => { const t = e.target; if (!t.name) return;
  form[t.name] = t.type === 'checkbox' ? t.checked : t.value; if (t.name === 'method') renderForm(); });
$('#coBox').addEventListener('click', e => { if (e.target.closest('.js-xco')) closeLayer('#checkout'); if (e.target.closest('.js-back')) renderForm(); });
$('#coBox').addEventListener('submit', e => {
  e.preventDefault();
  const bad = { name: form.name.trim().length < 2, phone: !/^\+?[\d\s()-]{10,18}$/.test(form.phone.trim()) || form.phone.replace(/\D/g, '').length < 10,
                addr: form.method === 'delivery' && form.addr.trim().length < 5 };
  Object.entries(bad).forEach(([k, v]) => $(`[data-f="${k}"]`, e.target)?.classList.toggle('bad', v));
  $('#okErr').hidden = form.ok;
  if (Object.values(bad).some(Boolean) || !form.ok) return;
  renderSummary();
});
function waText() {
  const t = T(), { sum, deal } = totals();
  const items = lines().map((x, i) => `${i + 1}. ${x.name} — ${x.c.qty} ${t.pcs} — ${x.unit ? money(x.unit * x.c.qty) : t.byDeal}.`).join('\n');
  return [t.waHello, '', `${t.waName}: ${form.name.trim()}`, `${t.waPhone}: ${form.phone.trim()}`, '', `${t.waOrder}:`, '', items, '',
    `${t.waTotal}: ${money(sum)}.${deal ? ' ' + t.plusDeal : ''}`, '', `${t.waMethod}: ${form.method === 'delivery' ? t.delivery : t.pickup}.`,
    form.method === 'delivery' ? `${t.waAddr}: ${form.addr.trim()}.` : '', form.time.trim() ? `${t.waTime}: ${form.time.trim()}.` : '',
    form.comment.trim() ? `${t.waComment}: ${form.comment.trim()}.` : '', '', t.waBye].filter((s, i, a) => s !== '' || a[i - 1] !== '').join('\n');
}
function renderSummary() {
  const t = T(), { sum, deal } = totals(), wa = `https://wa.me/${String(S.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(waText())}`;
  $('#coBox').innerHTML = `<button type="button" class="x js-xco" aria-label="${t.close}">×</button><div class="co"><h3>${t.summary}</h3>
    <ul class="sumlist">${lines().map(x => `<li><span>${esc(x.name)} × ${x.c.qty}</span><b>${x.unit ? money(x.unit * x.c.qty) : t.byDeal}</b></li>`).join('')}
    <li style="border-top:1px solid var(--cream);margin-top:6px;padding-top:10px"><b>${t.total}</b><b>${money(sum)}</b></li></ul>${deal ? `<p class="muted">${t.plusDeal}</p>` : ''}
    <ul class="sumlist"><li><span>${t.customer}</span><b>${esc(form.name)}, ${esc(form.phone)}</b></li><li><span>${t.method}</span><b>${form.method === 'delivery' ? t.delivery : t.pickup}</b></li>
    ${form.method === 'delivery' ? `<li><span>${t.addr}</span><b>${esc(form.addr)}</b></li>` : ''}${form.time ? `<li><span>${t.time}</span><b>${esc(form.time)}</b></li>` : ''}
    ${form.comment ? `<li><span>${t.comment}</span><b>${esc(form.comment)}</b></li>` : ''}</ul>
    <p class="muted" style="margin-bottom:14px">${t.waNote}</p>
    <div class="co-btns"><button type="button" class="btn btn-ghost js-back">${t.back}</button><a class="btn wa shine" href="${esc(wa)}" target="_blank" rel="noopener">${t.sendWa}</a></div></div>`;
}

/* ---------- Галерея, О нас, Соцсети, Контакты ---------- */
const GCATS = ['desserts', 'bakery', 'cakes', 'drinks', 'interior'];
let gcat = 'all';
const gTile = g => g.img ? `<img src="${esc(g.img)}" alt="${esc(L(g.alt))}" loading="lazy">` : ph(GCATS.indexOf(g.cat), L(g.alt));
function renderGallery() {
  const used = GCATS.filter(c => GAL.some(g => g.cat === c));
  $('#galChips').innerHTML = ['all', ...used].map(k => `<button type="button" class="chip${gcat === k ? ' on' : ''}" data-g="${k}">${T().gal[k]}</button>`).join('');
  $('#galGrid').innerHTML = GAL.map((g, i) => gcat === 'all' || g.cat === gcat ? `<button type="button" data-i="${i}" aria-label="${esc(L(g.alt))}">${gTile(g)}</button>` : '').join('');
  const ab = ['interior', 'desserts', 'bakery', 'interior'].map((c, k) => GAL.filter(g => g.cat === c)[k === 3 ? 1 : 0]).filter(Boolean);
  $('#aboutPics').innerHTML = ab.map(g => `<div>${gTile(g)}</div>`).join('');
}
$('#galChips').onclick = e => { const b = e.target.closest('.chip'); if (b) { gcat = b.dataset.g; renderGallery(); } };
$('#galGrid').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#lbContent').innerHTML = gTile(GAL[+b.dataset.i]); openLayer('#lightbox'); };
$('.lb-close').onclick = () => closeLayer('#lightbox');

const SOC = {
  instagram: ['Instagram', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>'],
  telegram: ['Telegram', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.3 2.9 11.5c-1 .4-1 1.6.1 1.9l4.7 1.5 1.8 5.6c.3.8 1.3 1 1.9.4l2.6-2.5 4.9 3.6c.7.5 1.7.1 1.9-.8l3-14.6c.2-1-.8-1.8-1.7-1.3zM9.9 14.6l-.4 4.1-1.4-4.6 10.3-6.6z"/></svg>'],
  whatsapp: ['WhatsApp', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.1-1.2l-.4-.3z"/></svg>']};
const waLink = () => `https://wa.me/${String(S.whatsapp).replace(/\D/g, '')}`;
function renderInfo() {
  const links = { instagram: safeUrl(S.instagram), telegram: safeUrl(S.telegram), whatsapp: waLink() };
  const soc = Object.entries(links).filter(([, u]) => u).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="${SOC[k][0]}">${SOC[k][1]}<span>${SOC[k][0]}</span></a>`).join('');
  $('#socials').innerHTML = soc; $('#fSocials').innerHTML = soc;
  ['#cPhone', '#fPhone'].forEach(s => { $(s).href = waLink(); $(s).textContent = S.phone; });
  $('#cAddr').textContent = S['address_' + LANG] || S.address_ru || T().ask;
  $('#cHours').textContent = S['hours_' + LANG] || S.hours_ru || T().ask;
  $('#story').textContent = S['story_' + LANG] || S.story_ru || '';
  const map = safeUrl(S.map);
  $('#mapBox').innerHTML = map ? `<iframe src="${esc(map)}" loading="lazy" title="${T().address}" referrerpolicy="no-referrer"></iframe>`
    : `<div style="padding:40px 24px"><h3 style="font:700 30px var(--serif)">${T().qTitle}</h3><p class="muted" style="margin:8px 0 18px;font-size:15px">${T().qText}</p><a class="btn wa shine" href="${waLink()}" target="_blank" rel="noopener">${T().write}</a></div>`;
}

/* ---------- Прочее: тост, наверх, уведомление ---------- */
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200); }
addEventListener('scroll', () => $('#toTop').classList.toggle('show', scrollY > 600), { passive: true });
$('#toTop').onclick = () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
if (!store.get('notice')) $('#notice').classList.add('show');
$('#noticeOk').onclick = () => { store.set('notice', 1); $('#notice').classList.remove('show'); };
$$('.lang button').forEach(b => b.onclick = () => setLang(b.dataset.lang));

/* ---------- Заголовок по буквам (Anime.js) ---------- */
function animateTitle() {
  const h = $('#heroTitle'); h.textContent = T().heroTitle;
  if (!A || reduce) return;
  h.innerHTML = h.textContent.split(' ').map(w => `<span style="display:inline-block;white-space:nowrap">${[...w].map(c => `<span class="ch">${esc(c)}</span>`).join('')}</span>`).join(' ');
  A({ targets: '#heroTitle .ch', opacity: [0, 1], translateY: ['0.5em', 0], rotate: [8, 0], duration: 800, delay: A.stagger(28), easing: 'easeOutExpo' });
}

/* ---------- Иллюстрация в hero (если нет фото) ---------- */
function heroArt() {
  const hero = safeUrl(S.hero_image) || MENU.find(m => m.ci === 0 && m.img)?.img;
  if (hero) return $('#heroArt').innerHTML = `<img src="${esc(hero)}" alt="ТИРАМИСУ" style="width:100%;height:100%;object-fit:cover">`;
  const svg = $('#cupSvg').cloneNode(true); svg.removeAttribute('id');
  $$('#pour,#milkBase,#ripple', svg).forEach(n => n.remove());
  $$('.leaf', svg).forEach(n => n.style.transform = 'none');
  $('#cup', svg).style.opacity = 1; $('#steam', svg).setAttribute('opacity', '.6');
  Object.assign($('#pull', svg).style, { strokeDasharray: 'none', strokeDashoffset: 0 });
  $$('[id]', svg).forEach(n => { if (!n.closest('defs')) n.removeAttribute('id'); });
  $('#heroArt').replaceChildren(svg);
}

/* ---------- ИНТРО: кофе → льётся молоко → розетта (латте-арт) ---------- */
function intro(done) {
  const el = $('#intro');
  if (!A) { el.remove(); return done(); }
  document.body.classList.add('intro-on'); $('#skipIntro').textContent = T().skip;
  const len = id => { const p = $(id), l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; return l; };
  const ls = len('#stream'), lp = len('#pull');
  const leaves = $$('#rosetta .leaf:not(#head)');
  let finished = false;
  const finish = () => { if (finished) return; finished = true; tl.pause();
    A({ targets: el, opacity: 0, duration: 650, easing: 'easeInOutQuad', complete: () => { el.remove(); document.body.classList.remove('intro-on'); } });
    A({ targets: '#cupSvg', scale: 1.12, duration: 650, easing: 'easeInQuad' }); done(); };
  const lt = leaves.length * 190 + 500;
  const tl = A.timeline({ easing: 'easeOutCubic' })
    .add({ targets: '#cup', opacity: [0, 1], scale: [.82, 1], rotate: [-8, 0], duration: 900, easing: 'easeOutBack' })
    .add({ targets: '#coffee', scale: [1.06, 1], duration: 900, easing: 'easeOutSine' }, '-=600')
    .add({ targets: '#pour', opacity: [0, 1], translateX: [70, 0], translateY: [-60, 0], duration: 700 }, '-=300')
    .add({ targets: '#pitcher', rotate: [0, -24], duration: 500 }, '-=350')
    .add({ targets: '#stream', strokeDashoffset: [ls, 0], duration: 380, easing: 'easeInQuad' })
    .add({ targets: '#ripple', opacity: [.9, 0], scale: [.4, 3.2], duration: 1100, easing: 'easeOutQuad' }, '-=80')
    .add({ targets: '#milkBase', scale: [0, 1.15], duration: 900, easing: 'easeOutQuad' }, '-=1100')
    // покачивание молочника и рост листиков розетты снизу вверх
    .add({ targets: '#pour', translateY: [0, -86], duration: lt, easing: 'easeInOutSine' }, '-=200')
    .add({ targets: '#pour', translateX: [{ value: -7, duration: 95 }, { value: 7, duration: 95 }].concat(...Array(leaves.length).fill([{ value: -7, duration: 95 }, { value: 7, duration: 95 }])).concat([{ value: 0, duration: 120 }]), easing: 'easeInOutSine' }, `-=${lt}`)
    .add({ targets: leaves, scaleX: [0, 1], scaleY: [0, 1], translateX: (e, i) => [i % 2 ? 9 : -9, 0], opacity: [0, 1], duration: 650, delay: A.stagger(190), easing: 'easeOutBack' }, `-=${lt}`)
    .add({ targets: '#milkBase', opacity: [1, 0], duration: 600 }, `-=${lt - 400}`)
    .add({ targets: '#head', scale: [0, 1], duration: 500, easing: 'easeOutBack' }, '-=250')
    // протяжка: молочник уходит вниз через весь рисунок
    .add({ targets: '#pour', translateY: [-86, 18], duration: 520, easing: 'easeInOutQuad' })
    .add({ targets: '#pull', strokeDashoffset: [lp, 0], duration: 520, easing: 'easeInOutQuad' }, '-=520')
    .add({ targets: '#stream', strokeDashoffset: [0, -ls], duration: 320, easing: 'easeInQuad' })
    .add({ targets: '#pour', opacity: 0, translateX: 60, translateY: -40, duration: 500 }, '-=200')
    .add({ targets: '#rosetta', scale: [1, 1.03, 1], duration: 900, easing: 'easeInOutSine' }, '-=300')
    .add({ targets: '#steam', opacity: [0, .6], translateY: [12, -6], duration: 1000 }, '-=900')
    .add({ targets: '.intro-brand', opacity: [0, 1], translateY: [18, 0], duration: 800 }, '-=900')
    .add({ duration: 1000 });
  tl.finished.then(finish);
  $('#skipIntro').onclick = finish;
}

/* ---------- Старт ---------- */
function renderAll() { applyLang(); renderNav(); renderCatalog(); renderCart(); renderGallery(); renderInfo();
  if (pm && $('#productModal').classList.contains('open')) renderProduct();
  if ($('#checkout').classList.contains('open')) renderForm(); }
(async () => {
  const [menu, settings, gal] = await Promise.all([load('menu'), load('settings'), load('gallery')]);
  settings.forEach(({ key, value }) => { if (key && key !== 'sheets' && value !== '') S[key] = value; });
  parseMenu(menu);
  GAL = gal.filter(g => GCATS.includes(g.cat)).map(g => ({ cat: g.cat, img: safeUrl(g.image), alt: { ru: g.alt_ru, kz: g.alt_kz } }));
  cart = cart.filter(c => byId(c.id));
  heroArt(); renderAll(); saveCart();
  intro(() => { animateTitle(); route(); });
})();
})();
