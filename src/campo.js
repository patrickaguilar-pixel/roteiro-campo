
/* =====================================================================================================
   APLICATIVO: barra de navegação (celular), telas Em campo / Registros / Menu, gravação das rotas
   percorridas e ligação com a nuvem da equipe (RC, definido antes do app).
   ===================================================================================================== */
const NUV = window.RC || {ativo:false, on(){ return () => {}; }, status(){ return {}; }, sujo(){}};
const EM_NUVEM = !!NUV.ativo;
const CELULAR = matchMedia('(max-width:760px)').matches;
/* passar de celular para tela grande (ou o contrário) troca a interface inteira */
matchMedia('(max-width:760px)').addEventListener('change', ev => { if (ev.matches !== CELULAR && !GRV.t) location.reload(); });
document.documentElement.classList.add('pwa');
const ICO = {
  lapis:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  mapa:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  roteiro:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.3"/><circle cx="3.5" cy="12" r="1.3"/><circle cx="3.5" cy="18" r="1.3"/>',
  campo:'<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
  registros:'<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  gps:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  nav:'<path d="M3 11 21 3l-8 18-2-8z"/>', foto:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  nota:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', ok:'<path d="M5 12.5 10 17 19 7"/>', alvo:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  nuvem:'<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z"/>', sair:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  equipe:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
  pasta:'<path d="M3 6h6l2 2h10v11H3z"/>', rel:'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M8 13h8M8 17h5"/>', baixar:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  offline:'<path d="M3 3l18 18M8.5 8.5A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9h10"/><path d="M13 6.2A6 6 0 0 1 17.5 10a4 4 0 0 1 2.4 6.6"/>', lixo:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  posto:'<path d="M3 22h12M4 9h10M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8L18 5"/>',
  cama:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>', moeda:'<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.1-1.6M12 6.5v11"/>'
};
const svgI = (k, cls = '') => `<svg class="ic-ui ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
const fmtDur = s => { const m = Math.round((s || 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${pad2(m % 60)}`; };
const fmtDataHora = iso => { const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}); };
const fmtHoraISO = iso => { const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); };

/* ---------------- estrutura: barra inferior e tela das abas ---------------- */
const navEl = document.createElement('nav'); navEl.id = 'navApp'; navEl.setAttribute('aria-label', 'Seções do aplicativo');
const ABAS_APP = [['mapa', 'Mapa'], ['roteiro', 'Roteiro'], ['campo', 'Em campo'], ['registros', 'Registros'], ['menu', 'Menu']];
navEl.innerHTML = ABAS_APP.map(([k, t]) => `<button type="button" data-nav="${k}" aria-pressed="false">${svgI(k)}<span>${t}</span>${k === 'campo' ? '<i class="nav-rec" hidden></i>' : ''}${k === 'menu' ? '<i class="nav-dot" hidden></i>' : ''}</button>`).join('');
const telaEl = document.createElement('section'); telaEl.id = 'tela'; telaEl.hidden = true; telaEl.setAttribute('aria-live', 'polite');
telaEl.innerHTML = '<div class="tela-alca" aria-hidden="true"><span></span></div><div class="tela-corpo" id="telaCorpo"></div>';
const appEl = document.querySelector('.app');
appEl.prepend(navEl); appEl.appendChild(telaEl);
const telaCorpo = telaEl.querySelector('#telaCorpo');
let abaApp = 'roteiro';
function irAba(k){
  if (k === 'mapa' && !mobile()) k = 'roteiro';
  abaApp = k;
  navEl.querySelectorAll('[data-nav]').forEach(b => b.setAttribute('aria-pressed', b.dataset.nav === k));
  const naTela = ['campo', 'registros', 'menu'].includes(k);
  document.documentElement.dataset.aba = k;
  telaEl.hidden = !naTela; painelEl.classList.toggle('escondido', naTela);
  if (naTela){ menuSub = k === 'menu' ? menuSub : null; desenharTela(); telaCorpo.scrollTop = 0; }
  if (mobile()){
    if (k === 'mapa') setSheet('mini');
    else if (k === 'roteiro' && sheetEst === 'mini') setSheet('meio');
    else if (naTela) ajustarAlturaTela();
  }
  map.closePopup && map.closePopup();
  setTimeout(() => map.invalidateSize(), 60);
}
navEl.addEventListener('click', ev => { const b = ev.target.closest('[data-nav]'); if (b) irAba(b.dataset.nav); });
function ajustarAlturaTela(){
  if (!mobile() || telaEl.hidden) return;
  const max = Math.round(window.innerHeight * (abaApp === 'campo' ? .62 : .86)) - navH();
  telaEl.style.maxHeight = max + 'px';
  requestAnimationFrame(() => document.documentElement.style.setProperty('--sheet', telaEl.getBoundingClientRect().height + 'px'));
}
const navH = () => mobile() ? navEl.getBoundingClientRect().height : 0;
/* a gaveta do roteiro fica acima da barra */
const _alturaSheet = alturaSheet;
alturaSheet = est => Math.max(60, _alturaSheet(est) - (est === 'mini' ? 0 : navH()));
window.addEventListener('resize', () => { if (!telaEl.hidden) ajustarAlturaTela(); });
const _setSheet = setSheet;
setSheet = est => { _setSheet(est); if (mobile() && !telaEl.hidden) ajustarAlturaTela(); if (mobile() && abaApp !== 'mapa' && abaApp !== 'roteiro') return;
  if (mobile()){ const alvo = est === 'mini' ? 'mapa' : 'roteiro'; if (abaApp !== alvo){ abaApp = alvo; navEl.querySelectorAll('[data-nav]').forEach(b => b.setAttribute('aria-pressed', b.dataset.nav === alvo)); document.documentElement.dataset.aba = alvo; } } };
/* deslizar a tela para baixo pela alça volta ao mapa */
(() => { let y0 = null; const al = telaEl.querySelector('.tela-alca');
  al.addEventListener('touchstart', ev => { y0 = ev.touches[0].clientY; }, {passive:true});
  al.addEventListener('touchend', ev => { if (y0 !== null && ev.changedTouches[0].clientY - y0 > 40) irAba('mapa'); y0 = null; });
  al.addEventListener('click', () => irAba('mapa')); })();

/* ---------------- nuvem: indicador e alterações vindas da equipe ---------------- */
function rotuloNuvem(s){
  if (!EM_NUVEM) return s.estado === 'offline' ? ['off', 'Sem internet · guardado neste aparelho'] : ['loc', 'Guardado neste aparelho'];
  return ({ok:['ok', 'Tudo salvo na nuvem'], enviando:['env', 'Enviando para a nuvem…'], sinc:['env', 'Sincronizando…'], offline:['off', 'Sem internet · guardado no aparelho; envia quando voltar o sinal'], erro:['erro', NUV.erro || 'Erro ao sincronizar']})[s.estado] || ['env', 'Sincronizando…'];
}
const chipNuvem = document.createElement('button'); chipNuvem.type = 'button'; chipNuvem.className = 'chip-nuvem'; chipNuvem.id = 'chipNuvem';
chipNuvem.onclick = () => { if (EM_NUVEM) NUV.atualizarAgora(); irAba('menu'); };
document.querySelector('.status-linha').prepend(chipNuvem);
NUV.on(s => {
  const [cls, txt] = rotuloNuvem(s); chipNuvem.className = 'chip-nuvem ' + cls; chipNuvem.innerHTML = `${svgI('nuvem')}<span>${esc(txt)}</span>`; chipNuvem.title = txt;
  navEl.querySelector('.nav-dot').hidden = !(cls === 'erro' || cls === 'off');
  if (!telaEl.hidden && abaApp === 'menu') desenharTela();
});
if (EM_NUVEM){
  /* o botão Salvar dá lugar ao salvamento automático; a cópia em arquivo continua no Menu */
  document.getElementById('splitSalvar').hidden = true;
  NUV.aoRemoto = (pid, tipo, quem) => {
    const novoIdx = lsGet(KEY_IDX); if (novoIdx){ IDX.lista = novoIdx.lista || IDX.lista; IDX.excluidos = novoIdx.excluidos || IDX.excluidos; }
    NOS_OUTROS = null;
    if (pid === PJ_ID){
      if (tipo === 'excluido'){ toast(`Este projeto foi excluído por ${quem}.`); setTimeout(() => location.reload(), 1800); return; }
      const novo = load(); if (!novo) return;
      const meta = metaDe(PJ_ID); if (meta) document.getElementById('projNome').textContent = meta.nome;
      if (tipo === 'meta') return;
      const abaAntes = state.aba; state = novo; state.aba = abaAntes && (abaAntes === 'geral' || state.etapas.some(e => e.id === abaAntes)) ? abaAntes : state.aba;
      state.auto = null; ANT = indiceTempos(state); syncCfg(); render(); scheduleRoutes();
      toast(`Roteiro atualizado com as alterações de ${quem}.`);
    }
    if (dProj.open) renderProjetos();
  };
  NUV.aoTrajetos = () => carregarTrajetos();
  /* fotos do projeto aberto que ainda não estão neste aparelho: baixa em segundo plano */
  setTimeout(() => { const ids = todasFotos().map(x => x.f.id); if (ids.length && NUV.baixarFotos) NUV.baixarFotos(ids).then(() => { hidratar(document.body); }); }, 4000);
}

