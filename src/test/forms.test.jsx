import React, { useRef, useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BatchMoveModal } from '../components/BatchMoveModal';
import { ChatPanel } from '../components/ChatPanel';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { PromptModal } from '../components/PromptModal';
import { SaveTabsModal } from '../components/SaveTabsModal';
import { SettingsModal } from '../components/SettingsModal';
import { Toolbar } from '../components/Toolbar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* P3 — the hand-rolled <input> / <label> / <select> controls now render through
   src/components/ui/{input,label,select}.jsx. These cover the behaviour those
   raw elements provided for free and that a wrapper can silently break: ref
   forwarding (the `/` shortcut), Enter-to-submit, label→control association,
   the password field, and the fact that Radix's Select is a button plus a
   portalled listbox rather than a native select. */

const editorState = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  folderQuery: '',
  targetParentId: null,
  saving: false
};

function renderEditor(props = {}) {
  return render(
    <EditBookmarkModal
      editorState={editorState}
      setEditorState={vi.fn()}
      filteredTargets={[]}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

/* Mirrors main.jsx: App owns the search string and the ref, the hook focuses
   the field through that ref. */
function ToolbarHarness({ onSearchChange }) {
  const searchInputRef = useRef(null);
  const [search, setSearch] = useState('');
  useKeyboardShortcuts({
    searchInputRef,
    onSaveTabs: vi.fn(),
    onAutoOrganize: vi.fn(),
    onToggleManage: vi.fn(),
    autoOrganizing: false,
    onEscape: vi.fn()
  });
  return (
    <Toolbar
      activeSource={null}
      activeSourceId="1"
      tabHubRootId="0"
      onSaveTabs={vi.fn()}
      manageMode={false}
      onToggleManage={vi.fn()}
      autoOrganizing={false}
      onAutoOrganize={vi.fn()}
      onAICategorize={vi.fn()}
      onCheckDeadLinks={vi.fn()}
      onNewCollection={vi.fn()}
      search={search}
      onSearchChange={(next) => {
        onSearchChange?.(next);
        setSearch(next);
      }}
      searchInputRef={searchInputRef}
    />
  );
}

describe('Toolbar search field (shadcn Input)', () => {
  it('still takes focus from the `/` shortcut, i.e. the ref reaches the real input element', () => {
    render(<ToolbarHarness />);
    const field = screen.getByRole('textbox', { name: t('searchPlaceholder') });
    expect(document.activeElement).not.toBe(field);

    fireEvent.keyDown(document.body, { key: '/' });

    expect(document.activeElement).toBe(field);
    expect(document.activeElement.tagName).toBe('INPUT');
  });

  it('still renders the `/` hint next to the field', () => {
    const { container } = render(<ToolbarHarness />);
    const hints = Array.from(container.querySelectorAll('kbd')).map((k) => k.textContent.trim());
    expect(hints).toContain('/');
  });

  it('reports what the user types back to the owner of the search string', () => {
    const onSearchChange = vi.fn();
    render(<ToolbarHarness onSearchChange={onSearchChange} />);
    const field = screen.getByRole('textbox', { name: t('searchPlaceholder') });

    fireEvent.change(field, { target: { value: 'github' } });

    expect(onSearchChange).toHaveBeenCalledWith('github');
    expect(field).toHaveValue('github');
  });
});

describe('Enter submits', () => {
  it('PromptModal confirms with the trimmed value', () => {
    const onConfirm = vi.fn();
    render(<PromptModal open title="新建集合" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: '新建集合' });

    fireEvent.change(field, { target: { value: '  Reading  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onConfirm).toHaveBeenCalledWith('Reading');
  });

  it('PromptModal ignores Enter on an empty value', () => {
    const onConfirm = vi.fn();
    render(<PromptModal open title="新建集合" onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('textbox', { name: '新建集合' }), { key: 'Enter' });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('EditBookmarkModal saves from the title field', () => {
    const onSave = vi.fn();
    renderEditor({ onSave });

    fireEvent.keyDown(screen.getByLabelText(t('titleLabel')), { key: 'Enter' });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('EditBookmarkModal saves from the URL field', () => {
    const onSave = vi.fn();
    renderEditor({ onSave });

    fireEvent.keyDown(screen.getByLabelText('URL'), { key: 'Enter' });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('EditBookmarkModal does not save twice while a save is in flight', () => {
    const onSave = vi.fn();
    renderEditor({ onSave, editorState: { ...editorState, saving: true } });

    fireEvent.keyDown(screen.getByLabelText(t('titleLabel')), { key: 'Enter' });

    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('Label / control association', () => {
  it('EditBookmarkModal: each label points at the field it names', () => {
    renderEditor();

    expect(screen.getByLabelText(t('titleLabel'))).toHaveValue(editorState.title);
    expect(screen.getByLabelText('URL')).toHaveValue(editorState.url);
    expect(screen.getByLabelText(t('moveToFolder'))).toHaveAttribute('placeholder', t('searchFolder'));
  });

  it('BatchMoveModal: the folder filter is reachable by its label and edits reach the owner state', () => {
    // App owns `batchMoveState`, so the round trip only shows up with a real
    // state owner: the field is controlled and would snap back otherwise.
    function Harness() {
      const [batchMoveState, setBatchMoveState] = useState({
        folderQuery: '',
        targetParentId: null,
        moving: false
      });
      return (
        <BatchMoveModal
          batchMoveState={batchMoveState}
          setBatchMoveState={setBatchMoveState}
          filteredTargets={[]}
          selectedCount={2}
          onSave={vi.fn()}
          onClose={vi.fn()}
        />
      );
    }

    render(<Harness />);
    const field = screen.getByLabelText(t('selectTargetFolder'));
    expect(field).toHaveAttribute('placeholder', t('searchFolder'));

    fireEvent.change(field, { target: { value: 'work' } });

    expect(field).toHaveValue('work');
  });
});

describe('SettingsModal API key field', () => {
  let get;
  let set;

  beforeEach(() => {
    get = chrome.storage.local.get;
    set = chrome.storage.local.set;
  });

  afterEach(() => {
    chrome.storage.local.get = get;
    chrome.storage.local.set = set;
  });

  it('is a password field until the reveal button is pressed', async () => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
    render(<SettingsModal open onClose={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} />);
    await tick();

    const field = screen.getByLabelText(t('apiKeyLabel'));
    expect(field).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: t('showApiKey') }));
    expect(field).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: t('hideApiKey') }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('round-trips the key through chrome.storage: loads the stored one, saves an edit', async () => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({ tabhub_ai_api_key: 'sk-stored' }));
    chrome.storage.local.set = vi.fn((_obj, cb) => cb());

    render(<SettingsModal open onClose={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} />);
    await tick();

    const field = screen.getByLabelText(t('apiKeyLabel'));
    expect(field).toHaveValue('sk-stored');

    fireEvent.change(field, { target: { value: 'sk-edited' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('save') }));
    });

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { tabhub_ai_api_key: 'sk-edited' },
      expect.any(Function)
    );
    expect(screen.getByText(t('apiKeySaved'))).toBeInTheDocument();
  });
});

describe('SaveTabsModal target collection (Radix Select, not a native select)', () => {
  const tabs = [{ id: 1, title: 'Tab one', url: 'https://example.com/one' }];
  const collections = [
    { id: 'c1', title: 'Work' },
    { id: 'c2', title: 'Reading' }
  ];

  function renderSaveTabs(props = {}) {
    return render(
      <SaveTabsModal
        open
        tabs={tabs}
        defaultFolderName="Folder"
        collections={collections}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        {...props}
      />
    );
  }

  it('is a labelled combobox showing the default option, with no options in the DOM until it opens', () => {
    renderSaveTabs();

    const trigger = screen.getByLabelText(t('targetCollection'));
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent(t('newCollectionOption'));
    // The listbox is portalled and only mounted while open.
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.queryByText('Work')).toBeNull();
  });

  it('opens on click and hands the chosen collection id to onSave', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderSaveTabs({ onSave, onClose });

    const trigger = screen.getByLabelText(t('targetCollection'));
    fireEvent.click(trigger);
    await tick();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      t('newCollectionOption'),
      'Work',
      'Reading'
    ]);

    fireEvent.click(screen.getByRole('option', { name: 'Reading' }));
    await tick();

    expect(trigger).toHaveTextContent('Reading');
    // Choosing an option must not dismiss the dialog the Select sits in: the
    // listbox portals outside the dialog's own portal.
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('save') }));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].targetCollectionId).toBe('c2');
  });

  it('still maps the "new collection" choice to a null target id', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderSaveTabs({ onSave });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('save') }));
    });

    expect(onSave.mock.calls[0][0].targetCollectionId).toBeNull();
    expect(onSave.mock.calls[0][0].folderName).toBe('Folder');
  });

  it('keeps the per-tab checkboxes clickable through their row label', () => {
    renderSaveTabs();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(t('tabsSelected', 0))).toBeInTheDocument();
  });
});

