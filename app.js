/**
 * LUBRIFICANTES E FILTROS - App Logic
 * Desenvolvedor: Elison Araujo
 */

(function () {
  'use strict';

  // ─── DOM REFS ─────────────────────────────────────────────────────────────
  const splash         = document.getElementById('splash');
  const app            = document.getElementById('app');
  const searchInput    = document.getElementById('searchInput');
  const btnClear       = document.getElementById('btnClear');
  const pillsScroll    = document.getElementById('pillsScroll');
  const equipmentList  = document.getElementById('equipmentList');
  const emptyState     = document.getElementById('emptyState');
  const resultsCount   = document.getElementById('resultsCount');
  const modalOverlay   = document.getElementById('modalOverlay');
  const modal          = document.getElementById('modal');
  const modalHeader    = document.getElementById('modalHeader');
  const modalIcon      = document.getElementById('modalIcon');
  const modalTitle     = document.getElementById('modalTitle');
  const modalSubtitle  = document.getElementById('modalSubtitle');
  const modalBody      = document.getElementById('modalBody');
  const modalClose     = document.getElementById('modalClose');
  const btnInfo        = document.getElementById('btnInfo');
  const infoOverlay    = document.getElementById('infoOverlay');
  const infoClose      = document.getElementById('infoClose');

  // ─── STATE ────────────────────────────────────────────────────────────────
  let activeCategory = 'Todos';
  let searchTerm     = '';

  function text(value) {
    return String(value || '').trim();
  }

  function isFilled(value) {
    const normalized = text(value);
    return normalized && normalized !== '-' && normalized !== '—' && normalized !== 'â€”';
  }

  function includesText(value, term) {
    return text(value).toLowerCase().includes(term);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  function getCategories() {
    const cats = ['Todos'];
    EQUIPAMENTOS.forEach(e => {
      if (!cats.includes(e.categoria)) cats.push(e.categoria);
    });
    return cats;
  }

  function renderPills() {
    const cats = getCategories();
    pillsScroll.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'pill' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        renderPills();
        renderList();
      });
      pillsScroll.appendChild(btn);
    });
  }

  // ─── FILTER ───────────────────────────────────────────────────────────────
  function getFiltered() {
    const term = searchTerm.toLowerCase().trim();
    return EQUIPAMENTOS.filter(e => {
      const matchCat  = activeCategory === 'Todos' || e.categoria === activeCategory;
      const matchTerm = !term ||
        includesText(e.nome, term) ||
        includesText(e.modelo, term) ||
        includesText(e.categoria, term) ||
        e.compartimentos.some(c =>
          includesText(c.nome, term) ||
          includesText(c.filtro, term) ||
          includesText(c.fluido, term) ||
          includesText(c.viscosidade, term) ||
          includesText(c.capacidade, term) ||
          includesText(c.descricao, term)
        );
      return matchCat && matchTerm;
    });
  }

  // ─── RENDER LIST ──────────────────────────────────────────────────────────
  function renderList() {
    const items = getFiltered();
    equipmentList.innerHTML = '';

    const total  = EQUIPAMENTOS.length;
    const shown  = items.length;
    resultsCount.textContent = shown === total
      ? `${total} equipamentos`
      : `${shown} de ${total} equipamentos`;

    if (items.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    items.forEach((equip, idx) => {
      const card = createEquipCard(equip, idx);
      equipmentList.appendChild(card);
    });
  }

  function createEquipCard(equip, idx) {
    const cor     = COR_BADGE[equip.cor] || COR_BADGE.blue;
    const nFiltros = equip.compartimentos.filter(c => isFilled(c.filtro)).length;
    const nFluido  = equip.compartimentos.filter(c => isFilled(c.fluido)).length;

    const card = document.createElement('div');
    card.className = 'equip-card';
    card.style.animationDelay = `${idx * 40}ms`;

    card.innerHTML = `
      <div class="equip-card-inner">
        <div class="equip-badge" style="background:${cor.bg}; border:1.5px solid ${cor.border}">
          ${equip.icone}
        </div>
        <div class="equip-info">
          <div class="equip-name">${equip.nome}</div>
          <div class="equip-model">${equip.modelo}</div>
          <div class="equip-tags">
            ${nFiltros ? `<span class="equip-tag filtros">🔩 ${nFiltros} filtro${nFiltros > 1 ? 's' : ''}</span>` : ''}
            ${nFluido  ? `<span class="equip-tag fluido">🛢️ ${nFluido} fluido${nFluido > 1 ? 's' : ''}</span>` : ''}
          </div>
        </div>
        <svg class="equip-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    `;

    card.addEventListener('click', () => openModal(equip));
    return card;
  }

  // ─── MODAL ────────────────────────────────────────────────────────────────
  function openModal(equip) {
    const cor = COR_BADGE[equip.cor] || COR_BADGE.blue;

    // Header gradient
    modalHeader.style.background = `linear-gradient(135deg, ${cor.bg} 0%, transparent 100%)`;
    modalHeader.style.borderBottom = `1px solid ${cor.border}`;

    // Icon
    modalIcon.textContent    = equip.icone;
    modalIcon.style.background = cor.bg;
    modalIcon.style.border   = `1.5px solid ${cor.border}`;

    // Titles
    modalTitle.textContent    = equip.nome;
    modalSubtitle.textContent = `${equip.categoria} • ${equip.modelo}`;

    // Body
    modalBody.innerHTML = '';

    // Section: Filtros
    const compComFiltro = equip.compartimentos.filter(c => isFilled(c.filtro));
    if (compComFiltro.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'comp-section-title';
      sec.textContent = '🔩 Filtros por Compartimento';
      modalBody.appendChild(sec);
      compComFiltro.forEach(comp => modalBody.appendChild(createCompCard(comp, true)));
    }

    // Section: Fluidos
    const compComFluido = equip.compartimentos.filter(c => isFilled(c.fluido));
    if (compComFluido.length > 0) {
      const sec = document.createElement('div');
      sec.className = 'comp-section-title';
      sec.textContent = '🛢️ Fluidos por Compartimento';
      modalBody.appendChild(sec);
      compComFluido.forEach(comp => modalBody.appendChild(createCompCard(comp, false)));
    }

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function createCompCard(comp, showFiltro) {
    const cor = COR_BADGE[comp.cor] || COR_BADGE.blue;

    const card = document.createElement('div');
    card.className = 'comp-card';
    card.style.borderColor = cor.border;

    let rows = '';

    if (showFiltro && isFilled(comp.filtro)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label filtro">Filtro</span>
          <span class="comp-row-value"><span class="badge">${comp.filtro}</span></span>
        </div>`;
    }

    if (!showFiltro && isFilled(comp.fluido)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label fluido">Fluido</span>
          <span class="comp-row-value">${comp.fluido}</span>
        </div>`;
    }

    if (isFilled(comp.capacidade)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label capacidade">Volume</span>
          <span class="comp-row-value"><span class="badge green">${comp.capacidade}</span></span>
        </div>`;
    }

    if (isFilled(comp.viscosidade)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label viscosidade">Viscos.</span>
          <span class="comp-row-value"><span class="badge" style="background:rgba(139,92,246,0.15);border-color:rgba(139,92,246,0.3);color:#c4b5fd">${comp.viscosidade}</span></span>
        </div>`;
    }

    if (isFilled(comp.periodicidade)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label capacidade">Troca</span>
          <span class="comp-row-value"><span class="badge green">${comp.periodicidade} h</span></span>
        </div>`;
    }

    if (showFiltro && isFilled(comp.descricao)) {
      rows += `
        <div class="comp-row">
          <span class="comp-row-label">SAP</span>
          <span class="comp-row-value">${comp.descricao}</span>
        </div>`;
    }

    card.innerHTML = `
      <div class="comp-name">
        <div class="comp-name-dot" style="background:${cor.text}"></div>
        ${comp.nome}
      </div>
      <div class="comp-rows">${rows}</div>
    `;

    return card;
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ─── SEARCH EVENTS ────────────────────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    btnClear.classList.toggle('hidden', !searchTerm);
    renderList();
  });

  btnClear.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    btnClear.classList.add('hidden');
    searchInput.focus();
    renderList();
  });

  // Modal events
  modalClose.addEventListener('click', closeModal);

  // ─── INFO MODAL ───────────────────────────────────────────────────────────
  btnInfo.addEventListener('click', () => {
    infoOverlay.classList.remove('hidden');
  });

  infoClose.addEventListener('click', () => {
    infoOverlay.classList.add('hidden');
  });

  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) infoOverlay.classList.add('hidden');
  });

  // WhatsApp Click
  const whatsappBtn = document.getElementById('whatsappBtn');
  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', (e) => {
      // No mobile, _system abre o app ou navegador padrão
      // Se estiver no browser normal, o link do HTML já funciona, 
      // mas o window.open com _system ajuda no Capacitor
      if (window.Capacitor) {
        e.preventDefault();
        window.open("https://wa.me/5594991014378", '_system');
      }
    });
  }

  // ─── SPLASH ───────────────────────────────────────────────────────────────
  function hideSplash() {
    splash.classList.add('fade-out');
    app.classList.remove('hidden');
    setTimeout(() => splash.classList.add('hidden'), 500);
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    renderPills();
    renderList();
    setTimeout(hideSplash, 1800);
  }

  init();

})();
