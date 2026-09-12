import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { UndoToast } from '../components/UndoToast';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { useUndoStack } from '../hooks/useUndoStack';
import { tick } from './dialogHelpers';

/* P4. Two things are under test here:

   1. the Sonner bridge — one toast per `undoToast.id`, updated in place while
      `pending` flips, dismissed when the state clears, and the 8s window still
      owned by `useUndoStack`; and
   2. the reachability regression P1 left behind. A modal Radix Dialog puts
      `pointer-events: none` on <body> and `aria-hidden` on everything that is
      not an ancestor of its content, so the undo toast was inert and invisible
      to assistive tech while any dialog was open — whatever its z-index. The
      tests below assert on `getComputedStyle().pointerEvents` and on
      `aria-hidden` ancestry, not on class strings, and they carry two controls
      that prove the assertions can fail. */

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

afterEach(() => {
  act(() => toast.dismiss());
});

describe('UndoToast on Sonner', () => {
  it('keeps an aria-live region mounted even with no toast on screen', () => {
    render(<UndoToast undoToast={null} onUndo={vi.fn()} theme="light" />);

    // This is the node hideOthers() exempts, and it has to exist *before* a
    // dialog opens for the exemption to cover it.
    expect(document.querySelector('section[aria-live="polite"]')).not.toBeNull();
    expect(document.querySelector('[data-sonner-toast]')).toBeNull();
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
    await tick();
    expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);

    rerender(<UndoToast undoToast={{ ...state, pending: true }} onUndo={vi.fn()} theme="light" />);
    await tick();

    expect(screen.getByRole('button', { name: '撤销中…' })).toBeInTheDocument();
    // Updated, not stacked.
    expect(document.querySelectorAll('[data-sonner-toast]')).toHaveLength(1);
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

  it('drives Sonner from the app theme, not next-themes', async () => {
    const state = undoState();
    const { rerender } = render(<UndoToast undoToast={state} onUndo={vi.fn()} theme="dark" />);
    await tick();
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-sonner-theme', 'dark');

    rerender(<UndoToast undoToast={state} onUndo={vi.fn()} theme="light" />);
    await tick();
    expect(document.querySelector('[data-sonner-toaster]')).toHaveAttribute('data-sonner-theme', 'light');
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

    // Sonner's own injected stylesheet, not a Tailwind class: read the computed
    // value so the assertion is about what the browser would stack.
    const list = document.querySelector('[data-sonner-toaster]');
    expect(Number(getComputedStyle(list).zIndex)).toBeGreaterThan(100);
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
      // Sonner publishes one macrotask later (it flushSyncs outside the caller's
      // batch), and that has to be a separate act() from the click: the effect
      // that calls toast.custom has not run until this one commits.
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
      // Sonner publishes one macrotask later (it flushSyncs outside the caller's
      // batch), and that has to be a separate act() from the click: the effect
      // that calls toast.custom has not run until this one commits.
      await advance(1);
      expect(screen.getByText('已移入回收站 1 项')).toBeInTheDocument();

      await advance(8100);

      // Past the deadline the hook has dropped the action. Sonner is still
      // walking the toast out at this point, so press the button that is still
      // on screen: the deadline has to be enforced by the hook, not by whether
      // the node has finished animating away.
      await act(async () => {
        fireEvent.click(undoButton());
      });
      expect(onUndo).not.toHaveBeenCalled();

      // …and it does leave. (Two turns of the clock: Sonner marks the toast
      // removed on one frame and unmounts it 200ms after that, each step
      // needing its own React commit.)
      await advance(1000);
      await advance(1000);
      expect(screen.queryByRole('button', { name: '撤销' })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
