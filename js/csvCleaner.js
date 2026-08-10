/**
 * High-Speed CSV Cleaner & Data Normalizer
 * Optimized to parse and standardize 10,000+ rows in milliseconds.
 */

window.CSVCleaner = (function () {
  'use strict';

  /**
   * Fast CSV Parser for thousands of rows.
   */
  function processCSV(csvText) {
    const startTime = performance.now();
    if (!csvText || typeof csvText !== 'string') {
      return { items: [], summary: { totalRows: 0, validRows: 0, deduplicated: 0, executionTimeMs: 0, warnings: ['Empty file.'] } };
    }

    // Fast line split handling CRLF & LF
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
      return { items: [], summary: { totalRows: 0, validRows: 0, deduplicated: 0, executionTimeMs: 0, warnings: ['No header or data rows found.'] } };
    }

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
    const colMap = mapHeaders(headers);

    if (colMap.keyword === -1) {
      return { items: [], summary: { totalRows: lines.length - 1, validRows: 0, deduplicated: 0, executionTimeMs: 0, warnings: ['Could not detect a "Keyword" column header.'] } };
    }

    const cleanedItems = [];
    const seenKeywords = new Map();
    let deduplicatedCount = 0;
    let totalDataRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue; // skip empty lines

      totalDataRows++;
      const cells = parseCSVLine(line);
      const rawKeyword = cells[colMap.keyword] ? cells[colMap.keyword].trim() : '';
      if (!rawKeyword || rawKeyword.length < 2) continue;

      const cleanVolume = colMap.volume !== -1 ? parseVolumeFast(cells[colMap.volume]) : 0;
      const cleanCPC = colMap.cpc !== -1 ? parseCPCFast(cells[colMap.cpc]) : 0;
      const cleanRank = colMap.rank !== -1 ? parseRankFast(cells[colMap.rank]) : null;
      const cleanDifficulty = colMap.difficulty !== -1 ? parseRankFast(cells[colMap.difficulty]) : null;
      const rawURL = colMap.url !== -1 && cells[colMap.url] ? cells[colMap.url].trim() : '';

      const kwLower = rawKeyword.toLowerCase();

      if (seenKeywords.has(kwLower)) {
        deduplicatedCount++;
        const existing = seenKeywords.get(kwLower);
        if (cleanVolume > existing['Search Volume']) {
          existing['Search Volume'] = cleanVolume;
          existing.CPC = cleanCPC;
          if (cleanRank !== null) existing.Rank = cleanRank;
          if (rawURL) existing.URL = rawURL;
        }
      } else {
        const item = {
          id: 'kw_' + i,
          Keyword: rawKeyword,
          'Search Volume': cleanVolume,
          CPC: cleanCPC,
          Rank: cleanRank,
          Difficulty: cleanDifficulty,
          URL: rawURL
        };
        seenKeywords.set(kwLower, item);
        cleanedItems.push(item);
      }
    }

    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);

    return {
      items: cleanedItems,
      summary: {
        totalRows: totalDataRows,
        validRows: cleanedItems.length,
        deduplicated: deduplicatedCount,
        executionTimeMs: executionTimeMs,
        detectedHeaders: headers
      }
    };
  }

  /**
   * Fast regular expressions for line cell splitting.
   */
  function parseCSVLine(line) {
    const cells = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cell);
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell);
    return cells;
  }

  function mapHeaders(headers) {
    const map = { keyword: -1, volume: -1, cpc: -1, rank: -1, url: -1, difficulty: -1 };
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
      } else if (map.difficulty === -1 && (col.includes('difficulty') || col.includes('kd') || col.includes('competition'))) {
        map.difficulty = idx;
      } else if (map.url === -1 && (col.includes('url') || col.includes('page') || col.includes('link'))) {
        map.url = idx;
      }
    });
    return map;
  }

  function parseVolumeFast(val) {
    if (!val) return 0;
    const str = String(val);
    let numStr = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 48 && code <= 57) {
        numStr += str[i];
      }
    }
    return numStr ? parseInt(numStr, 10) : 0;
  }

  function parseCPCFast(val) {
    if (!val) return 0;
    const sanitized = String(val).replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  function parseRankFast(val) {
    if (!val) return null;
    const sanitized = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(sanitized, 10);
    return isNaN(num) ? null : num;
  }

  return {
    processCSV: processCSV
  };
})();
