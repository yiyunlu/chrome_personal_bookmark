import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UndoToast } from '../components/UndoToast';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { useUndoStack } from '../hooks/useUndoStack';
import { tick } from './dialogHelpers';

/* Undo toast projection + reachability while a dialog is open.

   1. one chip per `undoToast` state, updated in place while `pending` flips,
      cleared when state clears; the 8s window is owned by `useUndoStack`; and
   2. the reachability regression P1 left behind. A modal Radix Dialog puts
      `pointer-events: none` on <body> and `aria-hidden` on siblings, so the
      undo chip must live in an always-mounted `aria-live` body portal with
      restored pointer-events. Tests assert computed `pointerEvents` and
      `aria-hidden` ancestry, with two controls that prove the assertions can fail. */

const editorState = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  folderQuery: '',
  targetParentId: null,
  saving: false
};

function Editor() {
  return (
    <EditBookmarkModal
      editorState={editorState}
      setEditorState={vi.fn()}
      filteredTargets={[]}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />
  );
}

/** Each test uses a fresh toast id: Sonner's store is a module singleton. */
let nextId = 1000;
const undoState = (overrides = {}) => ({
  id: (nextId += 1),
  message: '已移入回收站 1 项',
  pending: false,
  ...overrides
});

const undoButton = () => screen.getByRole('button', { name: '撤销' });


/* jsdom applies `display:none` to closed [popover] and has no Popover API.
   Smoke 7 relies on showPopover for top-layer paint; mirror that here. */
beforeAll(() => {
  if (typeof HTMLElement === 'undefined') return;
  if (typeof HTMLElement.prototype.showPopover === 'function') return;

  const origMatches = Element.prototype.matches;
  Element.prototype.matches = function matches(selectors) {
    if (selectors === ':popover-open') {
      return this.hasAttribute('data-jsdom-popover-open');
    }
    try {
      return origMatches.call(this, selectors);
    } catch (err) {
      if (typeof selectors === 'string' && selectors.includes(':popover-open')) {
        return this.hasAttribute('data-jsdom-popover-open');
      }
      throw err;
    }
  };

  HTMLElement.prototype.showPopover = function showPopover() {
    this.setAttribute('data-jsdom-popover-open', '');
    this.style.setProperty('display', 'block', 'important');
  };
  HTMLElement.prototype.hidePopover = function hidePopover() {
    this.removeAttribute('data-jsdom-popover-open');
    this.style.setProperty('display', 'none', 'important');
  };
});