/* ---------------- rotas percorridas (gravação pelo GPS) ---------------- */
const TRJDB = NUV.trj || (() => {
  let p = null; const abrir = () => p || (p = new Promise((ok, no) => { const r = indexedDB.open('roteiro-trajetos', 1); r.onupgradeneeded = () => r.result.createObjectStore('t'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
  const op = async (m, fn) => { const d = await abrir(); return new Promise((ok, no) => { const t = d.transaction('t', m), st = t.objectStore('t'), r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); };
  return {get:k => op('readonly', s => s.get(k)), put:(k, v) => op('readwrite', s => s.put(v, k)), del:k => op('readwrite', s => s.delete(k)), todos:() => op('readonly', s => s.getAll())};
})();
const GRV = {t:null, pausa:false, ultimoSalvo:0, camada:L.layerGroup().addTo(map), linha:null, mostrar:true, lista:[]};
try { GRV.mostrar = localStorage.getItem('rc-mostrar-trajetos') !== '0'; } catch(e){}
const COR_TRJ = '#C2410C';
const kmTrecho = (a, b) => havLL([a[0], a[1]], [b[0], b[1]]);
async function preencherLacuna(t, a, b, kmProv, dt){
  let geo = null, km = null;
  try { const r = await fetchT(`${OSRM}/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`, 15000); const j = await r.json();
    if (j.code === 'Ok'){ geo = j.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo]); km = j.routes[0].distance / 1000; } } catch(e){}
  const min = Math.round(dt / 60);
  if (geo && geo.length > 2 && km < kmProv * 3){
    const i = t.pts.indexOf(b); if (i < 1) return;
    const n = geo.length - 1, meio = geo.slice(1, -1).map((p, k) => [+p[0].toFixed(6), +p[1].toFixed(6), Math.round(a[2] + (b[2] - a[2]) * (k + 1) / n)]);
    t.pts.splice(i, 0, ...meio); t.km += km - kmProv;
    toast(`O GPS ficou ${min} min sem registrar (app fora da tela). O trecho de ${num(km, 1)} km foi traçado pela estrada e aparece tracejado.`);
  } else toast(`O GPS ficou ${min} min sem registrar (app fora da tela). O trecho foi estimado em linha reta (${num(kmProv, 1)} km); com internet, prefira deixar o app na tela.`);
  if (GRV.t === t){ desenharTrajetos(); salvarGravacao(true); atualizarGravacaoUI(true); }
}
/* trechos de um trajeto: gravados pelo GPS (linha cheia) e estimados (tracejado) */
function trechosTrj(t){
  const lac = t.lac || [], est = (p, q) => lac.some(([ta, tb]) => ta <= p[2] && q[2] <= tb), out = []; let cur = null;
  for (let i = 1; i < t.pts.length; i++){ const p = t.pts[i - 1], q = t.pts[i], e = est(p, q);
    if (!cur || cur.e !== e){ cur = {e, pts:[[p[0], p[1]]]}; out.push(cur); } cur.pts.push([q[0], q[1]]); }
  return out;
}
async function carregarTrajetos(){
  let todos = []; try { todos = await TRJDB.todos(); } catch(e){}
  GRV.lista = todos.filter(t => t && !t.excluido && t.pid === PJ_ID && (t.pts || []).length > 1).sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
  desenharTrajetos(); if (!telaEl.hidden) desenharTela();
}
function desenharTrajetos(){
  GRV.camada.clearLayers(); GRV.linha = null;
  if (GRV.mostrar) GRV.lista.forEach(t => {
    if (GRV.t && t.id === GRV.t.id) return;
    const pop = () => () => `<div class="pop"><h3>Rota percorrida</h3><p class="sub">${esc(fmtDataHora(t.inicio))} até ${esc(fmtHoraISO(t.fim))}</p><p><b>${num(t.km, 1)} km</b> · ${fmtDur(t.seg)} gravando${t.nome ? ` · ${esc(t.nome)}` : ''}${t.etapa && etapaPorId(t.etapa) ? `<br>${esc(etapaPorId(t.etapa).nome)}` : ''}${(t.lac || []).length ? '<br><small>Tracejado: trecho sem GPS, estimado pela estrada.</small>' : ''}${t.importado ? '<br><small>Importado de arquivo GPX.</small>' : ''}</p></div>`;
    trechosTrj(t).forEach(g => L.polyline(g.pts, {color:COR_TRJ, weight:4, opacity:.85, dashArray: g.e ? '6 7' : null}).addTo(GRV.camada).bindPopup(pop));
  });
  if (GRV.t){ trechosTrj(GRV.t).forEach(g => { if (g.e) L.polyline(g.pts, {color:COR_TRJ, weight:5, opacity:.95, dashArray:'6 7'}).addTo(GRV.camada); });
    const ult = trechosTrj(GRV.t).filter(g => !g.e).pop(), ini = GRV.t.pts.length === 1 ? [[GRV.t.pts[0][0], GRV.t.pts[0][1]]] : [];
    /* a linha "viva" continua do último ponto: os trechos cheios anteriores entram como linhas fixas */
    trechosTrj(GRV.t).filter(g => !g.e && g !== ult).forEach(g => L.polyline(g.pts, {color:COR_TRJ, weight:5, opacity:.95}).addTo(GRV.camada));
    const ultimoE = trechosTrj(GRV.t).slice(-1)[0];
    GRV.linha = L.polyline(ultimoE && !ultimoE.e ? ultimoE.pts : (GRV.t.pts.length ? [[GRV.t.pts.at(-1)[0], GRV.t.pts.at(-1)[1]]] : ini), {color:COR_TRJ, weight:5, opacity:.95}).addTo(GRV.camada); }
}
function infoGravacao(){ const t = GRV.t; return t ? `${num(t.km, t.km < 10 ? 2 : 1)} km · ${fmtDur(t.seg + (GRV.pausa || !t.retomado ? 0 : (Date.now() - t.retomado) / 1000))}` : ''; }
async function salvarGravacao(forcar){
  const t = GRV.t; if (!t) return; const agora = Date.now();
  if (!forcar && agora - GRV.ultimoSalvo < 20000) return;
  GRV.ultimoSalvo = agora;
  const seg = t.seg + (GRV.pausa || !t.retomado ? 0 : (agora - t.retomado) / 1000);
  try { await TRJDB.put(t.id, {...t, seg, retomado:null, mod:agora}); } catch(e){}
}
/* No aplicativo Android, a gravação é feita pelo próprio celular (serviço em segundo plano): continua com a
   tela apagada e sem internet. A página só busca as posições gravadas. */
const NATIVO = (() => { try { return !!(window.AndroidApp && typeof window.AndroidApp.gpsIniciar === 'function'); } catch(e){ return false; } })();
function puxarNativo(){
  const t = GRV.t; if (!NATIVO || !t) return 0;
  let lst = []; try { lst = JSON.parse(window.AndroidApp.gpsPontos(t.nat || 0)) || []; } catch(e){ return 0; }
  lst.forEach(p => addPonto(p[0], p[1], p[2], p[3]));
  t.nat = (t.nat || 0) + lst.length;
  if (lst.length){ salvarGravacao(false); atualizarGravacaoUI(true); }
  return lst.length;
}
if (NATIVO){
  setInterval(() => { if (GRV.t && document.visibilityState === 'visible') puxarNativo(); }, 4000);
  window.appVolta = () => { if (GRV.t) puxarNativo(); };
}
function iniciarGravacao(){
  if (GRV.t){ if (GRV.pausa) continuarGravacao(); return; }
  const e = etapaCampo();
  GRV.t = {id:'t' + Date.now().toString(36) + uid().slice(0, 3), pid:PJ_ID, etapa: e ? e.id : null, inicio:new Date().toISOString(), fim:null, pts:[], km:0, seg:0,
    por:(NUV.email || ''), nome:(NUV.nome || ''), gravando:true, retomado:Date.now(), mod:Date.now()};
  GRV.pausa = false;
  try { localStorage.setItem('rc-gravando', GRV.t.id); } catch(e2){}
  if (NATIVO){ GRV.t.nat = 0; try { window.AndroidApp.gpsIniciar(true); } catch(e3){} }
  if (!GPS.on) gpsLigar();
  salvarGravacao(true); atualizarGravacaoUI();
  toast(NATIVO ? 'Gravando a rota. Pode apagar a tela e guardar o celular: a gravação continua, mesmo sem internet.' : 'Gravando a rota. Deixe o app aberto com a tela ligada (pode ficar no suporte do carro, carregando).');
}
function pausarGravacao(){ const t = GRV.t; if (!t || GRV.pausa) return; if (NATIVO){ puxarNativo(); try { window.AndroidApp.gpsParar(); } catch(e){} } t.seg += (Date.now() - t.retomado) / 1000; t.retomado = null; GRV.pausa = true; salvarGravacao(true); atualizarGravacaoUI(); }
function continuarGravacao(){ const t = GRV.t; if (!t) return; if (NATIVO){ try { window.AndroidApp.gpsIniciar(false); } catch(e){} } GRV.pausa = false; t.retomado = Date.now(); if (!GPS.on) gpsLigar(); atualizarGravacaoUI(); }
/* ---- resumo da rota: onde começou e terminou, tempos e velocidades ---- */
function pontoPerto(lat, lon){
  let best = null, bd = 1e9; const q = [lat, lon];
  for (const id in EST){ const d = havLL(q, ll(id)); if (d < bd){ bd = d; best = id; } }
  const m = munEm(lat, lon), cid = m && MUN[m] ? MUN[m].n : '';
  if (best && bd <= 2) return `${EST[best].nome}${bd > .15 ? ` (a ${fmtDist(bd)})` : ''}${cid && !EST[best].nome.includes(cid) ? ' · ' + cid : ''}`;
  return cid || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}
const RES_TRJ = new WeakMap();
function resumoTrj(t){
  const c = RES_TRJ.get(t); if (c && c.n === t.pts.length) return c;
  const a = t.pts[0], b = t.pts[t.pts.length - 1], lac = t.lac || [];
  let mov = 0, vmax = 0;
  for (let i = 1; i < t.pts.length; i++){
    const u = t.pts[i - 1], q = t.pts[i], dt = q[2] - u[2]; if (dt <= 0) continue;
    if (lac.some(l => l[0] === u[2] && l[1] === q[2])){ mov += dt; continue; }
    if (dt > 120) continue;
    const v = kmTrecho(u, q) / (dt / 3600);
    if (v >= 3){ mov += dt; if (dt >= 4 && v < 180 && v > vmax) vmax = v; }
  }
  mov = Math.min(mov, t.seg || mov);
  const r = {n:t.pts.length, de: t.de || (a ? pontoPerto(a[0], a[1]) : '–'), ate: t.ate || (b ? pontoPerto(b[0], b[1]) : '–'), mov, parado:Math.max(0, (t.seg || 0) - mov), vmed: mov > 60 ? t.km / (mov / 3600) : 0, vmax};
  RES_TRJ.set(t, r); return r;
}
const tituloTrj = t => t.titulo || `${resumoTrj(t).de.split(' (')[0].split(' · ')[0]} → ${resumoTrj(t).ate.split(' (')[0].split(' · ')[0]}`;
/* Janela de encerrar/renomear: mostra os dados da rota e pede um nome (opcional). Devolve o nome, '' (sem nome) ou null (cancelou). */
function pedirNomeTrj(t, novo){
  return new Promise(ok => {
    const r = resumoTrj(t), d = document.createElement('dialog'); d.className = 'dlg-trj';
    const fim = t.fim || new Date().toISOString();
    d.innerHTML = `<form method="dialog"><h2>${novo ? 'Salvar a rota' : 'Dados da rota'}</h2>
      <label class="dt-nome"><span>Nome da rota</span><input name="n" maxlength="80" autocomplete="off" placeholder="${esc(tituloTrj({...t, titulo:''}))}" value="${esc(t.titulo || '')}"></label>
      <p class="dt-dica">Opcional. Os dados abaixo ficam salvos junto, com ou sem nome.</p>
      ${fichaTrj(t, r, fim)}
      <div class="dt-bts"><button type="button" class="btn" value="x">${novo ? 'Continuar gravando' : 'Cancelar'}</button><button class="btn primario" value="ok">${novo ? 'Salvar rota' : 'Salvar'}</button></div></form>`;
    document.body.appendChild(d);
    const fecha = v => { d.close(); d.remove(); ok(v); };
    d.querySelector('[value=x]').onclick = () => fecha(null);
    d.addEventListener('cancel', ev => { ev.preventDefault(); fecha(null); });
    d.querySelector('form').onsubmit = ev => { ev.preventDefault(); fecha(d.querySelector('input').value.trim()); };
    d.showModal();
  });
}
function fichaTrj(t, r, fim){
  const e = t.etapa && etapaPorId(t.etapa), dia = new Date(t.inicio).toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'});
  const L1 = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<dl class="ficha-trj">
    ${L1('Início', `${esc(fmtHoraISO(t.inicio))} · perto de <b>${esc(r.de)}</b>`)}
    ${L1('Fim', `${esc(fmtHoraISO(fim))} · perto de <b>${esc(r.ate)}</b>`)}
    ${L1('Data', esc(dia))}
    ${L1('Distância', `<b>${num(t.km, t.km < 10 ? 2 : 1)} km</b>`)}
    ${L1('Tempo gravando', fmtDur(t.seg))}
    ${L1('Em movimento', `${fmtDur(r.mov)} · parado ${fmtDur(r.parado)}`)}
    ${L1('Velocidade', r.vmed ? `média ${Math.round(r.vmed)} km/h · máxima ${Math.round(r.vmax)} km/h` : '–')}
    ${e ? L1('Etapa', esc(e.nome)) : ''}${t.nome || t.por ? L1('Gravado por', esc(t.nome || t.por)) : ''}
    ${(t.lac || []).length ? L1('Sem GPS', `${t.lac.length} trecho${t.lac.length > 1 ? 's' : ''} completado${t.lac.length > 1 ? 's' : ''} pela estrada (tracejado)`) : ''}</dl>`;
}
async function renomearTrajeto(id){
  const t = GRV.lista.find(x => x.id === id); if (!t) return;
  const n = await pedirNomeTrj(t, false); if (n === null) return;
  t.titulo = n; t.mod = Date.now(); try { await TRJDB.put(t.id, t); } catch(e){} NUV.sujo(); await carregarTrajetos(); toast('Nome da rota salvo.');
}
async function encerrarComNome(){
  const t = GRV.t; if (!t) return false;
  if (NATIVO) puxarNativo();
  const seg = t.seg + (GRV.pausa || !t.retomado ? 0 : (Date.now() - t.retomado) / 1000);
  if (t.pts.length < 2){ if (!window.confirm('O GPS ainda não registrou deslocamento. Encerrar assim mesmo?')) return false; await encerrarGravacao(''); return true; }
  const n = await pedirNomeTrj({...t, seg}, true); if (n === null) return false;
  await encerrarGravacao(n); return true;
}
async function encerrarGravacao(titulo){
  const t = GRV.t; if (!t) return;
  if (NATIVO){ puxarNativo(); try { window.AndroidApp.gpsParar(); window.AndroidApp.gpsLimpar(); } catch(e){} }
  if (titulo) t.titulo = titulo;
  if (t.pts.length > 1){ const a = t.pts[0], b = t.pts[t.pts.length - 1]; t.de = pontoPerto(a[0], a[1]); t.ate = pontoPerto(b[0], b[1]); }
  if (!GRV.pausa) t.seg += (Date.now() - t.retomado) / 1000;
  t.fim = new Date().toISOString(); t.gravando = false; t.retomado = null; t.mod = Date.now();
  GRV.t = null; GRV.pausa = false;
  try { localStorage.removeItem('rc-gravando'); } catch(e){}
  if (t.pts.length < 2){ try { await TRJDB.del(t.id); } catch(e){} toast('Gravação encerrada sem trajeto (o GPS não registrou deslocamento).'); }
  else { try { await TRJDB.put(t.id, t); } catch(e){} toast(`Rota "${tituloTrj(t)}" salva: ${num(t.km, 1)} km em ${fmtDur(t.seg)}. ${EM_NUVEM ? 'Ela vai para a nuvem da equipe.' : 'Guardada neste aparelho.'}`); NUV.sujo(); }
  atualizarGravacaoUI(); await carregarTrajetos();
}
window.__gpsPonto = p => { if (NATIVO) return; addPonto(p.coords.latitude, p.coords.longitude, Date.now(), p.coords.accuracy || 999); };
function addPonto(lat, lon, ms, acc){
  const t = GRV.t; if (!t || (GRV.pausa && !NATIVO)) return;
  if (acc > 60) return;
  const q = [+(+lat).toFixed(6), +(+lon).toFixed(6), Math.round((ms - Date.parse(t.inicio)) / 1000)];
  const u = t.pts[t.pts.length - 1];
  if (u){ const d = kmTrecho(u, q), dt = Math.max(1, q[2] - u[2]);
    if (d < .012) return;                                   // menos de 12 m: parado
    if (d / (dt / 3600) > 180) return;                      // salto impossível (> 180 km/h)
    /* o app ficou sem GPS (tela apagada, Google Maps aberto…): o trecho que faltou é traçado pela estrada */
    if (dt > 60 && d > .25){ t.lac = t.lac || []; t.lac.push([u[2], q[2]]); t.km += d * 1.3; t.pts.push(q); desenharTrajetos(); preencherLacuna(t, u, q, d * 1.3, dt); salvarGravacao(true); atualizarGravacaoUI(true); return; }
    else { t.km += d; t.pts.push(q); } }
  else t.pts.push(q);
  if (GRV.linha) GRV.linha.addLatLng([q[0], q[1]]); else desenharTrajetos();
  /* trajetos muito longos são divididos para caber na nuvem */
  if (t.pts.length >= 40000 && !NATIVO){ encerrarGravacao().then(iniciarGravacao); return; }
  salvarGravacao(false); atualizarGravacaoUI(true);
}
function atualizarGravacaoUI(soTexto){
  navEl.querySelector('.nav-rec').hidden = !GRV.t;
  navEl.querySelector('.nav-rec').classList.toggle('pausa', GRV.pausa);
  document.querySelectorAll('[data-grv-info]').forEach(el => el.textContent = infoGravacao());
  if (soTexto) return;
  if (!telaEl.hidden && abaApp === 'campo') desenharTela();
  if (GPS.box){ let b = GPS.box.querySelector('.gp-grv'); if (!b){ b = document.createElement('div'); b.className = 'gp-grv'; GPS.box.appendChild(b); }
    b.innerHTML = GRV.t ? `<span class="rec${GRV.pausa ? ' pausa' : ''}"></span><b>${GRV.pausa ? 'Gravação pausada' : 'Gravando a rota'}</b> <span data-grv-info>${infoGravacao()}</span>` : '';
    b.hidden = !GRV.t; }
}
setInterval(() => { if (GRV.t && !GRV.pausa) { document.querySelectorAll('[data-grv-info]').forEach(el => el.textContent = infoGravacao()); salvarGravacao(false); } }, 15000);
/* o GPS desligado pausa a gravação */
const _gpsDesligar = gpsDesligar;
gpsDesligar = () => { if (GRV.t && !GRV.pausa && !NATIVO){ pausarGravacao(); toast('GPS desligado: a gravação da rota foi pausada.'); } _gpsDesligar(); if (!telaEl.hidden) desenharTela(); };
const _gpsLigar = gpsLigar;
gpsLigar = () => { _gpsLigar(); if (!telaEl.hidden) desenharTela(); };
/* gravação interrompida (app fechado ou celular reiniciado): retoma como pausada */
(async () => {
  let id = null; try { id = localStorage.getItem('rc-gravando'); } catch(e){}
  if (id){ const t = await TRJDB.get(id).catch(() => null);
    if (t && t.gravando && t.pid === PJ_ID && NATIVO && window.AndroidApp.gpsAtivo()){ GRV.t = {...t, retomado:t.mod || Date.now()}; GRV.pausa = false; puxarNativo(); atualizarGravacaoUI(); }
    else if (t && t.gravando && t.pid === PJ_ID){ GRV.t = {...t, retomado:null}; GRV.pausa = true; atualizarGravacaoUI(); toast('Havia uma gravação de rota em andamento. Ela está pausada: toque em Gravar para continuar ou encerrar.'); }
    else try { localStorage.removeItem('rc-gravando'); } catch(e){} }
  carregarTrajetos();
})();
async function excluirTrajeto(id){
  const t = GRV.lista.find(x => x.id === id); if (!t) return;
  if (!window.confirm(`Excluir a rota gravada em ${fmtDataHora(t.inicio)} (${num(t.km, 1)} km)?${EM_NUVEM ? ' Ela sai também da nuvem da equipe.' : ''}`)) return;
  const copia = {...t};
  try { await TRJDB.put(id, {id, pid:t.pid, excluido:true, mod:Date.now(), pts:[]}); } catch(e){}
  NUV.sujo(); await carregarTrajetos();
  const tt = document.getElementById('toast'); tt.innerHTML = '<span>Rota excluída.</span><button type="button">Desfazer</button>';
  tt.querySelector('button').onclick = async () => { tt.classList.remove('vis'); await TRJDB.put(id, {...copia, mod:Date.now()}); NUV.sujo(); carregarTrajetos(); };
  tt.classList.add('vis'); clearTimeout(toastT); toastT = setTimeout(() => tt.classList.remove('vis'), 6500);
}
const xmlE = s => String(s ?? '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function gpxDe(lista){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Roteiro de Campo" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    lista.map(t => { const t0 = Date.parse(t.inicio);
      return `<trk><name>${xmlE(`${tituloTrj(t)} · ${fmtDataHora(t.inicio)} (${num(t.km, 1)} km)`)}</name><desc>${xmlE([`De ${resumoTrj(t).de} a ${resumoTrj(t).ate}`, t.nome || t.por, t.etapa && etapaPorId(t.etapa) && etapaPorId(t.etapa).nome, num(t.km, 1) + ' km', fmtDur(t.seg)].filter(Boolean).join(' · '))}</desc><trkseg>` +
        t.pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><time>${new Date(t0 + p[2] * 1000).toISOString()}</time></trkpt>`).join('') + '</trkseg></trk>'; }).join('\n') + '\n</gpx>';
}
function kmlDe(lista){
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Rotas percorridas</name><Style id="r"><LineStyle><color>ff0c41c2</color><width>4</width></LineStyle></Style>` +
    lista.map(t => `<Placemark><name>${xmlE(`${tituloTrj(t)} · ${fmtDataHora(t.inicio)}`)}</name><description>${xmlE(`De ${resumoTrj(t).de} a ${resumoTrj(t).ate}. ${num(t.km, 1)} km, ${fmtDur(t.seg)} gravando${t.nome ? ', ' + t.nome : ''}`)}</description><styleUrl>#r</styleUrl><LineString><tessellate>1</tessellate><coordinates>${t.pts.map(p => `${p[1]},${p[0]},0`).join(' ')}</coordinates></LineString></Placemark>`).join('') + '</Document></kml>';
}
function baixarTrajetos(fmt, id){
  const lista = id ? GRV.lista.filter(t => t.id === id) : GRV.lista;
  if (!lista.length){ toast('Nenhuma rota gravada neste projeto.'); return; }
  const nome = `rotas_percorridas_${hojeISO()}${id ? '_' + id : ''}`;
  if (fmt === 'gpx') baixar(nome + '.gpx', gpxDe(lista), 'application/gpx+xml'); else baixar(nome + '.kml', kmlDe(lista), 'application/vnd.google-earth.kml+xml');
}
/* ---- ordem realizada: as visitas na ordem em que o "Cheguei" foi marcado ---- */
function tsVisita(s, e){
  if (!s.feito) return 0; if (s.fts) return s.fts;
  const m = /(\d{2})\/(\d{2}),?\s*(?:às\s*)?(\d{2}):(\d{2})/.exec(s.feito); if (!m) return 0;   // visitas antigas: "19/11, 08:18" (sem ano)
  const ano = e && e.inicio ? +e.inicio.slice(0, 4) : new Date().getFullYear();
  return new Date(ano, +m[2] - 1, +m[1], +m[3], +m[4]).getTime();
}
function ordemRealizada(e){   // e = uma etapa, ou nada para todas
  const L = (e ? [e] : state.etapas).flatMap(et => et.stops.map((s, k) => ({e:et, s, k, t:tsVisita(s, et)}))).filter(x => x.t);
  return L.sort((a, b) => a.t - b.t || a.k - b.k);
}
/* visitadas na ordem do "Cheguei"; as duas estações do mesmo local (F e P, "xxb") andam juntas, na hora da primeira visita do par */
function ordemAlvo(e){
  const grp = id => id.endsWith('b') && EST[id.slice(0, -1)] ? id.slice(0, -1) : id;
  const L = ordemRealizada(e), t0 = {};
  L.forEach(x => { const g = grp(x.s.id); t0[g] = Math.min(t0[g] ?? Infinity, x.t); });
  return L.map(x => x.s).sort((a, b) => t0[grp(a.id)] - t0[grp(b.id)] || (grp(a.id) === grp(b.id) ? (a.id.endsWith('b') ? 1 : -1) : 0));
}
function foraDaOrdem(e){ const alvo = ordemAlvo(e), set = new Set(alvo); return e.stops.filter(s => set.has(s)).some((s, i) => s !== alvo[i]); }
function usarOrdemVisitada(e){
  const vis = ordemAlvo(e); if (!vis.length) return false;
  const set = new Set(vis), resto = e.stops.filter(s => !set.has(s));
  snapshot(); e.stops = [...vis, ...resto]; e.ordem = 'manual'; changed();
  toast(`${e.nome}: ordem trocada pela ordem em que as estações foram visitadas (${vis.length}). As pendentes continuam depois, na ordem que estavam.`, true);
  return true;
}
const fmtTsVisita = t => new Date(t).toLocaleString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}).replace(',', '');
function secaoOrdemRel(){
  const L = ordemRealizada(); if (!L.length) return '';
  return `<h3 class="rel-etapa" style="--c:#2E9E5B">Ordem realizada das visitas<span>${L.length} ${L.length === 1 ? 'visita' : 'visitas'}, na ordem em que o "Cheguei" foi marcado · "No roteiro" é a posição atual na etapa</span></h3>
    <table class="rel"><caption style="--c:#2E9E5B">Visitas na ordem em que aconteceram</caption><thead><tr><th>Nº</th><th>Data e hora</th><th>Estação</th><th>Município</th><th>Etapa</th><th>No roteiro</th><th>Situação</th></tr></thead><tbody>
    ${L.map((x, i) => { const inf = P[x.e.id] && P[x.e.id].info[x.k];
      return `<tr><td class="n">${i + 1}</td><td class="nw">${esc(fmtTsVisita(x.t))}</td><td><b>${esc(EST[x.s.id].nome)}</b></td><td>${esc(estMun(EST[x.s.id]))}</td><td class="nw">${esc(x.e.nome)}</td><td class="nw">nº ${x.k + 1}${inf ? ` · dia ${inf.d + 1}` : ''}</td><td>${x.s.sit ? SITUACOES[x.s.sit] : '–'}</td></tr>`; }).join('')}
    </tbody></table>`;
}
function secaoTrajetosRel(){
  if (!GRV.lista.length) return '';
  const tot = GRV.lista.reduce((a, t) => ({km:a.km + t.km, seg:a.seg + t.seg}), {km:0, seg:0});
  return `<h3 class="rel-etapa" style="--c:${COR_TRJ}">Rotas percorridas<span>gravadas pelo GPS · ${GRV.lista.length} ${GRV.lista.length === 1 ? 'rota' : 'rotas'} · ${num(tot.km, 1)} km · ${fmtDur(tot.seg)}</span></h3>
    <table class="rel"><caption style="--c:${COR_TRJ}">Trajetos registrados em campo</caption><thead><tr><th>Rota</th><th>Data</th><th>Horário</th><th>Início perto de</th><th>Fim perto de</th><th>Etapa</th><th>Km</th><th>Tempo gravando</th><th>Em movimento</th><th>Vel. média</th><th>Gravado por</th></tr></thead><tbody>` +
    [...GRV.lista].reverse().map(t => { const r = resumoTrj(t); return `<tr><td><b>${esc(tituloTrj(t))}</b></td><td class="nw">${esc(new Date(t.inicio).toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'}))}</td><td class="nw">${esc(fmtHoraISO(t.inicio))}–${esc(fmtHoraISO(t.fim))}</td><td>${esc(r.de)}</td><td>${esc(r.ate)}</td><td>${t.etapa && etapaPorId(t.etapa) ? esc(etapaPorId(t.etapa).nome) : '–'}</td><td class="n">${num(t.km, 1)}</td><td class="n">${fmtDur(t.seg)}</td><td class="n">${fmtDur(r.mov)}</td><td class="n">${r.vmed ? Math.round(r.vmed) + ' km/h' : '–'}</td><td>${esc(t.nome || t.por || '–')}</td></tr>`; }).join('') +
    `</tbody><tfoot><tr><td colspan="7">Total</td><td class="n">${num(tot.km, 1)}</td><td class="n">${fmtDur(tot.seg)}</td><td colspan="3"></td></tr></tfoot></table>`;
}

