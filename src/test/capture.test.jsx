import React, { useRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  captureCurrentWindowTabs,
  captureFolderName,
  isCapturableUrl,
  undoCapture
} from '../lib/bookmarkService';
import { Toolbar } from '../components/Toolbar';
import { UndoToast } from '../components/UndoToast';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useUndoStack } from '../hooks/useUndoStack';
import { setLanguage, t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* FEAT-2 — one-click capture. Service level (filtering, naming, empty save,
   close-after, failure handling, undo), then the shortcut and the toolbar
   control through the real hook/component. */

const SELF_ID = 99;
let nextId;
let created; // bookmarks.create calls
let removedTrees; // bookmarks.removeTree ids
let removedTabs; // tabs.remove ids
let createdTabs; // tabs.create props
let failUrls;

const tab = (id, url, extra = {}) => ({ id, url, title: `T${id}`, index: id, ...extra });

function mockTabs(tabs, { currentId = SELF_ID } = {}) {
  chrome.tabs.query._impl = (_q, cb) => cb(tabs);
  chrome.tabs.getCurrent._impl = (cb) => cb({ id: currentId });
}

beforeEach(async () => {
  await setLanguage('zh-CN');
  nextId = 500;
  created = [];
  removedTrees = [];
  removedTabs = [];
  createdTabs = [];
  failUrls = new Set();
  chrome.runtime.lastError = null;
  chrome.bookmarks.create._impl = (props, cb) => {
    created.push(props);
    if (props.url && failUrls.has(props.url)) {
      chrome.runtime.lastError = { message: 'boom' };
      cb();
      chrome.runtime.lastError = null;
      return;
    }
    cb({ id: String(++nextId), ...props });
  };
  chrome.bookmarks.removeTree._impl = (id, cb) => {
    removedTrees.push(id);
    cb();
  };
  chrome.tabs.remove._impl = (id, cb) => {
    removedTabs.push(id);
    cb();
  };
  chrome.tabs.create._impl = (props, cb) => {
    createdTabs.push(props);
    cb({ id: 1, ...props });
  };
});

describe('isCapturableUrl / captureFolderName', () => {
  it('accepts only http(s)', () => {
    expect(isCapturableUrl('https://a.example/x')).toBe(true);
    expect(isCapturableUrl('HTTP://a.example')).toBe(true);
    for (const u of ['chrome://settings', 'chrome-extension://abc/index.html', 'about:blank', 'file:///a', 'data:text/plain,hi', '', undefined]) {
      expect(isCapturableUrl(u)).toBe(false);
    }
  });

  it('names the folder "Captured · HH:mm" in local 24h time, zero padded', () => {
    expect(captureFolderName(new Date(2026, 9, 1, 7, 5, 59))).toBe('Captured · 07:05');
    expect(captureFolderName(new Date(2026, 9, 1, 23, 59))).toBe('Captured · 23:59');
  });
});

describe('captureCurrentWindowTabs', () => {
  it('saves every http(s) tab, in tab order, into one new folder; skips internal pages and TabHub itself', async () => {
    mockTabs([
      tab(1, 'https://a.example'),
      tab(2, 'chrome://extensions'),
      tab(3, 'chrome-extension://abc/index.html'),
      tab(4, 'about:blank'),
      tab(SELF_ID, 'https://would-be-self.example'), // defensive: self id is excluded even if http(s)
      tab(5, 'http://b.example'),
      tab(6, undefined)
    ]);
    const r = await captureCurrentWindowTabs('root', { now: new Date(2026, 9, 1, 9, 3) });

    expect(r.saved).toBe(2);
    expect(r.skipped).toBe(5);
    expect(r.failed).toBe(0);
    expect(r.folder.title).toBe('Captured · 09:03');
    expect(created[0]).toEqual({ parentId: 'root', title: 'Captured · 09:03' });
    expect(created.slice(1).map((c) => c.url)).toEqual(['https://a.example', 'http://b.example']);
    expect(created.slice(1).every((c) => c.parentId === r.folder.id)).toBe(true);
    expect(removedTabs).toEqual([]); // close is opt-in
  });

  it('captured count equals the window tab count minus skipped', async () => {
    const tabs = [tab(1, 'https://a'), tab(2, 'chrome://x'), tab(3, 'https://c'), tab(4, 'https://d')];
    mockTabs(tabs);
    const r = await captureCurrentWindowTabs('root');
    expect(r.saved + r.skipped).toBe(tabs.length);
  });

  it('with 0 savable tabs creates NO collection', async () => {
    mockTabs([tab(1, 'chrome://newtab'), tab(SELF_ID, 'chrome-extension://abc/index.html')]);
    const r = await captureCurrentWindowTabs('root');
    expect(r.folder).toBeNull();
    expect(r.saved).toBe(0);
    expect(created).toEqual([]);
  });

  it('closes saved tabs only when closeAfter is true — never TabHub itself', async () => {
    mockTabs([tab(1, 'https://a'), tab(SELF_ID, 'chrome-extension://abc/index.html'), tab(2, 'chrome://x'), tab(3, 'https://c', { pinned: true })]);
    const r = await captureCurrentWindowTabs('root', { closeAfter: true });
    expect(removedTabs).toEqual([1, 3]);
    expect(r.closedTabs).toEqual([
      { url: 'https://a', index: 1, pinned: false },
      { url: 'https://c', index: 3, pinned: true }
    ]);
  });

  it('never closes a tab whose bookmark failed to save, and reports the failure', async () => {
    mockTabs([tab(1, 'https://ok'), tab(2, 'https://bad'), tab(3, 'https://ok2')]);
    failUrls.add('https://bad');
    const r = await captureCurrentWindowTabs('root', { closeAfter: true });
    expect(r.saved).toBe(2);
    expect(r.failed).toBe(1);
    expect(removedTabs).toEqual([1, 3]);
  });

  it('when every save fails, removes the empty folder and closes nothing', async () => {
    mockTabs([tab(1, 'https://bad')]);
    failUrls.add('https://bad');
    const r = await captureCurrentWindowTabs('root', { closeAfter: true });
    expect(r.folder).toBeNull();
    expect(r.failed).toBe(1);
    expect(removedTrees).toEqual(['501']);
    expect(removedTabs).toEqual([]);
  });

  it('a failing getCurrent does not break capture', async () => {
    chrome.tabs.query._impl = (_q, cb) => cb([tab(1, 'https://a')]);
    chrome.tabs.getCurrent._impl = (cb) => {
      chrome.runtime.lastError = { message: 'no current tab' };
      cb();
      chrome.runtime.lastError = null;
    };
    const r = await captureCurrentWindowTabs('root');
    expect(r.saved).toBe(1);
  });
});

describe('undoCapture', () => {
  it('removes the created collection', async () => {
    await undoCapture('501', []);
    expect(removedTrees).toEqual(['501']);
    expect(createdTabs).toEqual([]);
  });

  it('after capture-and-close, also reopens the closed tabs in order, in the background', async () => {
    await undoCapture('501', [
      { url: 'https://c', index: 3, pinned: true },
      { url: 'https://a', index: 1, pinned: false }
    ]);
    expect(removedTrees).toEqual(['501']);
    expect(createdTabs).toEqual([
      { url: 'https://a', index: 1, pinned: false, active: false },
      { url: 'https://c', index: 3, pinned: true, active: false }
    ]);
  });

  it('still reopens tabs when the folder is already gone', async () => {
    chrome.bookmarks.removeTree._impl = (_id, cb) => {
      chrome.runtime.lastError = { message: 'gone' };
      cb();
      chrome.runtime.lastError = null;
    };
    await expect(undoCapture('501', [{ url: 'https://a', index: 0 }])).rejects.toThrow('gone');
    expect(createdTabs).toHaveLength(1);
  });
});

describe('useKeyboardShortcuts — onCapture (C)', () => {
  function Harness({ onCapture, disabled = false, withHandler = true }) {
    const searchInputRef = useRef(null);
    useKeyboardShortcuts({
      searchInputRef,
      onSaveTabs: vi.fn(),
      onAutoOrganize: vi.fn(),
      onToggleManage: vi.fn(),
      autoOrganizing: false,
      disabled,
      onEscape: vi.fn(),
      onCapture: withHandler ? onCapture : undefined
    });
    return (
      <>
        <input aria-label="field" />
        <textarea aria-label="area" />
        <div role="menu">
          <button type="button">item</button>
        </div>
      </>
    );
  }

  it('fires on a bare C (either case) with no closeAfter argument', () => {
    const onCapture = vi.fn();
    render(<Harness onCapture={onCapture} />);
    fireEvent.keyDown(document.body, { key: 'c' });
    fireEvent.keyDown(document.body, { key: 'C' });
    expect(onCapture).toHaveBeenCalledTimes(2);
    expect(onCapture).toHaveBeenCalledWith();
  });

  it('is ignored inside inputs, while a modal is open, in a menu, with modifiers, and on key repeat', () => {
    const onCapture = vi.fn();
    const { rerender } = render(<Harness onCapture={onCapture} />);
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'c' });
    fireEvent.keyDown(screen.getByLabelText('area'), { key: 'c' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'item' }), { key: 'c' });
    fireEvent.keyDown(document.body, { key: 'c', metaKey: true }); // Cmd+C copy
    fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'c', altKey: true });
    fireEvent.keyDown(document.body, { key: 'c', repeat: true });
    expect(onCapture).not.toHaveBeenCalled();

    rerender(<Harness onCapture={onCapture} disabled />);
    fireEvent.keyDown(document.body, { key: 'c' });
    expect(onCapture).not.toHaveBeenCalled();
  });

  it('is inert without a handler, and does not disturb S / O / M / slash', () => {
    const onSaveTabs = vi.fn();
    function Both() {
      useKeyboardShortcuts({
        searchInputRef: { current: null },
        onSaveTabs,
        onAutoOrganize: vi.fn(),
        onToggleManage: vi.fn(),
        autoOrganizing: false,
        onEscape: vi.fn()
      });
      return null;
    }
    render(<Both />);
    expect(fireEvent.keyDown(document.body, { key: 'c' })).toBe(true); // not preventDefault'ed
    fireEvent.keyDown(document.body, { key: 's' });
    expect(onSaveTabs).toHaveBeenCalledTimes(1);
  });
});

