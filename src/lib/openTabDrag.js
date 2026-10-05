import { isCapturableUrl } from './bookmarkService';

/* FEAT-3 — dragging an already-open tab into a collection.
 *
 * This is native HTML5 drag-and-drop with its OWN dataTransfer type. SortableJS
 * (collections, sidebar, bookmark cards) never sets this type, and a file dragged
 * in from the desktop never carries it, so a drop target that only reacts to this
 * type cannot be triggered by — or interfere with — either of them. The payload is
 * deliberately NOT mirrored into text/plain or text/uri-list: dropping a tab on a
 * text field, or on another page, should do nothing. */
export const OPEN_TAB_DND_TYPE = 'application/x-tabhub-open-tab';

/** True only while an open-tab drag is in flight. Safe in `dragover`: browsers hide
 *  the payload there but always expose `types`. */
export function hasOpenTabDrag(dataTransfer) {
  if (!dataTransfer || !dataTransfer.types) return false;
  return Array.from(dataTransfer.types).includes(OPEN_TAB_DND_TYPE);
}

export function startOpenTabDrag(dataTransfer, tab) {
  if (!dataTransfer) return;
  dataTransfer.setData(OPEN_TAB_DND_TYPE, JSON.stringify({ title: tab.title || tab.url, url: tab.url }));
  dataTransfer.effectAllowed = 'copy';
}

/** Read the payload on `drop`. Anything that is not a well-formed http(s) tab is null —
 *  the dataTransfer comes from the page, so it is validated, never trusted. */
export function readOpenTabDrag(dataTransfer) {
  if (!hasOpenTabDrag(dataTransfer)) return null;
  try {
    const parsed = JSON.parse(dataTransfer.getData(OPEN_TAB_DND_TYPE));
    if (!parsed || typeof parsed.url !== 'string' || !isCapturableUrl(parsed.url)) return null;
    return { title: typeof parsed.title === 'string' && parsed.title ? parsed.title : parsed.url, url: parsed.url };
  } catch {
    return null;
  }
}
