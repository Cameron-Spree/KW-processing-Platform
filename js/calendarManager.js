/**
 * 3-Month Editorial Calendar & Interactive Kanban Manager
 */

window.CalendarManager = (function () {
  'use strict';

  const KANBAN_STAGES = [
    { id: 'Briefing', label: 'Briefing / Backlog', color: '#3b82f6' },
    { id: 'Drafting', label: 'Drafting', color: '#8b5cf6' },
    { id: 'In Review', label: 'In Review', color: '#f59e0b' },
    { id: 'Scheduled', label: 'Scheduled', color: '#06b6d4' },
    { id: 'Published', label: 'Published', color: '#10b981' }
  ];

  /**
   * Render Kanban Board HTML into a container element.
   * @param {Array} clusters - List of topic cluster objects
   * @param {HTMLElement} containerEl - Target DOM element
   * @param {Function} onStatusChange - Callback when card is moved
   * @param {Function} onViewBrief - Callback when "View Brief" is clicked
   */
  function renderKanban(clusters, containerEl, onStatusChange, onViewBrief) {
    if (!containerEl) return;

    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'kanban-board-wrapper';

    const board = document.createElement('div');
    board.className = 'kanban-board';

    KANBAN_STAGES.forEach(stage => {
      const colClusters = clusters.filter(c => (c.status || 'Briefing') === stage.id);

      const col = document.createElement('div');
      col.className = 'kanban-column';
      col.dataset.status = stage.id;

      col.innerHTML = `
        <div class="kanban-column-header">
          <div class="kanban-col-title">
            <span style="width:10px; height:10px; border-radius:50%; background:${stage.color}; display:inline-block;"></span>
            ${stage.label}
          </div>
          <span class="kanban-col-count">${colClusters.length}</span>
        </div>
        <div class="kanban-cards-container" id="kanban-col-${stage.id.replace(/\s+/g, '-')}">
        </div>
      `;

      const cardsContainer = col.querySelector('.kanban-cards-container');

      // Drag Over & Drop Events
      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        cardsContainer.classList.add('drag-over');
      });

      cardsContainer.addEventListener('dragleave', () => {
        cardsContainer.classList.remove('drag-over');
      });

      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        cardsContainer.classList.remove('drag-over');
        const clusterId = e.dataTransfer.getData('text/plain');
        if (clusterId && onStatusChange) {
          onStatusChange(clusterId, stage.id);
        }
      });

      // Populate Cards
      colClusters.forEach(cluster => {
        const card = createCardElement(cluster, onViewBrief);
        cardsContainer.appendChild(card);
      });

      board.appendChild(col);
    });

    boardWrapper.appendChild(board);
    containerEl.innerHTML = '';
    containerEl.appendChild(boardWrapper);
  }

  /**
   * Helper to create individual Kanban card element.
   */
  function createCardElement(cluster, onViewBrief) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = cluster.id;

    const deptClass = 'dept-' + (cluster.department || '').toLowerCase().replace(/[^a-z]/g, '');

    card.innerHTML = `
      <div class="kanban-card-title">${escapeHtml(cluster.proposedTitle || cluster.headTerm)}</div>
      <div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.5rem;">
        <span class="badge-dept ${deptClass}">${cluster.department}</span>
        <span class="badge-intent intent-${(cluster.intent || 'info').toLowerCase().split('/')[0]}">${cluster.intent}</span>
      </div>
      <div class="kanban-card-meta">
        <span>Vol: <strong>${(cluster.totalVolume || 0).toLocaleString()}</strong></span>
        <span class="kanban-card-month">${cluster.assignedMonth || 'Month 1'}</span>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.75rem; padding-top:0.5rem; border-top:1px solid var(--border-subtle);">
        <button class="btn btn-outline btn-sm btn-brief-trigger" style="font-size:0.72rem; padding:0.2rem 0.5rem;">Brief 📄</button>
        <select class="select-filter month-selector" style="font-size:0.72rem; padding:0.15rem 0.4rem;">
          <option value="Month 1" ${cluster.assignedMonth === 'Month 1' ? 'selected' : ''}>Month 1</option>
          <option value="Month 2" ${cluster.assignedMonth === 'Month 2' ? 'selected' : ''}>Month 2</option>
          <option value="Month 3" ${cluster.assignedMonth === 'Month 3' ? 'selected' : ''}>Month 3</option>
        </select>
      </div>
    `;

    // Drag Events
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', cluster.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    // Brief Trigger Button
    const briefBtn = card.querySelector('.btn-brief-trigger');
    briefBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onViewBrief) onViewBrief(cluster);
    });

    // Month Selector Change
    const monthSelect = card.querySelector('.month-selector');
    monthSelect.addEventListener('change', (e) => {
      cluster.assignedMonth = e.target.value;
    });

    return card;
  }

  /**
   * Generate Markdown Content Brief for writers.
   */
  function generateContentBrief(cluster) {
    const keywordsFormatted = cluster.keywords
      .map(k => `- **${k.Keyword}** (SV: ${k['Search Volume'] || 0}, CPC: £${k.CPC || '0.00'})`)
      .join('\n');

    const wordCount = cluster.totalVolume > 20000 ? '2,000 - 2,500 words' : '1,200 - 1,800 words';

    return `# Content Brief: ${cluster.proposedTitle}

**Department Target:** ${cluster.department}
**Primary Intent:** ${cluster.intent}
**Target Publish Month:** ${cluster.assignedMonth || 'Month 1'}
**Recommended Word Count:** ${wordCount}
**Total Aggregate Search Volume Potential:** ${(cluster.totalVolume || 0).toLocaleString()}

---

## 1. Core SEO Targets
* **Primary Seed Term:** ${cluster.headTerm}
* **Target Audience:** Commercial contractors, landscapers, groundsmen, and residential garden enthusiasts looking for trusted tools and materials from Briants.

### Secondary & Long-Tail Keyword Cluster
${keywordsFormatted}

---

## 2. Recommended Article Outline

### H1: ${cluster.proposedTitle}

#### Introduction
- Hook the reader by addressing their core problem or question related to **${cluster.headTerm}**.
- Highlight Briants' expertise as leading suppliers of garden machinery, fencing, building, and arborist equipment.

#### H2: Why ${cluster.headTerm} Matters for Your Project
- Explain key features, durability, and practical applications.
- Include comparison metrics or key specifications.

#### H2: Top Features to Look For
- Break down essential buying factors (power source, material grade, sizing, safety standards).

#### H2: Recommended Products & Solutions at Briants
- Internal link to relevant product category: \`${cluster.department}\`.
- Feature top-selling items with direct call-to-action buttons.

#### H2: Frequently Asked Questions (FAQ)
- Answer long-tail questions identified in search intent.

#### Conclusion & Call to Action
- Summarize key recommendations.
- Prompt readers to visit Briants' store or contact expert advisors for advice.

---

## 3. On-Page & Technical Notes
- **Internal Links to Include:** Link to relevant Briants category pages and related blog posts.
- **Tone of Voice:** Authoritative, practical, encouraging, expert.
`;
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    renderKanban: renderKanban,
    generateContentBrief: generateContentBrief,
    KANBAN_STAGES: KANBAN_STAGES
  };
})();