/* ---------------- tela "Em campo" ---------------- */
let campoEtapaId = null, campoAlvo = null, campoNota = null;
function etapaCampo(){
  let e = campoEtapaId && etapaPorId(campoEtapaId);
  if (!e) e = etapaAtual() || state.etapas.find(x => x.stops.some(s => !s.feito)) || state.etapas[0] || null;
  return e;
}
function diaCampo(e, p){
  if (!p || !p.days.length) return 0;
  if (e.inicio){ const hoje = new Date(); hoje.setHours(0, 0, 0, 0); const i = p.days.findIndex(D => D.data && D.data.getTime() === hoje.getTime()); if (i >= 0) return i; }
  const k = e.stops.findIndex(s => !s.feito); return k >= 0 && p.info[k] ? p.info[k].d : p.days.length - 1;
}
let campoDia = null;
function htmlCampo(){
  const e = etapaCampo(), p = e && P[e.id];
  const gps = GPS.on, q = GPS.pos && [GPS.pos.coords.latitude, GPS.pos.coords.longitude];
  let h = `<div class="cp-topo">
      <button type="button" class="cp-gps${gps ? ' on' : ''}" data-cp="gps" aria-pressed="${gps}">${svgI('gps')}<span>${gps ? 'GPS ligado' : 'Ligar GPS'}</span></button>
      ${GRV.t ? `<div class="cp-rec${GRV.pausa ? ' pausa' : ''}"><span class="rec"></span><div><b>${GRV.pausa ? 'Gravação pausada' : 'Gravando a rota'}</b><small data-grv-info>${infoGravacao()}</small></div>
          <button type="button" class="btn" data-cp="${GRV.pausa ? 'continuar' : 'pausar'}">${GRV.pausa ? 'Continuar' : 'Pausar'}</button><button type="button" class="btn perigo" data-cp="encerrar">Encerrar</button></div>`
        : `<button type="button" class="cp-gravar" data-cp="gravar"><span class="rec"></span><span>Gravar rota</span></button>`}
    </div>`;
  if (!e) return h + '<p class="vazio">Nenhuma etapa montada ainda. Monte as etapas na aba Roteiro.</p>';
  if (state.etapas.length > 1) h += `<div class="cp-etapas" role="group" aria-label="Etapa">${state.etapas.map(x => `<button type="button" data-cp="etapa" data-id="${x.id}" aria-pressed="${x.id === e.id}" style="--c:${x.cor}"><i></i>${esc(x.nome)}</button>`).join('')}</div>`;
  if (!p || !p.days.length) return h + '<p class="vazio">Esta etapa ainda não tem estações.</p>';
  const dAuto = diaCampo(e, p); const d = campoDia !== null && campoDia < p.days.length ? campoDia : dAuto, D = p.days[d];
  const idx = []; for (let k = D.i; k < D.j; k++) idx.push(k);
  const pend = idx.filter(k => !e.stops[k].feito);
  let alvoK = campoAlvo && idx.find(k => e.stops[k].id === campoAlvo); if (alvoK === undefined || alvoK === null) alvoK = pend.length ? pend[0] : null;
  if (alvoK === undefined) alvoK = null;
  h += `<div class="cp-dia"><button type="button" class="btn qd" data-cp="dia" data-d="${d - 1}" ${d === 0 ? 'disabled' : ''} aria-label="Dia anterior">‹</button>
      <div><b>Dia ${d + 1} de ${p.days.length}</b><small>${D.data ? esc(fmtDS(D.data)) : 'sem data'} · ${fmtKm(D.km)} km · ${fmtHora(D.saida)}–${fmtHora(D.chegada)}${D.to && D.to !== BH ? ` · pernoite em ${esc(munNome(D.to))}` : ''}</small></div>
      <button type="button" class="btn qd" data-cp="dia" data-d="${d + 1}" ${d >= p.days.length - 1 ? 'disabled' : ''} aria-label="Próximo dia">›</button></div>`;
  if (alvoK !== null){
    const s = e.stops[alvoK], est = EST[s.id], inf = p.info[alvoK] || {}, dist = q ? havLL(q, ll(s.id)) : null;
    h += `<article class="cp-alvo${s.feito ? ' feito' : ''}">
      <div class="cp-alvo-t"><span class="cp-n" style="--c:${e.cor}">${alvoK + 1}</span><div><h3>${esc(est.nome)} ${tipoBadge(est)}</h3>
        <small>${esc(estMun(est))} · ${esc(est.cod.join(' / '))}${inf.cheg != null ? ` · chegada prevista ${fmtHora(inf.cheg)}` : ''}${dist !== null ? ` · <b>${fmtDist(dist)}</b> daqui` : ''}</small></div></div>
      ${s.feito ? `<p class="cp-feito">${svgI('ok')} Visitada ${esc(s.feito)}${pend.length ? `<button type="button" class="btn primario cp-prox" data-cp="alvo" data-id="${e.stops[pend[0]].id}">Próxima: ${esc(EST[e.stops[pend[0]].id].nome)} ›</button>` : ''}</p>` : ''}
      <div class="cp-acoes">
        <a class="btn primario" href="https://www.google.com/maps/dir/?api=1&destination=${ll(s.id)[0]},${ll(s.id)[1]}&travelmode=driving" target="_blank" rel="noopener">${svgI('nav')}<span>Navegar</span></a>
        <button type="button" class="btn${s.feito ? '' : ' verde'}" data-cp="visita" data-id="${s.id}">${svgI('ok')}<span>${s.feito ? 'Desmarcar' : 'Cheguei'}</span></button>
        <button type="button" class="btn" data-cp="foto" data-id="${s.id}">${svgI('foto')}<span>Foto${(s.fotos || []).length ? ` (${s.fotos.length})` : ''}</span></button>
        <button type="button" class="btn" data-cp="nota" data-id="${s.id}" aria-expanded="${campoNota === s.id}">${svgI('nota')}<span>Anotar</span></button>
        <button type="button" class="btn" data-cp="ver" data-id="${s.id}">${svgI('alvo')}<span>No mapa</span></button>
      </div>
      ${campoNota === s.id ? `<div class="cp-nota"><textarea id="cpNota" rows="3" placeholder="Estado da estação e do acesso, leituras, manutenção, contato com o observador…">${esc(s.relato || '')}</textarea><div><button type="button" class="btn primario" data-cp="nota-ok" data-id="${s.id}">Salvar anotação</button><button type="button" class="btn" data-cp="nota-x">Cancelar</button></div></div>`
        : (s.relato ? `<p class="cp-relato">${esc(s.relato)}</p>` : '')}
      ${(s.fotos || []).length ? `<div class="cp-fotos">${s.fotos.slice(-6).map(f => `<button type="button" class="th" data-ver-foto="${s.id}|${f.id}"><img data-foto="${f.id}" alt="Foto"></button>`).join('')}</div>` : ''}
    </article>`;
  } else h += `<p class="cp-tudo">${svgI('ok')} Todas as estações deste dia foram visitadas.</p>`;
  h += `<ol class="cp-lista">${idx.map(k => { const s = e.stops[k], est = EST[s.id], inf = p.info[k] || {};
      return `<li class="${s.feito ? 'feito' : ''}${k === alvoK ? ' alvo' : ''}"><button type="button" class="cp-chk" data-cp="visita" data-id="${s.id}" aria-label="${s.feito ? 'Desmarcar visita' : 'Marcar como visitada'}" aria-pressed="${!!s.feito}">${svgI('ok')}</button>
        <button type="button" class="cp-it" data-cp="alvo" data-id="${s.id}"><b>${k + 1}. ${esc(est.nome)}</b> ${tipoBadge(est)}<small>${inf.cheg != null ? fmtHora(inf.cheg) + ' · ' : ''}${esc(estMun(est))}${inf.conj ? ' · junto com a anterior' : ''}</small></button></li>`; }).join('')}</ol>`;
  h += `<div class="cp-rapido"><span>Registrar aqui${GPS.pos ? ' (posição do GPS)' : ''}:</span>
      <button type="button" class="btn" data-cp="apoio" data-t="comb">${svgI('posto')}<span>Abastecimento</span></button>
      <button type="button" class="btn" data-cp="apoio" data-t="alim">${svgI('moeda')}<span>Refeição</span></button>
      <button type="button" class="btn" data-cp="apoio" data-t="hosp">${svgI('cama')}<span>Hospedagem</span></button></div>`;
  return h;
}
function registrarApoioAqui(tipo){
  const e = etapaCampo(); let lat, lon;
  if (GPS.pos){ lat = GPS.pos.coords.latitude; lon = GPS.pos.coords.longitude; } else { const c = map.getCenter(); lat = c.lat; lon = c.lng; }
  const mun = munEm(lat, lon) || '';
  abrirFormApoio({tipo, mun, lat:+lat.toFixed(6), lon:+lon.toFixed(6), etapa: e ? e.id : ''});
  if (!GPS.pos) toast('Sem GPS: o registro fica no centro do mapa. Depois de salvar, arraste o ícone para ajustar.');
}

