const CONTENT_STUDIO = {
  repository: 'PrajashTim/hairxpressions-website',
  workflow: 'generate-draft-post.yml',
  ref: 'main',
  pipelineSheet: 'Content Pipeline',
  seoTrackerSheet: 'SEO Tracker',
  seoDashboardSheet: 'SEO Dashboard',
  rankCheckLogSheet: 'Rank Check Log',
  searchConsoleSheet: 'Search Console Data',
  defaultSearchConsoleProperty: 'https://www.hairxpressionsva.com/'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Content Studio')
    .addItem('Open draft generator', 'showContentStudio')
    .addSeparator()
    .addItem('Set up SEO feedback loop', 'setupSeoFeedbackLoop')
    .addItem('Connect Search Console', 'connectSearchConsole')
    .addItem('Refresh SEO metrics', 'refreshSearchConsoleMetrics')
    .addSeparator()
    .addItem('Connect GitHub', 'connectGithub')
    .addToUi();
}

function showContentStudio() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('Content Studio');
  SpreadsheetApp.getUi().showSidebar(html);
}

function connectGithub() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Connect GitHub',
    'Paste a fine-grained GitHub token with Actions: Read and write access for this repository. It is stored only in your private Apps Script user properties, not in the sheet.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const token = response.getResponseText().trim();
  if (!token) return ui.alert('No token was saved.');
  PropertiesService.getUserProperties().setProperty('CONTENT_STUDIO_GITHUB_TOKEN', token);
  ui.alert('GitHub is connected for this Google account.');
}

function setupSeoFeedbackLoop() {
  const spreadsheet = SpreadsheetApp.getActive();
  const tracker = getOrCreateSheet_(spreadsheet, CONTENT_STUDIO.seoTrackerSheet);
  const dashboard = getOrCreateSheet_(spreadsheet, CONTENT_STUDIO.seoDashboardSheet);
  const rankLog = getOrCreateSheet_(spreadsheet, CONTENT_STUDIO.rankCheckLogSheet);
  const searchConsole = getOrCreateSheet_(spreadsheet, CONTENT_STUDIO.searchConsoleSheet);

  seedSeoTracker_(tracker);
  seedSeoDashboard_(dashboard);
  seedRankCheckLog_(rankLog);
  seedSearchConsoleData_(searchConsole);

  SpreadsheetApp.getUi().alert(
    'SEO feedback loop is ready. Start by recording a baseline organic rank for every query in SEO Tracker, then use Refresh SEO metrics after connecting Search Console. The dashboard will show what to improve next.'
  );
}

function connectSearchConsole() {
  const ui = SpreadsheetApp.getUi();
  const saved = PropertiesService.getUserProperties().getProperty('CONTENT_STUDIO_SEARCH_CONSOLE_PROPERTY') || CONTENT_STUDIO.defaultSearchConsoleProperty;
  const response = ui.prompt(
    'Connect Search Console',
    `Enter the verified Search Console property. Use ${CONTENT_STUDIO.defaultSearchConsoleProperty} for a URL-prefix property, or sc-domain:hairxpressionsva.com for a domain property. Current setting: ${saved}`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const property = response.getResponseText().trim();
  if (!property) return ui.alert('No Search Console property was saved.');
  PropertiesService.getUserProperties().setProperty('CONTENT_STUDIO_SEARCH_CONSOLE_PROPERTY', property);
  ui.alert('Search Console property saved. Enable the Search Console API in Apps Script Services, then choose Refresh SEO metrics.');
}

function refreshSearchConsoleMetrics() {
  const spreadsheet = SpreadsheetApp.getActive();
  const tracker = spreadsheet.getSheetByName(CONTENT_STUDIO.seoTrackerSheet);
  if (!tracker || tracker.getLastRow() < 2) {
    throw new Error('Choose Content Studio → Set up SEO feedback loop before refreshing metrics.');
  }

  const property = PropertiesService.getUserProperties().getProperty('CONTENT_STUDIO_SEARCH_CONSOLE_PROPERTY') || CONTENT_STUDIO.defaultSearchConsoleProperty;
  const timezone = spreadsheet.getSpreadsheetTimeZone();
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  const request = {
    startDate: Utilities.formatDate(start, timezone, 'yyyy-MM-dd'),
    endDate: Utilities.formatDate(end, timezone, 'yyyy-MM-dd'),
    dimensions: ['query', 'page'],
    rowLimit: 25000,
    type: 'web'
  };

  let response;
  try {
    // Requires Extensions → Apps Script → Services → Search Console API to be enabled once.
    response = SearchConsole.Searchanalytics.query(request, property);
  } catch (error) {
    throw new Error(`Search Console could not be read. Verify ownership of ${property} and enable the Search Console API in Apps Script Services. Details: ${error.message}`);
  }

  const resultRows = response.rows || [];
  writeSearchConsoleRows_(spreadsheet, resultRows, request.startDate, request.endDate);
  updateSeoTrackerMetrics_(tracker, resultRows);
  SpreadsheetApp.getUi().alert(`SEO metrics refreshed for ${request.startDate} through ${request.endDate}.`);
}

function getReadyTopics() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONTENT_STUDIO.pipelineSheet);
  if (!sheet) throw new Error('Content Pipeline sheet was not found.');
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  const index = headerIndex_(headers);
  return values
    .filter((row) => row[index.status].toLowerCase() === 'ready')
    .map((row) => ({
      id: row[index.id],
      title: row[index.title],
      cluster: index.cluster > -1 ? row[index.cluster] : '',
      targetKeyword: index.targetKeyword > -1 ? row[index.targetKeyword] : '',
      localIntent: index.localIntent > -1 ? row[index.localIntent] : ''
    }));
}