describe('Toolbar — capture split button', () => {
  const baseProps = () => ({
    activeSource: null,
    activeSourceId: 'src',
    tabHubRootId: 'root',
    manageMode: false,
    autoOrganizing: false,
    search: '',
    searchInputRef: React.createRef(),
    onSaveTabs: vi.fn(),
    onToggleManage: vi.fn(),
    onAutoOrganize: vi.fn(),
    onAICategorize: vi.fn(),
    onCheckDeadLinks: vi.fn(),
    onNewCollection: vi.fn(),
    onSearchChange: vi.fn()
  });

  it('is not rendered without onCapture (old call sites unchanged)', () => {
    render(<Toolbar {...baseProps()} />);
    expect(screen.queryByRole('button', { name: t('capture') })).toBeNull();
  });

  it('main click captures and keeps tabs open (closeAfter:false)', () => {
    const onCapture = vi.fn();
    render(<Toolbar {...baseProps()} onCapture={onCapture} />);
    const btn = screen.getByRole('button', { name: new RegExp(t('capture')) });
    expect(btn).toHaveAttribute('title', t('shortcutCaptureKey'));
    fireEvent.click(btn);
    expect(onCapture).toHaveBeenCalledWith({ closeAfter: false });
  });

  it('the close-after action lives only in the chevron menu and is explicit', async () => {
    const onCapture = vi.fn();
    render(<Toolbar {...baseProps()} onCapture={onCapture} />);
    expect(screen.queryByRole('menuitem')).toBeNull();
    const more = screen.getByRole('button', { name: t('captureMore') });
    await act(async () => {
      fireEvent.keyDown(more, { key: 'Enter' });
      await tick();
    });
    const item = screen.getByRole('menuitem', { name: t('captureAndClose') });
    expect(onCapture).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(item);
      await tick();
    });
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture).toHaveBeenCalledWith({ closeAfter: true });
  });

  it('is disabled while capturing or with no source root', () => {
    const { rerender } = render(<Toolbar {...baseProps()} onCapture={vi.fn()} capturing />);
    expect(screen.getByRole('button', { name: new RegExp(t('capture')) })).toBeDisabled();
    expect(screen.getByRole('button', { name: t('captureMore') })).toBeDisabled();
    rerender(<Toolbar {...baseProps()} onCapture={vi.fn()} activeSourceId="" tabHubRootId="" />);
    expect(screen.getByRole('button', { name: new RegExp(t('capture')) })).toBeDisabled();
  });
});

