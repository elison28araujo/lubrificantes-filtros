import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeFirestore, doc, setDoc, addDoc, writeBatch, serverTimestamp, getDoc, onSnapshot, enableIndexedDbPersistence, collection, query, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

/**
 * LUBRIFICANTES E FILTROS - App Logic
 * Desenvolvedor: Elison Araujo
 */

(function () {
  'use strict';

  // Initialize Firebase (Modular)
  let db = null;
  try {
    const app = initializeApp(firebaseConfig);
    // IMPORTANTE: Definindo o banco de dados exato e forçando Long Polling para evitar quedas em tablets/redes 3G
    db = initializeFirestore(app, { experimentalForceLongPolling: true }, "ai-studio-9dc8c906-c888-4a53-973f-6fca4ed7c111");
    
    // Ativa Persistência Offline do Firebase (IndexedDB)
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Lubetrack: Persistência offline falhou:", err.code);
    });

    console.log("Lubetrack V3: Conexão forçada ao banco AI-STUDIO com Long Polling (Modular SDK).");
  } catch (err) {
    console.error("Lubetrack: Erro ao carregar Firebase:", err);
  }

  // Device ID for tracking
  let deviceId = localStorage.getItem('lubetrack_device_id');
  if (!deviceId) {
    const customName = prompt('BEM-VINDO! 🚀\nDefina o nome deste tablet/dispositivo:\n(Ex: COMBOIO-01, TAB-JOAO)');
    if (customName && customName.trim() !== '') {
      deviceId = customName.trim().toUpperCase().replace(/\s+/g, '_');
    } else {
      deviceId = 'TAB-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
    localStorage.setItem('lubetrack_device_id', deviceId);
  }

  // ─── SECURITY SYNC (Real-time Whitelist) ──────────────────────────────────
  function initSecuritySync() {
    if (!db) {
      // Sem banco de dados, bloquear por segurança
      showBlockedScreen('Sem conexão com o banco de dados.');
      return;
    }
    const devDocRef = doc(db, 'config', 'devices');

    // SEGURANÇA: Mostra tela de bloqueio IMEDIATAMENTE enquanto verifica.
    // Só libera o app quando o Firebase confirmar que o dispositivo está autorizado.
    const appEl = document.getElementById('app');
    const splashEl = document.getElementById('splash');

    // MODO OFFLINE: Se estiver offline e já tiver autorização em cache, libera direto
    if (!navigator.onLine && localStorage.getItem('lubetrack_is_authorized') === 'true') {
      console.log("Lubetrack: Inicialização offline rápida com autorização em cache.");
      if (splashEl) splashEl.style.display = 'none';
      if (appEl) {
        appEl.style.display = '';
        appEl.classList.remove('hidden');
      }
      // Podemos prosseguir para tentar conectar, mas não trava a tela
    } else {
      if (appEl) appEl.style.display = 'none';
      if (splashEl) splashEl.style.display = 'flex';
    }

    onSnapshot(devDocRef, (docSnap) => {
      let isAuthorized = false;

      if (docSnap.exists()) {
        const authorizedList = docSnap.data().list || [];
        isAuthorized = authorizedList.includes(deviceId);
      }

      localStorage.setItem('lubetrack_is_authorized', isAuthorized ? 'true' : 'false');

      const securityBlock = document.getElementById('securityBlock');
      if (isAuthorized) {
        console.log(`Lubetrack: Dispositivo ${deviceId} AUTORIZADO.`);
        if (securityBlock) {
          securityBlock.style.display = 'none';
          securityBlock.classList.add('hidden');
        }
        // Correção: Esconder o splash e mostrar o app mantendo o layout flexbox
        const splashEl = document.getElementById('splash');
        const appEl = document.getElementById('app');
        if (splashEl) splashEl.style.display = 'none';
        if (appEl) {
          appEl.style.display = '';
          appEl.classList.remove('hidden');
        }
      } else {
        console.warn(`Lubetrack: Dispositivo ${deviceId} NAO autorizado.`);
        showBlockedScreen();
      }
    }, (error) => {
      console.error('Erro no listener de segurança:', error);
      showBlockedScreen('Erro ao verificar autorização. Verifique a conexão.');
    });
  }

  function showBlockedScreen(motivo) {
    const securityBlock = document.getElementById('securityBlock');
    const content = document.getElementById('securityBlockContent');
    if (!securityBlock || !content) return;

    securityBlock.style.display = 'flex';
    securityBlock.classList.remove('hidden');

    content.innerHTML = `
        <div style="background:rgba(239,68,68,0.1); padding:20px; border-radius:50%; margin-bottom:20px; border: 2px solid #ef4444; display: inline-block;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h1 style="font-size:24px; font-weight:800; margin-bottom:10px; color:white;">ACESSO NEGADO</h1>
        <p style="opacity:0.7; max-width:300px; line-height:1.6; margin: 0 auto 30px auto; color:white;">
          ${motivo || `Este tablet não está na lista de dispositivos autorizados pelo PCM.`}
        </p>
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; font-size:13px; border: 1px solid rgba(255,255,255,0.1); margin-bottom:15px; color:white;">
          ID DO DISPOSITIVO:<br><strong style="font-size:15px; color:#ef4444;">${deviceId}</strong>
        </div>
        <p style="font-size:11px; margin-top:20px; opacity:0.4; color:white;">Informe este ID ao PCM para ser autorizado.</p>
    `;
  }

  if (db) initSecuritySync();

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
  const modalActions   = document.getElementById('modalActions');
  const modalClose     = document.getElementById('modalClose');
  const btnInfo        = document.getElementById('btnInfo');
  const infoOverlay    = document.getElementById('infoOverlay');
  const infoClose      = document.getElementById('infoClose');

  // New Control Refs
  const navItems       = document.querySelectorAll('.nav-item');
  const views          = document.querySelectorAll('.view');
  const formEntry      = document.getElementById('formEntry');
  const entryEquip     = document.getElementById('entryEquip');
  const entryComp      = document.getElementById('entryComp');
  const entryHoro      = document.getElementById('entryHoro');
  const entryQty       = document.getElementById('entryQty');
  const entryReason    = document.getElementById('entryReason');
  const entryUser      = document.getElementById('entryUser');
  const qtyLimitHint   = document.getElementById('qtyLimitHint');
  const inventoryList  = document.getElementById('inventoryList');
  const historyList    = document.getElementById('historyList');
  const inventorySearch = document.getElementById('inventorySearch');
  const inventoryStats  = document.getElementById('inventoryStats');
  const btnSyncInventory = document.getElementById('btnSyncInventory');
  const cloudStatus     = document.getElementById('cloudStatus');

  const entryEquipSearch = document.getElementById('entryEquipSearch');
  const entryFrota      = document.getElementById('entryFrota');
  const btnUMCA         = document.getElementById('btnUMCA');
  const btnUMGE         = document.getElementById('btnUMGE');
  const entryUnidade    = document.getElementById('entryUnidade');

  // ─── STATE ────────────────────────────────────────────────────────────────
  let activeCategory = 'Todos';
  let searchTerm     = '';
  let activeView     = 'Catalog';
  let entryType      = 'fluido'; // Foco exclusivo em lubrificantes agora

  // Control Data
  let inventory = JSON.parse(localStorage.getItem('lubetrack_inventory') || '{}');
  let history   = JSON.parse(localStorage.getItem('lubetrack_history') || '[]');
  let isComboio = false;
  let comboioData = null;

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

  let currentEquipInModal = null;
  let activeModalTab      = 'filtros';

  // ─── MODAL ────────────────────────────────────────────────────────────────
  function openModal(equip) {
    currentEquipInModal = equip;
    activeModalTab      = 'filtros'; // Inicia sempre em filtros
    
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

    renderModalContent();

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function renderModalContent() {
    if (!currentEquipInModal) return;
    const equip = currentEquipInModal;

    // Actions
    modalActions.innerHTML = `
      <button class="btn-action filtros ${activeModalTab === 'filtros' ? 'active' : ''}" id="tabFiltros">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Filtros
      </button>
      <button class="btn-action lubrificantes ${activeModalTab === 'lubrificantes' ? 'active' : ''}" id="tabLubrificantes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Lubrificantes
      </button>
    `;

    // Event listeners para as abas
    document.getElementById('tabFiltros').addEventListener('click', () => {
      activeModalTab = 'filtros';
      renderModalContent();
    });
    document.getElementById('tabLubrificantes').addEventListener('click', () => {
      activeModalTab = 'lubrificantes';
      renderModalContent();
    });

    // Body
    // Limpamos apenas o conteúdo abaixo dos botões
    const oldContent = modalBody.querySelectorAll('.comp-section-title, .comp-card, .empty-state');
    oldContent.forEach(el => el.remove());

    if (activeModalTab === 'filtros') {
      const compComFiltro = equip.compartimentos.filter(c => isFilled(c.filtro));
      if (compComFiltro.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'comp-section-title';
        sec.textContent = '🔩 Filtros por Compartimento';
        modalBody.appendChild(sec);
        compComFiltro.forEach(comp => modalBody.appendChild(createCompCard(comp, true)));
      } else {
        renderEmptyTab('Nenhum filtro cadastrado');
      }
    } else {
      const compComFluido = equip.compartimentos.filter(c => isFilled(c.fluido));
      if (compComFluido.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'comp-section-title';
        sec.textContent = '🛢️ Fluidos por Compartimento';
        modalBody.appendChild(sec);
        
        equip.compartimentos.forEach((comp, idx) => {
          if (isFilled(comp.fluido)) {
            modalBody.appendChild(createCompCard(comp, false, idx));
          }
        });
      } else {
        renderEmptyTab('Nenhum lubrificante cadastrado');
      }
    }
  }

  function renderEmptyTab(msg) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.style.padding = '40px 0';
    div.innerHTML = `<p style="font-size:14px; opacity:0.6">${msg}</p>`;
    modalBody.appendChild(div);
  }

  function createCompCard(comp, showFiltro, compIdx) {
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

    if (!showFiltro && isFilled(comp.fluido)) {
      let hasStock = true;
      if (isComboio && comboioData) {
        const compartments = comboioData.compartments || [];
        const hasFluidOnComboio = compartments.some(cp => cp.item === comp.fluido && cp.current > 0);
        if (!hasFluidOnComboio) {
          hasStock = false;
        }
      }

      card.innerHTML = `
        <div class="comp-header-flex">
          <div class="comp-name">
            <div class="comp-name-dot" style="background:${cor.text}"></div>
            ${comp.nome}
          </div>
          ${hasStock ? `
            <button class="btn-launch-comp" data-equip="${currentEquipInModal.nome}" data-comp-idx="${compIdx}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              LANÇAR
            </button>
          ` : `
            <span style="font-size:11px; padding:4px 8px; border-radius:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444; font-weight:700;">NÃO CARREGADO</span>
          `}
        </div>
        <div class="comp-rows">${rows}</div>
      `;

      if (hasStock) {
        card.querySelector('.btn-launch-comp').addEventListener('click', (e) => {
          const eq = e.currentTarget.dataset.equip;
          const idx = e.currentTarget.dataset.compIdx;
          closeModal();
          switchView('Entry');
          setTimeout(() => prefillEntry(eq, idx), 100);
        });
      }
    } else {
      card.innerHTML = `
        <div class="comp-name">
          <div class="comp-name-dot" style="background:${cor.text}"></div>
          ${comp.nome}
        </div>
        <div class="comp-rows">${rows}</div>
      `;
    }

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

  function showAuthModal(title, desc) {
    return new Promise((resolve) => {
      const modal = document.getElementById('authModal');
      const input = document.getElementById('authInput');
      const btnConfirm = document.getElementById('authConfirm');
      const btnCancel = document.getElementById('authCancel');
      
      document.getElementById('authTitle').textContent = title;
      document.getElementById('authDesc').textContent = desc;
      input.value = '';
      modal.classList.remove('hidden');
      input.focus();

      const cleanup = (val) => {
        modal.classList.add('hidden');
        btnConfirm.onclick = null;
        btnCancel.onclick = null;
        input.onkeydown = null;
        resolve(val);
      };

      btnConfirm.onclick = () => cleanup(input.value);
      btnCancel.onclick = () => cleanup(null);
      input.onkeydown = (e) => {
        if (e.key === 'Enter') cleanup(input.value);
        if (e.key === 'Escape') cleanup(null);
      };
    });
  }

  // ─── SPLASH ───────────────────────────────────────────────────────────────
  function hideSplash() {
    splash.classList.add('fade-out');
    setTimeout(() => splash.classList.add('hidden'), 500);

    const isAuth = localStorage.getItem('lubetrack_auth') === 'true';
    if (!isAuth) {
      const lockScreen = document.getElementById('lockScreen');
      lockScreen.style.display = 'flex';
      lockScreen.classList.remove('hidden');
      
      document.getElementById('btnUnlock').addEventListener('click', () => {
        const pin = document.getElementById('pinInput').value;
        if (pin === 'UMCA2026') {
          localStorage.setItem('lubetrack_auth', 'true');
          lockScreen.classList.add('fade-out');
          setTimeout(() => {
            lockScreen.style.display = 'none';
            app.classList.remove('hidden');
          }, 500);
        } else {
          alert('Senha incorreta!');
        }
      });
    } else {
      app.classList.remove('hidden');
    }
  }

  // ─── CONTROL MODULE (LUBETRACK) ──────────────────────────────────────────
  
  function switchView(viewName) {
    activeView = viewName;
    views.forEach(v => v.classList.add('hidden'));
    document.getElementById(`view${viewName}`).classList.remove('hidden');

    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    if (viewName === 'Entry') prepareEntryView();
    if (viewName === 'Inventory') renderInventory();
    if (viewName === 'History') renderHistory();
    if (viewName === 'Maintenance') {
      if (typeof montarChecklist === 'function') montarChecklist();
      if (typeof renderizarHistoricoMaint === 'function') renderizarHistoricoMaint();
      if (typeof atualizarDashboardMaint === 'function') atualizarDashboardMaint();
    }
  }

  function prefillEntry(equipName, compIdx) {
    entryEquip.value = equipName;
    if (entryEquipSearch) entryEquipSearch.value = equipName;
    entryEquip.dispatchEvent(new Event('change'));
    
    setTimeout(() => {
      entryComp.value = compIdx;
      entryComp.dispatchEvent(new Event('change'));
      
      // Auto-fill quantity from capacity string (extract numeric part)
      const equip = EQUIPAMENTOS.find(e => e.nome === equipName);
      const comp = equip.compartimentos[compIdx];
      if (comp && comp.capacidade) {
        const numericQty = parseFloat(comp.capacidade.replace(',', '.').replace(/[^0-9.]/g, ''));
        if (!isNaN(numericQty)) {
          entryQty.value = numericQty;
        }
      }
      
      entryHoro.focus();
    }, 100);
  }

  // Navigation Events
  navItems.forEach(item => {
    item.addEventListener('click', () => switchView(item.dataset.view));
  });

  // Entry View Logic
  function prepareEntryView() {
    // Reset search
    if (entryEquipSearch) entryEquipSearch.value = '';
    if (entryEquip) entryEquip.value = '';
    
    // Populate equipments
    populateEquipSelect();
    
    // Reset comp select
    entryComp.innerHTML = '<option value="">Selecione primeiro o equipamento...</option>';
    qtyLimitHint.textContent = '';

    // Reset unit
    setUnidade('UMCA');
  }

  function populateEquipSelect(filter = '') {
    const term = filter.toLowerCase().trim();
    const list = document.getElementById('equipDropdownList');
    if (!list) return;

    list.innerHTML = '';
    
    const filtered = EQUIPAMENTOS.filter(eq => 
      !term || eq.nome.toLowerCase().includes(term) || eq.modelo.toLowerCase().includes(term)
    );

    if (filtered.length === 0) {
      list.innerHTML = '<div class="dropdown-item" style="opacity:0.5; pointer-events:none;">Nenhum equipamento encontrado</div>';
    } else {
      filtered.forEach(eq => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `
          <strong>${eq.nome}</strong>
          <span class="model-hint">${eq.modelo}</span>
        `;
        item.addEventListener('click', () => {
          entryEquip.value = eq.nome;
          entryEquipSearch.value = eq.nome;
          list.classList.add('hidden');
          
          // Dispara o evento de mudança manualmente para carregar os compartimentos
          const event = new Event('change');
          entryEquip.dispatchEvent(event);
        });
        list.appendChild(item);
      });
    }
  }

  if (entryEquipSearch) {
    entryEquipSearch.addEventListener('focus', () => {
      populateEquipSelect(entryEquipSearch.value);
      document.getElementById('equipDropdownList').classList.remove('hidden');
    });

    entryEquipSearch.addEventListener('input', (e) => {
      populateEquipSelect(e.target.value);
      document.getElementById('equipDropdownList').classList.remove('hidden');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
      const container = document.getElementById('equipSearchContainer');
      const list = document.getElementById('equipDropdownList');
      if (container && !container.contains(e.target) && !list.contains(e.target)) {
        list.classList.add('hidden');
      }
    });
  }

  function setUnidade(un) {
    if (!entryUnidade) return;
    entryUnidade.value = un;
    if (btnUMCA && btnUMGE) {
      btnUMCA.classList.toggle('active', un === 'UMCA');
      btnUMGE.classList.toggle('active', un === 'UMGE');
    }
  }

  if (btnUMCA) btnUMCA.addEventListener('click', () => setUnidade('UMCA'));
  if (btnUMGE) btnUMGE.addEventListener('click', () => setUnidade('UMGE'));

  entryEquip.addEventListener('change', () => {
    const equipName = entryEquip.value;
    if (!equipName) return;

    const equip = EQUIPAMENTOS.find(e => e.nome === equipName);
    if (!equip) return;

    entryComp.innerHTML = '<option value="">Selecione o compartimento...</option>';
    
    // Mostra apenas compartimentos que possuem fluidos, guardando o índice original
    equip.compartimentos.forEach((c, idx) => {
      if (isFilled(c.fluido)) {
        if (isComboio && comboioData) {
          const compartments = comboioData.compartments || [];
          const hasFluid = compartments.some(cp => cp.item === c.fluido && cp.current > 0);
          if (!hasFluid) return;
        }
        const opt = document.createElement('option');
        opt.value = idx; 
        opt.textContent = `${c.nome} (${c.fluido})`;
        entryComp.appendChild(opt);
      }
    });
    qtyLimitHint.textContent = '';
  });

  entryComp.addEventListener('change', () => {
    const equipName = entryEquip.value;
    const compIdx   = entryComp.value;
    if (!equipName || compIdx === "") return;

    const equip = EQUIPAMENTOS.find(e => e.nome === equipName);
    const comp  = equip.compartimentos[compIdx];
    
    if (comp && isFilled(comp.capacidade)) {
      qtyLimitHint.textContent = `Capacidade técnica do compartimento: ${comp.capacidade}`;
    } else {
      qtyLimitHint.textContent = '';
    }
  });

  formEntry.addEventListener('submit', (e) => {
    e.preventDefault();
    const equipName = entryEquip.value;
    const compIdx   = entryComp.value;
    const qty       = parseFloat(entryQty.value);
    const horo      = entryHoro.value;
    const user      = entryUser.value;
    const reason    = entryReason.value;

    if (!equipName || compIdx === "" || isNaN(qty)) return;

    const equip = EQUIPAMENTOS.find(e => e.nome === equipName);
    const comp  = equip.compartimentos[compIdx];
    const item  = comp.fluido;

    // 1. Validação de Estoque (Prioritário)
    const currentStock = (inventory[item] ? inventory[item].current : 0);
    if (qty > currentStock) {
      alert(`ERRO: Estoque insuficiente! \nProduto: ${item} \nSaldo atual: ${currentStock}L \nNecessário: ${qty}L`);
      return;
    }

    // 2. Validação de Capacidade do Compartimento
    if (isFilled(comp.capacidade)) {
      const capMatch = comp.capacidade.match(/[\d,.]+/);
      if (capMatch) {
        const capValue = parseFloat(capMatch[0].replace(',', '.'));
        if (qty > capValue) {
          alert(`BLOQUEADO: A quantidade digitada (${qty}L) excede a capacidade técnica do compartimento (${comp.capacidade}). \nPor favor, corrija o valor para corresponder à ficha técnica.`);
          return;
        }
      }
    }

    // Create entry
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      equip: equipName,
      comp: comp.nome,
      item,
      qty,
      horo,
      frota: entryFrota ? entryFrota.value : '',
      unidade: entryUnidade ? entryUnidade.value : 'UMCA',
      user,
      reason,
      type: 'fluido',
      device: deviceId
    };

    // Update history
    history.unshift(entry);
    if (history.length > 50) history.pop();
    saveHistory();

    // Update stock
    inventory[item].current -= qty;
    saveInventory();

    if (isComboio && comboioData) {
      let remainingToDeduct = qty;
      const updatedComps = (comboioData.compartments || []).map(cp => {
        if (cp.item === item && remainingToDeduct > 0 && cp.current > 0) {
          const deduct = Math.min(cp.current, remainingToDeduct);
          remainingToDeduct -= deduct;
          return { ...cp, current: cp.current - deduct };
        }
        return cp;
      });
      
      if (remainingToDeduct > 0) {
        for (let i = 0; i < updatedComps.length; i++) {
          if (updatedComps[i].item === item && remainingToDeduct > 0) {
            const deduct = Math.min(updatedComps[i].current, remainingToDeduct);
            remainingToDeduct -= deduct;
            updatedComps[i].current -= deduct;
          }
        }
      }
      comboioData.compartments = updatedComps;
    }

    // Success and Reset
    formEntry.reset();
    switchView('History');

    // Auto-Sync silently
    syncToFirebase(true);
  });
  // History Logic
  function saveHistory() {
    localStorage.setItem('lubetrack_history', JSON.stringify(history));
  }

  // Inventory Logic
  function saveInventory() {
    localStorage.setItem('lubetrack_inventory', JSON.stringify(inventory));
  }

  function renderInventory() {
    const term = inventorySearch.value.toLowerCase();
    
    if (isComboio && comboioData) {
      inventoryList.innerHTML = '';
      inventoryStats.textContent = `🚛 Comboio ${comboioData.name}`;
      
      const compartments = comboioData.compartments || [];
      const filteredComps = compartments.filter(comp => {
        const itemMatch = comp.item && comp.item.toLowerCase().includes(term);
        const compMatch = `comp ${comp.number}`.includes(term) || `compartimento ${comp.number}`.includes(term);
        return !term || itemMatch || compMatch;
      });

      filteredComps.forEach(comp => {
        const pct = comp.capacity > 0 ? Math.round((comp.current / comp.capacity) * 100) : 0;
        const isCritical = comp.item && pct < 20; // Critical warning if less than 20% loaded
        
        const card = document.createElement('div');
        card.className = `inventory-card ${isCritical ? 'critical' : ''}`;
        
        card.innerHTML = `
          <div class="inv-header">
            <div class="inv-name">Compartimento ${comp.number}</div>
            <div style="font-size:11px; opacity:0.5;">Capacidade: ${comp.capacity}L</div>
          </div>
          <div class="inv-body">
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
              <div style="font-weight:700; font-size:14px; color:var(--text);">${comp.item || '<span style="opacity:0.3; font-style:italic;">[Vazio / Não Configurado]</span>'}</div>
              <div class="progress-bar-bg" style="background:rgba(255,255,255,0.06); height:6px; border-radius:3px; overflow:hidden; width:100%; margin-top:4px;">
                <div class="progress-bar-fill" style="height:100%; background:linear-gradient(90deg, var(--secondary) 0%, #10b981 100%); width:${Math.min(pct, 100)}%; transition: width 0.3s;"></div>
              </div>
            </div>
            <div class="inv-qty-wrap" style="text-align:right; margin-left:15px;">
              <span class="inv-qty" style="font-size:22px; font-weight:800;">${comp.current.toFixed(1)}</span>
              <span class="inv-unit" style="font-size:12px; opacity:0.5;">L</span>
              <div style="font-size:10px; opacity:0.5; margin-top:2px;">${pct}%</div>
            </div>
          </div>
        `;
        inventoryList.appendChild(card);
      });
      return;
    }

    // Filtra apenas lubrificantes
    const items = Object.entries(inventory).filter(([name, data]) => {
      const isFiltro = name.toLowerCase().includes('filtro') || data.unit === 'un';
      return !isFiltro && name.toLowerCase().includes(term);
    });
    
    inventoryList.innerHTML = '';
    inventoryStats.textContent = `${items.length} lubrificantes no controle`;

    items.sort((a, b) => a[0].localeCompare(b[0])).forEach(([name, data]) => {
      const isCritical = data.current <= data.min;
      const card = document.createElement('div');
      card.className = `inventory-card ${isCritical ? 'critical' : ''}`;
      
      card.innerHTML = `
        <div class="inv-header">
          <div class="inv-name">${name}</div>
          <button class="btn-edit-stock" data-item="${name}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
        <div class="inv-body">
          <div class="inv-qty-wrap">
            <span class="inv-qty">${data.current % 1 === 0 ? data.current : data.current.toFixed(1)}</span>
            <span class="inv-unit">${data.unit || 'L'}</span>
          </div>
          <div class="inv-min">
            <div class="inv-min-label">Mínimo</div>
            <div class="inv-min-val">${data.min}</div>
          </div>
        </div>
      `;

      card.querySelector('.btn-edit-stock').addEventListener('click', async () => {
        // Proteção por senha
        const pass = await showAuthModal('Ação Restrita', 'Digite a senha do PCM para ajustar o estoque:');
        if (pass === null) return;
        if (pass !== 'UMCA123456') {
          alert('Senha incorreta!');
          return;
        }

        // Pergunta o código de autorização para entrada de estoque
        const codigo = await showAuthModal('Autorização', 'Digite o seu CÓDIGO de autorização para entrada de estoque:');
        const mapaCodigos = {
          "1234": "Elison Araujo",
          "12345": "Tiago Vidal",
          "123456": "Rodrigo Brito"
        };
        
        const responsavel = mapaCodigos[codigo];
        if (!responsavel) {
          if (codigo !== null) alert('Código de autorização inválido ou não autorizado.');
          return;
        }

        const newQtyStr = prompt(`Nova quantidade TOTAL para ${name}:`, data.current);
        if (newQtyStr !== null) {
          const oldQty = data.current;
          const newQty = parseFloat(newQtyStr.replace(',', '.'));
          if (isNaN(newQty)) { alert("Quantidade inválida."); return; }
          
          const diff = newQty - oldQty;
          data.current = newQty;

          const newMin = prompt(`Novo limite mínimo para ${name}:`, data.min);
          if (newMin !== null) data.min = parseFloat(newMin);

          let unidade = prompt(`Qual a UNIDADE? (Digite UMCA ou UMGE)`, 'UMCA');
          if (unidade === null) return; // cancelou
          unidade = unidade.trim().toUpperCase();
          if (unidade !== 'UMCA' && unidade !== 'UMGE') unidade = 'UMCA'; // fallback

          let frota = prompt(`Qual a FROTA relacionada? (Deixe em branco se não houver)`, '');
          if (frota === null) return; // cancelou

          // Se houve alteração na quantidade, registra no histórico como ENTRADA
          if (diff !== 0) {
            const entry = {
              id: Date.now(),
              date: new Date().toISOString(),
              equip: "AJUSTE/ENTRADA",
              comp: "-",
              item: name,
              qty: -diff, // Usamos negativo para que ao subtrair no PCM adicione ao estoque
              user: responsavel.trim(),
              reason: diff > 0 ? "ENTRADA DE ESTOQUE" : "AJUSTE MANUAL",
              type: 'ajuste',
              device: deviceId,
              unidade: unidade,
              frota: frota.trim()
            };
            history.unshift(entry);
          }

          saveInventory();
          saveHistory();
          renderHistory();
          renderInventory();
          updateCloudStatus();
          syncToFirebase(true); // Sincronização silenciosa
        }
      });

      inventoryList.appendChild(card);
    });
  }

  function updateCloudStatus() {
    if (!cloudStatus) return;
    if (!navigator.onLine) {
      cloudStatus.className = 'cloud-status offline';
      cloudStatus.title = 'Dispositivo Offline - Aguardando conexão';
      const check = cloudStatus.querySelector('.cloud-check');
      if (check) check.classList.add('hidden');
      return;
    }
    const unsynced = history.some(h => !h.synced);
    cloudStatus.className = 'cloud-status ' + (unsynced ? 'pending' : 'synced');
    cloudStatus.title = unsynced ? 'Lançamentos pendentes de sincronização' : 'Tudo sincronizado com o PCM';
    const check = cloudStatus.querySelector('.cloud-check');
    if (check) check.classList.toggle('hidden', unsynced);
  }

  async function syncToFirebase(silent = false) {
    if (silent instanceof Event) silent = false;
    
    if (!navigator.onLine) {
      if (!silent) alert("Você está offline. Os dados serão enviados quando houver conexão.");
      return;
    }

    if (!db) {
      console.error("Lubetrack: Firebase não foi carregado corretamente.");
      if (!silent) alert("Firebase não inicializado.");
      return;
    }

    const unsynced = history.filter(h => !h.synced);
    console.log(`Lubetrack: Iniciando sincronia. ${unsynced.length} itens pendentes.`);
    
    if (unsynced.length === 0) {
      console.log("Lubetrack: Nada novo no histórico. Sincronizando apenas o estoque...");
      await syncInventoryOnly();
      return;
    }

    cloudStatus.className = 'cloud-status syncing';
    
    try {
      console.log("Lubetrack: Preparando lote (batch)...");
      const batch = writeBatch(db);
      
      unsynced.forEach(item => {
        const docRef = doc(db, 'historico', item.id.toString());
        batch.set(docRef, {
          ...item,
          device: deviceId,
          serverTimestamp: serverTimestamp()
        });
      });

      console.log("Lubetrack: Atualizando saldo de estoque no lote...");
      if (isComboio && comboioData) {
        const comboioRef = doc(db, 'usuarios_pcm', 'comboio_' + deviceId);
        batch.set(comboioRef, {
          ...comboioData,
          lastUpdate: serverTimestamp(),
          lastUser: deviceId
        });
      } else {
        const invRef = doc(db, 'estoque', 'status_atual');
        batch.set(invRef, {
          inventory: inventory,
          lastUpdate: serverTimestamp(),
          lastDevice: deviceId
        });
      }

      console.log("Lubetrack: Enviando lote para o Firebase...");
      await batch.commit();
      console.log("Lubetrack: Lote confirmado pelo servidor!");

      history.forEach(h => {
        if (!h.synced) h.synced = true;
      });
      saveHistory();
      updateCloudStatus();
      if (!silent) alert(`Sincronização concluída! ${unsynced.length} registros enviados.`);
    } catch (err) {
      console.error("Lubetrack: Erro crítico na sincronia:", err);
      if (!silent) alert("Erro ao sincronizar. Verifique a internet ou as regras do Firebase.");
      updateCloudStatus();
    }
  }

  async function syncInventoryOnly() {
    try {
      console.log("Lubetrack: Enviando apenas estoque...");
      if (isComboio && comboioData) {
        const comboioRef = doc(db, 'usuarios_pcm', 'comboio_' + deviceId);
        await setDoc(comboioRef, {
          ...comboioData,
          lastUpdate: serverTimestamp(),
          lastUser: deviceId
        });
      } else {
        await setDoc(doc(db, 'estoque', 'status_atual'), {
          inventory: inventory,
          lastUpdate: serverTimestamp(),
          lastDevice: deviceId
        });
      }
      console.log("Lubetrack: Estoque enviado com sucesso.");
      if (isComboio) {
        // No alert, just log
      } else {
        alert("Estoque atualizado no servidor.");
      }
      updateCloudStatus();
    } catch (e) {
      console.error("Lubetrack: Erro ao enviar estoque:", e);
    }
  }

  inventorySearch.addEventListener('input', renderInventory);

  const btnDownloadPCM = document.getElementById('btnDownloadPCM');
  if (btnDownloadPCM) {
    btnDownloadPCM.addEventListener('click', async () => {
      if (!confirm("Isso baixará as alterações de estoque feitas pelo PCM, atualizando seu catálogo local. Deseja continuar?")) return;
      
      try {
        btnDownloadPCM.style.opacity = '0.5';
        console.log("Lubetrack: Baixando estoque da nuvem...");
        const invDoc = await getDoc(doc(db, 'estoque', 'status_atual'));
        if (invDoc.exists()) {
          const cloudInventory = invDoc.data().inventory;
          if (cloudInventory) {
            inventory = cloudInventory;
            saveInventory();
            renderInventory();
            alert("✅ Estoque atualizado com sucesso a partir do PCM!");
          }
        } else {
          alert("Nenhum estoque encontrado na nuvem.");
        }
      } catch (e) {
        console.error("Lubetrack: Erro ao baixar estoque", e);
        alert("Erro ao baixar dados do PCM. Verifique a conexão.");
      } finally {
        btnDownloadPCM.style.opacity = '1';
      }
    });
  }

  if (btnSyncInventory) {
    btnSyncInventory.addEventListener('click', async () => {
      // Pergunta se quer apenas sincronizar catálogo ou também nuvem
      if (confirm("Deseja ENVIAR os lançamentos pendentes para o PCM?")) {
        await syncToFirebase();
      } else {
        seedInventoryFromData();
        alert('Catálogo local gerado a partir da base de máquinas!');
      }
    });
  }
  
  if (cloudStatus) {
    cloudStatus.addEventListener('click', syncToFirebase);
  }

  // Monitor network status
  window.addEventListener('online', () => {
    updateCloudStatus();
    syncToFirebase(true); // silent sync
  });

  window.addEventListener('offline', () => {
    updateCloudStatus();
  });

  function seedInventoryFromData() {
    if (isComboio) return;
    // Collect all unique fluids from EQUIPAMENTOS
    let addedCount = 0;
    EQUIPAMENTOS.forEach(eq => {
      if (eq.compartimentos) {
        eq.compartimentos.forEach(c => {
          if (isFilled(c.fluido)) {
            const fluidName = text(c.fluido);
            if (!inventory[fluidName]) {
              inventory[fluidName] = { current: 0, min: 0, unit: 'L' };
              addedCount++;
            }
          }
        });
      }
    });
    if (addedCount > 0) {
      saveInventory();
      renderInventory();
      console.log(`Lubetrack: ${addedCount} novos itens adicionados ao estoque.`);
    }
  }

  function deleteHistoryEntry(id) {
    const entry = history.find(h => h.id === id);
    if (!entry) return;

    // Proteção por senha
    const pass = prompt('Ação restrita ao PCM. Digite a senha para excluir:');
    if (pass === null) return; // Cancelado
    if (pass !== 'UMCA123456') {
      alert('Senha incorreta! A exclusão não foi realizada.');
      return;
    }

    if (!confirm(`Deseja realmente excluir este lançamento? \n${entry.qty}L de ${entry.item} serão devolvidos ao estoque.`)) return;
    
    // Devolve ao estoque
    if (inventory[entry.item]) {
      inventory[entry.item].current += entry.qty;
      saveInventory();
    }

    if (isComboio && comboioData) {
      const item = entry.item;
      let remainingToReturn = entry.qty;
      const updatedComps = (comboioData.compartments || []).map(cp => {
        if (cp.item === item && remainingToReturn > 0) {
          const room = cp.capacity > 0 ? (cp.capacity - cp.current) : Infinity;
          if (room > 0) {
            const add = Math.min(room, remainingToReturn);
            remainingToReturn -= add;
            return { ...cp, current: cp.current + add };
          }
        }
        return cp;
      });
      if (remainingToReturn > 0) {
        for (let i = 0; i < updatedComps.length; i++) {
          if (updatedComps[i].item === item) {
            updatedComps[i].current += remainingToReturn;
            remainingToReturn = 0;
            break;
          }
        }
      }
      comboioData.compartments = updatedComps;
    }

    history = history.filter(h => h.id !== id);
    saveHistory();
    renderHistory();
    syncToFirebase(true); // Sincroniza a exclusão e a atualização do estoque do comboio
  }

  function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
      historyList.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5; font-size:13px">Nenhum lançamento registrado</p>';
      return;
    }

    history.forEach(h => {
      const item = document.createElement('div');
      item.className = `history-item fluido`;
      const dateStr = new Date(h.date).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      
      item.innerHTML = `
        <div class="history-info">
          <div class="history-equip">${h.equip} • ${h.comp}</div>
          <div class="history-item-name">${h.item} | ⏱️ ${h.horo}h</div>
          <div class="history-date">${dateStr} • ${h.user} • <strong>${h.reason}</strong></div>
        </div>
        <div style="display:flex; align-items:center">
          <div class="history-qty">-${h.qty}L</div>
          <button class="btn-delete-history" title="Excluir Lançamento">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      item.querySelector('.btn-delete-history').addEventListener('click', () => deleteHistoryEntry(h.id));
      historyList.appendChild(item);
    });
  }

  const btnSettings = document.getElementById('btnSettings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      const pass = prompt('Digite a senha de administrador para configurar o tablet:');
      if (pass !== 'UMCAPCM') {
        alert('Senha incorreta! Operação cancelada.');
        return;
      }
      const novoNome = prompt('Defina o NOME deste tablet/dispositivo:\n(Ex: COMBOIO-01, TAB-JOAO)', deviceId);
      if (novoNome && novoNome.trim() !== '') {
        deviceId = novoNome.trim().toUpperCase().replace(/\s+/g, '_');
        localStorage.setItem('lubetrack_device_id', deviceId);
        alert(`Nome do dispositivo alterado para: ${deviceId}\nOs próximos lançamentos sairão com este nome.`);
      }
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────
  function init() {
    renderPills();
    renderList();
    
    // Seed/Sync inventory with EQUIPAMENTOS data
    seedInventoryFromData();
    updateCloudStatus();

    // Sincronização automática de estoque vinda do PCM ou do Comboio correspondente
    if (db) {
      // 1. Listen to comboio document if it exists for this device
      const comboioRef = doc(db, 'usuarios_pcm', 'comboio_' + deviceId);
      onSnapshot(comboioRef, (docSnap) => {
        if (docSnap.exists()) {
          isComboio = true;
          comboioData = docSnap.data();
          console.log(`Lubetrack: Este dispositivo é o comboio ${deviceId}. Carregando estoque do comboio...`);
          
          // Map comboio compartments to local inventory
          const newInventory = {};
          const comps = comboioData.compartments || [];
          comps.forEach(cp => {
            if (cp.item) {
              if (!newInventory[cp.item]) {
                newInventory[cp.item] = { current: 0, min: 0, unit: 'L' };
              }
              newInventory[cp.item].current += cp.current;
            }
          });
          
          inventory = newInventory;
          saveInventory();
          renderInventory();
        } else {
          isComboio = false;
          comboioData = null;
        }
      });

      // 2. Listen to general inventory
      onSnapshot(doc(db, 'estoque', 'status_atual'), (docSnap) => {
        if (isComboio) return; // Skip if comboio device
        if (docSnap.exists()) {
          const cloudInventory = docSnap.data().inventory;
          if (cloudInventory) {
            console.log("Lubetrack: Recebendo atualização de estoque automática do PCM...");
            inventory = cloudInventory;
            saveInventory();
            renderInventory();
          }
        }
      });

      // 3. Listen to equipment catalog customizations from PCM
      onSnapshot(collection(db, 'usuarios_pcm'), (snapshot) => {
        let hasChanges = false;
        snapshot.docs.forEach(d => {
          if (d.id.startsWith('equip_')) {
            const customEquip = d.data();
            const equipIndex = EQUIPAMENTOS.findIndex(e => e.nome === customEquip.nome);
            if (equipIndex !== -1) {
              if (JSON.stringify(EQUIPAMENTOS[equipIndex]) !== JSON.stringify(customEquip)) {
                EQUIPAMENTOS[equipIndex] = customEquip;
                console.log(`Lubetrack: Equipamento customizado atualizado: ${customEquip.nome}`);
                hasChanges = true;
                
                if (currentEquipInModal && currentEquipInModal.nome === customEquip.nome) {
                  currentEquipInModal = customEquip;
                  renderModalContent();
                }
              }
            } else {
              EQUIPAMENTOS.push(customEquip);
              console.log(`Lubetrack: Novo equipamento customizado carregado: ${customEquip.nome}`);
              hasChanges = true;
            }
          }
        });
        if (hasChanges && activeView === 'Catalog') {
          renderList();
        }
      });
    }

    // SEGURANÇA: O splash NÃO é fechado aqui.
    // Ele só será fechado dentro de initSecuritySync() após confirmação do Firebase.
    // Isso garante que dispositivos não autorizados NUNCA veem o conteúdo do app.
  }

  init();

  // ==========================================================================
  // MAINTENANCE L.A. MODULE LOGIC
  // ==========================================================================

  const STORAGE_KEY_MAINT = "historico_manutencao_lubrificacao_v2";
  let relatorioAtualMaint = null;
  let fotoBase64Maint = "";

  const checklistConfig = [
    { id: "vazamentoMangueiras", titulo: "Verificar vazamentos em mangueiras", perguntaDetalhe: "Descreva onde foi encontrado o vazamento ou a ação realizada." },
    { id: "vazamentoInjetores", titulo: "Verificar vazamentos em injetores", perguntaDetalhe: "Informe o ponto, injetor afetado e ação realizada." },
    { id: "funcionamentoPropulsora", titulo: "Verificar funcionamento da propulsora", perguntaDetalhe: "Descreva a falha ou observação no funcionamento." },
    { id: "pressaoPropulsora", titulo: "Verificar pressão da propulsora", perguntaDetalhe: "Informe a pressão encontrada e observações." },
    { id: "trocaInjetor", titulo: "Foi necessário trocar injetor?", perguntaDetalhe: "Se sim, explique o motivo da troca.", perguntaQuantidade: "Quantos injetores foram trocados?" },
    { id: "manutencaoPropulsora", titulo: "Foi preciso fazer manutenção na propulsora?", perguntaDetalhe: "Se sim, explique o motivo e o serviço realizado." },
    { id: "reabastecerReservatorio", titulo: "Reabastecer reservatório de graxa", perguntaDetalhe: "Informe quantidade, tipo de graxa ou observação." },
    { id: "trocaPropulsora", titulo: "Houve necessidade de trocar a propulsora?", perguntaDetalhe: "Se sim, informe o motivo da troca." }
  ];

  const checklistFormMaint = document.getElementById("checklistForm");
  const checklistItemsMaint = document.getElementById("checklistItems");
  const historicoMaintEl = document.getElementById("historicoMaint");
  const filtroTagMaint = document.getElementById("filtroTagMaint");
  const relatorioSectionMaint = document.getElementById("relatorioSection");
  const relatorioElMaint = document.getElementById("relatorioMaint");

  // ─── FOTO DE EVIDÊNCIA ───────────────────────────────────────────────────
  const fotoEvidencia = document.getElementById("fotoEvidencia");
  const previewFotoContainer = document.getElementById("previewFotoContainer");
  const previewFoto = document.getElementById("previewFoto");
  const removerFoto = document.getElementById("removerFoto");

  function resizeImage(file, maxSize, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Compressão JPEG 70%
        callback(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function limparFotoMaint() {
    fotoBase64Maint = "";
    if (fotoEvidencia) fotoEvidencia.value = "";
    if (previewFoto) previewFoto.src = "";
    if (previewFotoContainer) previewFotoContainer.classList.add("hidden");
  }

  if (fotoEvidencia) {
    fotoEvidencia.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Reduz a imagem para max 600px para não estourar o limite do Firestore/Storage Local
        resizeImage(file, 600, function(base64Str) {
          fotoBase64Maint = base64Str;
          previewFoto.src = base64Str;
          previewFotoContainer.classList.remove("hidden");
        });
      }
    });
  }

  if (removerFoto) {
    removerFoto.addEventListener('click', limparFotoMaint);
  }

  window.montarChecklist = function() {
    if(!checklistItemsMaint) return;
    if(checklistItemsMaint.innerHTML !== "") return; // Já montado

    checklistConfig.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "maint-item";
      div.innerHTML = `
        <div class="maint-item-title">${String(index + 1).padStart(2, "0")} · ${item.titulo}</div>
        <div class="maint-options">
          <label><input type="radio" name="${item.id}_status" value="OK" required> OK</label>
          <label><input type="radio" name="${item.id}_status" value="SIM"> SIM / Houve intervenção</label>
          <label><input type="radio" name="${item.id}_status" value="NÃO"> NÃO</label>
        </div>
        ${item.perguntaQuantidade ? `<input class="campo-condicional quantidade" type="number" min="0" id="${item.id}_quantidade" placeholder="${item.perguntaQuantidade}" disabled>` : ""}
        <textarea class="campo-condicional detalhe" id="${item.id}_detalhe" rows="3" placeholder="${item.perguntaDetalhe}" disabled></textarea>
      `;
      checklistItemsMaint.appendChild(div);
    });

    document.querySelectorAll("#checklistItems input[type='radio']").forEach((radio) => {
      radio.addEventListener("change", atualizarCamposCondicionaisMaint);
    });
    
    if (document.getElementById("dataMaint")) {
      document.getElementById("dataMaint").valueAsDate = new Date();
    }
  };

  function atualizarCamposCondicionaisMaint() {
    checklistConfig.forEach((item) => {
      const statusInput = document.querySelector(`input[name="${item.id}_status"]:checked`);
      const status = statusInput ? statusInput.value : null;
      const detalhe = document.getElementById(`${item.id}_detalhe`);
      const quantidade = document.getElementById(`${item.id}_quantidade`);

      const precisaDetalhe = status === "SIM";
      if (detalhe) {
        detalhe.disabled = !precisaDetalhe;
        detalhe.required = precisaDetalhe;
        if (!precisaDetalhe) detalhe.value = "";
      }
      if (quantidade) {
        quantidade.disabled = !precisaDetalhe;
        quantidade.required = precisaDetalhe;
        if (!precisaDetalhe) quantidade.value = "";
      }
    });
  }

  function carregarHistoricoMaint() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MAINT) || "[]");
  }

  function salvarHistoricoMaint(historico) {
    localStorage.setItem(STORAGE_KEY_MAINT, JSON.stringify(historico));
  }

  window.renderizarHistoricoMaint = function() {
    if(!historicoMaintEl) return;
    const filtro = filtroTagMaint ? filtroTagMaint.value.trim().toUpperCase() : "";
    const historico = carregarHistoricoMaint().filter((item) => item.tagEquipamento.includes(filtro));

    if (historico.length === 0) {
      historicoMaintEl.innerHTML = `<p class="empty">Nenhum histórico encontrado.</p>`;
      return;
    }

    historicoMaintEl.innerHTML = historico.map((item) => {
      const ocorrencias = item.checklist.filter(c => c.status === "SIM").length;
      return `
        <div class="maint-history-card">
          <h4>${item.tagEquipamento}</h4>
          <p><strong>Relatório:</strong> ${item.codigoRelatorio || item.id}</p>
          <p><strong>Data:</strong> ${item.data.split('-').reverse().join('/')} | <strong>Horímetro:</strong> ${item.horimetro}</p>
          <p><strong>Lubrificador:</strong> ${item.nomeLubrificador} | <strong>Matrícula:</strong> ${item.matricula}</p>
          <p><strong>Horário:</strong> ${item.horaInicial} às ${item.horaFim} ${item.duracao ? `| <strong>Duração:</strong> ${item.duracao}` : ""}</p>
          <p><strong>Ocorrências:</strong> ${ocorrencias}</p>
          <div class="maint-history-actions">
            <button class="maint-btn maint-btn-soft" onclick="window.abrirRelatorioMaint(${item.id})">Ver relatório</button>
            <button class="maint-btn maint-btn-whatsapp" onclick="window.abrirRelatorioWhatsAppMaint(${item.id})">WhatsApp</button>
          </div>
        </div>
      `;
    }).join("");
  };

  window.atualizarDashboardMaint = function() {
    const historico = carregarHistoricoMaint();
    const tagsUnicas = new Set(historico.map((item) => item.tagEquipamento));
    const totalOcorrencias = historico.reduce((total, item) => total + item.checklist.filter(c => c.status === "SIM").length, 0);

    const elTotal = document.getElementById("totalManutencoes");
    const elEquip = document.getElementById("totalEquipamentos");
    const elOcorr = document.getElementById("totalOcorrencias");
    const elUltimo = document.getElementById("ultimoRegistro");

    if(elTotal) elTotal.textContent = historico.length;
    if(elEquip) elEquip.textContent = tagsUnicas.size;
    if(elOcorr) elOcorr.textContent = totalOcorrencias;
    if(elUltimo) {
      elUltimo.textContent = historico[0]
        ? `${historico[0].tagEquipamento} - ${historico[0].data.split('-').reverse().join('/')}`
        : "--";
    }
  };

  if(checklistFormMaint) {
    checklistFormMaint.addEventListener("submit", async (event) => {
      event.preventDefault();

      const checklist = checklistConfig.map((item) => {
        const statusEl = document.querySelector(`input[name="${item.id}_status"]:checked`);
        const status = statusEl ? statusEl.value : "";
        const detalhe = document.getElementById(`${item.id}_detalhe`)?.value.trim() || "";
        const quantidade = document.getElementById(`${item.id}_quantidade`)?.value || "";
        return {
          titulo: item.titulo,
          status,
          detalhe: detalhe || (status === "OK" || status === "NÃO" ? "OK" : ""),
          quantidade
        };
      });

      const tag = document.getElementById("tagEquipamento").value.trim().toUpperCase();
      const data = document.getElementById("dataMaint").value;
      const horaInicial = document.getElementById("horaInicial").value;
      const horaFim = document.getElementById("horaFim").value;
      
      let duracao = "";
      if (horaInicial && horaFim) {
        const [hi, mi] = horaInicial.split(":").map(Number);
        const [hf, mf] = horaFim.split(":").map(Number);
        let minIn = hi * 60 + mi;
        let minOut = hf * 60 + mf;
        if (minOut < minIn) minOut += 24 * 60;
        const total = minOut - minIn;
        const h = Math.floor(total / 60);
        const m = total % 60;
        duracao = h === 0 ? `${m}min` : `${h}h ${String(m).padStart(2, "0")}min`;
      }

      const agora = new Date();
      const dataStr = agora.toISOString().slice(0, 10).replaceAll("-", "");
      const horaStr = String(agora.getHours()).padStart(2, "0") + String(agora.getMinutes()).padStart(2, "0");
      const codigoRelatorio = `REL-${tag}-${dataStr}-${horaStr}`;

      const dados = {
        id: Date.now(),
        date: agora.toISOString(), // Campo obrigatório para a query do PCM (orderBy 'date')
        codigoRelatorio,
        tagEquipamento: tag,
        horimetro: document.getElementById("horimetroMaint").value,
        data,
        horaInicial,
        horaFim,
        duracao,
        nomeLubrificador: document.getElementById("nomeLubrificador").value.trim(),
        matricula: document.getElementById("matriculaLubrificador").value.trim(),
        checklist,
        fotoEvidencia: fotoBase64Maint,
        criadoEm: agora.toLocaleString("pt-BR"),
        deviceId: deviceId,
        type: "manutencao"
      };

      // 1. Salva local
      const historicoLocal = carregarHistoricoMaint();
      historicoLocal.unshift(dados);
      salvarHistoricoMaint(historicoLocal);

      // 2. Salva no Firebase (Cloud) - Coleção "historico"
      // Usa addDoc (mesmo método dos lançamentos normais) para respeitar as regras do Firebase
      if (db) {
        try {
          await addDoc(collection(db, 'historico'), { ...dados, timestamp: serverTimestamp() });
          console.log("Lubetrack: Manutenção enviada para o Firebase com sucesso.");
        } catch (error) {
          console.error("Lubetrack: Erro ao salvar manutenção no Firebase:", error);
        }
      }

      gerarRelatorioMaint(dados);
      checklistFormMaint.reset();
      limparFotoMaint();
      document.getElementById("dataMaint").valueAsDate = new Date();
      atualizarCamposCondicionaisMaint();
      window.renderizarHistoricoMaint();
      window.atualizarDashboardMaint();

      relatorioSectionMaint.classList.remove("hidden");
      relatorioSectionMaint.scrollIntoView({ behavior: "smooth" });
      if(typeof showToast === 'function') showToast("Manutenção salva e enviada.");
    });
  }

  document.getElementById("limparFormMaint")?.addEventListener("click", () => {
    checklistFormMaint.reset();
    limparFotoMaint();
    document.getElementById("dataMaint").valueAsDate = new Date();
    atualizarCamposCondicionaisMaint();
  });

  if(filtroTagMaint) filtroTagMaint.addEventListener("input", () => window.renderizarHistoricoMaint());
  document.getElementById("fecharRelatorio")?.addEventListener("click", () => relatorioSectionMaint.classList.add("hidden"));

  window.abrirRelatorioMaint = function(id) {
    const item = carregarHistoricoMaint().find((r) => r.id === id);
    if (!item) return;
    gerarRelatorioMaint(item);
    relatorioSectionMaint.classList.remove("hidden");
    relatorioSectionMaint.scrollIntoView({ behavior: "smooth" });
  };

  window.abrirRelatorioWhatsAppMaint = function(id) {
    window.abrirRelatorioMaint(id);
    document.getElementById("whatsappRelatorio")?.click();
  };

  function gerarRelatorioMaint(dados) {
    relatorioAtualMaint = dados;

    const linhasChecklist = dados.checklist.map((item, index) => {
      const classe = item.status === "OK" ? "maint-badge ok" : item.status === "SIM" ? "maint-badge alerta" : "maint-badge nao";
      return `
        <tr>
          <td>${String(index + 1).padStart(2, "0")}</td>
          <td>${item.titulo}</td>
          <td><span class="${classe}">${item.status}</span></td>
          <td>${item.quantidade || "-"}</td>
          <td>${item.detalhe || "OK"}</td>
        </tr>
      `;
    }).join("");

    relatorioElMaint.innerHTML = `
      <div class="maint-report-header">
        <div>
          <span class="maint-section-kicker">Relatório Técnico</span>
          <h2>Manutenção Corretiva L.A.</h2>
          <p>Documento de registro operacional.</p>
        </div>
        <div class="maint-report-code">
          <strong>Código:</strong><br>
          ${dados.codigoRelatorio || dados.id}<br><br>
          <strong>Gerado em:</strong><br>
          ${dados.criadoEm}
        </div>
      </div>
      <div class="maint-report-grid">
        <div class="maint-report-info"><span>TAG</span><strong>${dados.tagEquipamento}</strong></div>
        <div class="maint-report-info"><span>Horímetro</span><strong>${dados.horimetro}</strong></div>
        <div class="maint-report-info"><span>Data</span><strong>${dados.data.split('-').reverse().join('/')}</strong></div>
        <div class="maint-report-info"><span>Duração</span><strong>${dados.duracao || "-"}</strong></div>
      </div>
      <table style="width:100%; text-align:left; border-collapse:collapse; margin-top:20px;">
        <tr style="background:#f3f7f9;"><th>Item</th><th>Status</th><th>Obs/Motivo</th></tr>
        ${dados.checklist.map(c => `<tr><td style="border-bottom:1px solid #eee; padding:8px;">${c.titulo}</td><td style="border-bottom:1px solid #eee; padding:8px;">${c.status}</td><td style="border-bottom:1px solid #eee; padding:8px;">${c.detalhe}</td></tr>`).join('')}
      </table>
      ${dados.fotoEvidencia ? `
      <div style="margin-top: 20px; page-break-inside: avoid;">
        <span class="maint-section-kicker">Evidência Fotográfica</span>
        <div style="margin-top: 10px; border: 1px solid #d8e2ea; border-radius: 14px; padding: 10px; text-align: center; background: #f8fafc;">
          <img src="${dados.fotoEvidencia}" style="max-width: 100%; max-height: 400px; border-radius: 8px;">
        </div>
      </div>
      ` : ""}
    `;
  }

  document.getElementById("whatsappRelatorio")?.addEventListener("click", () => {
    if (!relatorioAtualMaint) return;
    const dados = relatorioAtualMaint;
    const ocorrencias = dados.checklist.filter(i => i.status === "SIM").map(i => `- ${i.titulo}: ${i.detalhe}`).join("\\n");
    const msg = `*RELATÓRIO MANUTENÇÃO L.A.*\nCódigo: ${dados.codigoRelatorio}\nTAG: ${dados.tagEquipamento}\nHorímetro: ${dados.horimetro}\nData: ${dados.data.split('-').reverse().join('/')}\n\n*OCORRÊNCIAS:*\n${ocorrencias || "Sem ocorrências"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  });

  document.getElementById("copiarRelatorio")?.addEventListener("click", async () => {
    if (!relatorioAtualMaint) return;
    const dados = relatorioAtualMaint;
    const msg = `RELATÓRIO MANUTENÇÃO L.A.\nCódigo: ${dados.codigoRelatorio}\nTAG: ${dados.tagEquipamento}\nData: ${dados.data.split('-').reverse().join('/')}`;
    try {
      await navigator.clipboard.writeText(msg);
      if(typeof showToast === 'function') showToast("Copiado!");
    } catch(e) { }
  });

})();
