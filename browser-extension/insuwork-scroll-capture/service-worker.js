'use strict';

const TARGETS = [
  'https://counselor.happytalk.io/*',
  'https://dplanner.bomapp.co.kr/*'
];

function targetTabs() {
  return chrome.tabs.query({ url: TARGETS }).then((tabs) => tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)));
}

async function startOnTarget() {
  const tabs = await targetTabs();
  if (!tabs.length) return { ok: false, code: 'NO_TARGET' };
  const target = tabs.find((tab) => tab.active) || tabs[0];
  await chrome.windows.update(target.windowId, { focused: true });
  await chrome.tabs.update(target.id, { active: true });
  await new Promise((resolve) => setTimeout(resolve, 180));
  try {
    await chrome.tabs.sendMessage(target.id, { type: 'INSUWORK_CAPTURE_START' });
    return { ok: true };
  } catch (_error) {
    return { ok: false, code: 'RELOAD_TARGET' };
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id && TARGETS.some((pattern) => tab.url && tab.url.startsWith(pattern.replace('*', '')))) {
    chrome.tabs.sendMessage(tab.id, { type: 'INSUWORK_CAPTURE_START' }).catch(() => {});
    return;
  }
  await startOnTarget();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;
  if (message.type === 'INSUWORK_CAPTURE_FROM_SITE') {
    startOnTarget().then(sendResponse).catch(() => sendResponse({ ok: false, code: 'ERROR' }));
    return true;
  }
  if (message.type === 'INSUWORK_CAPTURE_VISIBLE') {
    if (!sender.tab) { sendResponse({ ok: false }); return false; }
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' })
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'INSUWORK_CAPTURE_DOWNLOAD') {
    chrome.downloads.download({ url: message.dataUrl, filename: message.filename || '보험워크-채팅-캡처.png', saveAs: true })
      .then((id) => sendResponse({ ok: true, id }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});
