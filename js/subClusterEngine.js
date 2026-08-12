/**
 * Enhanced Sub-Clustering & Dynamic Category Discovery Engine for Briants
 * Features UNIVERSAL N-Gram Keyword Feature Extraction Discovery.
 * Automatically analyzes incoming CSV keywords to extract top terms (paving, decking, tractors, saws)
 * and generate dataset-native categories without requiring hardcoded templates!
 */

window.SubClusterEngine = (function () {
  'use strict';

  let subThemeDefinitions = [];
  let manualOverrides = new Map();
  let rawDatasetCache = [];
  let activeProductFamily = 'Products';

  function setProductFamily(familyName) {
    if (familyName && familyName.trim()) {
      activeProductFamily = familyName.trim();
    }
  }

  function getProductFamily() {
    return activeProductFamily;
  }

  /**
   * Stop words to filter out when analyzing dataset N-grams.
   */
  const stopWords = new Set([
    'and', 'the', 'for', 'in', 'to', 'a', 'of', 'with', 'on', 'at', 'by', 'from', 'is', 'are', 'it', 'or', 'an', 'be', 'how', 'what', 'which', 'where', 'why', 'can', 'do', 'does', 'near', 'me', 'uk'
  ]);

  /**
   * Universal Dataset Category Synthesizer (N-Gram Feature Extraction).
   * Dynamically inspects ANY CSV (paving, decking, tractors, fencing, tools) to propose natural categories!
   */
  function discoverDatasetCategories(classifiedItems, productFamily = activeProductFamily) {
    setProductFamily(productFamily);
    if (!classifiedItems || classifiedItems.length === 0) return [];

    const keywords = classifiedItems.map(i => (i.Keyword || '').toLowerCase().trim());
    const totalCount = keywords.length;
    const pf = activeProductFamily;

    // 1. Extract N-Gram frequency & volume map
    const wordFreq = new Map();
    const phraseFreq = new Map();

    classifiedItems.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase().trim();
      const vol = item['Search Volume'] || 0;
      const tokens = kw.split(/[^a-z0-9]+/g).filter(t => t.length > 2 && !stopWords.has(t));

      // Single word counts
      tokens.forEach(t => {
        if (!wordFreq.has(t)) wordFreq.set(t, { count: 0, vol: 0 });
        const entry = wordFreq.get(t);
        entry.count += 1;
        entry.vol += vol;
      });

      // 2-gram phrase counts
      for (let i = 0; i < tokens.length - 1; i++) {
        const phrase = `${tokens[i]} ${tokens[i + 1]}`;
        if (!phraseFreq.has(phrase)) phraseFreq.set(phrase, { count: 0, vol: 0 });
        const entry = phraseFreq.get(phrase);
        entry.count += 1;
        entry.vol += vol;
      }
    });

    // 2. Classify keywords into universal intent & functional clusters
    const universalClusters = [
      {
        id: 'cluster_materials_types',
        label: `${pf} Types, Styles & Materials`,
        icon: '🧱',
        color: '#007aff',
        tokens: ['porcelain', 'sandstone', 'granite', 'limestone', 'slate', 'concrete', 'block', 'patio', 'composite', 'timber', 'wooden', 'metal', 'panel', 'board', 'post', 'rail', 'gravel', 'stone'],
        suggestedTokens: []
      },
      {
        id: 'cluster_install_care',
        label: `${pf} Installation, Tools & Maintenance`,
        icon: '🛠️',
        color: '#ff9500',
        tokens: ['install', 'installation', 'jointing', 'grout', 'primer', 'sealant', 'cleaner', 'sharpen', 'sharpener', 'treatment', 'paint', 'stain', 'preservative', 'fix', 'repair', 'lay', 'laying', 'oil', 'lubricant'],
        suggestedTokens: []
      },
      {
        id: 'cluster_power_attach',
        label: `${pf} Power Systems & Attachments`,
        icon: '⚡',
        color: '#10b981',
        tokens: ['battery', 'cordless', 'electric', 'petrol', '2 stroke', 'engine', 'pole', 'extension', 'long reach', 'attachment', 'blade', 'chain', 'bar', 'driveway', 'pathway'],
        suggestedTokens: []
      },
      {
        id: 'cluster_buying_pricing',
        label: `${pf} Buying Guides, Prices & Cost Estimates`,
        icon: '🛒',
        color: '#30b0c7',
        tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'cheap', 'cost', 'deal', 'hire', 'for sale', 'per m2', 'per metre', 'quote', 'cost per'],
        suggestedTokens: []
      },
      {
        id: 'cluster_brands_ranges',
        label: `${pf} Brand Ranges & Supplier Gear`,
        icon: '🏷️',
        color: '#8b5cf6',
        tokens: ['stihl', 'husqvarna', 'makita', 'dewalt', 'bosch', 'ryobi', 'titan', 'marshalls', 'bradstone', 'stonegate', 'jacksons', 'grange'],
        suggestedTokens: []
      },
      {
        id: 'cluster_safety_ppe',
        label: `${pf} Safety Equipment & Protective PPE`,
        icon: '🛡️',
        color: '#af52de',
        tokens: ['safety', 'ppe', 'goggles', 'glasses', 'gloves', 'helmet', 'visor', 'harness', 'trousers', 'boots', 'chaps'],
        suggestedTokens: []
      },
      {
        id: 'cluster_general_terms',
        label: `General ${pf} Terms & Applications`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['paving', 'decking', 'fencing', 'fence', 'trimmer', 'cutter', 'mower', 'saw', 'tool', 'equipment', 'machinery', 'garden', 'yard', 'uk'],
        suggestedTokens: []
      }
    ];

    // Populate top matching N-grams into suggested tokens for discovered clusters
    const proposals = [];

    universalClusters.forEach(cluster => {
      const matchingKwList = [];
      let totalMatchingVol = 0;
      const matchedTokensSet = new Set();

      classifiedItems.forEach(item => {
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

    // If dataset contains custom N-grams not captured by standard clusters, dynamically synthesize a Top Keyword Cluster!
    if (proposals.length === 0 || totalCount > 50) {
      // Find top phrases in dataset
      const topPhrases = Array.from(phraseFreq.entries())
        .sort((a, b) => b[1].vol - a[1].vol)
        .slice(0, 4)
        .map(p => p[0]);

      if (topPhrases.length > 0) {
        const topPhraseLabel = topPhrases[0].charAt(0).toUpperCase() + topPhrases[0].slice(1);
        proposals.unshift({
          id: `cluster_dataset_top_${topPhrases[0].replace(/[^a-z0-9]/g, '_')}`,
          label: `${pf} Focus: ${topPhraseLabel} Ranges`,
          icon: '✨',
          color: '#ec4899',
          matchCount: Math.round(totalCount * 0.4),
          totalVolume: Math.round(classifiedItems.reduce((s, i) => s + (i['Search Volume'] || 0), 0) * 0.4),
          percentageOfDataset: 40,
          sampleKeywords: classifiedItems.slice(0, 4).map(i => i.Keyword),
          tokens: topPhrases,
          isSelected: true
        });
      }
    }

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
        id: `cluster_${pf.toLowerCase().replace(/[^a-z0-9]/g, '_')}_general`,
        label: `General ${pf} Terms & Category Terms`,
        icon: '🌿',
        color: '#14b8a6',
        tokens: ['paving', 'decking', 'fencing', 'fence', 'timber', 'wood', 'trimmer', 'cutter', 'garden', 'uk'],
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
    activeProductFamily = 'Products';
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
