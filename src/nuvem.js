"use strict";
/* ================= Nuvem: entrada com Google, controle de acesso da equipe e sincronização =================
   Roda antes do aplicativo. Com o Firebase configurado e a página aberta pelo endereço do app:
   1) pede o login com Google; 2) confere se o e-mail foi liberado pelo administrador; 3) traz os projetos da equipe
   para este aparelho; 4) só então abre o roteiro. Depois disso, cada alteração vai para a nuvem e as alterações
   da equipe chegam sozinhas. Sem internet, tudo continua funcionando com o que ficou guardado no aparelho.
   Aberto como arquivo (cópia de segurança), o roteiro abre direto, sem nuvem. */
(() => {
const CFG = window.RC_FIREBASE || null;
const FBV = 'https://www.gstatic.com/firebasejs/10.14.1/';
const K = {idx:'roteiro-projetos-v1', est:id => 'roteiro-estacoes-v3:' + id, dados:id => 'roteiro-dados:' + id,
  base:id => 'rc-base:' + id, env:'rc-enviados', fenv:'rc-fotos-enviadas', acesso:'rc-acesso', tenv:'rc-trajetos-enviados'};
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const comTempo = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw Object.assign(new Error('tempo'), {code:'tempo'}); })]);
const online = () => navigator.onLine !== false;

const RC = window.RC = {
  ativo:false, user:null, papel:null, nome:'', email:'', estado:'local', pend:0, ouvintes:new Set(),
  on(fn){ this.ouvintes.add(fn); fn(this.status()); return () => this.ouvintes.delete(fn); },
  status(){ return {ativo:this.ativo, estado:this.estado, pend:this.pend, email:this.email, nome:this.nome, papel:this.papel}; },
  avisar(){ const s = this.status(); this.ouvintes.forEach(f => { try { f(s); } catch(e){} }); },
  /* chamados pelo aplicativo */
  sujo(){}, buscarFoto: async () => null, salvarTrajeto(){}, excluirTrajeto(){}, abrirEquipe(){}, sair(){}, aoRemoto:null, aoTrajetos:null, atualizarAgora(){}
};

