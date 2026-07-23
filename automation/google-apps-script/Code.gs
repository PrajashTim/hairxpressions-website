const CONTENT_STUDIO = {
  repository: 'PrajashTim/hairxpressions-website',
  workflow: 'generate-draft-post.yml',
  ref: 'main',
  pipelineSheet: 'Content Pipeline'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Content Studio')
    .addItem('Open draft generator', 'showContentStudio')
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
