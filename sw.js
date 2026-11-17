/* Roteiro de Campo: rede primeiro para o app (sempre a versão mais nova); cópia guardada para abrir sem internet.
   Mapas de fundo: cada pedaço visto com internet fica guardado no aparelho (até ~MAX pedaços, 60 dias). */
const V = '30-1794938463';
const APP = 'rc-app-' + V, LIB = 'rc-lib-v1', MAPAS = 'rc-mapas-v1';
const MAX = 40000, VALIDADE = 60 * 864e5;
const FB = 'https://www.gstatic.com/firebasejs/10.14.1/';
const LIBS = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'].map(f => FB + f);
const TILES = /(^|\.)server\.arcgisonline\.com$|(^|\.)tile\.opentopomap\.org$|^tile\.openstreetmap\.org$/;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(APP);
    await c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']).catch(() => {});
    const l = await caches.open(LIB);
    await Promise.all(LIBS.map(u => l.match(u).then(m => m || fetch(u, {mode:'cors'}).then(r => r.ok && l.put(u, r))).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('rc-app-') && k !== APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

let contando = 0;
async function aparar(){
  if (++contando % 200) return;
  const c = await caches.open(MAPAS), ks = await c.keys();
  if (ks.length > MAX) for (const k of ks.slice(0, ks.length - MAX)) await c.delete(k);
}
async function tile(req){
  const c = await caches.open(MAPAS), m = await c.match(req.url);
  if (m){
    const t = +m.headers.get('x-rc-t') || 0;
    if (Date.now() - t < VALIDADE || !navigator.onLine) return m;
  }
  try {
    const r = await fetch(req.url, {mode:'cors', credentials:'omit'});
    if (r.ok){
      const b = await r.blob(), h = new Headers(r.headers); h.set('x-rc-t', String(Date.now()));
      const guardar = new Response(b, {status:200, headers:h});
      c.put(req.url, guardar.clone()).then(aparar).catch(() => {});
      return guardar;
    }
    return m || r;
  } catch(e){
    if (m) return m;
    try { return await fetch(req); } catch(e2){ return new Response('', {status:504}); }
  }
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (TILES.test(u.hostname) && /\/tile\/|\.png$/.test(u.pathname)){ e.respondWith(tile(r)); return; }
  if (r.url.startsWith(FB)){ e.respondWith(caches.open(LIB).then(c => c.match(r.url).then(m => m || fetch(r).then(res => { if (res.ok) c.put(r.url, res.clone()); return res; })))); return; }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(r, {cache:'no-cache'}).then(res => { if (res.ok){ const cp = res.clone(); caches.open(APP).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, {ignoreSearch:true}).then(m => m || caches.match('index.html'))));
});
self.addEventListener('message', e => {
  const d = e.data || {}, porta = e.ports && e.ports[0];
  if (d.tipo === 'mapas-tamanho') caches.open(MAPAS).then(c => c.keys()).then(ks => porta && porta.postMessage({n:ks.length}));
  if (d.tipo === 'mapas-limpar') caches.delete(MAPAS).then(() => porta && porta.postMessage({ok:true}));
});
