/* Linha completa 2026 + ficha do modelo (subpágina com cores, medidas e página do catálogo) */
(async () => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const E = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let D; try { const r = await fetch('data/modelos.json'); if (!r.ok) throw 0; D = await r.json(); } catch { return; }
  const MD = D.modelos, byId = Object.fromEntries(MD.map(m => [m.id, m]));
  const HEX = { 'Amarelo Leitoso': '#F3D84A', 'Amarelo Neon Leitoso': '#E9FF3B', 'Azul Leitoso': '#2F62C9', 'Azul Tiffany': '#6FD3CB', 'Azul Bebê': '#A8CDF0', 'Branco': '#F7F7F5', 'Dourado': '#C9A54E', 'Laranja Neon Leitoso': '#FF7B1C', 'Laranja Leitoso': '#F28A25', 'Prata': '#B7BBC2', 'Preto': '#1C1C1F', 'Rosa Leitoso': '#E8579E', 'Rosa Bebê': '#F6C5D6', 'Roxo Leitoso': '#6B3AA0', 'Verde Leitoso': '#2E9E4F', 'Vermelho Leitoso': '#C5202E', 'Amarelo Neon': '#F0FF2B', 'Azul Neon': '#1E6BFF', 'Azul Royal': '#1B3F9B', 'Laranja Neon': '#FF6A00', 'Rosa': '#F06AA6', 'Rosa Neon': '#FF2D8F', 'Roxo': '#7A35B5', 'Vermelho': '#D01F2F', 'Verde': '#1FA24B', 'Verde Neon': '#3CE63C', 'Cristal': '#E6EEF4', 'Fumê': '#55555B', 'Azul': '#2B6CD9' };
  const FIELDS = [['alt', 'Altura', 'cm'], ['boca', 'Boca (diâmetro)', 'cm'], ['base', 'Base (diâmetro)', 'cm'], ['peso', 'Peso unitário'], ['esp', 'Espessura da parede'], ['un', 'Quantidade por caixa', 'un'], ['cx', 'Medidas da caixa'], ['kg', 'Peso da caixa']];
  const fmt = (v, u) => typeof v === 'number' ? String(v).replace('.', ',') + ' ' + (u || '') : v + (u === 'un' ? '' : '');
  let filt = 'Todos', cur = null, sel = { vol: '', cor: '' };

  /* ---------- vitrine da linha completa ---------- */
  function grid() {
    const cs = ['Todos', ...new Set(MD.map(m => m.cat))];
    $('#mchips').innerHTML = cs.map(c => `<button class="chip ${c === filt ? 'on' : ''}" data-c="${E(c)}">${E(c)}</button>`).join('');
    $$('#mchips .chip').forEach(b => b.onclick = () => { filt = b.dataset.c; grid(); });
    $('#mgrid').innerHTML = MD.filter(m => filt === 'Todos' || m.cat === filt).map(m => `<article class="card mc" data-mod="${m.id}" tabindex="0" role="button" aria-label="Ver cores e medidas: ${E(m.nome)}"><div class="im"><img loading="lazy" alt="${E(m.nome)}" src="${m.foto}"></div><div class="bd"><h3>${E(m.nome)}</h3><p>${E(m.vols.join(' · '))}</p><span class="lnk ver">Ver cores e medidas →</span></div></article>`).join('');
    $$('#mgrid .mc').forEach(c => { const go = () => open(c.dataset.mod); c.onclick = go; c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
  }

  /* ---------- ficha (subpágina) ---------- */
  const F = document.createElement('div'); F.className = 'fh'; F.id = 'ficha'; F.hidden = true; F.setAttribute('role', 'dialog'); F.setAttribute('aria-modal', 'true'); F.setAttribute('aria-labelledby', 'fn'); document.body.appendChild(F);
  const sw = (n, tr) => `<button type="button" class="sw ${tr ? 'tr' : ''} ${n === 'Cristal' ? 'cr' : ''}" style="--c:${HEX[n] || '#ccc'}" data-cor="${E(n)}" aria-pressed="false"><i></i>${E(n)}</button>`;
  function open(id, push = true) {
    const m = byId[id]; if (!m) return; cur = m; sel = { vol: m.vols.length === 1 ? m.vols[0] : '', cor: '' };
    const i = MD.indexOf(m), pv = MD[i - 1], nx = MD[i + 1], c = m.cores;
    const hasC = c.s.length || c.t.length;
    F.innerHTML = `<div class="fh-in"><div class="fh-bar"><button class="btn ghost" id="fx">← Voltar</button><span class="mut">${E(m.cat)} · pág. ${m.pg} do catálogo</span></div>
<div class="fh-grid"><div class="fh-img"><img alt="${E(m.nome)}" src="${m.foto}"></div>
<div class="fh-info"><h2 id="fn">${E(m.nome)}</h2>${m.nota ? `<p class="mut">${E(m.nota)}</p>` : ''}
${m.vols.length ? `<h3>Capacidade</h3><div class="chips" id="fv">${m.vols.map(v => `<button type="button" class="chip" data-v="${E(v)}" aria-pressed="false">${E(v)}</button>`).join('')}</div>` : ''}
<div id="fm"></div>
<h3>Cores disponíveis</h3>
${hasC ? `${c.s.length ? `<p class="mut sub">Sólidas</p><div class="sws">${c.s.map(n => sw(n)).join('')}</div>` : ''}${c.t.length ? `<p class="mut sub">Translúcidas</p><div class="sws">${c.t.map(n => sw(n, 1)).join('')}</div>` : ''}` : ''}
${c.msg ? `<p class="mut">${E(c.msg)}</p>` : ''}
${m.paleta ? `<img class="fpal" alt="Cores do catálogo: ${E(m.nome)}" src="${m.paleta}" loading="lazy">` : ''}
${m.cat !== 'Acessórios' || m.id === 'tampas' ? `<label class="mut sub" for="fcor">Cor desejada ${hasC ? '(ou escolha acima)' : ''}</label><input type="text" id="fcor" placeholder="Ex.: azul bebê, preto, degradê rosa" maxlength="60">` : ''}
<div class="fh-buy"><div class="qty"><button type="button" aria-label="Menos" id="fqm">−</button><input type="number" id="fq" min="${m.min || 1}" value="${m.min || 50}" aria-label="Quantidade"><button type="button" aria-label="Mais" id="fqp">+</button></div><button class="btn" id="fadd">Adicionar ao pedido</button></div>
${m.min ? `<p class="mut">Pedido mínimo: ${m.min} unidades.</p>` : ''}
<p class="mut" id="fmsg" aria-live="polite"></p></div></div>
<details class="fpg" ${matchMedia('(min-width:900px)').matches ? 'open' : ''}><summary>Página ${m.pg} do catálogo</summary><a href="${E(D.pdf)}#page=${m.pg}" target="_blank" rel="noopener" class="btn ghost">Abrir o PDF nesta página</a><a href="${m.pagina}" target="_blank" rel="noopener"><img alt="Página ${m.pg} do catálogo Rei do Copo 2026" src="${m.pagina}" loading="lazy"></a></details>
<div class="fh-nav">${pv ? `<button class="btn ghost" data-go="${pv.id}">‹ ${E(pv.nome)}</button>` : '<span></span>'}${nx ? `<button class="btn ghost" data-go="${nx.id}">${E(nx.nome)} ›</button>` : ''}</div></div>`;
    wire(); F.hidden = false; F.scrollTop = 0; document.documentElement.classList.add('fh-on'); $('#fx').focus({ preventScroll: true });
    if (push && location.hash !== '#modelo-' + id) location.hash = 'modelo-' + id;
  }
  function wire() {
    const m = cur, set = () => {
      $$('#fv .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === sel.vol)), $$('#fv .chip').forEach(b => b.classList.toggle('on', b.dataset.v === sel.vol));
      $$('.sw').forEach(b => { const on = b.dataset.cor === sel.cor; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      const d = m.med.find(x => x.vol === sel.vol) || (m.med.length === 1 ? m.med[0] : null);
      $('#fm').innerHTML = d ? `<h3>Medidas${d.vol && d.vol !== sel.vol && sel.vol ? ` <small class="mut">(tabela de ${E(d.vol)})</small>` : ''}</h3><dl class="meds">${FIELDS.filter(f => d[f[0]] != null).map(f => `<div><dt>${f[1]}</dt><dd>${E(fmt(d[f[0]], f[2]))}</dd></div>`).join('')}</dl>` : (m.med.length ? '<p class="mut">Escolha a capacidade para ver as medidas.</p>' : '');
    };
    $$('#fv .chip').forEach(b => b.onclick = () => { sel.vol = b.dataset.v; set(); });
    $$('.sw').forEach(b => b.onclick = () => { sel.cor = sel.cor === b.dataset.cor ? '' : b.dataset.cor; if ($('#fcor')) $('#fcor').value = sel.cor; set(); });
    if ($('#fcor')) $('#fcor').oninput = e => { sel.cor = e.target.value.trim(); $$('.sw').forEach(b => { const on = b.dataset.cor === sel.cor; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); };
    const q = $('#fq'); $('#fqm').onclick = () => q.value = Math.max(m.min || 1, (+q.value || 0) - 10); $('#fqp').onclick = () => q.value = (+q.value || 0) + 10;
    $('#fx').onclick = close; $$('[data-go]').forEach(b => b.onclick = () => open(b.dataset.go));
    $('#fadd').onclick = () => {
      const n = Math.max(m.min || 1, +q.value || 0), msg = $('#fmsg');
      if (m.vols.length > 1 && !sel.vol) { msg.textContent = 'Escolha a capacidade antes de adicionar.'; return; }
      const cor = sel.cor || 'a definir', vol = sel.vol ? ' ' + sel.vol : '';
      if (typeof window.addCustom !== 'function') { msg.textContent = 'Pedido indisponível nesta página.'; return; }
      window.addCustom(`${m.id}|${sel.vol}|${cor}`, { qty: n, img: m.foto, label: `${m.nome}${vol ? ' · ' + sel.vol : ''} · cor: ${cor}`, text: `${m.nome}${vol} (cor: ${cor}; cód. ${m.id}, pág. ${m.pg} do catálogo)` });
      msg.textContent = `Adicionado: ${n} un. Veja em "Meu pedido".`;
    };
    set();
  }
  function close() { F.hidden = true; document.documentElement.classList.remove('fh-on'); if (location.hash.startsWith('#modelo-')) history.replaceState(null, '', location.pathname + location.search + '#modelos'); }
  addEventListener('keydown', e => { if (F.hidden) return; if (e.key === 'Escape') close(); });
  F.addEventListener('keydown', e => { if (e.key !== 'Tab') return; const f = $$('#ficha button,#ficha input,#ficha a,#ficha summary').filter(x => !x.disabled && x.offsetParent), a = f[0], z = f[f.length - 1]; if (!f.length) return; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } });
  const route = () => { const h = location.hash; if (h.startsWith('#modelo-') && byId[h.slice(8)]) open(h.slice(8), false); else if (!F.hidden) { F.hidden = true; document.documentElement.classList.remove('fh-on'); } };
  addEventListener('hashchange', route);
  window.openModelo = id => open(id);
  grid(); route();
})();