function requestDraft(topicId) {
  const token = PropertiesService.getUserProperties().getProperty('CONTENT_STUDIO_GITHUB_TOKEN');
  if (!token) throw new Error('Click Content Studio → Connect GitHub before requesting a draft.');
  const topics = getReadyTopics();
  const topic = topics.find((item) => String(item.id) === String(topicId));
  if (!topic) throw new Error('That topic is no longer marked Ready. Refresh the sidebar and try again.');

  const slug = slugify_(topic.title);
  const payload = {
    ref: CONTENT_STUDIO.ref,
    inputs: {
      topic_id: String(topic.id),
      title: topic.title,
      slug: slug,
      cluster: topic.cluster || 'General',
      target_keyword: topic.targetKeyword || '',
      local_intent: topic.localIntent || ''
    }
  };
  const url = `https://api.github.com/repos/${CONTENT_STUDIO.repository}/actions/workflows/${CONTENT_STUDIO.workflow}/dispatches`;
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 204) {
    throw new Error(`GitHub could not start the draft: ${response.getContentText()}`);
  }
  markDraftRequested_(topic.id);
  return {
    workflowUrl: `https://github.com/${CONTENT_STUDIO.repository}/actions/workflows/${CONTENT_STUDIO.workflow}`,
    slug: slug
  };
}

function markDraftRequested_(topicId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONTENT_STUDIO.pipelineSheet);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0];
  const index = headerIndex_(headers);
  const rowOffset = values.slice(1).findIndex((row) => String(row[index.id]) === String(topicId));
  if (rowOffset === -1) return;
  sheet.getRange(rowOffset + 2, index.status + 1).setValue('Draft requested');
}

function headerIndex_(headers) {
  const normalized = headers.map((header) => String(header).trim().toLowerCase());
  const find = (...names) => {
    const match = names.map((name) => normalized.indexOf(name)).find((value) => value > -1);
    return match === undefined ? -1 : match;
  };
  const index = {
    id: find('id'),
    status: find('status'),
    title: find('proposed title', 'title'),
    cluster: find('cluster'),
    targetKeyword: find('target keyword', 'keyword'),
    localIntent: find('local intent', 'intent')
  };
  if (index.id < 0 || index.status < 0 || index.title < 0) {
    throw new Error('Content Pipeline must include ID, Status, and Proposed title columns.');
  }
  return index;
}