/* ---------------- tela "Registros" ---------------- */
function htmlRegistros(){
  const fotos = todasFotos().sort((a, b) => (b.f.data || '').localeCompare(a.f.data || ''));
  const visitas = ordemRealizada();
  const fora = state.etapas.filter(foraDaOrdem);
  const tot = state.etapas.reduce((a, e) => a + e.stops.length, 0);
  const T = totaisGerais(), totTrj = GRV.lista.reduce((a, t) => ({km:a.km + t.km, seg:a.seg + t.seg}), {km:0, seg:0});
  return `<div class="rg-resumo">
      <div><b>${visitas.length}<small>/${tot}</small></b><span>estações visitadas</span></div>
      <div><b>${num(totTrj.km, totTrj.km < 100 ? 1 : 0)}</b><span>km percorridos (GPS)</span></div>
      <div><b>${fotos.length}</b><span>fotos</span></div></div>
    <section class="rg-sec"><div class="rg-t"><h3>Rotas percorridas</h3><label class="rg-chk"><input type="checkbox" data-rg="mostrar" ${GRV.mostrar ? 'checked' : ''}> no mapa</label></div>
      ${GRV.lista.length ? `<ul class="rg-trj">${GRV.lista.map(t => `<li><div><b>${esc(tituloTrj(t))}</b><small>${esc(fmtDataHora(t.inicio))}–${esc(fmtHoraISO(t.fim))} · ${num(t.km, 1)} km · ${fmtDur(t.seg)}${t.etapa && etapaPorId(t.etapa) ? ` · ${esc(etapaPorId(t.etapa).nome)}` : ''}${t.nome ? ` · ${esc(t.nome)}` : ''}</small></div>
          <div class="rg-bt"><button type="button" class="btn" data-rg="ver" data-id="${t.id}">Ver</button><button type="button" class="btn" data-rg="gpx" data-id="${t.id}">GPX</button><button type="button" class="btn" data-rg="nome" data-id="${t.id}">Detalhes</button><button type="button" class="btn qd perigo" data-rg="excluir" data-id="${t.id}" aria-label="Excluir rota">${svgI('lixo')}</button></div></li>`).join('')}</ul>
        <div class="rg-baixar"><button type="button" class="btn" data-rg="importar">${svgI('baixar')}<span>Importar rota (GPX)</span></button><button type="button" class="btn" data-rg="todas-gpx">${svgI('baixar')}<span>Todas (GPX)</span></button><button type="button" class="btn" data-rg="todas-kml">${svgI('baixar')}<span>Todas (KML, Google Earth)</span></button></div>`
        : `<div class="rg-baixar"><button type="button" class="btn" data-rg="importar">${svgI('baixar')}<span>Importar rota (GPX)</span></button></div><p class="vazio">Nenhuma rota gravada ainda. Em "Em campo", toque em <b>Gravar rota</b> ao sair: o caminho feito, os km e o tempo ficam registrados ${EM_NUVEM ? 'no app e na nuvem da equipe' : 'neste aparelho'}. Para gravar com a tela apagada, use um app de GPS em segundo plano (ex.: GPSLogger) e importe o arquivo GPX aqui.</p>`}</section>
    <section class="rg-sec"><div class="rg-t"><h3>Visitas · ordem realizada</h3></div>
      ${fora.map(e => `<p class="rg-ordem" style="--c:${e.cor}"><b>${esc(e.nome)}</b> foi visitada fora da ordem planejada. <button type="button" class="btn" data-rg="usar-ordem" data-id="${e.id}">Usar a ordem em que visitei</button></p>`).join('')}
      ${visitas.length ? `<ol class="rg-vis">${visitas.map((x, i) => ({...x, n: i + 1})).slice(-40).reverse().map(({e, s, k, t, n}) => `<li style="--c:${e.cor}"><button type="button" data-rg="est" data-id="${s.id}"><b>${n}. ${esc(EST[s.id].nome)}</b> ${tipoBadge(EST[s.id])}<small>${esc(fmtTsVisita(t))} · ${esc(e.nome)} · nº ${k + 1} no roteiro${(s.fotos || []).length ? ` · ${s.fotos.length} foto(s)` : ''}${s.relato ? ' · com anotação' : ''}</small></button></li>`).join('')}</ol>` : '<p class="vazio">Nenhuma visita marcada ainda.</p>'}</section>
    <section class="rg-sec"><div class="rg-t"><h3>Fotos</h3>${fotos.length ? '<button type="button" class="btn" data-rg="zip">Baixar todas (ZIP)</button>' : ''}</div>
      ${fotos.length ? `<div class="rg-fotos">${fotos.slice(0, 24).map(x => `<button type="button" class="th" data-ver-foto="${x.s.id}|${x.f.id}" title="${esc(EST[x.s.id].nome)}"><img data-foto="${x.f.id}" alt="Foto de ${esc(EST[x.s.id].nome)}"></button>`).join('')}</div>` : '<p class="vazio">As fotos tiradas nas visitas aparecem aqui, com GPS gravado.</p>'}</section>
    <section class="rg-sec"><div class="rg-baixar"><button type="button" class="btn" data-rg="rel">${svgI('rel')}<span>Relatório completo</span></button></div></section>`;
}

