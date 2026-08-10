/**
 * Non-AI Heuristic Sub-Clustering & Topic Architecture Engine
 * Groups master keyword clusters into 6 logical sub-themes:
 * 1. Buying Guides & Comparisons
 * 2. Maintenance & Servicing
 * 3. Components & Spares
 * 4. Safety & PPE
 * 5. Brands & Manufacturers
 * 6. Use Cases & Applications
 */

window.SubClusterEngine = (function () {
  'use strict';

  const SUB_THEMES = [
    {
      id: 'buying',
      label: 'Buying Guides & Comparisons',
      icon: '🛒',
      color: '#3b82f6',
      tokens: ['best', 'top', 'vs', 'review', 'comparison', 'guide', 'buying', 'price', 'for sale', 'cheap', 'cost', 'which', 'deal', 'offers']
    },
    {
      id: 'maintenance',
      label: 'Maintenance & Servicing',
      icon: '🛠️',
      color: '#f59e0b',
      tokens: ['sharpen', 'sharpener', 'oil', 'spark plug', 'clean', 'service', 'maintenance', 'mix ratio', 'fuel', '2 stroke', 'tension', 'troubleshooting', 'repair', 'how to fix', 'servicing']
    },
    {
      id: 'components',
      label: 'Components & Spares',
      icon: '⚙️',
      color: '#06b6d4',
      tokens: ['bar', 'chain', 'sprocket', 'carburetor', 'starter', 'spares', 'parts', 'filter', '14 inch', '16 inch', '18 inch', 'blade', 'engine', 'motor', 'battery']
    },
    {
      id: 'safety',
      label: 'Safety & PPE',
      icon: '🛡️',
      color: '#ef4444',
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

  /**
   * Build 3-level Mindmap Data Tree for a given seed filter term or all data.
   * @param {Array} classifiedItems - Full dataset
   * @param {string} seedTopicFilter - Target seed (e.g. "chainsaw", "fence", "timber", "all")
   */
  function buildTopicTree(classifiedItems, seedTopicFilter = 'all') {
    let filtered = classifiedItems;

    if (seedTopicFilter && seedTopicFilter !== 'all') {
      const targetToken = seedTopicFilter.toLowerCase().trim();
      filtered = classifiedItems.filter(item => (item.Keyword || '').toLowerCase().includes(targetToken));
    }

    if (filtered.length === 0) {
      filtered = classifiedItems; // fallback if filter yields empty
    }

    const masterTitle = seedTopicFilter !== 'all' 
      ? seedTopicFilter.charAt(0).toUpperCase() + seedTopicFilter.slice(1) + ' Master Cluster' 
      : 'Briants Master Content Architecture';

    const totalMasterVolume = filtered.reduce((sum, item) => sum + (item['Search Volume'] || 0), 0);

    // Group items into 6 sub-themes
    const subThemeMap = new Map();
    SUB_THEMES.forEach(st => {
      subThemeMap.set(st.id, {
        ...st,
        branchVolume: 0,
        nodes: []
      });
    });

    // General fallback branch
    subThemeMap.set('general', {
      id: 'general',
      label: 'General & Educational Overview',
      icon: '📚',
      color: '#64748b',
      branchVolume: 0,
      nodes: []
    });

    filtered.forEach(item => {
      const kw = (item.Keyword || '').toLowerCase();
      let matchedBranchId = 'general';

      for (const st of SUB_THEMES) {
        for (const token of st.tokens) {
          if (kw.includes(token)) {
            matchedBranchId = st.id;
            break;
          }
        }
        if (matchedBranchId !== 'general') break;
      }

      const branch = subThemeMap.get(matchedBranchId);
      branch.nodes.push(item);
      branch.branchVolume += (item['Search Volume'] || 0);
    });

    // Construct final JSON tree
    const branches = [];
    subThemeMap.forEach(branch => {
      if (branch.nodes.length > 0) {
        // Sort nodes by volume descending
        branch.nodes.sort((a, b) => (b['Search Volume'] || 0) - (a['Search Volume'] || 0));
        branches.push(branch);
      }
    });

    return {
      id: 'root_master',
      label: masterTitle,
      totalVolume: totalMasterVolume,
      totalKeywords: filtered.length,
      branches: branches
    };
  }

  return {
    buildTopicTree: buildTopicTree,
    SUB_THEMES: SUB_THEMES
  };
})();
