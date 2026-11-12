const api = globalThis.browser || globalThis.chrome;
api.action.onClicked.addListener(async (tab) => {
  const id = crypto.randomUUID();
  let capture;
  try {
    capture = { original: await api.tabs.captureVisibleTab(tab.windowId, { format: "png" }) };
  } catch (error) {
    capture = { error: `Capture failed: ${error.message}. Open a normal web page, then retry.` };
  }
  await api.storage.session.set({ [id]: capture });
  await api.tabs.create({ url: api.runtime.getURL(`result.html#${id}`) });
});