/* ---------------- tela "Menu" ---------------- */
let menuSub = null;
function htmlMenu(){
  if (menuSub === 'equipe') return `<div class="mn-voltar"><button type="button" class="btn" data-mn="voltar">‹ Menu</button><h2>Equipe e acesso</h2></div><div id="eqCorpo"></div>`;
  if (menuSub === 'relatorios'){
    const itens = [...menu.querySelectorAll('.menu-lista > *')].filter(el => !el.hidden).map(el => el.outerHTML).join('');
    return `<div class="mn-voltar"><button type="button" class="btn" data-mn="voltar">‹ Menu</button><h2>Relatórios e arquivos</h2></div><div class="menu-mob-corpo mn-rel">${itens}
      <hr><button data-mn="gpx">Baixar rotas percorridas (GPX)<small>Para GPS, Google Earth, QGIS e outros apps de mapa.</small></button><button data-mn="kml">Baixar rotas percorridas (KML)</button>
      <hr><button data-mn="copia">Salvar cópia de segurança (arquivo HTML)<small>Um arquivo que abre no computador mesmo sem o app, com todos os projetos, fotos e trajetos deste aparelho.</small></button></div>`;
  }
  const s = NUV.status(), [cls, txt] = rotuloNuvem(s), meta = metaDe(PJ_ID);
  return `${EM_NUVEM ? `<div class="mn-conta"><div class="mn-av">${esc((s.nome || s.email || '?').trim().charAt(0).toUpperCase())}</div><div><b>${esc(s.nome || s.email)}</b><small>${esc(s.email)} · ${s.papel === 'admin' ? 'Administrador' : 'Equipe'}</small></div></div>` : ''}
    <button type="button" class="mn-nuvem ${cls}" data-mn="sinc">${svgI('nuvem')}<div><b>${esc(txt)}</b><small>${EM_NUVEM ? 'Toque para sincronizar agora' : 'Este aparelho não está conectado à nuvem da equipe'}</small></div></button>
    <div class="mn-lista">
      <button type="button" data-mn="projetos">${svgI('pasta')}<div><b>Projetos</b><small>${esc(meta ? meta.nome : '')} · trocar, criar, copiar ou importar planilha</small></div></button>
      <button type="button" data-mn="relatorios">${svgI('rel')}<div><b>Relatórios e arquivos</b><small>Cronograma, tabela, fotos, KML, GPX, planilhas</small></div></button>
      <button type="button" data-mn="offline">${svgI('offline')}<div><b>Preparar para usar sem internet</b><small>Antes de ir a campo: guarda distâncias e traçados no aparelho</small></div></button>
      ${EM_NUVEM && s.papel === 'admin' ? `<button type="button" data-mn="equipe">${svgI('equipe')}<div><b>Equipe e acesso</b><small>Liberar, bloquear ou remover pessoas</small></div><i class="mn-badge" id="mnPedidos" hidden></i></button>` : ''}
      <button type="button" data-mn="instalar" id="mnInstalar" hidden>${svgI('baixar')}<div><b>Instalar o app</b><small>Abre em tela cheia e funciona sem internet</small></div></button>
      ${EM_NUVEM ? `<button type="button" data-mn="sair" class="perigo-m">${svgI('sair')}<div><b>Sair da conta</b><small>Apaga os dados deste aparelho (eles continuam na nuvem)</small></div></button>` : ''}
    </div>
    <p class="mn-ver">${esc(document.getElementById('versao').textContent)}</p>`;
}
let promptInstalar = null;
window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); promptInstalar = ev; const b = document.getElementById('mnInstalar'); if (b) b.hidden = false; });

