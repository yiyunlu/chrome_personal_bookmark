import { addOpenTabToCollection, undoAddedBookmark } from './bookmarkService';
import { logError } from './utils';
import { t } from './i18n';

const TITLE_MAX = 40;
const shorten = (s) => (s.length > TITLE_MAX ? `${s.slice(0, TITLE_MAX - 1)}…` : s);

const noop = async () => {};

/**
 * Save one dropped open tab into a collection and report through the existing
 * Undo toast (`showUndo`). Undo removes ONLY the bookmark this call created.
 * A duplicate or a failure is a plain notice: nothing was created, so its Undo is
 * a no-op (the toast always draws the button; a null handler would throw on click).
 *
 * @returns {Promise<'saved'|'duplicate'|'invalid'|'failed'>}
 */
export async function dropOpenTabIntoCollection({ collectionId, collectionTitle, tab, showUndo, refresh }) {
  const title = shorten(tab?.title || tab?.url || '');
  try {
    const result = await addOpenTabToCollection(collectionId, tab);
    if (result.status === 'duplicate') {
      showUndo(t('openTabDuplicate', title, collectionTitle), noop);
      return 'duplicate';
    }
    if (result.status !== 'saved') {
      return 'invalid';
    }
    const createdId = result.bookmark.id;
    showUndo(t('openTabSaved', title, collectionTitle), () => undoAddedBookmark(createdId));
    return 'saved';
  } catch (err) {
    logError('dropOpenTabIntoCollection', err);
    showUndo(t('openTabSaveFailed'), noop);
    return 'failed';
  } finally {
    if (refresh) await refresh();
  }
}
