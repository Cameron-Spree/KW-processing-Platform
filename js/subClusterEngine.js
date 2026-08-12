/**
 * Enhanced Sub-Clustering & Dynamic Category Discovery Engine for Briants
 * Features Pure Product-Aware N-Gram Feature Extraction Discovery (Fencing, Chainsaws, Hedge Trimmers, Mowers)
 * so categories reflect the ACTUAL terms in the dataset, avoiding improper hardcoded presets!
 */

window.SubClusterEngine = (function () {
  'use strict';

  let subThemeDefinitions = [];
  let manualOverrides = new Map();
  let rawDatasetCache = [];
  let activeProductFamily = 'Fencing & Landscaping';

  function setProductFamily(familyName) {
    if (familyName && familyName.trim()) {
      activeProductFamily = familyName.trim();
    }
  }

  function getProductFamily() {
    return activeProductFamily;
  }

  /**
   * Pure Product-Aware Category Discovery Engine.
   * Dynamically inspects the dataset terms to suggest relevant categories for ANY Briants product family!
   */
  function discoverDatasetCategories(classifiedItems, productFamily = activeProductFamily) {
    setProductFamily(productFamily);
    if (!classifiedItems || classifiedItems.length === 0) return [];

    const keywords = classifiedItems.map(i => (i.Keyword || '').toLowerCase().trim());
    const totalCount = keywords.length;
    const pf = activeProductFamily;

    // Feature clusters definitions across different Briants product departments
    const featureTemplates = [
      // 1. Fencing & Landscaping Feature Rules
      {
        id: 'feat_fence_panels_posts',
        matchTokens: ['panel', 'post', 'board', 'gravel', 'feather', 'picket', 'slat', 'closeboard', 'overlap', 'trellis', 'rail'],
        label: `${pf} Panels, Posts & Boards`,
        icon: '🪵',
        color: '#8b5cf6',
        suggestedTokens: ['panel', 'post', 'board', 'gravel board', 'feather edge', 'picket', 'trellis']
      },
      {
        id: 'feat_fence_gates_fittings',
        matchTokens: ['gate', 'latch', 'hinge', 'bracket', 'fitting', 'clip', 'post cap', 'hardware', 'lock'],
        label: `${pf} Gates, Hardware & Fittings`,
        icon: '🚧',
        color: '#ff9500',
        suggestedTokens: ['gate', 'latch', 'hinge', 'bracket', 'fitting', 'hardware']
      },
      {
        id: 'feat_fence_install_treatment',
        matchTokens: ['install', 'treatment', 'paint', 'stain', 'preservative', 'concrete', 'metpost', 'fix', 'erect', 'repair', 'cost per metre'],
        label: `${pf} Installation, Treatment & Maintenance`,
        icon: '🛠️',
        color: '#10b981',
        suggestedTokens: ['install', 'treatment', 'paint', 'stain', 'preservative', 'concrete', 'repair']
      },

      // 2. High-Reach & Attachment Specific Features (Only triggers if keywords actually contain them!)
      {
        id: 'feat_longreach_telescopic',
        matchTokens: ['long reach', 'telescopic', 'pole', 'extension', 'high hedge', 'high reach'],
        label: `${pf} Long Reach & Pole Attachments`,
        icon: '🔭',
        color: '#30b0c7',
        suggestedTokens: ['long reach', 'telescopic', 'pole', 'extension', 'reach']
      },

      // 3. Power Type Specific Features
      {
        id: 'feat_battery_cordless',
        matchTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v', '40v', 'lithium'],
        label: `${pf} Cordless & Battery Power`,
        icon: '⚡',
        color: '#10b981',
        suggestedTokens: ['battery', 'cordless', 'electric', 'rechargeable', '18v', '36v']
      },
      {
        id: 'feat_petrol_fuel',
        matchTokens: ['petrol', 'gas', '2 stroke', 'engine', 'fuel', 'mix ratio', 'spark plug', 'carburetor'],
        label: `${pf} Petrol Engines & Fuel Maintenance`,
        icon: '⛽',
        color: '#ff2d55',
        suggestedTokens: ['petrol', 'gas', '2 stroke', 'engine', 'fuel', 'spark plug']
      },

      // 4. Machinery Care, Sharpening & Blades (Triggers only if terms exist!)
      {
        id: 'feat_sharpening_blades',
        matchTokens: ['sharpen', 'sharpener', 'file', 'filing', 'blade', 'chain', 'lubricant', 'resin', 'sprocket', 'spares'],
        label: `${pf} Blades, Sharpening & Spares`,
        icon: '🔪',
        color: '#ff9500',
        suggestedTokens: ['sharpen', 'sharpener', 'file', 'blade', 'chain', 'spares']
      },

      // 5. Commercial, Buying Guides & Pricing
      {
        id: 'feat_buying_pricing',
        matchTokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'cheap', 'cost', 'deal', 'hire', 'for sale', 'quotes', 'per metre'],
        label: `${pf} Buying Guides, Prices & Cost Estimates`,
        icon: '🛒',
        color: '#007aff',
        suggestedTokens: ['best', 'top', 'vs', 'review', 'buying', 'price', 'cheap', 'cost', 'hire']
      },

      // 6. Brand Names & Manufacturers
      {
        id: 'feat_brands_models',
        matchTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan', 'einhell', 'jacksons', 'grange', 'forest garden'],
        label: `${pf} Brand Gear & Specific Models`,
        icon: '🏷️',
        color: '#8b5cf6',
        suggestedTokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'jacksons', 'grange']
      },

      // 7. Safety & Protective PPE
      {
        id: 'feat_safety_ppe',
        matchTokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor', 'harness', 'trousers', 'boots', 'chaps'],
        label: `${pf} Safety Equipment & Protective PPE`,
        icon: '🛡️',
        color: '#af52de',
        suggestedTokens: ['safety', 'ppe', 'goggles', 'gloves', 'helmet', 'visor', 'trousers', 'boots']
      },

      // 8. General Catch-All Category
      {
        id: 'feat_general_terms',
        matchTokens: ['fencing', 'fence', 'landscaping', 'timber', 'wood', 'garden', 'yard', 'uk', 'heavy duty', 'commercial', 'residential', 'diy'],
        label: `General ${pf} Terms & Applications`,
        icon: '🌿',
        color: '#14b8a6',
        suggestedTokens: ['fencing', 'fence', 'landscaping', 'timber', 'wood', 'garden', 'uk']
      }
    ];

    const proposals = [];

    featureTemplates.forEach(rule => {
      const matchingKwList = [];
      let totalMatchingVol = 0;

      classifiedItems.forEach(item => {
        const kw = (item.Keyword || '').toLowerCase().trim();
        for (const token of rule.matchTokens) {
          if (kw.includes(token)) {
            matchingKwList.push(item.Keyword);
            totalMatchingVol += (item['Search Volume'] || 0);
            break;
          }
        }
      });

      // ONLY include proposals that actually matched keywords in the dataset!
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

  function applyDatasetCategoryProposals(selectedProposals) {
    if (!selectedProposals || selectedProposals.length === 0) return;

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

  function sweepUnclassifiedToCatchAll() {
    if (rawDatasetCache.length === 0) return 0;

    const pf = activeProductFamily;
    let generalBranch = subThemeDefinitions.find(st => st.id.includes('general') || st.id.includes('usecases'));
    
    if (!generalBranch) {
      generalBranch = {
        id: `feat_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general`,
        label: `General ${pf} Terms & Category Terms`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['fencing', 'fence', 'timber', 'wood', 'trimmer', 'cutter', 'garden', 'uk'],
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

  function clearEngineState() {
    subThemeDefinitions = [];
    manualOverrides.clear();
    rawDatasetCache = [];
    activeProductFamily = 'Fencing & Landscaping';
  }

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