describe('capture result toast (existing undo stack)', () => {
  function Harness({ undo }) {
    const { undoToast, showUndo, handleUndo } = useUndoStack();
    return (
      <>
        <button type="button" onClick={() => showUndo(t('captureDone', 2, 'Captured · 09:03', false, 0, 0), undo)}>
          go
        </button>
        <UndoToast undoToast={undoToast} onUndo={() => handleUndo()} />
      </>
    );
  }

  it('shows the count and name with an Undo that runs the capture undo', async () => {
    const undo = vi.fn(() => undoCapture('501', []));
    render(<Harness undo={undo} />);
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByText('已捕获 2 个标签页到「Captured · 09:03」')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('undo'), hidden: true }));
      await tick();
    });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(removedTrees).toEqual(['501']);
  });
});

describe('i18n — capture strings', () => {
  it('zh-CN and en both read correctly, including skipped/failed/closed variants', async () => {
    expect(t('captureDone', 3, 'N', true, 2, 1)).toBe('已捕获并关闭 3 个标签页到「N」，跳过 2 个，1 个保存失败（未关闭）');
    await setLanguage('en');
    expect(t('capture')).toBe('Capture');
    expect(t('captureDone', 1, 'N', false, 0, 0)).toBe('Captured 1 tab to "N"');
    expect(t('captureDone', 3, 'N', true, 2, 1)).toBe('Captured and closed 3 tabs to "N", skipped 2, 1 failed to save (not closed)');
    await setLanguage('zh-CN');
  });
});
