/**
 * Google Sheets Bridge & Multi-Format Exporter
 */

window.GoogleSheetsBridge = (function () {
  'use strict';

  /**
   * Format dataset as Tab-Separated Values (TSV) for 1-click Ctrl+V into Google Sheets.
   * @param {Array} clusters - Topic clusters or keywords
   * @returns {string} TSV formatted string
   */
  function buildTSV(clusters) {
    const headers = [
      'Target Title / Topic',
      'Primary Seed Keyword',
      'Briants Department',
      'Search Intent',
      'Combined Volume',
      'Average CPC (£)',
      'Keyword Count',
      'Target Month',
      'Workflow Status',
      'Cluster Keywords'
    ];

    const rows = [headers.join('\t')];

    clusters.forEach(c => {
      const kwListStr = (c.keywords || []).map(k => k.Keyword).join(', ');
      const row = [
        sanitizeForCell(c.proposedTitle || c.headTerm),
        sanitizeForCell(c.headTerm),
        sanitizeForCell(c.department),
        sanitizeForCell(c.intent),
        c.totalVolume || 0,
        c.avgCPC || '0.00',
        c.keywordCount || 1,
        sanitizeForCell(c.assignedMonth || 'Month 1'),
        sanitizeForCell(c.status || 'Briefing'),
        sanitizeForCell(kwListStr)
      ];
      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  }

  /**
   * 1-Click Copy TSV directly to System Clipboard.
   */
  async function copyToGoogleSheetsClipboard(clusters) {
    const tsvData = buildTSV(clusters);
    try {
      await navigator.clipboard.writeText(tsvData);
      return { success: true, count: clusters.length };
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Download CSV File with UTF-8 BOM.
   */
  function downloadCSV(clusters, filename = 'Briants_SEO_Pipeline_Export.csv') {
    const headers = [
      'Target Title',
      'Primary Seed Keyword',
      'Department',
      'Search Intent',
      'Total Volume',
      'Avg CPC',
      'Keyword Count',
      'Target Month',
      'Workflow Status',
      'Keywords'
    ];

    const csvRows = [headers.map(h => `"${h}"`).join(',')];

    clusters.forEach(c => {
      const kwListStr = (c.keywords || []).map(k => k.Keyword).join(', ');
      const row = [
        `"${escapeQuotes(c.proposedTitle || c.headTerm)}"`,
        `"${escapeQuotes(c.headTerm)}"`,
        `"${escapeQuotes(c.department)}"`,
        `"${escapeQuotes(c.intent)}"`,
        c.totalVolume || 0,
        c.avgCPC || 0,
        c.keywordCount || 1,
        `"${escapeQuotes(c.assignedMonth || 'Month 1')}"`,
        `"${escapeQuotes(c.status || 'Briefing')}"`,
        `"${escapeQuotes(kwListStr)}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvString = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Helper to clean strings for tab cells.
   */
  function sanitizeForCell(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\t\r\n]/g, ' ').trim();
  }

  function escapeQuotes(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '""');
  }

  /**
   * Apps Script boilerplate code generator for users.
   */
  function getGoogleAppsScriptTemplate() {
    return `/**
 * Briants SEO Pipeline Google Sheets Receiver Script
 * Paste this in Google Sheets > Extensions > Apps Script and Deploy as Web App.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Clear existing data or append
    if (data.clearExisting) {
      sheet.clearContents();
      sheet.appendRow([
        "Target Title", "Primary Seed", "Department", "Intent", 
        "Combined Volume", "Avg CPC", "Month", "Status", "Keywords"
      ]);
    }
    
    data.clusters.forEach(function(c) {
      sheet.appendRow([
        c.proposedTitle,
        c.headTerm,
        c.department,
        c.intent,
        c.totalVolume,
        c.avgCPC,
        c.assignedMonth,
        c.status,
        c.keywords ? c.keywords.map(function(k){return k.Keyword;}).join(", ") : ""
      ]);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }

  return {
    buildTSV: buildTSV,
    copyToGoogleSheetsClipboard: copyToGoogleSheetsClipboard,
    downloadCSV: downloadCSV,
    getGoogleAppsScriptTemplate: getGoogleAppsScriptTemplate
  };
})();