describe('ChatPanel send keys (unchanged by the Input migration)', () => {
  function renderChat(onSendMessage = vi.fn().mockResolvedValue(undefined)) {
    render(<ChatPanel open onClose={vi.fn()} onSendMessage={onSendMessage} messages={[]} />);
    return { field: screen.getByRole('textbox', { name: t('chatPlaceholder') }), onSendMessage };
  }

  it('Enter sends the trimmed text and clears the box', async () => {
    const { field, onSendMessage } = renderChat();

    fireEvent.change(field, { target: { value: '  find github  ' } });
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });

    expect(onSendMessage).toHaveBeenCalledWith('find github');
    expect(field).toHaveValue('');
  });

  it('Shift+Enter does not send', async () => {
    const { field, onSendMessage } = renderChat();

    fireEvent.change(field, { target: { value: 'draft' } });
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
    });

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(field).toHaveValue('draft');
  });

  /* P6c turned the hand-styled send button into a <Button>. It had no
     accessible name at all before — it is icon-only — so this is both a
     regression guard and the first coverage the control has had. */
  it('the send button sends what is in the box', async () => {
    const { field, onSendMessage } = renderChat();

    fireEvent.change(field, { target: { value: '  find github  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t('chatSend') }));
    });

    expect(onSendMessage).toHaveBeenCalledWith('find github');
    expect(field).toHaveValue('');
  });

  it('the send button is disabled until there is something to send', () => {
    const { field } = renderChat();
    const send = screen.getByRole('button', { name: t('chatSend') });

    expect(send).toBeDisabled();

    fireEvent.change(field, { target: { value: 'x' } });
    expect(send).toBeEnabled();

    fireEvent.change(field, { target: { value: '   ' } });
    expect(send).toBeDisabled();
  });

  it('Enter on a blank box does not send', async () => {
    const { field, onSendMessage } = renderChat();

    fireEvent.change(field, { target: { value: '   ' } });
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });

    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
