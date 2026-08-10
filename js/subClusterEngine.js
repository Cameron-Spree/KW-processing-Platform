/**
 * Enhanced Non-AI Sub-Clustering & Keyword Audit Engine for Briants
 * Calculates Match Fit Types (Exact Match, Best Fit/Shoehorned, Unclassified/Ignored)
 * Supports User-Created Custom Categories and Manual Keyword Reassignment.
 */

window.SubClusterEngine = (function () {
  'use strict';

  // Default Sub-Theme Definitions
  let subThemeDefinitions = [
    {
      id: 'buying',
      label: 'Buying Guides & Comparisons',
      icon: '🛒',
      color: '#007aff',
      tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'for sale', 'cheap', 'cost', 'which', 'deal', 'offers']
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Servicing',
      icon: '🛠️',
      color: '#ff9500',
      tokens: ['sharpen', 'sharpener', 'oil', 'spark plug', 'clean', 'service', 'maintenance', 'mix ratio', 'fuel', '2 stroke', 'tension', 'troubleshooting', 'repair', 'how to fix', 'servicing']
    },
    {
      id: 'components',
      label: 'Components & Spares',
      icon: '⚙️',
      color: '#30b0c7',
      tokens: ['bar', 'chain', 'sprocket', 'carburetor', 'starter', 'spares', 'parts', 'filter', '14 inch', '16 inch', '18 inch', 'blade', 'engine', 'motor', 'battery']
    },
    {
      id: 'safety',
      label: 'Safety & PPE',
      icon: '🛡️',
      color: '#ff2d55',
      tokens: ['safety', 'ppe', 'trousers', 'chaps', 'helmet', 'boots', 'gloves', 'visor', 'protection', 'kickback', 'clothing', 'ear defenders', 'harness']
    },
    {
      id: 'brands',
      label: 'Brands & Manufacturers',
      icon: '🏷️',
      color: '#8b5cf6',
      tokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'titan', 'mountfield', 'einhell', 'milwaukee', 'honda', 'petzl', 'felco', 'celotex', 'catnic']
    },
    {
      id: 'usecases',
      label: 'Use Cases & Applications',
      icon: '🌲',
      color: '#10b981',
      tokens: ['pruning', 'firewood', 'logging', 'felling', 'arborist', 'tree surgeon', 'home use', 'garden', 'heavy duty', 'commercial', 'slabs', 'diy', 'construction']
    }
  ];

  // Manual Keyword Branch Overrides Map (kw.toLowerCase() -> branchId)
  let manualOverrides = new Map();

  /**
   * Build 3-level Mindmap Data Tree with keyword audit metrics.
   */
  function buildTopicTree(classifiedItems, seedTopicFilter = 'all') {
    let filtered = classifiedItems;

    if (seedTopicFilter && seedTopicFilter !== 'all') {
      const targetToken = seedTopicFilter.toLowerCase().trim();
      filtered = classifiedItems.filter(item => (item.Keyword || '').toLowerCase().includes(targetToken));
    }

    if (filtered.length === 0) {
      filtered = classifiedItems;
    }

    const masterTitle = seedTopicFilter !== 'all' 
      ? seedTopicFilter.charAt(0).toUpperCase() + seedTopicFilter.slice(1) + ' Master Cluster' 
      : 'Briants Master Content Architecture';

    const totalMasterVolume = filtered.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);

    // Initialize Branch Map
    const branchMap = new Map();
    subThemeDefinitions.forEach(st => {
      branchMap.set(st.id, {
        ...st,
        branchVolume: 0,
        nodes: [],
        exactCount: 0,
        bestFitCount: 0
      });
    });

    // Unclassified / Fallback Branch
    branchMap.set('unclassified', {
      id: 'unclassified',
      label: 'Unclassified / Ignored Keywords',
      icon: '❓',
      color: '#86868b',
      branchVolume: 0,
      nodes: [],
      exactCount: 0,
      bestFitCount: 0
    });

    let globalExactCount = 0;
    let globalBestFitCount = 0;
    let globalUnclassifiedCount = 0;

    filtered.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase();

      // Check manual user override first
      if (manualOverrides.has(kw)) {
        const overrideBranchId = manualOverrides.get(kw);
        const branch = branchMap.get(overrideBranchId) || branchMap.get('unclassified');
        const enrichedItem = {
          ...item,
          fitType: 'manual_override',
          fitLabel: 'Hand-Assigned ✋',
          assignedBranchId: branch.id,
          assignedBranchLabel: branch.label
        };
        branch.nodes.push(enrichedItem);
        branch.branchVolume += (item['Search Volume'] || 0);
        branch.exactCount++;
        globalExactCount++;
        return;
      }

      // Heuristic token evaluation
      let bestBranchId = 'unclassified';
      let maxScore = 0;

      for (const st of subThemeDefinitions) {
        let score = 0;
        for (const token of st.tokens) {
          if (kw.includes(token)) {
            score += token.length > 3 ? 2 : 1;
          }
        }
        if (score > maxScore) {
          maxScore = score;
          bestBranchId = st.id;
        }
      }

      let fitType = 'unclassified';
      let fitLabel = 'Unclassified ❓';

      if (maxScore >= 2) {
        fitType = 'exact';
        fitLabel = 'Exact Match ✓';
        globalExactCount++;
      } else if (maxScore === 1) {
        fitType = 'best_fit';
        fitLabel = 'Best Fit ⚡';
        globalBestFitCount++;
      } else {
        globalUnclassifiedCount++;
      }

      const branch = branchMap.get(bestBranchId) || branchMap.get('unclassified');
      if (fitType === 'exact') branch.exactCount++;
      if (fitType === 'best_fit') branch.bestFitCount++;

      const enrichedItem = {
        ...item,
        fitType: fitType,
        fitLabel: fitLabel,
        assignedBranchId: branch.id,
        assignedBranchLabel: branch.label
      };

      branch.nodes.push(enrichedItem);
      branch.branchVolume += (item['Search Volume'] || 0);
    });

    const activeBranches = [];
    branchMap.forEach(branch => {
      if (branch.nodes.length > 0) {
        branch.nodes.sort((a, b) => (b['Search Volume'] || 0) - (a['Search Volume'] || 0));
        activeBranches.push(branch);
      }
    });

    return {
      id: 'root_master',
      label: masterTitle,
      totalVolume: totalMasterVolume,
      totalKeywords: filtered.length,
      audit: {
        exactCount: globalExactCount,
        bestFitCount: globalBestFitCount,
        unclassifiedCount: globalUnclassifiedCount
      },
      branches: activeBranches
    };
  }

  /**
   * Add a user-defined custom category branch.
   */
  function addCustomCategory(categoryName, categoryIcon = '📁', categoryTokens = []) {
    const id = 'custom_' + categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const colors = ['#007aff', '#ff9500', '#10b981', '#af52de', '#ff2d55', '#30b0c7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    subThemeDefinitions.push({
      id: id,
      label: categoryName,
      icon: categoryIcon,
      color: randomColor,
      tokens: categoryTokens.map(t => t.toLowerCase().trim()).filter(Boolean)
    });
  }

  /**
   * Reassign a keyword manually to a specific branch.
   */
  function reassignKeyword(keyword, targetBranchId) {
    if (!keyword) return;
    manualOverrides.set(keyword.toLowerCase().trim(), targetBranchId);
  }

  function getSubThemes() {
    return subThemeDefinitions;
  }

  return {
    buildTopicTree: buildTopicTree,
    addCustomCategory: addCustomCategory,
    reassignKeyword: reassignKeyword,
    getSubThemes: getSubThemes
  };
})();
