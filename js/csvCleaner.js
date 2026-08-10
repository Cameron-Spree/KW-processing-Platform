/**
 * BrightEdge DataCubeX & Generic Keyword CSV Cleaner & Auto-Standardizer
 */

window.CSVCleaner = (function () {
  'use strict';

  /**
   * Main entry point to clean and standardize raw CSV content.
   * @param {string} csvText - Raw text content from CSV file
   * @returns {Object} { items: Array, summary: Object }
   */
  function processCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return { items: [], summary: { totalRows: 0, validRows: 0, deduplicated: 0, warnings: ['Empty or invalid CSV file.'] } };
    }

    const lines = parseCSVRows(csvText);
    if (lines.length < 2) {
      return { items: [], summary: { totalRows: lines.length, validRows: 0, deduplicated: 0, warnings: ['CSV does not contain header or data rows.'] } };
    }

    const headers = lines[0].map(h => h.trim().toLowerCase());
    const colMap = mapHeaders(headers);

    if (colMap.keyword === -1) {
      return { items: [], summary: { totalRows: lines.length - 1, validRows: 0, deduplicated: 0, warnings: ['Could not auto-detect a "Keyword" column in the header row.'] } };
    }

    const rawDataRows = lines.slice(1);
    const cleanedItems = [];
    const seenKeywords = new Map();
    let deduplicatedCount = 0;
    const warnings = [];

    rawDataRows.forEach((row, idx) => {
      if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) {
        return; // skip blank line
      }

      const rawKeyword = row[colMap.keyword] ? row[colMap.keyword].trim() : '';
      if (!rawKeyword) {
        return; // skip rows without a keyword
      }

      const cleanVolume = colMap.volume !== -1 ? parseVolume(row[colMap.volume]) : 0;
      const cleanCPC = colMap.cpc !== -1 ? parseCPC(row[colMap.cpc]) : 0;
      const cleanRank = colMap.rank !== -1 ? parseNumber(row[colMap.rank]) : null;
      const rawURL = colMap.url !== -1 && row[colMap.url] ? row[colMap.url].trim() : '';
      const rawIntent = colMap.intent !== -1 && row[colMap.intent] ? row[colMap.intent].trim() : '';

      const kwKey = rawKeyword.toLowerCase();

      if (seenKeywords.has(kwKey)) {
        deduplicatedCount++;
        // Keep the entry with higher search volume
        const existing = seenKeywords.get(kwKey);
        if (cleanVolume > existing['Search Volume']) {
          existing['Search Volume'] = cleanVolume;
          existing.CPC = cleanCPC;
          if (cleanRank !== null) existing.Rank = cleanRank;
          if (rawURL) existing.URL = rawURL;
        }
      } else {
        const item = {
          id: 'kw_' + Math.random().toString(36).substr(2, 9),
          Keyword: rawKeyword,
          'Search Volume': cleanVolume,
          CPC: cleanCPC,
          Rank: cleanRank,
          URL: rawURL,
          rawIntent: rawIntent
        };
        seenKeywords.set(kwKey, item);
        cleanedItems.push(item);
      }
    });

    return {
      items: cleanedItems,
      summary: {
        totalRows: rawDataRows.length,
        validRows: cleanedItems.length,
        deduplicated: deduplicatedCount,
        detectedHeaders: {
          Keyword: headers[colMap.keyword],
          Volume: colMap.volume !== -1 ? headers[colMap.volume] : 'Default (0)',
          CPC: colMap.cpc !== -1 ? headers[colMap.cpc] : 'Default (0)',
          Rank: colMap.rank !== -1 ? headers[colMap.rank] : 'N/A'
        },
        warnings: warnings
      }
    };
  }

  /**
   * Parse CSV string taking into account quotes and commas inside quotes.
   */
  function parseCSVRows(csvText) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // handle CRLF
        }
        currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.some(cell => cell.trim() !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Smart column header auto-resolver.
   */
  function mapHeaders(headers) {
    const map = { keyword: -1, volume: -1, cpc: -1, rank: -1, url: -1, intent: -1 };

    headers.forEach((h, idx) => {
      const col = h.trim().toLowerCase();
      if (map.keyword === -1 && (col.includes('keyword') || col.includes('query') || col === 'kw' || col.includes('phrase'))) {
        map.keyword = idx;
      } else if (map.volume === -1 && (col.includes('volume') || col.includes('search vol') || col === 'sv' || col.includes('searches'))) {
        map.volume = idx;
      } else if (map.cpc === -1 && (col.includes('cpc') || col.includes('cost per click') || col.includes('est. cpc'))) {
        map.cpc = idx;
      } else if (map.rank === -1 && (col.includes('rank') || col.includes('position') || col.includes('pos'))) {
        map.rank = idx;
      } else if (map.url === -1 && (col.includes('url') || col.includes('page') || col.includes('link'))) {
        map.url = idx;
      } else if (map.intent === -1 && (col.includes('intent') || col.includes('type'))) {
        map.intent = idx;
      }
    });

    return map;
  }

  /**
   * Strips formatting like commas from search volume ("14,800" -> 14800).
   */
  function parseVolume(val) {
    if (val === undefined || val === null) return 0;
    const sanitized = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseInt(sanitized, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Converts CPC string ("$1.85", "£2.10", "-", "N/A") to float.
   */
  function parseCPC(val) {
    if (val === undefined || val === null) return 0;
    const sanitized = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  /**
   * Helper to parse simple numeric ranks.
   */
  function parseNumber(val) {
    if (!val) return null;
    const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? null : num;
  }

  return {
    processCSV: processCSV
  };
})();
