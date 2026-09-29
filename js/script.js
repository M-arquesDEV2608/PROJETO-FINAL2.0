const API_BASE = '/api';

const pageInfo = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral das ocorrências de manutenção.' },
  ocorrencias: { title: 'Ocorrências', subtitle: 'Consulte e atualize os chamados registrados.' },
  equipamentos: { title: 'Equipamentos', subtitle: 'Acompanhe a situação dos equipamentos por ambiente.' },
  detalhes: { title: 'Detalhes da ocorrência', subtitle: 'Informações e histórico do chamado selecionado.' },
  relatorios: { title: 'Relatórios', subtitle: 'Resumo dos dados registrados no sistema.' }
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR');
}

function statusLabel(status) {
  const map = { PENDENTE: 'Pendente', RESOLVIDA: 'Resolvida', ABERTA: 'Aberta', EM_ANALISE: 'Em análise', EM_MANUTENCAO: 'Em manutenção', CANCELADA: 'Cancelada' };
  return map[status] || status || '-';
}

function statusClass(status) {
  const map = { PENDENTE:'status-aberta', RESOLVIDA:'status-resolvida', ABERTA:'status-aberta', EM_ANALISE:'status-analise', EM_MANUTENCAO:'status-manutencao', CANCELADA:'status-cancelada' };
  return map[status] || 'status-analise';
}

function icon(name) {
  return ({ dashboard:'▦', ocorrencias:'⚠', equipamentos:'▣', relatorios:'▤', detalhes:'⌁', add:'＋', arrow:'→', check:'✓', clock:'◷' })[name] || '•';
}

function navLink(href, label, key, current) {
  return `<a href="${href}" class="${current === key ? 'active' : ''}"><span>${icon(key)}</span><span>${label}</span></a>`;
}