/* ---------- IndexedDB das fotos e dos trajetos (os mesmos bancos que o aplicativo usa) ---------- */
function idb(nome, loja){
  let p = null;
  const abrir = () => p || (p = new Promise((ok, no) => { const r = indexedDB.open(nome, 1); r.onupgradeneeded = () => r.result.createObjectStore(loja); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
  const op = async (modo, fn) => { const d = await abrir(); return new Promise((ok, no) => { const t = d.transaction(loja, modo), st = t.objectStore(loja), r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); };
  return {get:k => op('readonly', s => s.get(k)), put:(k, v) => op('readwrite', s => s.put(v, k)), del:k => op('readwrite', s => s.delete(k)),
    chaves:() => op('readonly', s => s.getAllKeys()), todos:() => op('readonly', s => s.getAll()), limpar:() => op('readwrite', s => s.clear())};
}
const FOT = idb('roteiro-fotos', 'f'), TRJ = idb('roteiro-trajetos', 't');
RC.trj = TRJ;

/* ---------- mesclagem: cada estação e cada registro (hospedagem, parada, gasto) fica com a versão alterada por
   último (carimbo _t gravado pelo app a cada alteração); fotos de uma mesma estação se somam; exclusões valem. ---------- */
const J = v => JSON.stringify(v === undefined ? null : v);
const CAMPOS_PARADA = ['visita', 'extra', 'nota', 'feito', 'fts', 'relato', 'sit', 'fixo', 'fotos', '_t'];
function mesclar(loc, rem){
  const locNovo = (loc.mod || 0) >= (rem.mod || 0);
  const est = JSON.parse(JSON.stringify(locNovo ? loc : rem));
  const fEx = {...(rem.fotosEx || {}), ...(loc.fotosEx || {})}, aEx = {...(rem.apoiosEx || {}), ...(loc.apoiosEx || {})};
  Object.entries(rem.fotosEx || {}).forEach(([k, t]) => { fEx[k] = Math.max(fEx[k] || 0, t); });
  Object.entries(rem.apoiosEx || {}).forEach(([k, t]) => { aEx[k] = Math.max(aEx[k] || 0, t); });
  if (Object.keys(fEx).length) est.fotosEx = fEx; if (Object.keys(aEx).length) est.apoiosEx = aEx;
  const paradas = s => { const m = {}; (s.etapas || []).forEach(e => (e.stops || []).forEach(x => m[x.id] = x)); (s.pool || []).forEach(x => m[x.id] = x); return m; };
  const Lc = paradas(loc), R = paradas(rem), E = paradas(est);
  Object.keys(E).forEach(id => {
    const l = Lc[id], r = R[id], alvo = E[id]; if (!l || !r) return;
    const vence = (l._t || 0) >= (r._t || 0) ? l : r;
    CAMPOS_PARADA.forEach(c => { if (c !== 'fotos') alvo[c] = vence[c] === undefined ? null : JSON.parse(J(vence[c])); });
    const ids = new Set(), fotos = [];
    [...(vence.fotos || []), ...((vence === l ? r : l).fotos || [])].forEach(f => { if (f && f.id && !ids.has(f.id) && !fEx[f.id]){ ids.add(f.id); fotos.push(f); } });
    alvo.fotos = fotos;
  });
  const mapa = l => Object.fromEntries((l || []).map(a => [a.uid, a]));
  const lA = mapa(loc.apoios), rA = mapa(rem.apoios), res = [];
  new Set([...Object.keys(lA), ...Object.keys(rA)]).forEach(u => {
    const l = lA[u], r = rA[u], v = l && r ? ((l._t || 0) >= (r._t || 0) ? l : r) : (l || r);
    if (aEx[u] && aEx[u] >= (v._t || 0)) return;
    res.push(v);
  });
  est.apoios = res;
  return est;
}
RC.mesclar = mesclar;

/* ---------- aplicar no aparelho um projeto vindo da nuvem ---------- */
function idxLer(){ const i = lsGet(K.idx); const r = i && Array.isArray(i.lista) ? i : {atual:null, lista:[]}; r.excluidos = r.excluidos || {}; return r; }
function aplicarRemoto(d, id){
  const IDX = idxLer(); let res = null;
  const loc = lsGet(K.est(id));
  if (d.excluido){
    if (loc && (loc.mod || 0) > (d.mod || 0)) return null;           // alterado aqui depois da exclusão: fica
    if (!IDX.lista.some(p => p.id === id) && IDX.excluidos[id]) return null;
    IDX.lista = IDX.lista.filter(p => p.id !== id); IDX.excluidos[id] = d.mod || Date.now();
    lsDel(K.est(id)); lsDel(K.dados(id)); lsDel(K.base(id));
    if (IDX.atual === id) IDX.atual = IDX.lista[0] ? IDX.lista[0].id : null;
    lsSet(K.idx, IDX); return 'excluido';
  }
  let rem, meta; try { rem = JSON.parse(d.estado); meta = JSON.parse(d.meta); } catch(e){ return null; }
  if (!rem || !meta) return null;
  if (IDX.excluidos[id] && IDX.excluidos[id] >= (rem.mod || 0) && !IDX.lista.some(p => p.id === id)) return null;
  if (d.dados){ const ld = lsGet(K.dados(id)); if (!ld || !loc || (rem.mod || 0) >= (loc.mod || 0)) { try { lsSet(K.dados(id), JSON.parse(d.dados)); } catch(e){} } }
  let sinc = false;
  if (!loc){ lsSet(K.est(id), rem); res = 'novo'; sinc = true; }
  else if ((loc.mod || 0) === (rem.mod || 0)) res = null;
  else {
    const fim = mesclar(loc, rem);
    /* se a junção trouxe algo que a nuvem ainda não tem, ela volta para a nuvem com um carimbo novo */
    const igualRem = J({...fim, mod:0, aba:0}) === J({...rem, mod:0, aba:0});
    fim.mod = igualRem ? rem.mod : Math.max(loc.mod || 0, rem.mod || 0) + 1; sinc = igualRem;
    if (J(fim) !== J(loc)){ lsSet(K.est(id), fim); res = 'atualizado'; }
  }
  const m = IDX.lista.find(p => p.id === id);
  if (!m){ delete IDX.excluidos[id]; IDX.lista.push(meta); res = res || 'novo'; }
  else if ((rem.mod || 0) >= (loc ? loc.mod || 0 : 0) && J(m) !== J(meta)){ Object.assign(m, meta); res = res || 'meta'; }
  lsSet(K.idx, IDX);
  if (sinc){ const env = lsGet(K.env) || {}; env[id] = {mod:rem.mod, h:J(IDX.lista.find(p => p.id === id))}; lsSet(K.env, env); }
  else if (res === 'atualizado') setTimeout(() => RC.sujo(), 0);
  return res;
}

/* ---------- telas de entrada ---------- */
let telaEl = null;
function tela(html){
  if (!telaEl){ telaEl = document.createElement('div'); telaEl.id = 'entrada'; telaEl.dataset.volatil = ''; document.body.appendChild(telaEl); }
  telaEl.innerHTML = `<div class="en-caixa"><div class="en-logo" aria-hidden="true"><svg viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#0B6B45"/><path d="M10 38.5h28" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.5 5.3"/><path d="M24 8c-5.5 0-9.6 4.1-9.6 9.4 0 6.9 9.6 15.1 9.6 15.1s9.6-8.2 9.6-15.1C33.6 12.1 29.5 8 24 8z" fill="#E0A100"/><circle cx="24" cy="17.4" r="3.6" fill="#0B6B45"/><ellipse cx="24" cy="33.6" rx="5" ry="1.4" fill="#000" opacity=".18"/></svg></div>
    <h1>Roteiro de Campo</h1><p class="en-sub">Estações do Igam · Sala de Situação</p>${html}</div>`;
  return telaEl;
}
const fecharTela = () => { if (telaEl){ telaEl.remove(); telaEl = null; } };
const btnSair = '<button type="button" class="en-link" data-en="sair">Entrar com outra conta</button>';

/* ---------- inicia o aplicativo (uma vez) ---------- */
let iniciado = false;
function iniciarApp(){
  if (iniciado) return; iniciado = true; fecharTela();
  const cod = document.getElementById('app-js'); if (!cod) return;
  const s = document.createElement('script'); s.dataset.volatil = ''; s.textContent = cod.textContent; document.body.appendChild(s);
}
RC.iniciarApp = iniciarApp;

/* ---------- sem Firebase (arquivo de cópia ou ainda não configurado): abre direto ---------- */
/* publicado mas ainda sem a configuração do Firebase: não abre sem login */
if (!CFG && /github\.io$/.test(location.hostname)){
  const mostrar = () => tela('<p class="en-msg">O app está sendo configurado. Volte em instantes.</p>');
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrar); else mostrar();
  return;
}
if (!CFG || !/^https?:$/.test(location.protocol)){
  RC.estado = 'local';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciarApp); else iniciarApp();
  return;
}

const carregar = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.dataset.volatil = ''; s.onload = ok; s.onerror = () => no(new Error('script ' + src)); document.head.appendChild(s); });
let fb, auth, db, ref;

