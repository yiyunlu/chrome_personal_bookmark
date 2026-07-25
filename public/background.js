chrome.runtime.onInstalled.addListener(() => {
  console.log('TabHub installed');
});

// The manifest declares a toolbar action with no popup; without this listener
// the pinned button would do nothing. A new tab IS the TabHub page.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'chrome://newtab' });
});
