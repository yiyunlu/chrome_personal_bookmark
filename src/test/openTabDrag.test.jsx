import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { addOpenTabToCollection, undoAddedBookmark } from '../lib/bookmarkService';
import {
  OPEN_TAB_DND_TYPE,
  hasOpenTabDrag,
  readOpenTabDrag,
  startOpenTabDrag
} from '../lib/openTabDrag';
import { dropOpenTabIntoCollection } from '../lib/openTabDrop';
import { CollectionCard } from '../components/CollectionCard';
import { OpenTabsPanel } from '../components/OpenTabsPanel';
import { UndoToast } from '../components/UndoToast';
import { useUndoStack } from '../hooks/useUndoStack';
import { setLanguage, t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* FEAT-3 — drag an already-open tab into a collection. Service, payload helpers,
   drop target (CollectionCard), drag source (OpenTabsPanel) and the Undo wiring.
   Real Chrome drag-and-drop cannot be exercised in jsdom. */

let created; // bookmarks.create props
let removed; // bookmarks.remove ids
let removedTrees;
let children; // parentId -> existing child nodes

beforeEach(async () => {
  await setLanguage('zh-CN');
  created = [];
  removed = [];
  removedTrees = [];
  children = {};
  chrome.runtime.lastError = null;
  chrome.bookmarks.getChildren._impl = (id, cb) => cb(children[id] || []);
  chrome.bookmarks.create._impl = (props, cb) => {
    created.push(props);
    cb({ id: `new-${created.length}`, ...props });
  };
  chrome.bookmarks.remove._impl = (id, cb) => {
    removed.push(id);
    cb();
  };
  chrome.bookmarks.removeTree._impl = (id, cb) => {
    removedTrees.push(id);
    cb();
  };
});

const TAB = { title: 'Example', url: 'https://example.com/page' };

/* A dataTransfer stand-in: jsdom has none. */
function dt(types = [OPEN_TAB_DND_TYPE], payload) {
  const store = new Map();
  if (payload !== undefined) store.set(OPEN_TAB_DND_TYPE, payload);
  return {
    types,
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    setData: vi.fn((k, v) => {
      store.set(k, v);
    }),
    getData: (k) => store.get(k) ?? ''
  };
}

describe('dataTransfer payload helpers', () => {
  it('uses its own custom type and writes nothing else', () => {
    const d = dt([]);
    startOpenTabDrag(d, TAB);
    expect(d.setData).toHaveBeenCalledTimes(1);
    expect(d.setData.mock.calls[0][0]).toBe(OPEN_TAB_DND_TYPE);
    expect(d.effectAllowed).toBe('copy');
    expect(readOpenTabDrag(dt([OPEN_TAB_DND_TYPE], d.getData(OPEN_TAB_DND_TYPE)))).toEqual(TAB);
  });

  it('hasOpenTabDrag is true only for that type (Sortable / file / text drags are ignored)', () => {
    expect(hasOpenTabDrag(dt([OPEN_TAB_DND_TYPE]))).toBe(true);
    expect(hasOpenTabDrag(dt(['Files']))).toBe(false);
    expect(hasOpenTabDrag(dt(['text/plain', 'text/uri-list']))).toBe(false);
    expect(hasOpenTabDrag(dt([]))).toBe(false);
    expect(hasOpenTabDrag(null)).toBe(false);
    expect(hasOpenTabDrag({})).toBe(false);
  });

  it('readOpenTabDrag rejects malformed or non-http(s) payloads', () => {
    const read = (raw) => readOpenTabDrag(dt([OPEN_TAB_DND_TYPE], raw));
    expect(read('not json')).toBeNull();
    expect(read('null')).toBeNull();
    expect(read(JSON.stringify({ title: 'x' }))).toBeNull();
    expect(read(JSON.stringify({ url: 'javascript:alert(1)' }))).toBeNull();
    expect(read(JSON.stringify({ url: 'chrome://settings' }))).toBeNull();
    expect(read(JSON.stringify({ url: 'https://a.example' }))).toEqual({ title: 'https://a.example', url: 'https://a.example' });
    expect(readOpenTabDrag(dt(['Files'], JSON.stringify(TAB)))).toBeNull();
  });
});

describe('addOpenTabToCollection', () => {
  it('creates exactly one bookmark in the target folder', async () => {
    const r = await addOpenTabToCollection('col-1', TAB);
    expect(r.status).toBe('saved');
    expect(created).toEqual([{ parentId: 'col-1', title: 'Example', url: TAB.url }]);
    expect(r.bookmark.id).toBe('new-1');
  });

  it('falls back to the URL as title', async () => {
    await addOpenTabToCollection('col-1', { title: '', url: 'https://a.example' });
    expect(created[0].title).toBe('https://a.example');
  });

  it('works for Unfiled, which is a real folder (its id is just a parentId)', async () => {
    const r = await addOpenTabToCollection('tabhub-root', TAB);
    expect(r.status).toBe('saved');
    expect(created[0].parentId).toBe('tabhub-root');
  });

  it('skips a URL already in the SAME collection, with no create call', async () => {
    children['col-1'] = [{ id: 'b1', url: 'https://example.com/page', title: 'old' }];
    const r = await addOpenTabToCollection('col-1', TAB);
    expect(r.status).toBe('duplicate');
    expect(created).toEqual([]);
  });

  it('duplicate matching uses the project dedup key (trailing slash, host case, scheme)', async () => {
    children['col-1'] = [{ id: 'b1', url: 'http://EXAMPLE.com/page/' }];
    expect((await addOpenTabToCollection('col-1', TAB)).status).toBe('duplicate');
  });

  it('treats a different path or query as a different page', async () => {
    children['col-1'] = [{ id: 'b1', url: 'https://example.com/page?x=1' }];
    expect((await addOpenTabToCollection('col-1', TAB)).status).toBe('saved');
  });

  it('the same URL in ANOTHER collection is not a duplicate', async () => {
    children['col-2'] = [{ id: 'b9', url: TAB.url }];
    expect((await addOpenTabToCollection('col-1', TAB)).status).toBe('saved');
  });

  it('ignores subfolders when looking for duplicates', async () => {
    children['col-1'] = [{ id: 'f1', title: 'Sub' }];
    expect((await addOpenTabToCollection('col-1', TAB)).status).toBe('saved');
  });

  it('refuses non-http(s) urls and a missing target', async () => {
    expect((await addOpenTabToCollection('col-1', { title: 'x', url: 'chrome://settings' })).status).toBe('invalid');
    expect((await addOpenTabToCollection('', TAB)).status).toBe('invalid');
    expect(created).toEqual([]);
  });
});

describe('undoAddedBookmark', () => {
  it('removes only that bookmark — never a folder tree', async () => {
    await undoAddedBookmark('new-1');
    expect(removed).toEqual(['new-1']);
    expect(removedTrees).toEqual([]);
  });

  it('is quiet when the bookmark is already gone', async () => {
    chrome.bookmarks.remove._impl = (_id, cb) => {
      chrome.runtime.lastError = { message: 'No node with id' };
      cb();
      chrome.runtime.lastError = null;
    };
    await expect(undoAddedBookmark('gone')).resolves.toBeUndefined();
  });
});

describe('dropOpenTabIntoCollection + the existing Undo toast', () => {
  function Harness({ refresh, drops }) {
    const { undoToast, showUndo, handleUndo } = useUndoStack();
    return (
      <>
        <button
          type="button"
          onClick={async () => {
            for (const d of drops) {
              await dropOpenTabIntoCollection({ ...d, showUndo, refresh });
            }
          }}
        >
          drop
        </button>
        <UndoToast undoToast={undoToast} onUndo={() => handleUndo(refresh)} />
      </>
    );
  }
  const spec = { collectionId: 'col-1', collectionTitle: 'Reading', tab: TAB };

  it('saved: shows the message; Undo deletes only the created bookmark and refreshes', async () => {
    const refresh = vi.fn();
    render(<Harness refresh={refresh} drops={[spec]} />);
    await act(async () => {
      fireEvent.click(screen.getByText('drop'));
      await tick();
    });
    expect(screen.getByText('已保存「Example」到「Reading」')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('undo'), hidden: true }));
      await tick();
    });
    expect(removed).toEqual(['new-1']);
    expect(removedTrees).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('duplicate: shows the "already saved … skipped" notice, creates nothing, and its Undo removes nothing', async () => {
    children['col-1'] = [{ id: 'b1', url: TAB.url }];
    render(<Harness refresh={vi.fn()} drops={[spec]} />);
    await act(async () => {
      fireEvent.click(screen.getByText('drop'));
      await tick();
    });
    expect(screen.getByText('「Reading」中已有「Example」，已跳过')).toBeInTheDocument();
    expect(created).toEqual([]);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('undo'), hidden: true }));
      await tick();
    });
    expect(removed).toEqual([]);
    expect(removedTrees).toEqual([]);
  });

  it('English copy matches the spec wording', async () => {
    await setLanguage('en');
    children['col-1'] = [{ id: 'b1', url: TAB.url }];
    render(<Harness refresh={vi.fn()} drops={[spec]} />);
    await act(async () => {
      fireEvent.click(screen.getByText('drop'));
      await tick();
    });
    expect(screen.getByText('Already saved "Example" in "Reading", skipped')).toBeInTheDocument();
  });

  it('with two drops, Undo only removes the latest one', async () => {
    render(
      <Harness
        refresh={vi.fn()}
        drops={[spec, { ...spec, tab: { title: 'Two', url: 'https://two.example' } }]}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByText('drop'));
      await tick();
    });
    expect(created).toHaveLength(2);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('undo'), hidden: true }));
      await tick();
    });
    expect(removed).toEqual(['new-2']);
  });

  it('a failing create reports failure and creates nothing; refresh still runs', async () => {
    chrome.bookmarks.create._impl = (_p, cb) => {
      chrome.runtime.lastError = { message: 'boom' };
      cb();
      chrome.runtime.lastError = null;
    };
    const refresh = vi.fn();
    const showUndo = vi.fn();
    const r = await dropOpenTabIntoCollection({ ...spec, showUndo, refresh });
    expect(r).toBe('failed');
    expect(showUndo).toHaveBeenCalledWith(t('openTabSaveFailed'), expect.any(Function));
    expect(refresh).toHaveBeenCalled();
  });
});