function desenharTela(){
  if (telaEl.hidden) return;
  const foco = document.activeElement && document.activeElement.id === 'cpNota' ? document.getElementById('cpNota').value : null;
  telaCorpo.innerHTML = `<div class="tela-cab"><h2>${({campo:'Em campo', registros:'Registros', menu:'Menu'})[abaApp]}</h2>${abaApp === 'campo' && GPS.pos ? `<small>precisão ${Math.round(GPS.pos.coords.accuracy || 0)} m</small>` : ''}</div>` +
    (abaApp === 'campo' ? htmlCampo() : abaApp === 'registros' ? htmlRegistros() : htmlMenu());
  if (abaApp === 'menu' && menuSub !== 'equipe' && promptInstalar){ const b = document.getElementById('mnInstalar'); if (b) b.hidden = false; }
  if (abaApp === 'menu' && menuSub === 'equipe') NUV.abrirEquipe(document.getElementById('eqCorpo'));
  if (abaApp === 'menu' && !menuSub && EM_NUVEM && NUV.contarPedidos) NUV.contarPedidos().then(n => { const b = document.getElementById('mnPedidos'); if (b){ b.hidden = !n; b.textContent = n; } });
  if (foco !== null){ const t = document.getElementById('cpNota'); if (t){ t.value = foco; t.focus(); } }
  hidratar(telaCorpo);
  ajustarAlturaTela();
}
telaCorpo.addEventListener('change', ev => {
  const c = ev.target.closest('[data-rg=mostrar]'); if (c){ GRV.mostrar = c.checked; try { localStorage.setItem('rc-mostrar-trajetos', c.checked ? '1' : '0'); } catch(e){} desenharTrajetos(); }
});
telaCorpo.addEventListener('click', ev => {
  const vf = ev.target.closest('[data-ver-foto]'); if (vf){ const [sid, fid] = vf.dataset.verFoto.split('|'); verFoto(sid, fid); return; }
  const b = ev.target.closest('[data-cp],[data-rg],[data-mn],[data-acao]'); if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.acao){ menuHandler({target:b}); return; }
  /* Em campo */
  const cp = b.dataset.cp;
  if (cp === 'gps') GPS.on ? gpsDesligar() : gpsLigar();
  else if (cp === 'gravar') iniciarGravacao();
  else if (cp === 'pausar') pausarGravacao();
  else if (cp === 'continuar') continuarGravacao();
  else if (cp === 'encerrar') encerrarComNome();
  else if (cp === 'etapa'){ campoEtapaId = id; campoDia = null; campoAlvo = null; desenharTela(); }
  else if (cp === 'dia'){ campoDia = +b.dataset.d; campoAlvo = null; desenharTela(); const e = etapaCampo(); if (e && P[e.id] && P[e.id].days[campoDia]){ if (state.aba !== e.id){ state.aba = e.id; render(); } fitDay(campoDia); } }
  else if (cp === 'alvo'){ campoAlvo = id; campoNota = null; desenharTela(); verPonto(ll(id), Math.max(map.getZoom(), 12)); }
  else if (cp === 'visita'){ const s = LOC[id] && LOC[id].s; const novo = !(s && s.feito); marcarVisita(id, novo); if (novo){ campoAlvo = id; } desenharTela(); }
  else if (cp === 'foto') iniciarFoto(id, true);
  else if (cp === 'nota'){ campoNota = campoNota === id ? null : id; desenharTela(); const t = document.getElementById('cpNota'); if (t) t.focus(); }
  else if (cp === 'nota-ok'){ const t = document.getElementById('cpNota'); buildLOC(); const w = LOC[id]; if (w && t){ const v = t.value.trim(); if (v !== (w.s.relato || '')){ snapshot(); w.s.relato = v; changed(); toast('Anotação salva.', true); } } campoNota = null; desenharTela(); }
  else if (cp === 'nota-x'){ campoNota = null; desenharTela(); }
  else if (cp === 'ver'){ if (mobile()) irAba('mapa'); verPonto(ll(id), Math.max(map.getZoom(), 14)); setTimeout(() => popupEst(id, L.latLng(ll(id))), 300); }
  else if (cp === 'apoio') registrarApoioAqui(b.dataset.t);
  /* Registros */
  const rg = b.dataset.rg;
  if (rg === 'nome') renomearTrajeto(id);
  if (rg === 'ver'){ const t = GRV.lista.find(x => x.id === id); if (t){ if (!GRV.mostrar){ GRV.mostrar = true; desenharTrajetos(); } if (mobile()) irAba('mapa'); map.fitBounds(L.latLngBounds(t.pts.map(p => [p[0], p[1]])), {padding:[30, 30]}); } }
  else if (rg === 'gpx') baixarTrajetos('gpx', id);
  else if (rg === 'importar') entradaGPX.click();
  else if (rg === 'excluir') excluirTrajeto(id);
  else if (rg === 'todas-gpx') baixarTrajetos('gpx');
  else if (rg === 'todas-kml') baixarTrajetos('kml');
  else if (rg === 'usar-ordem'){ const e = etapaPorId(id); if (e && confirm(`Trocar a ordem de ${e.nome} pela ordem em que as estações foram visitadas? As pendentes ficam depois, na ordem atual. Dá para desfazer.`)) usarOrdemVisitada(e); }
  else if (rg === 'est'){ if (mobile()) irAba('mapa'); verPonto(ll(id), Math.max(map.getZoom(), 13)); setTimeout(() => popupEst(id, L.latLng(ll(id))), 300); }
  else if (rg === 'zip') baixarFotosZip();
  else if (rg === 'rel-gastos') abrirGastos();
  else if (rg === 'rel') abrirCrono();
  /* Menu */
  const mn = b.dataset.mn;
  if (mn === 'voltar'){ menuSub = null; desenharTela(); }
  else if (mn === 'sinc'){ if (EM_NUVEM) NUV.atualizarAgora(); }
  else if (mn === 'projetos') abrirProjetos();
  else if (mn === 'relatorios'){ menuSub = 'relatorios'; desenharTela(); }
  else if (mn === 'offline') prepararOffline();
  else if (mn === 'equipe'){ menuSub = 'equipe'; desenharTela(); }
  else if (mn === 'sair') NUV.sair();
  else if (mn === 'gpx') baixarTrajetos('gpx');
  else if (mn === 'kml') baixarTrajetos('kml');
  else if (mn === 'copia') salvarNoArquivo(true);
  else if (mn === 'instalar' && promptInstalar){ promptInstalar.prompt(); promptInstalar.userChoice.finally(() => { promptInstalar = null; desenharTela(); }); }
});
/* o conteúdo das telas acompanha o roteiro */
const _render = render;
render = function(){ _render(); if (!telaEl.hidden && !(document.activeElement && document.activeElement.id === 'cpNota')) desenharTela(); };
setInterval(() => { if (!telaEl.hidden && abaApp === 'campo' && GPS.on && !(document.activeElement && document.activeElement.id === 'cpNota')) desenharTela(); }, 20000);

