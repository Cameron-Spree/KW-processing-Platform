/**
 * Enhanced Sub-Clustering & Dynamic Category Discovery Engine for Briants
 * Scans incoming datasets (Hedge Trimmers, Chainsaws, Lawn Tractors, Fencing)
 * to propose tailored product pillars with sample keywords, justifications, and trigger tags.
 */

window.SubClusterEngine = (function () {
  'use strict';

  // Active Sub-Theme Definitions (Can be reset per dataset)
  let subThemeDefinitions = [];

  // Manual Keyword Branch Overrides Map (kw.toLowerCase() -> branchId)
  let manualOverrides = new Map();
  let rawDatasetCache = [];

  /**
   * Default fallback sub-themes if none are loaded.
   */
  const defaultSubThemes = [
    {
      id: 'buying',
      label: 'Buying Guides & Comparisons',
      icon: '🛒',
      color: '#007aff',
      tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'for sale', 'cheap', 'cost', 'which', 'deal', 'offers'],
      microTopics: [
        { id: 'buying_battery', label: 'Battery / Cordless', tokens: ['battery', 'cordless', 'electric', 'rechargeable'] },
        { id: 'buying_petrol', label: 'Petrol & Engine', tokens: ['petrol', 'gas', '2 stroke', 'engine'] },
        { id: 'buying_small', label: 'Small & Compact', tokens: ['small', 'mini', 'compact', 'lightweight', 'handheld', 'one handed'] },
        { id: 'buying_budget', label: 'Budget & Price Deals', tokens: ['cheap', 'budget', 'price', 'cost', 'deal', 'under', 'affordable'] }
      ]
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Servicing',
      icon: '🛠️',
      color: '#ff9500',
      tokens: ['sharpen', 'sharpener', 'oil', 'spark plug', 'clean', 'service', 'maintenance', 'mix ratio', 'fuel', '2 stroke', 'tension', 'troubleshooting', 'repair', 'how to fix', 'servicing', 'lubricant', 'blade'],
      microTopics: [
        { id: 'maint_fuel', label: 'Fuel & Oil Mix Ratios', tokens: ['fuel', 'oil', 'mix ratio', '2 stroke', 'petrol mix', 'tank'] },
        { id: 'maint_sharpen', label: 'Blade & Chain Sharpening', tokens: ['sharpen', 'sharpener', 'file', 'filing', 'grinder', 'angle'] },
        { id: 'maint_repair', label: 'Troubleshooting & Repairs', tokens: ['repair', 'service', 'won\'t start', 'spark plug', 'clean', 'tension', 'fix', 'troubleshooting'] }
      ]
    },
    {
      id: 'components',
      label: 'Components, Attachments & Spares',
      icon: '⚙️',
      color: '#30b0c7',
      tokens: ['bar', 'chain', 'sprocket', 'carburetor', 'starter', 'spares', 'parts', 'filter', 'blade', 'engine', 'motor', 'pole', 'extension', 'attachment', 'head'],
      microTopics: [
        { id: 'comp_blades_bars', label: 'Blades, Bars & Attachments', tokens: ['bar', 'chain', 'blade', 'pole', 'extension', 'attachment'] },
        { id: 'comp_spares', label: 'Carburetors, Filters & Engine Spares', tokens: ['carburetor', 'filter', 'spark plug', 'starter', 'recoil', 'sprocket', 'spares'] }
      ]
    },
    {
      id: 'safety',
      label: 'Safety & PPE',
      icon: '🛡️',
      color: '#ff2d55',
      tokens: ['safety', 'ppe', 'trousers', 'chaps', 'helmet', 'boots', 'gloves', 'visor', 'protection', 'kickback', 'clothing', 'ear defenders', 'harness', 'goggles'],
      microTopics: [
        { id: 'safe_clothing', label: 'Chaps, Trousers & Boots', tokens: ['trousers', 'chaps', 'boots', 'gloves', 'clothing', 'protection'] },
        { id: 'safe_head_ear', label: 'Helmets, Visors & Goggles', tokens: ['helmet', 'visor', 'ppe', 'ear defenders', 'safety', 'harness', 'goggles'] }
      ]
    },
    {
      id: 'brands',
      label: 'Brands & Manufacturers',
      icon: '🏷️',
      color: '#8b5cf6',
      tokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'titan', 'mountfield', 'einhell', 'milwaukee', 'honda', 'petzl', 'felco', 'celotex', 'catnic', 'bosch', 'ryobi'],
      microTopics: [
        { id: 'brand_stihl', label: 'STIHL Gear & Trimmers', tokens: ['stihl', 'hs 45', 'hla', 'gta'] },
        { id: 'brand_husqvarna', label: 'Husqvarna Models', tokens: ['husqvarna', '115i', '520i'] },
        { id: 'brand_other', label: 'Makita, DeWalt & Others', tokens: ['makita', 'dewalt', 'titan', 'einhell', 'bosch', 'ryobi'] }
      ]
    },
    {
      id: 'usecases',
      label: 'Use Cases & Applications',
      icon: '🌲',
      color: '#10b981',
      tokens: ['pruning', 'firewood', 'logging', 'felling', 'arborist', 'tree surgeon', 'home use', 'garden', 'heavy duty', 'commercial', 'slabs', 'diy', 'construction', 'hedge', 'trimming', 'high hedge', 'shrub'],
      microTopics: [
        { id: 'use_garden', label: 'Garden & Hedge Trimming', tokens: ['garden', 'hedge', 'trimming', 'pruning', 'shrub', 'home use', 'diy'] },
        { id: 'use_pro', label: 'High Reach & Commercial', tokens: ['arborist', 'felling', 'commercial', 'high hedge', 'heavy duty', 'pole'] }
      ]
    }
  ];

  subThemeDefinitions = JSON.parse(JSON.stringify(defaultSubThemes));

  /**
   * Dynamic Category Discovery Engine: Scans raw dataset to propose dataset-specific categories.
   */
  function discoverDatasetCategories(classifiedItems) {
    if (!classifiedItems || classifiedItems.length === 0) return [];

    const keywords = classifiedItems.map(i => (i.Keyword || '').toLowerCase().trim());
    const totalCount = keywords.length;

    // Pattern definitions to detect dataset features
    const discoveryRules = [
      {
        id: 'disc_poles_longreach',
        label: 'Long Reach & Telescopic Pole Tools',
        icon: '🔭',
        color: '#007aff',
        testTokens: ['long reach', 'telescopic', 'pole', 'extension', 'high hedge', 'reach', 'tall'],
        suggestedTokens: ['long reach', 'telescopic', 'pole', 'extension', 'high hedge', 'reach']
      },
      {
        id: 'disc_battery_cordless',
        label: 'Cordless & Battery Power Systems',
        icon: '⚡',
        color: '#10b981',
        testTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v', '40v', 'lithium'],
        suggestedTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v']
      },
      {
        id: 'disc_sharpening_care',
        label: 'Blade & Cutter Sharpening & Lubrication',
        icon: '🔪',
        color: '#ff9500',
        testTokens: ['sharpen', 'sharpener', 'file', 'filing', 'blade', 'lubricant', 'cleaner', 'spray', 'resin'],
        suggestedTokens: ['sharpen', 'sharpener', 'file', 'blade', 'lubricant', 'spray', 'resin']
      },
      {
        id: 'disc_petrol_engine',
        label: 'Petrol Engines & Fuel Maintenance',
        icon: '⛽',
        color: '#ff2d55',
        testTokens: ['petrol', 'gas', '2 stroke', 'engine', 'fuel', 'mix ratio', 'spark plug', 'carburetor'],
        suggestedTokens: ['petrol', 'gas', '2 stroke', 'engine', 'fuel', 'spark plug']
      },
      {
        id: 'disc_buying_reviews',
        label: 'Buying Guides, Reviews & Best Deals',
        icon: '🛒',
        color: '#30b0c7',
        testTokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'cheap', 'cost', 'deal', 'hire'],
        suggestedTokens: ['best', 'top', 'vs', 'review', 'comparison', 'buying', 'price', 'cheap', 'hire']
      },
      {
        id: 'disc_brands_models',
        label: 'Brand Models & Spares',
        icon: '🏷️',
        color: '#8b5cf6',
        testTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan', 'einhell', 'mountfield'],
        suggestedTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan']
      },
      {
        id: 'disc_safety_ppe',
        label: 'Safety Equipment & Protective PPE',
        icon: '🛡️',
        color: '#af52de',
        testTokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor', 'harness', 'trousers', 'boots'],
        suggestedTokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor']
      }
    ];

    const proposals = [];

    discoveryRules.forEach(rule => {
      const matchingKwList = [];
      let totalMatchingVol = 0;

      classifiedItems.forEach(item => {
        const kw = (item.Keyword || '').toLowerCase().trim();
        for (const token of rule.testTokens) {
          if (kw.includes(token)) {
            matchingKwList.push(item.Keyword);
            totalMatchingVol += (item['Search Volume'] || 0);
            break;
          }
        }
      });

      if (matchingKwList.length > 0) {
        // Sample up to 4 keywords for display
        const sampleKeywords = matchingKwList.slice(0, 4);

        proposals.push({
          id: rule.id,
          label: rule.label,
          icon: rule.icon,
          color: rule.color,
          matchCount: matchingKwList.length,
          totalVolume: totalMatchingVol,
          percentageOfDataset: Math.round((matchingKwList.length / totalCount) * 100),
          sampleKeywords: sampleKeywords,
          tokens: rule.suggestedTokens,
          isSelected: true
        });
      }
    });

    return proposals;
  }

  /**
   * Apply dataset category proposals: Resets subThemeDefinitions to selected categories.
   */
  function applyDatasetCategoryProposals(selectedProposals) {
    if (!selectedProposals || selectedProposals.length === 0) return;

    // Reset sub-theme definitions
    subThemeDefinitions = selectedProposals.map(prop => {
      const autoMicroTopics = prop.tokens.map((token, idx) => {
        const formattedLabel = token.charAt(0).toUpperCase() + token.slice(1);
        return {
          id: `${prop.id}_micro_${idx}`,
          label: `${formattedLabel} Focus`,
          tokens: [token]
        };
      });

      return {
        id: prop.id,
        label: prop.label,
        icon: prop.icon,
        color: prop.color,
        tokens: prop.tokens,
        microTopics: autoMicroTopics
      };
    });

    // Reset manual overrides so fresh dataset gets cleanly auto-sorted into new categories!
    manualOverrides.clear();
  }

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
   * Add a trigger token to a pillar category and auto-update micro-topics.
   */
  function addBranchToken(branchId, token) {
    const branchDef = subThemeDefinitions.find(st => st.id === branchId);
    if (!branchDef || !token) return 0;
    const cleanToken = token.toLowerCase().trim();

    if (!branchDef.tokens.includes(cleanToken)) {
      branchDef.tokens.push(cleanToken);

      // Auto-generate micro-topic pill for new token if custom branch
      if (branchId.startsWith('custom_')) {
        const formattedLabel = cleanToken.charAt(0).toUpperCase() + cleanToken.slice(1);
        branchDef.microTopics.push({
          id: `${branchId}_micro_${Date.now()}`,
          label: `${formattedLabel} Focus`,
          tokens: [cleanToken]
        });
      }

      // Automatically re-scan Unclassified pool for new token!
      return autoFillBranch(branchId);
    }
    return 0;
  }

  /**
   * Remove a trigger token from a pillar category.
   */
  function removeBranchToken(branchId, token) {
    const branchDef = subThemeDefinitions.find(st => st.id === branchId);
    if (!branchDef || !token) return;
    const cleanToken = token.toLowerCase().trim();

    branchDef.tokens = branchDef.tokens.filter(t => t !== cleanToken);
    if (branchDef.microTopics) {
      branchDef.microTopics = branchDef.microTopics.filter(m => !m.tokens.includes(cleanToken));
    }
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
      subThemeDefinitions = savedState.subThemeDefinitions;
    }

    if (savedState.manualOverrides && Array.isArray(savedState.manualOverrides)) {
      manualOverrides = new Map(savedState.manualOverrides);
    }
  }

  return {
    buildTopicTree: buildTopicTree,
    discoverDatasetCategories: discoverDatasetCategories,
    applyDatasetCategoryProposals: applyDatasetCategoryProposals,
    bulkDiscardBranch: bulkDiscardBranch,
    addCustomCategory: addCustomCategory,
    autoFillBranch: autoFillBranch,
    addBranchToken: addBranchToken,
    removeBranchToken: removeBranchToken,
    reassignKeyword: reassignKeyword,
    getSubThemes: getSubThemes,
    exportEngineState: exportEngineState,
    importEngineState: importEngineState
  };
})();
