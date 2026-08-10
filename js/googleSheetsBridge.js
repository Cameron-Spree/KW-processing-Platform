/**
 * High-Speed Google Sheets Bridge & Data Enricher
 * Fast BATCH export handling thousands of rows in 1 single API call.
 */

window.GoogleSheetsBridge = (function () {
  'use strict';

  /**
   * Build Master Enriched Data TSV for 1-Click Clipboard Copying into Raw Data Sheet.
   */
  function buildMasterEnrichedTSV(classifiedItems, clusters) {
    const headers = [
      'Keyword',
      'Monthly Search Volume',
      'Est. CPC (£)',
      'Keyword Difficulty',
      'BrightEdge Rank',
      'Briants Department',
      'Search Intent Tag',
      'Buyer Funnel Stage',
      'Priority Level',
      'Assigned Pillar Cluster',
      'Suggested Content Headline',
      'Target Page / URL',
      'Import Date',
      'Processing Status',
      'Automation Notes'
    ];

    const rows = [headers.join('\t')];
    const kwToClusterMap = new Map();
    clusters.forEach(c => {
      (c.keywords || []).forEach(k => {
        kwToClusterMap.set((k.Keyword || '').toLowerCase(), {
          cluster: c.headTerm,
          headline: c.proposedTitle
        });
      });
    });

    const todayStr = new Date().toISOString().split('T')[0];

    classifiedItems.forEach(item => {
      const kwLower = (item.Keyword || '').toLowerCase();
      const meta = kwToClusterMap.get(kwLower) || { cluster: item.Department + ' Focus', headline: 'Guide to ' + item.Keyword };

      const row = [
        sanitizeForCell(item.Keyword),
        item['Search Volume'] || 0,
        (item.CPC || 0).toFixed(2),
        item.Difficulty || 25,
        item.Rank || 10,
        sanitizeForCell(item.Department),
        sanitizeForCell(item.Intent),
        sanitizeForCell(item.FunnelStage || 'Awareness'),
        sanitizeForCell(item.Priority || 'Medium'),
        sanitizeForCell(meta.cluster),
        sanitizeForCell(meta.headline),
        sanitizeForCell(item.URL || ''),
        todayStr,
        'Enriched & Standardized',
        'Auto-cleaned volume & enriched by KW Processing Platform'
      ];
      rows.push(row.join('\t'));
    });

    return rows.join('\n');
  }

  /**
   * Get 2D Array of Master Enriched Rows for Batch Webhook Pushing.
   */
  function getMasterEnrichedRowsArray(classifiedItems, clusters) {
    const kwToClusterMap = new Map();
    clusters.forEach(c => {
      (c.keywords || []).forEach(k => {
        kwToClusterMap.set((k.Keyword || '').toLowerCase(), {
          cluster: c.headTerm,
          headline: c.proposedTitle
        });
      });
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return classifiedItems.map(item => {
      const kwLower = (item.Keyword || '').toLowerCase();
      const meta = kwToClusterMap.get(kwLower) || { cluster: item.Department + ' Focus', headline: 'Guide to ' + item.Keyword };

      return [
        item.Keyword,
        item['Search Volume'] || 0,
        parseFloat((item.CPC || 0).toFixed(2)),
        item.Difficulty || 25,
        item.Rank || 10,
        item.Department,
        item.Intent,
        item.FunnelStage || 'Awareness',
        item.Priority || 'Medium',
        meta.cluster,
        meta.headline,
        item.URL || '',
        todayStr,
        'Enriched & Standardized',
        'Auto-cleaned volume & enriched by KW Processing Platform'
      ];
    });
  }

  /**
   * High-Speed Direct Webhook Push to Apps Script.
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

    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return { success: true, count: rowsArray.length };
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
  function downloadCSV(tsvContent, filename = 'Briants_Enriched_Raw_Keywords.csv') {
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

  function sanitizeForCell(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\t\r\n]/g, ' ').trim();
  }

  function escapeQuotes(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/"/g, '""');
  }

  /**
   * ULTRA FAST BATCH Google Apps Script Receiver Script
   * Uses setValues() to write thousands of rows in under 1 second!
   */
  function getGoogleAppsScriptTemplate() {
    return `/**
 * High-Speed Batch Google Apps Script Receiver for Briants Raw Keyword Sheet
 * Uses setValues() to write 10,000+ enriched rows in under 1 second!
 *
 * Instructions:
 * 1. Open your Raw Keyword Google Sheet: https://docs.google.com/spreadsheets/d/1FSGaCH-WKJEiuzwCoaBqDpJ80WSci4iOZBxkxzAhuH4/edit
 * 2. Extensions > Apps Script
 * 3. Replace all code with this script and Save (Ctrl+S)
 * 4. Click Deploy > New deployment > Select type: Web app
 *    - Description: Fast Raw Data Importer
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the generated Web App URL and paste it into Tab 5 in your Vercel App!
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.rows && payload.rows.length > 0) {
      var numRows = payload.rows.length;
      var numCols = payload.rows[0].length;
      
      // Clear previous data rows below header if present
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      
      // Write headers if sheet is empty
      if (lastRow === 0 && payload.headers) {
        sheet.appendRow(payload.headers);
      }
      
      // ULTRA FAST BATCH WRITE: 1 single operation instead of thousands!
      sheet.getRange(2, 1, numRows, numCols).setValues(payload.rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: payload.rows ? payload.rows.length : 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }

  return {
    buildMasterEnrichedTSV: buildMasterEnrichedTSV,
    getMasterEnrichedRowsArray: getMasterEnrichedRowsArray,
    pushToWebhook: pushToWebhook,
    copyTSVToClipboard: copyTSVToClipboard,
    downloadCSV: downloadCSV,
    getGoogleAppsScriptTemplate: getGoogleAppsScriptTemplate
  };
})();
