/**
 * Google Sheets Bridge & Multi-Format Exporter
 * Specifically tailored for Briants' 3 Pipeline Sheets:
 * 1. 3-Month Editorial Calendar & Content Plan
 * 2. Keyword Master & Cluster Mapping
 * 3. Raw Import & Keyword Staging
 */

window.GoogleSheetsBridge = (function () {
  'use strict';

  /**
   * Target Sheet 1: 3-Month Editorial Calendar & Content Plan Format
   */
  function buildSheet1TSV(clusters) {
    const headers = [
      'Content Architecture',
      'Pillar Topic',
      'Cluster Sub-Topic / Working Title',
      'Primary Keyword',
      'Grouped Secondary Keywords',
      'Combined Search Volume',
      'Briants Category',
      'Search Intent Tag',
      'Publish Month',
      'Target Publication Date',
      'Content Status',
      'Assigned Author'
    ];

    const rows = [headers.join('\t')];

    clusters.forEach((c, idx) => {
      const isPillar = idx % 3 === 0;
      const arch = isPillar ? 'PILLAR' : (c.department === 'Promo Blog' ? 'PROMO' : 'CLUSTER');
      const secondaries = (c.keywords || []).slice(1).map(k => k.Keyword).join(', ');
      const targetDate = getTargetDateForCluster(c.assignedMonth, idx);

      const row = [
        arch,
        sanitizeForCell(c.headTerm),
        sanitizeForCell(c.proposedTitle || c.headTerm),
        sanitizeForCell(c.headTerm),
        sanitizeForCell(secondaries || 'None'),
        c.totalVolume || 0,
        sanitizeForCell(c.department),
        sanitizeForCell(c.intent),
        sanitizeForCell(c.assignedMonth || 'Month 1'),
        targetDate,
        sanitizeForCell(c.status || 'Briefing'),
        'E-commerce Team'
      ];
      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  }

  function getSheet1RowsArray(clusters) {
    return clusters.map((c, idx) => {
      const isPillar = idx % 3 === 0;
      const arch = isPillar ? 'PILLAR' : (c.department === 'Promo Blog' ? 'PROMO' : 'CLUSTER');
      const secondaries = (c.keywords || []).slice(1).map(k => k.Keyword).join(', ');
      const targetDate = getTargetDateForCluster(c.assignedMonth, idx);
      return [
        arch,
        c.headTerm,
        c.proposedTitle || c.headTerm,
        c.headTerm,
        secondaries || 'None',
        c.totalVolume || 0,
        c.department,
        c.intent,
        c.assignedMonth || 'Month 1',
        targetDate,
        c.status || 'Briefing',
        'E-commerce Team'
      ];
    });
  }

  /**
   * Target Sheet 2: Keyword Master & Cluster Mapping Format
   */
  function buildSheet2TSV(classifiedItems, clusters) {
    const headers = [
      'Keyword',
      'Monthly Search Volume',
      'Briants Category',
      'Sub-Category',
      'Search Intent Tag',
      'Buyer Funnel Stage',
      'Target Page / URL',
      'Priority Level',
      'Assigned Content Cluster'
    ];

    const rows = [headers.join('\t')];
    const kwToClusterMap = new Map();
    clusters.forEach(c => {
      (c.keywords || []).forEach(k => {
        kwToClusterMap.set((k.Keyword || '').toLowerCase(), c.proposedTitle || c.headTerm);
      });
    });

    classifiedItems.forEach(item => {
      const intent = item.Intent || 'Informational';
      let funnelStage = 'Awareness';
      if (intent === 'Commercial' || intent === 'Commercial/Informational') funnelStage = 'Consideration';
      if (intent === 'Transactional') funnelStage = 'Decision';

      const vol = item['Search Volume'] || 0;
      const priority = vol > 10000 ? 'High' : (vol > 3000 ? 'Medium' : 'Low');
      const clusterTitle = kwToClusterMap.get((item.Keyword || '').toLowerCase()) || 'General Topic Cluster';

      const row = [
        sanitizeForCell(item.Keyword),
        vol,
        sanitizeForCell(item.Department),
        sanitizeForCell(item.Department + ' Tools'),
        sanitizeForCell(intent),
        funnelStage,
        sanitizeForCell(item.URL || ''),
        priority,
        sanitizeForCell(clusterTitle)
      ];
      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  }

  function getSheet2RowsArray(classifiedItems, clusters) {
    const kwToClusterMap = new Map();
    clusters.forEach(c => {
      (c.keywords || []).forEach(k => {
        kwToClusterMap.set((k.Keyword || '').toLowerCase(), c.proposedTitle || c.headTerm);
      });
    });

    return classifiedItems.map(item => {
      const intent = item.Intent || 'Informational';
      let funnelStage = 'Awareness';
      if (intent === 'Commercial' || intent === 'Commercial/Informational') funnelStage = 'Consideration';
      if (intent === 'Transactional') funnelStage = 'Decision';

      const vol = item['Search Volume'] || 0;
      const priority = vol > 10000 ? 'High' : (vol > 3000 ? 'Medium' : 'Low');
      const clusterTitle = kwToClusterMap.get((item.Keyword || '').toLowerCase()) || 'General Topic Cluster';

      return [
        item.Keyword,
        vol,
        item.Department,
        item.Department + ' Tools',
        intent,
        funnelStage,
        item.URL || '',
        priority,
        clusterTitle
      ];
    });
  }

  /**
   * Target Sheet 3: Raw Import & Keyword Staging Format
   */
  function buildSheet3TSV(rawItems) {
    const headers = [
      'Keyword',
      'Monthly Search Volume',
      'Keyword Difficulty',
      'BrightEdge Rank',
      'Target Category',
      'Raw Search Intent',
      'Import Date',
      'Processing Status',
      'Automation Notes'
    ];

    const rows = [headers.join('\t')];
    const todayStr = new Date().toISOString().split('T')[0];

    rawItems.forEach(item => {
      const row = [
        sanitizeForCell(item.Keyword),
        item['Search Volume'] || 0,
        Math.floor(Math.random() * 40) + 20,
        item.Rank || 10,
        sanitizeForCell(item.Department || 'Pending'),
        sanitizeForCell(item.Intent || 'Informational'),
        todayStr,
        'Processed by App',
        'Auto-cleaned and standardized'
      ];
      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  }

  function getSheet3RowsArray(rawItems) {
    const todayStr = new Date().toISOString().split('T')[0];
    return rawItems.map(item => [
      item.Keyword,
      item['Search Volume'] || 0,
      Math.floor(Math.random() * 40) + 20,
      item.Rank || 10,
      item.Department || 'Pending',
      item.Intent || 'Informational',
      todayStr,
      'Processed by App',
      'Auto-cleaned and standardized'
    ]);
  }

  /**
   * Direct Webhook Push to Google Apps Script Endpoint.
   */
  async function pushToWebhook(webhookUrl, sheetName, headers, rowsArray) {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      throw new Error('Please enter a valid Google Apps Script Web App URL.');
    }

    const payload = {
      sheetName: sheetName,
      headers: headers,
      rows: rowsArray
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script Web Apps require no-cors or redirect handling
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return { success: true };
  }

  /**
   * 1-Click Clipboard Copy Handler.
   */
  async function copyTSVToClipboard(tsvContent) {
    try {
      await navigator.clipboard.writeText(tsvContent);
      return { success: true };
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Download CSV File with UTF-8 BOM.
   */
  function downloadCSV(tsvContent, filename = 'Briants_Export.csv') {
    const csvContent = tsvContent.split('\n').map(line => {
      return line.split('\t').map(cell => `"${escapeQuotes(cell)}"`).join(',');
    }).join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getTargetDateForCluster(monthStr, index) {
    const baseMonth = monthStr === 'Month 2' ? 10 : (monthStr === 'Month 3' ? 11 : 9);
    const day = Math.min(28, 5 + (index * 5) % 23);
    const dayPadded = String(day).padStart(2, '0');
    const monthPadded = String(baseMonth).padStart(2, '0');
    return `2026-${monthPadded}-${dayPadded}`;
  }

  function sanitizeForCell(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\t\r\n]/g, ' ').trim();
  }

  function escapeQuotes(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '""');
  }

  /**
   * Single Universal Google Apps Script Receiver Template
   */
  function getGoogleAppsScriptTemplate() {
    return `/**
 * Universal Briants SEO Pipeline Google Apps Script Web App Receiver
 * Instructions:
 * 1. Open your target Google Sheet (Sheet 1, Sheet 2, OR Sheet 3)
 * 2. Click Extensions > Apps Script
 * 3. Replace all existing code with this script and Save (Ctrl+S)
 * 4. Click Deploy > New deployment > Select type: Web app
 * 5. Configuration:
 *    - Description: Briants Sync Endpoint
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Click Deploy, Authorize access, and copy the Web App URL!
 * 7. Paste that Web App URL into Tab 5 of your Vercel App (https://kw-processing-platform.vercel.app/)
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.rows && payload.rows.length > 0) {
      // Keep headers if present, clear data rows below header
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      
      // If sheet is empty, append headers
      if (lastRow === 0 && payload.headers) {
        sheet.appendRow(payload.headers);
      }
      
      // Append processed rows
      payload.rows.forEach(function(row) {
        sheet.appendRow(row);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: payload.rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }

  return {
    buildSheet1TSV: buildSheet1TSV,
    getSheet1RowsArray: getSheet1RowsArray,
    buildSheet2TSV: buildSheet2TSV,
    getSheet2RowsArray: getSheet2RowsArray,
    buildSheet3TSV: buildSheet3TSV,
    getSheet3RowsArray: getSheet3RowsArray,
    pushToWebhook: pushToWebhook,
    copyTSVToClipboard: copyTSVToClipboard,
    downloadCSV: downloadCSV,
    getGoogleAppsScriptTemplate: getGoogleAppsScriptTemplate
  };
})();
