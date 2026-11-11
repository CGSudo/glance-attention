const token = document.querySelector("#token");
chrome.storage.local.get("token").then((stored) => { token.value = stored.token || ""; });
document.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!token.value.trim()) return;
  await chrome.storage.local.set({ token: token.value.trim() });
  document.querySelector("#status").textContent = "Saved. Open a web page, then click Glance or press Alt+Shift+G.";
});
