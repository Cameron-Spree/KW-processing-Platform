/**
 * Enhanced Sub-Clustering & Dynamic Category Discovery Engine for Briants
 * Supports Strict Focus Topic Isolation (Chainsaws vs Fencing & Landscaping vs Hedge Trimmers).
 */

window.SubClusterEngine = (function () {
  'use strict';

  // Map of Focus Topic Name -> Array of SubTheme Definitions
  let topicCategoryMap = new Map();
  let manualOverrides = new Map(); // kw_key -> branchId
  let rawDatasetCache = [];
  let activeProductFamily = 'Fencing & Landscaping';
  let knownFocusTopics = new Set(['Chainsaws', 'Fencing & Landscaping', 'Hedge Trimmers']);

  function sanitizeProductFamily(rawName) {
    if (!rawName) return 'Products';
    let clean = String(rawName).replace(/\.[^/.]+$/, '');
    const boilerplateRegex = /(datacubex|brightedge|research|keywords|export|report|dataset|download|master|briants|list|seo)/gi;
    clean = clean.replace(boilerplateRegex, '');
    clean = clean.replace(/[^a-zA-Z0-9 &]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Products';
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  function setProductFamily(familyName) {
    if (familyName && familyName.trim()) {
      const clean = sanitizeProductFamily(familyName);
      activeProductFamily = clean;
      knownFocusTopics.add(clean);
    }
  }

  function getProductFamily() {
    return activeProductFamily;
  }

  function getKnownFocusTopics() {
    return Array.from(knownFocusTopics);
  }

  const stopWords = new Set([
    'and', 'the', 'for', 'in', 'to', 'a', 'of', 'with', 'on', 'at', 'by', 'from', 'is', 'are', 'it', 'or', 'an', 'be', 'how', 'what', 'which', 'where', 'why', 'can', 'do', 'does', 'near', 'me', 'uk'
  ]);

  /**
   * Discover dataset categories scoped strictly to activeProductFamily.
   */
  function discoverDatasetCategories(classifiedItems, productFamily = activeProductFamily) {
    setProductFamily(productFamily);
    if (!classifiedItems || classifiedItems.length === 0) return [];

    // Filter classifiedItems strictly by activeProductFamily if keywords have assigned FocusTopic
    const topicFiltered = classifiedItems.filter(i => !i.FocusTopic || i.FocusTopic === activeProductFamily);
    const targetItems = topicFiltered.length > 0 ? topicFiltered : classifiedItems;

    const totalCount = targetItems.length;
    const pf = activeProductFamily;

    const wordFreq = new Map();
    const phraseFreq = new Map();

    targetItems.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase().trim();
      const vol = item['Search Volume'] || 0;
      const tokens = kw.split(/[^a-z0-9]+/g).filter(t => t.length > 2 && !stopWords.has(t));

      tokens.forEach(t => {
        if (!wordFreq.has(t)) wordFreq.set(t, { count: 0, vol: 0 });
        const entry = wordFreq.get(t);
        entry.count += 1;
        entry.vol += vol;
      });

      for (let i = 0; i < tokens.length - 1; i++) {
        const phrase = `${tokens[i]} ${tokens[i + 1]}`;
        if (!phraseFreq.has(phrase)) phraseFreq.set(phrase, { count: 0, vol: 0 });
        const entry = phraseFreq.get(phrase);
        entry.count += 1;
        entry.vol += vol;
      }
    });

    const universalClusters = [
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_materials_types`,
        label: `${pf} Types, Styles & Materials`,
        icon: '🧱',
        color: '#007aff',
        tokens: ['porcelain', 'sandstone', 'granite', 'limestone', 'slate', 'concrete', 'block', 'patio', 'composite', 'timber', 'wooden', 'metal', 'panel', 'board', 'post', 'rail', 'gravel', 'stone'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_install_care`,
        label: `Installation, Repairs & Maintenance`,
        icon: '🛠️',
        color: '#ff9500',
        tokens: ['install', 'installation', 'jointing', 'grout', 'primer', 'sealant', 'cleaner', 'sharpen', 'sharpener', 'treatment', 'paint', 'stain', 'preservative', 'fix', 'repair', 'lay', 'laying', 'oil', 'lubricant'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_power_attach`,
        label: `Poles, Power & Attachments`,
        icon: '⚡',
        color: '#10b981',
        tokens: ['battery', 'cordless', 'electric', 'petrol', '2 stroke', 'engine', 'pole', 'extension', 'long reach', 'attachment', 'blade', 'chain', 'bar', 'driveway', 'pathway'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_buying_pricing`,
        label: `Buying Guides, Prices & Deals`,
        icon: '🛒',
        color: '#30b0c7',
        tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'cheap', 'cost', 'deal', 'hire', 'for sale', 'per m2', 'per metre', 'quote', 'cost per'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_brands_ranges`,
        label: `Brand Models & Supplier Ranges`,
        icon: '🏷️',
        color: '#8b5cf6',
        tokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan', 'marshalls', 'bradstone', 'stonegate', 'jacksons', 'grange'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_safety_ppe`,
        label: `Safety & Protective Gear`,
        icon: '🛡️',
        color: '#af52de',
        tokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor', 'harness', 'trousers', 'boots', 'chaps'],
        suggestedTokens: []
      },
      {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general_terms`,
        label: `General ${pf} Terms`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['paving', 'decking', 'fencing', 'fence', 'trimmer', 'cutter', 'mower', 'saw', 'tool', 'equipment', 'machinery', 'garden', 'yard', 'uk'],
        suggestedTokens: []
      }
    ];

    const proposals = [];

    universalClusters.forEach(cluster => {
      const matchingKwList = [];
      let totalMatchingVol = 0;
      const matchedTokensSet = new Set();

      targetItems.forEach(item => {
        const kw = (item.Keyword || '').toLowerCase().trim();
        for (const token of cluster.tokens) {
          if (kw.includes(token)) {
            matchingKwList.push(item.Keyword);
            totalMatchingVol += (item['Search Volume'] || 0);
            matchedTokensSet.add(token);
            break;
          }
        }
      });

      if (matchingKwList.length > 0) {
        const sampleKeywords = matchingKwList.slice(0, 4);
        const topTokens = Array.from(matchedTokensSet).slice(0, 6);

        proposals.push({
          id: cluster.id,
          label: cluster.label,
          icon: cluster.icon,
          color: cluster.color,
          matchCount: matchingKwList.length,
          totalVolume: totalMatchingVol,
          percentageOfDataset: Math.round((matchingKwList.length / totalCount) * 100),
          sampleKeywords: sampleKeywords,
          tokens: topTokens,
          isSelected: true
        });
      }
    });

    return proposals;
  }

  /**
   * Apply dataset category proposals strictly to activeProductFamily map.
   */
  function applyDatasetCategoryProposals(selectedProposals) {
    if (!selectedProposals || selectedProposals.length === 0) return;

    const formattedSubThemes = selectedProposals.map(prop => {
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

    topicCategoryMap.set(activeProductFamily, formattedSubThemes);
    subThemeDefinitions = formattedSubThemes;
  }

  /**
   * Sweep unclassified keywords strictly for activeProductFamily.
   */
  function sweepUnclassifiedToCatchAll() {
    if (rawDatasetCache.length === 0) return 0;

    const pf = activeProductFamily;
    let currentDefs = topicCategoryMap.get(pf) || subThemeDefinitions;

    let generalBranch = currentDefs.find(st => st.id.includes('general') || st.id.includes('usecases'));
    
    if (!generalBranch) {
      generalBranch = {
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general`,
        label: `General ${pf} Terms`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['paving', 'decking', 'fencing', 'fence', 'timber', 'wood', 'trimmer', 'cutter', 'garden', 'uk'],
        microTopics: []
      };
      currentDefs.push(generalBranch);
    }

    const currentTree = buildTopicTree(rawDatasetCache, pf);
    const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
    const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

    let sweptCount = 0;
    unclassifiedNodes.forEach(item => {
      const kwKey = `${pf.toLowerCase()}::${(item.Keyword || '').toLowerCase().trim()}`;
      manualOverrides.set(kwKey, generalBranch.id);
      sweptCount++;
    });

    return sweptCount;
  }

  function clearEngineState() {
    topicCategoryMap.clear();
    subThemeDefinitions = [];
    manualOverrides.clear();
    rawDatasetCache = [];
    knownFocusTopics = new Set(['Chainsaws', 'Fencing & Landscaping', 'Hedge Trimmers']);
    activeProductFamily = 'Fencing & Landscaping';
  }

  /**
   * Build 3-level Mindmap Data Tree strictly isolated by Focus Topic!
   */
  function buildTopicTree(classifiedItems, focusTopicFilter = activeProductFamily) {
    rawDatasetCache = classifiedItems || [];
    const targetTopic = focusTopicFilter || activeProductFamily;

    // STRICT ISOLATION: Filter classified items strictly by FocusTopic!
    let filtered = classifiedItems.filter(item => (item.FocusTopic || activeProductFamily) === targetTopic);

    if (filtered.length === 0) {
      // Fallback if item does not have explicit FocusTopic property yet
      filtered = classifiedItems;
    }

    const currentTopicDefs = topicCategoryMap.get(targetTopic) || subThemeDefinitions;

    const masterTitle = `Briants ${targetTopic} Architecture`;
    const totalMasterVolume = filtered.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);

    const branchMap = new Map();
    currentTopicDefs.forEach(st => {
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
      const kwKey = `${targetTopic.toLowerCase()}::${kw}`;

      if (manualOverrides.has(kwKey)) {
        const overrideBranchId = manualOverrides.get(kwKey);
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

      for (const st of currentTopicDefs) {
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
    const pf = activeProductFamily.toLowerCase();
    branchNodes.forEach(node => {
      if (node.Keyword) {
        const kwKey = `${pf}::${node.Keyword.toLowerCase().trim()}`;
        manualOverrides.set(kwKey, 'unclassified');
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

    let currentDefs = topicCategoryMap.get(activeProductFamily) || subThemeDefinitions;

    const existingIdx = currentDefs.findIndex(st => st.id === id);
    if (existingIdx >= 0) {
      currentDefs[existingIdx].label = categoryName;
      currentDefs[existingIdx].tokens = cleanTokens;
      currentDefs[existingIdx].microTopics = autoMicroTopics;
    } else {
      currentDefs.push({
        id: id,
        label: categoryName,
        icon: categoryIcon,
        color: randomColor,
        tokens: cleanTokens,
        microTopics: autoMicroTopics
      });
    }

    topicCategoryMap.set(activeProductFamily, currentDefs);
    subThemeDefinitions = currentDefs;

    let autoFilledCount = 0;

    if (autoFill && cleanTokens.length > 0 && rawDatasetCache.length > 0) {
      const currentTree = buildTopicTree(rawDatasetCache, activeProductFamily);
      const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
      const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

      unclassifiedNodes.forEach(item => {
        const kw = (item.Keyword || '').toLowerCase().trim();
        for (const token of cleanTokens) {
          if (kw.includes(token)) {
            const kwKey = `${activeProductFamily.toLowerCase()}::${kw}`;
            manualOverrides.set(kwKey, id);
            autoFilledCount++;
            break;
          }
        }
      });
    }

    return { id: id, autoFilledCount: autoFilledCount, microTopicsCount: autoMicroTopics.length };
  }

  function autoFillBranch(branchId) {
    let currentDefs = topicCategoryMap.get(activeProductFamily) || subThemeDefinitions;
    const branchDef = currentDefs.find(st => st.id === branchId);
    if (!branchDef || !branchDef.tokens || branchDef.tokens.length === 0 || rawDatasetCache.length === 0) return 0;

    let filledCount = 0;
    const currentTree = buildTopicTree(rawDatasetCache, activeProductFamily);
    const unclassifiedBranch = (currentTree.branches || []).find(b => b.id === 'unclassified');
    const unclassifiedNodes = unclassifiedBranch ? unclassifiedBranch.nodes : [];

    unclassifiedNodes.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase().trim();
      for (const token of branchDef.tokens) {
        if (kw.includes(token)) {
          const kwKey = `${activeProductFamily.toLowerCase()}::${kw}`;
          manualOverrides.set(kwKey, branchId);
          filledCount++;
          break;
        }
      }
    });

    return filledCount;
  }

  function addBranchToken(branchId, token) {
    let currentDefs = topicCategoryMap.get(activeProductFamily) || subThemeDefinitions;
    const branchDef = currentDefs.find(st => st.id === branchId);
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
    let currentDefs = topicCategoryMap.get(activeProductFamily) || subThemeDefinitions;
    const branchDef = currentDefs.find(st => st.id === branchId);
    if (!branchDef || !token) return;
    const cleanToken = token.toLowerCase().trim();

    branchDef.tokens = branchDef.tokens.filter(t => t !== cleanToken);
    if (branchDef.microTopics) {
      branchDef.microTopics = branchDef.microTopics.filter(m => !m.tokens.includes(cleanToken));
    }
  }

  function reassignKeyword(keyword, targetBranchId) {
    if (!keyword) return;
    const kwKey = `${activeProductFamily.toLowerCase()}::${keyword.toLowerCase().trim()}`;
    manualOverrides.set(kwKey, targetBranchId);
  }

  function getSubThemes() {
    return topicCategoryMap.get(activeProductFamily) || subThemeDefinitions;
  }

  function exportEngineState() {
    return {
      topicCategoryMap: Array.from(topicCategoryMap.entries()),
      manualOverrides: Array.from(manualOverrides.entries()),
      knownFocusTopics: Array.from(knownFocusTopics),
      activeProductFamily: activeProductFamily
    };
  }

  function importEngineState(savedState) {
    if (!savedState) return;

    if (savedState.activeProductFamily) {
      activeProductFamily = savedState.activeProductFamily;
    }

    if (savedState.knownFocusTopics && Array.isArray(savedState.knownFocusTopics)) {
      knownFocusTopics = new Set(savedState.knownFocusTopics);
    }

    if (savedState.topicCategoryMap && Array.isArray(savedState.topicCategoryMap)) {
      topicCategoryMap = new Map(savedState.topicCategoryMap);
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
    sanitizeProductFamily: sanitizeProductFamily,
    setProductFamily: setProductFamily,
    getProductFamily: getProductFamily,
    getKnownFocusTopics: getKnownFocusTopics,
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
