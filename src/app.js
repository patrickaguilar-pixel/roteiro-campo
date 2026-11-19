"use strict";
/* Cópia fiel da página antes de qualquer alteração no DOM: base para "Salvar no arquivo". */
const FONTE = (() => { const c = document.documentElement.cloneNode(true); c.querySelectorAll('[data-volatil]').forEach(x => x.remove()); return '<!DOCTYPE html>\n' + c.outerHTML; })();
const DATA = JSON.parse(document.getElementById('dados').textContent);
const BH0 = '3106200';
const OSRM = 'https://router.project-osrm.org';
const KEY = 'roteiro-estacoes-v3', KEY_V2 = 'roteiro-bh-visitas-v2', KEY_MAT = 'roteiro-estacoes-matriz-v1';
/* Dentro do aplicativo Android, a página conversa com o celular pela ponte "AndroidApp" (no computador ela não existe). */
const APP = (() => { try { const a = window.AndroidApp; return a && typeof a.ler === 'function' ? a : null; } catch(e){ return null; } })();

/* ================= projetos (cronogramas separados) =================
   Cada projeto tem o seu roteiro (estado) e, quando não usa o Anexo II, a sua própria lista de estações.
   Guardados neste navegador e, ao Salvar, todos vão juntos dentro do arquivo HTML. */
const KEY_IDX = 'roteiro-projetos-v1', KEY_DADOS = 'roteiro-dados:';
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); if (window.RC) RC.sujo(); return true; } catch(e){ return false; } };
const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };
const keyEstado = id => id === 'anexo' ? KEY : KEY + ':' + id;
const jsonEl = id => { try { const el = document.getElementById(id); return el ? JSON.parse(el.textContent) : null; } catch(e){ return null; } };
const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '');
/* Base de estações embutida neste arquivo: planilha do IGAM (Estações observadores v2). O Anexo II antigo foi retirado. */
const VERSAO_BASE = 'igam-v2', FONTE_BASE = 'Planilha IGAM (Estações observadores v2)';
const META_ANEXO = {id:'anexo', nome:'Anexo II (antigo)', criado:null, base:BH0, fonte:'Anexo II', tipo:'anexo'};
const META_BASE = {id:'igam', nome:'Roteiro IGAM', criado:null, base:BH0, fonte:FONTE_BASE, tipo:'anexo', versaoBase:VERSAO_BASE};
const baseAtual = p => p && (p.tipo !== 'anexo' || p.versaoBase === VERSAO_BASE);
if (APP){
  document.documentElement.classList.add('em-app');
  /* traçados e distâncias guardados no celular (permitem trabalhar sem internet) */
  try { const m = APP.ler('matriz'), el = document.getElementById('matriz'); if (m && el && /^\s*(null)?\s*$/.test(el.textContent)) el.textContent = m; } catch(e){}
  /* cópia de segurança no celular: só é usada se o armazenamento da página estiver vazio */
  try { if (!localStorage.getItem(KEY_IDX) && !localStorage.getItem(KEY)){
    const b = JSON.parse(APP.ler('biblioteca') || 'null');
    if (b && b.idx){ lsSet(KEY_IDX, b.idx); Object.entries(b.estados || {}).forEach(([id, st]) => lsSet(keyEstado(id), st)); Object.entries(b.dados || {}).forEach(([id, d]) => lsSet(KEY_DADOS + id, d)); }
    else { const t = APP.ler('estado'); if (t) lsSet(KEY, JSON.parse(t)); }
  } } catch(e){}
}
const PJ_EMB = jsonEl('projetos'), EST_EMB = jsonEl('estado');
const PJ_EMB_ATUAL = (PJ_EMB && PJ_EMB.atual) || 'anexo';   // projeto a que pertence o roteiro gravado no arquivo
let IDX = lsGet(KEY_IDX);
if (!IDX || !Array.isArray(IDX.lista)) IDX = {atual:null, lista:[]};
IDX.excluidos = IDX.excluidos || {};
/* projetos feitos sobre a base antiga (Anexo II) saem da lista: a base embutida agora é outra */
IDX.lista = IDX.lista.filter(baseAtual);
const metaDe = id => IDX.lista.find(p => p.id === id) || null;
/* projetos gravados no arquivo entram na lista deste navegador; de cada um vale a versão mais recente */
(() => {
  const doArq = PJ_EMB && Array.isArray(PJ_EMB.lista) ? PJ_EMB.lista : (EST_EMB ? [{...META_ANEXO}] : []);
  doArq.forEach(p => {
    if (!p || !p.id || !baseAtual(p)) return;
    const est = p.id === PJ_EMB_ATUAL ? EST_EMB : p.estado, modArq = (est && est.mod) || 0;
    if (IDX.excluidos[p.id] && IDX.excluidos[p.id] >= modArq) return;
    const ls = lsGet(keyEstado(p.id)), novo = !metaDe(p.id), maisNovo = !ls || modArq > (ls.mod || 0);
    if (p.tipo === 'proprio' && p.dados && (novo || maisNovo || !lsGet(KEY_DADOS + p.id))) lsSet(KEY_DADOS + p.id, p.dados);
    if (novo) IDX.lista.push({id:p.id, nome:p.nome, criado:p.criado, base:p.base, baseMun:p.baseMun, fonte:p.fonte, tipo:p.tipo === 'proprio' ? 'proprio' : 'anexo', ...(p.tipo === 'proprio' ? {} : {versaoBase:VERSAO_BASE})});
    else if (maisNovo && p.nome) Object.assign(metaDe(p.id), {nome:p.nome, base:p.base, baseMun:p.baseMun});
    if (p.id !== PJ_EMB_ATUAL && p.estado && maisNovo) lsSet(keyEstado(p.id), p.estado);
  });
})();
if (!IDX.lista.length) IDX.lista.push({...META_BASE});
let PJ_ID = metaDe(IDX.atual) ? IDX.atual : (metaDe(PJ_EMB_ATUAL) ? PJ_EMB_ATUAL : IDX.lista[0].id);
/* o arquivo traz trabalho mais novo em outro projeto: abre nesse projeto */
if (EST_EMB && PJ_EMB_ATUAL !== PJ_ID && metaDe(PJ_EMB_ATUAL)){ const ls = lsGet(keyEstado(PJ_EMB_ATUAL)); if (!ls || (EST_EMB.mod || 0) > (ls.mod || 0)) PJ_ID = PJ_EMB_ATUAL; }
const EMB_DO_ATUAL = PJ_EMB_ATUAL === PJ_ID;
if (EST_EMB && !EMB_DO_ATUAL && metaDe(PJ_EMB_ATUAL)){ const ls = lsGet(keyEstado(PJ_EMB_ATUAL)); if (!ls || (EST_EMB.mod || 0) > (ls.mod || 0)) lsSet(keyEstado(PJ_EMB_ATUAL), EST_EMB); }
IDX.atual = PJ_ID; lsSet(KEY_IDX, IDX);
const PJ = metaDe(PJ_ID), KEYP = keyEstado(PJ_ID);
const EST_ANEXO_N = DATA.est.length;
const PJ_DADOS = PJ.tipo === 'proprio' ? lsGet(KEY_DADOS + PJ_ID) : null;
if (PJ_DADOS && Array.isArray(PJ_DADOS.est) && PJ_DADOS.est.length) DATA.est = PJ_DADOS.est;
const FONTE_EST = PJ_DADOS ? (PJ.fonte || 'planilha') : FONTE_BASE;
const linhaFonte = e => PJ_DADOS ? `Linha ${e.n} da ${esc(FONTE_EST)}` : `Localidade ${pad2(e.n)} na ordem IGAM`;
const CORES = ['#C8364B','#1F78B4','#D98A00','#6A3D9A','#13897A','#B9471A','#33539E','#A0306E','#4E8A3E','#7B5A2E','#0F6E8C','#8A6D00'];
const DEF_CFG = {inicio:7, fim:19, visita:1.5, base:'vel', vel:60, folga:20, estrada:'qualquer', juntar:true, juntarM:1000, alm:1, almDesl:1/3, almIni:11.5, lan:0.25, lanIni:15.5};
/* Pausas do dia (hora parada, não é tempo ao volante): almoço + deslocamento até o restaurante, e lanche da tarde. */
const pausasCfg = c => [{tipo:'almoco', ini: c.almIni ?? 11.5, dur: +c.alm > 0 ? +c.alm + (+c.almDesl || 0) : 0}, {tipo:'lanche', ini: c.lanIni ?? 15.5, dur: +c.lan || 0}].filter(z => z.dur > 0 && z.ini < c.fim);
const VALHALLA = 'https://valhalla1.openstreetmap.de';
let PAV = {}, PAVG = {}, pavVer = 0, pavRazaoCache = null, srvPav = 'pendente';
const MUN = {}; DATA.geo.features.forEach(f => { MUN[f.properties.id] = f.properties; });
if (PJ_DADOS && PJ_DADOS.mun) Object.entries(PJ_DADOS.mun).forEach(([id, m]) => { if (!MUN[id]) MUN[id] = {...m, id}; });
if (PJ.baseMun && !MUN[PJ.base]) MUN[PJ.base] = {...PJ.baseMun, id: PJ.base};
/* cidade de saída e retorno do projeto (Belo Horizonte no Anexo II) */
const BH = MUN[PJ.base] ? PJ.base : BH0;
const sigla = n => { const p = semAcento(n).toUpperCase().split(/[\s-]+/).filter(w => w && !/^(DE|DA|DO|DAS|DOS|E|D)$/.test(w)); return p.length > 1 ? p.slice(0, 3).map(w => w[0]).join('') : (p[0] || 'BASE').slice(0, 3); };
const BASE_N = MUN[BH].n, BASE_S = BH === BH0 ? 'BH' : sigla(BASE_N);
const EST = {};
DATA.est.forEach(e => { EST[e.id] = e; e.viz = e.viz || []; e.F = e.tipos.some(t => t.startsWith('Fluv')); e.P = e.tipos.some(t => t.startsWith('Pluv')); e.cls = e.F && e.P ? 'FP' : e.F ? 'F' : 'P'; });
const ORDEM = DATA.est.map(e => e.id);
const N_EST = DATA.est.length;

const isEst = id => id && id[0] === 's';
const ll = id => isEst(id) ? EST[id].pts[0] : [MUN[id].lat, MUN[id].lon];
const nomeNo = id => id === BH ? BASE_N : isEst(id) ? EST[id].nome : MUN[id].n;
const munNome = id => `${MUN[id].n}-${MUN[id].uf}`;
const estMun = e => e.muns.map(m => MUN[m].n).join(' / ');
const tipoTxt = e => e.F && e.P ? 'Fluviométrica + Pluviométrica' : e.F ? 'Fluviométrica' : e.P ? 'Pluviométrica' : (e.tipos[0] || 'Ponto de visita');
const tipoBadge = e => `<span class="tipo">${e.F ? '<i class="F" title="Fluviométrica">F</i>' : ''}${e.P ? '<i class="P" title="Pluviométrica">P</i>' : ''}</span>`;
const uid = () => Math.random().toString(36).slice(2, 9);
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TIPOS = {
  hosp:  {nome:'Hospedagem', cor:'#5B3FA0', valor:'Diária prevista (R$)', svg:'<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>'},
  alim:  {nome:'Alimentação', cor:'#C2410C', valor:'Valor previsto (R$)', svg:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'},
  comb:  {nome:'Combustível', cor:'#0F766E', valor:'Valor previsto (R$)', svg:'<path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.8a2 2 0 0 0-.6-1.4L18 5"/>'},
  desc:  {nome:'Parada / descanso', cor:'#8A6D00', valor:'Valor previsto (R$)', svg:'<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12a4 4 0 1 1 0 8h-1"/>'},
  outro: {nome:'Outro ponto', cor:'#475569', valor:'Valor previsto (R$)', svg:'<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'}
};
const svgTipo = t => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TIPOS[t].svg}</svg>`;
const icone = (t, cls='') => `<span class="ic ${cls}" style="--t:${TIPOS[t].cor}" title="${TIPOS[t].nome}">${svgTipo(t)}</span>`;

/* ================= estado ================= */
let state, undoStack = [], road = {}, SNAP = {}, routeCache = {}, acessoCache = {};
let srv = 'pendente', routeBusy = false, progresso = '', focusDay = null, selId = null, P = {}, LOC = {}, MUNEST = {};

const novaStop = id => ({id, visita:null, nota:''});
function proxCor(lista){ const usadas = new Set(lista.map(e => e.cor)); return CORES.find(c => !usadas.has(c)) || CORES[lista.length % CORES.length]; }
function novaEtapa(lista){ return {id:'e' + uid(), nome:`Etapa ${pad2(lista.length + 1)}`, cor:proxCor(lista), inicio:'', dias:null, stops:[], pern:{}}; }
function defaultState(){ return {v:3, cfg:{...DEF_CFG}, etapas:[], pool: ORDEM.map(novaStop), apoios:[], aba:'geral', auto:'dividir', autoK:3}; }
function normaliza(s){
  const visto = new Set(), ok = x => x && EST[x.id] && !visto.has(x.id) && visto.add(x.id);
  s.cfg = {...DEF_CFG, ...(s.cfg || {})};
  s.etapas = (s.etapas || []).map(e => ({id:e.id || 'e' + uid(), nome:e.nome || 'Etapa', cor:e.cor || CORES[0], inicio:e.inicio || '', dias:e.dias || null,
    stops:(e.stops || []).filter(ok).map(x => ({id:x.id, visita:x.visita ?? null, extra: x.extra > 0 ? +x.extra : null, nota:x.nota || '', feito:x.feito || null, fts:x.feito ? (+x.fts || 0) : 0, relato:x.relato || '', sit:x.sit || '', fixo:!!x.fixo, _t:x._t || 0, fotos: Array.isArray(x.fotos) ? x.fotos.filter(f => f && f.id && isFinite(f.lat)) : []})),
    pern:Object.fromEntries(Object.entries(e.pern || {}).filter(([k, v]) => EST[k] && MUN[v])), ordem: e.ordem === 'manual' ? 'manual' : 'auto'}));
  s.vista = s.vista === 'mun' ? 'mun' : 'est';
  s.pool = (s.pool || []).filter(ok).map(x => ({id:x.id, visita:x.visita ?? null, extra: x.extra > 0 ? +x.extra : null, nota:x.nota || '', feito:x.feito || null, fts:x.feito ? (+x.fts || 0) : 0, relato:x.relato || '', sit:x.sit || '', fixo:!!x.fixo, _t:x._t || 0, fotos: Array.isArray(x.fotos) ? x.fotos.filter(f => f && f.id && isFinite(f.lat)) : []}));
  /* versão anterior: as duas estações de uma mesma linha do Anexo eram um só ponto; a segunda entra logo depois da primeira */
  const irma = lst => { for (let i = lst.length - 1; i >= 0; i--){ const b = lst[i].id + 'b'; if (EST[b] && !visto.has(b)){ visto.add(b); lst.splice(i + 1, 0, {...novaStop(b), fixo: lst[i].fixo}); s.migrouPares = (s.migrouPares || 0) + 1; } } };
  s.etapas.forEach(e => irma(e.stops)); irma(s.pool);
  ORDEM.forEach(id => { if (!visto.has(id)) s.pool.push(novaStop(id)); });
  s.apoios = (s.apoios || []).filter(a => TIPOS[a.tipo] && isFinite(a.lat) && isFinite(a.lon)).map(a => ({...a, mun: MUN[a.mun] ? a.mun : ''}));
  if (s.aba !== 'geral' && !s.etapas.some(e => e.id === s.aba)) s.aba = 'geral';
  s.v = 3; return s;
}
/* A versão anterior era por município: cada estação herda a etapa do seu município. */
function deV2(v2){
  const s = defaultState();
  s.apoios = (v2.apoios || []).filter(a => TIPOS[a.tipo] && isFinite(a.lat));
  const ets = (v2.etapas || []).filter(e => e.stops && e.stops.length).map(e => ({id:e.id, nome:e.nome, cor:e.cor, inicio:e.inicio || '', dias:null, stops:[], pern:{}, _m:new Set(e.stops.map(x => x.id))}));
  if (!ets.length) return s;
  const resto = [];
  ORDEM.forEach(id => { const e = EST[id], et = ets.find(x => e.muns.some(m => x._m.has(m)) || x._m.has(e.munPt[0])); et ? et.stops.push(novaStop(id)) : resto.push(id); });
  resto.forEach(id => { let best = ets[0], bd = Infinity; ets.forEach(x => x.stops.forEach(st => { const d = havLL(ll(id), ll(st.id)); if (d < bd){ bd = d; best = x; } })); best.stops.push(novaStop(id)); });
  ets.forEach(x => delete x._m);
  s.etapas = ets; s.pool = []; s.auto = 'otimizar'; s.migrado = true;
  return s;
}
function load(){
  try { const s = JSON.parse(localStorage.getItem(KEYP)); if (s && s.v === 3) return normaliza(s); } catch(e){}
  if (PJ_ID === 'anexo') try { const s = JSON.parse(localStorage.getItem(KEY_V2)); if (s && s.v === 2) return normaliza(deV2(s)); } catch(e){}
  return null;
}
let avisouCheio = false;
/* Carimbo de tempo por estação e por registro: permite juntar, sem perder nada, alterações feitas ao mesmo tempo
   em aparelhos diferentes (cada estação/registro fica com a versão alterada por último). */
let ANT = null;
const chaveParada = x => JSON.stringify([x.visita ?? null, x.extra ?? null, x.nota || '', x.feito || null, x.fts || 0, x.relato || '', x.sit || '', !!x.fixo, (x.fotos || []).map(f => f.id + '|' + (f.legenda || ''))]);
const SITUACOES = {ok:'Funcionando', manut:'Precisa de manutenção', acesso:'Sem acesso / não encontrada'};
const chaveApoio = a => { const {_t, ...r} = a; return JSON.stringify(r); };
function indiceTempos(st){ const p = {}, a = {}, f = {};
  [...st.etapas.flatMap(e => e.stops), ...st.pool].forEach(x => { p[x.id] = chaveParada(x); (x.fotos || []).forEach(ft => f[ft.id] = 1); });
  (st.apoios || []).forEach(x => a[x.uid] = chaveApoio(x)); return {p, a, f}; }
function marcarTempos(){
  const agora = Date.now(), novo = indiceTempos(state);
  if (ANT){
    [...state.etapas.flatMap(e => e.stops), ...state.pool].forEach(x => { if (ANT.p[x.id] !== undefined && ANT.p[x.id] !== novo.p[x.id]) x._t = agora; });
    (state.apoios || []).forEach(x => { if (ANT.a[x.uid] !== novo.a[x.uid]) x._t = agora; });
    Object.keys(ANT.a).forEach(u => { if (novo.a[u] === undefined){ state.apoiosEx = state.apoiosEx || {}; state.apoiosEx[u] = agora; } });
    Object.keys(ANT.f).forEach(id => { if (!novo.f[id]){ state.fotosEx = state.fotosEx || {}; state.fotosEx[id] = agora; } });
  }
  ANT = novo;
}
function save(){ marcarTempos(); state.mod = Date.now(); try { localStorage.setItem(KEYP, JSON.stringify(state)); if (window.RC) RC.sujo(); } catch(e){ if (!avisouCheio){ avisouCheio = true; setTimeout(() => toast('O espaço deste navegador para guardar roteiros acabou. Use Salvar para gravar no arquivo e exclua projetos antigos no quadro Projetos.'), 0); } } if (typeof atualizaSalvar === "function") try { atualizaSalvar(); } catch(e){} gravarApp(); }
/* vendo os dados de outra pessoa: nada pode ser alterado (só o dono da conta altera) */
function bloqueiaLeitura(){ if (window.RC && RC.leitura){ toast(`Só leitura: você está vendo os dados de ${RC.verNome || RC.dono}. Só o dono da conta pode alterar.`); throw new Error('somente leitura'); } }
function snapshot(){ bloqueiaLeitura(); undoStack.push(JSON.stringify(state)); if (undoStack.length > 80) undoStack.shift(); }
/* Estações do mesmo local (dupla F+P) ficam sempre juntas: na mesma etapa e em sequência.
   Também garante que nenhuma estação apareça duas vezes. Devolve quantas correções fez. */
let MOVIDOS = new Set();
function parDe(id, st = state){ const e = EST[id]; if (!e || !e.par || !EST[e.par]) return null; if (e.agrupada) return e.par; const v = (e.viz || []).find(x => x[0] === e.par); return !v || v[1] <= Math.max(1000, (st.cfg && st.cfg.juntarM) || 0) ? e.par : null; }
function consertarPares(st = state, prefer = MOVIDOS){
  let n = 0; const visto = new Set();
  const limpa = lst => { const out = lst.filter(x => x && EST[x.id] && !visto.has(x.id) && visto.add(x.id)); n += lst.length - out.length; return out; };
  st.etapas.forEach(e => { e.stops = limpa(e.stops); }); st.pool = limpa(st.pool);
  ORDEM.forEach(id => { if (!visto.has(id)){ st.pool.push(novaStop(id)); visto.add(id); n++; } });
  const onde = id => { for (const e of st.etapas){ const k = e.stops.findIndex(x => x.id === id); if (k >= 0) return {e, lst:e.stops, k, s:e.stops[k]}; } const k = st.pool.findIndex(x => x.id === id); return {e:null, lst:st.pool, k, s:st.pool[k]}; };
  const feito = new Set();
  for (const a of ORDEM){
    const b = parDe(a, st); if (!b || feito.has(a) || feito.has(b)) continue; feito.add(a); feito.add(b);
    const wa = onde(a), wb = onde(b);
    if (wa.lst === wb.lst && (!wa.e || Math.abs(wa.k - wb.k) === 1)) continue;
    const peso = (w, id) => (prefer && prefer.has(id) ? 8 : 0) + (w.s.fixo ? 4 : 0) + (w.e ? 2 : 0);
    const [anc, mov, movId] = peso(wb, b) > peso(wa, a) ? [wb, wa, a] : [wa, wb, b];
    mov.lst.splice(mov.k, 1); if (mov.e && mov.e !== anc.e && mov.e.pern) delete mov.e.pern[movId];
    const k = anc.lst.indexOf(anc.s); anc.lst.splice(movId === a ? k : k + 1, 0, mov.s);
    mov.s.fixo = anc.s.fixo; n++;
  }
  if (prefer === MOVIDOS) MOVIDOS = new Set();
  return n;
}
function changed(opts = {}){
  consertarPares(); state.auto = null; save(); render(); scheduleRoutes();
  if (opts.table) fetchTable().then(() => { render(); scheduleRoutes(); });
}
const etapaAtual = () => state.etapas.find(e => e.id === state.aba) || null;
const etapaPorId = id => state.etapas.find(e => e.id === id) || null;
function buildLOC(){
  LOC = {}; MUNEST = {};
  state.etapas.forEach(e => e.stops.forEach((s, k) => { LOC[s.id] = {e, k, s}; }));
  state.pool.forEach((s, k) => { LOC[s.id] = {pool:true, k, s}; });
  DATA.est.forEach(e => new Set([...e.muns, ...e.munPt]).forEach(m => (MUNEST[m] = MUNEST[m] || []).push(e.id)));
}

/* ================= custos ================= */
function havLL(A, B){
  const R = 6371, r = Math.PI/180, dLat = (B[0]-A[0])*r, dLon = (B[1]-A[1])*r;
  const h = Math.sin(dLat/2)**2 + Math.cos(A[0]*r)*Math.cos(B[0]*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
/* Razão típica entre a rota só por asfalto e a rota comum, medida nos trechos já calculados (usada nos trechos ainda não consultados). */
function pavRazao(){
  if (pavRazaoCache && pavRazaoCache.v === pavVer) return pavRazaoCache;
  const rk = [], rh = [];
  Object.entries(PAV).forEach(([k, q]) => { const r = road[k]; if (r && r.km > 2){ rk.push(q.km / r.km); rh.push(q.h / Math.max(r.h, 1e-6)); } });
  const med = v => { if (!v.length) return 1.12; v.sort((x, y) => x - y); return Math.min(2.5, Math.max(1, v[Math.floor(v.length / 2)])); };
  return pavRazaoCache = {v: pavVer, km: med(rk), h: med(rh)};
}
function legCost(a, b){
  if (a === b) return {km:0, h:0, est:false};
  const c = state.cfg, pav = c.estrada === 'pav';
  if (pav){ const q = PAV[a+'>'+b]; if (q) return {km:q.km, h: c.base === 'osrm' ? q.h * (1 + (c.folga || 0)/100) : q.km / c.vel, est:false, terra: !!q.terra}; }
  const r = road[a+'>'+b];
  if (r){ const f = pav ? pavRazao() : {km:1, h:1}; return {km:r.km * f.km, h: c.base === 'osrm' ? r.h * f.h * (1 + (c.folga || 0)/100) : r.km * f.km / c.vel, est:false, aprox: pav}; }
  const km = havLL(ll(a), ll(b)) * 1.3; return {km, h: km / c.vel, est:true};
}
const visitaH = s => (s.visita ?? state.cfg.visita);
/* Estações da mesma linha do Anexo (fluviométrica + pluviométrica) visitadas em sequência e próximas contam como UMA visita:
   o tempo da dupla é o maior dos dois tempos; a segunda estação fica com 0 h e o mesmo horário da primeira. */
function conjunta(a, b){
  const c = state.cfg; if (!c.juntar || !a || !b) return false;
  const A = EST[a]; if (!A || A.par !== b) return false; if (A.agrupada) return true;   // agrupadas pelo IGAM: uma visita
  const v = A.viz.find(x => x[0] === b); return !v || v[1] <= (c.juntarM || 1000);
}
function visitasSeq(stops){
  const vis = stops.map(visitaH), conj = stops.map(() => false);
  for (let k = 1; k < stops.length; k++) if (!conj[k-1] && conjunta(stops[k-1].id, stops[k].id)){ conj[k] = true; vis[k] = stops[k].extra > 0 ? +stops[k].extra : 0; }
  return {vis, conj};
}
const cidadeP = (e, sid) => (e.pern && e.pern[sid]) || EST[sid].muns[0];

/* ================= otimização ================= */
function tourCost(t, D){ let c = 0; for (let k = 0; k < t.length; k++) c += D[t[k]][t[(k+1)%t.length]]; return c; }
/* Gerador pseudoaleatório com semente: o otimizador dá sempre o mesmo resultado para o mesmo conjunto de pontos. */
function rngSemente(txt){ let h = 2166136261; for (let i = 0; i < txt.length; i++){ h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function optimizeOrder(ids0){
  const ids = [ids0[0], ...ids0.slice(1).sort()], rnd = rngSemente(ids.join(','));
  const n = ids.length; if (n < 4) return ids0.slice(1);
  const D = ids.map(a => ids.map(b => (legCost(a,b).h + legCost(b,a).h)/2));
  function nn(rand){
    const left = new Set(ids.map((_,i)=>i).slice(1)), t = [0];
    while (left.size){
      const last = t[t.length-1], cand = [...left].sort((x,y) => D[last][x]-D[last][y]);
      const pick = rand ? cand[Math.min(cand.length-1, rnd() < .6 ? 0 : Math.floor(rnd()*3))] : cand[0];
      t.push(pick); left.delete(pick);
    }
    return t;
  }
  function twoOpt(t){
    let better = true;
    while (better){ better = false;
      for (let i = 1; i < n-1; i++) for (let k = i+1; k < n; k++){
        const a = t[i-1], b = t[i], c = t[k], d = t[(k+1)%n];
        if (D[a][c] + D[b][d] - D[a][b] - D[c][d] < -1e-9){ for (let x = i, y = k; x < y; x++, y--) [t[x], t[y]] = [t[y], t[x]]; better = true; }
      }
    }
    return t;
  }
  function orOpt(t){
    let better = true;
    while (better){ better = false;
      outer: for (let len = 1; len <= 3; len++) for (let i = 1; i + len <= n; i++){
        const seg = t.slice(i, i+len), prev = t[i-1], next = t[(i+len)%n];
        const gain = D[prev][seg[0]] + D[seg[len-1]][next] - D[prev][next];
        const rest = t.slice(0, i).concat(t.slice(i+len));
        for (let j = 0; j < rest.length; j++){
          if (j === i-1) continue;
          const p = rest[j], q = rest[(j+1)%rest.length];
          for (const s of [seg, seg.slice().reverse()]){
            if (D[p][s[0]] + D[s[s.length-1]][q] - D[p][q] - gain < -1e-9){ t = rest.slice(0, j+1).concat(s, rest.slice(j+1)); better = true; break outer; }
          }
        }
      }
    }
    return t;
  }
  let best = null, bestC = Infinity;
  const tent = n > 60 ? 12 : n > 40 ? 30 : 60;
  for (let r = 0; r < tent; r++){
    let t = nn(r > 0); t = twoOpt(t); t = orOpt(t); t = twoOpt(t);
    const c = tourCost(t, D); if (c < bestC - 1e-9){ bestC = c; best = t.slice(); }
  }
  return best.slice(1).map(i => ids[i]);
}
/* Tempo de estrada de uma sequência fechada BH → pontos → BH. */
function tempoSeq(ids){ let h = 0, prev = BH; ids.forEach(id => { h += legCost(prev, id).h; prev = id; }); return h + legCost(prev, BH).h; }
/* Só troca a ordem se a nova for de fato melhor (pelo menos 1 minuto a menos de estrada). Devolve as horas economizadas. */
function otimizarEtapa(e){
  e.ordem = 'auto';
  if (e.stops.length < 2) return 0;
  const byId = Object.fromEntries(e.stops.map(s => [s.id, s])), atual = e.stops.map(s => s.id);
  const nova = optimizeOrder([BH, ...atual]), inv = nova.slice().reverse();
  const tA = tempoSeq(atual), tN = tempoSeq(nova), tI = tempoSeq(inv);
  const [melhor, tM] = tI < tN ? [inv, tI] : [nova, tN];
  if (tM < tA - 1/60){ e.stops = melhor.map(id => byId[id]); return tA - tM; }
  return 0;
}
function bestInsertPos(e, id){
  const seq = [BH, ...e.stops.map(s => s.id), BH]; let best = 0, bc = Infinity;
  for (let i = 0; i < seq.length-1; i++){ const c = legCost(seq[i], id).h + legCost(id, seq[i+1]).h - legCost(seq[i], seq[i+1]).h; if (c < bc){ bc = c; best = i; } }
  return best;
}
/* Divide os pontos em k etapas equilibradas. manterOrdem: segue a ordem da lista (planilha) em vez de otimizar o percurso. */
function dividir(k, tamanhos, manterOrdem){
  const all = [...state.etapas.flatMap(e => e.stops), ...state.pool]; if (!all.length) return false;
  const byId = Object.fromEntries(all.map(s => [s.id, s]));
  const ord = manterOrdem ? ORDEM.filter(id => byId[id]) : optimizeOrder([BH, ...all.map(s => s.id)]), m = ord.length;
  let grupos = [], resto = [];
  if (tamanhos && tamanhos.length){
    let i = 0; for (const t of tamanhos){ if (i >= m) break; grupos.push(ord.slice(i, i + t)); i += t; }
    resto = ord.slice(i);
  } else {
    k = Math.max(1, Math.min(k, m));
    const vis = visitasSeq(ord.map(id => byId[id])).vis, inn = ord.map((id, t) => t ? legCost(ord[t-1], id).h : 0);
    const pv = [0], pi = [0]; for (let t = 0; t < m; t++){ pv.push(pv[t] + vis[t]); pi.push(pi[t] + inn[t]); }
    const seg = (i, j) => legCost(BH, ord[i]).h + (pv[j+1] - pv[i]) + (pi[j+1] - pi[i+1]) + legCost(ord[j], BH).h;
    const dp = [...Array(k+1)].map(() => Array(m+1).fill(Infinity)), cut = [...Array(k+1)].map(() => Array(m+1).fill(0));
    dp[0][0] = 0;
    for (let g = 1; g <= k; g++) for (let j = g; j <= m; j++) for (let i = g-1; i < j; i++){ const v = Math.max(dp[g-1][i], seg(i, j-1)); if (v < dp[g][j]){ dp[g][j] = v; cut[g][j] = i; } }
    let j = m; for (let g = k; g >= 1; g--){ const i = cut[g][j]; grupos.unshift(ord.slice(i, j)); j = i; }
  }
  const antigas = state.etapas, novas = [];
  grupos.forEach((g, i) => {
    const old = antigas[i];
    const e = old ? {...old, stops: g.map(id => byId[id])} : {...novaEtapa(novas), stops: g.map(id => byId[id])};
    if (!old) e.nome = `Etapa ${pad2(i+1)}`;
    if (manterOrdem) e.ordem = 'manual'; else otimizarEtapa(e); novas.push(e);
  });
  state.etapas = novas; state.pool = resto.map(id => byId[id]);
  if (!etapaPorId(state.aba)) state.aba = 'geral';
  reassignApoios(); return true;
}
function colocar(id, destId){
  buildLOC(); const w = LOC[id]; let origem = null;
  if (w.e) origem = w.e.nome; else origem = 'Sem etapa';
  const s = (w.pool ? state.pool : w.e.stops).splice(w.k, 1)[0]; MOVIDOS.add(id);
  if (w.e && w.e.pern) delete w.e.pern[id];
  if (!destId) state.pool.push(s);
  else { const e = etapaPorId(destId); e.stops.splice(bestInsertPos(e, id), 0, s); }
  reassignApoios(); return origem;
}
function reassignApoios(){
  const munEt = {};
  state.etapas.forEach(e => e.stops.forEach(s => { [cidadeP(e, s.id), ...EST[s.id].muns].forEach(m => { if (!munEt[m]) munEt[m] = e.id; }); }));
  state.apoios.forEach(a => { if (a.mun && munEt[a.mun]) a.etapa = munEt[a.mun]; else if (a.etapa && !etapaPorId(a.etapa)) a.etapa = ''; });
}

/* ================= plano por etapa ================= */
function buildPlan(e){
  const S = e.stops, m = S.length, cfg = state.cfg, PZ = pausasCfg(cfg), lim = cfg.fim - cfg.inicio - PZ.reduce((a, z) => a + z.dur, 0);
  const ids = S.map(s => s.id), T = ids.map(id => cidadeP(e, id)), VS = visitasSeq(S), vis = VS.vis;
  const L = (a, b) => legCost(a, b);
  /* 1) Divisão automática: um dia termina quando a próxima parada já não cabe até o fim da jornada. */
  const auto = [];
  if (m){
    let start = 0, t = 0, prev = BH;
    for (let k = 0; k < m; k++){
      let tr = L(prev, ids[k]).h;
      if (k > start && t + tr + vis[k] + L(ids[k], T[k]).h > lim + 1e-9){ auto.push({i:start, j:k, to:T[k-1]}); start = k; prev = T[k-1]; t = 0; tr = L(prev, ids[k]).h; }
      t += tr + vis[k]; prev = ids[k];
    }
    if (t + L(prev, BH).h > lim + 1e-9 && m - start > 0 && t + L(prev, T[m-1]).h <= lim + 1e-9){ auto.push({i:start, j:m, to:T[m-1]}); auto.push({i:m, j:m, to:BH}); }
    else auto.push({i:start, j:m, to:BH});
  }
  /* 2) Dias definidos pelo usuário: as paradas são espalhadas igualmente nesse número de dias, desde que cada dia
     caiba na jornada. Se não couber, vale o número mínimo de dias da divisão automática e a etapa mostra um aviso. */
  let grp = auto, diasAjust = null;
  if (m && e.dias){
    if (e.dias < auto.length) diasAjust = {pedido: e.dias, usado: auto.length};
    else {
      const N = Math.min(e.dias, m), inn = [0], pv = [0];
      for (let k = 1; k < m; k++) inn[k] = inn[k-1] + L(ids[k-1], ids[k]).h;
      vis.forEach((v, k) => pv.push(pv[k] + v));
      const cost = (i, j) => L(i ? T[i-1] : BH, ids[i]).h + (inn[j-1] - inn[i]) + (pv[j] - pv[i]) + L(ids[j-1], j === m ? BH : T[j-1]).h;
      const dp = [...Array(N+1)].map(() => Array(m+1).fill(Infinity)), cut = [...Array(N+1)].map(() => Array(m+1).fill(0));
      dp[0][0] = 0;
      for (let q = 1; q <= N; q++) for (let j = q; j <= m; j++) for (let i = q-1; i < j; i++){ const v = Math.max(dp[q-1][i], cost(i, j)); if (v < dp[q][j]){ dp[q][j] = v; cut[q][j] = i; } }
      const out = []; let j = m; for (let q = N; q >= 1; q--){ const i = cut[q][j]; out.unshift({i, j, to: j === m ? BH : T[j-1]}); j = i; }
      if (dp[N][m] <= lim + 1e-9) grp = out; else diasAjust = {pedido: e.dias, usado: auto.length};
    }
  }
  const days = [], info = [], legs = []; let from = BH;
  grp.forEach((g, d) => {
    const nodes = [from, ...ids.slice(g.i, g.j), g.to];
    const D = {d, i:g.i, j:g.j, from, to:g.to, nodes, legs:[], km:0, drive:0, visit:0, pausa:0, pausas:[], saida:cfg.inicio};
    let t = cfg.inicio; const pend = PZ.map(z => ({...z}));
    for (let x = 0; x < nodes.length-1; x++){
      const a = nodes[x], b = nodes[x+1], c = L(a, b), leg = {a, b, ...c, d};
      /* pausa entre uma parada e o próximo deslocamento: quando já é a hora, ou quando o próximo trecho passaria muito da hora */
      if (!(x + 1 < nodes.length - 1 && VS.conj[g.i + x])) pend.forEach(z => { if (!z.feita && t >= z.ini - 1.5 && (t >= z.ini || t + c.h > z.ini + 1)){ z.feita = true; D.pausas.push({tipo:z.tipo, ini:t, dur:z.dur, x}); t += z.dur; D.pausa += z.dur; } });
      D.legs.push(leg); legs.push(leg); D.km += c.km; D.drive += c.h; t += c.h;
      if (x + 1 < nodes.length - 1){ const k = g.i + x; info[k] = {d, cheg:t, said:t + vis[k], leg:c, conj: VS.conj[k] && !(vis[k] > 0), junto: VS.conj[k], extra: VS.conj[k] ? vis[k] : 0}; if (info[k].conj && info[k-1]){ info[k].cheg = info[k-1].cheg; info[k].said = info[k-1].said; } t += vis[k]; D.visit += vis[k]; }
    }
    D.chegada = t; D.jornada = t - cfg.inicio; D.excede = t > cfg.fim + 1e-6; D.data = e.inicio ? addDias(e.inicio, d) : null;
    days.push(D); from = g.to;
  });
  const wps = days.length ? [days[0].nodes[0], ...days.flatMap(D => D.nodes.slice(1))] : [];
  const tot = legs.reduce((a, l) => ({km: a.km + l.km, h: a.h + l.h}), {km:0, h:0});
  tot.visit = vis.reduce((a, v) => a + v, 0); tot.pausa = days.reduce((a, D) => a + D.pausa, 0);
  const noites = days.slice(0, -1).map(D => D.to);
  const acessoAviso = ids.filter(id => { const a = acesso(id); return a && a.nivel !== 'ok'; });
  return {e, diasAjust, ids, T, days, info, legs, wps, key: (state.cfg.estrada === 'pav' ? 'P|' : '') + wps.join(','), tot, estimado: legs.some(l => l.est), noites, hospNoites: noites.map(id => hospDe(e, id)),
    fim: e.inicio && days.length ? addDias(e.inicio, days.length - 1) : null, maxFim: Math.max(0, ...days.map(D => D.chegada)), acessoAviso,
    nEst: ids.reduce((a, id) => a + EST[id].cod.length, 0)};
}
function hospDe(e, mun){ return state.apoios.find(a => a.tipo === 'hosp' && a.mun === mun && a.etapa === e.id) || state.apoios.find(a => a.tipo === 'hosp' && a.mun === mun && !a.etapa) || null; }
function apoiosDe(e){ return state.apoios.filter(a => a.etapa === e.id); }
function acesso(id){
  const s = SNAP[id]; if (!s) return null;
  return {...s, nivel: s.d <= 100 ? 'ok' : s.d <= 500 ? 'av' : 'sem'};
}
function textoAcesso(a){
  const via = a.nome ? ` (${esc(a.nome)})` : '';
  if (a.nivel === 'ok') return `Acesso por via mapeada${via}, a ${fmtM(a.d)} da estação.`;
  if (a.nivel === 'av') return `A via mapeada mais próxima${via} fica a ${fmtM(a.d)} da estação. O último trecho deve ser a pé ou por estrada de terra que não consta no mapa; confirme com o observador.`;
  return `<b>Sem acesso viário mapeado.</b> A via mais próxima${via} fica a ${fmtM(a.d)}. A rota vai até esse ponto; confirme o acesso real antes da viagem.`;
}

/* ================= datas e formatação ================= */
function addDias(iso, n){ const [y, m, d] = iso.split('-').map(Number); return new Date(y, m-1, d + n); }
const fmtD = d => d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
const fmtDS = d => d.toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'});
const periodo = p => p.e.inicio && p.days.length ? (p.days.length > 1 ? `${fmtD(p.days[0].data)} a ${fmtD(p.fim)}` : fmtD(p.days[0].data)) : '';
const fmtKm = km => Math.round(km).toLocaleString('pt-BR');
const fmtM = m => m >= 1000 ? `${(m/1000).toLocaleString('pt-BR', {maximumFractionDigits:1})} km` : `${Math.round(m)} m`;
function fmtH(h){ const m = Math.round(h*60); const H = Math.floor(m/60), M = m%60; return H ? (M ? `${H} h ${pad2(M)}` : `${H} h`) : `${M} min`; }
const fmtHc = h => { const m = Math.round(h*60); return `${Math.floor(m/60)}h${pad2(m%60)}`; };
const fmtHora = h => { const m = Math.round(h*60); return `${pad2(Math.floor(m/60) % 24)}:${pad2(m%60)}`; };
const fmtR = v => (v || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const fmtCoord = p => `${p[0].toFixed(4)}, ${p[1].toFixed(4)}`;
const corDia = i => CORES[i % CORES.length];
const horaNum = s => { const [h, m] = (s || '0:0').split(':').map(Number); return h + m/60; };

/* ================= geometria ================= */
const BBOX = {};
function bboxOf(g){ let a = [180, 90, -180, -90]; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  polys.forEach(p => p[0].forEach(([x, y]) => { a[0] = Math.min(a[0], x); a[1] = Math.min(a[1], y); a[2] = Math.max(a[2], x); a[3] = Math.max(a[3], y); })); return a; }
function ringIn(r, x, y){ let ins = false; for (let i = 0, j = r.length-1; i < r.length; j = i++){ const [xi, yi] = r[i], [xj, yj] = r[j]; if (((yi > y) !== (yj > y)) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) ins = !ins; } return ins; }
function munEm(lat, lon){
  for (const f of DATA.geo.features){
    const id = f.properties.id, b = BBOX[id] || (BBOX[id] = bboxOf(f.geometry));
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (polys.some(p => ringIn(p[0], lon, lat) && !p.slice(1).some(h => ringIn(h, lon, lat)))) return id;
  }
  return null;
}
function cidadesPerto(sid, atual){
  const p = ll(sid);
  const c = Object.values(MUN).map(m => ({id:m.id, d:havLL(p, [m.lat, m.lon])})).filter(x => x.d < 45).sort((a, b) => a.d - b.d).slice(0, 10);
  [EST[sid].muns[0], atual].forEach(id => { if (id && !c.some(x => x.id === id)) c.push({id, d:havLL(p, ll(id))}); });
  return c;
}

/* ================= mapa ================= */
const ehToque = matchMedia('(pointer:coarse)').matches || matchMedia('(max-width:760px)').matches;
const map = L.map('mapa', {zoomControl:true, preferCanvas:true, tapTolerance:18, inertiaDeceleration:2200, zoomSnap: ehToque ? .5 : 1, wheelPxPerZoomLevel:90}).setView([-21.6, -44.8], 7);
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
/* Fundos do mapa: todos gratuitos e sem chave. Cada um tem um provedor reserva caso o principal não carregue na rede. */
const EREF = ESRI + 'Reference/';
const tl = (url, o = {}) => L.tileLayer(url, {maxZoom:19, crossOrigin:'anonymous', ...o});   // CORS: deixa o app guardar os pedaços do mapa para usar sem internet
const FUNDOS = {
  ruas: {nome:'Estradas', dica:'Mapa rodoviário (Esri)', camadas:() => [tl(ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', {attribution:'Mapa © Esri, HERE, Garmin, OpenStreetMap'})],
         reserva:() => [tl('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OpenStreetMap'})]},
  osm:  {nome:'Estradas 2', dica:'Ruas e estradas detalhadas (OpenStreetMap)', camadas:() => [tl('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© Colaboradores do OpenStreetMap'})],
         reserva:() => [tl(ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', {attribution:'Mapa © Esri'})]},
  ter:  {nome:'Terreno', dica:'Relevo com curvas de nível (OpenTopoMap)', camadas:() => [tl('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {maxZoom:17, subdomains:'abc', attribution:'© OpenStreetMap, SRTM · estilo © OpenTopoMap (CC-BY-SA)'})],
         reserva:() => [tl(ESRI + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {attribution:'Mapa © Esri, HERE, Garmin, USGS'})]},
  sat:  {nome:'Satélite', dica:'Imagem de satélite com estradas e nomes (Esri)', camadas:() => [tl(ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom:18, attribution:'Imagens © Esri, Maxar, Earthstar Geographics'}),
           tl(ESRI + 'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom:18, opacity:.9}), tl(ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxNativeZoom:18})]},
  gm:   {nome:'Google Maps', dica:'Mapa do Google', google:'roadmap', camadas:() => [camadaGoogle('roadmap')]},
  gsat: {nome:'Google Satélite', dica:'Satélite do Google com nomes', google:'hybrid', camadas:() => [camadaGoogle('hybrid')]},
  nenhum: {nome:'Sem internet', dica:'Mapa leve que funciona sem internet: limites municipais, nomes das cidades e as rotas já traçadas', camadas:() => []}
};
/* Mapa do Google pela API oficial (Maps JavaScript + GoogleMutant). Só aparece com a chave em window.RC_GMAPS;
   se a chave falhar ou estiver sem internet, volta sozinho para o satélite da Esri. */
const temGoogle = () => !!window.RC_GMAPS;
let gmCarga = null;
function carregaGoogle(){
  if (gmCarga) return gmCarga;
  gmCarga = new Promise((ok, falha) => {
    window.gm_authFailure = () => { falha(new Error('chave')); googleFalhou('A chave do Google Maps foi recusada.'); };
    window.__gmPronto = () => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet.gridlayer.googlemutant@0.14.1/dist/Leaflet.GoogleMutant.js'; s.onload = ok; s.onerror = falha; document.head.appendChild(s); };
    const s = document.createElement('script'); s.async = true; s.onerror = falha;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.RC_GMAPS)}&callback=__gmPronto&loading=async&language=pt-BR&region=BR`;
    document.head.appendChild(s);
  });
  gmCarga.catch(() => { gmCarga = null; });
  return gmCarga;
}
function googleFalhou(msg){ if (FUNDOS[fundoAtual] && FUNDOS[fundoAtual].google){ usarFundo('sat', false, false); toast((msg || 'O mapa do Google não carregou.') + ' Mostrando o satélite da Esri.'); } }
function camadaGoogle(tipo){
  const g = L.layerGroup();
  carregaGoogle().then(() => { if (!fundoGrupo.hasLayer(g)) return; L.gridLayer.googleMutant({type:tipo, maxZoom:21, styles: tipo === 'roadmap' ? [{featureType:'poi.business', stylers:[{visibility:'off'}]}] : []}).addTo(g); })
    .catch(() => googleFalhou(navigator.onLine === false ? 'Sem internet para o mapa do Google.' : ''));
  return g;
}
let avisouSemRede = false, fundoAtual = null, fundoGrupo = L.layerGroup().addTo(map);
function usarFundo(id, reserva, salvar){
  if (FUNDOS[id] && FUNDOS[id].google && !temGoogle()) id = 'sat';
  const F = FUNDOS[id] || FUNDOS.ruas; fundoGrupo.clearLayers(); fundoAtual = id;
  const camadas = (reserva && F.reserva ? F.reserva : F.camadas)();
  let ok = 0, err = 0, avisou = false;
  camadas.forEach((c, i) => { c.addTo(fundoGrupo); if (i) return;
    c.on('tileload', () => ok++);
    c.on('tileerror', () => { err++;
      if (!navigator.onLine){ if (!avisouSemRede && err >= 6){ avisouSemRede = true; toast('Sem internet: o mapa de fundo aparece só nas áreas já vistas com internet. Estações, rotas, limites e nomes das cidades continuam no mapa (fundo "Sem internet").'); } return; }
      if (!avisou && err >= 6 && ok === 0 && fundoAtual === id){ avisou = true;
        if (!reserva && F.reserva){ usarFundo(id, true, false); toast(`O mapa "${F.nome}" não carregou nesta rede; usando um provedor alternativo.`); }
        else if (id !== 'nenhum'){ usarFundo('nenhum'); toast('O fundo do mapa não carregou nesta rede. Mostrando só os limites municipais.'); } } });
  });
  document.querySelectorAll('.fundos button').forEach(b => b.setAttribute('aria-pressed', b.dataset.fundo === id));
  setTimeout(() => { if (window.desenhaRotulos) window.desenhaRotulos(); }, 0);
  if (salvar && state && state.fundo !== id){ state.fundo = id; try { localStorage.setItem(KEYP, JSON.stringify(state)); } catch(e){} }
}
const CtrlFundos = L.Control.extend({options:{position:'topright'}, onAdd(){
  const d = L.DomUtil.create('div', 'fundos'); d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Tipo de mapa');
  const ic = {nenhum:'<path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/><path d="m4 4 16 16"/>', ruas:'<path d="M4 20 10 4M20 20 14 4M12 6v2M12 11v2M12 16v2"/>', osm:'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', sat:'<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>', ter:'<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>'};
  ic.gm = ic.osm; ic.gsat = ic.sat;
  d.innerHTML = [...(temGoogle() ? ['gm', 'gsat'] : []), 'sat', 'ruas', 'ter', 'nenhum'].map(k => `<button type="button" data-fundo="${k}" title="${FUNDOS[k].dica}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg><span>${FUNDOS[k].nome}</span></button>`).join('');
  L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
  d.addEventListener('click', ev => { const b = ev.target.closest('[data-fundo]'); if (b) usarFundo(b.dataset.fundo, false, true); });
  return d; }});
new CtrlFundos().addTo(map);
/* ================= GPS em tempo real (funciona sem internet) =================
   Ligado, mostra a posição com a direção do movimento, segue no mapa, desenha o caminho percorrido
   e indica a próxima estação a visitar. A tela fica acesa enquanto o GPS estiver ligado (quando o aparelho permite). */
const GPS = {on:false, wid:null, mk:null, circ:null, rastro:null, seguir:true, pos:null, avisou:false, lock:null, bt:null, box:null, prox:null};
const gpsIcone = h => L.divIcon({className:'', iconSize:[34,34], iconAnchor:[17,17], html:`<div class="gps-pt${h == null ? '' : ' dir'}" style="--h:${Math.round(h || 0)}deg"><i></i></div>`});
function gpsProxima(q){
  const e = etapaAtual(), cand = e ? e.stops.filter(s => !s.feito) : state.etapas.flatMap(x => x.stops).filter(s => !s.feito);
  if (!cand.length) return null;
  const alvo = e ? cand[0] : cand.reduce((b, s) => havLL(q, ll(s.id)) < havLL(q, ll(b.id)) ? s : b, cand[0]);
  return {id: alvo.id, km: havLL(q, ll(alvo.id))};
}
function gpsPainel(){
  if (!GPS.box) return; const p = GPS.pos;
  if (!p){ GPS.box.querySelector('.gp-txt').innerHTML = '<b>GPS ligado</b> · procurando o sinal…'; return; }
  const v = p.coords.speed, prox = GPS.prox = gpsProxima([p.coords.latitude, p.coords.longitude]);
  const linha1 = `<b>GPS ligado</b> · precisão ${Math.round(p.coords.accuracy || 0)} m${v != null && v > .5 ? ` · ${Math.round(v * 3.6)} km/h` : ''}`;
  const linha2 = prox ? `<a href="#" data-gp="prox">Próxima: <b>${esc(EST[prox.id].nome)}</b> ${tipoBadge(EST[prox.id])}</a> a ${fmtDist(prox.km)} em linha reta` : (state.etapas.length ? 'Todas as estações desta etapa já foram visitadas.' : '');
  GPS.box.querySelector('.gp-txt').innerHTML = linha1 + (linha2 ? '<br>' + linha2 : '');
  const perto = prox && prox.km <= .3; const bm = GPS.box.querySelector('[data-gp=feito]'); bm.hidden = !perto; if (perto) bm.textContent = `✓ Cheguei: marcar ${EST[prox.id].nome} como visitada`;
  GPS.box.querySelector('[data-gp=seguir]').setAttribute('aria-pressed', GPS.seguir);
}
async function gpsTela(on){
  try { if (on && 'wakeLock' in navigator && document.visibilityState === 'visible' && !GPS.lock){ GPS.lock = await navigator.wakeLock.request('screen'); GPS.lock.addEventListener('release', () => { GPS.lock = null; }); }
        if (!on && GPS.lock){ await GPS.lock.release(); GPS.lock = null; } } catch(e){}
}
document.addEventListener('visibilitychange', () => { if (GPS.on && document.visibilityState === 'visible') gpsTela(true); });
function gpsLigar(){
  if (!navigator.geolocation){ toast('Este aparelho ou navegador não informa a localização.'); return; }
  GPS.on = true; GPS.seguir = true; GPS.pos = null; GPS.avisou = false; GPS.bt.setAttribute('aria-pressed', 'true'); GPS.bt.classList.add('ligado');
  GPS.box.hidden = false; gpsPainel(); gpsTela(true); if (mobile() && sheetEst !== 'mini') setSheet('mini');
  if (!GPS.rastro) GPS.rastro = L.polyline([], {color:'#1A73E8', weight:3, opacity:.55, dashArray:'2 6', interactive:false}).addTo(map);
  GPS.wid = navigator.geolocation.watchPosition(p => {
    const q = [p.coords.latitude, p.coords.longitude], r = p.coords.accuracy || 0, prim = !GPS.pos;
    const h = p.coords.heading != null && isFinite(p.coords.heading) && (p.coords.speed || 0) > .8 ? p.coords.heading : null;
    if (!GPS.mk){ GPS.circ = L.circle(q, {radius:r, color:'#1A73E8', weight:1, fillOpacity:.1, interactive:false}).addTo(map);
      GPS.mk = L.marker(q, {icon: gpsIcone(h), zIndexOffset:3000, keyboard:false}).addTo(map);
      GPS.mk.on('click', () => { if (!reguaClique(GPS.mk.getLatLng())) menuRegistrar(GPS.mk.getLatLng(), true); }); }
    else { GPS.mk.setLatLng(q).setIcon(gpsIcone(h)); GPS.circ.setLatLng(q).setRadius(r); }
    const ult = GPS.rastro.getLatLngs(), u = ult[ult.length - 1];
    if (r < 100 && (!u || havLL([u.lat, u.lng], q) > .015)){ GPS.rastro.addLatLng(q); if (ult.length > 5000) GPS.rastro.setLatLngs(ult.slice(-4000)); }
    GPS.pos = p; if (window.__gpsPonto) window.__gpsPonto(p);
    if (prim){ map.setView(q, Math.max(map.getZoom(), 14)); toast('GPS ligado. O mapa acompanha você; arraste o mapa para parar de seguir. Toque no ponto azul para registrar hospedagem ou parada ali.'); }
    else if (GPS.seguir && !map.getBounds().pad(-.25).contains(q)) map.panTo(q, {animate:true});
    gpsPainel();
  }, err => {
    if (err && err.code === 1){ toast('O navegador não tem permissão para usar a localização. Libere em Configurações do site > Localização e ligue o GPS de novo.'); gpsDesligar(); }
    else if (!GPS.avisou && !GPS.pos){ GPS.avisou = true; toast('O GPS ainda não achou a posição. Em local aberto costuma levar menos de um minuto.'); }
  }, {enableHighAccuracy:true, maximumAge:3000, timeout:30000});
}
function gpsDesligar(){
  GPS.on = false; if (GPS.wid !== null) try { navigator.geolocation.clearWatch(GPS.wid); } catch(e){} GPS.wid = null;
  [GPS.mk, GPS.circ].forEach(x => x && x.remove()); GPS.mk = GPS.circ = null; GPS.pos = null;
  GPS.bt.setAttribute('aria-pressed', 'false'); GPS.bt.classList.remove('ligado'); GPS.box.hidden = true; gpsTela(false);
}
const CtrlGPS = L.Control.extend({options:{position:'topleft'}, onAdd(){
  const b = L.DomUtil.create('button', 'btn-gps'); b.type = 'button'; b.title = 'Ligar o GPS: ver a sua localização em tempo real'; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  L.DomEvent.disableClickPropagation(b); b.onclick = () => GPS.on ? gpsDesligar() : gpsLigar(); GPS.bt = b; return b; }});
new CtrlGPS().addTo(map);
GPS.box = L.DomUtil.create('div', 'gps-box', map.getContainer()); GPS.box.hidden = true;
GPS.box.innerHTML = '<div class="gp-txt"></div><div class="gp-bt"><button type="button" data-gp="feito" class="gp-feito" hidden></button><button type="button" data-gp="seguir" aria-pressed="true">Seguir</button><button type="button" data-gp="centro">Centralizar</button><button type="button" data-gp="limpar" title="Apagar o caminho percorrido">Apagar rastro</button><button type="button" data-gp="off" class="gp-off">Desligar GPS</button></div>';
L.DomEvent.disableClickPropagation(GPS.box); L.DomEvent.disableScrollPropagation(GPS.box);
GPS.box.addEventListener('click', ev => { const b = ev.target.closest('[data-gp]'); if (!b) return; ev.preventDefault(); const a = b.dataset.gp, q = GPS.pos && [GPS.pos.coords.latitude, GPS.pos.coords.longitude];
  if (a === 'off') gpsDesligar();
  else if (a === 'seguir'){ GPS.seguir = !GPS.seguir; if (GPS.seguir && q) map.panTo(q); gpsPainel(); }
  else if (a === 'centro'){ if (q){ GPS.seguir = true; map.setView(q, Math.max(map.getZoom(), 15)); gpsPainel(); } }
  else if (a === 'limpar'){ if (GPS.rastro) GPS.rastro.setLatLngs([]); }
  else if (a === 'prox' && GPS.prox){ GPS.seguir = false; const id = GPS.prox.id; map.setView(ll(id), Math.max(map.getZoom(), 13)); setTimeout(() => popupEst(id, L.latLng(ll(id))), 250); gpsPainel(); }
  else if (a === 'feito' && GPS.prox){ marcarVisita(GPS.prox.id, true); gpsPainel(); } });
map.on('dragstart', () => { if (GPS.on && GPS.seguir){ GPS.seguir = false; gpsPainel(); } });
/* ================= régua: mede distâncias no mapa (linha reta ou pela estrada) ================= */
const REG = {on:false, pts:[], t:0, estrada:false, rota:null, pedido:0, camada:L.layerGroup().addTo(map), box:null, bt:null};
function reguaClique(latlng){
  if (!REG.on) return false;
  const agora = Date.now(); if (latlng && agora - REG.t > 80){ REG.t = agora; REG.pts.push(L.latLng(latlng)); desenhaRegua(); }
  return true;
}
map.on('click', ev => { if (REG.on) reguaClique(ev.latlng); });
const fmtDist = km => km < 1 ? `${Math.round(km * 1000)} m` : `${num(km, km < 10 ? 2 : 1)} km`;
function reguaKm(){ let k = 0; for (let i = 1; i < REG.pts.length; i++) k += havLL([REG.pts[i-1].lat, REG.pts[i-1].lng], [REG.pts[i].lat, REG.pts[i].lng]); return k; }
function desenhaRegua(){
  REG.camada.clearLayers(); const pts = REG.pts, km = reguaKm();
  if (REG.estrada && REG.rota && REG.rota.chave === pts.map(p => p.lat.toFixed(5) + ',' + p.lng.toFixed(5)).join(';'))
    L.polyline(REG.rota.linha, {color:'#1A73E8', weight:5, opacity:.8, interactive:false}).addTo(REG.camada);
  if (pts.length > 1) L.polyline(pts, {color:'#111', weight:2.5, dashArray:'6 6', interactive:false}).addTo(REG.camada);
  pts.forEach((p, i) => { const m = L.circleMarker(p, {radius: i ? 4 : 5, color:'#111', weight:2, fillColor:'#fff', fillOpacity:1, interactive:false}).addTo(REG.camada);
    if (i && i === pts.length - 1) m.bindTooltip(fmtDist(km), {permanent:true, direction:'right', offset:[8, 0], className:'regua-tip'}); });
  let txt = pts.length < 2 ? (pts.length ? 'Toque no próximo ponto.' : 'Toque no mapa para marcar o início.') : `<b>${fmtDist(km)}</b> em linha reta`;
  if (pts.length > 1){ const ult = havLL([pts[pts.length-2].lat, pts[pts.length-2].lng], [pts[pts.length-1].lat, pts[pts.length-1].lng]); if (pts.length > 2) txt += ` · último trecho ${fmtDist(ult)}`; }
  if (REG.estrada && pts.length > 1) txt += REG.rota && REG.rota.chave === pts.map(p => p.lat.toFixed(5) + ',' + p.lng.toFixed(5)).join(';') ? (REG.rota.erro ? `<br><span class="rg-erro">${REG.rota.erro}</span>` : `<br><b>${fmtDist(REG.rota.km)}</b> pela estrada, cerca de ${fmtH(REG.rota.h)}`) : '<br>Calculando pela estrada…';
  REG.box.querySelector('.rg-txt').innerHTML = txt;
  REG.box.querySelector('[data-rg=desf]').disabled = !pts.length; REG.box.querySelector('[data-rg=limpar]').disabled = !pts.length;
  if (REG.estrada && pts.length > 1) reguaEstrada();
}
async function reguaEstrada(){
  const pts = REG.pts, chave = pts.map(p => p.lat.toFixed(5) + ',' + p.lng.toFixed(5)).join(';');
  if (REG.rota && REG.rota.chave === chave) return;
  const n = ++REG.pedido; await sleep(350); if (n !== REG.pedido) return;
  let r;
  try {
    const j = await getJSON(`${OSRM}/route/v1/driving/${pts.map(p => p.lng.toFixed(6) + ',' + p.lat.toFixed(6)).join(';')}?overview=full&geometries=geojson`, 20000, 2);
    if (j.code !== 'Ok') throw new Error(j.code);
    const R = j.routes[0], soma = k => (R.legs || []).reduce((a, l) => a + (l[k] || 0), 0);
    r = {chave, km: (R.distance ?? soma('distance')) / 1000, h: (R.duration ?? soma('duration')) / 3600, linha: j.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo])};
  } catch(e){ r = {chave, erro: navigator.onLine === false ? 'Sem internet: só a medida em linha reta.' : 'O serviço de rotas não respondeu agora.'}; }
  if (n !== REG.pedido) return; REG.rota = r; desenhaRegua();
}
function regua(on){
  REG.on = on; REG.pts = []; REG.rota = null; REG.camada.clearLayers();
  map.getContainer().classList.toggle('medindo', on); REG.bt.setAttribute('aria-pressed', on);
  if (on){ map.closePopup(); if (typeof setModoSel === 'function' && modoSel) setModoSel(false); map.doubleClickZoom.disable(); REG.box.hidden = false; desenhaRegua(); if (mobile() && sheetEst !== 'mini') setSheet('mini'); }
  else { map.doubleClickZoom.enable(); REG.box.hidden = true; }
}
const CtrlRegua = L.Control.extend({options:{position:'topleft'}, onAdd(){
  const b = L.DomUtil.create('button', 'btn-gps'); b.type = 'button'; b.title = 'Régua: medir distâncias no mapa'; b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/></svg>';
  L.DomEvent.disableClickPropagation(b); b.onclick = () => regua(!REG.on); REG.bt = b; return b; }});
new CtrlRegua().addTo(map);
REG.box = L.DomUtil.create('div', 'regua-box', map.getContainer()); REG.box.hidden = true;
REG.box.innerHTML = '<div class="rg-txt"></div><div class="rg-bt"><label><input type="checkbox" data-rg="estrada"> Pela estrada</label><button type="button" data-rg="desf">Desfazer</button><button type="button" data-rg="limpar">Limpar</button><button type="button" data-rg="fim" class="rg-fim">Fechar</button></div>';
L.DomEvent.disableClickPropagation(REG.box); L.DomEvent.disableScrollPropagation(REG.box);
REG.box.addEventListener('click', ev => { const b = ev.target.closest('button[data-rg]'); if (!b) return;
  if (b.dataset.rg === 'desf'){ REG.pts.pop(); desenhaRegua(); } else if (b.dataset.rg === 'limpar'){ REG.pts = []; REG.rota = null; desenhaRegua(); } else regua(false); });
REG.box.querySelector('[data-rg=estrada]').addEventListener('change', ev => { REG.estrada = ev.target.checked; REG.rota = null; desenhaRegua(); });
document.addEventListener('keydown', ev => { if (!REG.on || ev.target.closest('input, textarea, select')) return;
  if (ev.key === 'Escape'){ regua(false); } else if (ev.key === 'Backspace'){ ev.preventDefault(); REG.pts.pop(); desenhaRegua(); } });
const canvas = L.canvas({padding:.3});
const limites = L.geoJSON(DATA.geo, {
  renderer: canvas, interactive: !ehToque, style: f => estiloMun(f.properties.id),
  onEachFeature: (f, l) => { l.bindTooltip(() => esc(munNome(f.properties.id)), {sticky:true, direction:'top', offset:[0,-6]}); l.on('click', ev => popupMun(f.properties.id, ev.latlng)); }
}).addTo(map);
const rotaLayer = L.layerGroup().addTo(map), extras = L.layerGroup().addTo(map), marcadores = L.layerGroup().addTo(map), apoioLayer = L.layerGroup().addTo(map), acessoLayer = L.layerGroup().addTo(map);
const ctrlCamadas = L.control.layers(null, {'Limites municipais': limites, 'Traçado da rota': rotaLayer, 'Estações': marcadores, 'Pares e trechos sem via': extras, 'Hospedagens e paradas': apoioLayer}, {position:'topright'}).addTo(map);
L.control.scale({imperial:false}).addTo(map);
const CtrlFit = L.Control.extend({options:{position:'topleft'}, onAdd(){
  const d = L.DomUtil.create('div', 'ctrl'); d.innerHTML = '<button type="button">Ver tudo</button>';
  L.DomEvent.disableClickPropagation(d); d.firstChild.onclick = () => { focusDay = null; render(); fitAtual(); }; return d; }});
new CtrlFit().addTo(map);
const CtrlDia = L.Control.extend({options:{position:'bottomleft'}, onAdd(){ this.d = L.DomUtil.create('div'); L.DomEvent.disableClickPropagation(this.d); return this.d; }});
const ctrlDia = new CtrlDia().addTo(map);
const CtrlLeg = L.Control.extend({options:{position:'bottomright'}, onAdd(){
  const d = L.DomUtil.create('div', 'legenda'); L.DomEvent.disableClickPropagation(d);
  d.innerHTML = `<details open><summary>Legenda</summary><div style="display:grid;gap:4px;margin-top:5px">
    <div><span class="mk F">F</span>Fluviométrica (quadrado)</div><div><span class="mk P">P</span>Pluviométrica (círculo)</div>
    <div><span class="pin-pern" style="--c:#5E6B66;width:18px;height:18px;border-width:2px">${svgTipo('hosp')}</span>Cidade de pernoite</div>
    <div><span class="ln"></span>Rota pelas estradas</div><div><span class="ln pr"></span>Rota provisória (calculando)</div><div><span class="ln ac"></span>Acesso a partir da sede</div><div><span class="ln pe"></span>Trecho sem via mapeada</div><div><span class="ln te"></span>Estrada de terra (sem alternativa)</div>
    <div><span class="mk P av"></span>Acesso a confirmar</div><div><span class="mk P sem"></span>Sem via mapeada</div></div></details>`;
  return d; }});
new CtrlLeg().addTo(map);
map.on('contextmenu', ev => menuRegistrar(ev.latlng));

function estiloMun(id){
  const base = {color:'#7E8C87', weight:.5, fillColor:'#fff', fillOpacity:.01, opacity:.5};
  if (!state) return base;
  if (id === BH) return {color:'#17231F', weight:1.4, fillColor:'#17231F', fillOpacity:.15};
  const atual = etapaAtual(), ests = MUNEST[id] || [];
  const nas = ests.map(s => LOC[s]).filter(w => w && w.e && (!atual || w.e === atual));
  if (!nas.length) return base;
  const c = atual ? atual.cor : nas[0].e.cor;
  return {color:'#7E8C87', weight:.6, dashArray:'2 4', fillColor:c, fillOpacity:.10, opacity:.6};
}
function bearing(a, b){ const dy = b[0]-a[0], dx = (b[1]-a[1]) * Math.cos(a[0]*Math.PI/180); return -Math.atan2(dy, dx)*180/Math.PI; }
function marcadorEst(id, rotulo, cor, extraCls = ''){
  const e = EST[id], a = acesso(id), av = a && a.nivel !== 'ok' ? (a.nivel === 'sem' ? ' sem' : ' av') : '';
  if (LOC[id] && LOC[id].s.feito){ extraCls += ' feito'; rotulo = rotulo ? '✓' : rotulo; }
  if (SEL.has(id) && !etapaAtual()) extraCls += ' selec';
  const wq = LOC[id], dq = wq && wq.e && P[wq.e.id] && P[wq.e.id].info[wq.k];
  if (dq && dq.conj) extraCls += ' conj-mk';
  return L.marker(ll(id), {title:`${rotulo ? rotulo + '. ' : ''}${e.nome} (${tipoTxt(e)})${dq ? ` · ${wq.e.nome}, dia ${dq.d + 1}, ${dq.conj ? 'sem hora própria (mesma visita da anterior)' : fmtHora(dq.cheg)}` : ''}`, zIndexOffset: extraCls.includes('apagado') ? 0 : 1000,
    icon: L.divIcon({className:'', iconSize:[28,28], iconAnchor: e.mesmoPonto ? (e.sub ? [-1, 14] : [29, 14]) : [14, 14], html:`<div class="mk ${e.cls}${av} ${extraCls}${e.mesmoPonto ? ' par' : ''}" style="--c:${cor}">${rotulo}</div>`})})
    .on('click', ev => { if (modoSel && !etapaAtual()){ alternaSel(id); return; } popupEst(id, ev.latlng); });
}
/* Melhor traçado disponível para cada perna: o definitivo; no modo só pavimentadas, os trechos já calculados ou,
   enquanto calcula, o traçado comum como provisório (tracejado); por último, uma linha reta bem apagada. */
function geomPerna(p, i){
  const rg = routeCache[p.key];
  if (rg && rg.legs[i] && rg.legs[i].length > 1) return {pts: rg.legs[i], tipo:'ok', terra: rg.terra && rg.terra[i]};
  if (state.cfg.estrada === 'pav'){
    const k = p.wps[i] + '>' + p.wps[i+1];
    if (PAVG[k] && PAVG[k].length > 1) return {pts: PAVG[k], tipo:'ok', terra: PAV[k] && PAV[k].terra};
    const rn = routeCache[p.wps.join(',')];
    if (rn && rn.legs[i] && rn.legs[i].length > 1) return {pts: rn.legs[i], tipo:'prov'};
  }
  const kk = p.wps[i] + '>' + p.wps[i+1], kv = p.wps[i+1] + '>' + p.wps[i], pav = state.cfg.estrada === 'pav';
  if (LEGG[kk]) return {pts: LEGG[kk], tipo: pav ? 'prov' : 'ok'};
  if (LEGG[kv]) return {pts: LEGG[kv].slice().reverse(), tipo: pav ? 'prov' : 'ok'};
  const lg = p.legs[i]; return {pts: [ll(lg.a), ll(lg.b)], tipo:'reta'};
}
function desenhaEtapa(e, porDia){
  const p = P[e.id];
  p.legs.forEach((leg, i) => {
    const c = porDia ? corDia(leg.d) : e.cor, off = porDia && focusDay !== null && focusDay !== leg.d;
    const G = geomPerna(p, i), pts = G.pts, rg = G.tipo === 'ok';
    if (!pts || pts.length < 2) return;
    if (G.tipo === 'reta'){ L.polyline(pts, {color:c, weight:1.5, opacity: off ? .15 : .45, dashArray:'3 8', interactive:false}).addTo(rotaLayer); return; }
    L.polyline(pts, {color:'#fff', weight: off ? 3 : 7, opacity: off ? .3 : (rg ? .9 : .6), interactive:false}).addTo(rotaLayer);
    L.polyline(pts, {color:c, weight: off ? 2 : 4, opacity: off ? .3 : (rg ? 1 : .7), dashArray: rg ? null : '10 7', interactive:false}).addTo(rotaLayer);
    if (G.terra && !off) L.polyline(pts, {color:'#8B5A2B', weight:2.5, dashArray:'2 7', opacity:.95, interactive:false}).addTo(rotaLayer);
    if (!off && porDia){
      const mI = Math.floor((pts.length-1)/2), p1 = pts[mI], p2 = pts[Math.min(mI+1, pts.length-1)];
      if (p1 !== p2) L.marker((G.tipo !== 'reta') ? p1 : [(pts[0][0]+pts[1][0])/2, (pts[0][1]+pts[1][1])/2], {interactive:false, keyboard:false, icon: L.divIcon({className:'', iconSize:[12,12], html:`<div class="seta" style="color:${c};transform:rotate(${bearing((G.tipo !== 'reta') ? p1 : pts[0], (G.tipo !== 'reta') ? p2 : pts[1])}deg)">➤</div>`})}).addTo(rotaLayer);
    }
  });
  e.stops.forEach((s, k) => {
    const d = p.info[k].d, off = porDia && focusDay !== null && focusDay !== d;
    if (!porMun()) marcadorEst(s.id, k+1, porDia ? corDia(d) : e.cor, off ? 'apagado' : '').addTo(marcadores);
    if (porDia && !off){
      const est = EST[s.id];
      if (est.pts.length > 1){ L.polyline(est.pts, {color:corDia(d), weight:1.5, dashArray:'2 3', interactive:false}).addTo(extras);
        L.circleMarker(est.pts[1], {radius:4, color:corDia(d), weight:2, fillColor:'#fff', fillOpacity:1}).bindTooltip(`${esc(est.nome)}: 2ª coordenada (${fmtM(est.dPar)})`).addTo(extras); }
      const a = acesso(s.id); if (a && a.d > 50) L.polyline([a.loc, est.pts[0]], {color:'#B3261E', weight:2, dashArray:'2 4', interactive:false}).addTo(extras);
    }
  });
  if (porDia) p.days.slice(0, -1).forEach((D, d) => {
    if (hospDe(e, D.to)) return;
    const off = porDia && focusDay !== null && focusDay !== d && focusDay !== d+1;
    const pt = ll(D.to);
    L.marker([pt[0] + .012, pt[1] + .012], {zIndexOffset:1500, opacity: off ? .35 : 1, title:`Pernoite sugerido (automático), ${e.nome}, noite do dia ${d+1}: ${MUN[D.to].n}. Hospedagem a definir.`, icon:L.divIcon({className:'', iconSize:[18,18], html:`<div class="pin-pern auto" style="--c:${porDia ? corDia(d) : e.cor}">${svgTipo('hosp')}</div>`})})
      .on('click', ev => popupMun(D.to, ev.latlng)).addTo(marcadores);
  });
}
function renderMapa(){
  rotaLayer.clearLayers(); marcadores.clearLayers(); extras.clearLayers(); apoioLayer.clearLayers();
  const atual = etapaAtual();
  if (atual){
    desenhaEtapa(atual, true);
    if (porMun()) desenhaMunicipios();
    state.etapas.filter(e => e !== atual).forEach(e => e.stops.forEach(s => L.circleMarker(ll(s.id), {radius:4.5, color:'#fff', weight:1.5, fillColor:e.cor, fillOpacity:.75})
      .bindTooltip(() => { const w2 = LOC[s.id], d2 = w2 && w2.e && P[w2.e.id].info[w2.k]; return `${esc(EST[s.id].nome)} (${esc(e.nome)}${d2 ? `, dia ${d2.d + 1}` : ''})`; }).on('click', ev => popupEst(s.id, ev.latlng)).addTo(marcadores)));
  } else { state.etapas.forEach(e => desenhaEtapa(e, false)); if (porMun()) desenhaMunicipios(); }
  if (!porMun()) state.pool.forEach(s => marcadorEst(s.id, '', '#fff', 'pool').addTo(marcadores));
  L.marker(ll(BH), {zIndexOffset:2000, title:`${BASE_N} (saída e retorno)`, icon: L.divIcon({className:'', iconSize:[34,34], html:`<div class="pin-bh">${BASE_S}</div>`})})
    .on('click', ev => popupMun(BH, ev.latlng)).addTo(marcadores);
  state.apoios.filter(a => !atual || a.etapa === atual.id || !a.etapa).forEach(a => {
    L.marker([a.lat, a.lon], {draggable:true, zIndexOffset:2500, title:`${TIPOS[a.tipo].nome}: ${a.nome}`, icon: L.divIcon({className:'apoio-pin', iconSize:[20,20], html: icone(a.tipo, 'cheio')})})
      .on('click', ev => popupApoio(a, ev.latlng))
      .on('dragend', ev => { const p = ev.target.getLatLng(); snapshot(); a.lat = +p.lat.toFixed(6); a.lon = +p.lng.toFixed(6); a.mun = munEm(a.lat, a.lon) || a.mun; changed(); toast(`${a.nome}: posição atualizada.`, true); })
      .addTo(apoioLayer);
  });
  limites.eachLayer(l => l.setStyle(estiloMun(l.feature.properties.id)));
  if (typeof desenhaFotos === 'function') try { desenhaFotos(); } catch(e){}
  ctrlDia.d.innerHTML = atual && focusDay !== null ? `<div class="chip-dia">Mostrando só o dia ${focusDay+1}<button type="button">Mostrar todos</button></div>` : '';
  const b = ctrlDia.d.querySelector('button'); if (b) b.onclick = () => { focusDay = null; render(); fitAtual(); };
}
function fitPts(pts, maxZoom = 11){ if (!pts.length) return; const h = typeof alturaAtual === 'function' ? alturaAtual() : 0;
  map.fitBounds(pts, h ? {paddingTopLeft:[24, 56], paddingBottomRight:[24, h + 24], maxZoom} : {padding:[40,40], maxZoom}); }
function fitAtual(){
  const atual = etapaAtual();
  const ids = atual ? [BH, ...atual.stops.map(s => s.id)] : [BH, ...ORDEM];
  fitPts(ids.map(ll), 10);
}
function fitDay(d){ const e = etapaAtual(), D = P[e.id].days[d]; fitPts(D.nodes.map(ll), 12); }

/* ================= popups ================= */
function opcoesEtapa(sel, vazio = 'Sem etapa'){
  return state.etapas.map(e => `<option value="${e.id}"${e.id === sel ? ' selected' : ''}>${esc(e.nome)}</option>`).join('') + (vazio !== null ? `<option value=""${sel === '' ? ' selected' : ''}>${vazio}</option>` : '');
}
function botoesRegistrar(){ return `<div class="registrar">${Object.keys(TIPOS).map(t => `<button type="button" data-reg="${t}" style="--t:${TIPOS[t].cor}" title="Registrar ${TIPOS[t].nome.toLowerCase()}" aria-label="Registrar ${TIPOS[t].nome.toLowerCase()}">${icone(t)}</button>`).join('')}</div>`; }
function ligaRegistrar(el, base){ el.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { map.closePopup(); abrirFormApoio({...base(), tipo: b.dataset.reg}); }); }
function pontoPerto(id){ const p = ll(id); return {lat: +(p[0] + .003).toFixed(6), lon: +(p[1] + .003).toFixed(6)}; }

function popupEst(id, latlng){
  if (reguaClique(latlng)) return;
  buildLOC(); const e = EST[id], w = LOC[id], atual = etapaAtual(), a = acesso(id), sede = e.muns[0];
  const emEtapa = w && w.e, daAtual = emEtapa && w.e === atual;
  let prog = 'Sem etapa definida.';
  if (emEtapa){ const p = P[w.e.id], inf = p.info[w.k], D = p.days[inf.d];
    prog = `${esc(w.e.nome)}, parada ${w.k+1}, dia ${inf.d+1}${D.data ? ` (${fmtDS(D.data)})` : ''}: ${inf.conj ? 'mesma visita da parada anterior' : `chegada ${fmtHora(inf.cheg)}, saída ${fmtHora(inf.said)}`}`; }
  const rs = road[sede + '>' + id];
  const el = document.createElement('div'); el.className = 'pop';
  el.innerHTML = `<h3>${daAtual ? `${w.k+1}. ` : ''}${esc(e.nome)} ${tipoBadge(e)}</h3>
    ${emEtapa ? (() => { const inf = P[w.e.id].info[w.k], D = P[w.e.id].days[inf.d]; return `<p class="prog-chip" style="--c:${w.e.cor}"><b>${esc(w.e.nome)}</b> · Dia ${inf.d + 1}${D.data ? ` (${fmtDS(D.data)})` : ''} · parada ${w.k + 1} · ${inf.conj ? '<span title="Mesma visita da parada anterior (estação no mesmo local): não conta hora própria">↳ sem hora própria (mesma visita da anterior)</span>' : `${fmtHora(inf.cheg)}–${fmtHora(inf.said)}`}</p>`; })() : '<p class="prog-chip" style="--c:#9AA5A1">Sem etapa</p>'}
    <p class="sub">${tipoTxt(e)} em ${esc(estMun(e))}. ${linhaFonte(e)}${e.inst ? `; ${esc(e.inst)}` : ''}${e.op ? `, operação ${esc(e.op)}` : ''}.</p>
    <table>
      <tr><th>Código${e.cod.length > 1 ? 's' : ''}</th><td>${e.cod.map((c, i) => `${esc(c)} <span class="rot" style="display:inline">${esc((e.tipos[i] || '').replace('métrica', '.'))}</span>`).join(', ')}</td></tr>
      ${e.rio ? `<tr><th>Curso d'água</th><td>${esc(e.rio)}</td></tr>` : ''}
      <tr><th>Coordenada${e.pts.length > 1 ? 's' : ''}</th><td>${e.pts.map(fmtCoord).join('<br>')}${e.pts.length > 1 ? `<br><span class="rot">Duas estações a ${fmtM(e.dPar)}: um só ponto de visita.</span>` : ''}</td></tr>
      ${e.munPt[0] && !e.muns.includes(e.munPt[0]) ? `<tr><th>Atenção</th><td>A coordenada cai em ${esc(MUN[e.munPt[0]].n)}; ${PJ_DADOS ? 'a planilha' : 'o Anexo'} indica ${esc(estMun(e))}.</td></tr>` : ''}
      ${e.viz.length ? `<tr><th>${e.par ? 'Junto com' : 'Vizinha'}</th><td>${e.viz.map(([v, d]) => `<a href="#" data-irest="${v}">${esc(EST[v].nome)} ${tipoBadge(EST[v])}</a> ${esc(EST[v].cod[0])}, ${d < 5 ? 'mesmo local' : `a ${fmtM(d)}`}${EST[v].n === e.n ? ' (mesma localidade)' : ''}`).join('<br>')}</td></tr>` : ''}
    </table>
    <div class="bloco-ac ${a ? (a.nivel === 'ok' ? '' : a.nivel) : ''}">${a ? textoAcesso(a) : 'Acesso ainda não verificado (aguardando o serviço de rotas).'}
      ${rs ? `<br>Da sede de ${esc(MUN[sede].n)}: <b>${rs.km < 1 ? 'menos de 1' : fmtKm(rs.km)} km</b> pela via (${fmtH(legCost(sede, id).h)}), em roxo no mapa.` : ''}</div>
    <div class="botoes">
      ${atual && !daAtual ? `<button type="button" class="btn primario" data-a="trazer">Trazer para ${esc(atual.nome)}</button>` : ''}
      ${!atual && emEtapa ? `<button type="button" class="btn primario" data-a="abrir">Abrir ${esc(w.e.nome)}</button>` : ''}
      <a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${e.pts[0][0]},${e.pts[0][1]}&travelmode=driving">Navegar até aqui</a>
      ${APP ? `<a class="btn" href="geo:${e.pts[0][0]},${e.pts[0][1]}?q=${e.pts[0][0]},${e.pts[0][1]}(${encodeURIComponent(e.nome)})" title="Abre no Organic Maps, Waze ou outro app de mapa instalado (o Organic Maps funciona sem internet)">Outro app de mapa</a>` : ''}
      <button type="button" class="btn" data-a="copiar">Copiar coordenada</button>
      <button type="button" class="btn" data-a="foto">📷 Foto</button>
      ${emEtapa ? `<button type="button" class="btn${w.s.feito ? '' : ' primario'}" data-a="feito">${w.s.feito ? 'Desmarcar visita' : '✓ Marcar como visitada'}</button>` : ''}
    </div>
    ${emEtapa ? (() => { const inf = P[w.e.id].info[w.k], ant = inf && inf.junto ? w.e.stops[w.k - 1].id : null, prox = !ant && P[w.e.id].info[w.k + 1] && P[w.e.id].info[w.k + 1].junto ? w.e.stops[w.k + 1].id : null;
      if (ant) return `<div class="pop-dur">${inf.extra ? `Tempo extra: <b>+${fmtH(inf.extra)}</b>` : '<span class="sem-hora">⏱ sem hora própria</span>'} <span class="rot" style="display:inline">${inf.extra ? 'além da' : 'o tempo já está na'} visita de ${esc(EST[ant].nome)} ${tipoBadge(EST[ant])} (${fmtH(tempoVisita(ant))})</span> <button type="button" class="btn" data-a="dur">${inf.extra ? 'Alterar' : 'Adicionar tempo'}</button><div class="pop-dur-ed" hidden></div></div>`;
      return `<div class="pop-dur">Tempo de visita: <b>${fmtH(tempoVisita(id))}</b> <span class="rot" style="display:inline">${prox ? `(inclui ${tipoBadge(EST[prox])} do mesmo local)` : w.s.visita != null ? '(ajustado)' : '(padrão)'}</span> <button type="button" class="btn" data-a="dur">Alterar</button><div class="pop-dur-ed" hidden></div></div>`; })() : ''}
    <details style="margin-top:8px"${daAtual && w.s.nota ? ' open' : ''}><summary class="rot" style="cursor:pointer;font-weight:600">${daAtual ? 'Editar parada, mudar de etapa ou registrar apoio' : 'Mudar de etapa ou registrar apoio'}</summary>
      ${daAtual ? `<div class="linha" style="margin-top:6px">
          <label class="f" style="flex:0 0 140px">Posição<span class="linha" style="flex-wrap:nowrap"><input type="number" min="1" max="${atual.stops.length}" data-a="pos" value="${w.k+1}" style="width:58px"><button type="button" class="btn" data-a="mover">Mover</button></span></label>
        </div>
        <label class="f">Observações<textarea data-a="nota" rows="2" placeholder="Observador, chave do cadeado, condição do acesso…">${esc(w.s.nota || '')}</textarea></label>` : ''}
      ${state.etapas.length ? `<label class="f">Etapa<select data-a="etapa">${opcoesEtapa(emEtapa ? w.e.id : '')}</select></label>` : ''}
      <p class="rot" style="margin-top:6px">Registrar hospedagem ou parada perto deste ponto:</p>${botoesRegistrar()}
      ${daAtual ? '<button type="button" class="btn perigo" data-a="rem">Tirar desta etapa</button>' : ''}
    </details>`;
  const q = s => el.querySelector(`[data-a=${s}]`);
  if (daAtual){
    q('nota').onchange = ev => { snapshot(); w.s.nota = ev.target.value; changed(); };
    q('mover').onclick = () => { const pos = Math.max(1, Math.min(atual.stops.length, parseInt(q('pos').value))) - 1; if (isNaN(pos) || pos === w.k) return;
      snapshot(); const [x] = atual.stops.splice(w.k, 1); atual.stops.splice(pos, 0, x); atual.ordem = 'manual'; map.closePopup(); changed(); toast(`${e.nome} agora é a parada ${pos+1}.`, true); };
    q('rem').onclick = () => { map.closePopup(); moverPara(id, ''); };
  }
  if (q('etapa')) q('etapa').onchange = ev => { map.closePopup(); moverPara(id, ev.target.value); };
  if (q('dur')){ const box = el.querySelector('.pop-dur-ed');
    q('dur').onclick = () => { box.hidden = !box.hidden; if (!box.hidden) box.innerHTML = durHTML(id); };
    box.addEventListener('click', ev => { const b = ev.target.closest('[data-durv]'); if (b){ map.closePopup(); setDur(id, b.dataset.durv); return; } if (ev.target.closest('[data-durfechar]')) box.hidden = true; });
    box.addEventListener('change', ev => { const i = ev.target.closest('[data-durin]'); if (i){ map.closePopup(); setDur(id, i.value); } }); }
  if (q('trazer')) q('trazer').onclick = () => { map.closePopup(); moverPara(id, atual.id); };
  if (q('abrir')) q('abrir').onclick = () => { map.closePopup(); irPara(w.e.id); };
  q('copiar').onclick = () => copiar(`${e.pts[0][0]}, ${e.pts[0][1]}`);
  el.querySelectorAll('[data-irest]').forEach(a2 => a2.onclick = ev2 => { ev2.preventDefault(); popupEst(a2.dataset.irest); });
  q('foto').onclick = () => { map.closePopup(); iniciarFoto(id, true); };
  if (w && (w.s.fotos || []).length){ const dv = document.createElement('div'); dv.className = 'pop-fotos'; dv.innerHTML = tiraFotos(w.s, false); el.querySelector('.botoes').before(dv);
    dv.addEventListener('click', ev2 => { const vf = ev2.target.closest('[data-ver-foto]'); if (vf){ const [a1, b1] = vf.dataset.verFoto.split('|'); verFoto(a1, b1); } }); hidratar(dv); }
  if (q('feito')) q('feito').onclick = () => { map.closePopup(); marcarVisita(id); };
  ligaRegistrar(el, () => ({mun: sede, ...pontoPerto(sede), etapa: emEtapa ? w.e.id : (atual ? atual.id : '')}));
  selId = id; renderLista();
  L.popup({maxWidth:360, autoPanPadding:[20,20]}).setLatLng(latlng || ll(id)).setContent(el).openOn(map);
  desenhaAcesso(id);
}
function popupMun(id, latlng){
  if (reguaClique(latlng)) return;
  buildLOC(); const atual = etapaAtual(), ests = (MUNEST[id] || []);
  const el = document.createElement('div'); el.className = 'pop';
  const lst = ests.map(s => { const w = LOC[s]; return `<li><a href="#" data-est="${s}">${esc(EST[s].nome)}</a> ${tipoBadge(EST[s])} <span class="rot" style="display:inline">${w && w.e ? `${esc(w.e.nome)}, dia ${P[w.e.id].info[w.k].d + 1}` : 'sem etapa'}</span></li>`; }).join('');
  const pern = state.etapas.flatMap(e => P[e.id].noites.map((m, d) => m === id ? `${e.nome}, noite do dia ${d+1}` : null).filter(Boolean));
  el.innerHTML = `<h3>${esc(munNome(id))}</h3><p class="sub">${id === BH ? 'Saída e retorno de todas as etapas.' : (MUN[id].rg ? `Região de ${esc(MUN[id].rg)}.` : `${esc(MUN[id].uf || '')}`)}</p>
    ${lst ? `<p class="rot">Estações com coordenada ou cadastro aqui:</p><ul style="margin:4px 0 6px;padding-left:18px">${lst}</ul>` : ''}
    ${pern.length ? `<p class="rot">Pernoite: ${pern.map(esc).join('; ')}.</p>` : ''}
    <hr><p class="rot">Registrar hospedagem ou parada aqui:</p>${botoesRegistrar()}`;
  el.querySelectorAll('[data-est]').forEach(a => a.onclick = ev => { ev.preventDefault(); popupEst(a.dataset.est); });
  const pt = latlng ? {lat: +latlng.lat.toFixed(6), lon: +latlng.lng.toFixed(6)} : pontoPerto(id);
  ligaRegistrar(el, () => ({mun:id, ...pt, etapa: atual ? atual.id : ''}));
  L.popup({maxWidth:320}).setLatLng(latlng || ll(id)).setContent(el).openOn(map);
}
function menuRegistrar(p, gps){
  const mun = munEm(p.lat, p.lng), atual = etapaAtual();
  const el = document.createElement('div'); el.className = 'pop';
  el.innerHTML = `<h3>${gps ? 'Você está aqui (GPS)' : 'Registrar neste ponto'}</h3><p class="sub">${mun ? esc(munNome(mun)) : 'Fora da área do mapa'} · ${num(p.lat, 5)}, ${num(p.lng, 5)}</p>${gps ? '<p class="sub" style="margin-top:0">Registrar nesta localização:</p>' : ''}${botoesRegistrar()}`;
  ligaRegistrar(el, () => ({mun: mun || '', lat: +p.lat.toFixed(6), lon: +p.lng.toFixed(6), etapa: atual ? atual.id : ''}));
  L.popup({maxWidth:300}).setLatLng(p).setContent(el).openOn(map);
}
function popupApoio(a, latlng){
  if (reguaClique(latlng)) return;
  const T = TIPOS[a.tipo], e = etapaPorId(a.etapa);
  const el = document.createElement('div'); el.className = 'pop';
  el.innerHTML = `<div style="display:flex;gap:10px;align-items:center">${icone(a.tipo, 'cheio')}<div><h3>${esc(a.nome)}</h3><p class="sub" style="margin:0">${T.nome}${a.mun ? ` em ${esc(munNome(a.mun))}` : ''}${e ? `, ${esc(e.nome)}` : ''}</p></div></div>
    ${a.contato ? `<p style="margin:8px 0 0">${esc(a.contato)}</p>` : ''}
    ${a.nota ? `<p class="rot" style="margin-top:4px">${esc(a.nota)}</p>` : ''}<p class="rot" style="margin-top:8px">Arraste o ícone para ajustar a posição.</p>
    <div class="botoes"><button type="button" class="btn primario" data-a="ed">Editar</button><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}">Navegar</a><button type="button" class="btn perigo" data-a="ex">Excluir</button></div>`;
  el.querySelector('[data-a=ed]').onclick = () => { map.closePopup(); abrirFormApoio(a); };
  el.querySelector('[data-a=ex]').onclick = () => { map.closePopup(); excluirApoio(a.uid); };
  L.popup({maxWidth:300}).setLatLng(latlng || [a.lat, a.lon]).setContent(el).openOn(map);
}
map.on('popupclose', () => { acessoLayer.clearLayers(); if (selId){ selId = null; renderLista(); } });
async function desenhaAcesso(id){
  acessoLayer.clearLayers();
  const sede = EST[id].muns[0], key = sede + '>' + id, est = EST[id];
  let g = acessoCache[key];
  const pavA = state.cfg.estrada === 'pav', keyA = (pavA ? 'P|' : '') + key; g = acessoCache[keyA];
  if (!g && pavA && srvPav !== 'off'){ try { const r = await valhalla([sede, id], true); g = acessoCache[keyA] = r.legs[0]; } catch(e){ try { const r = await valhalla([sede, id], false); g = acessoCache[keyA] = r.legs[0]; } catch(e2){} } }
  if (!g && !pavA && srv !== 'off'){
    try { const r = await fetchT(`${OSRM}/route/v1/driving/${[sede, id].map(x => ll(x)[1] + ',' + ll(x)[0]).join(';')}?overview=full&geometries=geojson`, 15000);
      const j = await r.json(); if (j.code === 'Ok') g = acessoCache[keyA] = j.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo]); } catch(e){}
  }
  if (selId !== id) return;
  if (g){
    L.polyline(g, {color:'#fff', weight:7, opacity:.9, interactive:false}).addTo(acessoLayer);
    L.polyline(g, {color:'#7B3FC4', weight:4, dashArray:'8 6', interactive:false}).addTo(acessoLayer);
  }
  L.circleMarker(ll(sede), {radius:6, color:'#7B3FC4', weight:3, fillColor:'#fff', fillOpacity:1}).bindTooltip(`Sede de ${esc(MUN[sede].n)}`, {permanent:true, direction:'top', offset:[0,-6]}).addTo(acessoLayer);
  const a = acesso(id); if (a && a.d > 50) L.polyline([a.loc, est.pts[0]], {color:'#B3261E', weight:3, dashArray:'2 5', interactive:false}).bindTooltip(`${fmtM(a.d)} sem via mapeada`).addTo(acessoLayer);
}
function copiar(txt){
  const ok = () => toast(`Coordenada copiada: ${txt}`);
  if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(txt).then(ok, () => prompt('Copie a coordenada:', txt));
  else prompt('Copie a coordenada:', txt);
}

/* ================= formulário de apoio ================= */
const dApoio = document.getElementById('dApoio'), fApoio = document.getElementById('fApoio');
let editando = null;
document.getElementById('aTipos').innerHTML = Object.entries(TIPOS).map(([k, T]) => `<label style="--t:${T.cor}"><input type="radio" name="aTipo" value="${k}">${icone(k)}${T.nome}</label>`).join('');
fApoio.addEventListener('change', ev => { if (ev.target.name === 'aTipo') document.getElementById('aValorLbl').firstChild.textContent = TIPOS[ev.target.value].valor; });
function abrirFormApoio(a){
  editando = a.uid ? a : {...a, uid:null};
  document.getElementById('dApoioTit').textContent = a.uid ? 'Editar registro' : 'Registrar hospedagem ou parada';
  fApoio.querySelector(`input[value=${a.tipo || 'hosp'}]`).checked = true;
  document.getElementById('aValorLbl').firstChild.textContent = TIPOS[a.tipo || 'hosp'].valor;
  document.getElementById('aNome').value = a.nome || '';
  document.getElementById('aMun').value = a.mun ? munNome(a.mun) : '';
  document.getElementById('aEtapa').innerHTML = opcoesEtapa(a.etapa || '', 'Nenhuma etapa');
  document.getElementById('aContato').value = a.contato || '';
  document.getElementById('aValor').value = a.valor || '';
  document.getElementById('aNota').value = a.nota || '';
  document.getElementById('aPos').textContent = isFinite(a.lat) ? `Posição: ${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}. Depois de salvar, arraste o ícone no mapa para ajustar.` : 'O ícone fica junto à sede do município; arraste no mapa para ajustar.';
  document.getElementById('aExcluir').hidden = !a.uid;
  gastosForm = (a.gastos || []).map(g => ({...g}));
  renderGastosForm();
  dApoio.showModal(); setTimeout(() => document.getElementById('aNome').focus(), 30);
}
fApoio.addEventListener('submit', ev => {
  ev.preventDefault();
  const nome = document.getElementById('aNome').value.trim(); if (!nome){ document.getElementById('aNome').focus(); return; }
  const munTxt = document.getElementById('aMun').value.trim().toLowerCase();
  const mun = porNomeMun[munTxt] || Object.keys(MUN).find(i => MUN[i].n.toLowerCase() === munTxt) || '';
  if (munTxt && !mun){ toast('Município não encontrado. Escolha um nome da lista sugerida.'); return; }
  const r = {tipo: fApoio.querySelector('input[name=aTipo]:checked').value, nome, mun, etapa: document.getElementById('aEtapa').value,
    contato: document.getElementById('aContato').value.trim(), valor: parseFloat(document.getElementById('aValor').value) || 0, nota: document.getElementById('aNota').value.trim(),
    gastos: lerGastosForm()};
  let {lat, lon} = editando;
  if (mun && (!isFinite(lat) || mun !== editando.mun)) ({lat, lon} = pontoPerto(mun));
  if (!isFinite(lat)){ toast('Informe o município ou clique com o botão direito no mapa para escolher o ponto.'); return; }
  snapshot();
  if (editando.uid) Object.assign(state.apoios.find(x => x.uid === editando.uid), r, {lat, lon});
  else state.apoios.push({uid: uid(), ...r, lat, lon});
  dApoio.close(); changed(); toast(`${TIPOS[r.tipo].nome} "${nome}" salva.`, true);
});
document.getElementById('aExcluir').onclick = () => { dApoio.close(); excluirApoio(editando.uid); };
document.querySelectorAll('[data-fechar]').forEach(b => b.onclick = () => b.closest('dialog').close());
/* ---- gastos realizados de cada hospedagem / parada ---- */
let gastosForm = [];
const DICA_GASTO = {hosp:'Ex.: 2 diárias, 3 pessoas', alim:'Ex.: almoço da equipe', comb:'Ex.: 45 L de diesel', desc:'Ex.: café, estacionamento', outro:'Ex.: pedágio, material'};
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
function renderGastosForm(){
  const t = (fApoio.querySelector('input[name=aTipo]:checked') || {}).value || 'hosp';
  const box = document.getElementById('aGastos');
  box.innerHTML = gastosForm.map((g, i) => `<div class="gasto" data-g="${i}">
      <input type="date" value="${esc(g.data || '')}" data-gc="data" aria-label="Data do gasto">
      <input type="text" value="${esc(g.desc || '')}" data-gc="desc" placeholder="${DICA_GASTO[t]}" aria-label="Descrição">
      <input type="text" inputmode="decimal" value="${g.valor ? String(g.valor).replace('.', ',') : ''}" data-gc="valor" placeholder="R$" aria-label="Valor gasto">
      <button type="button" class="remover" data-gx="${i}" title="Remover este gasto" aria-label="Remover gasto">×</button></div>`).join('');
  const tot = gastosForm.reduce((a, g) => a + (parseFloat(String(g.valor).replace(',', '.')) || 0), 0);
  document.getElementById('aGastosTot').textContent = gastosForm.length ? `Total gasto: ${fmtR(tot)}` : 'Nenhum gasto lançado.';
}
function lerGastosForm(){ return gastosForm.map(g => ({data: g.data || '', desc: (g.desc || '').trim(), valor: parseFloat(String(g.valor).replace(',', '.')) || 0})).filter(g => g.valor || g.desc); }
document.getElementById('aGastos').addEventListener('input', ev => { const c = ev.target.dataset.gc; if (!c) return; const i = +ev.target.closest('[data-g]').dataset.g; gastosForm[i][c] = ev.target.value;
  const tot = gastosForm.reduce((a, g) => a + (parseFloat(String(g.valor).replace(',', '.')) || 0), 0); document.getElementById('aGastosTot').textContent = `Total gasto: ${fmtR(tot)}`; });
document.getElementById('aGastos').addEventListener('click', ev => { const x = ev.target.closest('[data-gx]'); if (x){ gastosForm.splice(+x.dataset.gx, 1); renderGastosForm(); } });
document.getElementById('aAddGasto').onclick = () => { gastosForm.push({data: hojeISO(), desc:'', valor:''}); renderGastosForm(); const l = document.querySelectorAll('#aGastos .gasto [data-gc=desc]'); if (l.length) l[l.length - 1].focus(); };
fApoio.addEventListener('change', ev => { if (ev.target.name === 'aTipo') renderGastosForm(); });
const gastoTotal = a => (a.gastos || []).reduce((s, g) => s + (g.valor || 0), 0);
function noitesHotel(a){ let n = 0; state.etapas.forEach(e => P[e.id].hospNoites.forEach(h => { if (h && h.uid === a.uid) n++; })); return n; }
const previsto = a => a.tipo === 'hosp' ? (a.valor || 0) * noitesHotel(a) : (a.valor || 0);
function excluirApoio(id){ const a = state.apoios.find(x => x.uid === id); if (!a) return; snapshot(); state.apoios = state.apoios.filter(x => x.uid !== id); changed(); toast(`"${a.nome}" excluído.`, true); }

/* ================= ações ================= */
function moverPara(id, destId){
  buildLOC(); const w = LOC[id];
  if ((w.e && w.e.id === destId) || (w.pool && !destId)){ toast(`${EST[id].nome} já está aí.`); return; }
  snapshot(); const origem = colocar(id, destId), dest = etapaPorId(destId);
  buildLOC(); if (LOC[id]) LOC[id].s.fixo = !!dest;
  changed(); toast(`${EST[id].nome} saiu de ${origem} e foi para ${dest ? dest.nome : '"Sem etapa"'}. Fica fixado ali (manual) até você liberar.`, true);
}
function marcarVisita(id, valor){
  buildLOC(); const w = LOC[id]; if (!w || !w.e) return;
  const novo = valor !== undefined ? valor : !w.s.feito;
  snapshot(); w.s.feito = novo ? new Date().toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : null; w.s.fts = novo ? Date.now() : 0;
  editRelato = novo ? id : (editRelato === id ? null : editRelato);
  changed(); toast(novo ? `${EST[id].nome} marcada como visitada. Registre as anotações da visita no quadro aberto.` : `Visita de ${EST[id].nome} desmarcada.`, true);
  if (novo){ const ta0 = lista.querySelector(`[data-relato="${id}"] textarea`); if (ta0) ta0.focus({preventScroll:true}); }
  if (novo) setTimeout(() => { const ta = lista.querySelector(`[data-relato="${id}"] textarea`); if (ta){ ta.focus({preventScroll:true}); ta.scrollIntoView({block:'nearest', behavior:'smooth'}); } }, 60);
}
let editRelato = null; const rascunho = {};
function salvarRelato(id){
  buildLOC(); const w = LOC[id]; if (!w) return;
  const v = (rascunho[id] ?? w.s.relato ?? '').trim(); delete rascunho[id]; editRelato = null;
  if (v !== (w.s.relato || '')){ snapshot(); w.s.relato = v; changed(); toast(v ? `Anotações de ${EST[id].nome} salvas.` : `Anotações de ${EST[id].nome} apagadas.`, true); }
  else render();
}
function caixaRelato(s){
  const est = EST[s.id];
  if (editRelato === s.id) return `<div class="relato" data-relato="${s.id}">
      <label for="rel-${s.id}">Anotações da visita a ${esc(est.nome)}</label>
      <textarea id="rel-${s.id}" rows="3" placeholder="Estado da estação e do acesso, leituras, manutenção feita, problemas, contato com o observador, pendências…">${esc(rascunho[s.id] ?? s.relato ?? '')}</textarea>
      ${tiraFotos(s, true)}
      <div class="relato-bt"><button type="button" class="btn primario peq" data-salvar-relato="${s.id}">Salvar anotações</button><button type="button" class="btn peq" data-fechar-relato="${s.id}">Fechar</button></div></div>`;
  const nf = (s.fotos || []).length;
  if (!s.feito) return nf ? `<div class="relato-fotos">${tiraFotos(s, false)}</div>` : '';
  return (s.relato ? `<div class="relato-txt" data-editar-relato="${s.id}" title="Editar anotações e fotos"><b>Anotações:</b> ${esc(s.relato)}<span>editar</span></div>`
                  : `<button type="button" class="relato-add" data-editar-relato="${s.id}">+ Anotações e fotos da visita</button>`) + (nf ? `<div class="relato-fotos">${tiraFotos(s, false)}</div>` : '');
}
function desfazer(){ if (!undoStack.length) return; state = normaliza(JSON.parse(undoStack.pop())); state.auto = null; save(); syncCfg(); render(); scheduleRoutes(); }
function irPara(aba){ map.closePopup(); if (aba !== 'geral') setModoSel(false); state.aba = aba; focusDay = null; selId = null; save(); render(); fitAtual(); document.getElementById('rolagem').scrollTop = 0; }

/* ================= painel ================= */
const lista = document.getElementById('lista');
function ptDia(e, id){ if (id === BH || isEst(id)) return ll(id); const h = hospDe(e, id); return h ? [h.lat, h.lon] : ll(id); }
const LETRA = i => String.fromCharCode(65 + i);
const gmUrl = pts => 'https://www.google.com/maps/dir/' + pts.map(x => x ? x.map(v => (+v).toFixed(6)).join(',') : '').join('/') + '/data=!4m2!4m1!3e0';
const gmIr = p => `https://www.google.com/maps/dir/?api=1&destination=${p[0]},${p[1]}&travelmode=driving`;
/* Monta os links do dia. O Google Maps nomeia os pontos com letras (A, B, C...), sempre a partir do primeiro ponto
   do link; cada link leva no máximo 10 pontos. Se já há paradas visitadas no dia, o link passa a sair da posição atual
   do celular (origem vazia) e segue só pelas paradas que faltam: as letras são recalculadas. */
function gmPlano(e, D){
  const ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
  const feitos = ks.filter(k => e.stops[k].feito).length, pend = ks.filter(k => !e.stops[k].feito);
  const continuar = feitos > 0;
  const nos = continuar ? [{ini:true, rot:'Sua localização', pt:null}, ...pend.map(k => ({k, pt:ll(e.stops[k].id)}))]
                        : [{ini:true, rot: D.from === BH ? BASE_N : `${MUN[D.from].n} (pernoite)`, pt:ptDia(e, D.from)}, ...ks.map(k => ({k, pt:ll(e.stops[k].id)}))];
  nos.push({fim:true, rot: D.to === BH ? BASE_N : `${MUN[D.to].n} (pernoite)`, pt:ptDia(e, D.to)});
  const partes = [], letra = {};
  for (let i = 0; i < nos.length - 1; i += 9){
    const sl = nos.slice(i, i + 10), n = partes.length;
    sl.forEach((x, j) => { if (x.k !== undefined && !(j === 0 && i > 0)) letra[x.k] = {l: LETRA(j), parte: n}; });
    partes.push({url: gmUrl(sl.map(x => x.pt)), legenda: sl.map((x, j) => ({l: LETRA(j), x}))});
  }
  return {partes, letra, continuar, feitos, faltam: pend.length, completo: continuar ? gmUrl([ptDia(e, D.from), ...ks.map(k => ll(e.stops[k].id)), ptDia(e, D.to)].slice(0, 10)) : null};
}
function linksGoogle(e, D){ return gmPlano(e, D).partes.map(x => x.url); }
const miniApoios = lst => lst.length ? `<span class="mini">${lst.map(a => `<span class="icmini">${icone(a.tipo)}${esc(a.nome)}</span>`).join('')}</span>` : '';
function itemApoio(a, comEtapa){
  const e = etapaPorId(a.etapa);
  return `<div class="apoio" data-apoio="${a.uid}">${icone(a.tipo, 'cheio')}<div><b>${esc(a.nome)}</b><span>${TIPOS[a.tipo].nome}${a.mun ? ` em ${esc(MUN[a.mun].n)}` : ''}${comEtapa && e ? `, ${esc(e.nome)}` : ''}${a.contato ? `. ${esc(a.contato)}` : ''}</span></div>
    <button class="remover" data-exapoio="${a.uid}" title="Excluir" aria-label="Excluir ${esc(a.nome)}">×</button><span class="sr-busca">${esc([a.nota, ...(a.gastos || []).map(g => g.desc)].filter(Boolean).join(' '))}</span></div>`;
}
function secaoApoios(lst, comEtapa){
  const ets = comEtapa ? state.etapas : [etapaAtual()].filter(Boolean);
  const usados = new Set();
  const noites = ets.flatMap(e => { const p = P[e.id]; return p.days.slice(0, -1).map((D, d) => {
    const ho = hospDe(e, D.to); if (ho) usados.add(ho.uid);
    const lastId = D.j > D.i ? e.stops[D.j-1].id : null, manualCidade = lastId && e.pern && e.pern[lastId];
    return `<div class="pern-item">
      <span class="tagmodo ${manualCidade ? 'man' : 'aut'}" title="${manualCidade ? 'Cidade de pernoite escolhida por você' : 'Cidade calculada pelo roteiro: muda quando a etapa é otimizada'}">${manualCidade ? 'manual' : 'auto'}</span>
      <div class="pern-txt"><b>${esc(MUN[D.to].n)}</b><span>${comEtapa ? `${esc(e.nome)}, ` : ''}noite do dia ${d+1}${D.data ? ` (${fmtDS(D.data)})` : ''}</span></div>
      ${ho ? `<button class="chip" data-apoio="${ho.uid}" title="Hospedagem registrada por você">${icone('hosp', 'cheio')}${esc(ho.nome)}</button>` : `<button class="chip sem" data-hosp="${D.to}" data-et="${e.id}">${icone('hosp')}Registrar</button>`}</div>`; }); });
  const reg = lst.map(a => { const solta = a.tipo === 'hosp' && !usados.has(a.uid);
    return itemApoio(a, comEtapa).replace('<div><b>', `<div><span class="tagmodo man" title="Registrado por você; não muda ao otimizar">manual</span><b>`).replace('</span></div>\n', `${solta ? '<span class="solta">Não é pernoite no roteiro atual (mudou ao otimizar). Mantido até você excluir.</span>' : ''}</span></div>\n`); }).join('');
  return `<h4 class="sec-t">Pernoites do roteiro <small>calculados automaticamente; atualizam ao otimizar</small></h4>
    ${noites.length ? noites.join('') : '<p class="dica">Sem pernoites: cada etapa termina no mesmo dia.</p>'}
    <h4 class="sec-t">Registrados por você <small>não mudam ao otimizar</small></h4>
    <div class="registrar">${Object.keys(TIPOS).map(t => `<button type="button" data-novo="${t}" style="--t:${TIPOS[t].cor}">${icone(t)}${TIPOS[t].nome}</button>`).join('')}</div>
    ${reg || '<p class="dica">Nenhum registro ainda. Use os botões acima, "Registrar" em cada pernoite ou clique com o botão direito no mapa.</p>'}`;
}
/* ---- duração da visita por estação (ajuste manual; "Padrão" volta para a premissa) ---- */
let durAberto = null;
const infoDe = id => { const w = LOC[id]; return w && w.e && P[w.e.id] ? P[w.e.id].info[w.k] : null; };
function tempoVisita(id){ buildLOC(); const w = LOC[id]; if (!w) return state.cfg.visita; const inf = infoDe(id); return inf && inf.junto ? (+w.s.extra || 0) : visitaH(w.s); }
function durHTML(id){
  buildLOC(); const w = LOC[id]; if (!w) return ''; const inf = infoDe(id), v = tempoVisita(id);
  if (inf && inf.junto){ const ant = w.e.stops[w.k - 1].id;
    return `<div class="dur-ed" data-durid="${id}"><b>Tempo extra em ${esc(EST[id].nome)} ${tipoBadge(EST[id])}, além da visita feita junto com ${esc(EST[ant].nome)} ${tipoBadge(EST[ant])}</b>
      <div class="dur-op">${[0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3].map(h => `<button type="button" data-durv="${h}" aria-pressed="${Math.abs(h - v) < 1e-6}">${h ? '+' + fmtH(h) : 'Sem tempo extra'}</button>`).join('')}</div>
      <div class="dur-l"><label>Outro, em horas <input type="text" inputmode="decimal" value="${num(v, v % 1 ? 2 : 0)}" data-durin="${id}"></label><button type="button" data-durfechar>Fechar</button></div></div>`; }
  const man = w.s.visita != null, prox = P[w.e.id] && P[w.e.id].info[w.k + 1] && P[w.e.id].info[w.k + 1].junto ? w.e.stops[w.k + 1].id : null;
  return `<div class="dur-ed" data-durid="${id}"><b>Tempo de visita em ${esc(EST[id].nome)} ${tipoBadge(EST[id])}${prox ? ` (a ${tipoBadge(EST[prox])} do mesmo local é visitada junto)` : ''}</b>
    <div class="dur-op">${[0.5, 1, 1.5, 2, 3, 4, 5, 6].map(h => `<button type="button" data-durv="${h}" aria-pressed="${man && Math.abs(h - v) < 1e-6}">${fmtH(h)}</button>`).join('')}</div>
    <div class="dur-l"><label>Outro, em horas <input type="text" inputmode="decimal" value="${num(v, v % 1 ? 2 : 0)}" data-durin="${id}"></label>
      <button type="button" data-durv="pad" aria-pressed="${!man}">Padrão (${fmtH(state.cfg.visita)})</button><button type="button" data-durfechar>Fechar</button></div></div>`;
}
function setDur(id, val){
  buildLOC(); const w = LOC[id]; if (!w) return; const inf = infoDe(id), junto = inf && inf.junto;
  let novo = val === 'pad' ? null : Math.max(0, Math.min(12, Math.round(parseFloat(String(val).replace(',', '.')) * 4) / 4));
  if (novo !== null && !isFinite(novo)){ toast('Informe o tempo em horas, por exemplo 2 ou 1,5.'); return; }
  if (junto){ if (!novo) novo = null; if ((w.s.extra || null) === novo) return; snapshot(); w.s.extra = novo; changed();
    toast(novo ? `${EST[id].nome}: +${fmtH(novo)} de tempo extra, além da visita conjunta. Fica gravado mesmo quando as rotas forem recalculadas.` : `${EST[id].nome}: sem tempo extra (só a visita conjunta).`, true); return; }
  if (w.s.visita === novo) return;
  snapshot(); w.s.visita = novo; changed();
  toast(novo === null ? `${EST[id].nome}: tempo de visita voltou ao padrão (${fmtH(state.cfg.visita)}).` : `${EST[id].nome}: tempo de visita ajustado para ${fmtH(novo)}. Os horários da etapa foram recalculados.`, true);
}
function itemEst(e, k, s, p, off, gp){
  const est = EST[s.id], inf = p.info[k], c = corDia(inf.d), a = acesso(s.id), lt = gp && gp.letra[k];
  const gm = s.feito ? '' : `<a class="gm" href="${gmIr(ll(s.id))}" target="_blank" rel="noopener" title="${lt ? `Letra ${lt.l} no link do dia${gp.partes.length > 1 ? ` (parte ${lt.parte + 1})` : ''}. ` : ''}Toque para navegar direto até esta estação">${lt ? lt.l + (gp.partes.length > 1 ? `<sub>${lt.parte + 1}</sub>` : '') : '↗'}</a>`;
  const ap = state.apoios.filter(x => x.etapa === e.id && est.muns.includes(x.mun) && x.tipo !== 'hosp');
  const alertas = [];
  if (a && a.nivel !== 'ok') alertas.push(a.nivel === 'sem' ? `Sem via mapeada: a mais próxima fica a ${fmtM(a.d)}` : `Último trecho de ${fmtM(a.d)} sem via mapeada`);
  if (est.par){ const vz = est.viz.find(v => v[0] === est.par); alertas.push(`Junto com a ${tipoTxt(EST[est.par]).toLowerCase()} ${EST[est.par].cod[0]}${vz ? (vz[1] < 5 ? ', mesmo local' : `, a ${fmtM(vz[1])}`) : ''}`); }
  return `<div class="stop${selId === s.id ? ' sel' : ''}${off ? ' esmaecido' : ''}${s.feito ? ' feito' : ''}${inf.conj ? ' conj-st' : ''}" style="--c:${c}" data-id="${s.id}">
    <span class="alca" title="Arraste para mudar a ordem" aria-hidden="true"><svg width="10" height="16" viewBox="0 0 10 16"><g fill="currentColor"><circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/></g></svg></span>
    <span class="mk ${est.cls}${a && a.nivel !== 'ok' ? (a.nivel === 'sem' ? ' sem' : ' av') : ''} lista" style="--c:${c}">${k+1}</span>
    <span class="nome"><b>${gm}<span class="t">${esc(porMun() ? MUN[munDe(s.id)].n : est.nome)}</span>${tipoBadge(est)}${s.fixo ? `<button type="button" class="fixo" data-fixo="${s.id}" title="Colocado manualmente nesta etapa: o Otimizar do Quadro geral não o move. Clique para liberar.">manual</button>` : ''}</b>
      ${porMun() ? `<span class="sub-est">${esc(est.nome)}</span>` : ''}
      <span>${inf.conj ? `<button type="button" class="sem-hora" data-dur="${s.id}" aria-expanded="${durAberto === s.id}" title="Mesma visita da parada anterior (estação no mesmo local): não conta hora própria. Toque para acrescentar um tempo extra.">⏱ sem hora · mesma visita da anterior</button>` : `<span class="hor">${fmtHora(inf.cheg)}–${fmtHora(inf.said)}</span>`}${inf.conj ? '' : inf.junto ? `<button type="button" class="dur man" data-dur="${s.id}" aria-expanded="${durAberto === s.id}" title="Tempo extra nesta estação, além da visita conjunta. Toque para mudar.">⏱ +${fmtH(inf.extra)} extra</button>` : `<button type="button" class="dur${s.visita != null ? ' man' : ''}" data-dur="${s.id}" aria-expanded="${durAberto === s.id}" title="Tempo de visita nesta estação. Toque para mudar.">⏱ ${fmtH(tempoVisita(s.id))}</button>`}${inf.conj ? '' : (p.info[k+1] && p.info[k+1].junto ? '<span class="conj-s" title="O tempo desta visita já inclui a estação seguinte, no mesmo local">inclui a seguinte</span>' : '')}, ${esc(estMun(est))}, +${fmtKm(inf.leg.km)} km (${fmtH(inf.leg.h)})${inf.leg.est ? ' est.' : ''}</span>
      <span>${esc(est.cod.join(' / '))}${est.rio ? `, ${esc(est.rio)}` : ''}</span>
      ${alertas.length ? `<span class="${a && a.nivel !== 'ok' ? 'alerta' : ''}">${alertas.join('; ')}</span>` : ''}
      ${s.feito ? `<span class="ok">Visitada em ${esc(s.feito)}</span>` : ''}
      ${s.nota ? `<span class="nota">${esc(s.nota)}</span>` : ''}${miniApoios(ap)}</span>
    <span class="acoes-st"><button class="visto${s.feito ? ' on' : ''}" data-feito="${s.id}" title="${s.feito ? 'Desmarcar visita' : 'Marcar como visitada'}" aria-pressed="${!!s.feito}" aria-label="${s.feito ? 'Desmarcar visita de' : 'Marcar como visitada:'} ${esc(est.nome)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
    <button class="remover" data-rem="${s.id}" title="Tirar desta etapa" aria-label="Tirar ${esc(est.nome)} desta etapa">×</button></span>${durAberto === s.id ? durHTML(s.id) : ''}${caixaRelato(s)}</div>`;
}
function pausaHTML(z, off){
  const c = state.cfg, txt = z.tipo === 'almoco' ? `Almoço: ${fmtH(+c.alm || 0)}${+c.almDesl ? ` + ${fmtH(+c.almDesl)} de deslocamento até o restaurante` : ''}` : `Lanche: ${fmtH(z.dur)}`;
  return `<div class="ponta pausa${off ? ' esmaecido' : ''}"><span class="hora">${fmtHora(z.ini)}</span><span class="pz-ic" aria-hidden="true">${z.tipo === 'almoco' ? '🍽' : '☕'}</span><span>${txt} <span class="rot" style="display:inline">(hora parada, até ${fmtHora(z.ini + z.dur)})</span></span></div>`;
}
function renderLista(){
  const e = etapaAtual(); if (!e) return;
  const p = P[e.id];
  if (!e.stops.length){ lista.innerHTML = '<div class="vazio">Etapa vazia. Traga pontos pela busca acima, pelo mapa ou pelo Quadro geral.</div>'; return; }
  let h = '';
  p.days.forEach((D, d) => {
    const c = corDia(d), gp = gmPlano(e, D), off = focusDay !== null && focusDay !== d;
    const leg = gp.partes.map((pt, n) => `<span class="gmleg">${gp.partes.length > 1 ? `<b>Parte ${n+1}:</b> ` : ''}${pt.legenda.map(({l, x}) => `<span><i>${l}</i>${x.k !== undefined ? x.k + 1 : esc(x.rot)}</span>`).join('')}</span>`).join('');
    const tudoFeito = gp.feitos && !gp.faltam;
    h += `<div class="dia${focusDay === d ? ' ativo' : ''}" style="--c:${c}" data-dia="${d}" tabindex="0" role="button" aria-label="Mostrar só o dia ${d+1} no mapa">
      <h2>Dia ${d+1}${D.data ? `<span class="data">${fmtDS(D.data)}</span>` : ''}<small>${fmtKm(D.km)} km, ${fmtH(D.drive)} de estrada</small></h2>
      ${(() => { const rg = routeCache[p.key]; if (!rg || !rg.terra) return ''; const t = D.legs.filter(l => rg.terra[p.legs.indexOf(l)]); return t.length ? `<p class="terra-d">Estrada de terra sem alternativa: ${t.map(l => `${esc(nomeNo(l.a))} → ${esc(nomeNo(l.b))}`).join('; ')}</p>` : ''; })()}
      <p class="${D.excede ? 'excede' : ''}">${D.j - D.i} ${D.j - D.i === 1 ? 'ponto' : 'pontos'}${(() => { const nc = p.info.slice(D.i, D.j).filter(x => x && x.conj).length; return nc ? ` (${D.j - D.i - nc} ${D.j - D.i - nc === 1 ? 'visita' : 'visitas'}: ${nc} sem hora própria)` : ''; })()}, das ${fmtHora(D.saida)} às ${fmtHora(D.chegada)}${D.excede ? `, passa do fim da jornada (${fmtHora(state.cfg.fim)})` : ''}.</p>
      ${gp.feitos ? `<p class="okd">${tudoFeito ? 'Todas as paradas do dia visitadas.' : `${gp.feitos} de ${gp.feitos + gp.faltam} paradas visitadas. O link abaixo sai da sua localização atual e segue pelas que faltam.`}</p>` : ''}
      <div class="gmaps">${gp.partes.map((x, i) => `<a class="gmbtn" href="${x.url}" target="_blank" rel="noopener">${gp.continuar ? 'Continuar o dia' : 'Abrir o dia'} no Google Maps${gp.partes.length > 1 ? ` (parte ${i+1})` : ''}</a>`).join('')}
        ${gp.completo ? `<a href="${gp.completo}" target="_blank" rel="noopener">rota completa do dia</a>` : ''}</div>
      <div class="gmlegs" title="Letras que o Google Maps mostra e o número da parada correspondente no roteiro">${leg}</div></div>`;
    const hIni = D.from === BH ? null : hospDe(e, D.from);
    h += `<div class="ponta${off ? ' esmaecido' : ''}"><span class="hora">${fmtHora(D.saida)}</span>${D.from === BH ? `<span class="bh">${BASE_S}</span>` : `<span class="cama">${svgTipo('hosp')}</span>`}<span>Saída de <b>${esc(nomeNo(D.from))}</b>${hIni ? ` (${esc(hIni.nome)})` : ''}</span></div>`;
    const pz = x => D.pausas.filter(z => z.x === x).map(z => pausaHTML(z, off)).join('');
    h += pz(0);
    for (let k = D.i; k < D.j; k++) h += itemEst(e, k, e.stops[k], p, off, gp) + pz(k - D.i + 1);
    const ult = D.legs[D.legs.length-1];
    if (D.to === BH) h += `<div class="ponta${off ? ' esmaecido' : ''}"><span class="hora">${fmtHora(D.chegada)}</span><span class="bh">${BASE_S}</span><span>Chegada em <b>${esc(BASE_N)}</b>, +${fmtKm(ult.km)} km (${fmtH(ult.h)})</span></div>`;
    else {
      const lastId = D.j > D.i ? e.stops[D.j-1].id : null, ho = hospDe(e, D.to);
      const sel = lastId ? `<select data-pern="${lastId}" aria-label="Cidade de pernoite">${cidadesPerto(lastId, D.to).map(x => `<option value="${x.id}"${x.id === D.to ? ' selected' : ''}>${esc(MUN[x.id].n)} (${Math.round(x.d)} km)</option>`).join('')}</select>` : `<b>${esc(MUN[D.to].n)}</b>`;
      h += `<div class="ponta${off ? ' esmaecido' : ''}" style="flex-wrap:wrap"><span class="hora">${fmtHora(D.chegada)}</span><span class="cama">${svgTipo('hosp')}</span><span>Pernoite em ${sel} +${fmtKm(ult.km)} km (${fmtH(ult.h)})</span>
        ${ho ? `<button class="chip" data-apoio="${ho.uid}">${icone('hosp', 'cheio')}${esc(ho.nome)}</button>` : `<button class="chip sem" data-hosp="${D.to}">${icone('hosp')}Registrar hospedagem</button>`}</div>`;
    }
  });
  const ativo = document.activeElement, foco = ativo && ativo.closest && ativo.closest('[data-relato]') ? [ativo.closest('[data-relato]').dataset.relato, ativo.selectionStart, ativo.selectionEnd] : null;
  lista.innerHTML = h; hidratar(lista);
  if (foco){ const ta = lista.querySelector(`[data-relato="${foco[0]}"] textarea`); if (ta){ ta.focus({preventScroll:true}); try { ta.setSelectionRange(foco[1], foco[2]); } catch(e){} } }
}
let avisosAbertos = false;
document.addEventListener('click', ev => { const sm = ev.target.closest && ev.target.closest('.avisos > summary'); if (sm) avisosAbertos = !sm.parentElement.open; }, true);
function renderEtapa(){
  const e = etapaAtual(), p = P[e.id], ativo = document.activeElement;
  const sv = (id, v) => { const el = document.getElementById(id); if (el !== ativo) el.value = v ?? ''; };
  sv('eNome', e.nome); sv('eInicio', e.inicio); sv('eDias', e.dias || '');
  document.getElementById('eDias').placeholder = `auto (${p.days.length})`;
  const av = [];   // [rótulo curto, texto completo]
  if (p.diasAjust) av.push([`${p.diasAjust.usado} dias (pedido ${p.diasAjust.pedido})`, `Em ${p.diasAjust.pedido} ${p.diasAjust.pedido === 1 ? 'dia' : 'dias'} as visitas passariam das ${fmtHora(state.cfg.fim)}. Para respeitar a jornada, o roteiro usa ${p.diasAjust.usado} dias. Para manter ${p.diasAjust.pedido}, mova pontos para outra etapa ou reduza o tempo por ponto.`]);
  if (p.days.some(D => D.excede)) av.push([`jornada até ${fmtHora(p.maxFim)}`, `Algum dia passa das ${fmtHora(state.cfg.fim)} (chegada às ${fmtHora(p.maxFim)}). ${e.dias ? 'Aumente os dias' : 'Mova pontos para outra etapa'} ou ajuste as premissas.`]);
  if (p.acessoAviso.length) av.push([`${p.acessoAviso.length} ${p.acessoAviso.length === 1 ? 'acesso' : 'acessos'} a confirmar`, `Acesso a confirmar: ${p.acessoAviso.map(id => EST[id].nome).join(', ')}.`]);
  const falta = p.hospNoites.filter(x => !x).length;
  if (p.noites.length && falta) av.push([`${falta} sem hospedagem`, `${falta} de ${p.noites.length} pernoites sem hospedagem registrada.`]);
  document.getElementById('eAviso').innerHTML = av.length ? `<details class="avisos"${avisosAbertos ? ' open' : ''}><summary><span class="n">${av.length}</span><span class="rs">${av.map(x => esc(x[0])).join(' · ')}</span></summary><ul>${av.map(x => `<li>${esc(x[1])}</li>`).join('')}</ul></details>` : '';
  renderLista();
  const ap = apoiosDe(e); document.getElementById('apoiosEtapaN').textContent = ap.length ? `(${ap.length})` : '';
  document.getElementById('apoiosEtapa').innerHTML = secaoApoios(ap, false); if (typeof aplicarBuscaAp === 'function') aplicarBuscaAp();
}
function sobreposicoes(){
  const iv = state.etapas.map(e => ({e, p:P[e.id]})).filter(x => x.e.inicio && x.p.days.length).map(x => ({e:x.e, a:x.p.days[0].data, b:x.p.fim}));
  const out = {}; iv.forEach(x => iv.forEach(y => { if (x !== y && x.a <= y.b && y.a <= x.b) (out[x.e.id] = out[x.e.id] || []).push(y.e.nome); })); return out;
}
function renderGeral(){
  const sob = sobreposicoes(); let h = '';
  state.etapas.forEach(e => {
    const p = P[e.id], hs = p.hospNoites.filter(Boolean), custo = hs.reduce((a, x) => a + (x.valor || 0), 0);
    const av = [];
    if (p.diasAjust) av.push(`Precisa de ${p.diasAjust.usado} dias para caber na jornada (definido: ${p.diasAjust.pedido}).`);
    if (p.days.some(D => D.excede)) av.push(`Um dia termina às ${fmtHora(p.maxFim)}, depois do fim da jornada.`);
    if (p.acessoAviso.length) av.push(`${p.acessoAviso.length} com acesso a confirmar.`);
    if (sob[e.id]) av.push(`Datas se sobrepõem a ${sob[e.id].join(', ')}.`);
    const nomes = porMun() ? Object.entries(grupoMun(e.stops.map(x => x.id))).map(([m, ids]) => `${MUN[m].n}${ids.length > 1 ? ` (${ids.length})` : ''}`) : e.stops.map(x => EST[x.id].nome);
    const nFix = e.stops.filter(x => x.fixo).length;
    h += `<div class="card" style="--c:${e.cor}" data-abrir="${e.id}" tabindex="0" role="button" aria-label="Abrir ${esc(e.nome)}">
      <div class="card-top"><b>${esc(e.nome)}</b><span class="periodo">${periodo(p) || 'sem data'}</span></div>
      <div class="card-nums"><span><b>${e.stops.length}</b> ${e.stops.length === 1 ? 'estação' : 'estações'}</span><span><b>${p.days.length}</b> ${p.days.length === 1 ? 'dia' : 'dias'}${p.diasAjust ? ` (pedido: ${p.diasAjust.pedido})` : e.dias ? ' (fixo)' : ''}</span><span><b>${fmtKm(p.tot.km)}</b> km</span><span><b>${fmtHc(p.tot.h)}</b> ao volante</span></div>
      <div class="card-apoio"><span class="icmini tagmodo ${e.ordem === 'manual' ? 'man' : 'aut'}" title="${e.ordem === 'manual' ? 'A ordem foi mudada à mão. Otimizar dentro da etapa refaz.' : 'Ordem calculada pelo otimizador.'}">${e.ordem === 'manual' ? 'ordem manual' : 'ordem otimizada'}</span>${nFix ? `<span class="icmini tagmodo man" title="Pontos colocados à mão nesta etapa; o Otimizar do Quadro geral não os move">${nFix} ${nFix === 1 ? 'fixado' : 'fixados'}</span>` : ''}${p.noites.length ? `<span class="icmini">${icone('hosp')}${hs.length} de ${p.noites.length} pernoites com hospedagem</span>` : '<span class="icmini">Sem pernoite</span>'}</div>
      <p class="card-cidades">${nomes.slice(0, 10).map(esc).join(', ')}${nomes.length > 10 ? ` e mais ${nomes.length - 10}` : ''}${nomes.length ? '' : 'Nenhum ponto ainda.'}</p>
      ${av.length ? `<p class="aviso">${av.map(esc).join(' ')}</p>` : ''}</div>`;
  });
  if (state.etapas.length){
  } else h = '<div class="vazio">Nenhuma etapa ainda. Crie uma no botão "+ Etapa" e clique em Otimizar para distribuir os pontos.</div>';
  document.getElementById('cards').innerHTML = h;
  document.getElementById('poolBox').innerHTML = state.pool.length ? `<p class="aviso"><b>${state.pool.length} pontos sem etapa.</b> Distribua em "Planejar pontos" (abaixo), clique em Otimizar para encaixá-los automaticamente, ou clique nos marcadores brancos do mapa.</p>` : '';
  renderPlanner();
  document.getElementById('apoiosGeralN').textContent = state.apoios.length ? `(${state.apoios.length})` : '';
  document.getElementById('apoiosGeral').innerHTML = secaoApoios(state.apoios, true); if (typeof aplicarBuscaAp === 'function') aplicarBuscaAp();
}
function renderAbas(){
  const nav = document.getElementById('abas');
  nav.innerHTML = `<button class="aba" role="tab" data-aba="geral" aria-selected="${state.aba === 'geral'}">Quadro geral</button>` +
    state.etapas.map(e => `<button class="aba" role="tab" data-aba="${e.id}" aria-selected="${state.aba === e.id}" style="--c:${e.cor}"><span class="dot"></span>${esc(e.nome)}</button>`).join('') +
    '<button class="aba nova" data-aba="+" title="Criar etapa vazia">+ Etapa</button>';
  const sel = nav.querySelector('[aria-selected=true]');
  if (sel){ const l = sel.offsetLeft - nav.offsetLeft, r = l + sel.offsetWidth; if (l < nav.scrollLeft) nav.scrollLeft = l - 8; else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth + 8; }
}
function set4(km, h, d, n, nEst){ document.getElementById('nKm').textContent = fmtKm(km); document.getElementById('nH').textContent = fmtHc(h); document.getElementById('nDias').textContent = d; document.getElementById('nPts').textContent = n; document.getElementById('nPtsL').textContent = 'estações'; document.getElementById('nPtsL').title = `${n} pontos de visita, ${nEst} estações`; }
function renderTopo(){
  const e = etapaAtual(), h1 = document.getElementById('tTitulo');
  if (e){ const p = P[e.id];
    h1.innerHTML = `<span class="dot" style="--c:${e.cor}"></span>${esc(e.nome)}`;
    document.getElementById('tSub').textContent = `Saída e retorno em ${BASE_N}` + (periodo(p) ? `, ${periodo(p)}` : '') + (e.ordem === 'manual' ? ' · ordem manual' : ' · ordem otimizada');
    set4(p.tot.km, p.tot.h, p.days.length, e.stops.length, p.nEst);
  } else {
    h1.textContent = 'Quadro geral';
    const t = state.etapas.reduce((a, x) => { const p = P[x.id]; return {km:a.km + p.tot.km, h:a.h + p.tot.h, d:a.d + p.days.length}; }, {km:0, h:0, d:0});
    document.getElementById('tSub').textContent = `${ORDEM.length} estações em ${state.etapas.length} ${state.etapas.length === 1 ? 'etapa' : 'etapas'}, todas saindo e voltando a ${BASE_N}`;
    set4(t.km, t.h, t.d, ORDEM.length, N_EST);
  }
}
function setStatus(){
  const el = document.getElementById('status');
  const algumEst = state.etapas.some(e => P[e.id] && P[e.id].estimado);
  let k = srv; if (progresso) k = 'tabela'; else if (routeBusy) k = 'rota'; else if (srv === 'ok' && algumEst) k = 'parcial';
  const pav = state.cfg.estrada === 'pav', nTerra = pav ? state.etapas.reduce((a, e) => { const r = P[e.id] && routeCache[P[e.id].key]; return a + (r && r.terra ? r.terra.filter(Boolean).length : 0); }, 0) : 0;
  const semRotaPav = pav && state.etapas.some(e => e.stops.length && P[e.id] && !routeCache[P[e.id].key]);
  if (pav && !progresso){ k = routeBusy ? 'rotaPav' : srvPav === 'off' ? 'pavOff' : semRotaPav ? 'rotaPav' : nTerra ? 'pavTerra' : 'pavOk'; }
  const txt = {
    pendente: ['busy', 'Consultando distâncias pelas estradas…'],
    tabela: ['busy', `Consultando distâncias pelas estradas (${progresso})…`],
    rota: ['busy', 'Traçando o caminho pelas estradas…'],
    ok: ['ok', 'Distâncias reais pelas estradas (OSRM)'],
    parcial: ['ok', 'Parte das distâncias ainda estimada'],
    off: ['off', 'Sem serviço de rotas: distâncias estimadas'],
    salvo: ['ok', 'Distâncias pelas estradas (salvas no arquivo)'],
    rotaPav: ['busy', 'Traçando rotas pavimentadas… (tracejado = provisório)'],
    pavOk: ['ok', 'Rotas só por estradas pavimentadas'],
    pavTerra: ['off', `Só pavimentadas: ${nTerra} ${nTerra === 1 ? 'trecho sem' : 'trechos sem'} alternativa asfaltada`],
    pavOff: ['off', 'Rotas pavimentadas: serviço lento, tentando de novo (tracejado = provisório)']
  }[k === 'off' && state.etapas.length && !algumEst ? 'salvo' : k];
  el.className = 'status ' + txt[0]; el.querySelector('span').textContent = (navigator.onLine === false ? 'Sem internet · ' : '') + (navigator.onLine === false && txt[0] === 'busy' ? 'usando os dados guardados' : txt[1]);
  el.title = pav ? 'Rotas calculadas pelo Valhalla (dados OpenStreetMap) evitando estradas de terra. A terra só é usada no início ou no fim (acesso à estação) ou onde não existe alternativa asfaltada, marcada em marrom pontilhado no mapa.' : ({ok:'Km e tempos vêm das estradas reais, até a via mapeada mais próxima de cada estação.', off:'O serviço de rotas não respondeu: km = linha reta × 1,3 e o acesso às estações não foi verificado.'})[txt[0]] || txt[1];
}
function render(){
  buildLOC(); P = {}; state.etapas.forEach(e => P[e.id] = buildPlan(e));
  const e = etapaAtual();
  if (!e || (focusDay !== null && focusDay >= P[e.id].days.length)) focusDay = null;
  document.getElementById('vGeral').hidden = !!e; document.getElementById('vEtapa').hidden = !e;
  if (document.getElementById('bExcluirTopo').hidden !== !e) resetExcluir();
  document.getElementById('bExcluirTopo').hidden = !e;
  document.getElementById('mInverter').hidden = !e; document.getElementById('mLimpar').hidden = !e || !e.stops.some(s => s.feito);
  document.getElementById('bOtimizar').querySelector('span').textContent = 'Otimizar';
  document.getElementById('bOtimizar').title = e ? 'Reordena os pontos desta etapa para o menor tempo de estrada' : 'Reordena os pontos de cada etapa, sem trocar pontos de etapa';
  document.getElementById('bDesfazer').disabled = !undoStack.length;
  document.getElementById('vModo').value = state.vista || 'est';
  /* no celular, o painel detalhado só é montado quando está aberto (Planejamento completo): o app fica leve */
  const cl = document.documentElement.classList, painelVisivel = !cl.contains('celular') || cl.contains('plan-aberto');
  setStatus();
  if (painelVisivel){ renderAbas(); renderTopo(); if (e) renderEtapa(); else renderGeral(); }
  renderMapa();
}

/* eventos do painel */
document.getElementById('abas').addEventListener('click', ev => {
  const b = ev.target.closest('[data-aba]'); if (!b) return;
  if (b.dataset.aba === '+'){ snapshot(); const e = novaEtapa(state.etapas); state.etapas.push(e); state.aba = e.id; changed(); toast(`${e.nome} criada. Traga pontos pela busca ou clicando no mapa.`, true); return; }
  irPara(b.dataset.aba);
});
const mobile = () => matchMedia('(max-width:760px)').matches;
L.Popup.mergeOptions({autoPanPaddingTopLeft: mobile() ? L.point(8, 104) : L.point(20, 64), autoPanPaddingBottomRight: L.point(20, 20)});
/* Painel como "gaveta" no celular: recolhido (só o cabeçalho), meio ou cheio. */
const painelEl = document.getElementById('painel'), alcaEl = document.getElementById('alcaSheet');
let sheetEst = 'meio';
function alturaSheet(est){ const H = window.innerHeight, mini = alcaEl.offsetHeight + document.querySelector('.placa').offsetHeight + 4;
  return est === 'mini' ? mini : est === 'cheio' ? H - 48 : Math.max(mini + 160, Math.round(H * .5)); }
const alturaAtual = () => window.__alturaFolha ? window.__alturaFolha() : mobile() ? painelEl.getBoundingClientRect().height : 0;
function setSheet(est){
  if (!mobile()){ document.documentElement.style.removeProperty('--sheet'); return; }
  sheetEst = est; painelEl.dataset.sheet = est;
  document.documentElement.style.setProperty('--sheet', alturaSheet(est) + 'px');
}
/* Gaveta: arrasta pela alça ou pelo cabeçalho verde; toque na alça alterna; "puxar para baixo" no topo da lista também recolhe. */
(() => {
  let y0 = null, h0 = 0, moveu = false, hist = [], origem = null;
  const zona = [alcaEl, document.querySelector('.placa-borda')];
  const inicio = (y, el) => { y0 = y; h0 = painelEl.getBoundingClientRect().height; moveu = false; hist = [[y, performance.now()]]; origem = el; painelEl.classList.add('arrastando'); };
  const mover = y => { if (y0 === null) return; const dy = y - y0; if (Math.abs(dy) > 6) moveu = true; if (!moveu) return;
    hist.push([y, performance.now()]); if (hist.length > 6) hist.shift();
    const h = Math.min(window.innerHeight - 40, Math.max(alturaSheet('mini'), h0 - dy)); document.documentElement.style.setProperty('--sheet', h + 'px'); };
  const fim = () => { if (y0 === null) return; painelEl.classList.remove('arrastando'); const era = origem; y0 = null; origem = null;
    if (!moveu){ if (era === alcaEl) setSheet(sheetEst === 'mini' ? 'meio' : sheetEst === 'meio' ? 'cheio' : 'mini'); else if (sheetEst === 'mini') setSheet('meio'); return; }
    const [a1, b1] = [hist[0], hist[hist.length - 1]], v = (b1[0] - a1[0]) / Math.max(1, b1[1] - a1[1]);   // px/ms, + = para baixo
    const ordem = ['mini', 'meio', 'cheio'], h = painelEl.getBoundingClientRect().height;
    let est = ordem.map(k => [k, Math.abs(alturaSheet(k) - h)]).sort((x, y) => x[1] - y[1])[0][0];
    if (Math.abs(v) > .45){ const i = ordem.indexOf(sheetEst), alvo = v > 0 ? Math.max(0, i - 1) : Math.min(2, i + 1); est = ordem[alvo];
      if (v > 0 && h < alturaSheet('meio') - 20) est = 'mini'; if (v < 0 && h > alturaSheet('meio') + 20) est = 'cheio'; }
    setSheet(est); };
  zona.forEach(el => {
    el.addEventListener('touchstart', ev => { if (!mobile() || ev.touches.length > 1) return; if (el !== alcaEl && ev.target.closest('button, a, select, input')) return; inicio(ev.touches[0].clientY, el); }, {passive:true});
    el.addEventListener('touchmove', ev => { if (y0 === null) return; ev.preventDefault(); mover(ev.touches[0].clientY); }, {passive:false});
    el.addEventListener('touchend', fim); el.addEventListener('touchcancel', fim);
    el.addEventListener('mousedown', ev => { if (!mobile()) return; inicio(ev.clientY, el); const mm = e2 => mover(e2.clientY), mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); fim(); }; window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu); });
  });
  /* puxar a lista para baixo quando ela já está no topo recolhe a gaveta */
  let py = null;
  painelEl.addEventListener('touchstart', ev => { py = (mobile() && painelEl.scrollTop <= 0 && !ev.target.closest('.placa, .alca-sheet, .abas')) ? ev.touches[0].clientY : null; }, {passive:true});
  painelEl.addEventListener('touchmove', ev => { if (py === null || y0 !== null) return; const dy = ev.touches[0].clientY - py; if (dy > 70 && painelEl.scrollTop <= 0){ py = null; setSheet(sheetEst === 'cheio' ? 'meio' : 'mini'); } }, {passive:true});
  window.addEventListener('resize', () => setSheet(sheetEst));
  map.on('popupopen', () => { if (mobile() && sheetEst !== 'mini') setSheet('mini'); });
  setSheet('meio');
})();
/* Centraliza um ponto na parte visível do mapa (acima da gaveta, no celular). */
function verPonto(p, zoom){ map.setView(p, zoom, {animate:false}); const h = alturaAtual(); if (h) map.panBy([0, h / 2], {animate:false}); }
document.getElementById('rolagem').addEventListener('click', ev => {
  const t = ev.target;
  const dz = t.closest('[data-dur]'); if (dz){ ev.stopPropagation(); durAberto = durAberto === dz.dataset.dur ? null : dz.dataset.dur; renderLista(); return; }
  const dv = t.closest('[data-durv]'); if (dv && dv.closest('#rolagem .dur-ed')){ ev.stopPropagation(); setDur(dv.closest('.dur-ed').dataset.durid, dv.dataset.durv); return; }
  if (t.closest('[data-durfechar]')){ ev.stopPropagation(); durAberto = null; renderLista(); return; }
  if (t.closest('.dur-ed')){ ev.stopPropagation(); return; }
  const novo = t.closest('[data-novo]'); if (novo){ const e = etapaAtual(), c = map.getCenter(), mun = e && e.stops.length ? EST[e.stops[0].id].muns[0] : '';
    abrirFormApoio({tipo: novo.dataset.novo, mun, etapa: e ? e.id : '', ...(mun ? pontoPerto(mun) : {lat: +c.lat.toFixed(6), lon: +c.lng.toFixed(6)})}); return; }
  const fxb = t.closest('[data-fixo]'); if (fxb){ ev.stopPropagation(); buildLOC(); const w = LOC[fxb.dataset.fixo]; if (w){ snapshot(); w.s.fixo = false; changed(); toast(`${EST[fxb.dataset.fixo].nome} liberado: o Otimizar do Quadro geral pode movê-lo de etapa.`, true); } return; }
  const hosp = t.closest('[data-hosp]'); if (hosp){ ev.stopPropagation(); const eid = hosp.dataset.et || (etapaAtual() || {}).id || ''; abrirFormApoio({tipo:'hosp', mun: hosp.dataset.hosp, etapa: eid, ...pontoPerto(hosp.dataset.hosp)}); return; }
  const exa = t.closest('[data-exapoio]'); if (exa){ ev.stopPropagation(); excluirApoio(exa.dataset.exapoio); return; }
  const ap = t.closest('[data-apoio]'); if (ap){ ev.stopPropagation(); const a = state.apoios.find(x => x.uid === ap.dataset.apoio); if (a){ map.setView([a.lat, a.lon], Math.max(map.getZoom(), 13)); popupApoio(a); } return; }
  const ver = t.closest('[data-ver]'); if (ver){ ev.preventDefault(); if (mobile()) setSheet('mini'); verPonto(ll(ver.dataset.ver), Math.max(map.getZoom(), 11)); popupEst(ver.dataset.ver); return; }
  if (t.closest('select')) return;
  const card = t.closest('[data-abrir]'); if (card){ irPara(card.dataset.abrir); return; }
  const fc = t.closest('[data-foto-cam]'); if (fc){ ev.stopPropagation(); iniciarFoto(fc.dataset.fotoCam, true); return; }
  const fg = t.closest('[data-foto-gal]'); if (fg){ ev.stopPropagation(); iniciarFoto(fg.dataset.fotoGal, false); return; }
  const vf = t.closest('[data-ver-foto]'); if (vf){ ev.stopPropagation(); const [a1, b1] = vf.dataset.verFoto.split('|'); verFoto(a1, b1); return; }
  const sr = t.closest('[data-salvar-relato]'); if (sr){ ev.stopPropagation(); salvarRelato(sr.dataset.salvarRelato); return; }
  const fr = t.closest('[data-fechar-relato]'); if (fr){ ev.stopPropagation(); salvarRelato(fr.dataset.fecharRelato); return; }
  const er = t.closest('[data-editar-relato]'); if (er){ ev.stopPropagation(); editRelato = er.dataset.editarRelato; renderLista(); const ta = lista.querySelector(`[data-relato="${editRelato}"] textarea`); if (ta){ ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } return; }
  if (t.closest('.relato')) return;
  const fe = t.closest('[data-feito]'); if (fe){ ev.stopPropagation(); marcarVisita(fe.dataset.feito); return; }
  if (t.closest('a.gm')) return;
  const rem = t.closest('[data-rem]'); if (rem){ ev.stopPropagation(); moverPara(rem.dataset.rem, ''); return; }
  const dia = t.closest('.dia');
  if (dia && !t.closest('a')){ const d = +dia.dataset.dia; if (mobile() && sheetEst === 'cheio') setSheet('meio'); focusDay = focusDay === d ? null : d; render(); focusDay === null ? fitAtual() : fitDay(d); return; }
  const st = t.closest('.stop');
  if (st && !t.closest('.alca')){ if (mobile()) setSheet('mini'); verPonto(ll(st.dataset.id), Math.max(map.getZoom(), 12)); popupEst(st.dataset.id); }
});
document.getElementById('rolagem').addEventListener('change', ev => {
  const di = ev.target.closest('[data-durin]'); if (di){ setDur(di.dataset.durin, di.value); return; }
  const s = ev.target.closest('select[data-est]'); if (s){ moverPara(s.dataset.est, s.value); return; }
  const pn = ev.target.closest('select[data-pern]');
  if (pn){ const e = etapaAtual(), sid = pn.dataset.pern; snapshot(); if (pn.value === EST[sid].muns[0]) delete e.pern[sid]; else e.pern[sid] = pn.value;
    changed({table:true}); toast(`Pernoite alterado para ${MUN[pn.value].n}.`, true); }
});
document.getElementById('rolagem').addEventListener('input', ev => { const r = ev.target.closest('[data-relato]'); if (r) rascunho[r.dataset.relato] = ev.target.value; });
document.getElementById('rolagem').addEventListener('keydown', ev => {
  const r = ev.target.closest && ev.target.closest('[data-relato]');
  if (r){ if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter'){ ev.preventDefault(); salvarRelato(r.dataset.relato); } else if (ev.key === 'Escape') salvarRelato(r.dataset.relato); return; }
});
document.getElementById('rolagem').addEventListener('keydown', ev => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.dia,.card')){ ev.preventDefault(); ev.target.click(); } });
Sortable.create(lista, {draggable:'.stop', handle:'.alca', animation:150, ghostClass:'sortable-ghost', chosenClass:'sortable-chosen',
  onEnd(){ const e = etapaAtual(); if (!e) return;
    const ids = [...lista.querySelectorAll('.stop')].map(el => el.dataset.id); if (ids.join() === e.stops.map(s => s.id).join()) return;
    const byId = Object.fromEntries(e.stops.map(s => [s.id, s])); snapshot(); e.stops = ids.map(id => byId[id]); e.ordem = 'manual'; changed(); }});
document.getElementById('eNome').addEventListener('change', ev => { const e = etapaAtual(), v = ev.target.value.trim(); if (!v){ ev.target.value = e.nome; return; } if (v === e.nome) return; snapshot(); e.nome = v; changed(); });
document.getElementById('eInicio').addEventListener('change', ev => { if (ev.target.value === etapaAtual().inicio) return; snapshot(); etapaAtual().inicio = ev.target.value; changed(); });
document.getElementById('eDias').addEventListener('change', ev => { const v = parseInt(ev.target.value); if ((v > 0 ? v : null) === etapaAtual().dias) return; snapshot(); etapaAtual().dias = v > 0 ? v : null; changed(); });
let excluirT = null;
const bTopo = document.getElementById('bExcluirTopo');
function resetExcluir(){ clearTimeout(excluirT); bTopo.classList.remove('confirmar'); bTopo.querySelector('span').textContent = 'Excluir etapa'; }
bTopo.onclick = () => {
  if (!bTopo.classList.contains('confirmar')){ bTopo.classList.add('confirmar'); bTopo.querySelector('span').textContent = 'Confirmar exclusão'; excluirT = setTimeout(resetExcluir, 4000); return; }
  resetExcluir(); document.getElementById('bExcluirEtapa').onclick();
};
document.getElementById('bExcluirEtapa').onclick = () => {
  const e = etapaAtual(); if (!e) return; snapshot();
  state.etapas = state.etapas.filter(x => x !== e);
  state.apoios.forEach(a => { if (a.etapa === e.id) a.etapa = ''; });
  const dist = absorver(e.stops);
  reassignApoios(); state.aba = 'geral'; changed(); fitAtual();
  const txt = Object.entries(dist).map(([id, n]) => `${n} para ${etapaPorId(id).nome}`);
  toast(txt.length ? `${e.nome} excluída. Os pontos foram redistribuídos pelo menor desvio: ${txt.join(', ')}.` : `${e.nome} excluída; ${e.stops.length} pontos foram para "Sem etapa".`, true);
};
/* Redistribui pontos entre as etapas existentes. Cada ponto vai para a etapa em que o encaixe custa menos tempo
   extra de estrada, medido contra o traçado ORIGINAL das etapas (assim um ponto encaixado não "puxa" os vizinhos todos
   para a mesma etapa). Depois, a ordem das etapas que receberam pontos é reotimizada. */
function absorver(stops){
  const alvo = state.etapas;
  if (!alvo.length){ state.pool.push(...stops); return {}; }
  const orig = new Map(alvo.map(et => [et, [BH, ...et.stops.map(s => s.id), BH]]));
  const custo = (seq, id) => { let b = Infinity; for (let i = 0; i < seq.length-1; i++){ const c = legCost(seq[i], id).h + legCost(id, seq[i+1]).h - legCost(seq[i], seq[i+1]).h; if (c < b) b = c; } return b; };
  const cont = {}, mexidas = new Set();
  stops.forEach(s => {
    let best = alvo[0], bc = Infinity;
    alvo.forEach(et => { const c = custo(orig.get(et), s.id); if (c < bc){ bc = c; best = et; } });
    best.stops.splice(bestInsertPos(best, s.id), 0, s); cont[best.id] = (cont[best.id] || 0) + 1; mexidas.add(best);
  });
  mexidas.forEach(otimizarEtapa);
  return cont;
}

/* ================= relatórios ================= */
const dRel = document.getElementById('dRel');
function totaisGerais(){
  const t = {km:0, h:0, vis:0, pausa:0, d:0, n:0, est:0, noites:0, hosp:0, feitos:0, ac:0, prev:0, gasto:0};
  state.etapas.forEach(e => { const p = P[e.id]; t.km += p.tot.km; t.h += p.tot.h; t.vis += p.tot.visit; t.pausa += p.tot.pausa || 0; t.d += p.days.length; t.n += e.stops.length; t.est += p.nEst;
    t.noites += p.noites.length; t.hosp += p.hospNoites.filter(Boolean).length; t.feitos += e.stops.filter(s => s.feito).length; t.ac += p.acessoAviso.length; });
  state.apoios.forEach(a => { t.prev += previsto(a); t.gasto += gastoTotal(a); });
  return t;
}
function gastosPorTipo(lst){ const o = {}; Object.keys(TIPOS).forEach(k => o[k] = {prev:0, gasto:0, n:0}); lst.forEach(a => { o[a.tipo].prev += previsto(a); o[a.tipo].gasto += gastoTotal(a); o[a.tipo].n++; }); return o; }
const fmtData = iso => { if (!iso) return '–'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
function tabelaApoios(lst, titulo, cor, comEtapa){
  if (!lst.length) return '';
  return `<table class="rel"><caption style="--c:${cor}">${esc(titulo)}<span>${lst.length} registros</span></caption>
    <thead><tr><th>Tipo</th><th>Nome</th>${comEtapa ? '<th>Etapa</th>' : ''}<th>Município</th><th>Contato</th><th>Observações</th></tr></thead><tbody>
    ${lst.map(a => { const e = etapaPorId(a.etapa), nn = a.tipo === 'hosp' ? noitesHotel(a) : 0;
      return `<tr><td class="nw">${TIPOS[a.tipo].nome}${nn ? `<br><span class="rot">${nn} ${nn === 1 ? 'noite' : 'noites'}</span>` : ''}</td><td><b>${esc(a.nome)}</b></td>${comEtapa ? `<td class="nw">${e ? esc(e.nome) : '–'}</td>` : ''}<td>${a.mun ? esc(MUN[a.mun].n) : '–'}</td><td>${esc(a.contato) || '–'}</td><td>${esc(a.nota) || ''}</td></tr>`; }).join('')}
    </tbody></table>`;
}
/* Prepara o relatório para leitura no celular: cada tabela rola na horizontal dentro da sua caixa e há um índice das etapas. */
function prepRel(){
  const c = document.getElementById('relCorpo'); c.scrollTop = 0;
  c.querySelectorAll('table.rel').forEach(t => { if (t.parentElement.classList.contains('rel-wrap')) return; const w = document.createElement('div'); w.className = 'rel-wrap'; t.before(w); w.appendChild(t);
    const cap = t.querySelector('caption'); if (cap){ const d = document.createElement('div'); d.className = 'rel-cap'; d.style.cssText = cap.getAttribute('style') || ''; d.innerHTML = cap.innerHTML; w.before(d); cap.remove(); } });
  const hs = [...c.querySelectorAll('h3.rel-etapa')];
  if (hs.length > 1){ hs.forEach((h, i) => h.id = 'rel-et-' + i);
    const nav = document.createElement('nav'); nav.className = 'rel-indice';
    nav.innerHTML = '<button type="button" data-ir="topo">Resumo</button>' + hs.map((h, i) => `<button type="button" data-ir="${i}" style="--c:${h.style.getPropertyValue('--c')}">${esc(h.firstChild.textContent.trim())}</button>`).join('');
    nav.onclick = ev => { const b = ev.target.closest('[data-ir]'); if (!b) return; if (b.dataset.ir === 'topo') c.scrollTo({top:0}); else { const h = document.getElementById('rel-et-' + b.dataset.ir); c.scrollTo({top: c.scrollTop + h.getBoundingClientRect().top - c.getBoundingClientRect().top - nav.offsetHeight - 6}); } };
    c.prepend(nav); }
}
const contaRel = () => window.RC && RC.dono && RC.ativo ? ` · ${RC.leitura ? (RC.verNome || RC.dono) : (RC.nome || RC.email)}` : '';
function abrirCrono(){
  const T = totaisGerais();
  let h = `<div class="rel-resumo">
    <div><b>${T.n}</b><span>pontos (${T.est} estações)</span></div><div><b>${state.etapas.length}</b><span>etapas</span></div><div><b>${T.d}</b><span>dias de campo</span></div>
    <div><b>${fmtKm(T.km)}</b><span>km</span></div><div><b>${fmtHc(T.h)}</b><span>ao volante (só deslocamento)</span></div><div><b>${fmtHc(T.vis)}</b><span>paradas nas estações</span></div><div><b>${fmtHc(T.pausa)}</b><span>almoço e lanches</span></div>
    <div><b>${T.feitos}</b><span>visitadas</span></div><div><b>${T.hosp}/${T.noites}</b><span>pernoites com hospedagem</span></div><div><b>${T.ac}</b><span>acessos a confirmar</span></div></div>
    <p class="rot" style="margin:6px 0 0">Premissas: ${resumoCfg()}. Km e horas incluem os trechos até a via mais próxima de cada estação e até as cidades de pernoite.${state.pool.length ? ` ${state.pool.length} pontos ainda sem etapa.` : ''}</p>`;
  h += `<table class="rel"><caption style="--c:var(--tinta)">Resumo por etapa</caption>
    <thead><tr><th>Etapa</th><th>Período</th><th>Pontos</th><th>Estações</th><th>Dias</th><th>Km</th><th>Ao volante</th><th>Visitadas</th><th>Hospedagem</th><th>Acesso a confirmar</th></tr></thead><tbody>
    ${state.etapas.map(e => { const p = P[e.id], ap = apoiosDe(e);
      return `<tr><td><b>${esc(e.nome)}</b><br><span class="rot">${e.ordem === 'manual' ? 'ordem manual' : 'ordem otimizada'}</span></td><td>${periodo(p) || '–'}</td><td class="n">${e.stops.length}</td><td class="n">${p.nEst}</td><td class="n">${p.days.length}</td><td class="n">${fmtKm(p.tot.km)}</td><td class="n">${fmtH(p.tot.h)}</td>
        <td class="n">${e.stops.filter(s => s.feito).length}</td><td>${p.hospNoites.filter(Boolean).length} de ${p.noites.length}</td><td class="n">${p.acessoAviso.length}</td></tr>`; }).join('')}
    </tbody><tfoot><tr><td colspan="2">Total</td><td class="n">${T.n}</td><td class="n">${T.est}</td><td class="n">${T.d}</td><td class="n">${fmtKm(T.km)}</td><td class="n">${fmtH(T.h)}</td><td class="n">${T.feitos}</td><td>${T.hosp} de ${T.noites}</td><td class="n">${T.ac}</td></tr></tfoot></table>`;
  state.etapas.forEach(e => {
    const p = P[e.id];
    h += `<h3 class="rel-etapa" style="--c:${e.cor}">${esc(e.nome)}<span>${periodo(p) || 'sem data definida'} · ${e.stops.length} estações · ${p.days.length} dias · ${fmtKm(p.tot.km)} km · ${fmtH(p.tot.h)} ao volante</span></h3>`;
    h += `<table class="rel"><caption style="--c:${e.cor}">Cronograma dia a dia</caption>
      <thead><tr><th>Dia</th><th>Data</th><th>Horário</th><th>Percurso (chegada em cada ponto)</th><th>Km</th><th>Estrada</th><th>Pernoite / hospedagem</th></tr></thead><tbody>`;
    p.days.forEach((D, d) => {
      const perc = [nomeNo(D.from), ...e.stops.slice(D.i, D.j).map((s, x) => `${EST[s.id].nome}${p.info[D.i + x].conj ? '' : ` (${fmtHora(p.info[D.i + x].cheg)})`}${s.feito ? ' ✓' : ''}`), D.to === BH ? BASE_S : `${MUN[D.to].n} (pernoite)`];
      const ho = D.to !== BH ? hospDe(e, D.to) : null;
      h += `<tr><td>${d+1}</td><td class="nw">${D.data ? fmtDS(D.data) : '–'}</td><td class="nw${D.excede ? ' exc' : ''}">${fmtHora(D.saida)}–${fmtHora(D.chegada)}</td><td>${perc.map(esc).join(' → ')}</td><td class="n">${fmtKm(D.km)}</td><td class="n">${fmtH(D.drive)}</td>
        <td>${D.to === BH ? `Retorno a ${esc(BASE_N)}` : `${esc(MUN[D.to].n)}: ${ho ? `${esc(ho.nome)}${ho.contato ? `, ${esc(ho.contato)}` : ''}` : '<span class="falta">a definir</span>'}`}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><td colspan="4">Total da etapa</td><td class="n">${fmtKm(p.tot.km)}</td><td class="n">${fmtH(p.tot.h)}</td><td>${p.hospNoites.filter(Boolean).length} de ${p.noites.length} pernoites com hospedagem</td></tr></tfoot></table>`;
    h += `<table class="rel"><caption style="--c:${e.cor}">Paradas, situação e observações</caption>
      <thead><tr><th>Nº</th><th>Dia</th><th>Horário</th><th>Estação</th><th>Código</th><th>Município</th><th>Acesso</th><th>Situação</th><th>Observações e anotações da visita</th></tr></thead><tbody>
      ${e.stops.map((s, k) => { const est = EST[s.id], inf = p.info[k], a = acesso(s.id);
        const ac = a ? (a.nivel === 'ok' ? `Via a ${fmtM(a.d)}` : `<span class="${a.nivel}">${a.nivel === 'sem' ? 'Sem via mapeada' : 'Último trecho sem via'}: ${fmtM(a.d)}</span>`) : '–';
        const ob = [s.nota && `<b>Obs.:</b> ${esc(s.nota)}`, s.sit && `<b>Situação:</b> ${esc(SITUACOES[s.sit] || s.sit)}`, s.relato && `<b>Visita:</b> ${esc(s.relato)}`].filter(Boolean).join('<br>');
        return `<tr><td class="n">${k+1}</td><td class="n">${inf.d+1}</td><td class="nw">${inf.conj ? '<span class="rot" title="Mesma visita da parada anterior (estação no mesmo local): não conta hora própria">↳ junto com a anterior</span>' : `${fmtHora(inf.cheg)}–${fmtHora(inf.said)}`}</td><td><b>${esc(est.nome)}</b> ${tipoBadge(est)}${s.fixo ? ' <span class="rot">(manual)</span>' : ''}</td><td class="nw">${est.cod.map(esc).join('<br>')}</td><td>${esc(estMun(est))}</td><td>${ac}</td>
          <td class="nw">${s.feito ? `<span class="ok-r">Visitada<br>${esc(s.feito)}</span>` : '<span class="falta">Pendente</span>'}${(s.fotos || []).length ? `<br>📷 ${s.fotos.length}` : ''}</td><td>${ob || ''}</td></tr>`; }).join('')}</tbody></table>`;
    h += tabelaApoios(apoiosDe(e), 'Hospedagens e paradas da etapa', e.cor, false);
    h += secaoFotosRel(e, e.cor);
  });
  const soltos = state.apoios.filter(a => !etapaPorId(a.etapa));
  h += tabelaApoios(soltos, 'Hospedagens e paradas sem etapa', '#5E6B66', false);
  h += secaoOrdemRel();
  h += secaoTrajetosRel();
  document.getElementById('dRelTit').textContent = 'Visão geral do roteiro (planejado e executado)' + contaRel();
  document.getElementById('relCorpo').innerHTML = state.etapas.length ? h : '<p class="vazio">Nenhuma etapa montada ainda.</p>';
  hidratar(document.getElementById('relCorpo'));
  prepRel(); dRel.showModal();
}
function abrirGastos(){
  const linhas = [];
  state.apoios.forEach(a => (a.gastos || []).forEach(g => linhas.push({a, g, e: etapaPorId(a.etapa)})));
  linhas.sort((x, y) => (x.g.data || '').localeCompare(y.g.data || ''));
  const T = totaisGerais(), tp = gastosPorTipo(state.apoios);
  let h = `<div class="rel-resumo">${Object.entries(tp).filter(([k, v]) => v.n).map(([k, v]) => `<div><b>${fmtR(v.gasto)}</b><span>${TIPOS[k].nome}${v.prev ? ` (previsto ${fmtR(v.prev)})` : ''}</span></div>`).join('')}<div><b>${fmtR(T.gasto)}</b><span>total gasto (previsto ${fmtR(T.prev)})</span></div></div>`;
  h += `<table class="rel"><caption style="--c:var(--tinta)">Lançamentos<span>${linhas.length} gastos</span></caption>
    <thead><tr><th>Data</th><th>Etapa</th><th>Tipo</th><th>Local</th><th>Município</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>
    ${linhas.length ? linhas.map(({a, g, e}) => `<tr><td class="nw">${fmtData(g.data)}</td><td class="nw">${e ? esc(e.nome) : '–'}</td><td class="nw">${TIPOS[a.tipo].nome}</td><td>${esc(a.nome)}</td><td>${a.mun ? esc(MUN[a.mun].n) : '–'}</td><td>${esc(g.desc) || ''}</td><td class="n">${fmtR(g.valor)}</td></tr>`).join('')
      : '<tr><td colspan="7" class="falta">Nenhum gasto lançado ainda. Abra uma hospedagem ou parada (Editar) e use "Adicionar gasto".</td></tr>'}
    </tbody><tfoot>${state.etapas.map(e => { const v = apoiosDe(e).reduce((t, a) => t + gastoTotal(a), 0); return v ? `<tr><td colspan="6">${esc(e.nome)}</td><td class="n">${fmtR(v)}</td></tr>` : ''; }).join('')}<tr><td colspan="6">Total</td><td class="n">${fmtR(T.gasto)}</td></tr></tfoot></table>`;
  document.getElementById('dRelTit').textContent = 'Relatório de gastos';
  document.getElementById('relCorpo').innerHTML = h;
  prepRel(); dRel.showModal();
}
function abrirTabela(){
  buildLOC();
  const linhas = DATA.est.map(est => {
    const w = LOC[est.id], e = w && w.e, inf = e ? P[e.id].info[w.k] : null, a = acesso(est.id), D = e ? P[e.id].days[inf.d] : null;
    const ac = a ? (a.nivel === 'ok' ? `Via a ${fmtM(a.d)}` : `<span class="${a.nivel}">${a.nivel === 'sem' ? 'Sem via mapeada' : 'Último trecho sem via'}: ${fmtM(a.d)}</span>`) : '–';
    const obs = [est.munPt[0] && !est.muns.includes(est.munPt[0]) ? `Coordenada em ${MUN[est.munPt[0]].n}` : '', est.pts.length > 1 ? `2 coordenadas a ${fmtM(est.dPar)}` : '', w && w.s.nota, w && w.s.feito && `Visitada em ${w.s.feito}`, w && w.s.relato && `Visita: ${w.s.relato}`, w && (w.s.fotos || []).length && `${w.s.fotos.length} foto(s)`].filter(Boolean).map(esc).join('; ');
    return `<tr data-busca="${esc((est.nome + ' ' + est.nomeOrig + ' ' + est.cod.join(' ') + ' ' + estMun(est) + ' ' + (est.rio || '')).toLowerCase())}"><td class="n">${est.n}</td><td class="nw">${est.cod.map(esc).join('<br>')}</td><td><b>${esc(est.nomeOrig)}</b></td><td>${tipoBadge(est)}</td><td>${esc(estMun(est))}</td>
      <td class="nw">${est.pts.map(fmtCoord).join('<br>')}</td><td>${esc(est.rio) || '–'}</td><td class="nw">${e ? `<span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${e.cor};margin-right:4px"></span>${esc(e.nome)}` : 'Sem etapa'}</td>
      <td class="nw">${D ? `Dia ${inf.d+1}${D.data ? `, ${fmtD(D.data)}` : ''}` : '–'}</td><td class="nw">${inf ? (inf.conj ? '<span class="rot">junto com a anterior</span>' : fmtHora(inf.cheg)) : '–'}</td><td>${ac}</td><td>${obs}</td></tr>`;
  }).join('');
  document.getElementById('dRelTit').textContent = `Tabela das estações (${FONTE_EST})`;
  document.getElementById('relCorpo').innerHTML = `<div class="filtro"><input type="search" id="fTab" placeholder="Filtrar por nome, código, município ou rio…"><span class="dica" style="margin:0">${ORDEM.length} pontos, ${N_EST} estações</span></div>
    <table class="rel"><thead><tr><th>Nº</th><th>Código</th><th>Nome</th><th>Tipo</th><th>Município</th><th>Coordenadas</th><th>Curso d'água</th><th>Etapa</th><th>Dia</th><th>Chegada</th><th>Acesso</th><th>Observações</th></tr></thead><tbody>${linhas}</tbody></table>`;
  document.getElementById('fTab').oninput = ev => { const q = ev.target.value.trim().toLowerCase(); document.querySelectorAll('#relCorpo tbody tr').forEach(tr => tr.hidden = q && !tr.dataset.busca.includes(q)); };
  prepRel(); dRel.showModal();
}
document.getElementById('bImprimir').onclick = () => { document.body.classList.add('imprimindo');
  if (APP){ try { APP.imprimir((document.getElementById('dRelTit').textContent || 'Relatório') + ' – roteiro das estações'); } catch(e){ document.body.classList.remove('imprimindo'); toast('Este celular não permitiu imprimir.'); } return; }
  window.print(); };
window.addEventListener('afterprint', () => document.body.classList.remove('imprimindo'));

/* ================= serviço de rotas ================= */
async function fetchT(url, ms){ const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); try { return await fetch(url, {signal: ac.signal}); } finally { clearTimeout(t); } }
async function getJSON(url, ms, tent = 3){
  let err; for (let i = 0; i < tent; i++){ try { const r = await fetchT(url, ms); if (r.status === 429 || r.status >= 500){ err = new Error(r.status); await sleep(1500 * (i+1)); continue; } return await r.json(); } catch(e){ err = e; if (e.name === 'AbortError' || i >= 1) break; await sleep(800); } }
  throw err;
}
function nosRede(){
  const s = new Set([BH, ...ORDEM]);
  DATA.est.forEach(e => s.add(e.muns[0]));
  state.etapas.forEach(e => Object.values(e.pern || {}).forEach(m => s.add(m)));
  return [...s];
}
/* Distâncias entre pares em formato compacto: lista de nós + [i, j, km×100, h×10000]. Ocupa ~1/3 do formato antigo. */
function packRoad(rd){
  const nos = [], ix = {}, r = [], id = x => ix[x] ?? (ix[x] = nos.push(x) - 1);
  Object.entries(rd).forEach(([k, v]) => { const p = k.indexOf('>'); if (p < 0 || !v) return; r.push(id(k.slice(0, p)), id(k.slice(p + 1)), Math.round(v.km * 100), Math.round(v.h * 1e4)); });
  return {v:2, n:nos, r};
}
function unpackRoad(x){
  if (!x) return {}; if (x.v !== 2) return x;
  const o = {}, n = x.n, r = x.r; for (let k = 0; k + 3 < r.length; k += 4) o[n[r[k]] + '>' + n[r[k+1]]] = {km: r[k+2] / 100, h: r[k+3] / 1e4}; return o;
}
/* Só guarda as distâncias entre pontos de projetos que ainda existem (o espaço do navegador é limitado). */
let NOS_OUTROS = null;
function nosDosProjetos(){
  if (!NOS_OUTROS){ NOS_OUTROS = new Set();
    IDX.lista.forEach(p => { if (p.id === PJ_ID) return; NOS_OUTROS.add(p.base || BH0);
      const est = p.tipo === 'proprio' ? ((lsGet(KEY_DADOS + p.id) || {}).est || []) : (PJ_DADOS ? jsonEl('dados').est : DATA.est);
      est.forEach(e => { NOS_OUTROS.add(e.id); NOS_OUTROS.add(e.muns[0]); });
      const st = lsGet(keyEstado(p.id)); ((st && st.etapas) || []).forEach(e => Object.values(e.pern || {}).forEach(m => NOS_OUTROS.add(m))); }); }
  const s = new Set(NOS_OUTROS); nosRede().forEach(x => s.add(x)); return s;
}
function roadUtil(){ const nos = nosDosProjetos(), o = {}; Object.entries(road).forEach(([k, v]) => { const i = k.indexOf('>'); if (nos.has(k.slice(0, i)) && nos.has(k.slice(i + 1))) o[k] = v; }); return o; }
function salvaMatriz(){ try { localStorage.setItem(KEY_MAT, JSON.stringify({road: packRoad(roadUtil()), SNAP, PAV})); } catch(e){} gravarApp(); }
function carregaMatriz(){ try { const m = JSON.parse(localStorage.getItem(KEY_MAT)); if (m && m.road){ road = {...unpackRoad(m.road), ...road}; SNAP = {...(m.SNAP || {}), ...SNAP}; PAV = {...(m.PAV || {}), ...PAV}; } } catch(e){} }
const MAT_EMB = (() => { try { return JSON.parse(document.getElementById('matriz').textContent); } catch(e){ return null; } })();
if (MAT_EMB && MAT_EMB.road){ road = unpackRoad(MAT_EMB.road); SNAP = MAT_EMB.SNAP || {}; Object.assign(PAV, MAT_EMB.PAV || {});
  const rp = MAT_EMB.rotasP || {};
  Object.assign(routeCache, rp[PJ_ID] || (EMB_DO_ATUAL || PJ_ID === 'anexo' ? MAT_EMB.rotas || {} : {}));
  /* traçados dos outros projetos gravados no arquivo: guardados neste navegador para quando o projeto for aberto */
  setTimeout(() => Object.entries(rp).forEach(async ([id, rc]) => { if (id !== PJ_ID && metaDe(id)){ const atual = await ROTAS.get(id); if (!atual || Object.keys(atual).length < Object.keys(rc).length) ROTAS.set(id, rc); } }), 1500); }
/* Traçados por projeto, guardados no IndexedDB deste navegador (não cabem no localStorage). */
const ROTAS = {
  _db: null,
  db(){ return this._db || (this._db = new Promise((ok, no) => { try { const r = indexedDB.open('roteiro-rotas', 1); r.onupgradeneeded = () => r.result.createObjectStore('r'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch(e){ no(e); } })); },
  async get(id){ try { const d = await this.db(); return await new Promise(ok => { const t = d.transaction('r').objectStore('r').get(id); t.onsuccess = () => ok(t.result || null); t.onerror = () => ok(null); }); } catch(e){ return null; } },
  async set(id, v){ try { const d = await this.db(); await new Promise(ok => { const t = d.transaction('r', 'readwrite'); t.objectStore('r').put(v, id); t.oncomplete = ok; t.onerror = ok; }); } catch(e){} },
  async del(id){ try { const d = await this.db(); await new Promise(ok => { const t = d.transaction('r', 'readwrite'); t.objectStore('r').delete(id); t.oncomplete = ok; t.onerror = ok; }); } catch(e){} }
};
let tRotas = null;
function guardarRotas(){ clearTimeout(tRotas); tRotas = setTimeout(() => { tRotas = null; ROTAS.set(PJ_ID, rotasAtuais()); }, 1500); }
/* Traçado de cada trecho (ponto A → ponto B) já calculado. Sem internet, uma ordem nova reaproveita esses trechos. */
const LEGG = {}; let leggNovo = false, tLegg = null;
function guardarLEGG(){ if (!leggNovo) return; clearTimeout(tLegg); tLegg = setTimeout(() => { leggNovo = false; const o = {}; Object.entries(LEGG).forEach(([k, g]) => { o[k] = g.map(q => [r2(+q[0], 5), r2(+q[1], 5)]); }); ROTAS.set('__trechos', o); }, 2500); }
function semearLEGG(){ Object.entries(routeCache).forEach(([k, r]) => { if (k.startsWith('P|') || !r.legs) return; const w = k.split(','); r.legs.forEach((g, i) => { if (g && g.length > 1 && w[i + 1] && w[i] !== w[i + 1]){ const kk = w[i] + '>' + w[i + 1]; if (!LEGG[kk]){ LEGG[kk] = g; leggNovo = true; } } }); }); guardarLEGG(); }
function semearPAVG(){ semearLEGG(); Object.entries(routeCache).forEach(([k, r]) => { if (!k.startsWith('P|') || !r.legs) return; const w = k.slice(2).split(','); r.legs.forEach((g, i) => { const kk = w[i] + '>' + w[i+1]; if (g && !PAVG[kk]) PAVG[kk] = g; }); }); }
semearPAVG();
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
async function matriz(src, dst){
  const cs = chunk(src, 50), cd = chunk(dst, 50), total = cs.length * cd.length; let n = 0;
  for (const a of cs) for (const b of cd){
    const uni = [...new Set([...a, ...b])], pos = Object.fromEntries(uni.map((id, i) => [id, i]));
    progresso = `${n + 1} de ${total}`; setStatus();
    const j = await getJSON(`${OSRM}/table/v1/driving/${uni.map(id => ll(id)[1] + ',' + ll(id)[0]).join(';')}?sources=${a.map(id => pos[id]).join(';')}&destinations=${b.map(id => pos[id]).join(';')}&annotations=duration,distance`, 30000);
    if (j.code !== 'Ok') throw new Error(j.code);
    a.forEach((x, i) => b.forEach((y, k) => { if (x !== y && j.durations[i][k] != null) road[x+'>'+y] = {km: j.distances[i][k]/1000, h: j.durations[i][k]/3600}; }));
    const snap = (id, w) => { if (isEst(id) && w && !SNAP[id]) SNAP[id] = {d: w.distance, nome: w.name || '', loc: [w.location[1], w.location[0]]}; };
    a.forEach((id, i) => snap(id, j.sources[i])); b.forEach((id, i) => snap(id, j.destinations[i]));
    n++; if (n < total) await sleep(700);
  }
}
let tabelaRodando = null;
function fetchTable(){
  if (tabelaRodando) return tabelaRodando.then(() => fetchTable());
  tabelaRodando = (async () => {
    const nos = nosRede();
    const falta = nos.filter(a => nos.some(b => a !== b && !road[a+'>'+b]));
    if (!falta.length){ srv = 'ok'; return true; }
    try {
      if (falta.length > nos.length * .6) await matriz(nos, nos);
      else { await matriz(falta, nos); await matriz(nos, falta); }
      srv = 'ok'; salvaMatriz(); return true;
    } catch(e){ if (srv !== 'ok') srv = 'off'; return false; }
    finally { progresso = ''; }
  })();
  return tabelaRodando.finally(() => { tabelaRodando = null; });
}
let routeTimer = null, rodando = false, deNovo = false;
function scheduleRoutes(){ clearTimeout(routeTimer); routeTimer = setTimeout(fetchRoutes, 650); }
/* ---- traçados ---- */
function decodePoly6(str){ let i = 0, lat = 0, lon = 0; const out = [];
  while (i < str.length){ let b, sh = 0, r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); lat += (r & 1) ? ~(r >> 1) : (r >> 1);
    sh = 0; r = 0; do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32); lon += (r & 1) ? ~(r >> 1) : (r >> 1); out.push([lat / 1e6, lon / 1e6]); }
  return out; }
/* Corta o traçado completo em pernas usando a distância percorrida (mais seguro que procurar o ponto mais próximo). */
function cortarPorDistancia(line, legKm){
  const cum = [0]; for (let i = 1; i < line.length; i++) cum.push(cum[i-1] + havLL(line[i-1], line[i]));
  const tot = cum[cum.length-1], soma = legKm.reduce((a, x) => a + x, 0) || 1, out = []; let ini = 0, alvo = 0;
  legKm.forEach((km, k) => { alvo += km * tot / soma; let j = ini; if (k === legKm.length - 1) j = line.length - 1; else while (j < line.length - 1 && cum[j] < alvo) j++;
    out.push(line.slice(ini, j + 1)); ini = j; });
  return out;
}
async function rotaOSRM(nos){
  const j = await getJSON(`${OSRM}/route/v1/driving/${nos.map(id => ll(id)[1] + ',' + ll(id)[0]).join(';')}?overview=full&geometries=geojson`, 40000, 2);
  if (j.code !== 'Ok') throw new Error(j.code);
  const line = j.routes[0].geometry.coordinates.map(([lo, la]) => [la, lo]), lg = j.routes[0].legs || [];
  const ok = lg.length === nos.length - 1;
  const km = ok ? lg.map(l => l.distance / 1000) : nos.slice(1).map((id, i) => havLL(ll(nos[i]), ll(id)) * 1.3), h = ok ? lg.map(l => l.duration / 3600) : km.map(k => k / 60);
  j.waypoints.forEach((x, i) => { const id = nos[i]; if (isEst(id) && !SNAP[id]) SNAP[id] = {d:x.distance, nome:x.name || '', loc:[x.location[1], x.location[0]]}; });
  return {legs: cortarPorDistancia(line, km), km, h, terra: km.map(() => false)};
}
async function valhalla(nos, semTerra){
  const corpo = {locations: nos.map(id => ({lat: ll(id)[0], lon: ll(id)[1], type:'break', radius: 300})), costing:'auto', units:'kilometers', directions_type:'none',
    costing_options:{auto:{exclude_unpaved: semTerra, use_tracks: semTerra ? 0 : .3, use_ferry: 0}}};
  let ultimo;
  for (let tent = 0; tent < 4; tent++){
    if (tent) await sleep(1500 * tent);
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
    try {
      const r = await fetch(`${VALHALLA}/route?json=${encodeURIComponent(JSON.stringify(corpo))}`, {signal: ac.signal});
      const j = await r.json().catch(() => ({}));
      if (r.status === 400){ const e = new Error(j.error || 'sem caminho'); e.semCaminho = true; throw e; }
      if (!r.ok || !j.trip){ ultimo = new Error(j.error || r.status); continue; }   // 429, 5xx: tenta de novo
      return {legs: j.trip.legs.map(l => decodePoly6(l.shape)), km: j.trip.legs.map(l => l.summary.length), h: j.trip.legs.map(l => l.summary.time / 3600), terra: j.trip.legs.map(() => !semTerra)};
    } catch(e){ if (e.semCaminho) throw e; ultimo = e; }
    finally { clearTimeout(t); }
  }
  throw ultimo || new Error('valhalla');
}
/* Só asfalto: tenta o trecho inteiro sem terra; se não houver caminho, testa perna a perna e só nas pernas sem alternativa usa terra. */
async function rotaPavimentada(nos){
  try { return await valhalla(nos, true); }
  catch(e){
    if (!e.semCaminho) throw e;
    await sleep(900);
    if (nos.length === 2) return await valhalla(nos, false);
    /* divide ao meio até achar só as pernas sem alternativa asfaltada */
    const m = Math.floor((nos.length - 1) / 2), A = await rotaPavimentada(nos.slice(0, m + 1)); await sleep(900);
    const B = await rotaPavimentada(nos.slice(m));
    return {legs:[...A.legs, ...B.legs], km:[...A.km, ...B.km], h:[...A.h, ...B.h], terra:[...A.terra, ...B.terra]};
  }
}
async function rotaCompleta(wps0, pav){
  /* estações no mesmo local: o trecho entre elas é zero; consulta só os pontos distintos e devolve as pernas na ordem original */
  const iguais = (a, b) => { const p = ll(a), q = ll(b); return Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6; };
  const uni = [wps0[0]], mapa = [];
  for (let i = 1; i < wps0.length; i++){ if (iguais(wps0[i], uni[uni.length - 1])) mapa.push(-1); else { mapa.push(uni.length - 1); uni.push(wps0[i]); } }
  if (uni.length < wps0.length){
    const r = uni.length > 1 ? await rotaCompleta(uni, pav) : {legs:[], km:[], h:[], terra:[]}, out = {legs:[], km:[], h:[], terra:[]};
    mapa.forEach((j, i) => { if (j < 0){ const p = ll(wps0[i]); out.legs.push([p, p]); out.km.push(0); out.h.push(0); out.terra.push(false); } else { out.legs.push(r.legs[j]); out.km.push(r.km[j]); out.h.push(r.h[j]); out.terra.push(r.terra[j]); } });
    return out;
  }
  const wps = wps0;
  const MAXN = pav ? 18 : 25, out = {legs:[], km:[], h:[], terra:[]};
  for (let i = 0; i < wps.length - 1; i += MAXN - 1){
    const nos = wps.slice(i, i + MAXN), r = pav ? await rotaPavimentada(nos) : await rotaOSRM(nos);
    ['legs', 'km', 'h', 'terra'].forEach(k => out[k].push(...r[k]));
    if (i + MAXN - 1 < wps.length - 1) await sleep(pav ? 1100 : 400);
  }
  return out;
}
const tentPav = {}; let avisouPav = false;
async function fetchRoutes(){
  if (rodando){ deNovo = true; return; }
  const pav = state.cfg.estrada === 'pav';
  if (srv === 'off' && !pav) return;
  if (pav && srvPav === 'off') return;
  rodando = true; let falhou = false;
  try {
    const atual = etapaAtual();
    const pend = [...state.etapas].sort((a, b) => (b === atual) - (a === atual)).filter(e => e.stops.length && P[e.id] && !routeCache[P[e.id].key] );
    if (pend.length){ routeBusy = true; setStatus(); }
    /* modo só pavimentadas: primeiro o traçado comum de todas as etapas (rápido), para nenhuma ficar sem traçado no mapa */
    if (pav && srv !== 'off') for (const e of pend){ const w0 = P[e.id] && P[e.id].wps; if (!w0 || routeCache[w0.join(',')]) continue;
      try { routeCache[w0.join(',')] = await rotaCompleta(w0, false); renderMapa(); await sleep(300); } catch(e0){ break; } }
    for (const e of pend){
      const p = P[e.id]; if (!p || routeCache[p.key]) continue;
      const wps = p.wps;
      try {
        let r;
        if (pav){
          /* traçado comum primeiro (rápido), para o mapa nunca ficar vazio enquanto calcula o pavimentado */
          if (!routeCache[wps.join(',')] && srv !== 'off'){ try { routeCache[wps.join(',')] = await rotaCompleta(wps, false); render(); } catch(e0){} }
          /* reaproveita os trechos já traçados: só consulta os pares de pontos que ainda faltam */
          const par = i => wps[i] + '>' + wps[i+1], faltam = [];
          for (let i = 0; i < wps.length - 1; i++) if (!PAVG[par(i)] || !PAV[par(i)]) faltam.push(i);
          const runs = []; faltam.forEach(i => { const u = runs[runs.length - 1]; if (u && u[1] === i - 1) u[1] = i; else runs.push([i, i]); });
          for (const [i0, i1] of runs){
            const q = await rotaCompleta(wps.slice(i0, i1 + 2), true);
            q.km.forEach((km, x) => { const k = par(i0 + x); PAV[k] = {km, h: q.h[x], terra: q.terra[x]}; PAVG[k] = q.legs[x]; });
            pavVer++; renderMapa(); setStatus();
            await sleep(1100);
          }
          r = {legs:[], km:[], h:[], terra:[]};
          for (let i = 0; i < wps.length - 1; i++){ const k = par(i); r.legs.push(PAVG[k]); r.km.push(PAV[k].km); r.h.push(PAV[k].h); r.terra.push(!!PAV[k].terra); }
          srvPav = 'ok'; pavVer++; salvaMatriz();
        } else r = await rotaCompleta(wps, false);
        routeCache[p.key] = r; if (!pav) semearLEGG();
        render(); gravarApp(); guardarRotas();
        await sleep(pav ? 1100 : 300);
      } catch(err){ if (pav){ falhou = true; srvPav = 'off'; if (!avisouPav){ avisouPav = true; toast('O serviço de rotas pavimentadas está lento ou fora do ar. O mapa mostra o traçado comum (tracejado) e tenta de novo em 30 segundos.'); } } break; }
    }
  } finally { rodando = false; routeBusy = false; render();
    if (falhou) setTimeout(() => { if (srvPav === 'off'){ srvPav = 'pendente'; scheduleRoutes(); } }, 30000);
    if (deNovo){ deNovo = false; scheduleRoutes(); } }
}

/* ================= exportar / importar ================= */
function baixar(nome, conteudo, tipo){ if (APP) return enviarApp(nome, conteudo, tipo); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], {type:tipo})); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
const num = (x, d=1) => x.toLocaleString('pt-BR', {minimumFractionDigits:d, maximumFractionDigits:d});
const csvLinha = r => r.map(v => { v = String(v ?? ''); return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(';');
function exportCSV(){
  const cab = ['Etapa','Dia','Data','Nº parada',PJ_DADOS ? 'Nº na planilha' : 'Nº Anexo','Código(s)','Nome','Tipo',PJ_DADOS ? 'Município (planilha)' : 'Município (Anexo)','Município da coordenada','Latitude','Longitude','Km desde o ponto anterior','Deslocamento (h)','Chegada','Saída','Pernoite após esta parada','Cidade de pernoite','Hospedagem','Distância até a via (m)','Situação do acesso',"Curso d'água",'Instituição','Operadora','Observações','Visitada em','Anotações da visita','Fotos'];
  const L_ = [cab];
  state.etapas.forEach(e => { const p = P[e.id]; if (!e.stops.length) return;
    p.days.forEach((D, d) => {
      const dt = D.data ? fmtD(D.data) : '';
      L_.push([e.nome, d+1, dt, '', '', '', D.from === BH ? `Saída de ${BASE_N}` : `Saída de ${MUN[D.from].n} (pernoite)`, '', '', '', ...ll(D.from), '', '', '', fmtHora(D.saida), '', '', '', '', '', '', '', '', '']);
      for (let k = D.i; k < D.j; k++){
        const s = e.stops[k], est = EST[s.id], inf = p.info[k], a = acesso(s.id);
        L_.push([e.nome, d+1, dt, k+1, est.n, est.cod.join(' / '), est.nomeOrig, tipoTxt(est), estMun(est), est.munPt[0] ? MUN[est.munPt[0]].n : '', est.pts[0][0], est.pts[0][1], num(inf.leg.km), num(inf.leg.h, 2), inf.conj ? 'junto com a anterior' : fmtHora(inf.cheg), inf.conj ? '' : fmtHora(inf.said), '', '', '',
          a ? Math.round(a.d) : '', a ? ({ok:'Via mapeada', av:'Último trecho sem via mapeada', sem:'Sem acesso viário mapeado'})[a.nivel] : 'Não verificado', est.rio, est.inst, est.op, s.nota, s.feito || '', s.relato || '', (s.fotos || []).length || '']);
      }
      const ult = D.legs[D.legs.length-1], ho = D.to !== BH ? hospDe(e, D.to) : null;
      L_.push([e.nome, d+1, dt, '', '', '', D.to === BH ? `Chegada em ${BASE_N}` : `Pernoite em ${MUN[D.to].n}`, '', '', '', ...ll(D.to), num(ult.km), num(ult.h, 2), fmtHora(D.chegada), '', D.to === BH ? '' : 'Sim', D.to === BH ? '' : MUN[D.to].n, ho ? ho.nome : '', '', '', '', '', '', '']);
    });
  });
  state.pool.forEach(s => { const est = EST[s.id]; L_.push(['Sem etapa', '', '', '', est.n, est.cod.join(' / '), est.nomeOrig, tipoTxt(est), estMun(est), '', est.pts[0][0], est.pts[0][1], '', '', '', '', '', '', '', '', '', est.rio, est.inst, est.op, s.nota, s.feito || '', s.relato || '', (s.fotos || []).length || '']); });
  baixar('roteiro_estacoes.csv', '\ufeff' + L_.map(csvLinha).join('\r\n'), 'text/csv;charset=utf-8');
}
const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function kmlCor(hex, a = 'ff'){ const h = hex.replace('#', ''); return a + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2); }
function exportKML(){
  const atual = etapaAtual(), ets = atual ? [atual] : state.etapas.filter(e => e.stops.length);
  const estilos = new Set(), pm = [], pastas = [];
  const est = (id, cor, linha) => { const k = id + (linha ? 'L' : ''); if (estilos.has(k)) return; estilos.add(k);
    pm.push(linha ? `<Style id="${k}"><LineStyle><color>${kmlCor(cor)}</color><width>4</width></LineStyle></Style>`
      : `<Style id="${k}"><IconStyle><color>${kmlCor(cor)}</color><scale>1.1</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle><LabelStyle><scale>0.9</scale></LabelStyle></Style>`); };
  const ponto = (nome, desc, p, st) => `<Placemark><name>${xe(nome)}</name><description>${xe(desc)}</description><styleUrl>#${st}</styleUrl><Point><coordinates>${p[1]},${p[0]},0</coordinates></Point></Placemark>`;
  ets.forEach(e => {
    const p = P[e.id], rg = routeCache[p.key], pref = atual ? '' : `E${state.etapas.indexOf(e) + 1}-`;
    p.days.forEach((D, d) => {
      const cor = corDia(d), sid = 'd' + d; est(sid, cor); est(sid, cor, true);
      let h = '';
      for (let k = D.i; k < D.j; k++){
        const s = e.stops[k], x = EST[s.id], inf = p.info[k];
        h += ponto(`${pref}${pad2(k+1)} ${x.nome}${s.feito ? ' ✓' : ''}`, `${e.nome}, dia ${d+1}${D.data ? ` (${fmtDS(D.data)})` : ''}. ${inf.conj ? 'Mesma visita da parada anterior (sem hora própria)' : `Chegada ${fmtHora(inf.cheg)}, saída ${fmtHora(inf.said)}`}.\n${tipoTxt(x)}. Código(s): ${x.cod.join(' / ')}.\nMunicípio: ${estMun(x)}.${x.rio ? `\nCurso d'água: ${x.rio}.` : ''}${s.nota ? `\nObs.: ${s.nota}` : ''}${s.feito ? `\nVisitada em ${s.feito}.` : ''}${s.relato ? `\nAnotações da visita: ${s.relato}` : ''}`, x.pts[0], sid);
      }
      if (D.to !== BH){ const ho = hospDe(e, D.to); h += ponto(`${pref}Pernoite dia ${d+1}: ${MUN[D.to].n}`, ho ? `${ho.nome}${ho.contato ? `, ${ho.contato}` : ''}` : 'Hospedagem a definir', ptDia(e, D.to), sid); }
      const linhas = D.legs.map(l => { const i = p.legs.indexOf(l), pts = rg ? rg.legs[i] : [ll(l.a), ll(l.b)]; return pts.map(q => `${(+q[1]).toFixed(5)},${(+q[0]).toFixed(5)},0`).join(' '); }).join(' ');
      h += `<Placemark><name>${xe(`${pref}Rota do dia ${d+1}`)}</name><description>${xe(`${fmtKm(D.km)} km, ${fmtH(D.drive)} de estrada${rg ? '' : ' (traçado simplificado)'}`)}</description><styleUrl>#${sid}L</styleUrl><LineString><tessellate>1</tessellate><coordinates>${linhas}</coordinates></LineString></Placemark>`;
      pastas.push(`<Folder><name>${xe(`${e.nome}, dia ${d+1}${D.data ? ` (${fmtD(D.data)})` : ''}`)}</name>${h}</Folder>`);
    });
  });
  est('bh', '#17231F');
  const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xe(atual ? atual.nome : 'Roteiro das estações')}</name>${pm.join('')}${ponto(`${BASE_S} – saída e retorno`, BASE_N, ll(BH), 'bh')}${pastas.join('')}</Document></kml>`;
  baixar(`${(atual ? atual.nome : 'roteiro_estacoes').replace(/[^\wÀ-ú-]+/g, '_')}.kml`, kml, 'application/vnd.google-earth.kml+xml');
  toast('KML baixado. No Google My Maps: Criar mapa > Importar. Os pontos aparecem com o número da parada.');
}
function exportCSVApoio(){
  const L_ = [['Tipo','Nome','Etapa','Município','UF','Endereço / telefone','Noites como pernoite','Observações','Latitude','Longitude']];
  state.apoios.forEach(a => { const e = etapaPorId(a.etapa);
    L_.push([TIPOS[a.tipo].nome, a.nome, e ? e.nome : '', a.mun ? MUN[a.mun].n : '', a.mun ? MUN[a.mun].uf : '', a.contato, a.tipo === 'hosp' ? noitesHotel(a) : '', a.nota, a.lat, a.lon]); });
  baixar('hospedagens_e_paradas.csv', '\ufeff' + L_.map(csvLinha).join('\r\n'), 'text/csv;charset=utf-8');
}
function exportGeoJSON(){
  const feats = [];
  state.etapas.forEach(e => { const p = P[e.id], rg = routeCache[p.key];
    p.legs.forEach((leg, i) => { const pts = rg ? rg.legs[i] : [ll(leg.a), ll(leg.b)];
      feats.push({type:'Feature', properties:{etapa:e.nome, trecho:i+1, dia:leg.d+1, de:nomeNo(leg.a), para:nomeNo(leg.b), km:+leg.km.toFixed(1), horas:+leg.h.toFixed(2), pelas_estradas:!!rg}, geometry:{type:'LineString', coordinates: pts.map(([la, lo]) => [lo, la])}}); }); });
  DATA.est.forEach(est => { const w = LOC[est.id], a = acesso(est.id);
    est.pts.forEach((pt, i) => feats.push({type:'Feature', properties:{n_anexo:est.n, codigo:est.cod[i] || est.cod.join(' / '), nome:est.nomeOrig, tipo:est.tipos[i] || tipoTxt(est), municipio:estMun(est), curso_dagua:est.rio, etapa: w && w.e ? w.e.nome : '', ordem: w && w.e ? w.k+1 : null, distancia_via_m: a ? Math.round(a.d) : null}, geometry:{type:'Point', coordinates:[pt[1], pt[0]]}})); });
  state.apoios.forEach(a => feats.push({type:'Feature', properties:{tipo:TIPOS[a.tipo].nome, nome:a.nome, etapa:(etapaPorId(a.etapa) || {}).nome || '', valor:a.valor || null, contato:a.contato || ''}, geometry:{type:'Point', coordinates:[a.lon, a.lat]}}));
  todasFotos().forEach(x => feats.push({type:'Feature', properties:{foto:true, estacao:EST[x.s.id].nomeOrig, etapa: x.e ? x.e.nome : '', data:x.f.data, origem:x.f.fonte, precisao_m:x.f.prec, legenda:x.f.legenda}, geometry:{type:'Point', coordinates:[x.f.lon, x.f.lat]}}));
  baixar('roteiro_estacoes.geojson', JSON.stringify({type:'FeatureCollection', features:feats}), 'application/geo+json');
}
document.getElementById('arquivo').onchange = async ev => {
  const f = ev.target.files[0]; if (!f) return;
  try { await importarTexto(await f.text()); } catch(err){ toast('Não foi possível ler este arquivo.'); }
  ev.target.value = '';
};
/* Abre um roteiro salvo (HTML de qualquer versão ou .json antigo).
   O projeto aberto agora recebe a versão do arquivo; os outros projetos do arquivo entram (ou são atualizados) na lista de projetos. */
function mesclarMatriz(mat, idArq){
  if (!mat) return;
  if (mat.road) Object.assign(road, unpackRoad(mat.road)); Object.assign(SNAP, mat.SNAP || {}); Object.assign(PAV, mat.PAV || {}); pavVer++;
  Object.assign(routeCache, (mat.rotasP && mat.rotasP[PJ_ID]) || (idArq === PJ_ID ? mat.rotas || {} : {}));
  setTimeout(semearPAVG, 0); salvaMatriz();
}
function aplicarNoAtual(s){
  let novo; if (s.v === 3) novo = normaliza(JSON.parse(JSON.stringify(s))); else if (s.v === 2) novo = normaliza(deV2(s)); else throw 0;
  snapshot(); state = novo; if (state.auto === 'otimizar') state.etapas.forEach(otimizarEtapa); state.auto = null; delete state.migrado;
  syncCfg(); changed({table:true}); fitAtual();
}
async function importarTexto(txt){
  try {
    if (!/^\s*</.test(txt)){ const s = JSON.parse(txt), mat = s.matriz; await importarFotos(s.fotosDados); delete s.fotosDados; delete s.matriz; mesclarMatriz(mat, PJ_ID); aplicarNoAtual(s); toast('Roteiro aberto.', true); return; }
    const r = lerRoteiroHTML(txt);
    if (!r || !r.lista.length){ toast('Esse HTML não tem um roteiro salvo dentro (ele nunca foi gravado com o botão Salvar).'); return; }
    await importarFotos(r.fotos); mesclarMatriz(r.mat, r.atual);
    let atual = false; const novos = [], atualizados = [], iguais = [];
    for (const p of r.lista){
      if (p.id === PJ_ID){ atual = p; continue; }
      const ds = dadosDoArquivo(p, r), m = metaDe(p.id), ls = m && lsGet(keyEstado(p.id));
      if (m && ls && (ls.mod || 0) >= (p.estado.mod || 0)){ iguais.push(p.nome); continue; }
      let dados = ds.dados, estado = p.estado, id = p.id;
      if (ds.renomear){ id = novoIdProj(); const x = renomearIds(dados, estado, id); dados = x.dados; estado = x.estado; }
      if (m && !ds.renomear){ if (ds.tipo === 'proprio') lsSet(KEY_DADOS + id, dados); lsSet(keyEstado(id), estado); Object.assign(m, {nome: p.nome || m.nome}); atualizados.push(m.nome); }
      else { const meta = {id, nome: p.nome || 'Projeto', criado: p.criado || new Date().toISOString(), base: p.base || BH0, baseMun: p.baseMun, fonte: p.fonte || (ds.tipo === 'anexo' ? FONTE_BASE : 'arquivo'), tipo: ds.tipo, ...(ds.tipo === 'anexo' ? {versaoBase: VERSAO_BASE} : {})};
        const mod = estado.mod; if (registrarProjeto(meta, dados, estado)){ const st = lsGet(keyEstado(id)); if (st && mod){ st.mod = mod; lsSet(keyEstado(id), st); } novos.push(meta.nome); } }
      const rt = r.mat && r.mat.rotasP && r.mat.rotasP[p.id]; if (rt && !ds.renomear) ROTAS.set(id, rt);
    }
    lsSet(KEY_IDX, IDX); NOS_OUTROS = null; salvaMatriz(); gravarApp();
    if (atual) aplicarNoAtual(atual.estado);
    const partes = [atual ? `"${PJ.nome}" foi atualizado com a versão do arquivo` : '', novos.length ? `${novos.length === 1 ? 'novo projeto' : 'novos projetos'}: ${novos.join(', ')}` : '', atualizados.length ? `atualizados: ${atualizados.join(', ')}` : '', !atual && !novos.length && !atualizados.length && iguais.length ? 'os projetos do arquivo já estavam iguais ou mais novos aqui' : ''].filter(Boolean);
    toast(`Arquivo aberto: ${partes.join('; ')}.`, !!atual);
    if (!atual && (novos.length || atualizados.length)) setTimeout(abrirProjetos, 400);
  } catch(err){ toast('Este arquivo não é um roteiro salvo por esta página.'); }
}
const menu = document.getElementById('menu');
document.getElementById('bMenu').onclick = ev => { ev.stopPropagation();
  if (mobile()){ abrirMenuMob('Relatórios e arquivo', menu.querySelector('.menu-lista'), ev2 => menuHandler(ev2)); return; }
  const o = menu.classList.toggle('aberto'); ev.currentTarget.setAttribute('aria-expanded', o); };
const dMenuMob = document.getElementById('dMenuMob');
function abrirMenuMob(titulo, origemLista, handler){
  document.getElementById('dMenuMobTit').textContent = titulo;
  const corpo = document.getElementById('dMenuMobCorpo');
  corpo.innerHTML = [...origemLista.children].filter(el => !el.hidden).map(el => el.outerHTML).join('');
  corpo.onclick = ev => { if (!ev.target.closest('button')) return; dMenuMob.close(); handler(ev); };
  dMenuMob.showModal(); corpo.scrollTop = 0;
}
document.addEventListener('click', () => menu.classList.remove('aberto'));
const menuHandler = menu.querySelector('.menu-lista').onclick = ev => {
  const b = ev.target.closest('[data-acao]'); if (!b) return; const a = b.dataset.acao; menu.classList.remove('aberto');
  if (a === 'crono') abrirCrono();
  if (a === 'exec') abrirExecutado();
  if (a === 'gastos') abrirGastos();
  if (a === 'fotos-zip') baixarFotosZip();
  if (a === 'offline') prepararOffline();
  if (a === 'limpar-manual') abrirLimpar();
  if (a === 'tabela') abrirTabela();
  if (a === 'csv') exportCSV();
  if (a === 'csvApoio') exportCSVApoio();
  if (a === 'geojson') exportGeoJSON();
  if (a === 'inverter'){ const e = etapaAtual(); if (e){ snapshot(); e.stops.reverse(); e.ordem = 'manual'; changed(); toast('Sentido invertido.', true); } }
  if (a === 'kml') exportKML();
  if (a === 'limpar'){ const e = etapaAtual(); if (e && e.stops.some(s => s.feito)){ snapshot(); e.stops.forEach(s => s.feito = null); changed(); toast('Visitas desta etapa desmarcadas.', true); } }
  if (a === 'json'){
    fotosParaSalvar().then(fd => baixar('roteiro_estacoes.json', JSON.stringify({...state, auto:null, matriz:{road: packRoad(road), SNAP, PAV, rotas: rotasAtuais()}, fotosDados: fd}), 'application/json'));
    toast('Roteiro salvo com as distâncias pelas estradas. Ao abrir em outro aparelho, ele funciona mesmo sem acesso ao serviço de rotas.');
  }
  if (a === 'abrir') document.getElementById('arquivo').click();
  if (a === 'restaurar'){ snapshot(); const k = state.etapas.length || 3; dividir(k); state.aba = 'geral'; changed(); fitAtual(); toast(`Pontos redistribuídos em ${state.etapas.length} etapas. Hospedagens e paradas foram mantidas.`, true); }
};

/* ================= botões e premissas ================= */
document.getElementById('bOtimizar').onclick = () => {
  if (!etapaAtual()){ redistribuirTodas(); return; }
  const e = etapaAtual();
  if (e.stops.length < 3){ toast('Com menos de 3 pontos não há ordem a otimizar.'); return; }
  const antes = JSON.stringify(state), eraManual = e.ordem === 'manual';
  const ganho = otimizarEtapa(e);
  if (!ganho){ if (eraManual){ undoStack.push(antes); changed(); } else { save(); render(); }
    toast('Esta já é a melhor rota encontrada para a etapa. Nada foi alterado.'); return; }
  undoStack.push(antes); if (undoStack.length > 80) undoStack.shift();
  state.auto = null; save(); render(); scheduleRoutes();
  toast(`Rota otimizada: cerca de ${fmtH(ganho)} a menos de estrada.`, true);
};
document.getElementById('bDesfazer').onclick = desfazer;
document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){ ev.preventDefault(); desfazer(); } });
function resumoCfg(){ const c = state.cfg; return `${fmtHora(c.inicio)} às ${fmtHora(c.fim)}, ${num(c.visita, c.visita % 1 ? 1 : 0)} h por ponto${c.juntar ? ' (dupla F+P = 1 visita)' : ''}${+c.alm ? `, almoço ${fmtH(+c.alm + (+c.almDesl || 0))}` : ''}${+c.lan ? `, lanche ${fmtH(+c.lan)}` : ''}, ${c.base === 'vel' ? `${c.vel} km/h` : `tempo do roteador +${c.folga}%`}${c.estrada === 'pav' ? ', só estradas pavimentadas' : ''}`; }
function syncCfg(){
  if (typeof syncEstrada === 'function') syncEstrada();
  const c = state.cfg;
  document.getElementById('cIni').value = fmtHora(c.inicio); document.getElementById('cFim').value = fmtHora(c.fim);
  document.getElementById('cVisita').value = c.visita; document.getElementById('cJuntar').checked = !!c.juntar; document.getElementById('cBase').value = c.base;
  document.getElementById('cVel').value = c.vel; document.getElementById('cFolga').value = c.folga;
  document.getElementById('cAlm').value = Math.round((+c.alm || 0) * 60); document.getElementById('cAlmDesl').value = Math.round((+c.almDesl || 0) * 60); document.getElementById('cAlmIni').value = fmtHora(c.almIni ?? 11.5);
  document.getElementById('cLan').value = Math.round((+c.lan || 0) * 60); document.getElementById('cLanIni').value = fmtHora(c.lanIni ?? 15.5);
  document.getElementById('lVel').hidden = c.base !== 'vel'; document.getElementById('lFolga').hidden = c.base !== 'osrm';
  document.getElementById('ajResumo').textContent = resumoCfg();
}
document.getElementById('ajustes').addEventListener('change', ev => {
  const c = {...state.cfg}, id = ev.target.id, v = ev.target.value;
  if (id === 'cIni') c.inicio = horaNum(v); else if (id === 'cFim') c.fim = horaNum(v);
  else if (id === 'cJuntar') c.juntar = ev.target.checked;
  else if (id === 'cVisita') c.visita = parseFloat(v); else if (id === 'cBase') c.base = v;
  else if (id === 'cVel') c.vel = parseFloat(v); else if (id === 'cFolga') c.folga = parseFloat(v);
  else if (id === 'cAlm') c.alm = (parseFloat(String(v).replace(',', '.')) || 0) / 60; else if (id === 'cAlmDesl') c.almDesl = (parseFloat(String(v).replace(',', '.')) || 0) / 60;
  else if (id === 'cAlmIni') c.almIni = horaNum(v); else if (id === 'cLan') c.lan = (parseFloat(String(v).replace(',', '.')) || 0) / 60; else if (id === 'cLanIni') c.lanIni = horaNum(v);
  if (!(c.fim > c.inicio + 1) || !(c.visita >= 0) || !(c.vel >= 10) || !(c.folga >= 0) || !(c.alm >= 0 && c.almDesl >= 0 && c.lan >= 0) || c.alm + c.almDesl + c.lan > (c.fim - c.inicio) / 2){ toast('Valor inválido nas premissas.'); syncCfg(); return; }
  snapshot(); state.cfg = c; syncCfg(); save(); render();
});
document.getElementById('listaEst').innerHTML = DATA.est.map(e => `<option value="${esc(`${e.nome} – ${e.cod.join(' / ')} – ${estMun(e)}`)}">`).join('');
document.getElementById('todos').innerHTML = Object.keys(MUN).sort((a, b) => MUN[a].n.localeCompare(MUN[b].n, 'pt-BR')).map(id => `<option value="${esc(munNome(id))}">`).join('');
const porNomeMun = Object.fromEntries(Object.keys(MUN).map(id => [munNome(id).toLowerCase(), id]));
function acharEst(txt){
  const q = txt.trim().toLowerCase(); if (!q) return null;
  const exato = DATA.est.find(e => `${e.nome} – ${e.cod.join(' / ')} – ${estMun(e)}`.toLowerCase() === q); if (exato) return exato.id;
  const c = DATA.est.filter(e => (e.nome + ' ' + e.cod.join(' ') + ' ' + estMun(e)).toLowerCase().includes(q));
  return c.length === 1 ? c[0].id : (c.length ? c : null);
}

let toastT;
function toast(msg, comDesfazer){
  const t = document.getElementById('toast');
  t.innerHTML = `<span>${esc(msg)}</span>${comDesfazer ? '<button type="button">Desfazer</button>' : ''}`;
  const b = t.querySelector('button'); if (b) b.onclick = () => { desfazer(); t.classList.remove('vis'); };
  t.classList.add('vis'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('vis'), 5500);
}

/* ================= Otimizar no Quadro geral: redistribui os pontos entre as etapas ================= */
/* Refaz a divisão com o mesmo número de etapas (inclusive as vazias recém-criadas), equilibrando o tempo entre elas
   ao longo da rota otimizada. Cada grupo novo herda nome, cor, data e dias da etapa antiga com quem mais tem pontos
   em comum, para que as etapas mudem o mínimo possível. */
function redistribuirTodas(){
  const k = state.etapas.length;
  if (!k){ toast('Crie ao menos uma etapa (botão "+ Etapa").'); return; }
  const antes = {}; state.etapas.forEach(e => e.stops.forEach(s => antes[s.id] = e.id));
  const tempoAntes = state.etapas.reduce((a, e) => a + P[e.id].tot.h, 0);
  const medida = () => { const v = state.etapas.map(e => P[e.id].tot.h + P[e.id].tot.visit); return {max: Math.max(0, ...v), soma: v.reduce((a, x) => a + x, 0), dias: state.etapas.reduce((a, e) => a + P[e.id].days.length, 0)}; };
  const m0 = medida(), tinhaSolto = state.pool.length > 0 || state.etapas.some(e => !e.stops.length);
  const velhas = state.etapas.map(e => ({...e}));
  snapshot();
  const fixos = []; state.etapas.forEach(e => { e.stops.filter(x => x.fixo).forEach(x => fixos.push([e.id, x])); e.stops = e.stops.filter(x => !x.fixo); });
  if (state.etapas.some(e => e.stops.length) || state.pool.length) dividir(k); else state.etapas.forEach(e => e.stops = []);
  const grupos = state.etapas.map(e => e.stops);
  const pares = [];
  grupos.forEach((g, i) => velhas.forEach((v, j) => pares.push([g.filter(s => antes[s.id] === v.id).length, i, j])));
  pares.sort((x, y) => y[0] - x[0]);
  const gUsado = new Set(), vUsado = new Set(), destino = {};
  pares.forEach(([n, i, j]) => { if (!gUsado.has(i) && !vUsado.has(j)){ gUsado.add(i); vUsado.add(j); destino[j] = i; } });
  state.etapas = velhas.map((v, j) => {
    const st = destino[j] !== undefined ? grupos[destino[j]] : [];
    const ids = new Set(st.map(s => s.id));
    return {...v, stops: st, pern: Object.fromEntries(Object.entries(v.pern || {}).filter(([sid]) => ids.has(sid)))};
  });
  state.pool = [];
  fixos.forEach(([eid, x]) => { const e = etapaPorId(eid); e.stops.splice(bestInsertPos(e, x.id), 0, x); });
  if (fixos.length) new Set(fixos.map(f => f[0])).forEach(eid => otimizarEtapa(etapaPorId(eid)));
  reassignApoios();
  if (!etapaPorId(state.aba)) state.aba = 'geral';
  buildLOC(); P = {}; state.etapas.forEach(e => P[e.id] = buildPlan(e));
  const m1 = medida();
  const melhorou = tinhaSolto || m1.dias < m0.dias || m1.max < m0.max - .25 || (m1.max <= m0.max + 1e-6 && m1.soma < m0.soma - .25);
  if (!melhorou){
    const pre = undoStack.pop(); state = normaliza(JSON.parse(pre));
    let ganhos = 0; state.etapas.forEach(e => { if (e.ordem !== 'manual') ganhos += otimizarEtapa(e); });
    if (ganhos > 0) undoStack.push(pre);
    save(); render(); scheduleRoutes();
    toast(ganhos > 0 ? `A divisão entre as etapas já era a melhor; a ordem dentro das etapas melhorou ${fmtH(ganhos)}.` : 'Esta já é a melhor distribuição encontrada. Nada foi alterado.', ganhos > 0);
    return;
  }
  changed(); fitAtual();
  const mudou = state.etapas.reduce((a, e) => a + e.stops.filter(s => antes[s.id] !== e.id).length, 0);
  const dif = tempoAntes - state.etapas.reduce((a, e) => a + P[e.id].tot.h, 0);
  const fx = fixos.length ? ` ${fixos.length} ${fixos.length === 1 ? 'ponto fixado' : 'pontos fixados'} manualmente ${fixos.length === 1 ? 'ficou' : 'ficaram'} onde ${fixos.length === 1 ? 'estava' : 'estavam'}.` : '';
  toast((mudou ? `Pontos redistribuídos entre as ${k} etapas: ${mudou} mudaram de etapa${Math.abs(dif) > 0.05 ? `, ${dif > 0 ? `${fmtH(dif)} a menos` : `${fmtH(-dif)} a mais`} de estrada (etapas mais equilibradas)` : ''}.` : 'A distribuição atual já era a melhor encontrada; a ordem de cada etapa foi otimizada.') + fx, true);
}

/* ================= Planejar pontos: seleção em massa ================= */
const SEL = new Set();
let modoSel = false;
const plBusca = document.getElementById('plBusca'), plFiltro = document.getElementById('plFiltro'), plDest = document.getElementById('plDest');
function setModoSel(v){
  modoSel = !!v;
  const b = document.getElementById('plMapa'); b.setAttribute('aria-pressed', modoSel); b.classList.toggle('on', modoSel);
  b.querySelector('span').textContent = modoSel ? 'Selecionando no mapa' : 'Selecionar no mapa';
  document.getElementById('mapa').classList.toggle('modo-sel', modoSel);
  if (modoSel) map.closePopup();
  renderMapa();
}
function visiveisPl(){
  const q = (plBusca.value || '').trim().toLowerCase(), f = plFiltro.value;
  return DATA.est.filter(est => {
    const w = LOC[est.id];
    if (f === '_pool' && !(w && w.pool)) return false;
    if (f && f !== '_pool' && !(w && w.e && w.e.id === f)) return false;
    if (q && !(est.nome + ' ' + est.nomeOrig + ' ' + est.cod.join(' ') + ' ' + estMun(est) + ' ' + (est.rio || '')).toLowerCase().includes(q)) return false;
    return true;
  });
}
function opcoesSel(el, html){ const v = el.value; el.innerHTML = html; if ([...el.options].some(o => o.value === v)) el.value = v; }
function renderPlanner(){
  opcoesSel(plFiltro, `<option value="">Todas as etapas</option>${state.etapas.map(e => `<option value="${e.id}">${esc(e.nome)} (${e.stops.length})</option>`).join('')}<option value="_pool">Sem etapa (${state.pool.length})</option>`);
  opcoesSel(plDest, `<option value="" disabled selected hidden>Mover para…</option>${state.etapas.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}<option value="+">+ Nova etapa</option><option value="_pool">Sem etapa</option>`);
  [...SEL].forEach(id => { if (!EST[id]) SEL.delete(id); });
  const vis = visiveisPl();
  if (porMun()) vis.sort((a, b) => MUN[munDe(a.id)].n.localeCompare(MUN[munDe(b.id)].n, 'pt-BR') || a.n - b.n);
  let munAnt = null;
  document.getElementById('distribLista').innerHTML = vis.length ? `<table class="dist pl"><tbody>${vis.map(est => {
    let cab = '';
    if (porMun() && munDe(est.id) !== munAnt){ munAnt = munDe(est.id); const ids = vis.filter(x => munDe(x.id) === munAnt).map(x => x.id), tp = contaTipos(ids), all = ids.every(id => SEL.has(id));
      cab = `<tr class="grp"><td class="ck"><input type="checkbox" data-plmun="${munAnt}" ${all ? 'checked' : ''} aria-label="Selecionar os pontos de ${esc(MUN[munAnt].n)}"></td><td colspan="3"><b>${esc(MUN[munAnt].n)}</b> <span class="dica" style="display:inline">${ids.length} ${ids.length === 1 ? 'ponto' : 'pontos'} · ${tp.F ? `${tp.F} fluv.` : ''}${tp.F && tp.P ? ', ' : ''}${tp.P ? `${tp.P} pluv.` : ''}</span></td></tr>`; } const w = LOC[est.id], e = w && w.e, sel = SEL.has(est.id);
    const t = w && w.s.visita != null ? `<span class="tag" title="Tempo no ponto">${num(w.s.visita, w.s.visita % 1 ? 2 : 0)} h</span>` : '';
    const linha = `<tr class="${sel ? 'sel' : ''}" data-plrow="${est.id}"><td class="ck"><input type="checkbox" data-plsel="${est.id}" ${sel ? 'checked' : ''} aria-label="Selecionar ${esc(est.nome)}"></td><td class="num">${est.n}</td>
      <td><span class="dot" style="--c:${e ? e.cor : '#9AA5A1'}"></span><a href="#" data-ver="${est.id}">${esc(est.nome)}</a> ${tipoBadge(est)}${t}${w && w.s.fixo ? '<span class="fixo" title="Fixado manualmente na etapa">manual</span>' : ''}<br><span class="dica" style="margin:0">${esc(estMun(est))}${e ? ` · parada ${w.k + 1}` : ''}</span></td>
      <td><select data-est="${est.id}" aria-label="Etapa de ${esc(est.nome)}">${opcoesEtapa(e ? e.id : '')}</select></td></tr>`;
    return cab + linha; }).join('')}</tbody></table>` : '<p class="dica">Nenhum ponto com esse filtro.</p>';
  atualizaContSel(vis);
}
function atualizaContSel(vis = visiveisPl()){
  const n = SEL.size, todos = document.getElementById('plTodos'), nv = vis.filter(e => SEL.has(e.id)).length;
  document.getElementById('plN').textContent = n ? `${n} ${n === 1 ? 'selecionado' : 'selecionados'}` : 'Selecionar visíveis';
  todos.checked = vis.length > 0 && nv === vis.length; todos.indeterminate = nv > 0 && nv < vis.length;
  document.getElementById('plMover').disabled = !n; document.getElementById('plTempoBt').disabled = !n; document.getElementById('plLimpar').disabled = !n;
  document.getElementById('distrib').classList.toggle('com-sel', n > 0);
}
function alternaSel(id, v){
  const on = v !== undefined ? v : !SEL.has(id);
  on ? SEL.add(id) : SEL.delete(id);
  const row = document.querySelector(`[data-plrow="${id}"]`);
  if (row){ row.classList.toggle('sel', on); row.querySelector('input').checked = on; }
  atualizaContSel(); renderMapa();
}
plBusca.addEventListener('input', renderPlanner);
plFiltro.addEventListener('change', renderPlanner);
document.getElementById('plTodos').addEventListener('change', ev => { visiveisPl().forEach(e => ev.target.checked ? SEL.add(e.id) : SEL.delete(e.id)); renderPlanner(); renderMapa(); });
document.getElementById('plLimpar').onclick = () => { SEL.clear(); renderPlanner(); renderMapa(); };
document.getElementById('plMapa').onclick = () => {
  setModoSel(!modoSel);
  if (modoSel){ document.getElementById('distrib').open = true; toast('Toque nas estações do mapa para marcar ou desmarcar. No computador, segure Shift e arraste para marcar uma área.'); }
};
document.getElementById('distribLista').addEventListener('change', ev => { const gm = ev.target.closest('[data-plmun]');
  if (gm){ ev.stopPropagation(); visiveisPl().filter(x => munDe(x.id) === gm.dataset.plmun).forEach(x => gm.checked ? SEL.add(x.id) : SEL.delete(x.id)); renderPlanner(); renderMapa(); return; }
  const c = ev.target.closest('[data-plsel]'); if (c){ ev.stopPropagation(); alternaSel(c.dataset.plsel, c.checked); } }, true);
document.getElementById('plMover').onclick = () => {
  const ids = [...SEL]; if (!ids.length) return;
  let dest = plDest.value;
  if (!dest && dest !== '_pool'){ plDest.focus(); toast('Escolha para onde mover os pontos selecionados.'); return; }
  snapshot();
  let nova = null;
  if (dest === '+'){ nova = novaEtapa(state.etapas); state.etapas.push(nova); dest = nova.id; }
  const alvoId = dest === '_pool' ? '' : dest;
  ids.forEach(id => { buildLOC(); const w = LOC[id]; if (!((w.e && w.e.id === alvoId) || (w.pool && !alvoId))) colocar(id, alvoId); buildLOC(); if (LOC[id]) LOC[id].s.fixo = !!alvoId; });
  const e = etapaPorId(alvoId); if (e && e.stops.length > 2) otimizarEtapa(e);
  SEL.clear(); plDest.value = '';
  changed();
  toast(`${ids.length} ${ids.length === 1 ? 'ponto movido' : 'pontos movidos'} para ${e ? e.nome : '"Sem etapa"'}${e ? '; a ordem da etapa foi otimizada' : ''}.`, true);
};
document.getElementById('plTempoBt').onclick = () => {
  const ids = [...SEL]; if (!ids.length) return;
  const txt = document.getElementById('plTempo').value.trim(), v = txt === '' ? null : parseFloat(txt.replace(',', '.'));
  if (v !== null && !(v >= 0 && v <= 12)){ toast('Informe o tempo em horas, por exemplo 2 ou 1,5. Deixe vazio para voltar ao padrão.'); return; }
  snapshot(); buildLOC(); ids.forEach(id => { const w = LOC[id]; if (w) w.s.visita = v; });
  changed(); toast(v === null ? `Tempo padrão (${num(state.cfg.visita, 1)} h) aplicado a ${ids.length} pontos.` : `Tempo de ${num(v, v % 1 ? 2 : 0)} h aplicado a ${ids.length} pontos.`, true);
};
/* Shift + arrastar: seleciona as estações dentro do retângulo (só no modo de seleção). */
(() => {
  const bz = map.boxZoom, orig = bz._onMouseUp;
  bz._onMouseUp = function(e){
    if (!modoSel) return orig.call(this, e);
    if ((e.which !== 1) && (e.button !== 0)) return;
    this._finish(); if (!this._moved) return;
    this._clearDeferredResetState(); this._resetStateTimeout = setTimeout(L.Util.bind(this._resetState, this), 0);
    const bounds = L.latLngBounds(this._map.containerPointToLatLng(this._startPoint), this._map.containerPointToLatLng(this._point));
    let n = 0; DATA.est.forEach(est => { if (bounds.contains(est.pts[0]) && !SEL.has(est.id)){ SEL.add(est.id); n++; } });
    renderPlanner(); renderMapa(); toast(n ? `${n} estações adicionadas à seleção (${SEL.size} no total).` : 'Nenhuma estação nova nessa área.');
  };
})();

/* ================= exibir por município ================= */
const porMun = () => state.vista === 'mun';
const munDe = id => EST[id].muns[0];
function grupoMun(ids){
  const g = {}; ids.forEach(id => { const m = munDe(id); (g[m] = g[m] || []).push(id); }); return g;
}
function contaTipos(ids){ let F = 0, Pq = 0; ids.forEach(id => EST[id].tipos.forEach(t => t.startsWith('Fluv') ? F++ : Pq++)); return {F, P: Pq}; }
function marcadorMun(m, ids, cores, rotulo, apagado){
  const t = contaTipos(ids), fundo = cores.length > 1 ? `linear-gradient(135deg, ${cores.map((c, i) => `${c} ${i * 100 / cores.length}% ${(i + 1) * 100 / cores.length}%`).join(', ')})` : cores[0];
  const sel = !etapaAtual() && ids.every(id => SEL.has(id));
  const html = `<div class="mkm${apagado ? ' apagado' : ''}${sel ? ' selec' : ''}" style="--fundo:${fundo}"><b>${ids.length}</b><span>${t.F ? `<i class="F">${t.F}F</i>` : ''}${t.P ? `<i class="P">${t.P}P</i>` : ''}</span></div>`;
  return L.marker(ll(m), {zIndexOffset: apagado ? 0 : 1100, title: `${MUN[m].n}: ${ids.length} ${ids.length === 1 ? 'ponto' : 'pontos'} (${t.F} fluviométrica${t.F === 1 ? '' : 's'}, ${t.P} pluviométrica${t.P === 1 ? '' : 's'})${rotulo ? `, paradas ${rotulo}` : ''}`,
    icon: L.divIcon({className:'', iconSize:[46,24], iconAnchor:[23,12], html})})
    .on('click', ev => { if (modoSel && !etapaAtual()){ const on = !ids.every(id => SEL.has(id)); ids.forEach(id => on ? SEL.add(id) : SEL.delete(id)); renderPlanner(); renderMapa(); return; } popupMun(m, ev.latlng); });
}
function desenhaMunicipios(){
  const atual = etapaAtual();
  if (atual){
    const p = P[atual.id], g = {};
    atual.stops.forEach((x, k) => { const m = munDe(x.id); (g[m] = g[m] || {ids:[], ks:[], d:p.info[k].d}).ids.push(x.id); g[m].ks.push(k + 1); });
    Object.entries(g).forEach(([m, v]) => { const off = focusDay !== null && !v.ks.some(k => p.info[k-1].d === focusDay);
      marcadorMun(m, v.ids, [corDia(v.d)], v.ks.join(', '), off).addTo(marcadores); });
  } else {
    const todos = [...state.etapas.flatMap(e => e.stops.map(x => x.id)), ...state.pool.map(x => x.id)];
    Object.entries(grupoMun(todos)).forEach(([m, ids]) => {
      const cores = [...new Set(ids.map(id => LOC[id] && LOC[id].e ? LOC[id].e.cor : '#9AA5A1'))];
      marcadorMun(m, ids, cores, '', false).addTo(marcadores);
    });
  }
}
document.getElementById('vModo').addEventListener('change', ev => { state.vista = ev.target.value; save(); render(); });

/* ================= remover dados adicionados manualmente ================= */
const dLimpar = document.getElementById('dLimpar');
function contManuais(){
  const st = [...state.etapas.flatMap(e => e.stops), ...state.pool];
  return {
    apoios: state.apoios.length, gastos: state.apoios.reduce((a, x) => a + (x.gastos || []).length, 0),
    visitas: st.filter(x => x.feito || x.relato).length, notas: st.filter(x => x.nota).length,
    fixos: st.filter(x => x.fixo).length, pern: state.etapas.reduce((a, e) => a + Object.keys(e.pern || {}).length, 0),
    tempos: st.filter(x => x.visita != null).length, fotos: st.reduce((a, x) => a + (x.fotos || []).length, 0), ordem: state.etapas.filter(e => e.ordem === 'manual').length
  };
}
const ITENS_LIMPAR = [
  ['apoios', c => `Hospedagens e paradas registradas (${c.apoios})`],
  ['visitas', c => `Visitas marcadas e anotações das visitas (${c.visitas})`],
  ['notas', c => `Observações das estações (${c.notas})`],
  ['fotos', c => `Fotos das estações (${c.fotos})`],
  ['fixos', c => `Pontos fixados manualmente em etapas (${c.fixos}); eles ficam onde estão, mas o Otimizar volta a poder movê-los`],
  ['pern', c => `Cidades de pernoite escolhidas à mão (${c.pern}); voltam ao cálculo automático`],
  ['tempos', c => `Tempos por ponto personalizados (${c.tempos}); voltam ao padrão das premissas`],
  ['ordem', c => `Ordem manual das paradas (${c.ordem} ${c.ordem === 1 ? 'etapa' : 'etapas'}); as etapas são reotimizadas`]
];
function abrirLimpar(){
  const c = contManuais();
  document.getElementById('limparLista').innerHTML = ITENS_LIMPAR.map(([k, txt]) => { const n = c[k];
    return `<label class="lim${n ? '' : ' vazio-l'}"><input type="checkbox" value="${k}" ${n ? 'checked' : 'disabled'}><span>${txt(c)}</span></label>`; }).join('');
  dLimpar.showModal();
}
document.getElementById('bLimparOk').onclick = () => {
  const sel = new Set([...document.querySelectorAll('#limparLista input:checked')].map(i => i.value));
  if (!sel.size){ dLimpar.close(); return; }
  snapshot();
  const st = [...state.etapas.flatMap(e => e.stops), ...state.pool];
  if (sel.has('apoios')) state.apoios = [];
  st.forEach(x => {
    if (sel.has('visitas')){ x.feito = null; x.relato = ''; x.sit = ''; }
    if (sel.has('notas')) x.nota = '';
    if (sel.has('fotos')) x.fotos = [];
    if (sel.has('fixos')) x.fixo = false;
    if (sel.has('tempos')) x.visita = null;
  });
  if (sel.has('pern')) state.etapas.forEach(e => e.pern = {});
  if (sel.has('ordem')) state.etapas.forEach(e => { if (e.ordem === 'manual') otimizarEtapa(e); });
  editRelato = null;
  dLimpar.close(); changed({table: sel.has('pern')});
  toast(`Dados manuais removidos (${sel.size} ${sel.size === 1 ? 'tipo' : 'tipos'}). Use Desfazer se precisar voltar.`, true);
};

/* ================= FOTOS GEORREFERENCIADAS ================= */
/* As imagens ficam no IndexedDB do navegador (não cabem no localStorage); no estado fica só a ficha de cada foto.
   Ao usar "Salvar", as fotos vão junto, dentro do próprio arquivo HTML. */
const FDB = {
  _db: null,
  abrir(){ return this._db || (this._db = new Promise((ok, no) => { try { const r = indexedDB.open('roteiro-fotos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch(e){ no(e); } })); },
  async op(modo, fn){ const d = await this.abrir(); return new Promise((ok, no) => { const t = d.transaction('f', modo), st = t.objectStore('f'), r = fn(st); t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); }); },
  get(id){ return this.op('readonly', st => st.get(id)); },
  put(id, v){ return this.op('readwrite', st => st.put(v, id)); },
  del(id){ return this.op('readwrite', st => st.delete(id)); }
};
const FOTO = {};
async function fotoURL(id){ if (FOTO[id]) return FOTO[id]; let v = null; try { v = await FDB.get(id); } catch(e){} if (!v && window.RC && RC.ativo) v = await RC.buscarFoto(id); if (v) FOTO[id] = v; return v || null; }
function hidratar(root){ if (!root) return; root.querySelectorAll('img[data-foto]:not([src])').forEach(async img => { const u = await fotoURL(img.dataset.foto); if (u) img.src = u; else img.closest('.th, figure') && img.closest('.th, figure').classList.add('sem-img'); }); }
(() => { // fotos embutidas no arquivo salvo
  try { const emb = JSON.parse(document.getElementById('fotos').textContent);
    if (emb) Object.entries(emb).forEach(([id, u]) => { FOTO[id] = u; FDB.get(id).then(v => { if (!v) FDB.put(id, u); }).catch(() => {}); });
  } catch(e){}
})();
const todasFotos = () => [...state.etapas.flatMap(e => e.stops.map((s, k) => ({s, e, k}))), ...state.pool.map(s => ({s, e:null, k:-1}))].flatMap(({s, e, k}) => (s.fotos || []).map(f => ({f, s, e, k})));
const fmtDH = iso => { const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); };

function pegarGPS(){
  return new Promise(ok => {
    if (!navigator.geolocation) return ok(null);
    let feito = false; const fim = v => { if (!feito){ feito = true; ok(v); } };
    setTimeout(() => fim(null), 25000);
    try { navigator.geolocation.getCurrentPosition(p => fim({lat:p.coords.latitude, lon:p.coords.longitude, prec:p.coords.accuracy}), () => fim(null), {enableHighAccuracy:true, timeout:20000, maximumAge:120000}); } catch(e){ fim(null); }
  });
}
let fotoAlvo = null, fotoCamera = false, gpsPromessa = null;
function iniciarFoto(sid, camera){
  fotoAlvo = sid; fotoCamera = camera; gpsPromessa = pegarGPS();
  const inp = document.getElementById(camera ? 'fotoCam' : 'fotoGal'); inp.value = ''; inp.click();
}
const lerDataURL = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(f); });
const carregarImg = u => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('imagem')); i.src = u; });
function lerExif(u){
  const out = {};
  if (!/^data:image\/jpe?g/i.test(u) || !window.piexif) return out;
  try {
    const ex = piexif.load(u), g = ex.GPS || {}, G = piexif.GPSIFD;
    if (g[G.GPSLatitude] && g[G.GPSLongitude]){
      const lat = piexif.GPSHelper.dmsRationalToDeg(g[G.GPSLatitude], g[G.GPSLatitudeRef]), lon = piexif.GPSHelper.dmsRationalToDeg(g[G.GPSLongitude], g[G.GPSLongitudeRef]);
      if (isFinite(lat) && isFinite(lon) && (lat || lon)) out.gps = {lat, lon, prec:null};
    }
    const dt = (ex.Exif || {})[piexif.ExifIFD.DateTimeOriginal];
    if (dt){ const m = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(dt); if (m) out.data = new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5], +m[6]); }
  } catch(e){}
  return out;
}
function carimbar(ctx, w, h, linhas){
  const fs = Math.max(13, Math.round(w / 52)), lh = Math.round(fs * 1.35), pad = Math.round(fs * .7), bh = lh * linhas.length + pad * 2;
  ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, h - bh, w, bh);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  linhas.forEach((t, i) => { ctx.font = `${i === 0 ? '700 ' : ''}${fs}px "Segoe UI", Roboto, Arial, sans-serif`; ctx.fillText(t, pad, h - bh + pad + i * lh, w - pad * 2); });
}
function exifGPS(lat, lon, data, desc){
  const dms = v => { v = Math.abs(v); const d = Math.floor(v), mf = (v - d) * 60, m = Math.floor(mf), sc = Math.round((mf - m) * 60 * 1000); return [[d, 1], [m, 1], [sc, 1000]]; };
  const G = piexif.GPSIFD, dt = `${data.getFullYear()}:${pad2(data.getMonth()+1)}:${pad2(data.getDate())} ${pad2(data.getHours())}:${pad2(data.getMinutes())}:${pad2(data.getSeconds())}`;
  return piexif.dump({
    '0th': {[piexif.ImageIFD.ImageDescription]: semAcento(desc).slice(0, 250), [piexif.ImageIFD.Software]: 'Roteiro de estacoes - BH', [piexif.ImageIFD.DateTime]: dt},
    'Exif': {[piexif.ExifIFD.DateTimeOriginal]: dt, [piexif.ExifIFD.DateTimeDigitized]: dt},
    'GPS': {[G.GPSVersionID]: [2, 3, 0, 0], [G.GPSLatitudeRef]: lat < 0 ? 'S' : 'N', [G.GPSLatitude]: dms(lat), [G.GPSLongitudeRef]: lon < 0 ? 'W' : 'E', [G.GPSLongitude]: dms(lon), [G.GPSMapDatum]: 'WGS-84'}
  });
}
async function processarFoto(file, sid, gps, camera){
  const est = EST[sid]; buildLOC(); const w = LOC[sid]; if (!w) return null;
  const orig = await lerDataURL(file), ex = lerExif(orig), img = await carregarImg(orig);
  const recente = camera || (Date.now() - (file.lastModified || 0) < 15 * 60e3);
  let loc;
  if (ex.gps) loc = {...ex.gps, fonte:'GPS da foto'};
  else if (gps && recente) loc = {...gps, fonte:'GPS do aparelho'};
  else loc = {lat: est.pts[0][0], lon: est.pts[0][1], prec:null, fonte:'Coordenada da estação (foto sem GPS)'};
  const quando = ex.data || new Date(camera ? Date.now() : (file.lastModified || Date.now()));
  const MAX = 1600, esc_ = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * esc_), H = Math.round(img.naturalHeight * esc_);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, W, H);
  const dist = Math.round(havLL([loc.lat, loc.lon], est.pts[0]) * 1000);
  carimbar(ctx, W, H, [
    `${est.nome} · ${est.cod.join(' / ')} · ${tipoTxt(est)}`,
    `${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}${loc.prec ? ` ±${Math.round(loc.prec)} m` : ''} · ${loc.fonte}${loc.fonte !== 'Coordenada da estação (foto sem GPS)' ? ` · ${fmtM(dist)} da estação` : ''}`,
    `${fmtDH(quando.toISOString())} · ${estMun(est)}-${MUN[est.muns[0]].uf}${w.e ? ` · ${w.e.nome}` : ''}`
  ]);
  let u = cv.toDataURL('image/jpeg', .8);
  try { u = piexif.insert(exifGPS(loc.lat, loc.lon, quando, `${est.nome} ${est.cod.join('/')} - ${estMun(est)}`), u); } catch(e){}
  const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  FOTO[id] = u; try { await FDB.put(id, u); } catch(e){}
  return {id, lat:+loc.lat.toFixed(7), lon:+loc.lon.toFixed(7), prec: loc.prec ? Math.round(loc.prec) : null, fonte: loc.fonte, data: quando.toISOString(), dist, legenda:''};
}
async function receberFotos(files){
  const sid = fotoAlvo; if (!sid || !files.length) return;
  toast(`Processando ${files.length > 1 ? `${files.length} fotos` : 'a foto'} e obtendo a localização…`);
  const gps = await gpsPromessa; let ok = 0;
  const novas = [];
  for (const f of files){ try { const m = await processarFoto(f, sid, gps, fotoCamera); if (m) novas.push(m); ok++; } catch(e){} }
  if (!novas.length){ toast('Não foi possível ler a imagem.'); return; }
  buildLOC(); const w = LOC[sid]; snapshot(); w.s.fotos = [...(w.s.fotos || []), ...novas];
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){}
  changed();
  const f0 = novas[0];
  const longe = novas.filter(f => f.fonte.startsWith('GPS') && f.dist > 1000);
  toast(`${novas.length > 1 ? `${novas.length} fotos salvas` : 'Foto salva'} em ${EST[sid].nome}. Localização: ${f0.fonte.toLowerCase()}${f0.prec ? ` (±${f0.prec} m)` : ''}.${longe.length ? ` Atenção: ${longe.length === 1 ? 'a foto foi tirada' : `${longe.length} fotos foram tiradas`} a ${fmtM(longe[0].dist)} da estação.` : ''}`, true);
}
document.getElementById('fotoCam').addEventListener('change', ev => receberFotos([...ev.target.files]));
document.getElementById('fotoGal').addEventListener('change', ev => receberFotos([...ev.target.files]));

function tiraFotos(s, editar){
  const fs = s.fotos || [];
  return `<div class="fotos-linha">${fs.map(f => `<button type="button" class="th" data-ver-foto="${s.id}|${f.id}" title="${esc(fmtDH(f.data))} · ${esc(f.fonte)}"><img data-foto="${f.id}" alt="Foto de ${esc(EST[s.id].nome)}"></button>`).join('')}
    ${editar ? `<button type="button" class="foto-add" data-foto-cam="${s.id}" title="Abrir a câmera"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>Tirar foto</button>
      <button type="button" class="foto-add sec" data-foto-gal="${s.id}" title="Escolher fotos já tiradas">Da galeria</button>` : (fs.length ? '' : '')}</div>`;
}

/* ---- visualizador ---- */
const dFoto = document.getElementById('dFoto');
let fotoAberta = null;
async function verFoto(sid, fid){
  if (REG.on) return;
  buildLOC(); const w = LOC[sid]; if (!w) return; const f = (w.s.fotos || []).find(x => x.id === fid); if (!f) return;
  fotoAberta = {sid, fid}; const est = EST[sid];
  document.getElementById('dFotoTit').textContent = `${est.nome} · ${est.cod.join(' / ')}`;
  const img = document.getElementById('dFotoImg'); img.removeAttribute('src'); fotoURL(fid).then(u => { if (u) img.src = u; });
  document.getElementById('dFotoMeta').innerHTML = `<tr><th>Data e hora</th><td>${esc(fmtDH(f.data))}</td></tr>
    <tr><th>Coordenada</th><td>${f.lat.toFixed(6)}, ${f.lon.toFixed(6)}${f.prec ? ` (±${f.prec} m)` : ''}</td></tr>
    <tr><th>Origem</th><td>${esc(f.fonte)}${f.fonte.startsWith('GPS') ? `, a ${fmtM(f.dist)} da estação` : ''}</td></tr>
    <tr><th>Estação</th><td>${esc(tipoTxt(est))} em ${esc(estMun(est))}${w.e ? `, ${esc(w.e.nome)}, parada ${w.k + 1}` : ''}</td></tr>`;
  document.getElementById('dFotoLeg').value = f.legenda || '';
  document.getElementById('dFotoMapa').href = `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`;
  dFoto.showModal();
}
function nomeArqFoto(x){ const e = x.e, k = x.k; return `${e ? semAcento(e.nome).replace(/\W+/g, '') + '_' + pad2(k + 1) + '_' : ''}${semAcento(EST[x.s.id].nome).replace(/\W+/g, '_')}_${(d => `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`)(new Date(x.f.data))}_${x.f.id.slice(-4)}.jpg`; }
document.getElementById('dFotoLeg').addEventListener('change', ev => { const {sid, fid} = fotoAberta || {}; buildLOC(); const w = LOC[sid]; if (!w) return; const f = w.s.fotos.find(x => x.id === fid); if (!f || f.legenda === ev.target.value.trim()) return; snapshot(); f.legenda = ev.target.value.trim(); changed(); });
document.getElementById('dFotoBaixar').onclick = async () => { const {sid, fid} = fotoAberta; const x = todasFotos().find(y => y.f.id === fid); const u = await fotoURL(fid); if (!u || !x) return; if (APP) return enviarApp(nomeArqFoto(x), u, 'image/jpeg'); const a = document.createElement('a'); a.href = u; a.download = nomeArqFoto(x); document.body.appendChild(a); a.click(); a.remove(); };
document.getElementById('dFotoExcluir').onclick = () => { const {sid, fid} = fotoAberta; buildLOC(); const w = LOC[sid]; if (!w) return; snapshot(); w.s.fotos = w.s.fotos.filter(x => x.id !== fid); dFoto.close(); changed(); toast('Foto excluída.', true); };
document.getElementById('dFotoNoMapa').onclick = () => { const {sid, fid} = fotoAberta; const x = todasFotos().find(y => y.f.id === fid); if (!x) return; dFoto.close(); if (mobile()) setSheet('mini'); verPonto([x.f.lat, x.f.lon], 16); };

/* ---- camada de fotos no mapa ---- */
const fotoLayer = L.layerGroup().addTo(map);
ctrlCamadas.addOverlay(fotoLayer, 'Fotos');
function desenhaFotos(){
  fotoLayer.clearLayers(); const atual = etapaAtual();
  todasFotos().filter(x => !atual || x.e === atual).forEach(x => {
    L.marker([x.f.lat, x.f.lon], {zIndexOffset:1800, title:`Foto: ${EST[x.s.id].nome}, ${fmtDH(x.f.data)}`, icon: L.divIcon({className:'', iconSize:[18,18], html:'<div class="pin-foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></div>'})})
      .on('click', () => verFoto(x.s.id, x.f.id)).addTo(fotoLayer);
  });
}

/* ---- exportar fotos (ZIP com JPG georreferenciados + planilha + KML) ---- */
async function baixarFotosZip(){
  const lst = todasFotos(); if (!lst.length){ toast('Ainda não há fotos.'); return; }
  toast('Preparando o arquivo de fotos…');
  const arqs = {}, enc = new TextEncoder(), linhas = [['Arquivo','Etapa','Parada','Estação','Código(s)','Tipo','Município','Latitude','Longitude','Precisão (m)','Origem da localização','Distância da estação (m)','Data e hora','Legenda','Visitada em','Anotações da visita']];
  const pm = [];
  for (const x of lst){
    const u = await fotoURL(x.f.id); if (!u) continue;
    const nome = nomeArqFoto(x), bin = atob(u.split(',')[1]), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    arqs['fotos/' + nome] = [b, {level:0}];
    const est = EST[x.s.id];
    linhas.push([nome, x.e ? x.e.nome : 'Sem etapa', x.k >= 0 ? x.k + 1 : '', est.nomeOrig, est.cod.join(' / '), tipoTxt(est), estMun(est), x.f.lat, x.f.lon, x.f.prec || '', x.f.fonte, x.f.dist, fmtDH(x.f.data), x.f.legenda, x.s.feito || '', x.s.relato]);
    pm.push(`<Placemark><name>${xe(est.nome)} – ${xe(fmtDH(x.f.data))}</name><description><![CDATA[<img src="fotos/${nome}" width="480"><br>${esc(x.f.fonte)}${x.f.legenda ? '<br>' + esc(x.f.legenda) : ''}]]></description><Point><coordinates>${x.f.lon},${x.f.lat},0</coordinates></Point></Placemark>`);
  }
  arqs['fotos.csv'] = enc.encode('﻿' + linhas.map(csvLinha).join('\r\n'));
  arqs['fotos.kml'] = enc.encode(`<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Fotos das estações</name>${pm.join('')}</Document></kml>`);
  const zip = fflate.zipSync(arqs);
  if (APP) return enviarApp(`fotos_estacoes_${hojeISO()}.zip`, zip, 'application/zip');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([zip], {type:'application/zip'})); a.download = `fotos_estacoes_${hojeISO()}.zip`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast(`${lst.length} fotos exportadas: JPG com GPS no EXIF, planilha fotos.csv e fotos.kml (abra no Google Earth).`);
}
function secaoFotosRel(e, cor){
  const lst = todasFotos().filter(x => x.e === e); if (!lst.length) return '';
  return `<div class="rel-fotos-t" style="--c:${cor}">Registro fotográfico <span>${lst.length} ${lst.length === 1 ? 'foto' : 'fotos'}</span></div>
    <div class="rel-fotos">${lst.map(x => `<figure><img data-foto="${x.f.id}" alt=""><figcaption><b>${x.k + 1}. ${esc(EST[x.s.id].nome)}</b> · ${esc(fmtDH(x.f.data))}<br>${x.f.lat.toFixed(6)}, ${x.f.lon.toFixed(6)}${x.f.prec ? ` ±${x.f.prec} m` : ''} · ${esc(x.f.fonte)}${x.f.legenda ? `<br><i>${esc(x.f.legenda)}</i>` : ''}</figcaption></figure>`).join('')}</div>`;
}
async function fotosParaSalvar(){
  const ids = new Set(todasFotos().map(x => x.f.id));
  IDX.lista.forEach(p => { if (p.id === PJ_ID) return; const st = lsGet(keyEstado(p.id)); if (st) [...(st.etapas || []).flatMap(e => e.stops || []), ...(st.pool || [])].forEach(s => (s.fotos || []).forEach(f => f && f.id && ids.add(f.id))); });
  const o = {}; for (const id of ids){ const u = await fotoURL(id); if (u) o[id] = u; } return o; }
async function importarFotos(obj){ if (!obj) return; for (const [id, u] of Object.entries(obj)){ FOTO[id] = u; try { await FDB.put(id, u); } catch(e){} } }

/* ================= tipo de estrada ================= */
function syncEstrada(){ document.querySelectorAll('[data-estr]').forEach(b => b.setAttribute('aria-pressed', b.dataset.estr === (state.cfg.estrada || 'qualquer'))); }
document.getElementById('barraEstrada').addEventListener('click', ev => {
  const b = ev.target.closest('[data-estr]'); if (!b || b.dataset.estr === state.cfg.estrada) return;
  snapshot(); state.cfg.estrada = b.dataset.estr; srvPav = srvPav === 'off' ? 'pendente' : srvPav; Object.keys(tentPav).forEach(k => delete tentPav[k]);
  syncEstrada(); syncCfg(); changed();
  toast(state.cfg.estrada === 'pav' ? 'Rotas só por estradas pavimentadas: a terra só entra no acesso final à estação ou onde não houver alternativa (marcada em marrom). Os km e horários são recalculados.' : 'Rotas por qualquer estrada (caminho mais rápido, pode incluir terra).', true);
});

/* ================= busca nas hospedagens e paradas ================= */
let buscaAp = '';
function aplicarBuscaAp(){
  const q = semAcento(buscaAp.trim().toLowerCase());
  ['apoiosGeral', 'apoiosEtapa'].forEach(id => { const box = document.getElementById(id); if (!box) return; let n = 0, t = 0;
    box.querySelectorAll('.apoio, .pern-item').forEach(el => { const ok = !q || semAcento(el.textContent.toLowerCase()).includes(q); el.hidden = !ok; t++; if (ok) n++; });
    box.querySelectorAll('.sec-t').forEach(h => h.hidden = !!q);
    let msg = box.querySelector('.busca-vazia'); if (!msg){ msg = document.createElement('p'); msg.className = 'dica busca-vazia'; box.appendChild(msg); }
    msg.textContent = q ? (n ? `${n} de ${t} itens correspondem à busca.` : 'Nada encontrado para essa busca.') : ''; });
}
document.querySelectorAll('.busca-ap').forEach(inp => inp.addEventListener('input', ev => { buscaAp = ev.target.value; document.querySelectorAll('.busca-ap').forEach(o => { if (o !== ev.target) o.value = buscaAp; }); aplicarBuscaAp(); }));

/* ================= buscar no mapa: cidade ou estação ================= */
const bmQ = document.getElementById('bmQ'), bmRes = document.getElementById('bmRes');
let bmTipo = 'todos', bmItens = [], bmSel = -1, bmDestaque = null;
const nrm = t => semAcento(String(t || '').toLowerCase());
const MUN_REG = Object.keys(MUN);
function buscarMapa(q){
  q = nrm(q.trim()); if (!q) return [];
  const passa = e => bmTipo === 'todos' || (bmTipo === 'F' ? e.F : e.P);
  const pont = (txt, extra = '') => { const t = nrm(txt); if (t === q) return 0; if (t.startsWith(q)) return 1; if (t.split(/[\s\-\/()]+/).some(w => w.startsWith(q))) return 2; if (t.includes(q) || nrm(extra).includes(q)) return 3; return 9; };
  const est = DATA.est.filter(passa).map(e => ({tipo:'est', id:e.id, p: Math.min(pont(e.nome, e.nomeOrig + ' ' + e.cod.join(' ') + ' ' + (e.rio || '')), pont(estMun(e)) + .5, e.cod.some(c => c.startsWith(q)) ? 1 : 9)})).filter(x => x.p < 9);
  const cid = MUN_REG.map(id => { const ests = (MUNEST[id] || []).filter(s => passa(EST[s])); return {tipo:'mun', id, n: ests.length, p: pont(MUN[id].n) + (ests.length ? 0 : 1.5)}; })
    .filter(x => x.p < 9 && (bmTipo === 'todos' || x.n)).sort((a, b) => a.p - b.p || b.n - a.n).slice(0, 6);
  return [...cid, ...est].sort((a, b) => a.p - b.p || (a.tipo === 'mun' ? -1 : 1)).slice(0, 14);
}
function rotuloRes(x){
  if (x.tipo === 'mun'){
    const ests = (MUNEST[x.id] || []), t = contaTipos(ests);
    return `<span class="bm-ic mun"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg></span>
      <span class="bm-t"><b>${esc(MUN[x.id].n)}-${MUN[x.id].uf}</b><span>${ests.length ? `${ests.length} ${ests.length === 1 ? 'estação' : 'estações'}${t.F ? ` · ${t.F} fluv.` : ''}${t.P ? ` · ${t.P} pluv.` : ''}` : 'Município sem estações do Anexo'}</span></span>`;
  }
  const e = EST[x.id], w = LOC[x.id], inf = w && w.e ? P[w.e.id].info[w.k] : null;
  return `<span class="bm-ic"><span class="mk ${e.cls}" style="--c:${w && w.e ? w.e.cor : '#9AA5A1'}">${w && w.e ? w.k + 1 : ''}</span></span>
    <span class="bm-t"><b>${esc(e.nome)} ${tipoBadge(e)}</b><span>${esc(estMun(e))} · ${esc(e.cod.join(' / '))}${inf ? ` · ${esc(w.e.nome)}, dia ${inf.d + 1}` : ' · sem etapa'}${w && w.s.feito ? ' · ✓ visitada' : ''}</span></span>`;
}
function mostrarRes(){
  const q = bmQ.value.trim();
  bmItens = buscarMapa(q); bmSel = bmItens.length ? 0 : -1;
  if (!q){ bmRes.hidden = true; bmRes.innerHTML = ''; return; }
  bmRes.hidden = false;
  bmRes.innerHTML = bmItens.length ? bmItens.map((x, i) => `<button type="button" class="bm-item${i === bmSel ? ' sel' : ''}" data-i="${i}" role="option">${rotuloRes(x)}</button>`).join('')
    : `<p class="dica" style="margin:8px">Nada encontrado${bmTipo !== 'todos' ? ` entre as ${bmTipo === 'F' ? 'fluviométricas' : 'pluviométricas'}` : ''}.</p>`;
}
function destacar(latlng, raio){
  if (bmDestaque) map.removeLayer(bmDestaque);
  bmDestaque = L.layerGroup([L.circleMarker(latlng, {radius: raio || 26, color:'#FFB300', weight:4, fill:false, className:'pulso', interactive:false})]).addTo(map);
  setTimeout(() => { if (bmDestaque){ map.removeLayer(bmDestaque); bmDestaque = null; } }, 4500);
}
function irRes(x){
  bmRes.hidden = true; bmQ.blur();
  if (mobile()) setSheet('mini');
  if (x.tipo === 'est'){ verPonto(ll(x.id), Math.max(map.getZoom(), 13)); destacar(ll(x.id)); setTimeout(() => popupEst(x.id), 60); return; }
  let lay = null; limites.eachLayer(l => { if (l.feature.properties.id === x.id) lay = l; });
  const ests = (MUNEST[x.id] || []).filter(s => bmTipo === 'todos' || (bmTipo === 'F' ? EST[s].F : EST[s].P));
  const pts = [...ests.map(ll)]; if (lay){ const bb = lay.getBounds(); pts.push(bb.getNorthEast(), bb.getSouthWest()); } else pts.push(ll(x.id));
  fitPts(pts.map(p => p.lat !== undefined ? [p.lat, p.lng] : p), 13);
  if (lay){ const orig = {...lay.options}; lay.setStyle({color:'#FFB300', weight:4, opacity:1, dashArray:null, fillColor:'#FFB300', fillOpacity:.12});
    setTimeout(() => lay.setStyle(estiloMun(x.id)), 4500); }
  setTimeout(() => popupMun(x.id), 350);
}
bmQ.addEventListener('input', mostrarRes);
bmQ.addEventListener('focus', () => { if (mobile()){ if (sheetEst !== 'cheio') setSheet('cheio');
    setTimeout(() => { const top = document.querySelector('.busca-mapa').offsetTop - document.querySelector('.placa').offsetHeight - alcaEl.offsetHeight - 6; painelEl.scrollTo({top: Math.max(0, top)}); }, 260); }
  if (bmQ.value.trim()) mostrarRes(); });
bmQ.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){ ev.preventDefault(); if (!bmItens.length) return; bmSel = (bmSel + (ev.key === 'ArrowDown' ? 1 : -1) + bmItens.length) % bmItens.length;
    bmRes.querySelectorAll('.bm-item').forEach((b, i) => b.classList.toggle('sel', i === bmSel)); bmRes.querySelector('.bm-item.sel').scrollIntoView({block:'nearest'}); }
  else if (ev.key === 'Enter'){ ev.preventDefault(); if (bmSel >= 0) irRes(bmItens[bmSel]); }
  else if (ev.key === 'Escape'){ bmQ.value = ''; mostrarRes(); }
});
bmRes.addEventListener('click', ev => { const b = ev.target.closest('.bm-item'); if (b) irRes(bmItens[+b.dataset.i]); });
document.getElementById('bmTipos').addEventListener('click', ev => { const b = ev.target.closest('[data-bmt]'); if (!b) return; bmTipo = b.dataset.bmt;
  document.querySelectorAll('[data-bmt]').forEach(x => x.setAttribute('aria-pressed', x === b)); if (bmQ.value.trim()) mostrarRes(); else bmQ.focus(); });
document.getElementById('bmLimpar').onclick = () => { bmQ.value = ''; mostrarRes(); bmQ.focus(); };
document.addEventListener('click', ev => { if (!ev.target.closest('.busca-mapa')) bmRes.hidden = true; });

/* ================= quadro de projetos ================= */
const dProj = document.getElementById('dProj'), projCorpo = document.getElementById('dProjCorpo');
document.getElementById('projNome').textContent = PJ.nome;
document.getElementById('bProj').onclick = () => abrirProjetos();
{ const mt = document.getElementById('mTabela'); if (mt) mt.querySelector('small').textContent = `As ${N_EST} estações do projeto (${FONTE_EST}) com etapa, dia, horário e acesso.`; }
const nomeBase = p => (MUN[p.base] && MUN[p.base].n) || (p.baseMun && p.baseMun.n) || 'Belo Horizonte';
function resumoProj(p){
  const st = p.id === PJ_ID ? state : lsGet(keyEstado(p.id));
  const nEst = p.id === PJ_ID ? N_EST : p.tipo === 'proprio' ? ((lsGet(KEY_DADOS + p.id) || {}).est || []).length : EST_ANEXO_N;
  const ets = (st && st.etapas) || [], vis = ets.reduce((a, e) => a + (e.stops || []).filter(x => x.feito).length, 0);
  return {nEst, nEt: ets.length, vis, mod: st && st.mod};
}
function abrirProjetos(){ renderProjetos(); if (!dProj.open) dProj.showModal(); }
function renderProjetos(){
  document.getElementById('dProjTit').textContent = 'Projetos';
  projCorpo.innerHTML = `<p class="dica" style="margin:0">Cada projeto guarda o seu próprio cronograma: estações, etapas, visitas, anotações, fotos e hospedagens. Ao Salvar, todos os projetos vão juntos no arquivo.</p>
    <div class="proj-lista">${IDX.lista.map(p => { const r = resumoProj(p), at = p.id === PJ_ID;
      return `<div class="proj${at ? ' atual' : ''}"><div class="proj-info"><b>${esc(p.nome)}${at ? ' <span class="tag">aberto</span>' : ''}</b>
        <span>${r.nEst} estações · ${r.nEt} ${r.nEt === 1 ? 'etapa' : 'etapas'} · ${r.vis} ${r.vis === 1 ? 'visitada' : 'visitadas'} · saída de ${esc(nomeBase(p))}</span>
        <span>${esc(p.fonte || '')}${r.mod ? ` · alterado em ${fmtDH(new Date(r.mod).toISOString())}` : ''}</span></div>
        <div class="proj-bt">${at ? '' : `<button type="button" class="btn primario" data-pj="abrir" data-id="${p.id}">Abrir</button>`}<button type="button" class="btn" data-pj="renomear" data-id="${p.id}">Renomear</button><button type="button" class="btn" data-pj="duplicar" data-id="${p.id}">Duplicar</button>${IDX.lista.length > 1 ? `<button type="button" class="btn perigo" data-pj="excluir" data-id="${p.id}">Excluir</button>` : ''}</div></div>`; }).join('')}</div>
    <div><button type="button" class="btn primario" data-pj="novo">+ Novo projeto</button></div>`;
}
async function trocarProjeto(id){
  save(); try { await ROTAS.set(PJ_ID, rotasAtuais()); } catch(e){}
  IDX.atual = id; lsSet(KEY_IDX, IDX); if (APP) gravarAppJa();
  location.reload();
}
const novoIdProj = () => 'p' + Date.now().toString(36).slice(-4) + uid().slice(0, 3);
function registrarProjeto(meta, dados, estado){
  if (meta.tipo === 'proprio' && !lsSet(KEY_DADOS + meta.id, dados)){ toast('Não há espaço neste navegador para mais um projeto. Exclua um projeto antigo (depois de Salvar) e tente de novo.'); return false; }
  estado.mod = Date.now();
  if (!lsSet(keyEstado(meta.id), estado)){ lsDel(KEY_DADOS + meta.id); toast('Não há espaço neste navegador para mais um projeto. Exclua um projeto antigo (depois de Salvar) e tente de novo.'); return false; }
  delete IDX.excluidos[meta.id]; IDX.lista.push(meta); lsSet(KEY_IDX, IDX); NOS_OUTROS = null; gravarApp(); return true;
}
projCorpo.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-pj]'); if (!b) return;
  const id = b.dataset.id, p = id && metaDe(id), acao = b.dataset.pj;
  if (acao === 'abrir') return trocarProjeto(id);
  if (acao === 'novo') return formNovo();
  if (acao === 'voltar') return renderProjetos();
  if (acao === 'criar') return criarProjeto();
  if (acao === 'renomear'){ let n = null; try { n = window.prompt('Novo nome do projeto:', p.nome); } catch(e){} if (!n || !n.trim()) return;
    p.nome = n.trim().slice(0, 80); lsSet(KEY_IDX, IDX); gravarApp(); if (id === PJ_ID) document.getElementById('projNome').textContent = p.nome; renderProjetos(); return; }
  if (acao === 'duplicar'){
    const st = id === PJ_ID ? JSON.parse(JSON.stringify({...state, auto:null})) : lsGet(keyEstado(id));
    const meta = {...p, id: novoIdProj(), nome: `Cópia de ${p.nome}`.slice(0, 80), criado: new Date().toISOString()};
    if (registrarProjeto(meta, p.tipo === 'proprio' ? (id === PJ_ID ? PJ_DADOS : lsGet(KEY_DADOS + id)) : null, st || {v:3, etapas:[], pool:[], apoios:[]})){
      const r = id === PJ_ID ? rotasAtuais() : await ROTAS.get(id); if (r) ROTAS.set(meta.id, r);
      renderProjetos(); toast(`Criado "${meta.nome}".`); }
    return; }
  if (acao === 'excluir'){
    if (!window.confirm(`Excluir o projeto "${p.nome}"? Etapas, visitas, anotações e hospedagens dele serão apagados deste ${APP ? 'celular' : 'navegador'}. Se quiser guardar uma cópia, use ${APP ? 'Exportar' : 'Salvar'} antes.`)) return;
    IDX.lista = IDX.lista.filter(x => x.id !== id); IDX.excluidos[id] = Date.now();
    lsDel(keyEstado(id)); lsDel(KEY_DADOS + id); ROTAS.del(id);
    if (id === PJ_ID){ IDX.atual = IDX.lista[0].id; lsSet(KEY_IDX, IDX); if (APP) gravarAppJa(); location.reload(); return; }
    NOS_OUTROS = null; lsSet(KEY_IDX, IDX); salvaMatriz(); renderProjetos(); toast(`Projeto "${p.nome}" excluído.`); return; }
});

/* ---------- novo projeto ---------- */
let npDados = null;   // resultado da leitura do arquivo enviado
function formNovo(){
  npDados = null;
  document.getElementById('dProjTit').textContent = 'Novo projeto';
  const nP = IDX.lista.length + 1;
  projCorpo.innerHTML = `
    <label class="f">Nome do projeto<input id="npNome" maxlength="80" placeholder="Ex.: Campanha ${nP} – Sul de Minas"></label>
    <label class="f">Cidade de saída e retorno<input id="npBase" list="npBaseLista" autocomplete="off" value="${esc(`${BASE_N} – ${MUN[BH].uf}`)}"><datalist id="npBaseLista"></datalist></label>
    <fieldset class="np-orig"><legend>De onde vêm as estações?</legend>
      <label class="op"><input type="radio" name="npOrig" value="ant" checked><span><b>Usar dados de um projeto anterior</b><small>Aproveita as estações e, se quiser, as etapas de um projeto que já existe.</small></span></label>
      <div class="np-sub" id="npAnt">
        <label class="f">Projeto<select id="npFonte">${IDX.lista.map(p => `<option value="${p.id}"${p.id === PJ_ID ? ' selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
        <label class="op2"><input type="radio" name="npCopia" value="estacoes" checked> Só as estações (cronograma novo)</label>
        <label class="op2"><input type="radio" name="npCopia" value="plano"> Estações, etapas e ordem, hospedagens e premissas (sem visitas, anotações de visita, fotos e gastos)</label>
        <label class="op2"><input type="radio" name="npCopia" value="tudo"> Cópia completa, com visitas, anotações, fotos e gastos</label>
      </div>
      <label class="op"><input type="radio" name="npOrig" value="novo"><span><b>Subir novos dados</b><small>Planilha (.xlsx ou .csv) com as estações, ou um arquivo HTML deste roteiro salvo em outro computador.</small></span></label>
      <div class="np-sub" id="npNovo" hidden>
        <div class="linha"><button type="button" class="btn" id="npEscolher">Escolher arquivo…</button><button type="button" class="btn" id="npModelo" title="Planilha com as colunas que o roteiro entende, já preenchida com as estações deste projeto">Baixar planilha modelo</button></div>
        <input type="file" id="npArq" accept=".xlsx,.csv,.txt,.html,.htm" hidden>
        <div id="npPrev" class="np-prev"></div>
      </div>
    </fieldset>
    <fieldset class="np-ordem" id="npOrdem"><legend>Ordem das visitas</legend>
      <label class="op2"><input type="radio" name="npOrdem" value="planilha" checked> <span id="npOrdemTxt">Seguir a ordem da lista</span></label>
      <label class="op2"><input type="radio" name="npOrdem" value="otimizar"> Otimizar pelo menor tempo de estrada</label>
      <label class="f" id="npEtapasLbl" style="max-width:180px">Número de etapas<input type="number" id="npEtapas" min="1" max="40" value="3"></label>
    </fieldset>
    <div class="np-pe"><button type="button" class="btn" data-pj="voltar">Voltar</button><button type="button" class="btn primario" data-pj="criar">Criar projeto</button></div>`;
  const base = document.getElementById('npBase'), dl = document.getElementById('npBaseLista');
  base.addEventListener('input', () => { base.dataset.editado = '1'; const q = nrm(base.value.split('–')[0].trim()); if (q.length < 2){ dl.innerHTML = ''; return; }
    dl.innerHTML = municipiosBR().filter(m => nrm(m.n).startsWith(q)).slice(0, 30).map(m => `<option value="${esc(`${m.n} – ${m.uf}`)}">`).join(''); });
  projCorpo.querySelectorAll('[name=npOrig], [name=npCopia]').forEach(r => r.addEventListener('change', npVisibilidade));
  document.getElementById('npFonte').addEventListener('change', npVisibilidade);
  document.getElementById('npEscolher').onclick = () => document.getElementById('npArq').click();
  document.getElementById('npModelo').onclick = baixarModelo;
  document.getElementById('npArq').onchange = async ev => { const f = ev.target.files[0]; ev.target.value = ''; if (f) await npLerArquivo(f); };
  npVisibilidade();
}
function npVisibilidade(){
  const orig = projCorpo.querySelector('[name=npOrig]:checked').value, copia = projCorpo.querySelector('[name=npCopia]:checked').value;
  document.getElementById('npAnt').hidden = orig !== 'ant'; document.getElementById('npNovo').hidden = orig !== 'novo';
  const comEtapas = npDados && npDados.tipo === 'planilha' && npDados.grupos.length;
  const ordem = (orig === 'ant' && copia === 'estacoes') || (orig === 'novo' && npDados && npDados.tipo === 'planilha');
  document.getElementById('npOrdem').hidden = !ordem;
  document.getElementById('npEtapasLbl').hidden = !!comEtapas;
  document.getElementById('npOrdemTxt').textContent = orig === 'novo' ? (comEtapas ? `Seguir a ordem da planilha (etapas da coluna "Etapa": ${npDados.grupos.length})` : 'Seguir a ordem da planilha') : 'Seguir a ordem da lista de estações';
  if (orig === 'ant'){ const p = metaDe(document.getElementById('npFonte').value), st = p && (p.id === PJ_ID ? state : lsGet(keyEstado(p.id))); const n = st && st.etapas ? st.etapas.length : 0; if (n) document.getElementById('npEtapas').value = n;
    const bi = document.getElementById('npBase'), bm = p && ((p.baseMun && p.baseMun.n) ? p.baseMun : MUN[p.base || BH0]); if (bm && !bi.dataset.editado) bi.value = `${bm.n} – ${bm.uf}`; }
  if (orig === 'novo' && npDados && npDados.tipo === 'planilha') document.getElementById('npEtapas').value = Math.max(1, Math.min(40, Math.round(npDados.est.length / 35) || 1));
}

/* ---------- municípios do Brasil (sedes, IBGE), só carregados quando precisa ---------- */
let MUNBR = null, MUNBR_IX = null;
function municipiosBR(){
  if (MUNBR) return MUNBR;
  try {
    const b = atob(document.getElementById('municipios').textContent.trim()), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    let id = 0, uf = '';
    MUNBR = new TextDecoder().decode(fflate.gunzipSync(u)).split('\n').map(l => { const [d, n, u2, la, lo] = l.split(';'); id += +d; if (u2) uf = u2; return {id: String(id), n, uf, lat: la / 1000, lon: lo / 1000}; });
  } catch(e){ MUNBR = Object.values(MUN).map(m => ({id: m.id, n: m.n, uf: m.uf, lat: m.lat, lon: m.lon})); }
  MUNBR_IX = {}; MUNBR.forEach(m => { const k = nrm(m.n); (MUNBR_IX[k] = MUNBR_IX[k] || []).push(m); });
  return MUNBR;
}
function acharMun(nome, uf, perto){
  municipiosBR(); let t = String(nome || '').trim(); if (!t) return null;
  const m = /^(.*?)\s*[-–\/(,]\s*([A-Za-z]{2})\)?\s*$/.exec(t); if (m && !MUNBR_IX[nrm(t)]){ t = m[1]; uf = uf || m[2]; }
  const c = MUNBR_IX[nrm(t)] || []; if (!c.length) return null;
  const f = uf ? c.filter(x => x.uf === String(uf).trim().toUpperCase()) : c; const l = f.length ? f : c;
  if (l.length === 1 || !perto) return l[0];
  return l.slice().sort((a, b) => havLL(perto, [a.lat, a.lon]) - havLL(perto, [b.lat, b.lon]))[0];
}
function munMaisPerto(lat, lon){ let best = null, bd = Infinity; for (const m of municipiosBR()){ const d = (m.lat - lat) ** 2 + ((m.lon - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < bd){ bd = d; best = m; } } return best; }
const munEntrada = m => ({id: m.id, n: m.n, uf: m.uf, lat: m.lat, lon: m.lon, ...(m.rg ? {rg: m.rg} : {})});

/* ---------- leitura de planilhas (.xlsx sem bibliotecas extras, .csv com ; , ou tab) ---------- */
function lerCSV(t){
  t = t.replace(/^﻿/, '');
  const prim = t.split(/\r?\n/).find(l => l.trim()) || '';
  const sep = [';', '\t', ','].map(c => [c, prim.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++){ const ch = t[i];
    if (q){ if (ch === '"'){ if (t[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"' && cur === '') q = true;
    else if (ch === sep){ row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r'){ if (ch === '\r' && t[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch; }
  if (cur || row.length){ row.push(cur); rows.push(row); }
  return rows;
}
function lerXLSX(u8){
  const z = fflate.unzipSync(u8, {filter: f => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name)});
  const td = new TextDecoder(), xml = n => z[n] ? new DOMParser().parseFromString(td.decode(z[n]), 'application/xml') : null;
  const tags = (el, n) => [...el.getElementsByTagNameNS('*', n)];
  const ss = []; const sx = xml('xl/sharedStrings.xml'); if (sx) tags(sx, 'si').forEach(si => ss.push(tags(si, 't').map(t => t.textContent).join('')));
  let alvo = null; const wb = xml('xl/workbook.xml'), rel = xml('xl/_rels/workbook.xml.rels');
  if (wb && rel){ const sh = tags(wb, 'sheet')[0], rid = sh && [...sh.attributes].find(a => /(^|:)id$/.test(a.name) && a.name !== 'sheetId');
    const r = rid && tags(rel, 'Relationship').find(x => x.getAttribute('Id') === rid.value); if (r) alvo = 'xl/' + r.getAttribute('Target').replace(/^\/?(xl\/)?/, ''); }
  if (!alvo || !z[alvo]) alvo = Object.keys(z).filter(n => n.startsWith('xl/worksheets/')).sort()[0];
  const doc = alvo && xml(alvo); if (!doc) throw new Error('A planilha está vazia.');
  const rows = [];
  tags(doc, 'row').forEach(r => { const out = []; let auto = 0;
    tags(r, 'c').forEach(c => { const ref = c.getAttribute('r'); let col = auto; const m = ref && /^([A-Z]+)/.exec(ref); if (m) col = [...m[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1; auto = col + 1;
      const t = c.getAttribute('t'), v = tags(c, 'v')[0];
      out[col] = t === 's' ? (v ? ss[+v.textContent] ?? '' : '') : t === 'inlineStr' ? tags(c, 't').map(x => x.textContent).join('') : t === 'b' ? (v && v.textContent === '1' ? 'sim' : 'não') : v ? v.textContent : ''; });
    rows.push(Array.from(out, x => x ?? '')); });
  return rows;
}
async function lerArquivoTexto(f, html){ const u = new Uint8Array(await f.arrayBuffer()); if (html) return new TextDecoder('utf-8').decode(u); try { return new TextDecoder('utf-8', {fatal:true}).decode(u); } catch(e){ return new TextDecoder('windows-1252').decode(u); } }
const CAMPOS = [
  ['ordem', 'Ordem', /^(ordem|seq(uencia)?|n|no|nº|n°|num|numero|#|item)$/],
  ['etapa', 'Etapa', /^(etapa|roteiro|campanha|grupo|viagem)/],
  ['cod', 'Código', /^(cod|codigo|id|prefixo)/],
  ['nome', 'Nome', /^(nome|estacao|posto|ponto|local)/],
  ['tipo', 'Tipo', /^(tipo|categoria|classe)/],
  ['lat', 'Latitude', /^lat/],
  ['lon', 'Longitude', /^(lon|lng)/],
  ['coord', 'Coordenadas (lat, lon)', /^coord/],
  ['mun', 'Município', /^(munic|cidade)/],
  ['uf', 'UF', /^(uf|estado)$/],
  ['rio', "Curso d'água", /^(rio|curso|corpo|bacia)/],
  ['inst', 'Instituição', /^(institu|responsavel|entidade|orgao|propriet)/],
  ['op', 'Operadora', /^operad/],
  ['tempo', 'Tempo de visita (h)', /^(tempo|duracao|horas)/],
  ['obs', 'Observações', /^(obs|nota|coment)/]
];
const cabNorm = t => nrm(t).replace(/[^a-z0-9#º° ]+/g, ' ').replace(/\s+/g, ' ').trim();
function mapearColunas(cab){
  const m = {}; cab.forEach((c, i) => { const t = cabNorm(c); if (!t) return; const f = CAMPOS.find(([k, , re]) => m[k] === undefined && re.test(t)); if (f) m[f[0]] = i; }); return m;
}
function numCoord(v){
  if (v == null || v === '') return NaN; if (typeof v === 'number') return v;
  const t = String(v).trim().toUpperCase().replace(/\s+/g, ' '); if (!t) return NaN;
  const neg = /^-/.test(t) || /[SWO]\s*$/.test(t) || /^[SWO]\s/.test(t);
  if (/[°º'"’”]|\d\s\d/.test(t)){ const p = t.match(/\d+(?:[.,]\d+)?/g) || []; if (!p.length) return NaN; const [g, mi = '0', s = '0'] = p.map(x => x.replace(',', '.')); const x = +g + mi / 60 + s / 3600; return neg ? -x : x; }
  const x = parseFloat(t.replace(/[^\d,.\-]/g, '').replace(',', '.')); return isFinite(x) ? (neg ? -Math.abs(x) : x) : NaN;
}
function tiposDe(t){
  const n = nrm(t); if (!n) return ['Ponto de visita'];
  const F = /flu|^f$|regua|cota|vaz|lin[ií]m/.test(n), P = /plu|^p$|chuv/.test(n) || /^f ?\+ ?p$|^fp$/.test(n);
  if (/^f ?\+ ?p$|^fp$/.test(n)) return ['Fluviométrica', 'Pluviométrica'];
  return F && P ? ['Fluviométrica', 'Pluviométrica'] : F ? ['Fluviométrica'] : P ? ['Pluviométrica'] : [String(t).trim()];
}
/* Linhas da planilha → lista de estações do projeto (na ordem da planilha). */
function montarDePlanilha(rows, mapa0){
  let h = rows.findIndex((r, i) => i < 15 && (({lat, lon, nome, coord}) => ((lat !== undefined && lon !== undefined) || coord !== undefined) || nome !== undefined)(mapearColunas(r)));
  if (h < 0) throw new Error('Não encontrei o cabeçalho. A primeira linha precisa ter os nomes das colunas, por exemplo Nome, Latitude e Longitude.');
  const cab = rows[h].map(x => String(x || '').trim()), mapa = mapa0 || mapearColunas(cab);
  if ((mapa.lat === undefined || mapa.lon === undefined) && mapa.coord === undefined) throw new Error('Faltam as colunas de Latitude e Longitude.');
  const pid = (npDados && npDados.pid) || novoIdProj(), avisos = [], linhas = [];
  rows.slice(h + 1).forEach((r, i) => {
    const val = k => mapa[k] === undefined ? '' : r[mapa[k]] ?? '';
    if (!r.some(c => String(c).trim())) return;
    let lat = numCoord(val('lat')), lon = numCoord(val('lon'));
    if (mapa.coord !== undefined && !(isFinite(lat) && isFinite(lon))){ const p = String(val('coord')).split(/[;,\s]+(?=-?\d)/); lat = numCoord(p[0]); lon = numCoord(p[1]); }
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) > 35 && Math.abs(lon) <= 35) [lat, lon] = [lon, lat];
    if (lon > 0) lon = -lon; if (lat > 6) lat = -lat;
    const nome = String(val('nome') || val('cod') || '').trim(), lin = h + i + 2;
    if (!(lat >= -34 && lat <= 5.5 && lon >= -74 && lon <= -28.5)){ avisos.push(`Linha ${lin}${nome ? ` (${nome})` : ''}: coordenada ausente ou fora do Brasil, ignorada.`); return; }
    linhas.push({lin, nome: nome || `Ponto ${linhas.length + 1}`, cod: String(val('cod')).trim(), tipo: val('tipo'), lat, lon, mun: val('mun'), uf: val('uf'), rio: val('rio'), inst: val('inst'), op: val('op'),
      tempo: parseFloat(String(val('tempo')).replace(',', '.')), obs: String(val('obs')).trim(), etapa: String(val('etapa')).trim(), ordem: parseFloat(String(val('ordem')).replace(',', '.'))});
  });
  if (!linhas.length) throw new Error('Nenhuma linha com coordenada válida.');
  if (mapa.ordem !== undefined && linhas.some(l => isFinite(l.ordem))) linhas.sort((a, b) => (isFinite(a.ordem) ? a.ordem : 1e9) - (isFinite(b.ordem) ? b.ordem : 1e9) || a.lin - b.lin);
  const mun = {}, est = [], extras = {}; let semMun = 0;
  const cods = {}; linhas.forEach(l => { if (l.cod){ if (cods[l.cod]) avisos.push(`Código ${l.cod} repetido nas linhas ${cods[l.cod]} e ${l.lin}.`); else cods[l.cod] = l.lin; } });
  linhas.forEach((l, i) => {
    const id = `s${pid}_${i + 1}`, pg = munEm(l.lat, l.lon), perto = munMaisPerto(l.lat, l.lon);
    const pt = pg && MUN[pg] ? {...MUN[pg], id: pg} : perto, dito = l.mun ? acharMun(l.mun, l.uf, [l.lat, l.lon]) : null;
    if (l.mun && !dito){ semMun++; if (semMun <= 3) avisos.push(`Linha ${l.lin}: município "${l.mun}" não reconhecido; usado ${pt.n}-${pt.uf} (pela coordenada).`); }
    const mm = dito || pt; [mm, pt].forEach(x => { mun[x.id] = munEntrada(x); });
    est.push({id, n: i + 1, nome: l.nome, nomes: [l.nome], nomeOrig: l.nome, cod: l.cod ? [l.cod] : [], tipos: tiposDe(l.tipo), muns: [mm.id], munPt: [pt.id], pts: [[+l.lat.toFixed(6), +l.lon.toFixed(6)]],
      rio: String(l.rio).trim(), inst: String(l.inst).trim(), op: String(l.op).trim(), dPar: 0, sub: 0, mesmoPonto: false, viz: []});
    extras[id] = {visita: isFinite(l.tempo) && l.tempo >= 0 && l.tempo <= 12 ? l.tempo : null, nota: l.obs, etapa: l.etapa};
  });
  if (semMun > 3) avisos.push(`Mais ${semMun - 3} municípios não reconhecidos (usada a sede pela coordenada).`);
  /* vizinhas a até 3 km e dupla do mesmo local (a mais próxima, nos dois sentidos, a até 1 km) */
  est.forEach(a => { a.viz = est.filter(b => b !== a).map(b => [b.id, Math.round(havLL(a.pts[0], b.pts[0]) * 1000)]).filter(x => x[1] <= 3000).sort((x, y) => x[1] - y[1]).slice(0, 4); });
  const E = Object.fromEntries(est.map(e => [e.id, e]));
  est.forEach(a => { const v = a.viz[0]; if (!v || v[1] > 1000 || a.par) return; const b = E[v[0]]; if (b.par || !b.viz[0] || b.viz[0][0] !== a.id) return;
    a.par = b.id; b.par = a.id; if (v[1] < 5){ a.mesmoPonto = b.mesmoPonto = true; b.sub = 1; } });
  const grupos = []; linhas.forEach((l, i) => { if (!l.etapa) return; let g = grupos.find(x => x.chave === l.etapa); if (!g) grupos.push(g = {chave: l.etapa, nome: /^\d+$/.test(l.etapa) ? `Etapa ${pad2(+l.etapa)}` : l.etapa.slice(0, 40), ids: []}); g.ids.push(est[i].id); });
  return {tipo:'planilha', pid, cab, mapa, est, mun, extras, grupos, avisos};
}
/* HTML salvo por este roteiro (de qualquer versão): devolve os projetos que ele traz. */
function lerRoteiroHTML(txt){
  const doc = new DOMParser().parseFromString(txt, 'text/html');
  const pj = id => { const el = doc.getElementById(id); try { return el ? JSON.parse(el.textContent) : null; } catch(e){ return null; } };
  const est = pj('estado'), pjs = pj('projetos'); if (!est && !pjs) return null;
  const atual = (pjs && pjs.atual) || 'anexo';
  const lista = ((pjs && pjs.lista) || [{...META_ANEXO}]).map(p => ({...p, estado: p.id === atual ? est : p.estado})).filter(p => p.estado && p.estado.v >= 2);
  return {lista, atual, dados: pj('dados'), mat: pj('matriz'), fotos: pj('fotos')};
}
/* Lista de estações de um projeto vindo de outro arquivo. Se for o mesmo Anexo II deste arquivo, usa o daqui. */
function dadosDoArquivo(p, r){
  if (p.tipo === 'proprio' && p.dados && p.dados.est) return {tipo:'proprio', dados: p.dados};
  const ae = r.dados && r.dados.est, aqui = jsonEl('dados').est;
  const igual = ae && ae.length === aqui.length && ae.every((e, i) => e.id === aqui[i].id && Math.abs(e.pts[0][0] - aqui[i].pts[0][0]) < 1e-5 && Math.abs(e.pts[0][1] - aqui[i].pts[0][1]) < 1e-5);
  if (!ae || igual) return {tipo:'anexo', dados:null};
  const mun = {}; (r.dados.geo ? r.dados.geo.features : []).forEach(f => { mun[f.properties.id] = f.properties; });
  const usados = {}; ae.forEach(e => [...e.muns, ...e.munPt].forEach(m => { if (mun[m]) usados[m] = munEntrada(mun[m]); }));
  return {tipo:'proprio', dados: {est: ae, mun: usados}, renomear: true};
}
/* Troca os identificadores das estações (evita misturar com as de outro projeto que tenham o mesmo código interno). */
function renomearIds(dados, estado, pid){
  const mapa = {}; dados.est.forEach((e, i) => { mapa[e.id] = `s${pid}_${i + 1}`; });
  const est = dados.est.map(e => ({...e, id: mapa[e.id], par: e.par ? mapa[e.par] : undefined, viz: (e.viz || []).filter(v => mapa[v[0]]).map(v => [mapa[v[0]], v[1]])}));
  const troca = l => (l || []).filter(s => mapa[s.id]).map(s => ({...s, id: mapa[s.id]}));
  const st = {...estado, pool: troca(estado.pool), etapas: (estado.etapas || []).map(e => ({...e, stops: troca(e.stops), pern: Object.fromEntries(Object.entries(e.pern || {}).filter(([k]) => mapa[k]).map(([k, v]) => [mapa[k], v]))}))};
  return {dados: {...dados, est}, estado: st};
}
async function npLerArquivo(f){
  const prev = document.getElementById('npPrev'); prev.innerHTML = '<p class="dica">Lendo o arquivo…</p>';
  try {
    if (/\.html?$/i.test(f.name)){
      const r = lerRoteiroHTML(await lerArquivoTexto(f, true));
      if (!r || !r.lista.length) throw new Error('Esse HTML não tem um roteiro salvo dentro (ele nunca foi gravado com o botão Salvar).');
      npDados = {tipo:'html', arquivo: f.name, ...r};
      prev.innerHTML = `<p class="ok-txt">Arquivo <b>${esc(f.name)}</b> com ${r.lista.length} ${r.lista.length === 1 ? 'projeto' : 'projetos'}.</p>
        <label class="f">Projeto a trazer<select id="npHtmlProj">${r.lista.map(p => `<option value="${esc(p.id)}"${p.id === r.atual ? ' selected' : ''}>${esc(p.nome || 'Projeto')} – ${(p.estado.etapas || []).length} etapas</option>`).join('')}</select></label>
        <p class="dica" style="margin:0">Vêm junto as estações, etapas, visitas, anotações, fotos, hospedagens e gastos desse projeto.</p>`;
      const nm = document.getElementById('npNome'), hp = document.getElementById('npHtmlProj');
      const aoEscolher = () => { const p = r.lista.find(x => x.id === hp.value) || r.lista[0]; nm.value = p.nome || ''; const b = (p.baseMun && p.baseMun.n ? p.baseMun : MUN[p.base || BH0]); if (b) document.getElementById('npBase').value = `${b.n} – ${b.uf}`; };
      hp.onchange = aoEscolher; aoEscolher();
    } else {
      const rows = /\.xlsx$/i.test(f.name) ? lerXLSX(new Uint8Array(await f.arrayBuffer())) : lerCSV(await lerArquivoTexto(f));
      npDados = null; npDados = {...montarDePlanilha(rows), rows, arquivo: f.name};
      npPrevPlanilha();
      const nm = document.getElementById('npNome'); if (!nm.value) nm.value = f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').slice(0, 80);
    }
  } catch(e){ npDados = null; prev.innerHTML = `<p class="erro-txt">${esc(e.message || 'Não consegui ler esse arquivo.')}</p><p class="dica" style="margin:0">Use .xlsx, .csv ou um HTML deste roteiro. Baixe a planilha modelo para ver as colunas.</p>`; }
  npVisibilidade();
}
function npPrevPlanilha(){
  const d = npDados, prev = document.getElementById('npPrev'), cols = d.cab;
  const sel = k => `<select data-campo="${k}"><option value="">—</option>${cols.map((c, i) => `<option value="${i}"${d.mapa[k] === i ? ' selected' : ''}>${esc(c || `Coluna ${i + 1}`)}</option>`).join('')}</select>`;
  const nF = d.est.filter(e => e.tipos.includes('Fluviométrica')).length, nP = d.est.filter(e => e.tipos.includes('Pluviométrica')).length, nPar = d.est.filter(e => e.par).length / 2;
  prev.innerHTML = `<p class="ok-txt"><b>${d.est.length} estações</b> lidas de ${esc(d.arquivo)}${nF || nP ? ` (${nF} fluviométricas, ${nP} pluviométricas)` : ''}${nPar ? `; ${nPar} ${nPar === 1 ? 'dupla' : 'duplas'} no mesmo local` : ''}${d.grupos.length ? `; ${d.grupos.length} etapas na coluna "Etapa"` : ''}.</p>
    ${d.avisos.length ? `<ul class="avisos">${d.avisos.slice(0, 8).map(a => `<li>${esc(a)}</li>`).join('')}${d.avisos.length > 8 ? `<li>… e mais ${d.avisos.length - 8} avisos.</li>` : ''}</ul>` : ''}
    <div class="tab-rolar"><table class="rel np-tab"><thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Município</th><th>Lat</th><th>Lon</th>${d.grupos.length ? '<th>Etapa</th>' : ''}</tr></thead><tbody>
      ${d.est.slice(0, 6).map(e => `<tr><td>${e.n}</td><td>${esc(e.nome)}${e.cod.length ? ` <span class="rot">${esc(e.cod[0])}</span>` : ''}</td><td>${esc(e.tipos.join(' + '))}</td><td>${esc(d.mun[e.muns[0]].n)}-${d.mun[e.muns[0]].uf}</td><td>${num(e.pts[0][0], 4)}</td><td>${num(e.pts[0][1], 4)}</td>${d.grupos.length ? `<td>${esc(d.extras[e.id].etapa)}</td>` : ''}</tr>`).join('')}
      ${d.est.length > 6 ? `<tr><td colspan="7" class="rot">… mais ${d.est.length - 6}</td></tr>` : ''}</tbody></table></div>
    <details class="np-cols"><summary>Conferir as colunas</summary><div class="np-grid">${CAMPOS.map(([k, rot]) => `<label class="f">${rot}${sel(k)}</label>`).join('')}</div></details>`;
  prev.querySelectorAll('[data-campo]').forEach(s => s.onchange = () => {
    const m = {...npDados.mapa}; if (s.value === '') delete m[s.dataset.campo]; else m[s.dataset.campo] = +s.value;
    try { const keep = {rows: npDados.rows, arquivo: npDados.arquivo}; npDados = {...montarDePlanilha(npDados.rows, m), ...keep}; npPrevPlanilha(); npVisibilidade(); } catch(e){ toast(e.message); } });
}
/* Planilha modelo: as colunas que o roteiro entende, já preenchidas com as estações e a ordem atual deste projeto. */
function baixarModelo(){
  buildLOC(); const L_ = [['Ordem', 'Etapa', 'Código', 'Nome', 'Tipo', 'Latitude', 'Longitude', 'Município', 'UF', "Curso d'água", 'Instituição', 'Operadora', 'Tempo de visita (h)', 'Observações']];
  const ordem = [...state.etapas.flatMap(e => e.stops.map(s => [e, s])), ...state.pool.map(s => [null, s])];
  ordem.forEach(([e, s], i) => { const x = EST[s.id]; L_.push([i + 1, e ? e.nome : '', x.cod.join(' / '), x.nome, x.F && x.P ? 'F+P' : x.F ? 'Fluviométrica' : x.P ? 'Pluviométrica' : (x.tipos[0] || ''), num(x.pts[0][0], 6), num(x.pts[0][1], 6), MUN[x.muns[0]].n, MUN[x.muns[0]].uf, x.rio || '', x.inst || '', x.op || '', s.visita != null ? num(s.visita, 2) : '', s.nota || '']); });
  baixar('modelo_estacoes.csv', '﻿' + L_.map(csvLinha).join('\r\n'), 'text/csv;charset=utf-8');
  toast('Planilha modelo baixada, com as estações deste projeto na ordem atual. Edite no Excel e salve como .xlsx ou .csv. Cada linha é uma estação; a ordem das linhas é a ordem de visita.');
}
function estadoInicial(ids, extras, grupos, modo, k){
  const st = {v:3, cfg:{...state.cfg}, etapas:[], pool:[], apoios:[], aba:'geral'};
  const stop = id => ({id, visita: extras && extras[id] && extras[id].visita != null ? extras[id].visita : null, nota: (extras && extras[id] && extras[id].nota) || '', feito:null, relato:'', fixo:false, fotos:[]});
  if (grupos && grupos.length){
    const lst = []; grupos.forEach(g => { const e = novaEtapa(lst); e.nome = g.nome; e.stops = g.ids.map(stop); e.ordem = modo === 'planilha' ? 'manual' : 'auto'; lst.push(e); });
    const usados = new Set(grupos.flatMap(g => g.ids)); st.etapas = lst; st.pool = ids.filter(id => !usados.has(id)).map(stop); if (modo !== 'planilha') st.auto = 'otimizar';
  } else { st.pool = ids.map(stop); st.auto = modo === 'planilha' ? 'ordem' : 'dividir'; st.autoK = Math.max(1, Math.min(40, k || 3)); }
  return st;
}
function limparEstado(st, nivel){
  const s = JSON.parse(JSON.stringify(st)); delete s.salvoEm; delete s.auto;
  if (nivel === 'tudo') return s;
  const limpa = x => ({...x, feito:null, relato:'', fotos:[]});
  s.etapas = (s.etapas || []).map(e => ({...e, stops: (e.stops || []).map(limpa)})); s.pool = (s.pool || []).map(limpa);
  s.apoios = (s.apoios || []).map(a => ({...a, gastos: []}));
  return s;
}
async function criarProjeto(){
  const nomeIn = document.getElementById('npNome').value.trim(), baseTxt = document.getElementById('npBase').value;
  const baseM = acharMun(baseTxt.replace(/\s+–\s+/, ' - '));
  if (!baseM){ toast('Escolha a cidade de saída e retorno na lista (digite o começo do nome).'); document.getElementById('npBase').focus(); return; }
  const orig = projCorpo.querySelector('[name=npOrig]:checked').value, modo = (projCorpo.querySelector('[name=npOrdem]:checked') || {}).value || 'planilha';
  const k = parseInt(document.getElementById('npEtapas').value) || 3;
  const pHtml = orig === 'novo' && npDados && npDados.tipo === 'html' ? (npDados.lista.find(x => x.id === document.getElementById('npHtmlProj').value) || npDados.lista[0]) : null;
  const meta = {versaoBase: VERSAO_BASE, id: novoIdProj(), nome: nomeIn || (pHtml && pHtml.nome) || (npDados && orig === 'novo' && npDados.arquivo ? npDados.arquivo.replace(/\.[^.]+$/, '').replace(/_+/g, ' ') : '') || `Projeto ${IDX.lista.length + 1}`, criado: new Date().toISOString(), base: baseM.id, baseMun: munEntrada(baseM)};
  let dados = null, estado, rotas = null;
  if (orig === 'ant'){
    const src = metaDe(document.getElementById('npFonte').value), copia = projCorpo.querySelector('[name=npCopia]:checked').value;
    meta.tipo = src.tipo; meta.fonte = src.fonte; if (src.tipo === 'proprio') delete meta.versaoBase;
    if (src.tipo === 'proprio') dados = src.id === PJ_ID ? PJ_DADOS : lsGet(KEY_DADOS + src.id);
    const stSrc = src.id === PJ_ID ? {...state, auto:null} : lsGet(keyEstado(src.id));
    const ids = src.id === PJ_ID ? ORDEM : src.tipo === 'proprio' ? (dados.est || []).map(e => e.id) : jsonEl('dados').est.map(e => e.id);
    if (copia === 'estacoes'){ const ex = {}; [...((stSrc && stSrc.etapas) || []).flatMap(e => e.stops || []), ...((stSrc && stSrc.pool) || [])].forEach(s => { ex[s.id] = {visita: s.visita, nota: s.nota}; }); estado = estadoInicial(ids, ex, null, modo, k); }
    else { estado = limparEstado(stSrc || estadoInicial(ids, null, null, 'otimizar', k), copia); rotas = src.id === PJ_ID ? rotasAtuais() : await ROTAS.get(src.id); }
  } else {
    if (!npDados){ toast('Escolha o arquivo com os novos dados.'); return; }
    if (npDados.tipo === 'planilha'){
      meta.id = npDados.pid; meta.tipo = 'proprio'; delete meta.versaoBase; meta.fonte = `planilha ${npDados.arquivo}`;
      dados = {est: npDados.est, mun: {...npDados.mun, [baseM.id]: munEntrada(baseM)}};
      estado = estadoInicial(npDados.est.map(e => e.id), npDados.extras, npDados.grupos, modo, k);
    } else {
      const p = npDados.lista.find(x => x.id === document.getElementById('npHtmlProj').value) || npDados.lista[0], ds = dadosDoArquivo(p, npDados);
      meta.tipo = ds.tipo; if (ds.tipo === 'proprio') delete meta.versaoBase; meta.fonte = p.fonte || (ds.tipo === 'anexo' ? FONTE_BASE : `arquivo ${npDados.arquivo}`);
      estado = JSON.parse(JSON.stringify(p.estado)); dados = ds.dados;
      if (ds.renomear){ const r = renomearIds(dados, estado, meta.id); dados = r.dados; estado = r.estado; }
      else { const mt = npDados.mat; if (mt){ if (mt.road) Object.assign(road, unpackRoad(mt.road)); Object.assign(SNAP, mt.SNAP || {}); Object.assign(PAV, mt.PAV || {}); rotas = (mt.rotasP && mt.rotasP[p.id]) || (p.id === npDados.atual ? mt.rotas : null); } }
      await importarFotos(npDados.fotos);
      if (dados && !dados.mun) dados.mun = {};
      if (dados) dados.mun[baseM.id] = munEntrada(baseM);
    }
  }
  if (dados && dados.mun && !dados.mun[baseM.id]) dados = {...dados, mun: {...dados.mun, [baseM.id]: munEntrada(baseM)}};
  if (!registrarProjeto(meta, dados, estado)) return;
  salvaMatriz(); if (rotas) await ROTAS.set(meta.id, rotas);
  toast(`Projeto "${meta.nome}" criado. Abrindo…`);
  setTimeout(() => trocarProjeto(meta.id), 300);
}

/* ================= início ================= */
carregaMatriz();
const EMB = EMB_DO_ATUAL ? EST_EMB : null;
const conteudo = st => JSON.stringify({...st, mod:0, aba:0, auto:0, salvoEm:0, fundo:0, vista:0, migrado:0});
let LS0 = load(), EMB0 = EMB && EMB.v === 3 ? normaliza(JSON.parse(JSON.stringify(EMB))) : null;
const WEBAPP = /^https?:$/.test(location.protocol);   // no app publicado vale sempre o que está no aparelho (e na nuvem)
const conflito = !APP && !WEBAPP && !!(LS0 && EMB0 && conteudo(LS0) !== conteudo(EMB0));   // no aplicativo vale sempre o que está no celular
if (EMB0 && (!LS0 || (!APP && !WEBAPP && (EMB.mod || 0) > (LS0.mod || 0)))) state = normaliza(JSON.parse(JSON.stringify(EMB))); else state = LS0 || defaultState();
ANT = indiceTempos(state);
const assinatura = () => conteudo(state);
let salvoSig = null;
const migrou = !!state.migrado; delete state.migrado;
if (state.auto === 'dividir') dividir(state.autoK || 3);
else if (state.auto === 'ordem') dividir(state.autoK || 3, null, true);
else if (state.auto === 'otimizar') state.etapas.forEach(otimizarEtapa);
{ const nFix = consertarPares(state, null); if (nFix && !state.auto){ save(); setTimeout(() => toast(`Corrigido: ${nFix} ${nFix === 1 ? 'estação estava repetida ou separada' : 'estações estavam repetidas ou separadas'} da sua dupla do mesmo local. Agora cada dupla fica na mesma etapa, em sequência.`, true), 1200); } }
usarFundo(FUNDOS[state.fundo] && state.fundo !== 'osm' ? state.fundo : 'ruas');
syncCfg(); render(); fitAtual();
/* ---- mapa sem internet: nomes das cidades (sedes do IBGE) desenhados aqui mesmo, sem baixar nada ---- */
const rotulos = L.layerGroup().addTo(map);
window.desenhaRotulos = () => {
  rotulos.clearLayers(); if (!(fundoAtual === 'nenhum' || navigator.onLine === false)) return;
  const z = map.getZoom(); if (z < 8) return;
  const b = map.getBounds().pad(.05); let n = 0;
  for (const m of municipiosBR()){
    if (!b.contains([m.lat, m.lon]) || (z < 10 && !MUNEST[m.id] && m.id !== BH)) continue; if (++n > 260) break;
    L.marker([m.lat, m.lon], {interactive:false, keyboard:false, icon: L.divIcon({className:'rot-cid', iconSize:[0, 0], html:`<span>${esc(m.n)}</span>`})}).addTo(rotulos);
  }
};
map.on('moveend', window.desenhaRotulos); window.addEventListener('offline', window.desenhaRotulos); window.addEventListener('online', window.desenhaRotulos);
setTimeout(window.desenhaRotulos, 500);
/* ---- preparar para campo: deixa distâncias e traçados de todas as etapas guardados neste aparelho ---- */
async function prepararOffline(){
  if (navigator.onLine === false){ toast('Conecte à internet para preparar o roteiro para uso sem internet.'); return; }
  const corpo = document.getElementById('dMenuMobCorpo'); corpo.onclick = null; document.getElementById('dMenuMobTit').textContent = 'Uso sem internet';
  const linha = (ok, txt) => `<p class="off-l ${ok === true ? 'ok' : ok === false ? 'pend' : 'and'}">${ok === true ? '✓' : ok === false ? '!' : '…'} ${txt}</p>`;
  const quadro = (passos, fim) => { corpo.innerHTML = `<div class="off-box">${passos.join('')}${fim || ''}</div>`; };
  quadro([linha(null, 'Consultando as distâncias pelas estradas…')]); if (!dMenuMob.open) dMenuMob.showModal();
  const okT = await fetchTable();
  quadro([linha(okT, okT ? 'Distâncias pelas estradas guardadas.' : 'O serviço de distâncias não respondeu; ficam as estimativas.'), linha(null, 'Traçando as rotas de todas as etapas…')]);
  scheduleRoutes(); const t0 = Date.now(), comPts = () => state.etapas.filter(e => e.stops.length && P[e.id]), prontas = () => comPts().filter(e => routeCache[P[e.id].key]).length;
  while (Date.now() - t0 < 240000 && prontas() < comPts().length){ await sleep(1500); if (!dMenuMob.open) return; }
  const nR = prontas(), nE = comPts().length;
  salvaMatriz(); await ROTAS.set(PJ_ID, rotasAtuais()); semearLEGG(); if (APP) gravarAppJa(); save();
  let mapaMB = null; if (APP){ try { mapaMB = +APP.tamanhoMapas(); } catch(e){} } else if (window.__mapasN){ const n = await window.__mapasN(); if (n) mapaMB = n * .025; }
  quadro([linha(okT, okT ? 'Distâncias pelas estradas guardadas.' : 'Distâncias: ficam as estimativas (serviço fora do ar).'),
    linha(nR === nE, `Traçado das rotas: ${nR} de ${nE} ${nE === 1 ? 'etapa' : 'etapas'}${nR < nE ? ' (tente de novo em alguns minutos)' : ''}.`),
    linha(true, `${N_EST} estações, etapas, horários, anotações e fotos ficam neste ${APP ? 'celular' : 'navegador'}.`),
    linha(true, 'GPS, régua, marcar visitas, fotos e relatórios funcionam sem internet.'),
    linha(mapaMB ? true : null, mapaMB != null ? `Mapa de fundo guardado no celular: ${num(mapaMB, 0)} MB (as áreas que você já viu com internet).` : 'Mapa de fundo: aparece onde já foi visto com internet.')],
    `<p class="dica" style="margin:8px 0 0">Sem internet, use o fundo <b>Sem internet</b> (botão no canto do mapa): mostra limites municipais, nomes das cidades e as rotas traçadas. Para navegar curva a curva sem sinal, baixe o mapa de Minas Gerais no Organic Maps ou a área no Google Maps e use o botão "Outro app de mapa" de cada estação.${state.etapas.length && IDX.lista.length > 1 ? ' Repita esta preparação em cada projeto que for usar.' : ''}</p>`);
}
/* traçados já calculados deste projeto, guardados no navegador: o mapa abre com as rotas mesmo sem internet */
ROTAS.get('__trechos').then(t => { if (!t) return; let n = 0; Object.entries(t).forEach(([k, g]) => { if (!LEGG[k]){ LEGG[k] = g; n++; } }); if (n) renderMapa(); });
ROTAS.get(PJ_ID).then(rc => { if (!rc) return; let n = 0; Object.entries(rc).forEach(([k, r]) => { if (!routeCache[k]){ routeCache[k] = r; n++; } }); if (n){ semearPAVG(); render(); } });
if (state.migrouPares){ const n = state.migrouPares; delete state.migrouPares; save(); setTimeout(() => toast(`As estações fluviométrica e pluviométrica de um mesmo local agora são pontos separados: ${n} estações foram incluídas logo após a sua irmã, na mesma etapa. Observações, visitas e fotos antigas ficaram na primeira de cada par.`, true), 900); }
if (migrou) toast('Roteiro agora por estações. Cada estação herdou a etapa do seu município na versão anterior; hospedagens e paradas foram mantidas.');
window.addEventListener('load', () => { map.invalidateSize(); fitAtual(); });
setTimeout(() => { map.invalidateSize(); fitAtual(); }, 400);
if (window.ResizeObserver) new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('mapa'));
fetchTable().then(ok => {
  if (ok && state.auto){ if (state.auto === 'dividir') dividir(state.etapas.length || 3); else if (state.auto === 'ordem') dividir(state.etapas.length || 3, null, true); else state.etapas.forEach(otimizarEtapa); state.auto = null; consertarPares(state, null); }
  save(); render(); scheduleRoutes();
});


/* ================= salvar no próprio arquivo ================= */
const bSalvar = document.getElementById('bSalvar');
const nomeArq = (() => { try { return decodeURIComponent(location.pathname.split('/').pop()) || 'roteiro_estacoes_BH.html'; } catch(e){ return 'roteiro_estacoes_BH.html'; } })();
function atualizaSalvar(){
  if (!bSalvar) return;
  if (APP){ bSalvar.classList.remove('sujo'); document.getElementById('bSalvarMenu').classList.remove('sujo'); bSalvar.querySelector('span').textContent = 'Exportar';
    bSalvar.title = 'Gera o arquivo do roteiro (com fotos e anotações) para enviar ao computador ou guardar numa pasta';
    const og = document.getElementById('origem'); if (og){ og.textContent = 'No aplicativo, tudo fica guardado no celular automaticamente. Use Exportar para levar o roteiro ao computador.'; og.className = 'og ok'; }
    return; }
  const ok = salvoSig !== null && salvoSig === assinatura();
  bSalvar.classList.toggle('sujo', !ok); document.getElementById('bSalvarMenu').classList.toggle('sujo', !ok);
  bSalvar.querySelector('span').textContent = ok ? 'Salvo' : 'Salvar';
  bSalvar.title = ok ? 'Todas as alterações estão gravadas no arquivo' : 'Gravar as alterações dentro deste arquivo HTML';
  const og = document.getElementById('origem'); if (og){ const q = state.salvoEm ? fmtDH(state.salvoEm) : null;
    og.textContent = ok ? `Roteiro igual ao gravado no arquivo${q ? ` (${q})` : ''}.` : `Há alterações deste navegador ainda não gravadas no arquivo${q ? ` (última gravação: ${q})` : ''}.`; og.className = ok ? 'og ok' : 'og pend'; }
}
const r2 = (v, d) => Math.round(v * 10**d) / 10**d;
/* distâncias, acessos e traçados das etapas (o que permite abrir o roteiro sem internet) */
function matrizJSON(){
  return JSON.stringify({road: packRoad(roadUtil()), SNAP, PAV, rotasP: {[PJ_ID]: rotasAtuais()}});
}
function rotasAtuais(){
  const rc = {}; state.etapas.forEach(e => { const p = P[e.id]; if (!p) return; [p.key, (p.wps || []).join(',')].forEach(k => { const r = routeCache[k]; if (r && r.legs && !rc[k]) rc[k] = {legs: r.legs.map(l => (l || []).map(q => [r2(+q[0], 5), r2(+q[1], 5)])), km: r.km, h: r.h, terra: r.terra}; }); });
  return rc;
}
/* todos os projetos, para gravar no arquivo e na cópia de segurança do celular */
function bibliotecaCompleta(){
  return IDX.lista.map(p => ({...p, dados: p.tipo === 'proprio' ? (p.id === PJ_ID ? PJ_DADOS : lsGet(KEY_DADOS + p.id)) : null, estado: p.id === PJ_ID ? undefined : lsGet(keyEstado(p.id))}));
}
/* ---- aplicativo Android: guarda tudo no celular a cada alteração e entrega arquivos pelo sistema ---- */
let tGravApp = null;
function gravarAppJa(){ clearTimeout(tGravApp); tGravApp = null;
  try { const estados = {}, dados = {}; bibliotecaCompleta().forEach(p => { estados[p.id] = p.id === PJ_ID ? {...state, auto:null} : p.estado; if (p.dados) dados[p.id] = p.dados; });
    APP.gravar('biblioteca', JSON.stringify({idx: IDX, estados, dados})); APP.gravar('matriz', matrizJSON()); } catch(e){} }
function gravarApp(){ if (!APP) return; clearTimeout(tGravApp); tGravApp = setTimeout(gravarAppJa, 2000); }
window.appPausa = () => { if (APP && tGravApp) gravarAppJa(); };
async function enviarApp(nome, conteudo, tipo){
  try {
    APP.expIniciar();
    if (typeof conteudo === 'string' && /^data:[^,]*;base64,/.test(conteudo.slice(0, 100))){
      const b = conteudo.slice(conteudo.indexOf(',') + 1); for (let i = 0; i < b.length; i += 1 << 20) APP.expB64(b.slice(i, i + (1 << 20)));
    } else if (typeof conteudo === 'string'){
      const T = 1 << 19; let i = 0;
      while (i < conteudo.length){ let j = Math.min(conteudo.length, i + T); const c = conteudo.charCodeAt(j - 1); if (j < conteudo.length && c >= 0xD800 && c <= 0xDBFF) j--; APP.expTexto(conteudo.slice(i, j)); i = j; }
    } else {
      const u8 = conteudo instanceof Uint8Array ? conteudo : new Uint8Array(await new Blob([conteudo]).arrayBuffer());
      for (let i = 0; i < u8.length; i += 786432){ const sub = u8.subarray(i, i + 786432); let bin = ''; for (let k = 0; k < sub.length; k += 32768) bin += String.fromCharCode.apply(null, sub.subarray(k, k + 32768)); APP.expB64(btoa(bin)); }
    }
    APP.expConcluir(nome, tipo || 'application/octet-stream');
  } catch(e){ toast('Não foi possível gerar o arquivo neste celular.'); }
}
async function montarArquivo(){
  state.salvoEm = new Date().toISOString();
  const est = JSON.stringify({...state, auto:null}).replace(/<\//g, '<\\/');
  const rotasP = {[PJ_ID]: rotasAtuais()};
  for (const p of IDX.lista) if (p.id !== PJ_ID){ const r = await ROTAS.get(p.id); if (r) rotasP[p.id] = r; }
  const mat = JSON.stringify({road: packRoad(roadUtil()), SNAP, PAV, rotasP}).replace(/<\//g, '<\\/');
  const pjs = JSON.stringify({atual: PJ_ID, lista: bibliotecaCompleta()}).replace(/<\//g, '<\\/');
  const troca = (html, id, conteudo) => {
    const re = new RegExp(`(<script type="application/json" id="${id}">)[\\s\\S]*?(<\/script>)`);
    return re.test(html) ? html.replace(re, (m, a, b) => a + conteudo + b) : html.replace('<script type="application/json" id="dados">', `<script type="application/json" id="${id}">${conteudo}<\/script>\n<script type="application/json" id="dados">`);
  };
  const fts = JSON.stringify(await fotosParaSalvar()).replace(/<\//g, '<\\/');
  return troca(troca(troca(troca(FONTE, 'estado', est), 'matriz', mat), 'fotos', fts), 'projetos', pjs);
}
const IDB = {
  db(){ return new Promise((ok, no) => { const r = indexedDB.open('roteiro-arquivo', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); },
  async get(k){ const d = await this.db(); return new Promise(ok => { const t = d.transaction('h').objectStore('h').get(k); t.onsuccess = () => ok(t.result); t.onerror = () => ok(null); }); },
  async set(k, v){ const d = await this.db(); return new Promise(ok => { const t = d.transaction('h', 'readwrite'); t.objectStore('h').put(v, k); t.oncomplete = ok; t.onerror = ok; }); }
};
let alvoArq = null;
async function salvarNoArquivo(como){
  como = como === true;
  save(); const html = await montarArquivo(), sig = assinatura();
  if (APP){ await enviarApp('roteiro_estacoes_BH.html', html, 'text/html'); salvoSig = sig; atualizaSalvar(); return; }
  if (window.showSaveFilePicker){
    try {
      if (como) alvoArq = null;
      else if (!alvoArq){ try { alvoArq = await IDB.get(location.pathname); } catch(e){} }
      if (alvoArq && alvoArq.requestPermission){ const pm = await alvoArq.requestPermission({mode:'readwrite'}); if (pm !== 'granted') alvoArq = null; }
      const primeira = !alvoArq;
      if (!alvoArq){
        alvoArq = await window.showSaveFilePicker({suggestedName: como ? nomeArq.replace(/\.html?$/i, '') + '_copia.html' : nomeArq, types:[{description:'Página HTML', accept:{'text/html':['.html', '.htm']}}]});
        try { await IDB.set(location.pathname, alvoArq); } catch(e){}
      }
      const w = await alvoArq.createWritable(); await w.write(new Blob([html], {type:'text/html'})); await w.close();
      salvoSig = sig; atualizaSalvar();
      toast(como ? `Salvo como "${alvoArq.name}". Daqui em diante, Salvar grava nesse arquivo.` : primeira ? `Salvo em "${alvoArq.name}". Os próximos cliques em Salvar gravam direto nesse arquivo.` : `Alterações gravadas em "${alvoArq.name}".`);
      return;
    } catch(err){
      if (err && err.name === 'AbortError'){ toast('Gravação cancelada.'); return; }
      alvoArq = null;
    }
  }
  let nome = nomeArq;
  if (como){ let r = null; try { r = window.prompt('Nome do novo arquivo:', nomeArq.replace(/\.html?$/i, '') + '_copia.html'); } catch(e){} if (r === null && !window.prompt) r = nomeArq; if (r === null){ toast('Gravação cancelada.'); return; } nome = /\.html?$/i.test(r.trim()) ? r.trim() : r.trim() + '.html'; }
  baixar(nome, html, 'text/html');
  salvoSig = sig; atualizaSalvar();
  toast(como ? `Cópia "${nome}" baixada.` : 'Este navegador não grava direto no arquivo: foi baixada uma cópia atualizada. Substitua o arquivo antigo por ela.');
}
if (bSalvar) bSalvar.onclick = () => salvarNoArquivo(false);
const splitS = document.getElementById('splitSalvar');
document.getElementById('bSalvarMenu').onclick = ev => { ev.stopPropagation(); menu.classList.remove('aberto');
  if (mobile()){ abrirMenuMob(APP ? 'Arquivo do roteiro' : 'Salvar', document.getElementById('menuSalvar'), ev2 => { const b2 = ev2.target.closest('[data-salvar]'); if (b2) acaoSalvar(b2.dataset.salvar); }); return; } const o = splitS.classList.toggle('aberto'); ev.currentTarget.setAttribute('aria-expanded', o); };
document.addEventListener('click', () => splitS.classList.remove('aberto'));
document.getElementById('menuSalvar').onclick = ev => { const b = ev.target.closest('[data-salvar]'); if (!b) return; splitS.classList.remove('aberto'); acaoSalvar(b.dataset.salvar); };
function acaoSalvar(v){
  if (v === 'abrir') return document.getElementById('arquivo').click();
  if (v === 'mapas'){ if (!APP) return; let mb = 0; try { mb = +APP.tamanhoMapas() || 0; } catch(e){}
    if (window.confirm(`Apagar os ${num(mb, 0)} MB de mapa de fundo guardados no celular? Eles voltam a ser guardados à medida que o mapa for visto com internet.`)){ try { APP.limparMapas(); } catch(e){} toast('Mapas guardados apagados.'); } return; }
  salvarNoArquivo(v === 'como');
}
if (APP){
  let mb = 0; try { mb = +APP.tamanhoMapas() || 0; } catch(e){}
  document.getElementById('menuSalvar').innerHTML = `<button data-salvar="salvar">Exportar roteiro (.html)<small>Gera o arquivo com etapas, visitas, anotações, gastos e fotos. Depois escolha: enviar (WhatsApp, e-mail, Drive) ou salvar numa pasta. No computador, abra esse arquivo no navegador.</small></button>
    <button data-salvar="abrir">Abrir roteiro vindo do computador…<small>Escolha o arquivo .html salvo no computador. Ele substitui o roteiro do celular (dá para desfazer).</small></button>
    <button data-salvar="mapas">Apagar mapas guardados (${num(mb, 0)} MB)<small>O mapa de fundo das áreas já vistas com internet fica guardado para uso sem sinal.</small></button>`;
  document.getElementById('bSalvarMenu').title = 'Exportar ou abrir roteiro';
}
if (EMB0 && conteudo(state) === conteudo(EMB0)) salvoSig = assinatura();
document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')){ ev.preventDefault(); salvarNoArquivo(ev.shiftKey); } });
atualizaSalvar();
/* Ao abrir: se o roteiro gravado no arquivo é diferente do que está guardado neste navegador, pergunta qual usar. */
if (conflito){
  const dO = document.getElementById('dOrigem'), resumo = st => { const ets = st.etapas || [], vis = ets.reduce((a, e) => a + e.stops.filter(x => x.feito).length, 0), fts = ets.reduce((a, e) => a + e.stops.reduce((b, x) => b + (x.fotos || []).length, 0), 0);
    return `${ets.length} etapas (${ets.map(e => `${esc(e.nome)}: ${e.stops.length}`).join(', ')}), ${vis} visitas marcadas, ${(st.apoios || []).length} hospedagens/paradas, ${fts} fotos`; };
  document.getElementById('oArq').innerHTML = `<b>Gravado neste arquivo</b><span>${EMB.salvoEm ? `Salvo em ${fmtDH(EMB.salvoEm)}` : 'Data de gravação desconhecida'}</span><span>${resumo(EMB0)}</span>`;
  document.getElementById('oNav').innerHTML = `<b>Guardado neste navegador</b><span>${LS0.mod ? `Alterado em ${fmtDH(new Date(LS0.mod).toISOString())}` : ''}</span><span>${resumo(LS0)}</span>`;
  const usar = qual => { const esc_ = qual === 'arq' ? EMB0 : LS0; snapshot(); state = normaliza(JSON.parse(JSON.stringify(esc_))); state.auto = null; save(); syncCfg(); render(); fitAtual(); scheduleRoutes();
    salvoSig = qual === 'arq' ? assinatura() : null; atualizaSalvar(); dO.close(); toast(qual === 'arq' ? 'Usando o roteiro gravado no arquivo.' : 'Usando o roteiro deste navegador. Clique em Salvar para gravá-lo no arquivo.', true); };
  document.getElementById('oUsarArq').onclick = () => usar('arq');
  document.getElementById('oUsarNav').onclick = () => usar('nav');
  setTimeout(() => dO.showModal(), 300);
}

/* ================= internet e aplicativo ================= */
window.addEventListener('online', () => { if (srv === 'off') srv = 'pendente'; if (srvPav === 'off') srvPav = 'pendente'; setStatus(); fetchTable().then(() => { render(); scheduleRoutes(); }); });
window.addEventListener('offline', setStatus);
/* botão "voltar" do Android: fecha o que estiver aberto antes de sair do app */
window.appVoltar = () => {
  const dlg = [...document.querySelectorAll('dialog[open]')].pop(); if (dlg){ dlg.close(); return true; }
  const ab = document.querySelector('.menu.aberto, .split.aberto'); if (ab){ ab.classList.remove('aberto'); return true; }
  if (document.querySelector('.leaflet-popup')){ map.closePopup(); return true; }
  if (mobile() && sheetEst === 'cheio'){ setSheet('meio'); return true; }
  return false;
};
window.appFimImpressao = () => document.body.classList.remove('imprimindo');
/* arquivo .html aberto no celular "com o aplicativo" (WhatsApp, Drive, Arquivos) */
window.appRecebido = () => { if (!APP) return; let t = ''; try { if (!APP.temRecebido()) return; t = APP.lerRecebido(); } catch(e){ return; } if (!t) return;
  if (window.confirm('Abrir o roteiro recebido? Ele substitui o roteiro que está no celular (dá para desfazer em seguida).')) importarTexto(t); else toast('Arquivo recebido ignorado.'); };
if (APP) setTimeout(window.appRecebido, 1200);
if (APP){ try { if (!localStorage.getItem('app-dica-1')){ localStorage.setItem('app-dica-1', '1'); setTimeout(() => toast('Tudo fica guardado no celular e funciona sem internet. Para trazer o roteiro do computador: toque em ▾ ao lado de Exportar > "Abrir roteiro vindo do computador".'), 1500); } } catch(e){} }