function slugify_(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function seedSeoTracker_(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = [
    'Keyword', 'Target URL', 'Intent', 'Location', 'Result type', 'Baseline rank', 'Current rank', 'Rank change',
    'GSC clicks (28d)', 'GSC impressions (28d)', 'GSC CTR (28d)', 'GSC avg position', 'Square bookings',
    'Square revenue', 'Status', 'Next SEO action', 'Last checked'
  ];
  const site = 'https://www.hairxpressionsva.com';
  const rows = [
    ['hair salon fairfax va', `${site}/`, 'Find a full-service salon', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; strengthen the homepage only after measurement.', ''],
    ['beauty salon fairfax va', `${site}/`, 'Find a beauty salon', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; compare local intent language on the homepage.', ''],
    ['hair color fairfax va', `${site}/services/hair-color.html`, 'Book hair color', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; publish supporting color content only if the page is below page one.', ''],
    ['balayage fairfax va', `${site}/services/hair-color.html`, 'Book balayage', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; link relevant color guides to this service page.', ''],
    ['highlights fairfax va', `${site}/services/hair-color.html`, 'Book highlights', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; review the service page for highlights terminology.', ''],
    ['keratin treatment fairfax va', `${site}/services/keratin.html`, 'Book smoothing treatment', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; publish keratin aftercare and consultation content.', ''],
    ['brazilian blowout fairfax va', `${site}/services/keratin.html`, 'Book smoothing treatment', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; make sure service details match actual availability.', ''],
    ['lash extensions fairfax va', `${site}/services/brow-lash.html`, 'Book lash extensions', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; link the lash consultation guide to this service page.', ''],
    ['brow lamination fairfax va', `${site}/services/brow-lash.html`, 'Book brow service', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; publish a brow-service FAQ only if it fills a real question gap.', ''],
    ['eyebrow threading fairfax va', `${site}/services/waxing-threading.html`, 'Book threading', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; confirm pricing and service wording are current.', ''],
    ['facial fairfax va', `${site}/services/facials.html`, 'Book a facial', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; add a service-specific FAQ and internal links if needed.', ''],
    ['bridal hair fairfax va', `${site}/services/bridal.html`, 'Plan wedding hair', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; link the bridal consultation guide to this page.', ''],
    ['wedding hair fairfax va', `${site}/services/bridal.html`, 'Plan wedding hair', 'Fairfax, VA', 'Organic', '', '', '', '', '', '', '', '', '', '', 'Record baseline rank; add photos and proof of bridal work after measurement.', '']
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 8, rows.length, 1).setFormulas(rows.map((_, i) => [`=IF(OR(F${i + 2}="",G${i + 2}=""),"",F${i + 2}-G${i + 2})`]));
  sheet.getRange(2, 15, rows.length, 1).setFormulas(rows.map((_, i) => [`=IF(A${i + 2}="","",IF(G${i + 2}="","Needs baseline",IF(G${i + 2}<=3,"Top 3",IF(G${i + 2}<=10,"Page 1","Improve"))))`]));
  sheet.getRange(2, 16, rows.length, 1).setFormulas(rows.map((_, i) => [`=IF(A${i + 2}="","",IF(G${i + 2}="","Record a baseline organic rank in the Rank Check Log",IF(H${i + 2}<0,"Investigate the drop: page intent, competitors, internal links, Google Business Profile",IF(G${i + 2}>10,"Improve the target page, then publish or refresh one supporting article",IF(I${i + 2}=0,"Improve title/snippet and add local proof or FAQ content",IF(G${i + 2}<=3,"Protect the win: refresh quarterly and keep reviews current","Strengthen local relevance and internal links"))))))`]));
  sheet.getRange(2, 11, rows.length, 1).setNumberFormat('0.0%');
  sheet.getRange(2, 14, rows.length, 1).setNumberFormat('$#,##0.00');
  formatTrackerSheet_(sheet, headers.length);
}

function seedSeoDashboard_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.getRange('A1:D1').merge().setValue('Hair Xpressions SEO Command Center');
  sheet.getRange('A3:B9').setValues([
    ['Tracked queries', "=COUNTA('SEO Tracker'!A2:A)"],
    ['Top 3 organic results', "=COUNTIFS('SEO Tracker'!G2:G,\">0\",'SEO Tracker'!G2:G,\"<=3\")"],
    ['First-page organic results', "=COUNTIFS('SEO Tracker'!G2:G,\">0\",'SEO Tracker'!G2:G,\"<=10\")"],
    ['Queries improving', "=COUNTIF('SEO Tracker'!H2:H,\">0\")"],
    ['Google clicks (last 28d)', "=SUM('SEO Tracker'!I2:I)"],
    ['Square bookings recorded', "=SUM('SEO Tracker'!M2:M)"],
    ['Square revenue recorded', "=SUM('SEO Tracker'!N2:N)"]
  ]);
  sheet.getRange('A11:D11').setValues([['Keyword', 'Next SEO action', 'Current rank', 'GSC avg position']]);
  sheet.getRange('A12').setFormula("=IFERROR(FILTER({'SEO Tracker'!A2:A,'SEO Tracker'!P2:P,'SEO Tracker'!G2:G,'SEO Tracker'!L2:L},'SEO Tracker'!A2:A<>\"\",'SEO Tracker'!P2:P<>\"\"),\"No next SEO action queued.\")");
  sheet.getRange('A1:D1').setBackground('#782d4b').setFontColor('#ffffff').setFontWeight('bold').setFontSize(15).setHorizontalAlignment('center');
  sheet.getRange('A3:A9').setFontWeight('bold');
  sheet.getRange('A11:D11').setBackground('#e9dfe4').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 1, 220);
  sheet.setColumnWidths(2, 1, 360);
  sheet.setColumnWidths(3, 2, 140);
}

function seedRankCheckLog_(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['Date checked', 'Keyword', 'Location', 'Device', 'Result type', 'Observed rank', 'Target URL', 'Source', 'Notes'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange('A2').setValue('Use one row per weekly rank check. Keep the location/device consistent so rank movement is meaningful.');
  formatTrackerSheet_(sheet, headers.length);
}

function seedSearchConsoleData_(sheet) {
  if (sheet.getLastRow() > 0) return;
  const headers = ['Query', 'Page', 'Clicks', 'Impressions', 'CTR', 'Average position', 'Start date', 'End date', 'Imported at'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatTrackerSheet_(sheet, headers.length);
}

function formatTrackerSheet_(sheet, columnCount) {
  sheet.getRange(1, 1, 1, columnCount).setBackground('#782d4b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), columnCount).createFilter();
  for (let column = 1; column <= columnCount; column += 1) sheet.autoResizeColumn(column);
}

function writeSearchConsoleRows_(spreadsheet, rows, startDate, endDate) {
  const sheet = getOrCreateSheet_(spreadsheet, CONTENT_STUDIO.searchConsoleSheet);
  sheet.clearContents();
  const headers = ['Query', 'Page', 'Clicks', 'Impressions', 'CTR', 'Average position', 'Start date', 'End date', 'Imported at'];
  const importedAt = new Date();
  const values = rows.map((row) => [
    (row.keys || [])[0] || '', (row.keys || [])[1] || '', row.clicks || 0, row.impressions || 0, row.ctr || 0, row.position || 0,
    startDate, endDate, importedAt
  ]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (values.length) sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  sheet.getRange(2, 5, Math.max(values.length, 1), 1).setNumberFormat('0.0%');
  formatTrackerSheet_(sheet, headers.length);
}

function updateSeoTrackerMetrics_(tracker, searchRows) {
  const rowCount = tracker.getLastRow() - 1;
  if (rowCount < 1) return;
  const trackerRows = tracker.getRange(2, 1, rowCount, 17).getValues();
  const metrics = trackerRows.map((trackerRow) => {
    const keyword = normalizeSearchText_(trackerRow[0]);
    const page = normalizeUrl_(trackerRow[1]);
    const matches = searchRows.filter((row) => {
      const query = normalizeSearchText_(row.keys && row.keys[0]);
      const resultPage = normalizeUrl_(row.keys && row.keys[1]);
      return query.includes(keyword) && (!page || resultPage === page);
    });
    const clicks = matches.reduce((total, row) => total + (Number(row.clicks) || 0), 0);
    const impressions = matches.reduce((total, row) => total + (Number(row.impressions) || 0), 0);
    const weightedPosition = matches.reduce((total, row) => total + ((Number(row.position) || 0) * (Number(row.impressions) || 0)), 0);
    return [clicks, impressions, impressions ? clicks / impressions : '', impressions ? weightedPosition / impressions : ''];
  });
  tracker.getRange(2, 9, rowCount, 4).setValues(metrics);
  tracker.getRange(2, 11, rowCount, 1).setNumberFormat('0.0%');
}

function normalizeSearchText_(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeUrl_(value) {
  return String(value || '').trim().replace(/\/$/, '');
}
