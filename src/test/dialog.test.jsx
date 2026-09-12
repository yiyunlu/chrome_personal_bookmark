import React, { useRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AICategorizeModal } from '../components/AICategorizeModal';
import { BatchMoveModal } from '../components/BatchMoveModal';
import { ChatPanel } from '../components/ChatPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import { DeadLinkModal } from '../components/DeadLinkModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { PromptModal } from '../components/PromptModal';
import { SaveTabsModal } from '../components/SaveTabsModal';
import { SettingsModal } from '../components/SettingsModal';
import { UndoToast } from '../components/UndoToast';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { clickOverlay, getOverlay, tick, zIndexOf } from './dialogHelpers';

/* These cover, behaviour by behaviour, what the deleted hand-rolled Modal /
   ConfirmModal / PromptModal overlays used to provide themselves: the focus
   trap, the Tab cycle, Escape, focus restore, click-outside and the z-order of
   stacked layers. Radix portals every panel to document.body, so nothing here
   may assert on RTL's `container`. */

const editorState = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  folderQuery: '',
  targetParentId: null,
  saving: false
};

function panel(role = 'dialog') {
  return document.querySelector(`[role="${role}"]`);
}

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

describe('Dialog behaviour (shadcn Dialog / AlertDialog)', () => {
  it('moves focus inside the panel when it opens', () => {
    const outside = document.createElement('button');
    outside.textContent = 'opener';
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const { rerender } = render(<PromptModal open={false} title="重命名" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    rerender(<PromptModal open title="重命名" defaultValue="folder" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const content = panel();
    expect(content).not.toBeNull();
    expect(content.contains(document.activeElement)).toBe(true);
    expect(document.activeElement.tagName).toBe('INPUT');

    outside.remove();
  });

  it('focuses the Cancel action when the confirm AlertDialog opens', () => {
    render(<ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const content = panel('alertdialog');
    expect(content.contains(document.activeElement)).toBe(true);
    expect(document.activeElement.textContent).toBe('取消');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderEditor({ onClose });

    fireEvent.keyDown(panel(), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes a plain dialog when the overlay is clicked', async () => {
    const onClose = vi.fn();
    renderEditor({ onClose });

    await clickOverlay();
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT close the confirm AlertDialog when the overlay is clicked', async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={onCancel} />);

    await clickOverlay();
    expect(onCancel).not.toHaveBeenCalled();
    expect(panel('alertdialog')).not.toBeNull();
  });

  it('returns focus to the element that opened it when it closes', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            opener
          </button>
          <PromptModal open={open} title="重命名" onConfirm={vi.fn()} onCancel={() => setOpen(false)} />
        </div>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'opener' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(panel().contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(panel(), { key: 'Escape' });
    await tick();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps Tab inside the panel, cycling from the last control back to the first', () => {
    render(<PromptModal open title="重命名" defaultValue="folder" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const content = panel();
    const tabbables = Array.from(content.querySelectorAll('input, button:not([disabled])'));
    expect(tabbables.length).toBeGreaterThan(1);

    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];

    last.focus();
    fireEvent.keyDown(content, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(content, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('Escape fires exactly once: it closes the dialog without triggering the app shortcut', () => {
    function Harness({ open, onDialogClose, onEscape }) {
      const searchInputRef = useRef(null);
      useKeyboardShortcuts({
        searchInputRef,
        onSaveTabs: vi.fn(),
        onAutoOrganize: vi.fn(),
        onToggleManage: vi.fn(),
        autoOrganizing: false,
        disabled: true,
        onEscape
      });
      return (
        <EditBookmarkModal
          editorState={open ? editorState : null}
          setEditorState={vi.fn()}
          filteredTargets={[]}
          onSave={vi.fn()}
          onClose={onDialogClose}
        />
      );
    }

    const onEscape = vi.fn();
    const onDialogClose = vi.fn();
    const { rerender } = render(<Harness open onDialogClose={onDialogClose} onEscape={onEscape} />);

    fireEvent.keyDown(panel(), { key: 'Escape' });
    expect(onDialogClose).toHaveBeenCalledTimes(1);
    // useKeyboardShortcuts' onEscape clears the panel/menu *behind* the dialog;
    // the dialog must swallow the key so a single press does not do both.
    expect(onEscape).not.toHaveBeenCalled();

    // Control: with no dialog open the same key still reaches the shortcut hook.
    rerender(<Harness open={false} onDialogClose={onDialogClose} onEscape={onEscape} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('renders a confirm opened from another dialog above it, and Escape closes only the confirm', () => {
    const onEditorClose = vi.fn();
    const onConfirmCancel = vi.fn();

    function Nested({ confirmOpen }) {
      return (
        <div>
          <EditBookmarkModal
            editorState={editorState}
            setEditorState={vi.fn()}
            filteredTargets={[]}
            onSave={vi.fn()}
            onClose={onEditorClose}
          />
          <ConfirmModal
            open={confirmOpen}
            title="删除"
            message="确认删除？"
            onConfirm={vi.fn()}
            onCancel={onConfirmCancel}
          />
        </div>
      );
    }

    const { rerender } = render(<Nested confirmOpen={false} />);
    const dialogContent = panel('dialog');
    rerender(<Nested confirmOpen />);
    const confirmContent = panel('alertdialog');

    expect(dialogContent).not.toBeNull();
    expect(confirmContent).not.toBeNull();

    // Higher z-index, and later in document order so it also wins on a tie.
    expect(zIndexOf(confirmContent)).toBeGreaterThan(zIndexOf(dialogContent));
    expect(dialogContent.compareDocumentPosition(confirmContent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.keyDown(confirmContent, { key: 'Escape' });
    expect(onConfirmCancel).toHaveBeenCalledTimes(1);
    expect(onEditorClose).not.toHaveBeenCalled();
  });

  it('stacks dialogs above ChatPanel and UndoToast', () => {
    const chat = render(<ChatPanel open onClose={vi.fn()} onSendMessage={vi.fn()} messages={[]} />);
    const chatZ = zIndexOf(chat.container.firstChild);

    render(<UndoToast undoToast={{ message: 'x', pending: false }} onUndo={vi.fn()} />);
    const toastZ = zIndexOf(screen.getByRole('status'));

    renderEditor();
    const dialogZ = zIndexOf(panel('dialog'));
    const overlayZ = zIndexOf(getOverlay());

    expect(chatZ).toBe(50);
    expect(toastZ).toBe(80);
    expect(dialogZ).toBeGreaterThan(toastZ);
    expect(overlayZ).toBeGreaterThan(toastZ);
    expect(overlayZ).toBeGreaterThan(chatZ);
  });
});

describe('Dialog accessible names', () => {
  const surfaces = [
    ['EditBookmarkModal', () => renderEditor(), 'dialog'],
    [
      'BatchMoveModal',
      () =>
        render(
          <BatchMoveModal
            batchMoveState={{ folderQuery: '', targetParentId: null, moving: false }}
            setBatchMoveState={vi.fn()}
            filteredTargets={[]}
            selectedCount={2}
            onSave={vi.fn()}
            onClose={vi.fn()}
          />
        ),
      'dialog'
    ],
    [
      'AICategorizeModal',
      () =>
        render(
          <AICategorizeModal
            aiState={{ loading: true, suggestions: [], newCollections: [], error: null }}
            onAcceptSuggestion={vi.fn()}
            onRejectSuggestion={vi.fn()}
            onApplyAll={vi.fn()}
            onClose={vi.fn()}
          />
        ),
      'dialog'
    ],
    [
      'DeadLinkModal',
      () =>
        render(
          <DeadLinkModal
            deadLinkState={{ loading: true, progress: null, results: [], error: null }}
            onDeleteBookmark={vi.fn()}
            onClose={vi.fn()}
          />
        ),
      'dialog'
    ],
    [
      'SaveTabsModal',
      () =>
        render(
          <SaveTabsModal
            open
            tabs={[{ id: 1, title: 'Tab', url: 'https://example.com' }]}
            defaultFolderName="Folder"
            collections={[]}
            onSave={vi.fn()}
            onClose={vi.fn()}
          />
        ),
      'dialog'
    ],
    ['SettingsModal', () => render(<SettingsModal open onClose={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} />), 'dialog'],
    [
      'PromptModal',
      () => render(<PromptModal open title="新建集合" onConfirm={vi.fn()} onCancel={vi.fn()} />),
      'dialog'
    ],
    [
      'ConfirmModal',
      () => render(<ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />),
      'alertdialog'
    ]
  ];

  it.each(surfaces)('%s exposes an accessible name via a DialogTitle', async (_name, mount, role) => {
    mount();
    await tick();

    const content = panel(role);
    expect(content).not.toBeNull();
    const labelId = content.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId)?.textContent?.trim()).not.toBe('');
  });

  // Stand-in for the manual "no console errors" check: Radix complains loudly
  // about a missing Title or Description, and React about unknown props.
  it.each(surfaces)('%s mounts without console errors or warnings', async (_name, mount) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      mount();
      await tick();
      expect(error.mock.calls).toEqual([]);
      expect(warn.mock.calls).toEqual([]);
    } finally {
      error.mockRestore();
      warn.mockRestore();
    }
  });
});