describe('CollectionCard as a drop target', () => {
  const card = { id: 'c1', title: 'Card', url: 'https://c.example', parentId: 'col-1', index: 0 };
  const mk = (over = {}) => ({
    id: 'col-1',
    parentId: 'src',
    title: 'Reading',
    editable: true,
    cards: [card],
    ...over
  });
  const renderCard = (props = {}) => {
    const onOpenTabDrop = vi.fn();
    const utils = render(
      <section data-module-sortable="true">
        <CollectionCard
          collection={mk()}
          collapsed={false}
          view="grid"
          moduleDraggable
          cardDragEnabled
          manageMode={false}
          selectedCardIds={new Set()}
          onToggleCollapse={() => {}}
          onCardClick={() => {}}
          onCardContextMenu={() => {}}
          onCollectionContextMenu={() => {}}
          onEditCard={() => {}}
          onDeleteCard={() => {}}
          onToggleCardSelect={() => {}}
          onOpenAll={() => {}}
          onTagClick={() => {}}
          onOpenTabDrop={onOpenTabDrop}
          {...props}
        />
      </section>
    );
    const article = utils.container.querySelector('article');
    return { ...utils, article, onOpenTabDrop };
  };
  const payload = JSON.stringify(TAB);

  it.each([
    ['an expanded collection', {}],
    ['a collapsed collection', { collapsed: true }],
    ['an empty collection', { collection: mk({ cards: [] }) }],
    ['an empty collapsed collection', { collection: mk({ cards: [] }), collapsed: true }],
    ['list view', { view: 'list' }]
  ])('accepts a tab dropped on %s (target = the <article>)', (_name, props) => {
    const { article, onOpenTabDrop } = renderCard(props);
    fireEvent.drop(article, { dataTransfer: dt([OPEN_TAB_DND_TYPE], payload) });
    expect(onOpenTabDrop).toHaveBeenCalledTimes(1);
    expect(onOpenTabDrop.mock.calls[0][0].id).toBe('col-1');
    expect(onOpenTabDrop.mock.calls[0][1]).toEqual(TAB);
  });

  it('accepts a drop on a nested node (the header) — the event bubbles to the article', () => {
    const { article, onOpenTabDrop } = renderCard({ collapsed: true });
    fireEvent.drop(article.querySelector('h2'), { dataTransfer: dt([OPEN_TAB_DND_TYPE], payload) });
    expect(onOpenTabDrop).toHaveBeenCalledTimes(1);
  });

  it('Unfiled (editable:false) accepts too', () => {
    const { article, onOpenTabDrop } = renderCard({
      collection: mk({ id: 'root', title: 'Unfiled', editable: false, cards: [] })
    });
    fireEvent.drop(article, { dataTransfer: dt([OPEN_TAB_DND_TYPE], payload) });
    expect(onOpenTabDrop.mock.calls[0][0].id).toBe('root');
  });

  it('highlights on dragover of an open-tab drag, cancels the default (so drop fires), and clears on leave/drop', () => {
    const { article } = renderCard();
    expect(article).not.toHaveAttribute('data-open-tab-over');
    fireEvent.dragEnter(article, { dataTransfer: dt() });
    const notPrevented = fireEvent.dragOver(article, { dataTransfer: dt() });
    expect(notPrevented).toBe(false); // preventDefault was called
    expect(article).toHaveAttribute('data-open-tab-over', 'true');
    fireEvent.dragLeave(article, { dataTransfer: dt() });
    expect(article).not.toHaveAttribute('data-open-tab-over');

    fireEvent.dragEnter(article, { dataTransfer: dt() });
    fireEvent.dragOver(article, { dataTransfer: dt() });
    expect(article).toHaveAttribute('data-open-tab-over', 'true');
    fireEvent.drop(article, { dataTransfer: dt([OPEN_TAB_DND_TYPE], payload) });
    expect(article).not.toHaveAttribute('data-open-tab-over');
  });

  it('moving between the article’s own children does not flicker the highlight off', () => {
    const { article } = renderCard();
    const h2 = article.querySelector('h2');
    fireEvent.dragEnter(article, { dataTransfer: dt() });
    // Chrome order when crossing into a child: enter(child), then leave(parent).
    fireEvent.dragEnter(h2, { dataTransfer: dt() });
    fireEvent.dragLeave(article, { dataTransfer: dt() });
    expect(article).toHaveAttribute('data-open-tab-over', 'true');
    fireEvent.dragLeave(h2, { dataTransfer: dt() });
    expect(article).not.toHaveAttribute('data-open-tab-over');
  });

  it('a cancelled drag (dragend anywhere) clears the highlight', () => {
    const { article } = renderCard();
    fireEvent.dragEnter(article, { dataTransfer: dt() });
    fireEvent.dragEnd(document.body);
    expect(article).not.toHaveAttribute('data-open-tab-over');
  });

  it.each([
    ['a native file drag', ['Files']],
    ['a text drag', ['text/plain']],
    ['a Sortable-style drag (no dataTransfer types we know)', []]
  ])('ignores %s: no highlight, no preventDefault, no drop', (_n, types) => {
    const { article, onOpenTabDrop } = renderCard();
    fireEvent.dragEnter(article, { dataTransfer: dt(types) });
    expect(fireEvent.dragOver(article, { dataTransfer: dt(types) })).toBe(true);
    expect(article).not.toHaveAttribute('data-open-tab-over');
    expect(article.className).not.toMatch(/primary/);
    expect(fireEvent.drop(article, { dataTransfer: dt(types, payload) })).toBe(true);
    expect(onOpenTabDrop).not.toHaveBeenCalled();
  });

  it('without an onOpenTabDrop handler the card is inert', () => {
    const { article } = renderCard({ onOpenTabDrop: undefined });
    expect(fireEvent.dragOver(article, { dataTransfer: dt() })).toBe(true);
    expect(article).not.toHaveAttribute('data-open-tab-over');
  });

  it('ignores a malformed payload on drop', () => {
    const { article, onOpenTabDrop } = renderCard();
    fireEvent.drop(article, { dataTransfer: dt([OPEN_TAB_DND_TYPE], 'garbage') });
    expect(onOpenTabDrop).not.toHaveBeenCalled();
  });

  it('keeps the Sortable contract: attributes on the article, no wrapper added', () => {
    const { article } = renderCard();
    expect(article.parentElement).toHaveAttribute('data-module-sortable', 'true');
    expect(article).toHaveAttribute('data-collection-id', 'col-1');
    expect(article).toHaveAttribute('data-draggable', 'true');
    expect(article.children).toHaveLength(2); // header + cards container, as before
  });
});

