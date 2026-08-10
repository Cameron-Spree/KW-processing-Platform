/**
 * Main Application Orchestrator for Briants SEO-to-Content Pipeline
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
      intent: 'all',
      month: 'all'
    },
    activeBriefCluster: null
  };

  // DOM Elements Cache
  let dom = {};

  document.addEventListener('DOMContentLoaded', () => {
    initDOMReferences();
    initEventListeners();
    loadStateFromStorage();

    // If no state, auto-load sample dataset
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
      metricMonth1: document.getElementById('metric-month1'),
      btnThemeToggle: document.getElementById('btn-theme-toggle'),

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

      // Tab 3: Clusters
      clustersGrid: document.getElementById('clusters-grid'),
      inputClusterSearch: document.getElementById('cluster-search'),

      // Tab 4: Editorial Calendar
      kanbanContainer: document.getElementById('kanban-container'),
      selectCalendarMonthFilter: document.getElementById('calendar-month-filter'),

      // Tab 5: Exporters & Webhook Push
      btnCopySheet1: document.getElementById('btn-copy-sheet1'),
      urlSheet1: document.getElementById('url-sheet1'),
      btnPushSheet1: document.getElementById('btn-push-sheet1'),
      btnCsvSheet1: document.getElementById('btn-csv-sheet1'),

      btnCopySheet2: document.getElementById('btn-copy-sheet2'),
      urlSheet2: document.getElementById('url-sheet2'),
      btnPushSheet2: document.getElementById('btn-push-sheet2'),
      btnCsvSheet2: document.getElementById('btn-csv-sheet2'),

      btnCopySheet3: document.getElementById('btn-copy-sheet3'),
      urlSheet3: document.getElementById('url-sheet3'),
      btnPushSheet3: document.getElementById('btn-push-sheet3'),
      btnCsvSheet3: document.getElementById('btn-csv-sheet3'),

      btnAppsScriptModal: document.getElementById('btn-apps-script-modal'),

      // Modals
      ruleModal: document.getElementById('rule-modal'),
      btnCloseRuleModal: document.getElementById('btn-close-rule-modal'),
      btnSaveRules: document.getElementById('btn-save-rules'),
      rulesTextarea: document.getElementById('rules-textarea'),

      briefModal: document.getElementById('brief-modal'),
      btnCloseBriefModal: document.getElementById('btn-close-brief-modal'),
      briefContentContainer: document.getElementById('brief-content-container'),
      btnCopyBrief: document.getElementById('btn-copy-brief'),

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

    // 3. Load Preset Sample Data Button
    if (dom.btnLoadSample) {
      dom.btnLoadSample.addEventListener('click', loadSampleDataset);
    }

    // 4. Taxonomy Filtering & Rule Modal
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

    // 5. Cluster Search
    if (dom.inputClusterSearch) {
      dom.inputClusterSearch.addEventListener('input', () => renderClusterGrid());
    }

    // 6. Calendar Month Filter
    if (dom.selectCalendarMonthFilter) {
      dom.selectCalendarMonthFilter.addEventListener('change', (e) => {
        state.filters.month = e.target.value;
        renderKanbanBoard();
      });
    }

    // 7. Exporter & Webhook Listeners
    if (dom.btnCopySheet1) {
      dom.btnCopySheet1.addEventListener('click', async () => {
        const tsv = window.GoogleSheetsBridge.buildSheet1TSV(state.clusters);
        const res = await window.GoogleSheetsBridge.copyTSVToClipboard(tsv);
        if (res.success) showToast('Copied ready for Sheet 1 (Editorial Calendar)! Paste with Ctrl+V', 'success');
      });
    }
    if (dom.btnPushSheet1) {
      dom.btnPushSheet1.addEventListener('click', async () => {
        const url = dom.urlSheet1 ? dom.urlSheet1.value.trim() : '';
        const rows = window.GoogleSheetsBridge.getSheet1RowsArray(state.clusters);
        try {
          await window.GoogleSheetsBridge.pushToWebhook(url, 'Sheet 1', null, rows);
          showToast('Data pushed live to Sheet 1!', 'success');
        } catch (err) {
          showToast(err.message || 'Webhook push failed.', 'error');
        }
      });
    }
    if (dom.btnCsvSheet1) {
      dom.btnCsvSheet1.addEventListener('click', () => {
        const tsv = window.GoogleSheetsBridge.buildSheet1TSV(state.clusters);
        window.GoogleSheetsBridge.downloadCSV(tsv, 'Briants_Sheet1_Editorial_Calendar.csv');
      });
    }

    if (dom.btnCopySheet2) {
      dom.btnCopySheet2.addEventListener('click', async () => {
        const tsv = window.GoogleSheetsBridge.buildSheet2TSV(state.classifiedItems, state.clusters);
        const res = await window.GoogleSheetsBridge.copyTSVToClipboard(tsv);
        if (res.success) showToast('Copied ready for Sheet 2 (Master Keyword Mapping)! Paste with Ctrl+V', 'success');
      });
    }
    if (dom.btnPushSheet2) {
      dom.btnPushSheet2.addEventListener('click', async () => {
        const url = dom.urlSheet2 ? dom.urlSheet2.value.trim() : '';
        const rows = window.GoogleSheetsBridge.getSheet2RowsArray(state.classifiedItems, state.clusters);
        try {
          await window.GoogleSheetsBridge.pushToWebhook(url, 'Sheet 2', null, rows);
          showToast('Data pushed live to Sheet 2!', 'success');
        } catch (err) {
          showToast(err.message || 'Webhook push failed.', 'error');
        }
      });
    }
    if (dom.btnCsvSheet2) {
      dom.btnCsvSheet2.addEventListener('click', () => {
        const tsv = window.GoogleSheetsBridge.buildSheet2TSV(state.classifiedItems, state.clusters);
        window.GoogleSheetsBridge.downloadCSV(tsv, 'Briants_Sheet2_Master_Keywords.csv');
      });
    }

    if (dom.btnCopySheet3) {
      dom.btnCopySheet3.addEventListener('click', async () => {
        const tsv = window.GoogleSheetsBridge.buildSheet3TSV(state.rawItems);
        const res = await window.GoogleSheetsBridge.copyTSVToClipboard(tsv);
        if (res.success) showToast('Copied ready for Sheet 3 (Raw Import & Staging)! Paste with Ctrl+V', 'success');
      });
    }
    if (dom.btnPushSheet3) {
      dom.btnPushSheet3.addEventListener('click', async () => {
        const url = dom.urlSheet3 ? dom.urlSheet3.value.trim() : '';
        const rows = window.GoogleSheetsBridge.getSheet3RowsArray(state.rawItems);
        try {
          await window.GoogleSheetsBridge.pushToWebhook(url, 'Sheet 3', null, rows);
          showToast('Data pushed live to Sheet 3!', 'success');
        } catch (err) {
          showToast(err.message || 'Webhook push failed.', 'error');
        }
      });
    }
    if (dom.btnCsvSheet3) {
      dom.btnCsvSheet3.addEventListener('click', () => {
        const tsv = window.GoogleSheetsBridge.buildSheet3TSV(state.rawItems);
        window.GoogleSheetsBridge.downloadCSV(tsv, 'Briants_Sheet3_Raw_Staging.csv');
      });
    }

    if (dom.btnAppsScriptModal) {
      dom.btnAppsScriptModal.addEventListener('click', openScriptModal);
    }

    // Brief Modal Controls
    if (dom.btnCloseBriefModal) {
      dom.btnCloseBriefModal.addEventListener('click', () => closeModal(dom.briefModal));
    }
    if (dom.btnCopyBrief) {
      dom.btnCopyBrief.addEventListener('click', handleCopyBrief);
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

    // Refresh specific view logic
    if (tabId === 'taxonomy') renderTaxonomyTable();
    if (tabId === 'clusters') renderClusterGrid();
    if (tabId === 'calendar') renderKanbanBoard();
  }

  /* --- Data Loading & Ingestion --- */
  function handleFileImport(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target.result;
      const res = window.CSVCleaner.processCSV(csvText);

      if (res.items.length === 0) {
        showToast('Import Failed: No valid keywords found.', 'error');
        return;
      }

      state.rawItems = res.items;
      runClassificationAndClustering();
      renderImportSummary(res.summary);
      showToast(`Successfully imported ${res.items.length} keywords!`, 'success');
      saveStateToStorage();
    };
    reader.readAsText(file);
  }

  function loadSampleDataset() {
    if (!window.BriantsSampleData) return;
    state.rawItems = window.BriantsSampleData.map(item => ({
      ...item,
      id: 'kw_' + Math.random().toString(36).substr(2, 9),
      'Search Volume': window.CSVCleaner ? parseVolumeHelper(item['Search Volume']) : 1000,
      CPC: window.CSVCleaner ? parseCpcHelper(item.CPC) : 1.50
    }));

    runClassificationAndClustering();
    renderImportSummary({
      totalRows: state.rawItems.length,
      validRows: state.rawItems.length,
      deduplicated: 0
    });
    showToast('Briants 3-Sheet dataset loaded!', 'success');
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

  /* --- Rendering UI --- */
  function updateUI() {
    updateHeaderMetrics();
    renderTaxonomyTable();
    renderClusterGrid();
    renderKanbanBoard();
  }

  function updateHeaderMetrics() {
    const totalKw = state.classifiedItems.length;
    const totalVol = state.classifiedItems.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);
    const totalClusters = state.clusters.length;
    const month1Count = state.clusters.filter(c => (c.assignedMonth || 'Month 1') === 'Month 1').length;

    if (dom.metricTotalKw) dom.metricTotalKw.textContent = totalKw.toLocaleString();
    if (dom.metricTotalVol) dom.metricTotalVol.textContent = totalVol.toLocaleString();
    if (dom.metricClusters) dom.metricClusters.textContent = totalClusters;
    if (dom.metricMonth1) dom.metricMonth1.textContent = month1Count;
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
          <div class="stat-box-num">${state.clusters.length}</div>
          <div class="stat-box-label">Semantic Clusters</div>
        </div>
      </div>
    `;
  }

  /* --- Tab 2: Taxonomy Table --- */
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
          <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">
            No keywords match the active filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = filtered.slice(0, 150).map((item, idx) => {
      const deptClass = 'dept-' + (item.Department || '').toLowerCase().replace(/[^a-z]/g, '');
      const intentClass = 'intent-' + (item.Intent || 'informational').toLowerCase().split('/')[0];

      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td><strong style="color:var(--text-main);">${escapeHtml(item.Keyword)}</strong></td>
          <td><span class="badge-dept ${deptClass}">${item.Department}</span></td>
          <td><span class="badge-intent ${intentClass}">${item.Intent}</span></td>
          <td><strong>${(item['Search Volume'] || 0).toLocaleString()}</strong></td>
          <td>£${(item.CPC || 0).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    dom.taxonomyTableBody.innerHTML = rowsHtml;
  }

  /* --- Tab 3: Cluster Grid --- */
  function renderClusterGrid() {
    if (!dom.clustersGrid) return;

    const query = (dom.inputClusterSearch ? dom.inputClusterSearch.value : '').toLowerCase();

    const filteredClusters = state.clusters.filter(c => {
      return !query || c.headTerm.toLowerCase().includes(query) || (c.proposedTitle && c.proposedTitle.toLowerCase().includes(query));
    });

    if (filteredClusters.length === 0) {
      dom.clustersGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">No semantic clusters found.</div>`;
      return;
    }

    const cardsHtml = filteredClusters.map(c => {
      const deptClass = 'dept-' + (c.department || '').toLowerCase().replace(/[^a-z]/g, '');
      const intentClass = 'intent-' + (c.intent || 'informational').toLowerCase().split('/')[0];

      const kwTags = (c.keywords || [])
        .slice(0, 6)
        .map(k => `<span class="cluster-kw-tag">${escapeHtml(k.Keyword)}</span>`)
        .join('');

      return `
        <div class="cluster-card">
          <div>
            <div class="cluster-card-header">
              <span class="cluster-head-term">${escapeHtml(c.headTerm)}</span>
              <span class="badge-dept ${deptClass}">${c.department}</span>
            </div>
            <div class="cluster-proposed-title">" ${escapeHtml(c.proposedTitle)} "</div>
            <div class="cluster-metrics-row">
              <div class="cluster-metric-item">
                <span>Total Volume</span>
                <span>${(c.totalVolume || 0).toLocaleString()}</span>
              </div>
              <div class="cluster-metric-item">
                <span>Avg CPC</span>
                <span>£${(c.avgCPC || 0).toFixed(2)}</span>
              </div>
              <div class="cluster-metric-item">
                <span>Priority</span>
                <span style="color:var(--accent-amber);">${c.priorityScore}</span>
              </div>
            </div>
            <div class="cluster-kw-list">
              ${kwTags}
            </div>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:1rem; padding-top:0.75rem; border-top:1px solid var(--border-subtle);">
            <span class="badge-intent ${intentClass}">${c.intent}</span>
            <button class="btn btn-outline btn-sm" onclick="window.BriantsApp.openBriefForClusterId('${c.id}')">View Brief 📄</button>
          </div>
        </div>
      `;
    }).join('');

    dom.clustersGrid.innerHTML = cardsHtml;
  }

  /* --- Tab 4: Editorial Kanban Board --- */
  function renderKanbanBoard() {
    if (!dom.kanbanContainer || !window.CalendarManager) return;

    const monthFilter = state.filters.month;
    let clustersToRender = state.clusters;

    if (monthFilter !== 'all') {
      clustersToRender = state.clusters.filter(c => (c.assignedMonth || 'Month 1') === monthFilter);
    }

    window.CalendarManager.renderKanban(
      clustersToRender,
      dom.kanbanContainer,
      (clusterId, newStatus) => {
        const cluster = state.clusters.find(c => c.id === clusterId);
        if (cluster) {
          cluster.status = newStatus;
          saveStateToStorage();
          renderKanbanBoard();
          showToast(`Topic moved to ${newStatus}`, 'info');
        }
      },
      (cluster) => openBriefModal(cluster)
    );
  }

  /* --- Modals & Helpers --- */
  function openBriefForClusterId(clusterId) {
    const cluster = state.clusters.find(c => c.id === clusterId);
    if (cluster) openBriefModal(cluster);
  }

  function openBriefModal(cluster) {
    state.activeBriefCluster = cluster;
    const briefText = window.CalendarManager.generateContentBrief(cluster);
    dom.briefContentContainer.textContent = briefText;
    openModal(dom.briefModal);
  }

  function handleCopyBrief() {
    if (!dom.briefContentContainer) return;
    navigator.clipboard.writeText(dom.briefContentContainer.textContent).then(() => {
      showToast('Markdown Brief copied to clipboard!', 'success');
    });
  }

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
      closeModal(dom.ruleModal);
      showToast('Taxonomy rules updated!', 'success');
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

  /* --- Helpers & Persistence --- */
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
      localStorage.setItem('briants_seo_pipeline_state', JSON.stringify({
        rawItems: state.rawItems,
        clusters: state.clusters
      }));
    } catch (e) {}
  }

  function loadStateFromStorage() {
    try {
      const saved = localStorage.getItem('briants_seo_pipeline_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.rawItems && parsed.rawItems.length > 0) {
          state.rawItems = parsed.rawItems;
          runClassificationAndClustering();
        }
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Global Exports for inline onclicks
  window.BriantsApp = {
    openBriefForClusterId: openBriefForClusterId
  };
})();