async function comecar(){
  tela('<p class="en-msg">Abrindo…</p>');
  try { for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await carregar(FBV + f); }
  catch(e){
    /* sem internet e sem o Firebase guardado: usa o acesso já confirmado neste aparelho */
    const a = lsGet(K.acesso);
    if (a && a.ok){ RC.email = a.email; RC.nome = a.nome; RC.papel = a.papel; RC.estado = 'offline'; iniciarApp(); avisarOffline(); return; }
    tela('<p class="en-msg erro">Sem internet. Conecte uma vez para entrar; depois o app funciona sem sinal.</p><button type="button" class="en-bt" data-en="recarregar">Tentar de novo</button>');
    return;
  }
  fb = window.firebase; fb.initializeApp(CFG); auth = fb.auth(); db = fb.firestore();
  try { await db.enablePersistence({synchronizeTabs:true}); } catch(e){}
  ref = {
    projetos: db.collection('equipe').doc('roteiro').collection('projetos'),
    fotos: db.collection('equipe').doc('roteiro').collection('fotos'),
    partes: db.collection('equipe').doc('roteiro').collection('fotoPartes'),
    trajetos: db.collection('equipe').doc('roteiro').collection('trajetos'),
    acesso: db.collection('acesso'), pedidos: db.collection('pedidos')
  };
  const prov = new fb.auth.GoogleAuthProvider(); prov.setCustomParameters({prompt:'select_account'});
  auth.getRedirectResult().catch(() => {});
  /* volta do login feito no navegador (aplicativo Android): entra com o token do Google */
  window.appLoginToken = tk => { auth.signInWithCredential(fb.auth.GoogleAuthProvider.credential(tk)).catch(e => { const el = document.getElementById('enErro'); if (el) el.textContent = 'Não foi possível entrar: ' + (e.message || e.code); }); return true; };
  let primeiro = true;
  auth.onAuthStateChanged(async u => {
    if (!u){
      if (iniciado){ location.reload(); return; }
      const t = tela(`<p class="en-msg">Entre com a sua conta Google. O acesso é liberado pelo administrador da equipe.</p>
        <button type="button" class="en-bt" data-en="google"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Entrar com Google</button><p class="en-msg erro" id="enErro"></p>`);
      t.querySelector('[data-en=google]').onclick = async () => {
        t.querySelector('#enErro').textContent = '';
        /* no aplicativo Android o Google não deixa entrar por dentro do app: o login abre no navegador e volta */
        if (window.AndroidApp && typeof window.AndroidApp.loginGoogle === 'function'){
          window.AndroidApp.loginGoogle();
          t.querySelector('#enErro').innerHTML = '<span style="color:#17231F">Abrimos o navegador. Entre com o Google e toque em <b>Voltar ao app</b>.</span>';
          return;
        }
        try { await auth.signInWithPopup(prov); }
        catch(e){ if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')){ try { await auth.signInWithRedirect(prov); } catch(_){} }
          else if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') t.querySelector('#enErro').textContent = 'Não foi possível entrar: ' + (e.message || e.code); }
      };
      return;
    }
    if (!primeiro){ if (RC.user && RC.user.uid !== u.uid) location.reload(); return; }
    primeiro = false; RC.user = u; RC.email = (u.email || '').toLowerCase(); RC.nome = u.displayName || RC.email;
    const cache = lsGet(K.acesso);
    if (cache && cache.uid && cache.uid !== u.uid) limparAparelho(false);   // outra pessoa entrou neste aparelho
    await verificarAcesso();
  });
}

/* ---------- acesso ---------- */
async function lerFicha(){
  const r = ref.acesso.doc(RC.email);
  if (!online()) return await r.get({source:'cache'});
  try { return await comTempo(r.get(), 9000); }
  catch(e){ if (e && e.code === 'permission-denied') throw e; return await r.get({source:'cache'}); }
}
async function verificarAcesso(){
  tela(`<p class="en-msg">Conferindo o acesso de <b>${esc(RC.email)}</b>…</p>`);
  let ficha = null, erro = null;
  try { const d = await lerFicha(); ficha = d.exists ? d.data() : null; }
  catch(e){ erro = e; }
  if (!ficha && !erro){
    /* primeiro acesso do dono: as regras só deixam o próprio dono se registrar como administrador */
    try { await comTempo(ref.acesso.doc(RC.email).set({papel:'admin', ativo:true, nome:RC.nome, desde:fb.firestore.FieldValue.serverTimestamp(), por:RC.email}), 9000);
      ficha = {papel:'admin', ativo:true}; } catch(e){}
    /* e-mails do domínio liberado nas regras entram sozinhos como equipe (e aparecem na lista para o administrador) */
    if (!ficha) try { await comTempo(ref.acesso.doc(RC.email).set({papel:'equipe', ativo:true, nome:RC.nome, desde:fb.firestore.FieldValue.serverTimestamp(), por:'dominio'}), 9000);
      ficha = {papel:'equipe', ativo:true}; } catch(e){}
  }
  if (!ficha && erro && erro.code !== 'permission-denied'){
    const a = lsGet(K.acesso);
    if (a && a.ok && a.uid === RC.user.uid){ RC.papel = a.papel; return entrar(true); }
    tela(`<p class="en-msg erro">Não foi possível conferir o acesso (${esc(erro.code || erro.message || 'sem internet')}). Conecte à internet e tente de novo.</p><button type="button" class="en-bt" data-en="recarregar">Tentar de novo</button>${btnSair}`);
    return;
  }
  if (!ficha || ficha.ativo !== true){
    lsDel(K.acesso);
    const bloqueado = ficha && ficha.ativo === false;
    if (!bloqueado) try { await ref.pedidos.doc(RC.email).set({email:RC.email, nome:RC.nome, t:fb.firestore.FieldValue.serverTimestamp()}); } catch(e){}
    tela(bloqueado
      ? `<p class="en-msg erro">O acesso de <b>${esc(RC.email)}</b> está bloqueado. Fale com o administrador da equipe.</p>${btnSair}`
      : `<p class="en-msg">Olá, <b>${esc(RC.nome)}</b>. Seu pedido de acesso foi enviado ao administrador.</p><p class="en-msg">Assim que ele liberar o e-mail <b>${esc(RC.email)}</b>, toque em "Verificar de novo".</p>
         <button type="button" class="en-bt" data-en="verificar">Verificar de novo</button>${btnSair}`);
    return;
  }
  RC.papel = (ficha.papel === 'admin' ? 'admin' : ficha.papel === 'coord' ? 'coord' : 'equipe');
  lsSet(K.acesso, {ok:true, uid:RC.user.uid, email:RC.email, nome:RC.nome, papel:RC.papel, t:Date.now()});
  entrar(false);
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('#entrada [data-en]'); if (!b) return;
  const a = b.dataset.en;
  if (a === 'recarregar') location.reload();
  else if (a === 'verificar') verificarAcesso();
  else if (a === 'sair') sair(false);
});

