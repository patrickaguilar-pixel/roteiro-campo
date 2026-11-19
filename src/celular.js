
/* =====================================================================================================
   CELULAR (v3): o mapa e o dia são uma tela só.
   - Hoje: o mapa mostra só o dia escolhido, com as letras do Google Maps; embaixo, a próxima parada com
     Navegar e Cheguei; puxando a folha para cima aparece o dia inteiro em linha do tempo.
   - Gravar rota: botão próprio sobre o mapa, com painel separado.
   - Registros: visitas, fotos e rotas gravadas.  - Mais: projetos, etapas, relatórios, conta.
   ===================================================================================================== */
if (CELULAR){
  document.documentElement.classList.add('celular');
  /* ---------- mapa leve ---------- */
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
  try { usarFundo(FUNDOS[state.fundo] && state.fundo !== 'osm' ? state.fundo : (temGoogle() ? 'gm' : 'ruas')); } catch(e){}

  /* ---------- ícones ---------- */
  const SV = (d, w = 2) => `<svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    hoje: SV('<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>'),
    reg: SV('<path d="M9 4h6l1 2h3v14H5V6h3z"/><path d="m9 13 2 2 4-4"/>'),
    mais: SV('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', 2.4),
    seta: SV('<path d="m9 6 6 6-6 6"/>', 2.4), volta: SV('<path d="m15 6-6 6 6 6"/>', 2.4), baixo: SV('<path d="m6 9 6 6 6-6"/>', 2.4),
    camadas: SV('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
    gm: '<svg class="ic-gm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="#EA4335"/><path d="M12 2c-2.2 0-4.1 1-5.4 2.6L12 9l5.4-4.4C16.1 3 14.2 2 12 2z" fill="#4285F4" opacity=".9"/><path d="M5 9c0 1.3.4 2.7 1 4L12 9 6.6 4.6C5.6 5.8 5 7.3 5 9z" fill="#FBBC04"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>'
  };

  /* ---------- estrutura ---------- */
  IC.lupa = SV('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', 2.2);
  IC.lista = SV('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>');
  IC.terra = SV('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>');
  const raiz = document.createElement('div'); raiz.id = 'cel';
  raiz.innerHTML = `
    <header id="cTopo"><button type="button" id="cBusca" aria-label="Buscar estação">${IC.lupa}<span>Buscar estação, cidade ou código</span></button>
      <button type="button" id="cSync" class="c-sync" aria-label="Situação da nuvem"><i></i></button></header>
    <div id="cFlut"><button type="button" data-c="gps" aria-label="Minha localização">${svgI('gps')}</button><button type="button" data-c="camadas" aria-label="Fundo do mapa">${IC.camadas}</button></div>
    <button type="button" id="cGrav" aria-label="Gravar rota"></button>
    <section id="cFolha"><div class="cf-alca" aria-hidden="true"><span></span></div><div id="cCorpo"></div></section>
    <nav id="cNav" aria-label="Seções">
      <button type="button" data-t="hoje">${IC.hoje}<span>Campo</span></button>
      <button type="button" data-t="estacoes">${IC.lista}<span>Estações</span></button>
      <button type="button" data-t="registros">${IC.reg}<span>Registros</span></button>
      <button type="button" data-t="mais">${IC.mais}<span>Mais</span><i class="c-dot" hidden></i></button>
    </nav>`;
  document.body.appendChild(raiz);
  const folha = raiz.querySelector('#cFolha'), corpo = raiz.querySelector('#cCorpo'), navC = raiz.querySelector('#cNav');
  const $ = s => raiz.querySelector(s);
  const navAlt = () => navC.getBoundingClientRect().height;

  /* ---------- folha: baixa (cabeçalho + 2 paradas), média e alta ---------- */
  let alt = 'baixa';
  const ALT = {
    baixa: () => { const pk = corpo.querySelector('[data-peek]'); return pk ? Math.min(innerHeight * .5, pk.offsetTop + pk.offsetHeight + 28) : Math.min(corpo.scrollHeight + 24, 220); },
    media: () => Math.round(innerHeight * .52), alta: () => innerHeight - 70 - navAlt()
  };
  function altura(a, anima = true){
    alt = a || alt; folha.dataset.alt = alt; document.documentElement.dataset.folha = alt;
    folha.style.transition = anima ? '' : 'none';
    const h = Math.max(80, ALT[alt]()); folha.style.height = h + 'px';
    document.documentElement.style.setProperty('--folha', h + 'px');
  }
  window.__alturaFolha = () => (parseFloat(folha.style.height) || folha.getBoundingClientRect().height) + navAlt();
  (() => {
    let y0 = null, h0 = 0, t0 = 0, moveu = false;
    const ini = ev => { y0 = ev.touches[0].clientY; h0 = folha.getBoundingClientRect().height; t0 = performance.now(); moveu = false; folha.style.transition = 'none'; };
    const mov = ev => { if (y0 === null) return; const dy = ev.touches[0].clientY - y0; if (Math.abs(dy) > 6) moveu = true; if (!moveu) return; ev.preventDefault();
      folha.style.height = Math.min(innerHeight - 70 - navAlt(), Math.max(80, h0 - dy)) + 'px'; };
    const fim = ev => { if (y0 === null) return; const dy = ev.changedTouches[0].clientY - y0, v = dy / Math.max(1, performance.now() - t0); y0 = null; folha.style.transition = '';
      if (!moveu) return;
      const h = folha.getBoundingClientRect().height, ordem = ['baixa', 'media', 'alta'];
      let a = ordem.map(k => [k, Math.abs(ALT[k]() - h)]).sort((x, y) => x[1] - y[1])[0][0];
      if (Math.abs(v) > .5) a = ordem[Math.max(0, Math.min(2, ordem.indexOf(alt) + (v > 0 ? -1 : 1)))];
      altura(a); };
    folha.addEventListener('touchstart', ev => { if (ev.target.closest('.cf-alca, .cf-cab, .k-cab') && !ev.target.closest('button, a, input')) ini(ev); }, {passive:true});
    folha.addEventListener('touchmove', mov, {passive:false});
    folha.addEventListener('touchend', fim);
    folha.querySelector('.cf-alca').addEventListener('click', () => altura(alt === 'baixa' ? 'media' : alt === 'media' ? 'alta' : 'baixa'));
    let py = null;
    corpo.addEventListener('touchstart', ev => { py = corpo.scrollTop <= 0 ? ev.touches[0].clientY : null; }, {passive:true});
    corpo.addEventListener('touchmove', ev => { if (py !== null && y0 === null && ev.touches[0].clientY - py > 80){ py = null; altura(alt === 'alta' ? 'media' : 'baixa'); } }, {passive:true});
    corpo.addEventListener('scroll', () => { if (alt === 'baixa' && corpo.scrollTop > 30) altura('media'); }, {passive:true});
  })();

  /* ---------- navegação ---------- */
  let aba = 'hoje', pilha = [], regSeg = 'visitas', modoTudo = false;
  let busca = '', filtro = 'pend', limite = 60;
  const atual = () => pilha.length ? pilha[pilha.length - 1] : {v: aba};
  function marcaNav(){ navC.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-current', b.dataset.t === aba ? 'page' : 'false')); }
  function irTab(t, a){
    aba = t; pilha = []; marcaNav(); limite = 60;
    if (t === 'hoje' && !modoTudo) focarDia(false);
    desenhar(); altura(a || (t === 'hoje' ? 'media' : 'alta')); corpo.scrollTop = 0;
    if (t === 'hoje' && !modoTudo){ const x = diaDoHoje(); if (x) requestAnimationFrame(() => enquadrarDia(x)); }
  }
  function abrir(v, a){ pilha.push(v); desenhar(); altura(a || (alt === 'baixa' ? 'media' : alt)); corpo.scrollTop = 0; }
  function voltar(){
    if (pilha.length){ pilha.pop(); desenhar(); altura(pilha.length || aba !== 'hoje' ? alt : 'media'); corpo.scrollTop = 0; return true; }
    if (aba !== 'hoje'){ irTab('hoje'); return true; }
    if (alt === 'alta'){ altura('media'); return true; }
    return false;
  }
  navC.addEventListener('click', ev => { const b = ev.target.closest('[data-t]'); if (!b) return;
    if (b.dataset.t === aba && !pilha.length){ altura(alt === 'alta' ? 'baixa' : 'alta'); return; } irTab(b.dataset.t); });
  history.replaceState({c:0}, ''); history.pushState({c:1}, '');
  window.addEventListener('popstate', () => {
    const dl = document.querySelector('dialog[open]');
    if (dl){ dl.close(); history.pushState({c:1}, ''); return; }
    if (document.documentElement.classList.contains('plan-aberto')){ fecharPlanejamento(); history.pushState({c:1}, ''); return; }
    if (map._popup && map.hasLayer(map._popup)){ map.closePopup(); history.pushState({c:1}, ''); return; }
    if (REG.on){ regua(false); history.pushState({c:1}, ''); return; }
    if (voltar()) history.pushState({c:1}, '');
  });

  /* ---------- auxiliares ---------- */
  const onde = id => { buildLOC(); const w = LOC[id]; if (!w || !w.e) return {s: w && w.s, e:null}; const p = P[w.e.id]; return {s:w.s, e:w.e, k:w.k, p, inf: p && p.info[w.k]}; };
  const posGPS = () => GPS.pos && [GPS.pos.coords.latitude, GPS.pos.coords.longitude];
  const linkNav = id => `https://www.google.com/maps/dir/?api=1&destination=${ll(id)[0]},${ll(id)[1]}&travelmode=driving`;
  const linkEarth = id => `https://earth.google.com/web/@${ll(id)[0]},${ll(id)[1]},700a,1500d,35y,0h,0t,0r`;
  const cab = (titulo, sub, voltarBt = pilha.length > 0) => `<div class="cf-cab">${voltarBt ? `<button type="button" class="cf-volta" data-c="voltar" aria-label="Voltar">${IC.volta}</button>` : ''}<div><h2>${titulo}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
  const vazio = t => `<p class="c-vazio">${t}</p>`;
  const SIT = [['ok', 'Funcionando'], ['manut', 'Precisa de manutenção'], ['acesso', 'Sem acesso']];
  const fmtMin = h => { const m = Math.round(h * 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? pad2(m % 60) : ''}`; };
  const quando = s => s.feito ? s.feito.replace(', ', ' às ') : '';
  let diaHoje = null, focoCel = null;

  /* Linha de estação usada em todas as listas: letra/número, nome, cidade, distância, e os dois botões de campo. */
  function linhaEst(id, o = {}){
    const est = EST[id]; if (!est) return '';
    buildLOC(); const w = LOC[id], s = (w && w.s) || {}, q = posGPS(), dist = q ? havLL(q, ll(id)) : null;
    const info = [o.hora, esc(estMun(est)), dist !== null ? `<b class="e-km">${fmtDist(dist)}</b>` : '', o.sub].filter(Boolean).join(' · ');
    const tags = (s.feito ? `<span class="e-tag ok">Visitada${s.feito ? ' ' + esc(s.feito.split(',')[0]) : ''}</span>` : o.prox ? '<span class="e-tag prox">Próxima</span>' : '') +
      (s.sit ? `<span class="c-sit s-${s.sit}">${SITUACOES[s.sit]}</span>` : '') + ((s.fotos || []).length ? `<span class="e-tag">${s.fotos.length} foto${s.fotos.length > 1 ? 's' : ''}</span>` : '');
    return `<li class="e-li${s.feito ? ' feito' : ''}${o.prox ? ' prox' : ''}" style="--c:${o.cor || '#5E6B66'}">
      ${o.gm ? `<span class="e-pin${s.feito ? ' ok' : ''}" title="Letra no Google Maps"><span>${o.letra}</span></span>` : `<span class="e-le">${s.feito ? svgI('ok') : (o.letra != null ? o.letra : '')}</span>`}
      <button type="button" class="e-it" data-c="estacao" data-id="${id}"><b>${esc(est.nome)} ${tipoBadge(est)}</b><small>${info}</small>${tags ? `<span class="e-tags">${tags}</span>` : ''}</button>
      <a class="e-bt" href="${linkNav(id)}" target="_blank" rel="noopener" aria-label="Navegar até ${esc(est.nome)}">${IC.gm}</a>
      ${w && w.e ? `<button type="button" class="e-bt chk" data-c="${s.feito ? 'desmarcar' : 'cheguei'}" data-id="${id}" aria-pressed="${!!s.feito}" aria-label="${s.feito ? 'Desmarcar visita' : 'Cheguei: marcar visitada'}">${svgI('ok')}</button>` : ''}</li>`;
  }

  /* ---------- mapa: todas as estações continuam visíveis; as do dia ganham as letras do Google Maps e destaque ---------- */
  const _marcadorEst = marcadorEst;
  marcadorEst = (id, rotulo, cor, extra = '') => {
    if (focoCel && state.aba === focoCel.eid){
      const e = etapaPorId(focoCel.eid), w = LOC[id], p = e && P[e.id];
      if (w && w.e === e && p && p.info[w.k] && p.info[w.k].d === focoCel.d){
        const g = gmPlano(e, p.days[focoCel.d]).letra[w.k], m = _marcadorEst(id, g ? g.l : rotulo, cor, extra + ' hoje');
        /* alfinete igual ao do Google Maps, com a mesma letra */
        if (g){ m.setIcon(L.divIcon({className:'', iconSize:[34, 34], iconAnchor:[17, 41], html:`<div class="gpin${w.s.feito ? ' ok' : ''}"><span>${g.l}</span></div>`})); m.setZIndexOffset(3000); }
        return m;
      }
    }
    return _marcadorEst(id, rotulo, cor, extra);
  };
  function diaDoHoje(){ const e = etapaCampo(), p = e && P[e.id]; if (!e || !p || !p.days.length) return null; return {e, p, d: diaHoje !== null && diaHoje < p.days.length ? diaHoje : diaCampo(e, p)}; }
  function focarDia(enquadrar = true){
    const x = diaDoHoje(); if (!x){ focoCel = null; return; }
    focoCel = {eid:x.e.id, d:x.d}; state.aba = x.e.id; focusDay = x.d; _render(); topo();
    if (enquadrar) setTimeout(() => enquadrarDia(x), 40);
  }
  function enquadrarDia(x){ try { map.fitBounds(L.latLngBounds(x.p.days[x.d].nodes.map(ll)), {paddingTopLeft:[36, 90], paddingBottomRight:[36, __alturaFolha() + 30], maxZoom:13, animate:false}); } catch(err){} }
  function verTudo(){ modoTudo = true; focoCel = null; focusDay = null; state.aba = 'geral'; _render(); topo(); setTimeout(fitAtual, 30); }
  function mudarDia(d){ diaHoje = d; modoTudo = false; focarDia(false); desenhar(); const x = diaDoHoje(); if (x) requestAnimationFrame(() => enquadrarDia(x)); }

  /* ================= CAMPO (o dia em lista) ================= */
  function telaHoje(){
    if (modoTudo) return telaTudo();
    const x = diaDoHoje();
    if (!x) return cab('Campo', '') + vazio('Nenhuma etapa montada ainda. Monte as etapas no computador ou em Mais → Etapas.') + pertoDeVoce();
    const {e, p, d} = x, D = p.days[d];
    const ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
    const pend = ks.filter(k => !e.stops[k].feito), feitos = ks.length - pend.length, g = gmPlano(e, D);
    const proxK = pend.length ? pend[0] : null;
    const orig = D.from === BH ? 'Belo Horizonte' : munNome(D.from), dest = D.to === BH ? 'Belo Horizonte' : munNome(D.to), hosp = D.to !== BH ? hospDe(e, D.to) : null;
    let h = `<div class="k-cab" style="--c:${e.cor}">
        <button type="button" class="k-seta" data-c="dia" data-d="${d - 1}" ${d ? '' : 'disabled'} aria-label="Dia anterior">${IC.volta}</button>
        <button type="button" class="k-tit" data-c="dias"><small>${esc(e.nome)}</small><b>Dia ${d + 1}${D.data ? ' · ' + esc(fmtDS(D.data)) : ` de ${p.days.length}`}${IC.baixo}</b></button>
        <button type="button" class="k-seta" data-c="dia" data-d="${d + 1}" ${d < p.days.length - 1 ? '' : 'disabled'} aria-label="Próximo dia">${IC.seta}</button></div>
      <div class="k-prog" style="--c:${e.cor}"><i><i style="width:${ks.length ? Math.round(feitos / ks.length * 100) : 0}%"></i></i><span><b>${feitos}/${ks.length}</b> visitadas · ${fmtKm(D.km)} km · ${fmtHora(D.saida)}–${fmtHora(D.chegada)}</span></div>`;
    const lis = ks.map(k => { const inf = p.info[k] || {}, le = g.letra[k]; return linhaEst(e.stops[k].id, {letra: le ? le.l : k + 1, gm: !!le, hora: fmtHora(inf.cheg), cor: e.cor, prox: k === proxK}); });
    h += `<ul class="e-lista k-lista" data-peek>${lis.slice(0, 2).join('')}</ul>`;
    if (lis.length > 2) h += `<ul class="e-lista k-lista">${lis.slice(2).join('')}</ul>`;
    if (!ks.length) h += vazio('Dia sem estações.');
    h += `<p class="k-fim">${svgI('cama')}<span>${D.to === BH ? `Volta a Belo Horizonte · ${fmtHora(D.chegada)}` : `Pernoite em <b>${esc(dest)}</b>${hosp ? ` · ${esc(hosp.nome)}` : ''}`}</span>
      ${D.to !== BH && !hosp ? `<button type="button" class="tl-link" data-c="apoio-novo" data-t="hosp" data-mun="${D.to}">+ hospedagem</button>` : ''}</p>`;
    const leg = pt => `<ol class="gm-leg">${pt.legenda.map(({l, x}) => { const st = x.k !== undefined ? e.stops[x.k] : null;
        return `<li class="${st && st.feito ? 'ok' : ''}"><span class="e-pin${x.ini || x.fim ? ' ext' : ''}${st && st.feito ? ' ok' : ''}"><span>${l}</span></span><b>${esc(st ? EST[st.id].nome : x.rot)}</b><small>${x.ini ? 'saída' : x.fim ? 'chegada' : esc(estMun(EST[st.id]))}</small></li>`; }).join('')}</ol>`;
    if (pend.length) h += g.partes.map((pt, i) => `<div class="gm-card"><a class="h-gm" href="${pt.url}" target="_blank" rel="noopener">${IC.gm}<div><b>${g.continuar ? 'Continuar o dia no Google Maps' : 'Rota do dia no Google Maps'}${g.partes.length > 1 ? ` · parte ${i + 1} de ${g.partes.length}` : ''}</b>
        <small>${g.continuar ? `Da sua posição · faltam ${g.faltam}` : `Saindo de ${esc(orig)} · todas em ordem`}</small></div>${IC.seta}</a>
        <p class="gm-tit">O que é cada letra no Google Maps</p>${leg(pt)}</div>`).join('');
    else if (ks.length && d < p.days.length - 1) h += `<button type="button" class="c-bt largo pri" data-c="dia" data-d="${d + 1}">Dia concluído · ir para o dia ${d + 2} ${IC.seta}</button>`;
    h += `<div class="c-linha"><button type="button" class="c-bt" data-c="tudo">${IC.camadas}<span>Ver tudo</span></button></div>`;
    h += pertoDeVoce(new Set(ks.map(k => e.stops[k].id)));
    return h;
  }
  /* Pendentes mais próximas de você (de qualquer dia ou etapa): para encaixar uma visita fora do plano. */
  function pertoDeVoce(fora = new Set()){
    const q = posGPS(); if (!q) return `<button type="button" class="k-perto0" data-c="gps-ligar">${svgI('gps')}<span>Ligar o GPS para ver as estações perto de você</span></button>`;
    buildLOC();
    const lst = state.etapas.flatMap(e => e.stops.filter(s => !s.feito && !fora.has(s.id)).map(s => ({e, s, d: havLL(q, ll(s.id))}))).sort((a, b) => a.d - b.d).slice(0, 5);
    if (!lst.length) return '';
    return `<p class="c-rot">Perto de você · pendentes</p><ul class="e-lista">${lst.map(({e, s}) => { const w = LOC[s.id], inf = P[e.id] && P[e.id].info[w.k];
      return linhaEst(s.id, {letra: w.k + 1, cor: e.cor, sub: `${esc(e.nome)}${inf ? ` · dia ${inf.d + 1}` : ''}`}); }).join('')}</ul>`;
  }
  function telaTudo(){
    const T = totaisGerais();
    return `<div data-peek>${cab('Todas as etapas', `${T.n} estações · ${fmtKm(T.km)} km · ${T.d} dias`)}<button type="button" class="c-bt largo pri" data-c="dias">Escolher o dia de campo ${IC.seta}</button></div>
      <div class="c-etapas">${state.etapas.map(e => cartaoEtapa(e, 'etapa-hoje')).join('')}</div>`;
  }
  const cartaoEtapa = (e, acao) => { const p = P[e.id], vis = e.stops.filter(s => s.feito).length;
    return `<button type="button" class="c-etapa" data-c="${acao}" data-id="${e.id}" style="--c:${e.cor}"><b>${esc(e.nome)}</b><span>${p ? periodo(p) || 'sem data definida' : ''}</span>
      <div class="c-num"><div><b>${e.stops.length}</b>estações</div><div><b>${p ? p.days.length : 0}</b>dias</div><div><b>${p ? fmtKm(p.tot.km) : 0}</b>km</div><div><b>${vis}</b>visitadas</div></div>
      <i class="c-barra"><i style="width:${e.stops.length ? Math.round(vis / e.stops.length * 100) : 0}%"></i></i></button>`; };
  function telaDias(){
    const x = diaDoHoje();
    let h = cab('Escolher o dia', '') + `<button type="button" class="c-bt largo" data-c="tudo">${IC.camadas}<span>Ver todas as etapas no mapa</span></button>`;
    state.etapas.forEach(e => { const p = P[e.id]; if (!p) return;
      h += `<p class="c-rot" style="color:${e.cor}">${esc(e.nome)}${periodo(p) ? ` · ${periodo(p)}` : ''}</p><div class="d-grade">${p.days.map((D, d) => {
        let n = 0, f = 0; for (let k = D.i; k < D.j; k++){ n++; if (e.stops[k].feito) f++; }
        const sel = x && !modoTudo && x.e === e && x.d === d;
        return `<button type="button" class="d-dia${sel ? ' sel' : ''}${n && f === n ? ' ok' : ''}" data-c="dia-ir" data-id="${e.id}" data-d="${d}" style="--c:${e.cor}"><b>Dia ${d + 1}</b><span>${D.data ? esc(fmtD(D.data)) : `${n} est.`}</span><i>${f}/${n}</i></button>`; }).join('')}</div>`; });
    return h;
  }
  /* ================= ESTAÇÕES: busca, filtro e distância ================= */
  function listaEstacoes(){
    buildLOC(); const q = posGPS(), t = semAcento(busca).toLowerCase().trim();
    let L0 = state.etapas.flatMap(e => e.stops.map((s, k) => ({id:s.id, e, k, s})));
    if (t) L0 = L0.concat(state.pool.map((s, k) => ({id:s.id, e:null, k, s})));
    if (filtro === 'pend' && !t) L0 = L0.filter(x => !x.s.feito); else if (filtro === 'vis') L0 = L0.filter(x => x.s.feito);
    if (t){ const ws = t.split(/\s+/); L0 = L0.filter(x => { const est = EST[x.id]; const alvo = semAcento([est.nome, estMun(est), est.cod.join(' '), est.rio || '', x.e ? x.e.nome : ''].join(' ')).toLowerCase(); return ws.every(w => alvo.includes(w)); }); }
    if (q) L0.forEach(x => x.d = havLL(q, ll(x.id))), L0.sort((a, b) => a.d - b.d);
    return L0;
  }
  function telaEstacoes(){
    const seg = (k, n) => `<button type="button" data-c="filtro" data-v="${k}" aria-pressed="${filtro === k}">${n}</button>`;
    return `<div class="s-cab"><label class="s-busca">${IC.lupa}<input id="cQ" type="search" enterkeyhint="search" autocomplete="off" placeholder="Nome, cidade, código ou rio" value="${esc(busca)}"><button type="button" data-c="limpar" aria-label="Limpar">×</button></label>
      <div class="c-seg">${seg('pend', 'Pendentes')}${seg('vis', 'Visitadas')}${seg('todas', 'Todas')}</div></div><div id="cRes">${resultados()}</div>`;
  }
  function resultados(){
    const lst = listaEstacoes(), q = posGPS();
    let h = `<p class="s-info">${lst.length} estaç${lst.length === 1 ? 'ão' : 'ões'}${q ? ' · mais perto primeiro' : ' · ligue o GPS para ordenar pela distância'}</p>`;
    h += lst.length ? `<ul class="e-lista">${lst.slice(0, limite).map(x => { const inf = x.e && P[x.e.id] && P[x.e.id].info[x.k];
        return linhaEst(x.id, {letra: x.e ? x.k + 1 : '', cor: x.e ? x.e.cor : '#5E6B66', sub: x.e ? `${esc(x.e.nome)}${inf ? ` · dia ${inf.d + 1}` : ''}` : 'sem etapa'}); }).join('')}</ul>` +
        (lst.length > limite ? `<button type="button" class="c-bt largo" data-c="mais-est">Mostrar mais (${lst.length - limite})</button>` : '')
      : vazio(busca ? 'Nada encontrado.' : filtro === 'pend' ? 'Todas as estações já foram visitadas.' : 'Nenhuma estação aqui.');
    return h;
  }
  /* ================= REGISTRO DA VISITA ================= */
  function telaVisita(id){
    const est = EST[id], o = onde(id), s = o.s || {}, q = posGPS(), dist = q ? havLL(q, ll(id)) : null, a = acesso(id);
    let h = cab('Registro da visita', o.e ? `${esc(o.e.nome)}${o.inf ? ` · dia ${o.inf.d + 1} · prevista ${fmtHora(o.inf.cheg)}` : ''}` : 'Fora das etapas');
    h += `<div class="v-cab" style="--c:${o.e ? o.e.cor : '#5E6B66'}"><h3>${esc(est.nome)} ${tipoBadge(est)}</h3>
      <p>${esc(estMun(est))} · ${esc(est.cod.join(' / '))}${est.rio ? ` · ${esc(est.rio)}` : ''}${dist !== null ? ` · <b>${fmtDist(dist)} daqui</b>` : ''}</p></div>`;
    if (!o.e) return h + `<a class="c-bt largo gmb" href="${linkNav(id)}" target="_blank" rel="noopener">${IC.gm}<span>Navegar até lá</span></a>` + vazio('Esta estação não está em nenhuma etapa.');
    h += s.feito ? `<div class="v-ok">${svgI('ok')}<div><b>Visitada</b><small>${esc(quando(s))}</small></div><button type="button" class="tl-link" data-c="desmarcar" data-id="${id}">Desmarcar</button></div>`
      : `<div class="v-duo"><a class="c-bt gmb" href="${linkNav(id)}" target="_blank" rel="noopener">${IC.gm}<span>Navegar</span></a><button type="button" class="c-bt verde" data-c="cheguei" data-id="${id}">${svgI('ok')}<span>Cheguei</span></button></div>`;
    h += `<p class="c-rot">Situação da estação</p><div class="v-sit">${SIT.map(([k, n]) => `<button type="button" data-c="sit" data-id="${id}" data-v="${k}" aria-pressed="${s.sit === k}" class="s-${k}">${n}</button>`).join('')}</div>
      <p class="c-rot">Fotos${(s.fotos || []).length ? ` · ${s.fotos.length}` : ''}</p>
      <div class="v-fotos">${(s.fotos || []).map(f => `<button type="button" data-ver-foto="${id}|${f.id}"><img data-foto="${f.id}" alt="Foto"></button>`).join('')}
        <button type="button" class="v-add" data-c="foto" data-id="${id}">${svgI('foto')}<span>Câmera</span></button><button type="button" class="v-add" data-c="galeria" data-id="${id}">${svgI('pasta')}<span>Galeria</span></button></div>
      <p class="c-rot">Anotações</p>
      <textarea id="cNota" class="v-nota" data-id="${id}" rows="4" placeholder="Leituras, manutenção, estado do acesso, observador, pendências…">${esc(s.relato || '')}</textarea>
      <p class="v-salvo" id="cNotaSt">${s.relato ? 'Salvo' : 'Salva sozinha ao sair do campo'}</p>`;
    if (s.nota) h += `<p class="c-rot">Observação do planejamento</p><p class="c-relato">${esc(s.nota)}</p>`;
    h += `<p class="c-rot">Localização</p><div class="v-loc"><span>${ll(id)[0].toFixed(5)}, ${ll(id)[1].toFixed(5)}</span><button type="button" class="tl-link" data-c="copiar" data-id="${id}">Copiar</button><button type="button" class="tl-link" data-c="ver" data-id="${id}">Ver no mapa</button></div>
      <a class="c-bt largo" href="${linkEarth(id)}" target="_blank" rel="noopener">${IC.terra}<span>Abrir no Google Earth</span></a>
      ${a && a.nivel !== 'ok' ? `<p class="c-dica">${a.nivel === 'sem' ? 'Sem estrada mapeada até a estação' : 'O último trecho não tem estrada mapeada'} (${fmtM(a.d)}). Confirme o acesso com o observador.</p>` : ''}`;
    if (o.inf && s.feito){ const D = o.p.days[o.inf.d]; let prox = null; for (let k = D.i; k < D.j; k++) if (!o.e.stops[k].feito && o.e.stops[k].id !== id){ prox = o.e.stops[k].id; break; }
      h += prox ? `<button type="button" class="c-bt largo pri" data-c="estacao" data-id="${prox}" data-mapa="1">Próxima: ${esc(EST[prox].nome)} ${IC.seta}</button>` : `<button type="button" class="c-bt largo pri" data-c="voltar-hoje">Voltar ao dia ${IC.seta}</button>`; }
    return h;
  }
  /* ================= GRAVAR ROTA ================= */
  function numerosGrav(){ const t = GRV.t; if (!t) return {km:0, seg:0}; return {km:t.km, seg:t.seg + (GRV.pausa || !t.retomado ? 0 : (Date.now() - t.retomado) / 1000)}; }
  const linhaTrj = t => { const r = resumoTrj(t);
    return `<li class="trj2"><button type="button" class="c-it" data-c="trj-ver" data-id="${t.id}"><b>${esc(tituloTrj(t))}</b>
      <small>${esc(fmtDataHora(t.inicio))}–${esc(fmtHoraISO(t.fim))} · <b>${num(t.km, 1)} km</b> · ${fmtDur(t.seg)}</small>
      <small class="trj-de">De ${esc(r.de)}<br>até ${esc(r.ate)}</small></button>
      <div class="trj-bts"><button type="button" class="c-red" data-c="trj-nome" data-id="${t.id}" aria-label="Dados e nome">${svgI('lapis')}</button><button type="button" class="c-red" data-c="trj-gpx" data-id="${t.id}" aria-label="Baixar GPX">${svgI('baixar')}</button><button type="button" class="c-red perigo" data-c="trj-ex" data-id="${t.id}" aria-label="Excluir">${svgI('lixo')}</button></div></li>`; };
  function telaGravar(){
    const hojeD = new Date().toDateString(), deHoje = GRV.lista.filter(t => new Date(t.inicio).toDateString() === hojeD);
    const v = GPS.pos && GPS.pos.coords.speed != null && GPS.pos.coords.speed > .5 ? Math.round(GPS.pos.coords.speed * 3.6) : 0;
    let h = cab('Gravar rota', 'O caminho feito em campo, pelo GPS');
    if (!GRV.t) h += `<div class="r-ini"><button type="button" class="r-bt" data-c="gravar" aria-label="Iniciar gravação"><i></i></button><b>Iniciar gravação</b><small>${NATIVO ? 'Toque ao sair. Pode apagar a tela e guardar o celular: grava mesmo sem internet.' : 'Toque ao sair. Deixe o app aberto: a tela fica acesa sozinha.'}</small></div>`;
    else { const n = numerosGrav();
      h += `<div class="r-viva${GRV.pausa ? ' pausa' : ''}"><p class="r-st"><i class="rec"></i>${GRV.pausa ? 'Pausada' : 'Gravando'}${GPS.pos ? ` · GPS ±${Math.round(GPS.pos.coords.accuracy || 0)} m` : ' · procurando o GPS…'}</p>
        <div class="r-nums"><div><b data-r="km">${num(n.km, n.km < 100 ? 1 : 0)}</b><span>km</span></div><div><b data-r="t">${fmtDur(n.seg)}</b><span>tempo</span></div><div><b data-r="v">${v}</b><span>km/h</span></div></div>
        <div class="r-bts"><button type="button" class="c-bt" data-c="${GRV.pausa ? 'continuar' : 'pausar'}">${GRV.pausa ? 'Continuar' : 'Pausar'}</button><button type="button" class="c-bt perigo" data-c="encerrar">Encerrar e salvar</button></div></div>`; }
    h += `<p class="c-rot">Gravadas hoje</p>` + (deHoje.length ? `<ul class="c-trj">${deHoje.map(linhaTrj).join('')}</ul>` : `<p class="c-vazio mini">Nenhuma ainda.</p>`);
    h += NATIVO ? `<p class="c-dica">Grava em segundo plano: aparece uma notificação "Gravando a rota" enquanto estiver ligado.</p>`
      : `<details class="c-gm-leg r-como"><summary>Limites</summary><p>Grava com o app aberto (a tela fica acesa). Se a tela apagar ou você abrir o Google Maps, o trecho que faltou é traçado pela estrada e fica tracejado. No aplicativo Android, grava com a tela apagada.</p></details>`;
    return h;
  }
  /* ================= REGISTROS ================= */
  function telaRegistros(){
    const seg = (k, n) => `<button type="button" data-c="seg" data-v="${k}" aria-pressed="${regSeg === k}">${n}</button>`;
    let h = cab('Registros', '') + `<div class="c-seg">${seg('visitas', 'Visitas')}${seg('fotos', 'Fotos')}${seg('rotas', 'Rotas')}</div>`;
    if (regSeg === 'visitas'){
      /* ordem realizada: numeradas na ordem do "Cheguei", separadas por dia; depois as que têm registro mas não foram marcadas */
      const feitas = ordemRealizada().map((x, i) => ({...x, n: i + 1}));
      const semMarca = state.etapas.flatMap(e => e.stops.filter(s => !s.feito && (s.relato || s.sit || (s.fotos || []).length)).map(s => ({e, s})));
      const fora = state.etapas.filter(foraDaOrdem);
      h += fora.map(e => `<div class="o-aviso" style="--c:${e.cor}"><p><b>${esc(e.nome)}</b> foi visitada em outra ordem.</p><button type="button" class="c-bt" data-c="usar-ordem" data-id="${e.id}">Usar a ordem em que visitei</button></div>`).join('');
      let dia0 = '';
      h += feitas.length ? `<p class="c-rot">Ordem realizada · ${feitas.length} ${feitas.length === 1 ? 'visita' : 'visitas'}</p><ol class="o-lista">${feitas.map(x => {
          const d = new Date(x.t).toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'2-digit'}), hora = new Date(x.t).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
          const cabD = d !== dia0 ? `<li class="o-dia">${esc(d)}</li>` : ''; dia0 = d; const inf = P[x.e.id] && P[x.e.id].info[x.k];
          return cabD + `<li class="o-it" style="--c:${x.e.cor}"><span class="o-n">${x.n}</span><button type="button" data-c="estacao" data-id="${x.s.id}"><b>${esc(EST[x.s.id].nome)} ${tipoBadge(EST[x.s.id])}</b>
            <small>${hora} · ${esc(x.e.nome)} · nº ${x.k + 1} no roteiro${inf ? ` (dia ${inf.d + 1})` : ''}</small>${x.s.sit ? `<span class="c-sit s-${x.s.sit}">${SITUACOES[x.s.sit]}</span>` : ''}</button></li>`; }).join('')}</ol>` : '';
      const v = semMarca;
      h += v.length ? `<p class="c-rot">Com registro, sem "Cheguei"</p><ul class="c-vis">${v.reverse().map(({e, s}) => `<li style="--c:${e.cor}"><button type="button" data-c="estacao" data-id="${s.id}"><b>${esc(EST[s.id].nome)} ${tipoBadge(EST[s.id])}</b>
          <small>Não marcada como visitada · ${esc(e.nome)}</small><span class="c-tags">${s.sit ? `<span class="c-sit s-${s.sit}">${SITUACOES[s.sit]}</span>` : ''}${(s.fotos || []).length ? `<span class="c-tag">${s.fotos.length} foto(s)</span>` : ''}${s.relato ? '<span class="c-tag">anotação</span>' : ''}</span></button></li>`).join('')}</ul>` : (feitas.length ? '' : vazio('As visitas aparecem aqui, numeradas na ordem em que você marcar "Cheguei".'));
    } else if (regSeg === 'fotos'){
      const fotos = todasFotos().sort((a, b) => (b.f.data || '').localeCompare(a.f.data || ''));
      h += fotos.length ? `<div class="c-galeria">${fotos.map(x => `<button type="button" data-ver-foto="${x.s.id}|${x.f.id}"><img data-foto="${x.f.id}" alt=""><span>${esc(EST[x.s.id].nome)}</span></button>`).join('')}</div><button type="button" class="c-bt largo" data-c="zip">${svgI('baixar')}<span>Baixar todas (ZIP com GPS)</span></button>` : vazio('As fotos tiradas nas visitas aparecem aqui.');
    } else {
      const tot = GRV.lista.reduce((a, t) => ({km:a.km + t.km, seg:a.seg + t.seg}), {km:0, seg:0});
      h += `<div class="c-tot"><div><b>${num(tot.km, 1)}</b><span>km gravados</span></div><div><b>${GRV.lista.length}</b><span>rotas</span></div></div>
        <label class="c-tg"><input type="checkbox" data-c="mostrar" ${GRV.mostrar ? 'checked' : ''}><span>Mostrar no mapa</span></label>` +
        (GRV.lista.length ? `<ul class="c-trj">${GRV.lista.map(linhaTrj).join('')}</ul>` : vazio('Nenhuma rota gravada. Use o botão vermelho <b>Gravar</b> sobre o mapa.')) +
        `<div class="c-linha"><button type="button" class="c-bt" data-c="trj-imp">${svgI('baixar')}<span>Importar GPX</span></button>${GRV.lista.length ? `<button type="button" class="c-bt" data-c="trj-todas">${svgI('baixar')}<span>Baixar todas</span></button>` : ''}</div>`;
    }
    return h;
  }
  /* ================= MAIS ================= */
  function telaMais(){
    const s = NUV.status(), [cls, txt] = rotuloNuvem(s), meta = metaDe(PJ_ID);
    const it = (c, ico, t, sub, extra = '') => `<button type="button" data-c="${c}">${svgI(ico)}<div><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>${extra}${IC.seta}</button>`;
    return cab('Mais', '') +
      `${EM_NUVEM ? `<div class="c-conta"><span class="c-av">${esc((s.nome || s.email || '?').trim().charAt(0).toUpperCase())}</span><div><b>${esc(s.nome || s.email)}</b><small>${esc(s.email)}</small></div><span class="c-nv ${cls}"><i></i>${cls === 'ok' ? 'Salvo' : cls === 'off' ? 'Sem internet' : cls === 'erro' ? 'Erro' : 'Enviando'}</span></div>` : ''}
      <div class="c-menu">${it('projetos', 'pasta', 'Projeto', esc(meta ? meta.nome : ''))}${it('etapas', 'roteiro', 'Etapas e planejamento', 'Dias, ordem, datas, Google Maps')}
        ${it('relatorios', 'rel', 'Relatórios e arquivos', 'PDF, planilhas, KML, GPX')}${it('offline', 'offline', 'Preparar para usar sem internet', 'Antes de ir a campo')}${it('regua', 'alvo', 'Medir distância', 'No mapa')}</div>
      ${EM_NUVEM ? `<div class="c-menu">${s.papel === 'admin' ? it('equipe', 'equipe', 'Equipe e acesso', 'Liberar ou bloquear pessoas', '<i class="c-badge" id="cPed" hidden></i>') : ''}${it('sinc', 'nuvem', 'Sincronizar agora', esc(txt))}${it('sair', 'sair', 'Sair da conta', '')}</div>` : ''}
      <p class="c-ver">${esc(document.getElementById('versao').textContent)}</p>`;
  }
  function telaEtapas(){
    return cab('Etapas', '') + `<div class="c-etapas">${state.etapas.map(e => cartaoEtapa(e, 'etapa-ver')).join('')}</div>
      <button type="button" class="c-bt largo" data-c="plano">${svgI('roteiro')}<span>Planejamento completo (editar)</span></button>`;
  }
  function telaEtapa(id){
    const e = etapaPorId(id); if (!e) return telaEtapas();
    const p = P[e.id];
    let h = cab(esc(e.nome), p ? `${e.stops.length} estações · ${p.days.length} dias · ${fmtKm(p.tot.km)} km` : '');
    h += `<div class="c-linha"><label class="c-campo">Data de início<input type="date" data-c="inicio" data-id="${e.id}" value="${e.inicio || ''}"></label><button type="button" class="c-bt" data-c="otimizar" data-id="${e.id}">Otimizar ordem</button></div>
      ${ordemRealizada(e).length ? `<button type="button" class="c-bt largo" data-c="usar-ordem" data-id="${e.id}">${svgI('ok')}<span>Usar a ordem em que visitei${foraDaOrdem(e) ? '' : ' (já está igual)'}</span></button>` : ''}`;
    if (p) h += p.days.map((D, d) => { const g = gmPlano(e, D), ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
      return `<div class="c-dd2"><button type="button" class="c-dd2-t" data-c="dia-ir" data-id="${e.id}" data-d="${d}"><b>Dia ${d + 1}${D.data ? ` · ${esc(fmtDS(D.data))}` : ''}</b><span>${ks.map(k => esc(EST[e.stops[k].id].nome)).join(' → ')}</span><small>${fmtKm(D.km)} km · ${fmtHora(D.saida)}–${fmtHora(D.chegada)} · ${D.to === BH ? 'volta a BH' : 'dorme em ' + esc(MUN[D.to].n)}</small></button>
        <a class="c-red" href="${g.partes[0].url}" target="_blank" rel="noopener" aria-label="Abrir no Google Maps">${IC.gm}</a></div>`; }).join('');
    return h;
  }
  function telaRelatorios(){
    const it = (a, t, s) => `<button type="button" data-acao="${a}"><div><b>${t}</b>${s ? `<small>${s}</small>` : ''}</div></button>`;
    return cab('Relatórios e arquivos', '') + `<div class="c-menu">${it('crono', 'Relatório completo', 'Cronograma, visitas, fotos e rotas. Imprimir ou PDF.')}${it('tabela', 'Tabela das estações', '')}</div>
      <p class="c-rot">Baixar</p><div class="c-menu">${it('csv', 'Planilha do roteiro (CSV)', '')}${it('csvApoio', 'Hospedagens e paradas (CSV)', '')}${it('kml', 'Estações (KML, Google Earth)', '')}${it('fotos-zip', 'Fotos (ZIP)', '')}<button type="button" data-c="trj-todas"><div><b>Rotas gravadas (GPX)</b></div></button><button type="button" data-c="copia"><div><b>Cópia de segurança (HTML)</b><small>Abre no computador mesmo sem o app</small></div></button></div>
      <p class="c-rot">Trazer dados</p><div class="c-menu">${it('abrir', 'Importar de arquivo salvo antes', 'HTML ou .json da versão antiga')}</div>`;
  }

  function telaCamadas(){
    const f = state.fundo || 'ruas', op = (k, n, d) => `<button type="button" data-c="fundo" data-id="${k}" aria-pressed="${f === k}"><b>${n}</b><small>${d}</small></button>`;
    return cab('Mapa', '') + `<div class="c-fundos">${temGoogle() ? op('gm', 'Google Maps', 'Ruas do Google') + op('gsat', 'Google Satélite', 'Igual ao Google Earth') : ''}${op('sat', 'Satélite', 'Imagem real com estradas')}${op('ruas', 'Estradas', 'Rodovias e cidades')}${op('ter', 'Terreno', 'Relevo')}${op('nenhum', 'Sem internet', 'Mais leve: limites e rotas guardadas')}</div>
      <label class="c-tg"><input type="checkbox" data-c="mostrar" ${GRV.mostrar ? 'checked' : ''}><span>Rotas gravadas</span></label>`;
  }

  /* ---------- desenhar ---------- */
  function desenhar(){
    const v = atual(); salvarNota();
    const T = {hoje:telaHoje, estacoes:telaEstacoes, registros:telaRegistros, mais:telaMais, dias:telaDias, gravar:telaGravar, etapas:telaEtapas, relatorios:telaRelatorios, camadas:telaCamadas,
      equipe:() => cab('Equipe e acesso', '') + '<div id="cEq" class="c-eq"></div>'};
    corpo.innerHTML = v.v === 'estacao' ? telaVisita(v.id) : v.v === 'etapa' ? telaEtapa(v.id) : (T[v.v] || telaHoje)();
    hidratar(corpo);
    if (v.v === 'equipe') NUV.abrirEquipe(document.getElementById('cEq'));
    if (v.v === 'mais' && EM_NUVEM && NUV.contarPedidos) NUV.contarPedidos().then(n => { const b = document.getElementById('cPed'); if (b){ b.hidden = !n; b.textContent = n; } });
    requestAnimationFrame(() => { if (alt === 'baixa') altura('baixa', false); });
    if (v.v === 'estacoes' && focoBusca){ focoBusca = false; const i = document.getElementById('cQ'); if (i){ i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  let focoBusca = false;
  corpo.addEventListener('input', ev => { if (ev.target.id === 'cQ'){ busca = ev.target.value; limite = 60; const r = document.getElementById('cRes'); if (r){ r.innerHTML = resultados(); } if (alt !== 'alta') altura('alta'); } });
  function salvarNota(){
    const t = document.getElementById('cNota'); if (!t || !corpo.contains(t)) return;
    buildLOC(); const w = LOC[t.dataset.id]; if (!w) return; const v = t.value.trim();
    if (v !== (w.s.relato || '')){ snapshot(); w.s.relato = v; save(); const st = document.getElementById('cNotaSt'); if (st) st.textContent = 'Salvo'; }
  }
  corpo.addEventListener('focusout', ev => { if (ev.target.id === 'cNota') salvarNota(); });
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
    else if (c === 'voltar-hoje') irTab('hoje');
    else if (c === 'estacao') abrirEstacao(id);
    else if (c === 'cheguei'){ marcarVisita(id, true); if (atual().v !== 'estacao') abrirEstacao(id, 'alta'); else desenhar(); toast('Visita registrada. Marque a situação, tire fotos e anote.', true); }
    else if (c === 'filtro'){ filtro = b.dataset.v; limite = 60; desenhar(); }
    else if (c === 'limpar'){ busca = ''; const i = document.getElementById('cQ'); if (i){ i.value = ''; i.focus(); } const r = document.getElementById('cRes'); if (r) r.innerHTML = resultados(); }
    else if (c === 'mais-est'){ limite += 100; const r = document.getElementById('cRes'); if (r) r.innerHTML = resultados(); }
    else if (c === 'gps-ligar'){ gpsLigar(); toast('Procurando o GPS…'); }
    else if (c === 'desmarcar'){ if (confirm('Desmarcar a visita desta estação?')){ marcarVisita(id, false); desenhar(); } }
    else if (c === 'sit'){ buildLOC(); const w = LOC[id]; if (w){ snapshot(); w.s.sit = w.s.sit === b.dataset.v ? '' : b.dataset.v; save(); desenhar(); } }
    else if (c === 'foto') iniciarFoto(id, true);
    else if (c === 'galeria') iniciarFoto(id, false);
    else if (c === 'copiar') copiar(`${ll(id)[0].toFixed(6)}, ${ll(id)[1].toFixed(6)}`);
    else if (c === 'ver'){ altura('baixa'); mostrarNoMapa(id); }
    else if (c === 'dia') mudarDia(+b.dataset.d);
    else if (c === 'dias') abrir({v:'dias'}, 'alta');
    else if (c === 'dia-ir'){ campoEtapaId = id; diaHoje = +b.dataset.d; modoTudo = false; irTab('hoje'); }
    else if (c === 'etapa-hoje'){ campoEtapaId = id; diaHoje = null; modoTudo = false; irTab('hoje'); }
    else if (c === 'tudo'){ verTudo(); aba = 'hoje'; pilha = []; marcaNav(); desenhar(); altura('media'); }
    else if (c === 'apoio-novo'){ const m = b.dataset.mun, e = etapaCampo(); abrirFormApoio({tipo:b.dataset.t, mun:m, lat:MUN[m].lat, lon:MUN[m].lon, etapa: e ? e.id : ''}); }
    else if (c === 'gravar'){ iniciarGravacao(); desenhar(); }
    else if (c === 'pausar'){ pausarGravacao(); desenhar(); }
    else if (c === 'continuar'){ continuarGravacao(); desenhar(); }
    else if (c === 'encerrar') encerrarComNome().then(ok => { if (ok) desenhar(); });
    else if (c === 'trj-nome') renomearTrajeto(id).then(desenhar);
    else if (c === 'seg'){ regSeg = b.dataset.v; desenhar(); }
    else if (c === 'etapas') abrir({v:'etapas'}, 'alta');
    else if (c === 'etapa-ver') abrir({v:'etapa', id}, 'alta');
    else if (c === 'usar-ordem'){ const e = etapaPorId(id); if (e && confirm(`Trocar a ordem de ${e.nome} pela ordem em que as estações foram visitadas? As pendentes ficam depois, na ordem atual.`)){ usarOrdemVisitada(e); desenhar(); } }
    else if (c === 'otimizar'){ const e = etapaPorId(id); if (e){ snapshot(); otimizarEtapa(e); e.ordem = 'auto'; changed(); toast('Ordem otimizada.', true); } }
    else if (c === 'plano') abrirPlanejamento();
    else if (c === 'relatorios' || c === 'equipe') abrir({v:c}, 'alta');
    else if (c === 'projetos') abrirProjetos();
    else if (c === 'offline') prepararOffline();
    else if (c === 'regua'){ irTab('hoje'); altura('baixa'); regua(true); }
    else if (c === 'sinc'){ if (EM_NUVEM) NUV.atualizarAgora(); toast('Sincronizando…'); }
    else if (c === 'sair') NUV.sair();
    else if (c === 'trj-ver'){ const t = GRV.lista.find(x => x.id === id); if (t){ if (!GRV.mostrar){ GRV.mostrar = true; desenharTrajetos(); } altura('baixa'); map.fitBounds(L.latLngBounds(t.pts.map(p => [p[0], p[1]])), {paddingTopLeft:[24, 80], paddingBottomRight:[24, __alturaFolha() + 20]}); } }
    else if (c === 'trj-gpx') baixarTrajetos('gpx', id);
    else if (c === 'trj-ex') excluirTrajeto(id);
    else if (c === 'trj-imp') entradaGPX.click();
    else if (c === 'trj-todas') baixarTrajetos('gpx');
    else if (c === 'zip') baixarFotosZip();
    else if (c === 'apoio'){ const a = state.apoios.find(x => x.uid === id); if (a) abrirFormApoio(a); }
    else if (c === 'copia') salvarNoArquivo(true);
    else if (c === 'fundo'){ usarFundo(id, false, true); desenhar(); }
  });
  /* Abre o registro da estação com o mapa centrado nela, acima da folha. */
  function abrirEstacao(id, a = 'media'){ if (pilha.length && atual().v === 'estacao') pilha.pop(); abrir({v:'estacao', id}, a); if (a !== 'alta') requestAnimationFrame(() => mostrarNoMapa(id)); }
  function mostrarNoMapa(id){ const p = ll(id); map.setView(p, Math.max(map.getZoom(), 14), {animate:false}); map.panBy([0, (__alturaFolha() - 70) / 2], {animate:false}); destacar(ll(id), 22); }
  raiz.querySelector('#cFlut').addEventListener('click', ev => {
    const b = ev.target.closest('[data-c]'); if (!b) return;
    if (b.dataset.c === 'gps'){ if (!GPS.on) gpsLigar(); else if (GPS.pos){ GPS.seguir = true; map.setView([GPS.pos.coords.latitude, GPS.pos.coords.longitude], Math.max(map.getZoom(), 15)); } else gpsDesligar(); }
    if (b.dataset.c === 'camadas') abrir({v:'camadas'}, 'media');
  });
  $('#cGrav').onclick = () => { if (atual().v === 'gravar') return; abrir({v:'gravar'}, 'media'); };
  $('#cBusca').onclick = () => { focoBusca = true; irTab('estacoes'); };
  $('#cSync').onclick = () => { irTab('mais'); if (EM_NUVEM) NUV.atualizarAgora(); };
  popupEst = (id) => { if (REG.on) return; if (pilha.length && atual().v === 'estacao') pilha.pop(); abrir({v:'estacao', id}, 'media'); };

  /* ---------- atualizações ---------- */
  function topo(){
    const [cls] = rotuloNuvem(NUV.status()); $('#cSync').className = 'c-sync ' + cls;
    navC.querySelector('.c-dot').hidden = cls !== 'erro';
    $('#cFlut [data-c=gps]').classList.toggle('on', GPS.on);
    const g = $('#cGrav'); g.classList.toggle('ativo', !!GRV.t); g.classList.toggle('pausa', !!GRV.pausa);
    if (GRV.t){ const n = numerosGrav(); g.innerHTML = `<i class="rec"></i><span>${num(n.km, n.km < 100 ? 1 : 0)} km · ${fmtDur(n.seg)}</span>`; }
    else g.innerHTML = '<i class="rec"></i><span>Gravar</span>';
  }
  NUV.on(() => { topo(); if (atual().v === 'mais' && !digitando()) desenhar(); });
  const _render = render;
  render = function(){ _render(); try { ajustaLimites(); } catch(e){} topo(); if (!digitando()) desenhar(); };
  const _atuG = atualizarGravacaoUI;
  atualizarGravacaoUI = function(so){ _atuG(so); topo(); if (atual().v === 'gravar' && !digitando()) desenhar(); };
  setInterval(() => { if (GRV.t){ topo(); if (atual().v === 'gravar' && !digitando()){ const n = numerosGrav(), set = (k, v) => { const el = corpo.querySelector(`[data-r=${k}]`); if (el) el.textContent = v; }; set('km', num(n.km, n.km < 100 ? 1 : 0)); set('t', fmtDur(n.seg)); } } }, 5000);
  const _gL = gpsLigar, _gD = gpsDesligar;
  gpsLigar = () => { _gL(); topo(); };
  gpsDesligar = () => { _gD(); topo(); if (atual().v === 'gravar') desenhar(); };
  setInterval(() => { if (GPS.on && ['hoje', 'estacoes'].includes(atual().v) && !digitando() && corpo.scrollTop < 10) desenhar(); }, 30000);
  window.addEventListener('resize', () => altura(alt, false));
  setSheet = () => {};
  const fechaPlan = document.createElement('button'); fechaPlan.type = 'button'; fechaPlan.id = 'cPlanFechar'; fechaPlan.innerHTML = '‹ Voltar ao app'; fechaPlan.onclick = () => fecharPlanejamento();
  painelEl.prepend(fechaPlan);
  function abrirPlanejamento(){ document.documentElement.classList.add('plan-aberto'); _render(); painelEl.scrollTop = 0; }
  function fecharPlanejamento(){ document.documentElement.classList.remove('plan-aberto'); if (modoTudo) verTudo(); else focarDia(); desenhar(); }
  /* ---------- começo ---------- */
  aba = 'hoje'; marcaNav(); focarDia(); desenhar(); topo();
  setTimeout(() => { altura('media', false); const x = diaDoHoje(); if (x) enquadrarDia(x); }, 60);
}