/* menu Relatórios (computador): rotas percorridas e cópia de segurança */
(() => {
  const ml = menu.querySelector('.menu-lista'), ref = ml.querySelector('[data-acao=geojson]');
  const novo = document.createElement('div'); novo.className = 'menu-extra';
  novo.innerHTML = '<button data-mn2="gpx">Baixar rotas percorridas (GPX)<small>Trajetos gravados pelo GPS em campo.</small></button><button data-mn2="kml">Baixar rotas percorridas (KML)</button>';
  ref.after(...novo.children);
  ml.addEventListener('click', ev => { const b = ev.target.closest('[data-mn2]'); if (!b) return; menu.classList.remove('aberto'); baixarTrajetos(b.dataset.mn2); });
  document.getElementById('dMenuMobCorpo').addEventListener('click', ev => { const b = ev.target.closest('[data-mn2]'); if (b) baixarTrajetos(b.dataset.mn2); });
})();

if (!CELULAR){ irAba('roteiro'); }
window.addEventListener('resize', () => { if (!mobile() && abaApp === 'mapa') irAba('roteiro'); });
/* voltar do Android: fecha a tela aberta antes de sair do app */
if (!CELULAR){ history.replaceState({rc:'base'}, ''); history.pushState({rc:'app'}, ''); }
if (!CELULAR) window.addEventListener('popstate', () => {
  if (document.querySelector('dialog[open]')){ document.querySelectorAll('dialog[open]').forEach(d => d.close()); history.pushState({rc:'app'}, ''); return; }
  if (mobile() && abaApp !== 'mapa'){ irAba('mapa'); history.pushState({rc:'app'}, ''); return; }
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(() => {});
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recarregou || GRV.t || document.querySelector('dialog[open]') || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) return;
    recarregou = true; location.reload();
  });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* quantos pedaços do mapa de fundo estão guardados no aparelho (pelo service worker) */
