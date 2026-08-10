/**
 * Semantic Keyword Pillar & Cluster Grouping Engine for Briants
 */

window.ClusteringEngine = (function () {
  'use strict';

  /**
   * Automatically group keyword dataset into pillar clusters.
   * @param {Array} dataset - Classified keyword items
   * @returns {Array} List of cluster objects
   */
  function generateClusters(dataset) {
    if (!dataset || dataset.length === 0) return [];

    // Sort dataset by Search Volume descending
    const sorted = [...dataset].sort((a, b) => b['Search Volume'] - a['Search Volume']);
    const clustersMap = new Map();
    const assignedKWIds = new Set();

    // Helper token normalizer
    function getTokens(str) {
      return str.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2 && !['for', 'the', 'and', 'with', 'near', 'best', 'top', 'how', 'vs', 'buying'].includes(t));
    }

    // Step 1: Form clusters starting from highest volume terms as seed heads
    sorted.forEach(item => {
      if (assignedKWIds.has(item.id)) return;

      const itemTokens = getTokens(item.Keyword);
      if (itemTokens.length === 0) return;

      // Check if item fits an existing cluster
      let matchedClusterKey = null;

      for (const [seedKey, cluster] of clustersMap.entries()) {
        const seedTokens = cluster.seedTokens;
        const overlap = itemTokens.filter(t => seedTokens.includes(t));
        // High semantic overlap if at least 2 tokens match or >60% match
        if (overlap.length >= 2 || (overlap.length === 1 && seedTokens.length === 1)) {
          matchedClusterKey = seedKey;
          break;
        }
      }

      if (matchedClusterKey) {
        const cluster = clustersMap.get(matchedClusterKey);
        cluster.keywords.push(item);
        assignedKWIds.add(item.id);
      } else {
        // Create new cluster with this item as seed head
        const clusterId = 'cluster_' + Math.random().toString(36).substr(2, 9);
        const newCluster = {
          id: clusterId,
          seedKeyword: item.Keyword,
          seedTokens: itemTokens,
          keywords: [item],
          department: item.Department || 'Gardening Products',
          status: 'Briefing',
          assignedMonth: 'Month 1'
        };
        clustersMap.set(clusterId, newCluster);
        assignedKWIds.add(item.id);
      }
    });

    // Step 2: Compute aggregate metrics & generate content titles
    const resultClusters = [];

    clustersMap.forEach(cluster => {
      const totalVolume = cluster.keywords.reduce((sum, k) => sum + (k['Search Volume'] || 0), 0);
      const totalCPC = cluster.keywords.reduce((sum, k) => sum + (k.CPC || 0), 0);
      const avgCPC = cluster.keywords.length > 0 ? (totalCPC / cluster.keywords.length) : 0;

      // Find dominant department and intent
      const deptCounts = {};
      const intentCounts = {};

      cluster.keywords.forEach(k => {
        deptCounts[k.Department] = (deptCounts[k.Department] || 0) + 1;
        intentCounts[k.Intent] = (intentCounts[k.Intent] || 0) + 1;
      });

      const dominantDept = Object.keys(deptCounts).reduce((a, b) => deptCounts[a] > deptCounts[b] ? a : b, cluster.department);
      const dominantIntent = Object.keys(intentCounts).reduce((a, b) => intentCounts[a] > intentCounts[b] ? a : b, 'Informational');

      // Auto-suggest blog title
      const proposedTitle = generateBlogTitle(cluster.seedKeyword, dominantIntent, dominantDept);

      // Priority Score based on total volume and intent multiplier
      const intentMultiplier = dominantIntent === 'Transactional' ? 1.5 : (dominantIntent === 'Commercial' ? 1.3 : 1.0);
      const priorityScore = Math.round((totalVolume / 100) * intentMultiplier + (avgCPC * 10));

      resultClusters.push({
        id: cluster.id,
        headTerm: cluster.seedKeyword,
        totalVolume: totalVolume,
        avgCPC: Math.round(avgCPC * 100) / 100,
        keywordCount: cluster.keywords.length,
        keywords: cluster.keywords,
        department: dominantDept,
        intent: dominantIntent,
        proposedTitle: proposedTitle,
        priorityScore: priorityScore,
        status: cluster.status,
        assignedMonth: cluster.assignedMonth
      });
    });

    // Sort clusters by Priority Score descending
    return resultClusters.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Auto-generate a click-worthy, SEO-optimized blog headline.
   */
  function generateBlogTitle(seedKeyword, intent, department) {
    const capitalized = seedKeyword.replace(/\b\w/g, l => l.toUpperCase());

    if (intent === 'Informational') {
      if (/how to/i.test(seedKeyword)) {
        return `${capitalized}: Step-by-Step Guide for Briants Customers`;
      }
      return `The Complete Guide to ${capitalized} (2026 Advice)`;
    } else if (intent === 'Commercial' || intent === 'Commercial/Informational') {
      return `Best ${capitalized}: Top Buyer Recommendations & Review`;
    } else if (intent === 'Transactional') {
      return `Where to Buy ${capitalized} – Quality & Value at Briants`;
    }
    return `Everything You Need to Know About ${capitalized}`;
  }

  return {
    generateClusters: generateClusters,
    generateBlogTitle: generateBlogTitle
  };
})();
