/**
 * Apple Glass SVG Mindmap Tree Renderer with Full Pillar Editor Trigger
 */

window.MindmapRenderer = (function () {
  'use strict';

  let currentTreeData = null;
  let heatmapEnabled = false;
  let activeAuditFilter = 'all'; // 'all', 'exact', 'best_fit', 'unclassified'

  /**
   * Main render function.
   */
  function renderMindmap(treeData, containerEl, onReassignKw, onCreateCategory, onExpandPillar) {
    if (!containerEl || !treeData) return;
    currentTreeData = treeData;

    const wrapper = document.createElement('div');
    wrapper.className = 'mindmap-canvas-wrapper';

    // 1. Audit Summary Bar
    const auditBar = document.createElement('div');
    auditBar.className = 'mindmap-audit-bar';
    const audit = treeData.audit || { exactCount: 0, bestFitCount: 0, unclassifiedCount: 0, blacklistedCount: 0 };

    auditBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
        <span style="font-size:0.82rem; font-weight:700; color:var(--text-main);">Keyword Audit Status:</span>
        <button class="audit-chip ${activeAuditFilter === 'all' ? 'active' : ''}" data-filter="all">
          All (${treeData.totalKeywords})
        </button>
        <button class="audit-chip green ${activeAuditFilter === 'exact' ? 'active' : ''}" data-filter="exact">
          ✓ Exact Match (${audit.exactCount})
        </button>
        <button class="audit-chip amber ${activeAuditFilter === 'best_fit' ? 'active' : ''}" data-filter="best_fit">
          ⚡ Best Fit (${audit.bestFitCount})
        </button>
        <button class="audit-chip purple ${activeAuditFilter === 'unclassified' ? 'active' : ''}" data-filter="unclassified">
          ❓ Unclassified (${audit.unclassifiedCount})
        </button>
        ${(audit.blacklistedCount || 0) > 0 ? `
        <button class="audit-chip red ${activeAuditFilter === 'blacklisted' ? 'active' : ''}" data-filter="blacklisted" style="color:#ef4444; border-color:rgba(239,68,68,0.3); background:rgba(239,68,68,0.06);">
          🚫 Blacklisted (${audit.blacklistedCount})
        </button>` : ''}
      </div>

      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button class="btn btn-outline btn-sm" id="btn-open-universal-blockers-mindmap" style="color:#ef4444; border-color:rgba(239,68,68,0.35); font-size:0.75rem; padding:0.25rem 0.65rem;">
          🚫 Manage Blockers
        </button>
        <button class="btn btn-primary btn-sm" id="btn-create-category-modal">
          + Create New Category ➕
        </button>
      </div>
    `;

    wrapper.appendChild(auditBar);

    // 2. Toolbar Header Controls
    const toolbar = document.createElement('div');
    toolbar.className = 'mindmap-controls-bar';
    toolbar.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
        <label style="font-size:0.82rem; font-weight:700; color:var(--text-main);">Focus Pillar Topic:</label>
        <select class="select-filter" id="mindmap-topic-select" style="font-size:0.82rem; padding:0.35rem 0.85rem;">
          <option value="all">🌐 All Departments Architecture</option>
          <option value="chainsaw" selected>🪚 Chainsaws Topic Architecture</option>
          <option value="fence">🪵 Fencing & Panels</option>
          <option value="mower">🚜 Lawnmowers & Machinery</option>
          <option value="arborist">🧗 Arborist & Climbing Gear</option>
          <option value="timber">🏗️ Timber & Building Materials</option>
          <option value="compost">🌱 Compost & Gardening</option>
        </select>

        <button class="btn btn-outline btn-sm ${heatmapEnabled ? 'active-heatmap' : ''}" id="btn-toggle-heatmap">
          🔥 Volume Heatmap: <strong>${heatmapEnabled ? 'ON' : 'OFF'}</strong>
        </button>
      </div>

      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" id="btn-export-mindmap-svg">Export SVG 📷</button>
        <button class="btn btn-secondary btn-sm" id="btn-export-mindmap-json">Export JSON 📄</button>
      </div>
    `;

    wrapper.appendChild(toolbar);

    // 3. Mindmap Tree Container
    const treeContainer = document.createElement('div');
    treeContainer.className = 'mindmap-tree-container';
    treeContainer.id = 'mindmap-svg-root';

    const treeMarkup = buildTreeDOM(treeData, onReassignKw, onExpandPillar);
    treeContainer.appendChild(treeMarkup);
    wrapper.appendChild(treeContainer);

    containerEl.innerHTML = '';
    containerEl.appendChild(wrapper);

    // Wire Audit Chips Filter
    const chips = auditBar.querySelectorAll('.audit-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        activeAuditFilter = chip.dataset.filter;
        renderMindmap(treeData, containerEl, onReassignKw, onCreateCategory, onExpandPillar);
      });
    });

    // Wire Controls
    const btnCreateCat = auditBar.querySelector('#btn-create-category-modal');
    if (btnCreateCat && onCreateCategory) {
      btnCreateCat.addEventListener('click', onCreateCategory);
    }

    const btnOpenBlockers = auditBar.querySelector('#btn-open-universal-blockers-mindmap');
    if (btnOpenBlockers) {
      btnOpenBlockers.addEventListener('click', () => {
        if (window.BriantsApp && window.BriantsApp.openUniversalBlockersModal) {
          window.BriantsApp.openUniversalBlockersModal();
        }
      });
    }

    const topicSelect = toolbar.querySelector('#mindmap-topic-select');
    if (topicSelect) {
      topicSelect.value = window.currentMindmapFilter || 'chainsaw';
      topicSelect.addEventListener('change', (e) => {
        window.currentMindmapFilter = e.target.value;
        if (window.BriantsApp && window.BriantsApp.refreshMindmap) {
          window.BriantsApp.refreshMindmap();
        }
      });
    }

    const btnHeatmap = toolbar.querySelector('#btn-toggle-heatmap');
    if (btnHeatmap) {
      btnHeatmap.addEventListener('click', () => {
        heatmapEnabled = !heatmapEnabled;
        renderMindmap(treeData, containerEl, onReassignKw, onCreateCategory, onExpandPillar);
      });
    }

    const btnSvg = toolbar.querySelector('#btn-export-mindmap-svg');
    if (btnSvg) {
      btnSvg.addEventListener('click', () => exportSVG(treeContainer));
    }

    const btnJson = toolbar.querySelector('#btn-export-mindmap-json');
    if (btnJson) {
      btnJson.addEventListener('click', () => downloadJSON(treeData));
    }
  }

  /**
   * Build HTML Tree layout with match status indicators and expand pillar editor handlers.
   */
  function buildTreeDOM(treeData, onReassignKw, onExpandPillar) {
    const rootBox = document.createElement('div');
    rootBox.className = 'mindmap-layout-tree';

    // Root Node (Level 0)
    const rootNode = document.createElement('div');
    rootNode.className = 'mindmap-root-node';
    rootNode.innerHTML = `
      <div class="mindmap-root-title">${escapeHtml(treeData.label)}</div>
      <div class="mindmap-root-meta">
        <span>Combined Search Volume: <strong>${(treeData.totalVolume || 0).toLocaleString()}</strong></span>
        <span>•</span>
        <span>Keywords Accounted: <strong>${treeData.totalKeywords}</strong></span>
      </div>
    `;

    rootBox.appendChild(rootNode);

    // Branches Grid (Level 1)
    const branchesContainer = document.createElement('div');
    branchesContainer.className = 'mindmap-branches-grid';

    (treeData.branches || []).forEach(branch => {
      let filteredNodes = branch.nodes;

      if (activeAuditFilter !== 'all') {
        filteredNodes = branch.nodes.filter(n => n.fitType === activeAuditFilter);
      }

      if (activeAuditFilter !== 'all' && filteredNodes.length === 0) return;

      const branchCard = document.createElement('div');
      branchCard.className = `mindmap-branch-card ${heatmapEnabled ? getHeatmapClass(branch.branchVolume) : ''}`;
      branchCard.style.borderColor = branch.color;

      branchCard.innerHTML = `
        <div class="mindmap-branch-header clickable-header" title="Click to open Full-Screen Pillar Editor">
          <div class="mindmap-branch-title">
            <span>${branch.icon}</span>
            <strong>${escapeHtml(branch.label)}</strong>
          </div>
          <button class="btn btn-outline btn-sm btn-expand-pillar" style="font-size:0.72rem; padding:0.2rem 0.6rem;">
            Expand Editor 🔍
          </button>
        </div>

        <div class="mindmap-branch-stats">
          <span>Vol: <strong>${(branch.branchVolume || 0).toLocaleString()}</strong></span>
          <span>${branch.nodes.length === 0 ? '<strong style="color:var(--text-muted);">📭 Empty Category</strong>' : `✓ ${branch.exactCount} Exact | ⚡ ${branch.bestFitCount} Best Fit`}</span>
        </div>

        <div class="mindmap-leaf-nodes-list">
          ${filteredNodes.length > 0 ? filteredNodes.map(node => {
            const nodeVol = node['Search Volume'] || 0;
            const fitBadgeClass = 'badge-fit-' + (node.fitType || 'unclassified');
            return `
              <div class="mindmap-leaf-node" data-kw="${escapeHtml(node.Keyword)}">
                <div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden;">
                  <span class="badge-fit ${fitBadgeClass}">${node.fitLabel || 'Match'}</span>
                  <span class="leaf-title">${escapeHtml(node.Keyword)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span class="leaf-badge">${nodeVol.toLocaleString()} SV</span>
                  <button class="btn btn-icon btn-reassign-kw" title="Reassign Category" style="width:22px; height:22px; font-size:0.65rem;">✏️</button>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="mindmap-empty-branch-box" style="padding:0.75rem; text-align:center; background:rgba(0,122,255,0.04); border:1px dashed rgba(0,122,255,0.25); border-radius:var(--radius-sm); margin-top:0.4rem; cursor:pointer;" title="Click to open Pillar Editor & Auto-Populate">
              <div style="font-size:0.78rem; font-weight:700; color:var(--text-muted);">📭 0 Keywords Assigned</div>
              <div style="font-size:0.72rem; color:var(--primary); margin-top:0.25rem; font-weight:600;">
                + Click to Audit & Auto-Populate ⚡
              </div>
            </div>
          `}
        </div>
      `;

      // Header & Expand Button Click Handlers
      const expandBtn = branchCard.querySelector('.btn-expand-pillar');
      const headerEl = branchCard.querySelector('.mindmap-branch-header');

      const triggerExpand = (e) => {
        e.stopPropagation();
        if (onExpandPillar) onExpandPillar(branch);
      };

      const emptyBox = branchCard.querySelector('.mindmap-empty-branch-box');

      if (expandBtn) expandBtn.addEventListener('click', triggerExpand);
      if (headerEl) headerEl.addEventListener('click', triggerExpand);
      if (emptyBox) emptyBox.addEventListener('click', triggerExpand);

      // Wire Reassign Buttons
      const reassignBtns = branchCard.querySelectorAll('.btn-reassign-kw');
      reassignBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const leafNode = btn.closest('.mindmap-leaf-node');
          const kwStr = leafNode.dataset.kw;
          if (onReassignKw) onReassignKw(kwStr);
        });
      });

      branchesContainer.appendChild(branchCard);
    });

    rootBox.appendChild(branchesContainer);
    return rootBox;
  }

  function getHeatmapClass(volume) {
    if (volume > 15000) return 'heat-high';
    if (volume > 3000) return 'heat-med';
    return 'heat-low';
  }

  function exportSVG(containerEl) {
    const htmlString = containerEl.innerHTML;
    const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${htmlString}</div></foreignObject></svg>`], { type: 'image/svg+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Briants_Topic_Mindmap.svg';
    link.click();
  }

  function downloadJSON(treeData) {
    const blob = new Blob([JSON.stringify(treeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Briants_Topic_Architecture.json';
    link.click();
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    renderMindmap: renderMindmap
  };
})();
