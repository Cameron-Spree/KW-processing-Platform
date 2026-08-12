/**
 * Main Application Orchestrator for Briants SEO Data Processing Engine
 * Features Smart Product Topic Sanitizer & Clean Concise Category Titles.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    rawItems: [],
    classifiedItems: [],
    clusters: [],
    activeTab: 'import',
    filters: {
      search: '',
      department: 'all',
      intent: 'all'
    },
    webhooks: {
      masterUrl: '',
      sheetName: 'Raw Data Sheet',
      pushMode: 'append',
      exportScope: 'all'
    },
    discoveryProposals: [],
    executionTimeMs: 0,
    activeReassignKw: null,
    activePillarBranch: null,
    activeMicroFilter: 'all'
  };

  // DOM Elements Cache
  let dom = {};

  document.addEventListener('DOMContentLoaded', () => {
    initDOMReferences();
    initEventListeners();
    loadStateFromStorage();

    // If no state, auto-load master dataset
    if (state.classifiedItems.length === 0) {
      loadSampleDataset();
    } else {
      updateUI();
    }
  });

  function initDOMReferences() {
    dom = {
      // Header Metrics
      metricTotalKw: document.getElementById('metric-total-kw'),
      metricTotalVol: document.getElementById('metric-total-vol'),
      metricClusters: document.getElementById('metric-clusters'),
      metricSpeed: document.getElementById('metric-speed'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),
      btnDiscoverCategories: document.getElementById('btn-discover-categories'),
      btnResetCacheModal: document.getElementById('btn-reset-cache-modal'),

      // Navigation
      navTabs: document.querySelectorAll('.nav-tab'),
      tabPanels: document.querySelectorAll('.tab-panel'),

      // Tab 1: Import
      dropzone: document.getElementById('dropzone'),
      fileInput: document.getElementById('file-input'),
      btnLoadSample: document.getElementById('btn-load-sample'),
      importStatsContainer: document.getElementById('import-stats-container'),

      // Tab 2: Taxonomy
      taxonomyTableBody: document.getElementById('taxonomy-tbody'),
      inputTaxonomySearch: document.getElementById('taxonomy-search'),
      selectDeptFilter: document.getElementById('taxonomy-dept-filter'),
      selectIntentFilter: document.getElementById('taxonomy-intent-filter'),
      btnConfigRules: document.getElementById('btn-config-rules'),

      // Tab 3: Mindmap Architecture
      mindmapCanvasContainer: document.getElementById('mindmap-canvas-container'),
      btnSweepUnclassified: document.getElementById('btn-sweep-unclassified'),

      // Tab 4: Master Raw Sheet Sync
      btnCopyMaster: document.getElementById('btn-copy-master'),
      urlMaster: document.getElementById('url-master'),
      sheetNameMaster: document.getElementById('sheet-name-master'),
      selectPushMode: document.getElementById('select-push-mode'),
      selectExportScope: document.getElementById('select-export-scope'),
      btnPushMaster: document.getElementById('btn-push-master'),
      btnDownloadMasterCsv: document.getElementById('btn-download-master-csv'),
      btnAppsScriptModal: document.getElementById('btn-apps-script-modal'),

      // Modals
      categoryDiscoveryModal: document.getElementById('category-discovery-modal'),
      btnCloseDiscoveryModal: document.getElementById('btn-close-discovery-modal'),
      inputProductFamily: document.getElementById('input-product-family'),
      discoveryProposalsContainer: document.getElementById('discovery-proposals-container'),
      btnApplyDiscoveryCategories: document.getElementById('btn-apply-discovery-categories'),
      discoverySelectedCount: document.getElementById('discovery-selected-count'),

      resetCacheModal: document.getElementById('reset-cache-modal'),
      btnCloseResetModal: document.getElementById('btn-close-reset-modal'),
      btnConfirmResetCache: document.getElementById('btn-confirm-reset-cache'),

      ruleModal: document.getElementById('rule-modal'),
      btnCloseRuleModal: document.getElementById('btn-close-rule-modal'),
      btnSaveRules: document.getElementById('btn-save-rules'),
      rulesTextarea: document.getElementById('rules-textarea'),

      pillarEditorModal: document.getElementById('pillar-editor-modal'),
      btnClosePillarEditor: document.getElementById('btn-close-pillar-editor'),
      pillarEditorIcon: document.getElementById('pillar-editor-icon'),
      pillarEditorTitle: document.getElementById('pillar-editor-title'),
      pillarEditorSubtitle: document.getElementById('pillar-editor-subtitle'),
      btnAutofillPillar: document.getElementById('btn-autofill-pillar'),
      btnBulkClearPillar: document.getElementById('btn-bulk-clear-pillar'),
      inputPillarSearch: document.getElementById('input-pillar-search'),
      pillarTokensEditorBar: document.getElementById('pillar-tokens-editor-bar'),
      pillarTokensPillList: document.getElementById('pillar-tokens-pill-list'),
      inputAddPillarToken: document.getElementById('input-add-pillar-token'),
      btnAddPillarToken: document.getElementById('btn-add-pillar-token'),
      pillarMicroTopicsBar: document.getElementById('pillar-micro-topics-bar'),
      pillarEditorTbody: document.getElementById('pillar-editor-tbody'),

      reassignModal: document.getElementById('reassign-modal'),
      btnCloseReassignModal: document.getElementById('btn-close-reassign-modal'),
      reassignKwName: document.getElementById('reassign-kw-name'),
      reassignBranchSelect: document.getElementById('reassign-branch-select'),
      btnSaveReassign: document.getElementById('btn-save-reassign'),

      newCategoryModal: document.getElementById('new-category-modal'),
      btnCloseCatModal: document.getElementById('btn-close-cat-modal'),
      inputCatName: document.getElementById('input-cat-name'),
      inputCatIcon: document.getElementById('input-cat-icon'),
      inputCatTokens: document.getElementById('input-cat-tokens'),
      chkAutofillCat: document.getElementById('chk-autofill-cat'),
      btnSaveNewCat: document.getElementById('btn-save-new-cat'),

      scriptModal: document.getElementById('script-modal'),
      btnCloseScriptModal: document.getElementById('btn-close-script-modal'),
      scriptCodeContainer: document.getElementById('script-code-container'),
      btnCopyScriptCode: document.getElementById('btn-copy-script'),

      toastContainer: document.getElementById('toast-container')
    };
  }

  function initEventListeners() {
    // 1. Navigation Tab Switching
    dom.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        switchTab(targetTab);
      });
    });

    // 2. Dropzone & File Ingestion
    if (dom.dropzone) {
      dom.dropzone.addEventListener('click', () => dom.fileInput.click());

      dom.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.dropzone.classList.add('drag-over');
      });

      dom.dropzone.addEventListener('dragleave', () => {
        dom.dropzone.classList.remove('drag-over');
      });

      dom.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileImport(e.dataTransfer.files[0]);
        }
      });
    }

    if (dom.fileInput) {
      dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileImport(e.target.files[0]);
        }
      });
    }

    // 3. Header Action Buttons & Reset Cache
    if (dom.btnLoadSample) {
      dom.btnLoadSample.addEventListener('click', loadSampleDataset);
    }
    if (dom.btnDiscoverCategories) {
      dom.btnDiscoverCategories.addEventListener('click', openCategoryDiscoveryModal);
    }
    if (dom.btnResetCacheModal) {
      dom.btnResetCacheModal.addEventListener('click', () => openModal(dom.resetCacheModal));
    }
    if (dom.btnCloseResetModal) {
      dom.btnCloseResetModal.addEventListener('click', () => closeModal(dom.resetCacheModal));
    }
    if (dom.btnConfirmResetCache) {
      dom.btnConfirmResetCache.addEventListener('click', handleResetCache);
    }

    // 4. Discovery Modal Actions
    if (dom.btnCloseDiscoveryModal) {
      dom.btnCloseDiscoveryModal.addEventListener('click', () => closeModal(dom.categoryDiscoveryModal));
    }
    if (dom.btnApplyDiscoveryCategories) {
      dom.btnApplyDiscoveryCategories.addEventListener('click', handleApplyDiscoveryCategories);
    }
    if (dom.inputProductFamily) {
      dom.inputProductFamily.addEventListener('input', (e) => {
        const val = e.target.value.trim() || 'Products';
        window.SubClusterEngine.setProductFamily(val);
        state.discoveryProposals = window.SubClusterEngine.discoverDatasetCategories(state.classifiedItems, val);
        renderCategoryDiscoveryCards();
      });
    }

    // 5. Mindmap Sweep Action
    if (dom.btnSweepUnclassified) {
      dom.btnSweepUnclassified.addEventListener('click', handleSweepUnclassified);
    }

    // 6. Taxonomy Filtering & Rule Modal
    if (dom.inputTaxonomySearch) {
      dom.inputTaxonomySearch.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderTaxonomyTable();
      });
    }

    if (dom.selectDeptFilter) {
      dom.selectDeptFilter.addEventListener('change', (e) => {
        state.filters.department = e.target.value;
        renderTaxonomyTable();
      });
    }

    if (dom.selectIntentFilter) {
      dom.selectIntentFilter.addEventListener('change', (e) => {
        state.filters.intent = e.target.value;
        renderTaxonomyTable();
      });
    }

    if (dom.btnConfigRules) {
      dom.btnConfigRules.addEventListener('click', openRuleConfigModal);
    }

    if (dom.btnCloseRuleModal) {
      dom.btnCloseRuleModal.addEventListener('click', () => closeModal(dom.ruleModal));
    }

    if (dom.btnSaveRules) {
      dom.btnSaveRules.addEventListener('click', handleSaveRules);
    }

    // 7. Pillar Editor Modal Controls
    if (dom.btnClosePillarEditor) {
      dom.btnClosePillarEditor.addEventListener('click', () => closeModal(dom.pillarEditorModal));
    }
    if (dom.inputPillarSearch) {
      dom.inputPillarSearch.addEventListener('input', () => renderPillarEditorRows());
    }
    if (dom.btnAutofillPillar) {
      dom.btnAutofillPillar.addEventListener('click', handleAutofillPillar);
    }
    if (dom.btnBulkClearPillar) {
      dom.btnBulkClearPillar.addEventListener('click', handleBulkClearPillar);
    }
    if (dom.btnAddPillarToken) {
      dom.btnAddPillarToken.addEventListener('click', handleAddPillarToken);
    }
    if (dom.inputAddPillarToken) {
      dom.inputAddPillarToken.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddPillarToken();
      });
    }

    // 8. Reassign Modal Controls
    if (dom.btnCloseReassignModal) {
      dom.btnCloseReassignModal.addEventListener('click', () => closeModal(dom.reassignModal));
    }
    if (dom.btnSaveReassign) {
      dom.btnSaveReassign.addEventListener('click', handleSaveReassign);
    }

    // 9. New Custom Category Modal Controls
    if (dom.btnCloseCatModal) {
      dom.btnCloseCatModal.addEventListener('click', () => closeModal(dom.newCategoryModal));
    }
    if (dom.btnSaveNewCat) {
      dom.btnSaveNewCat.addEventListener('click', handleSaveNewCat);
    }

    // 10. Auto-Save Master Webhook URL, Sheet Name & Push Mode & Scope
    if (dom.urlMaster) {
      dom.urlMaster.addEventListener('input', (e) => {
        state.webhooks.masterUrl = e.target.value.trim();
        saveStateToStorage();
      });
    }
    if (dom.sheetNameMaster) {
      dom.sheetNameMaster.addEventListener('input', (e) => {
        state.webhooks.sheetName = e.target.value.trim() || 'Raw Data Sheet';
        saveStateToStorage();
      });
    }
    if (dom.selectPushMode) {
      dom.selectPushMode.addEventListener('change', (e) => {
        state.webhooks.pushMode = e.target.value;
        saveStateToStorage();
      });
    }
    if (dom.selectExportScope) {
      dom.selectExportScope.addEventListener('change', (e) => {
        state.webhooks.exportScope = e.target.value;
        saveStateToStorage();
      });
    }

    // Master Raw Sheet Actions
    if (dom.btnCopyMaster) {
      dom.btnCopyMaster.addEventListener('click', async () => {
        const scope = dom.selectExportScope ? dom.selectExportScope.value : 'all';
        const tsv = window.GoogleSheetsBridge.buildMasterEnrichedTSV(state.classifiedItems, state.clusters, scope);
        const res = await window.GoogleSheetsBridge.copyTSVToClipboard(tsv);
        if (res.success) showToast(`Copied enriched keywords! Paste into Google Sheet with Ctrl+V`, 'success');
      });
    }

    if (dom.btnPushMaster) {
      dom.btnPushMaster.addEventListener('click', async () => {
        const url = dom.urlMaster ? dom.urlMaster.value.trim() : '';
        const sheetName = dom.sheetNameMaster ? dom.sheetNameMaster.value.trim() || 'Raw Data Sheet' : 'Raw Data Sheet';
        const pushMode = dom.selectPushMode ? dom.selectPushMode.value : 'append';
        const scope = dom.selectExportScope ? dom.selectExportScope.value : 'all';
        const rows = window.GoogleSheetsBridge.getMasterEnrichedRowsArray(state.classifiedItems, state.clusters, scope);
        try {
          const startTime = performance.now();
          await window.GoogleSheetsBridge.pushToWebhook(url, sheetName, pushMode, rows);
          const pushTimeMs = Math.round(performance.now() - startTime);
          const actionText = pushMode === 'append' ? 'appended to bottom of' : 'overwritten on';
          showToast(`Successfully ${actionText} tab "${sheetName}" (${rows.length} rows) in ${pushTimeMs}ms!`, 'success');
        } catch (err) {
          showToast(err.message || 'Batch push failed.', 'error');
        }
      });
    }

    if (dom.btnDownloadMasterCsv) {
      dom.btnDownloadMasterCsv.addEventListener('click', () => {
        const scope = dom.selectExportScope ? dom.selectExportScope.value : 'all';
        const tsv = window.GoogleSheetsBridge.buildMasterEnrichedTSV(state.classifiedItems, state.clusters, scope);
        window.GoogleSheetsBridge.downloadCSV(tsv, 'Briants_Categorized_Raw_Keywords.csv');
      });
    }

    if (dom.btnAppsScriptModal) {
      dom.btnAppsScriptModal.addEventListener('click', openScriptModal);
    }

    // Script Modal Controls
    if (dom.btnCloseScriptModal) {
      dom.btnCloseScriptModal.addEventListener('click', () => closeModal(dom.scriptModal));
    }
    if (dom.btnCopyScriptCode) {
      dom.btnCopyScriptCode.addEventListener('click', handleCopyScriptCode);
    }

    // Theme Toggle
    if (dom.btnThemeToggle) {
      dom.btnThemeToggle.addEventListener('click', toggleTheme);
    }
  }

  /* --- Navigation Handler --- */
  function switchTab(tabId) {
    state.activeTab = tabId;

    dom.navTabs.forEach(t => {
      if (t.dataset.tab === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    dom.tabPanels.forEach(p => {
      if (p.id === `tab-${tabId}`) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (tabId === 'taxonomy') renderTaxonomyTable();
    if (tabId === 'clusters') renderMindmapView();
  }

  /* --- Reset Engine & Clear Cache --- */
  function handleResetCache() {
    try {
      localStorage.removeItem('briants_seo_pipeline_state');
      if (window.SubClusterEngine) window.SubClusterEngine.clearEngineState();
      
      state.rawItems = [];
      state.classifiedItems = [];
      state.clusters = [];
      state.discoveryProposals = [];
      state.executionTimeMs = 0;

      closeModal(dom.resetCacheModal);
      updateHeaderMetrics();
      
      if (dom.importStatsContainer) dom.importStatsContainer.innerHTML = '';
      if (dom.taxonomyTableBody) dom.taxonomyTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">No keywords loaded. Drop a CSV to start fresh!</td></tr>';
      if (dom.mindmapCanvasContainer) dom.mindmapCanvasContainer.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">No categories active. Import a CSV to setup dataset categories!</div>';

      showToast('Engine cache cleared completely! Ready for fresh CSV import 🧹', 'success');
      switchTab('import');
    } catch (e) {
      showToast('Failed to clear browser cache.', 'error');
    }
  }

  /* --- Data Ingestion & Enrichment --- */
  function handleFileImport(file) {
    const rawFileName = file ? file.name : "Products";
    const inferredProduct = window.SubClusterEngine ? window.SubClusterEngine.sanitizeProductFamily(rawFileName) : "Products";

    if (dom.inputProductFamily) dom.inputProductFamily.value = inferredProduct;
    window.SubClusterEngine.setProductFamily(inferredProduct);

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      const res = window.CSVCleaner.processCSV(csvText);

      if (res.items.length === 0) {
        showToast('Import Failed: No valid keywords found.', 'error');
        return;
      }

      state.executionTimeMs = res.summary.executionTimeMs || 0;
      state.rawItems = res.items;
      runClassificationAndClustering();
      renderImportSummary(res.summary);
      showToast(`Imported ${res.items.length} keywords in ${state.executionTimeMs}ms!`, 'success');
      
      openCategoryDiscoveryModal();
      saveStateToStorage();
    };
    reader.readAsText(file);
  }

  function loadSampleDataset() {
    if (!window.BriantsSampleData) return;
    const startTime = performance.now();
    state.rawItems = window.BriantsSampleData.map((item, idx) => ({
      ...item,
      id: 'kw_' + idx,
      'Search Volume': window.CSVCleaner ? parseVolumeHelper(item['Search Volume']) : 1000,
      CPC: window.CSVCleaner ? parseCpcHelper(item.CPC) : 1.50
    }));

    runClassificationAndClustering();
    state.executionTimeMs = Math.round(performance.now() - startTime);

    renderImportSummary({
      totalRows: state.rawItems.length,
      validRows: state.rawItems.length,
      deduplicated: 0,
      executionTimeMs: state.executionTimeMs
    });
    showToast(`Briants master dataset enriched in ${state.executionTimeMs}ms!`, 'success');
    saveStateToStorage();
  }

  function parseVolumeHelper(val) {
    return parseInt(String(val).replace(/,/g, '').replace(/[^0-9]/g, ''), 10) || 0;
  }
  function parseCpcHelper(val) {
    return parseFloat(String(val).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
  }

  function runClassificationAndClustering() {
    state.classifiedItems = window.TaxonomyEngine.processDataset(state.rawItems);
    state.clusters = window.ClusteringEngine.generateClusters(state.classifiedItems);
    updateHeaderMetrics();
    updateUI();
  }

  /* --- Dynamic Category Discovery Step --- */
  function openCategoryDiscoveryModal() {
    if (!state.classifiedItems || state.classifiedItems.length === 0) {
      showToast('Please import a CSV dataset first.', 'error');
      return;
    }

    const currentFamily = dom.inputProductFamily ? dom.inputProductFamily.value.trim() || 'Products' : 'Products';
    window.SubClusterEngine.setProductFamily(currentFamily);
    state.discoveryProposals = window.SubClusterEngine.discoverDatasetCategories(state.classifiedItems, currentFamily);
    renderCategoryDiscoveryCards();
    openModal(dom.categoryDiscoveryModal);
  }

  function renderCategoryDiscoveryCards() {
    if (!dom.discoveryProposalsContainer) return;

    if (state.discoveryProposals.length === 0) {
      dom.discoveryProposalsContainer.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          No dataset specific categories discovered. Using default categories.
        </div>
      `;
      return;
    }

    const cardsHtml = state.discoveryProposals.map((prop, idx) => {
      const samplesText = prop.sampleKeywords.map(k => `"${escapeHtml(k)}"`).join(', ');
      const tokensBadges = prop.tokens.map(t => `<span class="badge-tag" style="background:rgba(0,122,255,0.08); color:var(--primary);">${escapeHtml(t)}</span>`).join(' ');

      return `
        <div class="card" style="padding:1rem; border:1px solid var(--border-strong); background:rgba(255,255,255,0.85); box-shadow:var(--shadow-sm);">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:1rem;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <input type="checkbox" class="chk-discovery-prop" data-idx="${idx}" ${prop.isSelected ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;">
              <div>
                <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-bottom:0.15rem;">
                  ${prop.icon} ${escapeHtml(prop.label)}
                </h4>
                <div style="font-size:0.75rem; color:var(--text-muted);">
                  <strong>${prop.matchCount} keywords</strong> (${prop.percentageOfDataset}% of dataset) • <strong>${(prop.totalVolume || 0).toLocaleString()}</strong> monthly searches
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid var(--border-subtle); font-size:0.78rem;">
            <div style="color:var(--text-muted); margin-bottom:0.4rem;">
              <strong>Matching Search Terms:</strong> <em>${samplesText}</em>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <strong style="color:var(--text-muted); font-size:0.75rem;">Auto-Sort Tokens:</strong> ${tokensBadges}
            </div>
          </div>
        </div>
      `;
    }).join('');

    dom.discoveryProposalsContainer.innerHTML = cardsHtml;

    const chks = dom.discoveryProposalsContainer.querySelectorAll('.chk-discovery-prop');
    chks.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        if (state.discoveryProposals[idx]) {
          state.discoveryProposals[idx].isSelected = e.target.checked;
        }
        updateDiscoverySelectedCount();
      });
    });

    updateDiscoverySelectedCount();
  }

  function updateDiscoverySelectedCount() {
    if (!dom.discoverySelectedCount) return;
    const selected = state.discoveryProposals.filter(p => p.isSelected);
    dom.discoverySelectedCount.textContent = `Selected ${selected.length} of ${state.discoveryProposals.length} proposed categories`;
  }

  function handleApplyDiscoveryCategories() {
    const pf = dom.inputProductFamily ? dom.inputProductFamily.value.trim() || 'Products' : 'Products';
    window.SubClusterEngine.setProductFamily(pf);

    const selectedProposals = state.discoveryProposals.filter(p => p.isSelected);

    if (selectedProposals.length === 0) {
      showToast('Please select at least 1 category.', 'error');
      return;
    }

    window.SubClusterEngine.applyDatasetCategoryProposals(selectedProposals);
    saveStateToStorage();
    closeModal(dom.categoryDiscoveryModal);

    renderMindmapView();
    showToast(`Applied ${selectedProposals.length} categories for Product Family '${pf}' & generated Mindmap! ⚡`, 'success');
    switchTab('clusters');
  }

  function handleSweepUnclassified() {
    const sweptCount = window.SubClusterEngine.sweepUnclassifiedToCatchAll();
    saveStateToStorage();
    renderMindmapView();
    showToast(`Swept ${sweptCount} unclassified keywords into General Category! (100% Categorized ⚡)`, 'success');
  }

  /* --- Rendering UI --- */
  function updateUI() {
    updateHeaderMetrics();
    renderTaxonomyTable();
    renderMindmapView();
  }

  function updateHeaderMetrics() {
    const totalKw = state.classifiedItems.length;
    const totalVol = state.classifiedItems.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);
    const totalClusters = state.clusters.length;

    if (dom.metricTotalKw) dom.metricTotalKw.textContent = totalKw.toLocaleString();
    if (dom.metricTotalVol) dom.metricTotalVol.textContent = totalVol.toLocaleString();
    if (dom.metricClusters) dom.metricClusters.textContent = totalClusters;
    if (dom.metricSpeed) dom.metricSpeed.textContent = `${state.executionTimeMs} ms`;
  }

  function renderImportSummary(summary) {
    if (!dom.importStatsContainer) return;
    dom.importStatsContainer.innerHTML = `
      <div class="import-summary-bar">
        <div class="stat-box">
          <div class="stat-box-num">${(summary.totalRows || 0).toLocaleString()}</div>
          <div class="stat-box-label">Raw Rows Parsed</div>
        </div>
        <div class="stat-box blue">
          <div class="stat-box-num">${(summary.validRows || 0).toLocaleString()}</div>
          <div class="stat-box-label">Cleaned Keywords</div>
        </div>
        <div class="stat-box purple">
          <div class="stat-box-num">${(summary.deduplicated || 0).toLocaleString()}</div>
          <div class="stat-box-label">Duplicates Merged</div>
        </div>
        <div class="stat-box amber">
          <div class="stat-box-num">${summary.executionTimeMs || 0} ms</div>
          <div class="stat-box-label">Enrichment Speed</div>
        </div>
      </div>
    `;
  }

  /* --- Tab 2: Enriched Keyword Table --- */
  function renderTaxonomyTable() {
    if (!dom.taxonomyTableBody) return;

    const query = (state.filters.search || '').toLowerCase();
    const deptFilter = state.filters.department;
    const intentFilter = state.filters.intent;

    const filtered = state.classifiedItems.filter(item => {
      const matchesSearch = !query || item.Keyword.toLowerCase().includes(query);
      const matchesDept = deptFilter === 'all' || item.Department === deptFilter;
      const matchesIntent = intentFilter === 'all' || item.Intent === intentFilter;
      return matchesSearch && matchesDept && matchesIntent;
    });

    if (filtered.length === 0) {
      dom.taxonomyTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">
            No keywords match the active filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered.slice(0, 150).map((item, idx) => {
      const deptClass = 'dept-' + (item.Department || '').toLowerCase().replace(/[^a-z]/g, '');
      const intentClass = 'intent-' + (item.Intent || 'informational').toLowerCase().split('/')[0];
      const priorityClass = item.Priority === 'High' ? 'color:#dc2626; font-weight:700;' : (item.Priority === 'Medium' ? 'color:#d97706;' : 'color:var(--text-muted);');

      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td><strong style="color:var(--text-main);">${escapeHtml(item.Keyword)}</strong></td>
          <td><span class="badge-dept ${deptClass}">${item.Department}</span></td>
          <td><span class="badge-intent ${intentClass}">${item.Intent}</span></td>
          <td><span style="font-size:0.78rem; color:var(--text-muted);">${item.FunnelStage || 'Awareness'}</span></td>
          <td><span style="${priorityClass}">${item.Priority || 'Medium'}</span></td>
          <td><strong>${(item['Search Volume'] || 0).toLocaleString()}</strong></td>
          <td>£${(item.CPC || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    dom.taxonomyTableBody.innerHTML = rowsHtml;
  }

  /* --- Tab 3: Mindmap Renderer & Pillar Editor --- */
  function renderMindmapView() {
    if (!dom.mindmapCanvasContainer || !window.SubClusterEngine || !window.MindmapRenderer) return;

    const currentFilter = window.currentMindmapFilter || 'chainsaw';
    const treeData = window.SubClusterEngine.buildTopicTree(state.classifiedItems, currentFilter);

    window.MindmapRenderer.renderMindmap(
      treeData,
      dom.mindmapCanvasContainer,
      (kwStr) => openReassignModal(kwStr),
      () => openModal(dom.newCategoryModal),
      (branch) => openPillarEditorModal(branch)
    );
  }

  /* --- Full-Screen Pillar Editor Modal Logic --- */
  function openPillarEditorModal(branch) {
    state.activePillarBranch = branch;
    state.activeMicroFilter = 'all';

    dom.pillarEditorIcon.textContent = branch.icon || '📁';
    dom.pillarEditorTitle.textContent = `${branch.label} Editor`;
    dom.pillarEditorSubtitle.textContent = `Auditing ${branch.nodes.length} keywords • Total Vol: ${(branch.branchVolume || 0).toLocaleString()} • ✓ ${branch.exactCount} Exact | ⚡ ${branch.bestFitCount} Best Fit`;

    if (dom.inputPillarSearch) dom.inputPillarSearch.value = '';

    renderPillarTokensBar(branch);
    renderMicroTopicsBar(branch);
    renderPillarEditorRows();
    openModal(dom.pillarEditorModal);
  }

  function renderPillarTokensBar(branch) {
    if (!dom.pillarTokensPillList) return;

    if (branch.id === 'unclassified') {
      dom.pillarTokensPillList.innerHTML = `<span style="font-size:0.78rem; color:var(--text-muted);">Unassigned queue receives keywords that do not match any pillar tokens.</span>`;
      if (dom.pillarTokensAddContainer) dom.pillarTokensAddContainer.style.display = 'none';
      return;
    }

    if (dom.pillarTokensAddContainer) dom.pillarTokensAddContainer.style.display = 'flex';

    const tokens = branch.tokens || [];
    if (tokens.length === 0) {
      dom.pillarTokensPillList.innerHTML = `<span style="font-size:0.78rem; color:var(--text-dim);">No trigger tokens set for this category.</span>`;
      return;
    }

    const pillsHtml = tokens.map(token => `
      <span class="audit-chip" style="font-size:0.75rem; padding:0.2rem 0.55rem; background:rgba(0,122,255,0.08); color:var(--primary); border-color:rgba(0,122,255,0.2);">
        ${escapeHtml(token)}
        <span class="btn-remove-token" data-token="${escapeHtml(token)}" style="margin-left:0.35rem; cursor:pointer; font-weight:700; color:#ef4444;" title="Remove Token">✕</span>
      </span>
    `).join('');

    dom.pillarTokensPillList.innerHTML = pillsHtml;

    const removeBtns = dom.pillarTokensPillList.querySelectorAll('.btn-remove-token');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tokenToRemove = e.target.dataset.token;
        window.SubClusterEngine.removeBranchToken(branch.id, tokenToRemove);
        saveStateToStorage();
        showToast(`Removed trigger token "${tokenToRemove}"! Saved 💾`, 'info');
        refreshPillarAndMindmap();
      });
    });
  }

  function handleAddPillarToken() {
    if (!state.activePillarBranch || !dom.inputAddPillarToken) return;
    const val = dom.inputAddPillarToken.value.trim();
    if (!val) return;

    const autoPulledCount = window.SubClusterEngine.addBranchToken(state.activePillarBranch.id, val);
    saveStateToStorage();
    dom.inputAddPillarToken.value = '';

    showToast(`Added trigger token "${val}" & auto-populated ${autoPulledCount} keywords! Saved 💾`, 'success');
    refreshPillarAndMindmap();
  }

  function renderMicroTopicsBar(branch) {
    if (!dom.pillarMicroTopicsBar) return;

    const microCounts = new Map();

    (branch.nodes || []).forEach(n => {
      const label = n.microTopicLabel || 'General';
      microCounts.set(label, (microCounts.get(label) || 0) + 1);
    });

    let pillsHtml = `
      <button class="audit-chip ${state.activeMicroFilter === 'all' ? 'active' : ''}" data-micro="all">
        All Micro-Topics (${branch.nodes.length})
      </button>
    `;

    microCounts.forEach((count, label) => {
      pillsHtml += `
        <button class="audit-chip green ${state.activeMicroFilter === label ? 'active' : ''}" data-micro="${escapeHtml(label)}">
          ${escapeHtml(label)} (${count})
        </button>
      `;
    });

    dom.pillarMicroTopicsBar.innerHTML = pillsHtml;

    const btns = dom.pillarMicroTopicsBar.querySelectorAll('.audit-chip');
    btns.forEach(b => {
      b.addEventListener('click', () => {
        state.activeMicroFilter = b.dataset.micro;
        renderMicroTopicsBar(branch);
        renderPillarEditorRows();
      });
    });
  }

  function renderPillarEditorRows() {
    if (!state.activePillarBranch || !dom.pillarEditorTbody) return;

    const query = (dom.inputPillarSearch ? dom.inputPillarSearch.value : '').toLowerCase().trim();
    const branch = state.activePillarBranch;
    const isUnassignedBranch = (branch.id === 'unclassified');
    const subThemes = window.SubClusterEngine.getSubThemes();

    const filtered = branch.nodes.filter(n => {
      const matchesSearch = !query || n.Keyword.toLowerCase().includes(query);
      const matchesMicro = state.activeMicroFilter === 'all' || (n.microTopicLabel || 'General') === state.activeMicroFilter;
      return matchesSearch && matchesMicro;
    });

    if (filtered.length === 0) {
      dom.pillarEditorTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">
            No keywords found matching filter criteria in this pillar.
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered.map((item, idx) => {
      const fitBadgeClass = 'badge-fit-' + (item.fitType || 'unclassified');

      const optionsHtml = subThemes.map(st => `
        <option value="${st.id}" ${(!isUnassignedBranch && st.id === branch.id) ? 'selected' : ''}>${st.icon} ${st.label}</option>
      `).join('');

      const unassignedOptionHtml = `<option value="unclassified" ${isUnassignedBranch ? 'selected' : ''}>❓ Unassigned Queue</option>`;

      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td><strong style="color:var(--text-main); font-size:0.9rem;">${escapeHtml(item.Keyword)}</strong></td>
          <td><strong>${(item['Search Volume'] || 0).toLocaleString()}</strong></td>
          <td>£${(item.CPC || 0).toFixed(2)}</td>
          <td><span class="badge-tag" style="background:rgba(0,122,255,0.08); color:#0066cc;">${escapeHtml(item.microTopicLabel || 'General')}</span></td>
          <td><span class="badge-fit ${fitBadgeClass}">${item.fitLabel || 'Match'}</span></td>
          <td>
            <select class="select-filter select-inline-reassign" data-kw="${escapeHtml(item.Keyword)}" style="font-size:0.78rem; padding:0.25rem 0.65rem; width:100%;">
              ${optionsHtml}
              ${unassignedOptionHtml}
            </select>
          </td>
          <td>
            <button class="btn btn-outline btn-sm btn-discard-row" data-kw="${escapeHtml(item.Keyword)}" style="font-size:0.7rem; padding:0.2rem 0.55rem; color:#ef4444; border-color:rgba(239,68,68,0.3);" title="Move to Unassigned Queue">
              🗑️ Discard
            </button>
          </td>
        </tr>
      `;
    }).join('');

    dom.pillarEditorTbody.innerHTML = rowsHtml;

    const inlineSelects = dom.pillarEditorTbody.querySelectorAll('.select-inline-reassign');
    inlineSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const kw = e.target.dataset.kw;
        const targetBranchId = e.target.value;
        window.SubClusterEngine.reassignKeyword(kw, targetBranchId);
        saveStateToStorage();
        showToast(`Reassigned "${kw}"! Saved 💾`, 'success');
        refreshPillarAndMindmap();
      });
    });

    const discardBtns = dom.pillarEditorTbody.querySelectorAll('.btn-discard-row');
    discardBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kw = e.target.dataset.kw;
        window.SubClusterEngine.reassignKeyword(kw, 'unclassified');
        saveStateToStorage();
        showToast(`Moved "${kw}" to Unassigned Queue 🗑️`, 'info');
        refreshPillarAndMindmap();
      });
    });
  }

  function handleAutofillPillar() {
    if (!state.activePillarBranch) return;
    const count = window.SubClusterEngine.autoFillBranch(state.activePillarBranch.id);
    saveStateToStorage();
    showToast(`Auto-populated "${state.activePillarBranch.label}" with ${count} unclassified keywords! Saved 💾`, 'success');
    refreshPillarAndMindmap();
  }

  function handleBulkClearPillar() {
    if (!state.activePillarBranch || !state.activePillarBranch.nodes) return;
    const branch = state.activePillarBranch;
    const count = branch.nodes.length;

    window.SubClusterEngine.bulkDiscardBranch(branch.nodes);
    saveStateToStorage();
    showToast(`Cleared ${count} keywords from "${branch.label}" to Unassigned Queue 🧹`, 'success');
    refreshPillarAndMindmap();
  }

  function refreshPillarAndMindmap() {
    renderMindmapView();
    if (state.activePillarBranch) {
      const currentFilter = window.currentMindmapFilter || 'chainsaw';
      const updatedTree = window.SubClusterEngine.buildTopicTree(state.classifiedItems, currentFilter);
      const updatedBranch = (updatedTree.branches || []).find(b => b.id === state.activePillarBranch.id);
      if (updatedBranch) {
        state.activePillarBranch = updatedBranch;
        renderPillarTokensBar(updatedBranch);
        renderMicroTopicsBar(updatedBranch);
        renderPillarEditorRows();
      }
    }
  }

  function openReassignModal(kwStr) {
    state.activeReassignKw = kwStr;
    dom.reassignKwName.textContent = `"${kwStr}"`;

    const subThemes = window.SubClusterEngine.getSubThemes();
    dom.reassignBranchSelect.innerHTML = subThemes.map(st => `
      <option value="${st.id}">${st.icon} ${st.label}</option>
    `).join('') + '<option value="unclassified">❓ Unassigned Queue</option>';

    openModal(dom.reassignModal);
  }

  function handleSaveReassign() {
    if (!state.activeReassignKw) return;
    const targetBranchId = dom.reassignBranchSelect.value;
    window.SubClusterEngine.reassignKeyword(state.activeReassignKw, targetBranchId);
    saveStateToStorage();
    closeModal(dom.reassignModal);
    renderMindmapView();
    showToast(`Reassigned "${state.activeReassignKw}" successfully! Saved 💾`, 'success');
  }

  function handleSaveNewCat() {
    const name = dom.inputCatName.value.trim();
    const icon = dom.inputCatIcon.value.trim() || '🏷️';
    const tokens = dom.inputCatTokens.value.split(',').map(t => t.trim()).filter(Boolean);
    const autoFill = dom.chkAutofillCat ? dom.chkAutofillCat.checked : true;

    if (!name) {
      showToast('Please enter a category name.', 'error');
      return;
    }

    const res = window.SubClusterEngine.addCustomCategory(name, icon, tokens, autoFill);
    saveStateToStorage();
    closeModal(dom.newCategoryModal);

    dom.inputCatName.value = '';
    dom.inputCatTokens.value = '';

    renderMindmapView();
    showToast(`Created category "${name}", auto-filled ${res.autoFilledCount} unclassified keywords & ${res.microTopicsCount} micro-topics! Saved 💾`, 'success');
  }

  /* --- Modals & Helpers --- */
  function openRuleConfigModal() {
    const rules = window.TaxonomyEngine.getRules();
    dom.rulesTextarea.value = JSON.stringify(rules, null, 2);
    openModal(dom.ruleModal);
  }

  function handleSaveRules() {
    try {
      const parsed = JSON.parse(dom.rulesTextarea.value);
      window.TaxonomyEngine.updateRules(parsed);
      runClassificationAndClustering();
      saveStateToStorage();
      closeModal(dom.ruleModal);
      showToast('Taxonomy rules updated! Saved 💾', 'success');
    } catch (e) {
      showToast('Invalid JSON rule format.', 'error');
    }
  }

  function openScriptModal() {
    const code = window.GoogleSheetsBridge.getGoogleAppsScriptTemplate();
    dom.scriptCodeContainer.textContent = code;
    openModal(dom.scriptModal);
  }

  function handleCopyScriptCode() {
    if (!dom.scriptCodeContainer) return;
    navigator.clipboard.writeText(dom.scriptCodeContainer.textContent).then(() => {
      showToast('Google Apps Script code copied to clipboard!', 'success');
    });
  }

  function openModal(el) {
    if (el) el.classList.add('active');
  }
  function closeModal(el) {
    if (el) el.classList.remove('active');
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
  }

  function showToast(msg, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="color:${type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6')};">●</span>
      <span>${escapeHtml(msg)}</span>
    `;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  function saveStateToStorage() {
    try {
      const engineState = window.SubClusterEngine ? window.SubClusterEngine.exportEngineState() : null;
      localStorage.setItem('briants_seo_pipeline_state', JSON.stringify({
        rawItems: state.rawItems,
        clusters: state.clusters,
        webhooks: state.webhooks,
        engineState: engineState
      }));
    } catch (e) {}
  }

  function loadStateFromStorage() {
    try {
      const saved = localStorage.getItem('briants_seo_pipeline_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.engineState && window.SubClusterEngine) {
          window.SubClusterEngine.importEngineState(parsed.engineState);
        }
        if (parsed.rawItems && parsed.rawItems.length > 0) {
          state.rawItems = parsed.rawItems;
          runClassificationAndClustering();
        }
        if (parsed.webhooks) {
          state.webhooks = parsed.webhooks;
          if (dom.urlMaster && state.webhooks.masterUrl) dom.urlMaster.value = state.webhooks.masterUrl;
          if (dom.sheetNameMaster && state.webhooks.sheetName) dom.sheetNameMaster.value = state.webhooks.sheetName;
          if (dom.selectPushMode && state.webhooks.pushMode) dom.selectPushMode.value = state.webhooks.pushMode;
          if (dom.selectExportScope && state.webhooks.exportScope) dom.selectExportScope.value = state.webhooks.exportScope;
        }
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Global Exports for inline onclicks
  window.BriantsApp = {
    refreshMindmap: renderMindmapView,
    openCategoryDiscoveryModal: openCategoryDiscoveryModal
  };
})();