describe('OpenTabsPanel (drag source)', () => {
  const tabs = [
    { id: 1, title: 'Alpha', url: 'https://alpha.example', favIconUrl: '' },
    { id: 2, title: 'Beta', url: 'https://beta.example', favIconUrl: '' }
  ];
  const panelButton = () => screen.getByRole('button', { name: new RegExp(t('openTabsPanel')) });

  it('is collapsed by default and does not query tabs until opened', () => {
    const loadTabs = vi.fn(async () => tabs);
    render(<OpenTabsPanel loadTabs={loadTabs} />);
    expect(panelButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(loadTabs).not.toHaveBeenCalled();
  });

  it('lists the tabs once opened; rows are draggable and carry no Sortable attributes', async () => {
    const loadTabs = vi.fn(async () => tabs);
    const { container } = render(<OpenTabsPanel loadTabs={loadTabs} />);
    await act(async () => {
      fireEvent.click(panelButton());
      await tick();
    });
    expect(loadTabs).toHaveBeenCalledTimes(1);
    const rows = container.querySelectorAll('[data-open-tab-id]');
    expect(rows).toHaveLength(2);
    rows.forEach((r) => expect(r).toHaveAttribute('draggable', 'true'));
    expect(container.querySelector('[data-card-id], [data-draggable], [data-collection-id]')).toBeNull();
  });

  it('shows an empty hint when the window has no web tabs', async () => {
    render(<OpenTabsPanel loadTabs={async () => []} />);
    await act(async () => {
      fireEvent.click(panelButton());
      await tick();
    });
    expect(screen.getByText(t('openTabsEmpty'))).toBeInTheDocument();
  });

  it('dragstart writes the custom type and fades the dragged row; dragend restores it', async () => {
    const { container } = render(<OpenTabsPanel loadTabs={async () => tabs} />);
    await act(async () => {
      fireEvent.click(panelButton());
      await tick();
    });
    const row = container.querySelector('[data-open-tab-id="1"]');
    const d = dt([]);
    fireEvent.dragStart(row, { dataTransfer: d });
    expect(d.setData.mock.calls[0][0]).toBe(OPEN_TAB_DND_TYPE);
    expect(JSON.parse(d.setData.mock.calls[0][1])).toEqual({ title: 'Alpha', url: 'https://alpha.example' });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(row.className).toMatch(/opacity-40/);
    expect(container.querySelector('[data-open-tab-id="2"]').className).not.toMatch(/opacity-40/);
    fireEvent.dragEnd(row);
    expect(row.className).not.toMatch(/opacity-40/);
  });
});

describe('FEAT-3 i18n', () => {
  const keys = ['openTabsPanel', 'openTabsHint', 'openTabsEmpty', 'openTabsRefresh', 'openTabSaveFailed'];
  it('every string exists in zh-CN and en, and they differ', async () => {
    const zh = keys.map((k) => t(k));
    await setLanguage('en');
    const en = keys.map((k) => t(k));
    keys.forEach((k, i) => {
      expect(zh[i]).not.toBe(k);
      expect(en[i]).not.toBe(k);
      expect(zh[i]).not.toBe(en[i]);
    });
    expect(t('openTabDuplicate', 'T', 'C')).toBe('Already saved "T" in "C", skipped');
    expect(t('openTabSaved', 'T', 'C')).toBe('Saved "T" to "C"');
    await setLanguage('zh-CN');
    expect(t('openTabDuplicate', 'T', 'C')).toBe('「C」中已有「T」，已跳过');
  });
});
