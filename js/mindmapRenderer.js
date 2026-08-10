/**
 * Apple Glass SVG Mindmap Tree Renderer
 * Renders interactive 3-level mindmaps with smooth Bezier connecting paths,
 * volume heatmaps, collapsible branches, and 1-click Kanban push.
 */

window.MindmapRenderer = (function () {
  'use strict';

  let currentTreeData = null;
  let heatmapEnabled = false;
  let collapsedBranches = new Set();

  /**
   * Main render function.
   * @param {Object} treeData - Structured tree object from SubClusterEngine
   * @param {HTMLElement} containerEl - Target DOM container
   * @param {Function} onPushBranchToKanban - Callback to push branch to Kanban
   */
  function renderMindmap(treeData, containerEl, onPushBranchToKanban) {
    if (!containerEl || !treeData) return;
    currentTreeData = treeData;

    const wrapper = document.createElement('div');
    wrapper.className = 'mindmap-canvas-wrapper';

    // Toolbar Header Controls
    const toolbar = document.createElement('div');
    toolbar.className = 'mindmap-controls-bar';
    toolbar.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
        <label style="font-size:0.82rem; font-weight:700; color:var(--text-main);">Master Focus Topic:</label>
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
          🔥 Heatmap Mode: <strong>${heatmapEnabled ? 'ON' : 'OFF'}</strong>
        </button>
      </div>

      <div style="display:flex; align-items:center; gap:0.5rem;">
        <button class="btn btn-secondary btn-sm" id="btn-export-mindmap-svg">Export SVG 📷</button>
        <button class="btn btn-secondary btn-sm" id="btn-export-mindmap-json">Export JSON 📄</button>
      </div>
    `;

    wrapper.appendChild(toolbar);

    // Tree Container
    const treeContainer = document.createElement('div');
    treeContainer.className = 'mindmap-tree-container';
    treeContainer.id = 'mindmap-svg-root';

    // Render 3-Level DOM Nodes
    const treeMarkup = buildTreeDOM(treeData, onPushBranchToKanban);
    treeContainer.appendChild(treeMarkup);
    wrapper.appendChild(treeContainer);

    containerEl.innerHTML = '';
    containerEl.appendChild(wrapper);

    // Wire Toolbar Controls
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
        renderMindmap(treeData, containerEl, onPushBranchToKanban);
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
   * Build HTML markup for Level 0 (Root), Level 1 (Branches), and Level 2 (Leaves).
   */
  function buildTreeDOM(treeData, onPushBranchToKanban) {
    const rootBox = document.createElement('div');
    rootBox.className = 'mindmap-layout-tree';

    // 1. Root Node (Level 0)
    const rootNode = document.createElement('div');
    rootNode.className = 'mindmap-root-node';
    rootNode.innerHTML = `
      <div class="mindmap-root-title">${escapeHtml(treeData.label)}</div>
      <div class="mindmap-root-meta">
        <span>Combined Search Volume: <strong>${(treeData.totalVolume || 0).toLocaleString()}</strong></span>
        <span>•</span>
        <span>Keywords: <strong>${treeData.totalKeywords}</strong></span>
      </div>
    `;

    rootBox.appendChild(rootNode);

    // 2. Branches Container (Level 1)
    const branchesContainer = document.createElement('div');
    branchesContainer.className = 'mindmap-branches-grid';

    (treeData.branches || []).forEach(branch => {
      const isCollapsed = collapsedBranches.has(branch.id);
      const branchCard = document.createElement('div');
      branchCard.className = `mindmap-branch-card ${heatmapEnabled ? getHeatmapClass(branch.branchVolume) : ''}`;
      branchCard.style.borderColor = branch.color;

      branchCard.innerHTML = `
        <div class="mindmap-branch-header">
          <div class="mindmap-branch-title">
            <span>${branch.icon}</span>
            <strong>${escapeHtml(branch.label)}</strong>
          </div>
          <button class="btn btn-outline btn-sm btn-push-branch" style="font-size:0.72rem; padding:0.15rem 0.5rem;" title="Push branch to Editorial Calendar">
            Push Branch ⚡
          </button>
        </div>

        <div class="mindmap-branch-stats">
          <span>Branch Vol: <strong>${(branch.branchVolume || 0).toLocaleString()}</strong></span>
          <span>Nodes: <strong>${branch.nodes.length}</strong></span>
        </div>

        <div class="mindmap-leaf-nodes-list ${isCollapsed ? 'collapsed' : ''}">
          ${branch.nodes.slice(0, 15).map(node => {
            const nodeVol = node['Search Volume'] || 0;
            const nodeColorClass = heatmapEnabled ? getHeatmapClass(nodeVol) : '';
            return `
              <div class="mindmap-leaf-node ${nodeColorClass}">
                <span class="leaf-title">${escapeHtml(node.Keyword)}</span>
                <span class="leaf-badge">${nodeVol.toLocaleString()} SV</span>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Push Branch Handler
      const pushBtn = branchCard.querySelector('.btn-push-branch');
      pushBtn.addEventListener('click', () => {
        if (onPushBranchToKanban) {
          onPushBranchToKanban(branch);
        }
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