/* ---------- entrada: traz os dados e abre o app ---------- */
/* Cada pessoa tem o próprio espaço: contas/{email}. Administrador pode abrir o de outra pessoa só para ver (rc-ver). */
async function apontarConta(){
  const ver = lsGet('rc-ver'), dono = ver && (RC.papel === 'admin' || RC.papel === 'coord') && ver !== RC.email ? ver : RC.email;
  RC.verNome = (lsGet('rc-ver-nome') || {})[dono] || dono;
  RC.dono = dono; RC.leitura = dono !== RC.email;
  const base = db.collection('contas').doc(dono);
  /* nome e foto do Google de cada conta, para quem estiver vendo os dados saber de quem são */
  if (!RC.leitura && online() && RC.user) base.set({nome:RC.nome || dono, foto:RC.user.photoURL || '', t:fb.firestore.FieldValue.serverTimestamp()}, {merge:true}).catch(() => {});
  let perfil = {};
  if (RC.leitura) try { const d = await comTempo(base.get(), 6000); if (d.exists) perfil = d.data() || {}; } catch(e){}
  if (perfil.nome) RC.verNome = perfil.nome;
  ref.projetos = base.collection('projetos'); ref.trajetos = base.collection('trajetos');
  /* aparelho trocou de conta: tira os roteiros da conta anterior deste aparelho para não misturar */
  const ant = lsGet('rc-conta');
  if (ant && ant !== dono){
    try { Object.keys(localStorage).filter(k => /^(roteiro-|rc-base:|rc-enviados|rc-trajetos-enviados)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch(e){}
    try { await TRJ.limpar(); } catch(e){} try { indexedDB.deleteDatabase('roteiro-rotas'); } catch(e){}
  }
  lsSet('rc-conta', dono);
  document.documentElement.classList.toggle('rc-leitura', RC.leitura);
  if (RC.leitura){ const b = document.createElement('div'); b.id = 'rcLeitura';
    const ini = (RC.verNome || dono).trim().charAt(0).toUpperCase();
    b.innerHTML = `<span class="rl-av">${perfil.foto ? `<img src="${esc(perfil.foto)}" alt="" referrerpolicy="no-referrer">` : ''}<i>${esc(ini)}</i></span><div><small>Você está vendo os dados de</small><b>${esc(RC.verNome)}</b></div><button type="button">Voltar aos meus</button>`;
    const im = b.querySelector('img'); if (im) im.onerror = () => im.remove();
    b.querySelector('button').onclick = () => { lsDel('rc-ver'); location.reload(); }; document.body.appendChild(b); }
  /* primeira vez com contas separadas: traz para a conta da pessoa os roteiros e as rotas dela que estavam no espaço comum */
  if (!RC.leitura && online()) try { await comTempo(migrar(dono), 25000); } catch(e){ if (e && e.code === 'permission-denied') RC.semRegras = true; }
}
async function migrar(dono){
  {
    const meu = await comTempo(ref.projetos.limit(1).get(), 9000);
    if (meu.empty && !lsGet('rc-migrou:' + dono)){
      const ant2 = db.collection('equipe').doc('roteiro');
      const ps = await comTempo(ant2.collection('projetos').get(), 15000);
      ps.docs.forEach(d => { ref.projetos.doc(d.id).set(d.data()).catch(erroNuvem); });
      ps.docs.forEach(d => aplicarRemoto(d.data(), d.id));
      const ts = await comTempo(ant2.collection('trajetos').get(), 15000);
      ts.docs.forEach(d => { const x = d.data(); if ((x.por || '').toLowerCase() === dono) ref.trajetos.doc(d.id).set(x).catch(erroNuvem); });
      lsSet('rc-migrou:' + dono, 1);
    }
  }
}
async function entrar(offline){
  RC.ativo = true; RC.estado = offline || !online() ? 'offline' : 'sinc';
  try { await comTempo(apontarConta(), 30000); } catch(e){}
  if (RC.semRegras){ RC.ativo = false; tela('<p class="en-msg erro">O Firebase ainda não aceita o novo formato (contas separadas). O administrador precisa publicar as regras novas do Firestore. Depois, toque em Tentar de novo.</p><button type="button" class="en-bt" data-en="recarregar">Tentar de novo</button>'); return; }
  tela('<p class="en-msg">Trazendo os roteiros da equipe…</p>');
  try {
    let snap;
    try { snap = await comTempo(ref.projetos.get(), offline || !online() ? 1500 : 12000); } catch(e){ if (e && e.code === 'permission-denied') throw e; snap = await ref.projetos.get({source:'cache'}); }
    snap.forEach(d => aplicarRemoto(d.data(), d.id));
  } catch(e){
    if (e && e.code === 'permission-denied'){
      if (window.__rcNegou){ RC.ativo = false; tela('<p class="en-msg erro">O Firebase recusou o acesso aos seus dados. Se você é o administrador, publique as regras novas do Firestore (contas separadas). Depois, toque em Tentar de novo.</p><button type="button" class="en-bt" data-en="recarregar">Tentar de novo</button>'); return; }
      window.__rcNegou = true; RC.ativo = false; lsDel(K.acesso); return verificarAcesso(); }
  }
  iniciarApp();
  ligarSincronizacao();
}

/* ---------- sincronização contínua ---------- */
let timerSujo = null, enviando = false, deNovo = false;
function ligarSincronizacao(){
  RC.sujo = () => { clearTimeout(timerSujo); timerSujo = setTimeout(enviar, 2500); RC.estado = online() ? 'enviando' : 'offline'; RC.avisar(); };
  RC.atualizarAgora = () => { clearTimeout(timerSujo); enviar(); };
  /* projetos da equipe: chegam sozinhos */
  ref.projetos.onSnapshot({includeMetadataChanges:false}, snap => {
    snap.docChanges().forEach(ch => {
      if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) return;
      const d = ch.doc.data(), r = aplicarRemoto(d, ch.doc.id);
      if (r && RC.aoRemoto) try { RC.aoRemoto(ch.doc.id, r, d.nome || d.por || 'outra pessoa'); } catch(e){ console.error(e); }
    });
    if (!snap.metadata.fromCache && RC.estado !== 'enviando'){ RC.estado = 'ok'; RC.avisar(); }
  }, e => erroNuvem(e));
  /* trajetos gravados pela equipe */
  ref.trajetos.onSnapshot(async snap => {
    let mudou = false;
    for (const ch of snap.docChanges()){
      if (ch.doc.metadata.hasPendingWrites) continue;
      const d = ch.doc.data(), id = ch.doc.id, loc = await TRJ.get(id).catch(() => null);
      if (d.excluido){ if (loc && !loc.excluido){ await TRJ.put(id, {...loc, excluido:true, pts:[], mod:d.mod}); mudou = true; } continue; }
      if (loc && (loc.mod || 0) >= (d.mod || 0)) continue;
      let pts = []; try { pts = decodificar(d.pts); } catch(e){}
      let lac = []; try { lac = JSON.parse(d.lac || '[]'); } catch(e){}
      await TRJ.put(id, {id, pid:d.pid, etapa:d.etapa || null, inicio:d.inicio, fim:d.fim, km:d.km, seg:d.seg, por:d.por, nome:d.nomePor || d.por, mod:d.mod, pts, lac, importado:!!d.importado, titulo:d.titulo || '', de:d.de || '', ate:d.ate || '', nuvem:true}); mudou = true;
      const e = lsGet(K.tenv) || {}; e[id] = d.mod; lsSet(K.tenv, e);
    }
    if (mudou && RC.aoTrajetos) try { RC.aoTrajetos(); } catch(e){}
  }, e => erroNuvem(e));
  /* se o administrador bloquear este e-mail, o acesso termina neste aparelho */
  ref.acesso.doc(RC.email).onSnapshot(d => {
    if (d.metadata.fromCache) return;
    const f = d.exists ? d.data() : null;
    if (!f || f.ativo !== true){ limparAparelho(true).then(() => location.reload()); }
    else { const p = f.papel === 'admin' ? 'admin' : f.papel === 'coord' ? 'coord' : 'equipe'; if (p !== RC.papel){ RC.papel = p; const a = lsGet(K.acesso); if (a){ a.papel = p; lsSet(K.acesso, a); } RC.avisar(); } }
  }, e => { if (e && e.code === 'permission-denied') limparAparelho(true).then(() => location.reload()); });
  window.addEventListener('online', () => { RC.estado = 'enviando'; RC.avisar(); enviar(); });
  window.addEventListener('offline', () => { RC.estado = 'offline'; RC.avisar(); });
  setInterval(() => { if (online()) enviar(); }, 60000);
  setTimeout(enviar, 1500);
}
function erroNuvem(e){
  console.error(e);
  if (e && e.code === 'permission-denied'){ RC.estado = 'erro'; RC.erro = 'Sem permissão no banco de dados. Confira as Regras do Firestore.'; }
  else if (e && (e.code === 'failed-precondition' || e.code === 'not-found')){ RC.estado = 'erro'; RC.erro = 'Banco de dados não encontrado. Confira se o Firestore foi criado com o ID (default).'; }
  else { RC.estado = 'erro'; RC.erro = 'Não foi possível sincronizar (' + ((e && (e.code || e.message)) || 'erro') + ').'; }
  RC.avisar();
}

const hashMeta = m => J(m);
async function enviar(){
  if (!RC.ativo || !ref || RC.leitura) return;
  if (enviando){ deNovo = true; return; }
  enviando = true;
  try {
    const IDX = idxLer(), env = lsGet(K.env) || {}, quem = {por:RC.email, nome:RC.nome};
    let pend = 0;
    for (const p of IDX.lista){
      const est = lsGet(K.est(p.id)); if (!est) continue;
      const e = env[p.id] || {};
      if (e.mod === est.mod && e.h === hashMeta(p)) continue;
      const dados = p.tipo === 'proprio' ? lsGet(K.dados(p.id)) : null;
      const doc = {meta:J(p), estado:J(est), dados: dados ? J(dados) : null, mod:est.mod || Date.now(), excluido:false, ...quem, t:fb.firestore.FieldValue.serverTimestamp()};
      if (doc.estado.length + (doc.dados || '').length > 950000){ RC.erro = `O projeto "${p.nome}" ficou grande demais para a nuvem.`; continue; }
      ref.projetos.doc(p.id).set(doc).catch(erroNuvem);         // fica na fila do aparelho se estiver sem internet
      env[p.id] = {mod:est.mod, h:hashMeta(p)}; pend++;
    }
    for (const [id, t] of Object.entries(IDX.excluidos)){
      if (IDX.lista.some(p => p.id === id)) continue;
      if (env[id] && env[id].ex === t) continue;
      ref.projetos.doc(id).set({excluido:true, mod:t, ...quem, t:fb.firestore.FieldValue.serverTimestamp()}).catch(erroNuvem);
      env[id] = {ex:t}; pend++;
    }
    lsSet(K.env, env);
    await enviarFotos(IDX);
    await enviarTrajetos();
    RC.estado = online() ? 'enviando' : 'offline'; RC.avisar();
    if (online()) { try { await comTempo(db.waitForPendingWrites(), 60000); RC.estado = 'ok'; RC.erro = null; } catch(e){} }
    RC.avisar();
  } catch(e){ erroNuvem(e); }
  finally { enviando = false; if (deNovo){ deNovo = false; setTimeout(enviar, 500); } }
}

/* ---------- fotos: cada foto vai em partes de até 900 mil caracteres ---------- */
const PARTE = 900000;
function idsFotos(IDX){
  const r = []; IDX.lista.forEach(p => { const s = lsGet(K.est(p.id)); if (!s) return;
    [...(s.etapas || []).flatMap(e => e.stops || []), ...(s.pool || [])].forEach(x => (x.fotos || []).forEach(f => f && f.id && r.push([f.id, p.id]))); });
  return r;
}
async function enviarFotos(IDX){
  const env = lsGet(K.fenv) || {};
  for (const [id, pid] of idsFotos(IDX)){
    if (env[id]) continue;
    const u = await FOT.get(id).catch(() => null); if (!u) continue;
    const n = Math.ceil(u.length / PARTE), lote = db.batch();
    for (let k = 0; k < n; k++) lote.set(ref.partes.doc(`${id}_${k}`), {d: u.slice(k * PARTE, (k + 1) * PARTE)});
    lote.set(ref.fotos.doc(id), {n, pid, tam:u.length, por:RC.email, t:fb.firestore.FieldValue.serverTimestamp()});
    lote.commit().catch(erroNuvem);
    env[id] = 1; lsSet(K.fenv, env);
  }
}
const buscando = {};
RC.buscarFoto = id => buscando[id] || (buscando[id] = (async () => {
  if (!ref) return null;
  try {
    const m = await ref.fotos.doc(id).get(); if (!m.exists) return null;
    const n = m.data().n || 1, partes = await Promise.all([...Array(n)].map((_, k) => ref.partes.doc(`${id}_${k}`).get()));
    if (partes.some(p => !p.exists)) return null;
    const u = partes.map(p => p.data().d).join('');
    await FOT.put(id, u).catch(() => {}); const env = lsGet(K.fenv) || {}; env[id] = 1; lsSet(K.fenv, env);
    return u;
  } catch(e){ return null; } finally { delete buscando[id]; }
})());
/* baixa em segundo plano as fotos do projeto aberto que ainda não estão no aparelho */
RC.baixarFotos = async ids => { for (const id of ids){ const t = await FOT.get(id).catch(() => null); if (!t) await RC.buscarFoto(id); } };

/* ---------- trajetos (rotas percorridas) ---------- */
function codificar(pts){
  let a = 0, b = 0, c = 0; const out = [];
  pts.forEach(p => { const x = Math.round(p[0] * 1e5), y = Math.round(p[1] * 1e5), t = Math.round(p[2] || 0); out.push(x - a, y - b, t - c); a = x; b = y; c = t; });
  return out.join(',');
}
function decodificar(s){
  if (!s) return []; const v = s.split(',').map(Number), pts = []; let a = 0, b = 0, c = 0;
  for (let i = 0; i + 2 < v.length; i += 3){ a += v[i]; b += v[i+1]; c += v[i+2]; pts.push([a / 1e5, b / 1e5, c]); }
  return pts;
}
RC.codificar = codificar; RC.decodificar = decodificar;
async function enviarTrajetos(){
  if (RC.leitura) return;
  const env = lsGet(K.tenv) || {}, todos = await TRJ.todos().catch(() => []);
  for (const t of todos){
    if (!t || !t.id || t.gravando) continue;
    if (env[t.id] === t.mod) continue;
    const doc = t.excluido ? {excluido:true, mod:t.mod, por:RC.email} :
      {pid:t.pid, etapa:t.etapa || null, inicio:t.inicio, fim:t.fim, km:t.km, seg:t.seg, por:t.por || RC.email, nomePor:t.nome || RC.nome, mod:t.mod, n:(t.pts || []).length, pts:codificar(t.pts || []), lac:J(t.lac || []), importado:!!t.importado, titulo:t.titulo || '', de:t.de || '', ate:t.ate || '', excluido:false};
    if (doc.pts && doc.pts.length > 980000) continue;
    ref.trajetos.doc(t.id).set(doc).catch(erroNuvem);
    env[t.id] = t.mod; lsSet(K.tenv, env);
  }
}

/* ---------- sair e limpar o aparelho ---------- */
async function limparAparelho(bloqueio){
  try { Object.keys(localStorage).filter(k => /^(roteiro-|rc-)/.test(k)).forEach(k => localStorage.removeItem(k)); } catch(e){}
  try { await FOT.limpar(); } catch(e){} try { await TRJ.limpar(); } catch(e){}
  for (const n of ['roteiro-rotas', 'roteiro-arquivo']) try { indexedDB.deleteDatabase(n); } catch(e){}
  if (bloqueio && db) try { await db.terminate(); await db.clearPersistence(); } catch(e){}
}
async function sair(limpar){
  if (limpar){ await limparAparelho(false); if (db) try { await db.terminate(); await db.clearPersistence(); } catch(e){} }
  try { await auth.signOut(); } catch(e){}
  location.reload();
}
RC.sair = async () => {
  if (!RC.ativo) return;
  let pend = false; try { pend = !(await comTempo(db.waitForPendingWrites().then(() => true), 4000)); } catch(e){ pend = true; }
  const msg = pend ? 'Ainda há alterações que não chegaram à nuvem (sem internet?). Se sair agora, elas serão perdidas.\n\nSair mesmo assim e apagar os dados deste aparelho?'
                   : 'Sair da conta neste aparelho? Os roteiros ficam guardados na nuvem e os dados deste aparelho serão apagados.';
  if (window.confirm(msg)) sair(true);
};

/* ---------- equipe e acesso (só administradores) ---------- */
RC.abrirEquipe = async (corpo) => {
  const adm = RC.papel === 'admin';
  if (!ref || !(adm || RC.papel === 'coord')){ corpo.innerHTML = '<p class="dica">Só o administrador e os coordenadores veem a equipe.</p>'; return; }
  corpo.innerHTML = '<p class="dica">Carregando…</p>';
  let ac = [], pe = [];
  try { const [a, p] = await Promise.all([ref.acesso.get(), adm ? ref.pedidos.get() : Promise.resolve([])]); a.forEach(d => ac.push({id:d.id, ...d.data()})); p.forEach(d => pe.push({id:d.id, ...d.data()})); }
  catch(e){ corpo.innerHTML = `<p class="dica erro">Não foi possível carregar a equipe (${esc(e.code || e.message)}).</p>`; return; }
  pe = pe.filter(p => !ac.some(a => a.id === p.id && a.ativo));
  if (adm) for (const a of ac) if (a.papel === 'admin' && a.id !== RC.email){ try { await ref.acesso.doc(a.id).update({papel:'coord', por:RC.email}); a.papel = 'coord'; } catch(e){} }
  const nomeDe = x => x.nome && x.nome !== x.id ? `<b>${esc(x.nome)}</b><span>${esc(x.id)}</span>` : `<b>${esc(x.id)}</b>`;
  corpo.innerHTML = `
    ${pe.length ? `<h3 class="eq-t">Pedidos de acesso <span class="eq-n">${pe.length}</span></h3><div class="eq-lista">${pe.map(p => `<div class="eq-it">${nomeDe(p)}<div class="eq-bt"><button type="button" class="btn primario" data-eq="liberar" data-id="${esc(p.id)}">Liberar</button><button type="button" class="btn" data-eq="recusar" data-id="${esc(p.id)}">Recusar</button></div></div>`).join('')}</div>` : ''}
    <h3 class="eq-t">Equipe liberada</h3>
    <div class="eq-lista">${ac.sort((a, b) => (b.ativo - a.ativo) || a.id.localeCompare(b.id)).map(a => `<div class="eq-it${a.ativo ? '' : ' off'}">${nomeDe(a)}
      <span class="eq-tag ${a.papel === 'admin' ? 'adm' : a.papel === 'coord' ? 'coord' : ''}">${a.papel === 'admin' ? 'Administrador' : a.papel === 'coord' ? 'Coordenador' : 'Equipe'}${a.ativo ? '' : ' · bloqueado'}</span>
      ${a.id === RC.email ? '<span class="eq-voce">você</span>' : `<div class="eq-bt">
        <button type="button" class="btn primario" data-eq="ver" data-id="${esc(a.id)}" data-nome="${esc(a.nome || a.id)}">Ver dados</button>
        ${adm && a.papel !== 'admin' ? `<button type="button" class="btn" data-eq="${a.ativo ? 'bloquear' : 'desbloquear'}" data-id="${esc(a.id)}">${a.ativo ? 'Bloquear' : 'Desbloquear'}</button>
        <button type="button" class="btn" data-eq="papel" data-id="${esc(a.id)}" data-p="${a.papel === 'coord' ? 'equipe' : 'coord'}">${a.papel === 'coord' ? 'Tirar de coordenador' : 'Tornar coordenador'}</button>
        <button type="button" class="btn perigo" data-eq="remover" data-id="${esc(a.id)}">Remover</button>` : ''}</div>`}</div>`).join('')}</div>
    ${adm ? '' : '<p class="dica">Como coordenador, você vê os dados de cada pessoa, sem alterar. Liberar, bloquear e mudar funções é só com o administrador.</p>'}
    <form class="eq-add" data-eq-form ${adm ? '' : 'hidden'}><label class="f">Liberar outro e-mail<input type="email" required placeholder="nome@gmail.com" autocomplete="off"></label><button type="submit" class="btn primario">Liberar</button></form>
    <p class="dica" ${adm ? '' : 'hidden'}>Quem for bloqueado ou removido perde o acesso na hora: os roteiros são apagados do aparelho dessa pessoa assim que ele se conectar à internet. E-mails do domínio da equipe entram sozinhos; para tirar o acesso de um deles, use Bloquear (se for só removido, ele entra de novo).</p>`;
  corpo.onclick = async ev => {
    const b = ev.target.closest('[data-eq]'); if (!b) return;
    const id = b.dataset.id, a = b.dataset.eq, ts = fb.firestore.FieldValue.serverTimestamp();
    b.disabled = true;
    try {
      if (a === 'liberar'){ const p = pe.find(x => x.id === id) || {}; await ref.acesso.doc(id).set({papel:'equipe', ativo:true, nome:p.nome || id, desde:ts, por:RC.email}); await ref.pedidos.doc(id).delete().catch(() => {}); }
      else if (a === 'recusar'){ if (!confirm(`Recusar o pedido de ${id}?`)) return; await ref.pedidos.doc(id).delete(); }
      else if (a === 'bloquear'){ if (!confirm(`Bloquear ${id}? A pessoa perde o acesso e os roteiros saem do aparelho dela.`)) return; await ref.acesso.doc(id).update({ativo:false, por:RC.email}); }
      else if (a === 'desbloquear') await ref.acesso.doc(id).update({ativo:true, por:RC.email});
      else if (a === 'papel'){ if (!adm) return; if (!confirm(b.dataset.p === 'coord' ? `Tornar ${id} coordenador? Ele poderá ver os dados de todos, sem alterar.` : `Tirar ${id} de coordenador?`)) return; await ref.acesso.doc(id).update({papel:b.dataset.p, por:RC.email}); }
      else if (a === 'ver'){ const n = lsGet('rc-ver-nome') || {}; n[id] = b.dataset.nome || id; lsSet('rc-ver-nome', n); lsSet('rc-ver', id); location.reload(); return; }
      else if (a === 'remover'){ if (!confirm(`Remover ${id} da equipe? A pessoa perde o acesso e os roteiros saem do aparelho dela.`)) return; await ref.acesso.doc(id).delete(); }
      RC.abrirEquipe(corpo);
    } catch(e){ alert('Não foi possível: ' + (e.code || e.message)); } finally { b.disabled = false; }
  };
  corpo.querySelector('[data-eq-form]').onsubmit = async ev => {
    ev.preventDefault(); const inp = ev.target.querySelector('input'), id = inp.value.trim().toLowerCase(); if (!id) return;
    try { await ref.acesso.doc(id).set({papel:'equipe', ativo:true, nome:id, desde:fb.firestore.FieldValue.serverTimestamp(), por:RC.email}); await ref.pedidos.doc(id).delete().catch(() => {}); RC.abrirEquipe(corpo); }
    catch(e){ alert('Não foi possível liberar: ' + (e.code || e.message)); }
  };
};
RC.contarPedidos = async () => { if (!ref || RC.papel !== 'admin') return 0; try { const p = await ref.pedidos.get(); return p.size; } catch(e){ return 0; } };

function avisarOffline(){ RC.ativo = false; RC.estado = 'offline'; RC.avisar(); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar); else comecar();
})();
