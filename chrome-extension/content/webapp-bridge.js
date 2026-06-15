"use strict";

/**
 * Runs on the Content Engine (MarketiQ) web app origin. Bridges the signed-in
 * session (ce_token + ce_workspace in localStorage) to the extension so
 * founders never have to log in twice.
 */

function readSession() {
  try {
    return {
      token: window.localStorage.getItem("ce_token"),
      workspaceId: window.localStorage.getItem("ce_workspace"),
    };
  } catch (_) {
    return { token: null, workspaceId: null };
  }
}

// Respond to on-demand requests from the popup/background.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "tvc.getToken") {
    sendResponse(readSession());
  }
  return true;
});

// Proactively push the session once on load so the extension auto-connects.
const session = readSession();
if (session.token) {
  chrome.runtime.sendMessage({ action: "tvc.bridgeToken", ...session }).catch(() => {});
}