function renderLayout(page) {
  const app = document.getElementById('app');
  if (!app) return;
  const info = pageInfo[page] || pageInfo.dashboard;
  app.className = 'app';
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><div class="brand-icon">🛠</div><span>FixTrack</span></div>
      <nav class="nav">
        ${navLink('index.html','Dashboard','dashboard',page)}
        ${navLink('ocorrencias.html','Ocorrências','ocorrencias',page)}
        ${navLink('equipamentos.html','Equipamentos','equipamentos',page)}
        ${navLink('relatorios.html','Relatórios','relatorios',page)}
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div class="crumb">FixTrack / ${esc(info.title)}</div>
        <div class="user"><span>Equipe de manutenção</span><div class="avatar">FM</div></div>
      </header>
      <section class="content" id="page-content">
        <div class="title-row"><div><h1>${esc(info.title)}</h1><p class="subtitle">${esc(info.subtitle)}</p></div></div>
      </section>
    </main>`;

  if (page === 'dashboard') renderDashboard();
  if (page === 'ocorrencias') renderOcorrencias();
  if (page === 'equipamentos') renderEquipamentos();
  if (page === 'relatorios') renderRelatorios();
  if (page === 'detalhes') renderDetalhes();
}

async function getChamados() {
  const response = await fetch(`${API_BASE}/chamados`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function statCard(title, value, symbol) {
  return `<div class="card stat"><div><p>${esc(title)}</p><h3>${value}</h3></div><div class="stat-icon">${symbol}</div></div>`;
}

function chamadoRows(chamados, withAction = true) {
  if (!chamados.length) return `<tr><td colspan="6"><div class="empty">Nenhuma ocorrência registrada.</div></td></tr>`;
  return chamados.map(c => `
    <tr>
      <td>#${esc(c.id)}</td><td>${esc(c.sala)}</td><td>${esc(c.equipamento)}</td>
      <td><span class="badge ${statusClass(c.status)}">${esc(statusLabel(c.status))}</span></td>
      <td>${esc(formatDate(c.data))}</td>
      <td>${withAction ? `<a class="btn btn-light" href="detalhes.html?id=${encodeURIComponent(c.id)}">Ver</a>` : ''}</td>
    </tr>`).join('');
}

async function renderDashboard() {
  const content = document.getElementById('page-content');
  try {
    const chamados = await getChamados();
    const pendentes = chamados.filter(c => c.status === 'PENDENTE').length;
    const resolvidos = chamados.filter(c => c.status === 'RESOLVIDA').length;
    const salas = new Set(chamados.map(c => c.sala)).size;
    const equipamentos = new Set(chamados.map(c => c.equipamento)).size;
    content.innerHTML = `
      <div class="title-row"><div><h1>Dashboard</h1><p class="subtitle">Visão geral das ocorrências de manutenção.</p></div><a class="btn btn-primary" href="ocorrencias.html">${icon('add')} Ver ocorrências</a></div>
      <div class="cards">
        ${statCard('Total de chamados', chamados.length, '▣')}
        ${statCard('Pendentes', pendentes, '◷')}
        ${statCard('Resolvidos', resolvidos, '✓')}
        ${statCard('Salas afetadas', salas, '⌂')}
      </div>
      <div class="grid-2">
        <div class="card"><h2 class="card-title">Chamados recentes</h2><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Sala</th><th>Equipamento</th><th>Status</th><th>Data</th><th></th></tr></thead><tbody>${chamadoRows(chamados.slice(0,8))}</tbody></table></div></div>
        <div class="card"><h2 class="card-title">Resumo</h2><div class="quick"><a href="ocorrencias.html"><span>Ocorrências cadastradas</span><strong>${chamados.length}</strong></a><a href="equipamentos.html"><span>Equipamentos envolvidos</span><strong>${equipamentos}</strong></a><a href="relatorios.html"><span>Gerar relatório</span><span>${icon('arrow')}</span></a></div></div>
      </div>`;
  } catch (error) { showError(content, error); }
}

async function renderOcorrencias() {
  const content = document.getElementById('page-content');
  try {
    const chamados = await getChamados();
    content.innerHTML = `
      <div class="title-row"><div><h1>Ocorrências</h1><p class="subtitle">Consulte e atualize os chamados registrados.</p></div></div>
      <div class="card">
        <div class="filters"><input id="search" placeholder="Buscar sala ou equipamento..."><select id="statusFilter"><option value="">Todos os status</option><option value="PENDENTE">Pendente</option><option value="RESOLVIDA">Resolvida</option></select><button class="btn btn-light" id="clearFilter">Limpar</button></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Sala</th><th>Equipamento</th><th>Status</th><th>Data</th><th>Ação</th></tr></thead><tbody id="rows">${chamadoRows(chamados)}</tbody></table></div>
      </div>`;
    const update = () => {
      const q = document.getElementById('search').value.toLowerCase();
      const st = document.getElementById('statusFilter').value;
      const filtered = chamados.filter(c => (!q || `${c.sala} ${c.equipamento} ${c.descricao}`.toLowerCase().includes(q)) && (!st || c.status === st));
      document.getElementById('rows').innerHTML = chamadoRows(filtered);
    };
    document.getElementById('search').addEventListener('input', update);
    document.getElementById('statusFilter').addEventListener('change', update);
    document.getElementById('clearFilter').addEventListener('click', () => { document.getElementById('search').value=''; document.getElementById('statusFilter').value=''; update(); });
  } catch (error) { showError(content, error); }
}

async function renderEquipamentos() {
  const content = document.getElementById('page-content');
  try {
    const chamados = await getChamados();
    const groups = {};
    chamados.forEach(c => { const key = c.equipamento || 'Não informado'; groups[key] ||= { total:0, pendentes:0, resolvidos:0 }; groups[key].total++; if(c.status==='PENDENTE') groups[key].pendentes++; if(c.status==='RESOLVIDA') groups[key].resolvidos++; });
    const cards = Object.entries(groups).map(([name,g]) => `<div class="card mini"><strong>${g.total}</strong><span>${esc(name)}</span><p>${g.pendentes} pendente(s) · ${g.resolvidos} resolvido(s)</p></div>`).join('');
    content.innerHTML = `<div class="title-row"><div><h1>Equipamentos</h1><p class="subtitle">Acompanhe a situação dos equipamentos por ambiente.</p></div></div><div class="equipment-grid">${cards || '<div class="card empty">Nenhum equipamento registrado.</div>'}</div><div class="card"><h2 class="card-title">Ocorrências por equipamento</h2><div class="table-wrap"><table class="table"><thead><tr><th>Equipamento</th><th>Total</th><th>Pendentes</th><th>Resolvidos</th></tr></thead><tbody>${Object.entries(groups).map(([name,g])=>`<tr><td>${esc(name)}</td><td>${g.total}</td><td>${g.pendentes}</td><td>${g.resolvidos}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Sem dados.</div></td></tr>'}</tbody></table></div></div>`;
  } catch (error) { showError(content, error); }
}

async function renderRelatorios() {
  const content = document.getElementById('page-content');
  try {
    const chamados = await getChamados();
    const salas = {};
    chamados.forEach(c => { salas[c.sala] ||= {total:0, pendentes:0}; salas[c.sala].total++; if(c.status==='PENDENTE') salas[c.sala].pendentes++; });
    const max = Math.max(1, ...Object.values(salas).map(x=>x.total));
    const bars = Object.entries(salas).map(([s,g])=>`<div class="bar-row"><span>${esc(s)}</span><div class="bar"><i style="width:${(g.total/max)*100}%"></i></div><strong>${g.total}</strong></div>`).join('');
    content.innerHTML = `<div class="title-row"><div><h1>Relatórios</h1><p class="subtitle">Resumo dos dados registrados no sistema.</p></div><button class="btn btn-primary" onclick="window.print()">Imprimir relatório</button></div><div class="chart-grid"><div class="card"><h2 class="card-title">Chamados por sala</h2><div class="bars">${bars || '<div class="empty">Sem dados.</div>'}</div></div><div class="card"><h2 class="card-title">Indicadores</h2><div class="quick"><a><span>Total de chamados</span><strong>${chamados.length}</strong></a><a><span>Pendentes</span><strong>${chamados.filter(c=>c.status==='PENDENTE').length}</strong></a><a><span>Resolvidos</span><strong>${chamados.filter(c=>c.status==='RESOLVIDA').length}</strong></a></div></div></div>`;
  } catch (error) { showError(content, error); }
}

async function renderDetalhes() {
  const content = document.getElementById('page-content');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { content.innerHTML = `<div class="card empty">Nenhuma ocorrência foi selecionada.<br><br><a class="btn btn-primary" href="ocorrencias.html">Voltar para ocorrências</a></div>`; return; }
  try {
    const chamados = await getChamados();
    const c = chamados.find(x => String(x.id) === String(id));
    if (!c) throw new Error('Ocorrência não encontrada.');
    content.innerHTML = `<div class="title-row"><div><h1>Ocorrência #${esc(c.id)}</h1><p class="subtitle">Detalhes e atualização do chamado.</p></div><a class="btn btn-light" href="ocorrencias.html">← Voltar</a></div><div class="detail-grid"><div class="card"><h2 class="card-title">Informações</h2><div class="info-list"><div class="info-item"><span>Sala</span><strong>${esc(c.sala)}</strong></div><div class="info-item"><span>Equipamento</span><strong>${esc(c.equipamento)}</strong></div><div class="info-item"><span>Status</span><strong><span class="badge ${statusClass(c.status)}">${esc(statusLabel(c.status))}</span></strong></div><div class="info-item"><span>Data</span><strong>${esc(formatDate(c.data))}</strong></div><div class="info-item" style="grid-column:1/-1"><span>Descrição</span><strong>${esc(c.descricao || 'Sem descrição')}</strong></div></div><div class="actions"><select id="newStatus"><option value="PENDENTE" ${c.status==='PENDENTE'?'selected':''}>Pendente</option><option value="RESOLVIDA" ${c.status==='RESOLVIDA'?'selected':''}>Resolvida</option></select><button class="btn btn-primary" id="saveStatus">Salvar status</button></div></div><div class="card"><h2 class="card-title">Histórico</h2><div class="timeline"><div class="timeline-item"><strong>Chamado registrado</strong><p>${esc(formatDate(c.data))}</p></div><div class="timeline-item"><strong>Status atual: ${esc(statusLabel(c.status))}</strong><p>Último estado registrado no sistema.</p></div></div></div></div>`;
    document.getElementById('saveStatus').addEventListener('click', async () => {
      const status = document.getElementById('newStatus').value;
      const response = await fetch(`${API_BASE}/chamados/${encodeURIComponent(c.id)}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showToast('Status atualizado com sucesso.');
      setTimeout(() => location.reload(), 500);
    });
  } catch (error) { showError(content, error); }
}

function showError(target, error) {
  target.innerHTML = `<div class="card"><div class="empty">Não foi possível carregar os dados.<br><small>${esc(error.message || error)}</small><br><br><button class="btn btn-primary" onclick="location.reload()">Tentar novamente</button></div></div>`;
}

function showToast(message) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const el = document.createElement('div'); el.className='toast'; el.textContent=message; document.body.appendChild(el); setTimeout(()=>el.remove(),2500);
}

window.renderLayout = renderLayout;
