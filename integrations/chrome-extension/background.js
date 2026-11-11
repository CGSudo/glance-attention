chrome.action.onClicked.addListener(async (tab) => {
  const id = crypto.randomUUID();
  let capture;
  try {
    capture = { original: await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }) };
  } catch (error) {
    capture = { error: `Capture failed: ${error.message}. Open a normal web page, then retry.` };
  }
  await chrome.storage.session.set({ [id]: capture });
  await chrome.tabs.create({ url: chrome.runtime.getURL(`result.html#${id}`) });
});
