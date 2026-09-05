'use strict';

const TARGETS = [
  'https://counselor.happytalk.io/*',
  'https://dplanner.bomapp.co.kr/*'
];
const TARGET_BY_SITE = {
  happytalk: 'https://counselor.happytalk.io/*',
  bomapp: 'https://dplanner.bomapp.co.kr/*'
};

const CAPTURE_INTERVAL_MS = 650;
let lastCaptureStartedAt = 0;
let captureQueue = Promise.resolve();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function captureVisibleThrottled(windowId) {
  const task = captureQueue.then(async () => {
    const remaining = CAPTURE_INTERVAL_MS - (Date.now() - lastCaptureStartedAt);
    if (remaining > 0) await wait(remaining);
    lastCaptureStartedAt = Date.now();
    return chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  });
  captureQueue = task.catch(() => {});
  return task;
}

function targetTabs(site) {
  const urls = TARGET_BY_SITE[site] ? [TARGET_BY_SITE[site]] : TARGETS;
  return chrome.tabs.query({ url: urls }).then((tabs) => tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0)));
}

async function startOnTarget(site) {
  const tabs = await targetTabs(site);
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
    startOnTarget(message.target).then(sendResponse).catch(() => sendResponse({ ok: false, code: 'ERROR' }));
    return true;
  }
  if (message.type === 'INSUWORK_CAPTURE_VISIBLE') {
    if (!sender.tab) { sendResponse({ ok: false }); return false; }
    captureVisibleThrottled(sender.tab.windowId)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((error) => sendResponse({ ok: false, error: /MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/.test(error.message || '') ? '화면 캡처 요청이 잠시 몰렸습니다. 다시 시도해 주세요.' : error.message }));
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
