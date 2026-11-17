
/* =====================================================================================================
   CELULAR: interface própria, simples e leve. Mapa em tela cheia, uma folha que sobe de baixo e
   quatro abas (Mapa, Hoje, Etapas, Mais). O planejamento detalhado do computador continua disponível
   em Mais → Planejamento completo.
   ===================================================================================================== */
if (CELULAR){
  document.documentElement.classList.add('celular');
  /* mapa mais leve no celular: limites municipais simplificados e sem preenchimento invisível; mapa de fundo
     só carrega quando o zoom termina */
  const _estiloMun = estiloMun;
  estiloMun = id => { const st = _estiloMun(id); return (st.fillOpacity || 0) < .05 ? {...st, fill:false} : {...st, fill:true}; };
  canvas.options.padding = .1;
  limites.eachLayer(l => { l.options.smoothFactor = 3; l.setStyle(estiloMun(l.feature.properties.id)); });
  L.TileLayer.mergeOptions({updateWhenZooming:false, updateWhenIdle:true, keepBuffer:1});
  map.options.zoomSnap = 1; map._fadeAnimated = false;
  const todosMun = limites.getLayers();
  function ajustaLimites(){
    const leve = (state.fundo || 'ruas') !== 'nenhum', com = new Set([BH]);
    if (leve) state.etapas.forEach(e => e.stops.forEach(x => [...EST[x.id].muns, ...EST[x.id].munPt].forEach(m => com.add(m))));
    todosMun.forEach(l => { const quer = !leve || com.has(l.feature.properties.id), tem = limites.hasLayer(l); if (quer && !tem) limites.addLayer(l); else if (!quer && tem) limites.removeLayer(l); });
  }
  const _usarFundo = usarFundo;
  usarFundo = (...a) => { const r = _usarFundo(...a); try { ajustaLimites(); } catch(e){} return r; };
  try { usarFundo(['ruas', 'ter', 'nenhum'].includes(state.fundo) ? state.fundo : 'ruas'); } catch(e){}
  /* ---------- estrutura ---------- */
  const raiz = document.createElement('div'); raiz.id = 'cel';
  raiz.innerHTML = `
    <header id="cTopo"><button type="button" id="cProj" aria-label="Trocar de projeto"><svg class="c-logo" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#0B6B45"/><path d="M10 38.5h28" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.5 5.3"/><path d="M24 8c-5.5 0-9.6 4.1-9.6 9.4 0 6.9 9.6 15.1 9.6 15.1s9.6-8.2 9.6-15.1C33.6 12.1 29.5 8 24 8z" fill="#E0A100"/><circle cx="24" cy="17.4" r="3.6" fill="#0B6B45"/></svg><span></span>${'<svg class="ic-ui seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'}</button>
      <button type="button" id="cSync" aria-label="Situação da nuvem"><i></i></button></header>
    <div id="cRec" hidden></div>
    <div id="cFlut"><button type="button" data-c="gps" aria-label="Minha localização">${svgI('gps')}</button><button type="button" data-c="camadas" aria-label="Fundo do mapa">${'<svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>'}</button><button type="button" data-c="tudo" aria-label="Ver o roteiro inteiro">${'<svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'}</button></div>
    <section id="cFolha"><div class="cf-alca" aria-hidden="true"><span></span></div><div id="cCorpo"></div></section>
    <nav id="cNav" aria-label="Seções">
      <button type="button" data-t="mapa">${svgI('mapa')}<span>Mapa</span></button>
      <button type="button" data-t="hoje">${svgI('campo')}<span>Hoje</span></button>
      <button type="button" data-t="rota"><svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/></svg><span>Rota</span><i class="c-rec" hidden></i></button>
      <button type="button" data-t="etapas">${svgI('roteiro')}<span>Etapas</span></button>
      <button type="button" data-t="mais">${svgI('menu')}<span>Mais</span><i class="c-dot" hidden></i></button>
    </nav>`;
  document.body.appendChild(raiz);
  const folha = raiz.querySelector('#cFolha'), corpo = raiz.querySelector('#cCorpo'), navC = raiz.querySelector('#cNav');
  const $ = s => raiz.querySelector(s);
  const navAlt = () => navC.getBoundingClientRect().height;
  /* ---------- altura da folha ---------- */
  let alt = 'baixa';
  const ALT = {baixa: () => Math.min(corpo.scrollHeight + 22, 190), media: () => Math.round(innerHeight * .5), alta: () => innerHeight - 64 - navAlt()};
  function altura(a, anima = true){
    alt = a || alt; folha.dataset.alt = alt; document.documentElement.dataset.folha = alt;
    folha.style.transition = anima ? '' : 'none';
    const h = Math.max(70, ALT[alt]()); folha.style.height = h + 'px';
    document.documentElement.style.setProperty('--folha', h + 'px');
  }
  window.__alturaFolha = () => folha.getBoundingClientRect().height + navAlt();
  /* arrastar pela alça (ou pelo título) */
  (() => {
    let y0 = null, h0 = 0, t0 = 0, moveu = false;
    const ini = ev => { if (ev.target.closest('button, a, input, textarea, select')) return; y0 = ev.touches[0].clientY; h0 = folha.getBoundingClientRect().height; t0 = performance.now(); moveu = false; folha.style.transition = 'none'; };
    const mov = ev => { if (y0 === null) return; const dy = ev.touches[0].clientY - y0; if (Math.abs(dy) > 6) moveu = true; if (!moveu) return; ev.preventDefault();
      folha.style.height = Math.min(innerHeight - 64 - navAlt(), Math.max(70, h0 - dy)) + 'px'; };
    const fim = ev => { if (y0 === null) return; const dy = ev.changedTouches[0].clientY - y0, v = dy / Math.max(1, performance.now() - t0); y0 = null; folha.style.transition = '';
      if (!moveu){ if (ev.target.closest('.cf-alca')) altura(alt === 'baixa' ? 'media' : alt === 'media' ? 'alta' : 'baixa'); return; }
      const h = folha.getBoundingClientRect().height, ordem = ['baixa', 'media', 'alta'];
      let a = ordem.map(k => [k, Math.abs(ALT[k]() - h)]).sort((x, y) => x[1] - y[1])[0][0];
      if (Math.abs(v) > .5) a = ordem[Math.max(0, Math.min(2, ordem.indexOf(alt) + (v > 0 ? -1 : 1)))];
      altura(a); };
    folha.addEventListener('touchstart', ev => { if (ev.target.closest('.cf-alca, .cf-cab')) ini(ev); }, {passive:true});
    folha.addEventListener('touchmove', mov, {passive:false});
    folha.addEventListener('touchend', fim);
    /* puxar para baixo no topo da lista recolhe */
    let py = null;
    corpo.addEventListener('touchstart', ev => { py = corpo.scrollTop <= 0 ? ev.touches[0].clientY : null; }, {passive:true});
    corpo.addEventListener('touchmove', ev => { if (py !== null && y0 === null && ev.touches[0].clientY - py > 80){ py = null; altura(alt === 'alta' ? 'media' : 'baixa'); } }, {passive:true});
  })();
  /* ---------- navegação ---------- */
  let aba = 'mapa', pilha = [];        // pilha de subpáginas dentro da aba: [{v:'estacao', id}, ...]
  const atual = () => pilha.length ? pilha[pilha.length - 1] : {v: aba};
  function irTab(t, a){
    aba = t; pilha = []; navC.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-current', b.dataset.t === t ? 'page' : 'false'));
    desenhar(); altura(a || (t === 'mapa' ? 'baixa' : t === 'hoje' ? 'alta' : 'media')); corpo.scrollTop = 0;
    if (t === 'mapa') map.invalidateSize();
  }
  function abrir(v, a){ pilha.push(v); desenhar(); altura(a || (alt === 'baixa' ? 'media' : alt)); corpo.scrollTop = 0; }
  function voltar(){ if (pilha.length){ pilha.pop(); desenhar(); altura(); corpo.scrollTop = 0; return true; } if (aba !== 'mapa'){ irTab('mapa'); return true; } if (alt !== 'baixa'){ altura('baixa'); return true; } return false; }
  navC.addEventListener('click', ev => { const b = ev.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === aba && !pilha.length){ altura(alt === 'baixa' ? 'media' : 'baixa'); return; } irTab(b.dataset.t); });
  history.replaceState({c:0}, ''); history.pushState({c:1}, '');
  window.addEventListener('popstate', () => {
    const dl = document.querySelector('dialog[open]');
    if (dl){ dl.close(); history.pushState({c:1}, ''); return; }
    if (document.documentElement.classList.contains('plan-aberto')){ fecharPlanejamento(); history.pushState({c:1}, ''); return; }
    if (map._popup && map.hasLayer(map._popup)){ map.closePopup(); history.pushState({c:1}, ''); return; }
    if (voltar()) history.pushState({c:1}, '');
  });

  /* ---------- auxiliares de dados ---------- */
  const onde = id => { buildLOC(); const w = LOC[id]; if (!w || !w.e) return {s: w && w.s, e:null}; const p = P[w.e.id]; return {s:w.s, e:w.e, k:w.k, p, inf: p && p.info[w.k]}; };
  const posGPS = () => GPS.pos && [GPS.pos.coords.latitude, GPS.pos.coords.longitude];
  const linkNav = id => `https://www.google.com/maps/dir/?api=1&destination=${ll(id)[0]},${ll(id)[1]}&travelmode=driving`;
  const cab = (titulo, sub, voltarBt = pilha.length > 0) => `<div class="cf-cab">${voltarBt ? `<button type="button" class="cf-volta" data-c="voltar" aria-label="Voltar"><svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>` : ''}<div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
  const vazio = t => `<p class="c-vazio">${t}</p>`;
  const icGM = '<svg class="ic-gm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="#EA4335"/><path d="M12 2c-2.2 0-4.1 1-5.4 2.6L12 9l5.4-4.4C16.1 3 14.2 2 12 2z" fill="#4285F4" opacity=".9"/><path d="M5 9c0 1.3.4 2.7 1 4L12 9 6.6 4.6C5.6 5.8 5 7.3 5 9z" fill="#FBBC04"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>';
  const nomeNo = (e, x) => x.rot || (x.k !== undefined ? EST[e.stops[x.k].id].nome : '');
  /* rota do dia no Google Maps, com a legenda das letras que o Google Maps usa (A, B, C...) */
  function blocoGM(e, D, titulo = 'Rota do dia no Google Maps'){
    const g = gmPlano(e, D), n = g.partes.length;
    const sub = g.continuar ? `Da sua posição pelas ${g.faltam} ${g.faltam === 1 ? 'estação que falta' : 'estações que faltam'}` : `${D.j - D.i} estações, na ordem do roteiro`;
    return `<section class="c-gm"><div class="c-gm-t">${icGM}<div><b>${titulo}</b><small>${sub}</small></div></div>
      <div class="c-gm-bt">${g.partes.map((p, i) => `<a class="c-bt gm" href="${p.url}" target="_blank" rel="noopener">Abrir${n > 1 ? ` parte ${i + 1} de ${n}` : ' no Google Maps'}</a>`).join('')}</div>
      <details class="c-gm-leg"><summary>Como ler a rota</summary>
        ${g.partes.map((p, i) => `${n > 1 ? `<p class="c-gm-p">Parte ${i + 1}</p>` : ''}<ol>${p.legenda.map(x => `<li><i>${x.l}</i>${esc(nomeNo(e, x.x))}</li>`).join('')}</ol>`).join('')}
        <p>No Google Maps cada parada aparece com uma letra. Toque em <b>Iniciar</b> para navegar. Ao chegar em cada estação, volte ao Roteiro e toque em <b>Cheguei</b>: o próximo link já sai da sua posição só com as estações que faltam.${n > 1 ? ' O Google Maps aceita até 10 pontos por rota, por isso o dia foi dividido em partes.' : ''}</p></details></section>`;
  }

  /* ---------- telas ---------- */
  function telaMapa(){
    const e = etapaAtual(), p = e && P[e.id], T = totaisGerais ? totaisGerais() : null;
    const chips = `<div class="c-chips" role="group" aria-label="Mostrar no mapa"><button type="button" data-c="etapa" data-id="geral" aria-pressed="${!e}">Todas</button>${state.etapas.map(x => `<button type="button" data-c="etapa" data-id="${x.id}" aria-pressed="${e && e.id === x.id}" style="--c:${x.cor}"><i></i>${esc(x.nome)}</button>`).join('')}</div>`;
    const resumo = e && p ? `${e.stops.length} estações · ${p.days.length} dias · ${fmtKm(p.tot.km)} km${periodo(p) ? ' · ' + periodo(p) : ''}`
      : `${state.etapas.reduce((a, x) => a + x.stops.length, 0)} estações · ${state.etapas.length} etapas${T ? ` · ${fmtKm(T.km)} km` : ''}`;
    const dias = e && p && p.days.length ? `<p class="c-rot">Abrir um dia no Google Maps</p><div class="c-chips gm">${p.days.map((D, d) => { const g = gmPlano(e, D); return `<a href="${g.partes[0].url}" target="_blank" rel="noopener">${icGM}Dia ${d + 1}${g.partes.length > 1 ? ' (1ª parte)' : ''}</a>`; }).join('')}</div>` : '';
    return `<div class="cf-cab"><div><h2>${e ? esc(e.nome) : 'Roteiro completo'}</h2><p>${resumo}</p></div></div>${chips}${dias}`;
  }
  let diaHoje = null, focoHoje = null;
  const SIT = [['ok', 'Funcionando'], ['manut', 'Precisa de manutenção'], ['acesso', 'Sem acesso']];
  const fmtMin = h => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? pad2(m % 60) : ''}`; };
  const quando = s => s.feito ? s.feito.replace(', ', ' às ') : '';
  const setaSvg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  /* ===== HOJE: o dia em forma de linha do tempo ===== */
  function telaHoje(){
    const e = etapaCampo(), p = e && P[e.id];
    if (!e) return cab('Hoje', '') + vazio('Nenhuma etapa montada ainda. Monte as etapas no computador ou em Mais → Planejamento completo.');
    if (!p || !p.days.length) return cab('Hoje', esc(e.nome)) + vazio('Esta etapa ainda não tem estações.');
    const d = diaHoje !== null && diaHoje < p.days.length ? diaHoje : diaCampo(e, p), D = p.days[d];
    const ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
    const pend = ks.filter(k => !e.stops[k].feito), feitos = ks.length - pend.length, g = gmPlano(e, D);
    const kFoco = focoHoje ? ks.find(k => e.stops[k].id === focoHoje) : undefined;
    const atualK = kFoco !== undefined ? kFoco : (pend.length ? pend[0] : null);
    const q = posGPS();
    let h = `<div class="h-cab" style="--c:${e.cor}">
        <button type="button" class="h-seta" data-c="dia" data-d="${d - 1}" ${d ? '' : 'disabled'} aria-label="Dia anterior">${setaSvg('m15 6-6 6 6 6')}</button>
        <div class="h-tit"><small>${esc(e.nome)} · dia ${d + 1} de ${p.days.length}</small><b>${D.data ? esc(fmtDS(D.data)) : `Dia ${d + 1}`}</b></div>
        <button type="button" class="h-seta" data-c="dia" data-d="${d + 1}" ${d < p.days.length - 1 ? '' : 'disabled'} aria-label="Próximo dia">${setaSvg('m9 6 6 6-6 6')}</button></div>
      <div class="h-prog" style="--c:${e.cor}"><i><i style="width:${ks.length ? Math.round(feitos / ks.length * 100) : 0}%"></i></i>
        <div><span><b>${feitos} de ${ks.length}</b> estações visitadas</span><span>${fmtKm(D.km)} km · ${fmtHora(D.saida)}–${fmtHora(D.chegada)}</span></div></div>`;
    if (state.etapas.length > 1) h += `<div class="c-chips mini">${state.etapas.map(x => `<button type="button" data-c="etapa-hoje" data-id="${x.id}" aria-pressed="${x.id === e.id}" style="--c:${x.cor}"><i></i>${esc(x.nome)}</button>`).join('')}</div>`;
    if (pend.length) h += g.partes.map((pt, i) => `<a class="h-gm" href="${pt.url}" target="_blank" rel="noopener">${icGM}<div><b>${g.continuar ? 'Continuar no Google Maps' : 'Abrir o dia no Google Maps'}${g.partes.length > 1 ? ` · parte ${i + 1}/${g.partes.length}` : ''}</b>
        <small>${g.continuar ? `Sai da sua posição · ${g.faltam === 1 ? 'falta 1 estação' : `faltam ${g.faltam} estações`}` : 'Todas as paradas do dia, em ordem'}. As letras são as mesmas da lista abaixo.</small></div><span class="h-gm-s">${setaSvg('m9 6 6 6-6 6')}</span></a>`).join('');
    else h += `<p class="h-fim">${svgI('ok')} Dia concluído: todas as estações foram visitadas.</p>`;
    /* linha do tempo do dia */
    const pausaDe = x => (D.pausas || []).filter(z => z.x === x);
    const linhaPausa = z => `<li class="tl-pausa"><i class="tl-no"></i><div><time>${fmtHora(z.ini)}</time><span>${/lan/i.test(z.tipo) ? 'Lanche' : 'Almoço'} · ${fmtMin(z.dur)}</span></div></li>`;
    const trecho = x => { const lg = D.legs[x]; return lg ? `<li class="tl-trecho"><span>${num(lg.km, lg.km < 10 ? 1 : 0)} km · ${fmtMin(lg.h)} de estrada</span></li>` : ''; };
    const orig = D.from === BH ? 'Belo Horizonte' : munNome(D.from), dest = D.to === BH ? 'Belo Horizonte' : munNome(D.to), hosp = D.to !== BH ? hospDe(e, D.to) : null;
    const letraFim = g.continuar || !g.partes.length ? '' : g.partes[g.partes.length - 1].legenda.slice(-1)[0].l;
    h += `<p class="c-rot">Roteiro do dia</p><ol class="tl" style="--c:${e.cor}"><li class="tl-ponta"><i class="tl-no">${g.continuar ? '' : 'A'}</i><div><time>${fmtHora(D.saida)}</time><b>Saída de ${esc(orig)}</b></div></li>`;
    ks.forEach((k, i) => {
      h += pausaDe(i).map(linhaPausa).join('') + trecho(i);
      const s = e.stops[k], est = EST[s.id], inf = p.info[k] || {}, le = g.letra[k], eAtual = k === atualK, dist = q ? havLL(q, ll(s.id)) : null;
      const extra = [s.sit && SITUACOES[s.sit], (s.fotos || []).length && `${s.fotos.length} foto${s.fotos.length > 1 ? 's' : ''}`, s.relato && 'anotação'].filter(Boolean).join(' · ');
      const noLocal = inf.conj ? 'mesma visita da anterior' : `${fmtMin(Math.max(0, (inf.said || 0) - (inf.cheg || 0)))} no local`;
      h += `<li class="tl-est${s.feito ? ' feito' : ''}${eAtual ? ' atual' : ''}"><i class="tl-no">${s.feito ? svgI('ok') : le ? le.l : ''}</i>
        <div class="tl-c"><button type="button" class="tl-it" data-c="estacao" data-id="${s.id}"><time>${fmtHora(inf.cheg)}</time><b>${esc(est.nome)} ${tipoBadge(est)}</b>
          <small>${s.feito ? `<span class="ok">Visitada ${esc(quando(s))}</span>${extra ? ' · ' + esc(extra) : ''}` : `${esc(estMun(est))} · ${noLocal}${dist !== null ? ` · <b>${fmtDist(dist)} daqui</b>` : ''}`}</small></button>
          ${eAtual ? `<div class="tl-acoes">${s.feito ? `<button type="button" class="c-bt" data-c="estacao" data-id="${s.id}">${svgI('nota')}<span>Ver registro</span></button>${pend.length ? `<button type="button" class="c-bt pri" data-c="proxima">Próxima ${setaSvg('m9 6 6 6-6 6')}</button>` : ''}`
            : `<a class="c-bt gmb" href="${linkNav(s.id)}" target="_blank" rel="noopener">${icGM}<span>Ir até lá</span></a><button type="button" class="c-bt verde" data-c="cheguei" data-id="${s.id}">${svgI('ok')}<span>Cheguei</span></button>`}</div>` : ''}
        </div></li>`;
    });
    h += pausaDe(ks.length).map(linhaPausa).join('') + trecho(ks.length);
    h += `<li class="tl-ponta fim"><i class="tl-no">${letraFim}</i><div><time>${fmtHora(D.chegada)}</time><b>${D.to === BH ? 'Chegada em Belo Horizonte' : `Pernoite em ${esc(dest)}`}</b>
        ${D.to !== BH ? (hosp ? `<small class="tl-hosp">${svgI('cama')}${esc(hosp.nome)}${hosp.contato ? ' · ' + esc(hosp.contato) : ''}</small>` : `<button type="button" class="tl-link" data-c="apoio-novo" data-t="hosp" data-mun="${D.to}">+ Registrar hospedagem</button>`) : ''}</div></li></ol>`;
    h += `<button type="button" class="c-bt largo" data-c="gasto">${svgI('moeda')}<span>Registrar gasto ou abastecimento</span></button>`;
    return h;
  }
  /* ===== REGISTRO DA VISITA ===== */
  function telaVisita(id){
    const est = EST[id], o = onde(id), s = o.s || {}, q = posGPS(), dist = q ? havLL(q, ll(id)) : null, a = acesso(id);
    let h = cab('Registro da visita', o.e ? `${esc(o.e.nome)}${o.inf ? ` · dia ${o.inf.d + 1} · chegada prevista ${fmtHora(o.inf.cheg)}` : ''}` : 'Fora das etapas');
    h += `<div class="v-cab" style="--c:${o.e ? o.e.cor : '#5E6B66'}"><h3>${esc(est.nome)} ${tipoBadge(est)}</h3>
      <p>${esc(estMun(est))} · ${esc(est.cod.join(' / '))}${est.rio ? ` · ${esc(est.rio)}` : ''}${dist !== null ? ` · <b>${fmtDist(dist)} daqui</b>` : ''}</p></div>`;
    if (!o.e) return h + `<a class="c-bt largo gmb" href="${linkNav(id)}" target="_blank" rel="noopener">${icGM}<span>Ir até lá no Google Maps</span></a>` + vazio('Esta estação não está em nenhuma etapa.');
    h += s.feito ? `<div class="v-ok">${svgI('ok')}<div><b>Visitada</b><small>${esc(quando(s))}</small></div><button type="button" class="tl-link" data-c="desmarcar" data-id="${id}">Desmarcar</button></div>`
      : `<div class="v-duo"><a class="c-bt gmb" href="${linkNav(id)}" target="_blank" rel="noopener">${icGM}<span>Ir até lá</span></a><button type="button" class="c-bt verde" data-c="cheguei" data-id="${id}">${svgI('ok')}<span>Cheguei</span></button></div>`;
    h += `<p class="c-rot">Situação da estação</p><div class="v-sit">${SIT.map(([k, n]) => `<button type="button" data-c="sit" data-id="${id}" data-v="${k}" aria-pressed="${s.sit === k}" class="s-${k}">${n}</button>`).join('')}</div>
      <p class="c-rot">Fotos${(s.fotos || []).length ? ` · ${s.fotos.length}` : ''}</p>
      <div class="v-fotos">${(s.fotos || []).map(f => `<button type="button" data-ver-foto="${id}|${f.id}"><img data-foto="${f.id}" alt="Foto"></button>`).join('')}
        <button type="button" class="v-add" data-c="foto" data-id="${id}">${svgI('foto')}<span>Câmera</span></button><button type="button" class="v-add" data-c="galeria" data-id="${id}">${svgI('pasta')}<span>Galeria</span></button></div>
      <p class="c-rot">Anotações</p>
      <textarea id="cNota" class="v-nota" data-id="${id}" rows="4" placeholder="Leituras, manutenção feita, estado do acesso, contato com o observador, pendências…">${esc(s.relato || '')}</textarea>
      <p class="v-salvo" id="cNotaSt">${s.relato ? 'Salvo' : 'Salva sozinha quando você sai do campo'}</p>`;
    if (s.nota) h += `<p class="c-rot">Observação do planejamento</p><p class="c-relato">${esc(s.nota)}</p>`;
    h += `<p class="c-rot">Localização</p><div class="v-loc"><span>${ll(id)[0].toFixed(5)}, ${ll(id)[1].toFixed(5)}</span><button type="button" class="tl-link" data-c="copiar" data-id="${id}">Copiar</button><button type="button" class="tl-link" data-c="ver" data-id="${id}">Ver no mapa</button></div>
      ${a && a.nivel !== 'ok' ? `<p class="c-dica">${a.nivel === 'sem' ? 'Sem estrada mapeada até a estação' : 'O último trecho não tem estrada mapeada'} (${fmtM(a.d)}). Confirme o acesso com o observador.</p>` : ''}`;
    if (o.inf && s.feito){ const D = o.p.days[o.inf.d]; let prox = null; for (let k = D.i; k < D.j; k++) if (!o.e.stops[k].feito && o.e.stops[k].id !== id){ prox = o.e.stops[k].id; break; }
      if (prox) h += `<button type="button" class="c-bt largo pri" data-c="estacao" data-id="${prox}">Próxima: ${esc(EST[prox].nome)} ${setaSvg('m9 6 6 6-6 6')}</button>`; }
    return h;
  }
  /* ===== ROTA: gravação do caminho percorrido ===== */
  function numerosGrav(){ const t = GRV.t; if (!t) return {km:0, seg:0}; return {km:t.km, seg:t.seg + (GRV.pausa || !t.retomado ? 0 : (Date.now() - t.retomado) / 1000)}; }
  const linhaTrj = t => `<li><button type="button" class="c-it" data-c="trj-ver" data-id="${t.id}"><b>${esc(fmtDataHora(t.inicio))} – ${esc(fmtHoraISO(t.fim))}</b><small>${num(t.km, 1)} km · ${fmtDur(t.seg)}${t.etapa && etapaPorId(t.etapa) ? ` · ${esc(etapaPorId(t.etapa).nome)}` : ''}${t.nome ? ` · ${esc(t.nome)}` : ''}${t.importado ? ' · importada' : ''}</small></button>
    <button type="button" class="c-red" data-c="trj-gpx" data-id="${t.id}" aria-label="Baixar GPX">${svgI('baixar')}</button><button type="button" class="c-red perigo" data-c="trj-ex" data-id="${t.id}" aria-label="Excluir">${svgI('lixo')}</button></li>`;
  function telaRota(){
    const hojeD = new Date().toDateString(), deHoje = GRV.lista.filter(t => new Date(t.inicio).toDateString() === hojeD);
    const v = GPS.pos && GPS.pos.coords.speed != null && GPS.pos.coords.speed > .5 ? Math.round(GPS.pos.coords.speed * 3.6) : 0;
    let h = cab('Rota', 'O caminho percorrido, gravado pelo GPS');
    if (!GRV.t) h += `<div class="r-ini"><button type="button" class="r-bt" data-c="gravar" aria-label="Iniciar gravação"><i></i></button><b>Iniciar gravação</b><small>Toque ao sair. Deixe o app aberto: a tela fica acesa sozinha.</small></div>`;
    else { const n = numerosGrav();
      h += `<div class="r-viva${GRV.pausa ? ' pausa' : ''}"><p class="r-st"><i class="rec"></i>${GRV.pausa ? 'Gravação pausada' : 'Gravando'}${GPS.pos ? ` · GPS ±${Math.round(GPS.pos.coords.accuracy || 0)} m` : ' · procurando o GPS…'}</p>
        <div class="r-nums"><div><b data-r="km">${num(n.km, n.km < 100 ? 1 : 0)}</b><span>km</span></div><div><b data-r="t">${fmtDur(n.seg)}</b><span>tempo</span></div><div><b data-r="v">${v}</b><span>km/h</span></div></div>
        <div class="r-bts"><button type="button" class="c-bt" data-c="${GRV.pausa ? 'continuar' : 'pausar'}">${GRV.pausa ? 'Continuar' : 'Pausar'}</button><button type="button" class="c-bt perigo" data-c="encerrar">Encerrar e salvar</button></div></div>`; }
    h += `<p class="c-rot">Rotas de hoje</p>` + (deHoje.length ? `<ul class="c-trj">${deHoje.map(linhaTrj).join('')}</ul>` : `<p class="c-vazio mini">Nenhuma rota gravada hoje.</p>`);
    h += `<div class="c-menu">${GRV.lista.length ? `<button type="button" data-c="rotas"><div><b>Todas as rotas</b><small>${GRV.lista.length} gravadas · ver no mapa, baixar, excluir</small></div></button>` : ''}
        <button type="button" data-c="trj-imp"><div><b>Importar GPX</b><small>De um app de GPS que grava com a tela apagada (ex.: GPSLogger)</small></div></button></div>
      <details class="c-gm-leg r-como"><summary>Como funciona e limites</summary><p>Um ponto é gravado a cada 12 m andados. Os km e o tempo não contam as pausas.</p>
        <p><b>O GPS só grava com o app na tela.</b> Se a tela apagar ou você abrir o Google Maps, ao voltar o trecho que faltou é traçado pela estrada e fica tracejado no mapa.</p>
        <p>Use o celular no suporte do carro, carregando. Para o caminho exato com a tela apagada, grave num app de GPS e importe o GPX aqui.</p></details>`;
    return h;
  }
  function telaEtapas(){
    const T = totaisGerais();
    let h = cab('Etapas', `${state.etapas.length} etapas · ${fmtKm(T.km)} km · ${T.d} dias de campo`);
    if (!state.etapas.length) return h + vazio('Nenhuma etapa montada ainda.');
    h += `<div class="c-etapas">${state.etapas.map(e => { const p = P[e.id], vis = e.stops.filter(s => s.feito).length;
      return `<button type="button" class="c-etapa" data-c="etapa-ver" data-id="${e.id}" style="--c:${e.cor}"><b>${esc(e.nome)}</b><span>${p ? periodo(p) || 'sem data definida' : ''}</span>
        <div class="c-num"><div><b>${e.stops.length}</b>estações</div><div><b>${p ? p.days.length : 0}</b>dias</div><div><b>${p ? fmtKm(p.tot.km) : 0}</b>km</div><div><b>${vis}</b>visitadas</div></div>
        <i class="c-barra"><i style="width:${e.stops.length ? Math.round(vis / e.stops.length * 100) : 0}%"></i></i></button>`; }).join('')}</div>
      <button type="button" class="c-bt largo" data-c="plano">${svgI('roteiro')}<span>Planejamento completo (editar etapas)</span></button>`;
    return h;
  }
  function telaEtapa(id){
    const e = etapaPorId(id); if (!e) return telaEtapas();
    const p = P[e.id];
    let h = cab(esc(e.nome), p ? `${e.stops.length} estações · ${p.days.length} dias · ${fmtKm(p.tot.km)} km · ${fmtHc(p.tot.h)} ao volante` : '');
    h += `<div class="c-linha"><label class="c-campo">Início<input type="date" data-c="inicio" data-id="${e.id}" value="${e.inicio || ''}"></label><button type="button" class="c-bt" data-c="otimizar" data-id="${e.id}">Otimizar ordem</button><button type="button" class="c-bt" data-c="hoje-etapa" data-id="${e.id}">Ir a campo</button></div>`;
    if (!p) return h;
    h += p.days.map((D, d) => { const ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
      return `<details class="c-dd"${d === diaCampo(e, p) ? ' open' : ''}><summary><b>Dia ${d + 1}</b><span>${D.data ? esc(fmtDS(D.data)) + ' · ' : ''}${ks.length} estações · ${fmtKm(D.km)} km · ${fmtHora(D.saida)}–${fmtHora(D.chegada)}</span></summary>
        <ol class="c-lista">${ks.map(k => { const s = e.stops[k], est = EST[s.id], inf = p.info[k] || {};
          return `<li class="${s.feito ? 'feito' : ''}"><button type="button" class="c-chk" data-c="visita" data-id="${s.id}" aria-pressed="${!!s.feito}" aria-label="Visitada">${svgI('ok')}</button><button type="button" class="c-it" data-c="estacao" data-id="${s.id}"><b>${k + 1}. ${esc(est.nome)}</b><small>${inf.cheg != null ? fmtHora(inf.cheg) + ' · ' : ''}${esc(estMun(est))}</small></button></li>`; }).join('')}</ol>
        <p class="c-pern">${D.to && D.to !== BH ? `Pernoite em ${esc(munNome(D.to))}` : 'Retorno a Belo Horizonte'}</p><div class="c-dd-gm">${blocoGM(e, D, `Dia ${d + 1} no Google Maps`)}</div></details>`; }).join('');
    return h;
  }
  function telaMais(){
    const s = NUV.status(), [cls, txt] = rotuloNuvem(s), meta = metaDe(PJ_ID);
    const it = (c, ico, t, sub, extra = '') => `<button type="button" data-c="${c}">${svgI(ico)}<div><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>${extra}<svg class="ic-ui seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>`;
    const nT = GRV.lista.length, nF = todasFotos().length, T = totaisGerais();
    return cab('Mais', '') +
      `${EM_NUVEM ? `<div class="c-conta"><span class="c-av">${esc((s.nome || s.email || '?').trim().charAt(0).toUpperCase())}</span><div><b>${esc(s.nome || s.email)}</b><small>${esc(s.email)}</small></div><span class="c-nv ${cls}" title="${esc(txt)}"><i></i>${cls === 'ok' ? 'Salvo' : cls === 'off' ? 'Sem internet' : cls === 'erro' ? 'Erro' : 'Enviando'}</span></div>` : ''}
      <p class="c-rot">Registros de campo</p><div class="c-menu">
        ${it('fotos', 'foto', 'Fotos', nF ? `${nF} fotos com GPS` : 'Nenhuma ainda')}
        ${it('gastos', 'moeda', 'Gastos e hospedagens', `Realizado ${fmtR(T.gasto)} de ${fmtR(T.prev)} previsto`)}
      </div>
      <p class="c-rot">Projeto</p><div class="c-menu">
        ${it('projetos', 'pasta', 'Projetos', esc(meta ? meta.nome : ''))}
        ${it('relatorios', 'rel', 'Relatórios e arquivos', 'Cronograma, PDF, planilhas, KML, GPX')}
        ${it('offline', 'offline', 'Preparar para usar sem internet', 'Antes de ir a campo')}
        ${it('regua', 'alvo', 'Medir distância no mapa', 'Em linha reta ou pela estrada')}
        ${it('plano', 'roteiro', 'Planejamento completo', 'Editar etapas, ordem, premissas e hospedagens')}
      </div>
      ${EM_NUVEM ? `<p class="c-rot">Conta</p><div class="c-menu">${s.papel === 'admin' ? it('equipe', 'equipe', 'Equipe e acesso', 'Liberar, bloquear ou remover pessoas', '<i class="c-badge" id="cPed" hidden></i>') : ''}
        ${it('sinc', 'nuvem', 'Sincronizar agora', esc(txt))}${it('sair', 'sair', 'Sair da conta', 'Apaga os dados deste aparelho')}</div>` : ''}
      <p class="c-ver">${esc(document.getElementById('versao').textContent)}</p>`;
  }
  function telaRotas(){
    const tot = GRV.lista.reduce((a, t) => ({km:a.km + t.km, seg:a.seg + t.seg}), {km:0, seg:0});
    return cab('Rotas percorridas', GRV.lista.length ? `${num(tot.km, 1)} km · ${fmtDur(tot.seg)} gravando` : '') +
      `<label class="c-tg"><input type="checkbox" data-c="mostrar" ${GRV.mostrar ? 'checked' : ''}><span>Mostrar no mapa</span></label>` +
      (GRV.lista.length ? `<ul class="c-trj">${GRV.lista.map(linhaTrj).join('')}</ul>` : vazio('Nenhuma rota ainda. Na aba <b>Rota</b>, toque em <b>Iniciar gravação</b> ao sair.')) +
      `<div class="c-linha"><button type="button" class="c-bt" data-c="trj-imp">${svgI('baixar')}<span>Importar GPX</span></button>${GRV.lista.length ? `<button type="button" class="c-bt" data-c="trj-todas">${svgI('baixar')}<span>Baixar todas</span></button>` : ''}</div>
      <p class="c-dica">Grava só com o app aberto na tela. Trechos sem GPS (tela apagada, Google Maps aberto) são traçados pela estrada e ficam tracejados. Para gravar com a tela apagada, use um app de GPS em segundo plano (ex.: GPSLogger) e importe o GPX.</p>`;
  }
  function telaFotos(){
    const fotos = todasFotos().sort((a, b) => (b.f.data || '').localeCompare(a.f.data || ''));
    return cab('Fotos', fotos.length ? `${fotos.length} fotos` : '') + (fotos.length ? `<div class="c-galeria">${fotos.map(x => `<button type="button" data-ver-foto="${x.s.id}|${x.f.id}"><img data-foto="${x.f.id}" alt=""><span>${esc(EST[x.s.id].nome)}</span></button>`).join('')}</div>
      <button type="button" class="c-bt largo" data-c="zip">${svgI('baixar')}<span>Baixar todas (ZIP com GPS)</span></button>` : vazio('As fotos tiradas nas visitas aparecem aqui.'));
  }
  function telaGastos(){
    const T = totaisGerais(), lst = [...state.apoios].sort((a, b) => (b._t || 0) - (a._t || 0));
    return cab('Gastos e hospedagens', `Realizado ${fmtR(T.gasto)} · previsto ${fmtR(T.prev)}`) +
      `<button type="button" class="c-bt largo pri" data-c="gasto">${svgI('moeda')}<span>Registrar gasto ou abastecimento</span></button>` +
      (lst.length ? `<ul class="c-trj">${lst.map(a => `<li><button type="button" class="c-it" data-c="apoio" data-id="${a.uid}"><b>${esc(a.nome)}</b><small>${TIPOS[a.tipo].nome}${a.mun ? ` · ${esc(MUN[a.mun].n)}` : ''}${gastoTotal(a) ? ` · gasto ${fmtR(gastoTotal(a))}` : a.valor ? ` · previsto ${fmtR(previsto(a))}` : ''}</small></button><a class="c-red" href="${gmIr([a.lat, a.lon])}" target="_blank" rel="noopener" aria-label="Ir com o Google Maps">${icGM}</a></li>`).join('')}</ul>` : vazio('Nada registrado ainda.')) +
      `<button type="button" class="c-bt largo" data-c="rel-gastos">${svgI('rel')}<span>Relatório de gastos</span></button>`;
  }
  function telaRelatorios(){
    const it = (a, t, s) => `<button type="button" data-acao="${a}"><div><b>${t}</b>${s ? `<small>${s}</small>` : ''}</div></button>`;
    return cab('Relatórios e arquivos', '') + `<div class="c-menu">
      ${it('crono', 'Relatório completo', 'Cronograma, visitas, fotos, gastos e rotas. Imprimir ou PDF.')}${it('gastos', 'Relatório de gastos', '')}${it('tabela', 'Tabela das estações', '')}</div>
      <p class="c-rot">Baixar</p><div class="c-menu">${it('csv', 'Planilha do roteiro (CSV)', '')}${it('csvApoio', 'Hospedagens e gastos (CSV)', '')}${it('kml', 'Estações para o Google Earth (KML)', '')}${it('fotos-zip', 'Fotos (ZIP)', '')}<button type="button" data-c="trj-todas"><div><b>Rotas percorridas (GPX)</b></div></button><button type="button" data-c="copia"><div><b>Cópia de segurança (arquivo HTML)</b><small>Abre no computador mesmo sem o app</small></div></button></div>
      <p class="c-rot">Trazer dados</p><div class="c-menu">${it('abrir', 'Importar de arquivo salvo antes', 'HTML ou .json da versão antiga')}</div>`;
  }
  function telaGasto(){
    const op = (t, ico, n) => `<button type="button" class="c-tipo" data-c="gasto-tipo" data-t="${t}">${svgI(ico)}<span>${n}</span></button>`;
    return cab('Registrar', GPS.pos ? 'Na posição do GPS' : 'No centro do mapa (ligue o GPS para usar a sua posição)') +
      `<div class="c-tipos">${op('comb', 'posto', 'Abastecimento')}${op('alim', 'moeda', 'Refeição')}${op('hosp', 'cama', 'Hospedagem')}${op('outro', 'moeda', 'Outro gasto')}</div>`;
  }
  function telaEquipe(){ return cab('Equipe e acesso', '') + '<div id="cEq" class="c-eq"></div>'; }
  function telaCamadas(){
    const f = state.fundo || 'ruas', op = (k, n, d) => `<button type="button" data-c="fundo" data-id="${k}" aria-pressed="${f === k}"><b>${n}</b><small>${d}</small></button>`;
    return cab('Mapa', '') + `<div class="c-fundos">${op('ruas', 'Estradas', 'Rodovias e cidades')}${op('ter', 'Terreno', 'Relevo e curvas de nível')}${op('nenhum', 'Sem internet', 'Limites e rotas guardadas')}</div>
      <label class="c-tg"><input type="checkbox" data-c="mostrar" ${GRV.mostrar ? 'checked' : ''}><span>Rotas percorridas</span></label>`;
  }

  function desenhar(){
    const v = atual(); let h = '';
    if (v.v === 'mapa') h = telaMapa(); else if (v.v === 'hoje') h = telaHoje(); else if (v.v === 'rota') h = telaRota(); else if (v.v === 'etapas') h = telaEtapas(); else if (v.v === 'mais') h = telaMais();
    else if (v.v === 'estacao') h = telaVisita(v.id); else if (v.v === 'etapa') h = telaEtapa(v.id); else if (v.v === 'rotas') h = telaRotas();
    else if (v.v === 'fotos') h = telaFotos(); else if (v.v === 'gastos') h = telaGastos(); else if (v.v === 'relatorios') h = telaRelatorios();
    else if (v.v === 'gasto') h = telaGasto(); else if (v.v === 'equipe') h = telaEquipe(); else if (v.v === 'camadas') h = telaCamadas();
    salvarNota();
    corpo.innerHTML = h;
    hidratar(corpo);
    if (v.v === 'equipe') NUV.abrirEquipe(document.getElementById('cEq'));
    if (v.v === 'mais' && EM_NUVEM && NUV.contarPedidos) NUV.contarPedidos().then(n => { const b = document.getElementById('cPed'); if (b){ b.hidden = !n; b.textContent = n; } });
    if (alt === 'baixa') altura('baixa', false);
  }
  /* anotação da visita: salva sozinha ao sair do campo (e antes de trocar de tela) */
  function salvarNota(){
    const t = document.getElementById('cNota'); if (!t || !corpo.contains(t)) return;
    buildLOC(); const w = LOC[t.dataset.id]; if (!w) return; const v = t.value.trim();
    if (v !== (w.s.relato || '')){ snapshot(); w.s.relato = v; save(); const st = document.getElementById('cNotaSt'); if (st) st.textContent = 'Salvo'; }
  }
  corpo.addEventListener('focusout', ev => { if (ev.target.id === 'cNota'){ salvarNota(); } });
  corpo.addEventListener('input', ev => { if (ev.target.id === 'cNota'){ const st = document.getElementById('cNotaSt'); if (st) st.textContent = 'Editando… (salva ao sair do campo)'; } });
  const digitando = () => document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName) && corpo.contains(document.activeElement);
  /* ---------- ações ---------- */
  corpo.addEventListener('change', ev => {
    const t = ev.target;
    if (t.dataset.c === 'mostrar'){ GRV.mostrar = t.checked; try { localStorage.setItem('rc-mostrar-trajetos', t.checked ? '1' : '0'); } catch(e){} desenharTrajetos(); }
    if (t.dataset.c === 'inicio'){ const e = etapaPorId(t.dataset.id); if (e){ snapshot(); e.inicio = t.value; changed(); } }
  });
  corpo.addEventListener('click', ev => {
    const vf = ev.target.closest('[data-ver-foto]'); if (vf){ const [sid, fid] = vf.dataset.verFoto.split('|'); verFoto(sid, fid); return; }
    const ac = ev.target.closest('[data-acao]'); if (ac){ menuHandler({target:ac}); return; }
    const b = ev.target.closest('[data-c]'); if (!b) return;
    const c = b.dataset.c, id = b.dataset.id;
    if (c === 'voltar') voltar();
    else if (c === 'etapa'){ irPara(id); desenhar(); }
    else if (c === 'etapa-hoje'){ campoEtapaId = id; diaHoje = null; desenhar(); }
    else if (c === 'dia'){ diaHoje = +b.dataset.d; focoHoje = null; desenhar(); const e = etapaCampo(); if (e && state.aba !== e.id){ state.aba = e.id; render(); } if (e) try { fitDay(diaHoje); } catch(err){} }
    else if (c === 'estacao'){ if (atual().v === 'estacao') pilha.pop(); abrir({v:'estacao', id}, 'alta'); mostrarNoMapa(id); }
    else if (c === 'cheguei'){ marcarVisita(id, true); focoHoje = id; if (atual().v !== 'estacao') abrir({v:'estacao', id}, 'alta'); else desenhar(); toast('Visita registrada. Marque a situação, tire fotos e anote.', true); }
    else if (c === 'desmarcar'){ if (confirm('Desmarcar a visita desta estação?')) { marcarVisita(id, false); desenhar(); } }
    else if (c === 'visita'){ const s = onde(id).s; marcarVisita(id, !(s && s.feito)); desenhar(); }
    else if (c === 'proxima'){ focoHoje = null; desenhar(); corpo.scrollTop = 0; }
    else if (c === 'sit'){ buildLOC(); const w = LOC[id]; if (w){ snapshot(); w.s.sit = w.s.sit === b.dataset.v ? '' : b.dataset.v; save(); desenhar(); } }
    else if (c === 'foto') iniciarFoto(id, true);
    else if (c === 'galeria') iniciarFoto(id, false);
    else if (c === 'copiar') copiar(`${ll(id)[0].toFixed(6)}, ${ll(id)[1].toFixed(6)}`);
    else if (c === 'apoio-novo'){ const m = b.dataset.mun, e = etapaCampo(); abrirFormApoio({tipo:b.dataset.t, mun:m, lat:MUN[m].lat, lon:MUN[m].lon, etapa: e ? e.id : ''}); }
    else if (c === 'ver'){ mostrarNoMapa(id); altura('baixa'); }
    else if (c === 'gravar'){ iniciarGravacao(); desenhar(); }
    else if (c === 'pausar'){ pausarGravacao(); desenhar(); }
    else if (c === 'continuar'){ continuarGravacao(); desenhar(); }
    else if (c === 'encerrar'){ if (confirm('Encerrar a gravação desta rota?')) encerrarGravacao(); }
    else if (c === 'gps-tg') GPS.on ? gpsDesligar() : gpsLigar();
    else if (c === 'gasto') abrir({v:'gasto'});
    else if (c === 'gasto-tipo'){ voltar(); registrarApoioAqui(b.dataset.t); }
    else if (c === 'etapa-ver'){ abrir({v:'etapa', id}, 'alta'); irPara(id); }
    else if (c === 'otimizar'){ const e = etapaPorId(id); if (e){ snapshot(); otimizarEtapa(e); e.ordem = 'auto'; changed(); toast('Ordem otimizada.', true); } }
    else if (c === 'hoje-etapa'){ campoEtapaId = id; diaHoje = null; irTab('hoje'); }
    else if (c === 'plano') abrirPlanejamento();
    else if (['rotas', 'fotos', 'gastos', 'relatorios', 'equipe'].includes(c)) abrir({v:c}, 'alta');
    else if (c === 'projetos') abrirProjetos();
    else if (c === 'offline') prepararOffline();
    else if (c === 'regua'){ irTab('mapa'); regua(true); }
    else if (c === 'sinc'){ if (EM_NUVEM) NUV.atualizarAgora(); toast('Sincronizando…'); }
    else if (c === 'sair') NUV.sair();
    else if (c === 'trj-ver'){ const t = GRV.lista.find(x => x.id === id); if (t){ if (!GRV.mostrar){ GRV.mostrar = true; desenharTrajetos(); } altura('baixa'); map.fitBounds(L.latLngBounds(t.pts.map(p => [p[0], p[1]])), {paddingTopLeft:[24, 70], paddingBottomRight:[24, __alturaFolha() + 20]}); } }
    else if (c === 'trj-gpx') baixarTrajetos('gpx', id);
    else if (c === 'trj-ex') excluirTrajeto(id);
    else if (c === 'trj-imp') entradaGPX.click();
    else if (c === 'trj-todas') baixarTrajetos('gpx');
    else if (c === 'zip') baixarFotosZip();
    else if (c === 'apoio'){ const a = state.apoios.find(x => x.uid === id); if (a) abrirFormApoio(a); }
    else if (c === 'rel-gastos') abrirGastos();
    else if (c === 'copia') salvarNoArquivo(true);
    else if (c === 'fundo'){ usarFundo(id, false, true); desenhar(); }
  });
  function mostrarNoMapa(id){ const p = ll(id); map.setView(p, Math.max(map.getZoom(), 13), {animate:false}); const h = __alturaFolha(); map.panBy([0, (h - 60) / 2], {animate:false}); }
  /* botões flutuantes e topo */
  raiz.querySelector('#cFlut').addEventListener('click', ev => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c === 'gps'){ if (!GPS.on) gpsLigar(); else if (GPS.pos){ GPS.seguir = true; map.setView([GPS.pos.coords.latitude, GPS.pos.coords.longitude], Math.max(map.getZoom(), 15)); } else gpsDesligar(); }
    if (b.dataset.c === 'camadas'){ if (aba !== 'mapa') irTab('mapa'); abrir({v:'camadas'}, 'media'); }
    if (b.dataset.c === 'tudo'){ fitAtual(); }
  });
  $('#cProj').onclick = () => abrirProjetos();
  $('#cSync').onclick = () => { irTab('mais'); if (EM_NUVEM) NUV.atualizarAgora(); };
  /* ---------- toque nas estações do mapa abre a ficha na folha ---------- */
  popupEst = (id) => { if (REG.on) return; if (pilha.length && atual().v === 'estacao') pilha.pop(); abrir({v:'estacao', id}, 'media'); };
  /* ---------- atualizações ---------- */
  function topo(){
    const m = metaDe(PJ_ID); $('#cProj span').textContent = m ? m.nome : 'Projeto';
    const [cls] = rotuloNuvem(NUV.status()); $('#cSync').className = 'c-sync ' + cls;
    navC.querySelector('.c-dot').hidden = !(cls === 'erro');
    navC.querySelector('.c-rec').hidden = !GRV.t; navC.querySelector('.c-rec').classList.toggle('pausa', !!GRV.pausa);
    $('#cFlut [data-c=gps]').classList.toggle('on', GPS.on);
    const r = $('#cRec'); r.hidden = !GRV.t;
    if (GRV.t) r.innerHTML = `<i class="rec${GRV.pausa ? ' pausa' : ''}"></i><span data-grv-info>${infoGravacao()}</span>`;
  }
  NUV.on(() => { topo(); if (atual().v === 'mais' && !digitando()) desenhar(); });
  const _render2 = render;
  render = function(){ _render2(); try { ajustaLimites(); } catch(e){} topo(); if (!digitando()) desenhar(); };
  const _atuG = atualizarGravacaoUI;
  atualizarGravacaoUI = function(so){ _atuG(so); topo();
    if (atual().v === 'rota'){ if (!digitando()) desenhar(); else { const n = numerosGrav(), set = (k, v) => { const el = corpo.querySelector(`[data-r=${k}]`); if (el) el.textContent = v; };
      set('km', num(n.km, n.km < 100 ? 1 : 0)); set('t', fmtDur(n.seg)); set('v', GPS.pos && GPS.pos.coords.speed > .5 ? Math.round(GPS.pos.coords.speed * 3.6) : 0); } } };
  setInterval(() => { if (GRV.t && atual().v === 'rota') atualizarGravacaoUI(true); }, 5000);
  const _gL = gpsLigar, _gD = gpsDesligar;
  gpsLigar = () => { _gL(); topo(); if (atual().v === 'hoje' && !digitando()) desenhar(); };
  gpsDesligar = () => { _gD(); topo(); if (atual().v === 'hoje' && !digitando()) desenhar(); };
  setInterval(() => { if (GPS.on && ['hoje', 'estacao'].includes(atual().v) && !digitando()) desenhar(); }, 30000);
  window.addEventListener('resize', () => altura(alt, false));
  /* setSheet do painel antigo não mexe mais na tela */
  setSheet = () => {};
  /* ---------- planejamento completo: o painel do computador, em tela cheia ---------- */
  const fechaPlan = document.createElement('button'); fechaPlan.type = 'button'; fechaPlan.id = 'cPlanFechar'; fechaPlan.innerHTML = '‹ Voltar ao app'; fechaPlan.onclick = () => fecharPlanejamento();
  painelEl.prepend(fechaPlan);
  function abrirPlanejamento(){ document.documentElement.classList.add('plan-aberto'); _render2(); painelEl.scrollTop = 0; }
  function fecharPlanejamento(){ document.documentElement.classList.remove('plan-aberto'); render(); fitAtual(); }
  /* ---------- começo ---------- */
  irTab('mapa');
  topo();
  setTimeout(() => { altura('baixa', false); fitAtual(); }, 50);
}