window.__mapasN = () => new Promise(ok => {
  const sw = navigator.serviceWorker && navigator.serviceWorker.controller; if (!sw) return ok(0);
  const ch = new MessageChannel(); ch.port1.onmessage = ev => ok((ev.data && ev.data.n) || 0); sw.postMessage({tipo:'mapas-tamanho'}, [ch.port2]); setTimeout(() => ok(0), 3000);
});

/* importar trajetos de arquivos GPX (apps de GPS que gravam em segundo plano, como o GPSLogger) */
const entradaGPX = document.createElement('input'); entradaGPX.type = 'file'; entradaGPX.accept = '.gpx,.xml,application/gpx+xml,application/xml,text/xml'; entradaGPX.multiple = true; entradaGPX.hidden = true; entradaGPX.dataset.volatil = '';
document.body.appendChild(entradaGPX);
entradaGPX.onchange = async () => {
  const arqs = [...entradaGPX.files]; entradaGPX.value = ''; let n = 0, kmT = 0;
  for (const f of arqs){
    try {
      const xml = new DOMParser().parseFromString(await f.text(), 'application/xml');
      for (const trk of [...xml.getElementsByTagName('trk'), ...(xml.getElementsByTagName('trk').length ? [] : [xml.documentElement])]){
        const nos = [...trk.getElementsByTagName('trkpt')].concat(xml.getElementsByTagName('trk').length ? [] : [...xml.getElementsByTagName('rtept')]);
        const brutos = nos.map(p => ({la: +p.getAttribute('lat'), lo: +p.getAttribute('lon'), t: Date.parse((p.getElementsByTagName('time')[0] || {}).textContent || '')})).filter(p => isFinite(p.la) && isFinite(p.lo));
        if (brutos.length < 2) continue;
        const t0 = isFinite(brutos[0].t) ? brutos[0].t : Date.now(), pts = []; let km = 0;
        brutos.forEach((p, i) => { const q = [+p.la.toFixed(6), +p.lo.toFixed(6), isFinite(p.t) ? Math.round((p.t - t0) / 1000) : i]; const u = pts[pts.length - 1];
          if (u){ const d = kmTrecho(u, q); if (d < .005) return; km += d; } pts.push(q); });
        const tf = isFinite(brutos.at(-1).t) ? brutos.at(-1).t : t0, e = etapaCampo();
        const t = {id:'t' + Date.now().toString(36) + uid().slice(0, 4), pid:PJ_ID, etapa: e ? e.id : null, inicio:new Date(t0).toISOString(), fim:new Date(tf).toISOString(), pts, km,
          seg: Math.max(0, (tf - t0) / 1000), por:(NUV.email || ''), nome:(NUV.nome || ''), importado:true, mod:Date.now()};
        await TRJDB.put(t.id, t); n++; kmT += km;
      }
    } catch(err){ console.error(err); }
  }
  if (!n){ toast('Nenhum trajeto encontrado no arquivo. Use um arquivo GPX com trilha (trkpt).'); return; }
  NUV.sujo(); await carregarTrajetos();
  toast(`${n} ${n === 1 ? 'rota importada' : 'rotas importadas'} (${num(kmT, 1)} km).${EM_NUVEM ? ' Elas vão para a nuvem da equipe.' : ''}`);
};
