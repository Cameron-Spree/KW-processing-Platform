/**
 * Taxonomy Rule Engine & Search Intent Analyzer for Briants
 */

window.TaxonomyEngine = (function () {
  'use strict';

  // Default Department Rule Dictionary
  let departmentRules = {
    "Fencing & Landscaping": [
      "fence", "fencing", "panel", "post", "trellis", "decking", "gravel", "sleeper", "sleepers",
      "acoustic", "featheredge", "closeboard", "paving", "turf", "concrete post", "gravel board"
    ],
    "Garden Machinery": [
      "mower", "lawnmower", "lawn mower", "chainsaw", "strimmer", "hedge trimmer", "scarifier",
      "leaf blower", "brushcutter", "automower", "stihl", "honda", "husqvarna", "mountfield", "gta 26"
    ],
    "Arborist & Forestry": [
      "arborist", "tree climbing", "harness", "climbing rope", "petzl", "log splitter", "wood chipper",
      "chipper", "winch", "chainsaw trousers", "helmet", "rigging", "felling", "forestry"
    ],
    "Building Materials": [
      "timber", "c24", "cement", "insulation", "celotex", "plasterboard", "lintel", "catnic",
      "damp proof", "dpm", "drainage", "building sand", "ballast", "mortar", "lime", "bricks"
    ],
    "Agricultural Supplies": [
      "electric fence", "trough", "sheep", "cattle", "equestrian", "stable", "rubber matting",
      "stock fencing", "field gate", "feed barrier", "livestock", "mineral lick"
    ],
    "Gardening Products": [
      "compost", "fertilizer", "plant food", "secateurs", "felco", "garden hose", "raised bed",
      "slug pellets", "greenhouse", "staging", "weedkiller", "pruning", "potting"
    ],
    "Promo Blog": [
      "guide", "review", "vs", "comparison", "best", "ideas", "checklist", "top 10", "autumn", "buyer"
    ]
  };

  /**
   * Main classifier for a single keyword item.
   */
  function classifyItem(item) {
    const kw = (item.Keyword || '').toLowerCase();
    const cpc = parseFloat(item.CPC || 0);

    // 1. Determine Department
    let assignedDept = 'Gardening Products'; // fallback default
    let maxMatches = 0;

    for (const [dept, tokens] of Object.entries(departmentRules)) {
      let matches = 0;
      for (const token of tokens) {
        if (kw.includes(token.toLowerCase())) {
          matches += (token.length > 3 ? 2 : 1); // weight longer specific terms higher
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        assignedDept = dept;
      }
    }

    // 2. Determine Search Intent
    let intent = 'Commercial';
    const isInfoQuestion = /\b(how|why|what|where|when|can|ideas|checklist|guide|tips|how to)\b/i.test(kw);
    const isCommercialEvaluation = /\b(best|review|vs|top|comparison|rated|recommended|cheap|pros and cons)\b/i.test(kw);
    const isTransactionalAction = /\b(buy|price|cost|hire|near me|for sale|supplier|stockist|order|bulk|roll|kit)\b/i.test(kw);

    if (isInfoQuestion && isCommercialEvaluation) {
      intent = 'Commercial/Informational';
    } else if (isInfoQuestion) {
      intent = 'Informational';
    } else if (isTransactionalAction || cpc > 2.50) {
      intent = 'Transactional';
    } else if (isCommercialEvaluation || cpc > 1.20) {
      intent = 'Commercial';
    } else {
      intent = 'Informational';
    }

    return {
      department: assignedDept,
      intent: intent
    };
  }

  /**
   * Run taxonomy classification on a whole dataset array.
   */
  function processDataset(dataset) {
    return dataset.map(item => {
      const res = classifyItem(item);
      return {
        ...item,
        Department: res.department,
        Intent: res.intent
      };
    });
  }

  function getRules() {
    return JSON.parse(JSON.stringify(departmentRules));
  }

  function updateRules(newRules) {
    departmentRules = { ...newRules };
  }

  return {
    classifyItem: classifyItem,
    processDataset: processDataset,
    getRules: getRules,
    updateRules: updateRules
  };
})();
