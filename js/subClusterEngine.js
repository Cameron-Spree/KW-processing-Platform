/**
 * Enhanced Non-AI Sub-Clustering & Micro-Topic Audit Engine for Briants
 * Features Full State Serialization, Unclassified-Only Auto-Populate Engine, and Preserved LocalStorage State.
 */

window.SubClusterEngine = (function () {
  'use strict';

  // Primary Pillar Definitions
  let subThemeDefinitions = [
    {
      id: 'buying',
      label: 'Buying Guides & Comparisons',
      icon: '🛒',
      color: '#007aff',
      tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'for sale', 'cheap', 'cost', 'which', 'deal', 'offers'],
      microTopics: [
        { id: 'buying_battery', label: 'Battery / Cordless', tokens: ['battery', 'cordless', 'electric', 'rechargeable'] },
        { id: 'buying_petrol', label: 'Petrol & Engine', tokens: ['petrol', 'gas', '2 stroke', 'engine'] },
        { id: 'buying_small', label: 'Small & Mini Chainsaws', tokens: ['small', 'mini', 'compact', 'lightweight', 'handheld', 'one handed', 'top handle'] },
        { id: 'buying_budget', label: 'Budget & Price Deals', tokens: ['cheap', 'budget', 'price', 'cost', 'deal', 'under', 'affordable'] }
      ]
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Servicing',
      icon: '🛠️',
      color: '#ff9500',
      tokens: ['sharpen', 'sharpener', 'oil', 'spark plug', 'clean', 'service', 'maintenance', 'mix ratio', 'fuel', '2 stroke', 'tension', 'troubleshooting', 'repair', 'how to fix', 'servicing'],
      microTopics: [
        { id: 'maint_fuel', label: 'Fuel & Oil Mix Ratios', tokens: ['fuel', 'oil', 'mix ratio', '2 stroke', 'petrol mix', 'tank'] },
        { id: 'maint_sharpen', label: 'Chain Sharpening & Files', tokens: ['sharpen', 'sharpener', 'file', 'filing', 'grinder', 'angle'] },
        { id: 'maint_repair', label: 'Troubleshooting & Repairs', tokens: ['repair', 'service', 'won\'t start', 'spark plug', 'clean', 'tension', 'fix', 'troubleshooting'] }
      ]
    },
    {
      id: 'components',
      label: 'Components & Spares',
      icon: '⚙️',
      color: '#30b0c7',
      tokens: ['bar', 'chain', 'sprocket', 'carburetor', 'starter', 'spares', 'parts', 'filter', '14 inch', '16 inch', '18 inch', 'blade', 'engine', 'motor', 'battery'],
      microTopics: [
        { id: 'comp_bars_chains', label: 'Guide Bars & Chains', tokens: ['bar', 'chain', '14 inch', '16 inch', '18 inch', 'drive links', 'gauge'] },
        { id: 'comp_engine_spares', label: 'Carburetors & Filters', tokens: ['carburetor', 'filter', 'spark plug', 'starter', 'recoil', 'sprocket', 'spares'] }
      ]
    },
    {
      id: 'safety',
      label: 'Safety & PPE',
      icon: '🛡️',
      color: '#ff2d55',
      tokens: ['safety', 'ppe', 'trousers', 'chaps', 'helmet', 'boots', 'gloves', 'visor', 'protection', 'kickback', 'clothing', 'ear defenders', 'harness'],
      microTopics: [
        { id: 'safe_clothing', label: 'Chaps, Trousers & Boots', tokens: ['trousers', 'chaps', 'boots', 'gloves', 'clothing', 'protection'] },
        { id: 'safe_head_ear', label: 'Helmets, Visors & PPE', tokens: ['helmet', 'visor', 'ppe', 'ear defenders', 'safety', 'harness'] }
      ]
    },
    {
      id: 'brands',
      label: 'Brands & Manufacturers',
      icon: '🏷️',
      color: '#8b5cf6',
      tokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'titan', 'mountfield', 'einhell', 'milwaukee', 'honda', 'petzl', 'felco', 'celotex', 'catnic'],
      microTopics: [
        { id: 'brand_stihl', label: 'STIHL Models & Gear', tokens: ['stihl', 'ms 180', 'ms 211', 'gta 26'] },
        { id: 'brand_husqvarna', label: 'Husqvarna Models', tokens: ['husqvarna', '135', '435', '550'] },
        { id: 'brand_other', label: 'Makita, DeWalt & Others', tokens: ['makita', 'dewalt', 'titan', 'einhell', 'mountfield'] }
      ]
    },
    {
      id: 'usecases',
      label: 'Use Cases & Applications',
      icon: '🌲',
      color: '#10b981',
      tokens: ['pruning', 'firewood', 'logging', 'felling', 'arborist', 'tree surgeon', 'home use', 'garden', 'heavy duty', 'commercial', 'slabs', 'diy', 'construction'],
      microTopics: [
        { id: 'use_garden', label: 'Garden & Firewood', tokens: ['garden', 'firewood', 'pruning', 'home use', 'diy'] },
        { id: 'use_pro', label: 'Arborist & Logging', tokens: ['arborist', 'felling', 'logging', 'tree surgeon', 'heavy duty', 'commercial'] }
      ]
    }
  ];

  // Manual Keyword Branch Overrides Map (kw.toLowerCase() -> branchId)
  let manualOverrides = new Map();
  let rawDatasetCache = [];

  /**
   * Build 3-level Mindmap Data Tree with keyword audit & micro-topic metrics.
   */
  function buildTopicTree(classifiedItems, seedTopicFilter = 'all') {
    rawDatasetCache = classifiedItems || [];
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

    // Unclassified / Fallback / Discarded Queue
    branchMap.set('unclassified', {
      id: 'unclassified',
      label: 'Unclassified / To Be Assigned',
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
        const isUnassigned = branch.id === 'unclassified';

        const enrichedItem = {
          ...item,
          fitType: isUnassigned ? 'unclassified' : 'manual_override',
          fitLabel: isUnassigned ? 'Unassigned ❓' : 'Hand-Assigned ✋',
          assignedBranchId: branch.id,
          assignedBranchLabel: branch.label,
          microTopicLabel: assignMicroTopic(kw, branch)
        };
        branch.nodes.push(enrichedItem);
        branch.branchVolume += (item['Search Volume'] || 0);

        if (isUnassigned) {
          globalUnclassifiedCount++;
        } else {
          branch.exactCount++;
          globalExactCount++;
        }
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
        assignedBranchLabel: branch.label,
        microTopicLabel: assignMicroTopic(kw, branch)
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

  function assignMicroTopic(kw, branch) {
    if (!branch || !branch.microTopics || branch.microTopics.length === 0) return 'General';
    for (const micro of branch.microTopics) {
      for (const token of micro.tokens) {
        if (kw.includes(token)) {
          return micro.label;
        }
      }
    }
    return 'General';
  }

  /**
   * Bulk move all keywords in a pillar branch to Unclassified queue.
   */
  function bulkDiscardBranch(branchNodes) {
    if (!branchNodes || !Array.isArray(branchNodes)) return;
    branchNodes.forEach(node => {
      if (node.Keyword) {
        manualOverrides.set(node.Keyword.toLowerCase().trim(), 'unclassified');
      }
    });
  }

  /**
   * Add a user-defined custom category branch & auto-fill ONLY from UNCLASSIFIED queue.
   */
  function addCustomCategory(categoryName, categoryIcon = '📁', categoryTokens = [], autoFill = true) {
    const id = 'custom_' + categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const colors = ['#007aff', '#ff9500', '#10b981', '#af52de', '#ff2d55', '#30b0c7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const cleanTokens = categoryTokens.map(t => t.toLowerCase().trim()).filter(Boolean);

    // Auto-generate micro-topic definitions from tokens
    const autoMicroTopics = cleanTokens.map((token, idx) => {
      const formattedLabel = token.charAt(0).toUpperCase() + token.slice(1);
      return {
        id: `${id}_micro_${idx}`,
        label: `${formattedLabel} Focus`,
        tokens: [token]
      };
    });

    // Check if custom category already exists
    const existingIdx = subThemeDefinitions.findIndex(st => st.id === id);
    if (existingIdx >= 0) {
      subThemeDefinitions[existingIdx].label = categoryName;
      subThemeDefinitions[existingIdx].tokens = cleanTokens;
      subThemeDefinitions[existingIdx].microTopics = autoMicroTopics;
    } else {
      subThemeDefinitions.push({
        id: id,
        label: categoryName,
        icon: categoryIcon,
        color: randomColor,
        tokens: cleanTokens,
        microTopics: autoMicroTopics
      });
    }

    let autoFilledCount = 0;

    // STRICT UNCLASSIFIED-ONLY AUTO-FILL
    if (autoFill && cleanTokens.length > 0 && rawDatasetCache.length > 0) {
      const currentTree = buildTopicTree(rawDatasetCache);
      const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
      const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

      unclassifiedNodes.forEach(item => {
        const kw = (item.Keyword || '').toLowerCase().trim();
        for (const token of cleanTokens) {
          if (kw.includes(token)) {
            manualOverrides.set(kw, id);
            autoFilledCount++;
            break;
          }
        }
      });
    }

    return { id: id, autoFilledCount: autoFilledCount, microTopicsCount: autoMicroTopics.length };
  }

  /**
   * Auto-fill an existing branch ONLY from UNCLASSIFIED queue.
   */
  function autoFillBranch(branchId) {
    const branchDef = subThemeDefinitions.find(st => st.id === branchId);
    if (!branchDef || !branchDef.tokens || branchDef.tokens.length === 0 || rawDatasetCache.length === 0) return 0;

    let filledCount = 0;
    const currentTree = buildTopicTree(rawDatasetCache);
    const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
    const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

    unclassifiedNodes.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase().trim();
      for (const token of branchDef.tokens) {
        if (kw.includes(token)) {
          manualOverrides.set(kw, branchId);
          filledCount++;
          break;
        }
      }
    });

    return filledCount;
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

  /**
   * Serialize Engine State for LocalStorage persistence.
   */
  function exportEngineState() {
    return {
      subThemeDefinitions: subThemeDefinitions,
      manualOverrides: Array.from(manualOverrides.entries())
    };
  }

  /**
   * Deserialize Engine State from LocalStorage while preserving custom user categories.
   */
  function importEngineState(savedState) {
    if (!savedState) return;

    if (savedState.subThemeDefinitions && Array.isArray(savedState.subThemeDefinitions)) {
      // Merge saved custom categories into subThemeDefinitions
      savedState.subThemeDefinitions.forEach(savedDef => {
        const idx = subThemeDefinitions.findIndex(st => st.id === savedDef.id);
        if (idx >= 0) {
          subThemeDefinitions[idx] = savedDef;
        } else {
          subThemeDefinitions.push(savedDef);
        }
      });
    }

    if (savedState.manualOverrides && Array.isArray(savedState.manualOverrides)) {
      manualOverrides = new Map(savedState.manualOverrides);
    }
  }

  return {
    buildTopicTree: buildTopicTree,
    bulkDiscardBranch: bulkDiscardBranch,
    addCustomCategory: addCustomCategory,
    autoFillBranch: autoFillBranch,
    reassignKeyword: reassignKeyword,
    getSubThemes: getSubThemes,
    exportEngineState: exportEngineState,
    importEngineState: importEngineState
  };
})();