describe('UndoToast', () => {
  it('keeps an aria-live region mounted even with no toast on screen', () => {
    render(<UndoToast undoToast={null} onUndo={vi.fn()} theme="light" />);

    // This is the node hideOthers() exempts, and it has to exist *before* a
    // dialog opens for the exemption to cover it. The chip itself is the
    // aria-live container (not a sibling empty section), so Undo stays kept.
    const layer = document.querySelector('[data-sonner-toaster][aria-live="polite"]');
    expect(layer).not.toBeNull();
    expect(layer).toHaveAttribute('popover', 'manual');
    expect(screen.queryByRole('button', { name: '撤销' })).toBeNull();
  });

  it('publishes the message and an undo action, and calls back exactly once', async () => {
    const onUndo = vi.fn();
    render(<UndoToast undoToast={undoState()} onUndo={onUndo} theme="light" />);
    await tick();

    expect(screen.getByText('已移入回收站 1 项')).toBeInTheDocument();
    fireEvent.click(undoButton());
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('updates the same toast in place when the action goes pending', async () => {
    const state = undoState();
    const { rerender } = render(<UndoToast undoToast={state} onUndo={vi.fn()} theme="light" />);
    expect(screen.getByRole('button', { name: '撤销' })).toBeInTheDocument();

    rerender(<UndoToast undoToast={{ ...state, pending: true }} onUndo={vi.fn()} theme="light" />);

    expect(screen.getByRole('button', { name: '撤销中…' })).toBeInTheDocument();
    // Updated, not stacked.
    expect(screen.getAllByRole('button', { name: '撤销中…' })).toHaveLength(1);
  });

  it('replaces the previous toast when a second undo is offered', async () => {
    const first = undoState({ message: '第一次' });
    const { rerender } = render(<UndoToast undoToast={first} onUndo={vi.fn()} theme="light" />);
    await tick();
    rerender(<UndoToast undoToast={undoState({ message: '第二次' })} onUndo={vi.fn()} theme="light" />);
    await tick();

    expect(screen.getByText('第二次')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('第一次')).toBeNull());
  });

  it('takes the toast down when the undo state clears', async () => {
    const state = undoState();
    const { rerender } = render(<UndoToast undoToast={state} onUndo={vi.fn()} theme="light" />);
    await tick();
    expect(screen.getByText(state.message)).toBeInTheDocument();

    rerender(<UndoToast undoToast={null} onUndo={vi.fn()} theme="light" />);
    await waitFor(() => expect(screen.queryByText(state.message)).toBeNull());
  });

  it('receives the app theme on the toast layer, not next-themes', () => {
    const state = undoState();
    const { rerender } = render(<UndoToast undoToast={state} onUndo={vi.fn()} theme="dark" />);
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-theme', 'dark');

    rerender(<UndoToast undoToast={state} onUndo={vi.fn()} theme="light" />);
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-theme', 'light');
  });
});

describe('UndoToast reachability while a dialog is open', () => {
  /** Renders the toast, a dialog, and the two controls. */
  async function renderWithDialog(onUndo = vi.fn()) {
    const view = render(
      <div>
        {/* Control 1: an ordinary element in the app tree, where the toast used
            to live. The dialog must hide and deaden this one. */}
        <button data-testid="plain-control">behind the dialog</button>
        {/* Control 2: the pre-P4 toast's own markup — role=status, aria-live,
            and P1's z-80. aria-hidden's `[aria-live]` exemption spares it from
            aria-hidden, which is precisely why a z-index bump looked like it
            would be enough. It is still pointer-inert. */}
        <div role="status" aria-live="polite" className="fixed right-4 bottom-4 z-[80]">
          <button data-testid="legacy-control">撤销（旧）</button>
        </div>
        <UndoToast undoToast={undoState()} onUndo={onUndo} theme="light" />
        <Editor />
      </div>
    );
    await tick();
    return view;
  }

  it('is neither aria-hidden nor pointer-inert, unlike anything else on the page', async () => {
    await renderWithDialog();

    // The dialog really is modal in this environment.
    expect(document.body.style.pointerEvents).toBe('none');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    // Control 1 — hidden from assistive tech and click-through dead.
    const plain = screen.getByTestId('plain-control');
    expect(plain.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(getComputedStyle(plain).pointerEvents).toBe('none');

    // Control 2 — visible to assistive tech thanks to aria-live, and still dead
    // to the pointer. This is the half of the bug a z-index bump cannot fix.
    const legacy = screen.getByTestId('legacy-control');
    expect(legacy.closest('[aria-hidden="true"]')).toBeNull();
    expect(getComputedStyle(legacy).pointerEvents).toBe('none');

    // The Sonner toast — reachable on both counts.
    const button = undoButton();
    expect(button.closest('[aria-hidden="true"]')).toBeNull();
    expect(getComputedStyle(button).pointerEvents).toBe('auto');
    // getByRole() already refuses elements removed from the accessibility tree,
    // so finding the button by its role and name is itself part of the proof.
  });

  it('still runs the undo callback while the dialog is open', async () => {
    const onUndo = vi.fn();
    await renderWithDialog(onUndo);

    fireEvent.click(undoButton());
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('stacks its container above the dialog layers', async () => {
    await renderWithDialog();

    // Inline stacking on the aria-live layer — must clear DialogShell z-90/100.
    const list = document.querySelector('[data-sonner-toaster]');
    expect(Number(getComputedStyle(list).zIndex)).toBeGreaterThan(100);
  });

  it('enters the top layer via popover while a dialog is open', async () => {
    await renderWithDialog();
    const layer = document.querySelector('[data-tabhub-undo-toast]');
    expect(layer).toHaveAttribute('popover', 'manual');
    // jsdom polyfill marker, or :popover-open in real browsers.
    const open =
      layer.hasAttribute('data-jsdom-popover-open') ||
      (typeof layer.matches === 'function' && layer.matches(':popover-open'));
    expect(open).toBe(true);
  });
});

/* Sonner publishes a creation through setTimeout and a dismissal through
   requestAnimationFrame; vitest's default `toFake` list covers the former but
   not the latter, so a faked clock would never take the toast back down. */
const FAKE_TIMER_APIS = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'requestAnimationFrame', 'cancelAnimationFrame'];

describe('the 8s undo window survives the migration', () => {
  const advance = (ms) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  function Harness({ onUndo }) {
    const { undoToast, showUndo, handleUndo } = useUndoStack();
    return (
      <>
        <button onClick={() => showUndo('已移入回收站 1 项', onUndo)}>delete</button>
        <UndoToast undoToast={undoToast} onUndo={() => handleUndo()} theme="light" />
      </>
    );
  }

  it('still offers undo just before the deadline and withdraws it just after', async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });
    try {
      const onUndo = vi.fn().mockResolvedValue(undefined);
      render(<Harness onUndo={onUndo} />);

      await act(async () => {
        fireEvent.click(screen.getByText('delete'));
      });
      await advance(1);
      expect(screen.getByText('已移入回收站 1 项')).toBeInTheDocument();

      // 7.9s in: the window is still open and the callback still fires.
      await advance(7898);
      await act(async () => {
        fireEvent.click(undoButton());
      });
      await advance(1);
      expect(onUndo).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('withdraws the toast when the 8s window expires', async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });
    try {
      const onUndo = vi.fn().mockResolvedValue(undefined);
      render(<Harness onUndo={onUndo} />);

      await act(async () => {
        fireEvent.click(screen.getByText('delete'));
      });
      await advance(1);
      expect(screen.getByText('已移入回收站 1 项')).toBeInTheDocument();

      await advance(8100);

      // Past the deadline the hook has dropped the action and the chip unmounts
      // with it (no Sonner exit animation). Deadline is enforced by the hook.
      expect(screen.queryByRole('button', { name: '撤销' })).toBeNull();
      expect(onUndo).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
