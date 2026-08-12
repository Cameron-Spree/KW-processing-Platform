/**
 * Enhanced Sub-Clustering & Dynamic Category Discovery Engine for Briants
 * Features Scoped Product Family Isolation (e.g. "Chainsaw Safety" vs "Hedge Trimmer Safety")
 * & Fresh Dataset Reset Engine.
 */

window.SubClusterEngine = (function () {
  'use strict';

  let subThemeDefinitions = [];
  let manualOverrides = new Map();
  let rawDatasetCache = [];
  let activeProductFamily = 'Chainsaws'; // Default Product Topic

  /**
   * Set active Product Topic Family (e.g. "Chainsaws", "Hedge Trimmers", "Fencing")
   */
  function setProductFamily(familyName) {
    if (familyName && familyName.trim()) {
      activeProductFamily = familyName.trim();
    }
  }

  function getProductFamily() {
    return activeProductFamily;
  }

  /**
   * Dynamic Category Discovery Engine: Scans raw dataset and scopes proposed categories to active Product Family.
   */
  function discoverDatasetCategories(classifiedItems, productFamily = activeProductFamily) {
    setProductFamily(productFamily);
    if (!classifiedItems || classifiedItems.length === 0) return [];

    const keywords = classifiedItems.map(i => (i.Keyword || '').toLowerCase().trim());
    const totalCount = keywords.length;
    const pf = activeProductFamily;

    const discoveryRules = [
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_buying`,
        label: `${pf} Buying Guides & Comparisons`,
        icon: '🛒',
        color: '#007aff',
        testTokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'cheap', 'cost', 'deal', 'hire', 'for sale'],
        suggestedTokens: ['best', 'top', 'vs', 'review', 'comparison', 'buying', 'price', 'cheap', 'hire']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_poles`,
        label: `${pf} Long Reach & Telescopic Models`,
        icon: '🔭',
        color: '#30b0c7',
        testTokens: ['long reach', 'telescopic', 'pole', 'extension', 'high hedge', 'reach', 'tall', 'one handed', 'handheld', 'small', 'mini'],
        suggestedTokens: ['long reach', 'telescopic', 'pole', 'extension', 'reach', 'small', 'mini']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_battery`,
        label: `${pf} Cordless & Battery Power`,
        icon: '⚡',
        color: '#10b981',
        testTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v', '40v', 'lithium'],
        suggestedTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_maint`,
        label: `${pf} Maintenance, Sharpening & Care`,
        icon: '🛠️',
        color: '#ff9500',
        testTokens: ['sharpen', 'sharpener', 'file', 'filing', 'blade', 'chain', 'lubricant', 'cleaner', 'spray', 'resin', 'oil', 'mix ratio', 'fuel'],
        suggestedTokens: ['sharpen', 'sharpener', 'file', 'blade', 'chain', 'lubricant', 'oil', 'mix ratio']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_engine`,
        label: `${pf} Petrol Engines & Engine Spares`,
        icon: '⛽',
        color: '#ff2d55',
        testTokens: ['petrol', 'gas', '2 stroke', 'engine', 'fuel', 'spark plug', 'carburetor', 'filter', 'sprocket', 'spares', 'parts'],
        suggestedTokens: ['petrol', 'gas', '2 stroke', 'engine', 'spark plug', 'carburetor', 'spares']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_brands`,
        label: `${pf} Brand Models & Specific Gear`,
        icon: '🏷️',
        color: '#8b5cf6',
        testTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan', 'einhell', 'mountfield'],
        suggestedTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_safety`,
        label: `${pf} Safety & Protective PPE`,
        icon: '🛡️',
        color: '#af52de',
        testTokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor', 'harness', 'trousers', 'boots', 'chaps'],
        suggestedTokens: ['safety', 'ppe', 'goggles', 'gloves', 'helmet', 'visor', 'trousers', 'chaps']
      },
      {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general`,
        label: `${pf} General Terms & Applications`,
        icon: '🌿',
        color: '#14b8a6',
        testTokens: ['trimmer', 'cutter', 'pruner', 'shears', 'saw', 'tool', 'equipment', 'machinery', 'garden', 'uk', 'work', 'heavy duty', 'arborist', 'diy'],
        suggestedTokens: ['trimmer', 'cutter', 'pruner', 'shears', 'saw', 'tool', 'equipment', 'machinery', 'garden', 'uk']
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
   * Apply dataset category proposals: Completely resets subThemeDefinitions to selected categories.
   */
  function applyDatasetCategoryProposals(selectedProposals) {
    if (!selectedProposals || selectedProposals.length === 0) return;

    // Completely wipe old categories to ensure fresh start per dataset
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

    manualOverrides.clear();
  }

  /**
   * Sweep ALL remaining Unclassified keywords into General Product Family Category.
   */
  function sweepUnclassifiedToCatchAll() {
    if (rawDatasetCache.length === 0) return 0;

    const pf = activeProductFamily;
    let generalBranch = subThemeDefinitions.find(st => st.id.includes('general') || st.id.includes('usecases'));
    
    if (!generalBranch) {
      generalBranch = {
        id: `disc_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general`,
        label: `${pf} General Terms & Category Terms`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['trimmer', 'cutter', 'pruner', 'shears', 'saw', 'tool', 'equipment', 'machinery', 'garden', 'uk'],
        microTopics: []
      };
      subThemeDefinitions.push(generalBranch);
    }

    const currentTree = buildTopicTree(rawDatasetCache);
    const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
    const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

    let sweptCount = 0;
    unclassifiedNodes.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase().trim();
      manualOverrides.set(kw, generalBranch.id);
      sweptCount++;
    });

    return sweptCount;
  }

  /**
   * Clear all sub-themes & manual overrides to start fresh.
   */
  function clearEngineState() {
    subThemeDefinitions = [];
    manualOverrides.clear();
    rawDatasetCache = [];
    activeProductFamily = 'Chainsaws';
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
      ? seedTopicFilter.charAt(0).toUpperCase() + seedTopicFilter.slice(1) + ` ${activeProductFamily} Architecture` 
      : `Briants ${activeProductFamily} Architecture`;

    const totalMasterVolume = filtered.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);

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

  function bulkDiscardBranch(branchNodes) {
    if (!branchNodes || !Array.isArray(branchNodes)) return;
    branchNodes.forEach(node => {
      if (node.Keyword) {
        manualOverrides.set(node.Keyword.toLowerCase().trim(), 'unclassified');
      }
    });
  }

  function addCustomCategory(categoryName, categoryIcon = '📁', categoryTokens = [], autoFill = true) {
    const id = 'custom_' + categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const colors = ['#007aff', '#ff9500', '#10b981', '#af52de', '#ff2d55', '#30b0c7'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const cleanTokens = categoryTokens.map(t => t.toLowerCase().trim()).filter(Boolean);

    const autoMicroTopics = cleanTokens.map((token, idx) => {
      const formattedLabel = token.charAt(0).toUpperCase() + token.slice(1);
      return {
        id: `${id}_micro_${idx}`,
        label: `${formattedLabel} Focus`,
        tokens: [token]
      };
    });

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

  function addBranchToken(branchId, token) {
    const branchDef = subThemeDefinitions.find(st => st.id === branchId);
    if (!branchDef || !token) return 0;
    const cleanToken = token.toLowerCase().trim();

    if (!branchDef.tokens.includes(cleanToken)) {
      branchDef.tokens.push(cleanToken);

      if (branchId.startsWith('custom_')) {
        const formattedLabel = cleanToken.charAt(0).toUpperCase() + cleanToken.slice(1);
        branchDef.microTopics.push({
          id: `${branchId}_micro_${Date.now()}`,
          label: `${formattedLabel} Focus`,
          tokens: [cleanToken]
        });
      }

      return autoFillBranch(branchId);
    }
    return 0;
  }

  function removeBranchToken(branchId, token) {
    const branchDef = subThemeDefinitions.find(st => st.id === branchId);
    if (!branchDef || !token) return;
    const cleanToken = token.toLowerCase().trim();

    branchDef.tokens = branchDef.tokens.filter(t => t !== cleanToken);
    if (branchDef.microTopics) {
      branchDef.microTopics = branchDef.microTopics.filter(m => !m.tokens.includes(cleanToken));
    }
  }

  function reassignKeyword(keyword, targetBranchId) {
    if (!keyword) return;
    manualOverrides.set(keyword.toLowerCase().trim(), targetBranchId);
  }

  function getSubThemes() {
    return subThemeDefinitions;
  }

  function exportEngineState() {
    return {
      subThemeDefinitions: subThemeDefinitions,
      manualOverrides: Array.from(manualOverrides.entries()),
      activeProductFamily: activeProductFamily
    };
  }

  function importEngineState(savedState) {
    if (!savedState) return;

    if (savedState.activeProductFamily) {
      activeProductFamily = savedState.activeProductFamily;
    }

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
    sweepUnclassifiedToCatchAll: sweepUnclassifiedToCatchAll,
    setProductFamily: setProductFamily,
    getProductFamily: getProductFamily,
    clearEngineState: clearEngineState,
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
