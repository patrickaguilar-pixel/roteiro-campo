
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
  try { usarFundo(['ruas', 'ter', 'nenhum'].includes(state.fundo) ? state.fundo : 'ruas'); } catch(e){}
  /* ---------- estrutura ---------- */
  const raiz = document.createElement('div'); raiz.id = 'cel';
  raiz.innerHTML = `
    <header id="cTopo"><button type="button" id="cProj" aria-label="Trocar de projeto">${svgI('pasta')}<span></span>${'<svg class="ic-ui seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'}</button>
      <button type="button" id="cSync" aria-label="Situação da nuvem"><i></i></button></header>
    <div id="cRec" hidden></div>
    <div id="cFlut"><button type="button" data-c="gps" aria-label="Minha localização">${svgI('gps')}</button><button type="button" data-c="camadas" aria-label="Fundo do mapa">${'<svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>'}</button><button type="button" data-c="tudo" aria-label="Ver o roteiro inteiro">${'<svg class="ic-ui" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'}</button></div>
    <section id="cFolha"><div class="cf-alca" aria-hidden="true"><span></span></div><div id="cCorpo"></div></section>
    <nav id="cNav" aria-label="Seções">
      <button type="button" data-t="mapa">${svgI('mapa')}<span>Mapa</span></button>
      <button type="button" data-t="hoje">${svgI('campo')}<span>Hoje</span><i class="c-rec" hidden></i></button>
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
    desenhar(); altura(a || (t === 'mapa' ? 'baixa' : t === 'hoje' ? 'media' : 'media')); corpo.scrollTop = 0;
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

  /* ---------- telas ---------- */
  function telaMapa(){
    const e = etapaAtual(), p = e && P[e.id], T = totaisGerais ? totaisGerais() : null;
    const chips = `<div class="c-chips" role="group" aria-label="Mostrar no mapa"><button type="button" data-c="etapa" data-id="geral" aria-pressed="${!e}">Todas</button>${state.etapas.map(x => `<button type="button" data-c="etapa" data-id="${x.id}" aria-pressed="${e && e.id === x.id}" style="--c:${x.cor}"><i></i>${esc(x.nome)}</button>`).join('')}</div>`;
    const resumo = e && p ? `${e.stops.length} estações · ${p.days.length} dias · ${fmtKm(p.tot.km)} km${periodo(p) ? ' · ' + periodo(p) : ''}`
      : `${state.etapas.reduce((a, x) => a + x.stops.length, 0)} estações · ${state.etapas.length} etapas${T ? ` · ${fmtKm(T.km)} km` : ''}`;
    return `<div class="cf-cab"><div><h2>${e ? esc(e.nome) : 'Roteiro completo'}</h2><p>${resumo}</p></div></div>${chips}`;
  }
  function cartaoEstacao(id, opt = {}){
    const est = EST[id], o = onde(id), s = o.s || {}, q = posGPS(), dist = q ? havLL(q, ll(id)) : null;
    const info = [estMun(est), est.cod.join(' / ')];
    if (o.e) info.push(`${o.e.nome}${o.inf ? `, dia ${o.inf.d + 1} às ${fmtHora(o.inf.cheg)}` : ''}`); else info.push('Fora das etapas');
    return `<article class="c-est${s.feito ? ' feito' : ''}">
      <div class="c-est-t">${o.e ? `<span class="c-n" style="--c:${o.e.cor}">${o.k + 1}</span>` : ''}<div><h3>${esc(est.nome)} ${tipoBadge(est)}</h3><p>${info.map(esc).join(' · ')}${dist !== null ? ` · <b>${fmtDist(dist)}</b>` : ''}</p></div></div>
      ${s.feito ? `<p class="c-ok">${svgI('ok')} Visitada ${esc(s.feito)}</p>` : ''}
      <div class="c-acoes">
        <a class="c-bt pri" href="${linkNav(id)}" target="_blank" rel="noopener">${svgI('nav')}<span>Navegar</span></a>
        ${o.e ? `<button type="button" class="c-bt ${s.feito ? '' : 'verde'}" data-c="visita" data-id="${id}">${svgI('ok')}<span>${s.feito ? 'Desmarcar' : 'Cheguei'}</span></button>` : ''}
        ${o.e ? `<button type="button" class="c-bt" data-c="foto" data-id="${id}">${svgI('foto')}<span>Foto${(s.fotos || []).length ? ` · ${s.fotos.length}` : ''}</span></button>` : ''}
      </div>
      ${o.e ? `<div class="c-acoes2"><button type="button" data-c="nota" data-id="${id}">${svgI('nota')}${s.relato ? 'Editar anotação' : 'Anotar'}</button>${opt.noMapa !== false ? `<button type="button" data-c="ver" data-id="${id}">${svgI('alvo')}Ver no mapa</button>` : ''}</div>` : ''}
      ${notaAberta === id ? `<div class="c-nota"><textarea id="cNota" rows="4" placeholder="Estado da estação e do acesso, leituras, manutenção, observador…">${esc(s.relato || '')}</textarea><div><button type="button" class="c-bt pri" data-c="nota-ok" data-id="${id}">Salvar</button><button type="button" class="c-bt" data-c="nota-x">Cancelar</button></div></div>`
        : s.relato ? `<p class="c-relato">${esc(s.relato)}</p>` : ''}
      ${(s.fotos || []).length ? `<div class="c-fotos">${s.fotos.slice(-8).map(f => `<button type="button" data-ver-foto="${id}|${f.id}"><img data-foto="${f.id}" alt="Foto"></button>`).join('')}</div>` : ''}
    </article>`;
  }
  let notaAberta = null, diaHoje = null, focoHoje = null;
  function barraGravar(){
    if (!GRV.t) return `<div class="c-grav"><button type="button" class="c-gravar" data-c="gravar"><i class="rec"></i>Gravar rota</button><button type="button" class="c-bt ${GPS.on ? 'azul' : ''}" data-c="gps-tg">${svgI('gps')}<span>${GPS.on ? 'GPS ligado' : 'GPS'}</span></button></div>`;
    return `<div class="c-grav ativo${GRV.pausa ? ' pausa' : ''}"><i class="rec"></i><div><b>${GRV.pausa ? 'Gravação pausada' : 'Gravando a rota'}</b><small data-grv-info>${infoGravacao()}</small></div>
      <button type="button" class="c-bt" data-c="${GRV.pausa ? 'continuar' : 'pausar'}">${GRV.pausa ? 'Continuar' : 'Pausar'}</button><button type="button" class="c-bt perigo" data-c="encerrar">Encerrar</button></div>`;
  }
  function telaHoje(){
    const e = etapaCampo(), p = e && P[e.id];
    let h = cab('Hoje', e ? esc(e.nome) : '') + barraGravar();
    if (!e) return h + vazio('Nenhuma etapa montada. Monte as etapas no computador (ou em Mais → Planejamento completo).');
    if (state.etapas.length > 1) h += `<div class="c-chips">${state.etapas.map(x => `<button type="button" data-c="etapa-hoje" data-id="${x.id}" aria-pressed="${x.id === e.id}" style="--c:${x.cor}"><i></i>${esc(x.nome)}</button>`).join('')}</div>`;
    if (!p || !p.days.length) return h + vazio('Esta etapa ainda não tem estações.');
    const d = diaHoje !== null && diaHoje < p.days.length ? diaHoje : diaCampo(e, p), D = p.days[d];
    const ks = []; for (let k = D.i; k < D.j; k++) ks.push(k);
    const pend = ks.filter(k => !e.stops[k].feito), feitos = ks.length - pend.length;
    h += `<div class="c-dia"><button type="button" class="c-red" data-c="dia" data-d="${d - 1}" ${d ? '' : 'disabled'} aria-label="Dia anterior">‹</button>
      <div><b>Dia ${d + 1} de ${p.days.length}${D.data ? ` · ${esc(fmtDS(D.data))}` : ''}</b><small>${feitos}/${ks.length} visitadas · ${fmtKm(D.km)} km${D.to && D.to !== BH ? ` · dorme em ${esc(MUN[D.to].n)}` : ' · volta a BH'}</small></div>
      <button type="button" class="c-red" data-c="dia" data-d="${d + 1}" ${d < p.days.length - 1 ? '' : 'disabled'} aria-label="Próximo dia">›</button></div>`;
    const foco = focoHoje && ks.some(k => e.stops[k].id === focoHoje) ? focoHoje : null;
    const alvo = foco || (pend.length ? e.stops[pend[0]].id : null);
    if (alvo){ const proxK = pend.find(k => e.stops[k].id !== alvo);
      h += `<p class="c-rot">${foco && onde(foco).s.feito ? 'Estação visitada' : 'Próxima estação'}</p>` + cartaoEstacao(alvo)
        + (foco && onde(foco).s.feito && proxK !== undefined ? `<button type="button" class="c-bt largo pri" data-c="proxima">Próxima: ${esc(EST[e.stops[proxK].id].nome)} ›</button>` : ''); }
    else h += `<p class="c-tudo">${svgI('ok')} Todas as estações deste dia foram visitadas.</p>`;
    h += `<p class="c-rot">Estações do dia</p><ol class="c-lista">${ks.map(k => { const s = e.stops[k], est = EST[s.id], inf = p.info[k] || {};
      return `<li class="${s.feito ? 'feito' : ''}"><button type="button" class="c-chk" data-c="visita" data-id="${s.id}" aria-pressed="${!!s.feito}" aria-label="${s.feito ? 'Desmarcar' : 'Marcar visitada'}">${svgI('ok')}</button>
        <button type="button" class="c-it" data-c="estacao" data-id="${s.id}"><b>${esc(est.nome)}</b><small>${inf.cheg != null ? fmtHora(inf.cheg) + ' · ' : ''}${esc(estMun(est))}</small></button></li>`; }).join('')}</ol>`;
    h += `<button type="button" class="c-bt largo" data-c="gasto">${svgI('moeda')}<span>Registrar gasto ou abastecimento</span></button>`;
    return h;
  }
  function telaEstacao(id){ const o = onde(id); return cab('Estação', o.e ? esc(o.e.nome) : '') + cartaoEstacao(id, {noMapa:false}); }
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
        <p class="c-pern">${D.to && D.to !== BH ? `Pernoite em ${esc(munNome(D.to))}` : 'Retorno a Belo Horizonte'}</p></details>`; }).join('');
    return h;
  }
  function telaMais(){
    const s = NUV.status(), [cls, txt] = rotuloNuvem(s), meta = metaDe(PJ_ID);
    const it = (c, ico, t, sub, extra = '') => `<button type="button" data-c="${c}">${svgI(ico)}<div><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div>${extra}<svg class="ic-ui seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>`;
    const nT = GRV.lista.length, nF = todasFotos().length, T = totaisGerais();
    return cab('Mais', '') +
      `${EM_NUVEM ? `<div class="c-conta"><span class="c-av">${esc((s.nome || s.email || '?').trim().charAt(0).toUpperCase())}</span><div><b>${esc(s.nome || s.email)}</b><small>${esc(s.email)}</small></div><span class="c-nv ${cls}" title="${esc(txt)}"><i></i>${cls === 'ok' ? 'Salvo' : cls === 'off' ? 'Sem internet' : cls === 'erro' ? 'Erro' : 'Enviando'}</span></div>` : ''}
      <p class="c-rot">Registros de campo</p><div class="c-menu">
        ${it('rotas', 'campo', 'Rotas percorridas', nT ? `${nT} ${nT === 1 ? 'rota' : 'rotas'} gravadas` : 'Nenhuma ainda')}
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
      (GRV.lista.length ? `<ul class="c-trj">${GRV.lista.map(t => `<li><button type="button" class="c-it" data-c="trj-ver" data-id="${t.id}"><b>${esc(fmtDataHora(t.inicio))}</b><small>${num(t.km, 1)} km · ${fmtDur(t.seg)}${t.etapa && etapaPorId(t.etapa) ? ` · ${esc(etapaPorId(t.etapa).nome)}` : ''}${t.nome ? ` · ${esc(t.nome)}` : ''}${t.importado ? ' · importada' : ''}</small></button>
          <button type="button" class="c-red" data-c="trj-gpx" data-id="${t.id}" aria-label="Baixar GPX">${svgI('baixar')}</button><button type="button" class="c-red perigo" data-c="trj-ex" data-id="${t.id}" aria-label="Excluir">${svgI('lixo')}</button></li>`).join('')}</ul>` : vazio('Nenhuma rota ainda. Em <b>Hoje</b>, toque em <b>Gravar rota</b> ao sair.')) +
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
      (lst.length ? `<ul class="c-trj">${lst.map(a => `<li><button type="button" class="c-it" data-c="apoio" data-id="${a.uid}"><b>${esc(a.nome)}</b><small>${TIPOS[a.tipo].nome}${a.mun ? ` · ${esc(MUN[a.mun].n)}` : ''}${gastoTotal(a) ? ` · gasto ${fmtR(gastoTotal(a))}` : a.valor ? ` · previsto ${fmtR(previsto(a))}` : ''}</small></button></li>`).join('')}</ul>` : vazio('Nada registrado ainda.')) +
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
    if (v.v === 'mapa') h = telaMapa(); else if (v.v === 'hoje') h = telaHoje(); else if (v.v === 'etapas') h = telaEtapas(); else if (v.v === 'mais') h = telaMais();
    else if (v.v === 'estacao') h = telaEstacao(v.id); else if (v.v === 'etapa') h = telaEtapa(v.id); else if (v.v === 'rotas') h = telaRotas();
    else if (v.v === 'fotos') h = telaFotos(); else if (v.v === 'gastos') h = telaGastos(); else if (v.v === 'relatorios') h = telaRelatorios();
    else if (v.v === 'gasto') h = telaGasto(); else if (v.v === 'equipe') h = telaEquipe(); else if (v.v === 'camadas') h = telaCamadas();
    const txt = notaAberta && document.getElementById('cNota') ? document.getElementById('cNota').value : null;
    corpo.innerHTML = h;
    if (txt !== null){ const t = document.getElementById('cNota'); if (t){ t.value = txt; } }
    hidratar(corpo);
    if (v.v === 'equipe') NUV.abrirEquipe(document.getElementById('cEq'));
    if (v.v === 'mais' && EM_NUVEM && NUV.contarPedidos) NUV.contarPedidos().then(n => { const b = document.getElementById('cPed'); if (b){ b.hidden = !n; b.textContent = n; } });
    if (alt === 'baixa') altura('baixa', false);
  }
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
    else if (c === 'estacao'){ notaAberta = null; abrir({v:'estacao', id}); mostrarNoMapa(id); }
    else if (c === 'visita'){ const s = onde(id).s, novo = !(s && s.feito); if (novo && atual().v === 'hoje') focoHoje = id; marcarVisita(id, novo); desenhar(); }
    else if (c === 'proxima'){ focoHoje = null; notaAberta = null; desenhar(); corpo.scrollTop = 0; }
    else if (c === 'foto') iniciarFoto(id, true);
    else if (c === 'nota'){ notaAberta = notaAberta === id ? null : id; desenhar(); altura('alta'); const t = document.getElementById('cNota'); if (t) t.focus(); }
    else if (c === 'nota-ok'){ const t = document.getElementById('cNota'); buildLOC(); const w = LOC[id]; if (w && t){ const v = t.value.trim(); if (v !== (w.s.relato || '')){ snapshot(); w.s.relato = v; changed(); toast('Anotação salva.', true); } } notaAberta = null; desenhar(); }
    else if (c === 'nota-x'){ notaAberta = null; desenhar(); }
    else if (c === 'ver'){ mostrarNoMapa(id); altura('baixa'); }
    else if (c === 'gravar') iniciarGravacao();
    else if (c === 'pausar') pausarGravacao();
    else if (c === 'continuar') continuarGravacao();
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
  popupEst = (id) => { if (REG.on) return; notaAberta = null; if (pilha.length && atual().v === 'estacao') pilha.pop(); abrir({v:'estacao', id}, 'media'); };
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
  render = function(){ _render2(); topo(); if (!digitando()) desenhar(); };
  const _atuG = atualizarGravacaoUI;
  atualizarGravacaoUI = function(so){ _atuG(so); topo(); if (!so && !digitando() && (atual().v === 'hoje')) desenhar(); };
  const _gL = gpsLigar, _gD = gpsDesligar;
  gpsLigar = () => { _gL(); topo(); if (atual().v === 'hoje' && !digitando()) desenhar(); };
  gpsDesligar = () => { _gD(); topo(); if (atual().v === 'hoje' && !digitando()) desenhar(); };
  setInterval(() => { if (GPS.on && ['hoje', 'estacao'].includes(atual().v) && !digitando()) desenhar(); }, 20000);
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
