import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BatchMoveModal } from '../components/BatchMoveModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { DeadLinkModal } from '../components/DeadLinkModal';
import { DialogShell } from '../components/DialogShell';
import { PromptModal } from '../components/PromptModal';
import { t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* P6b moved these five surfaces off inline `var()` styling onto token classes.
   The gate counts literals in the source; these tests assert what the browser
   actually receives — the RESOLVED className after tailwind-merge, and the
   absence of inline colour styles — because every failure mode this phase can
   have is silent: the literal is right in the source and only the merged string
   is wrong.

   Nothing here asserts an svg's own width/height attribute: inside a <Button>
   the cva's `[&_svg]:size-4` is a class and beats those attributes, so lucide's
   default 24 stays on the element while the glyph paints at 16. The class is the
   only honest thing to assert. */

const deadLinkState = {
  loading: false,
  progress: null,
  error: null,
  results: [
    {
      bookmarkId: 'b1',
      title: 'Dead one',
      url: 'https://dead.example.com/gone',
      linkStatus: 'dead',
      alive: false,
      error: 'HTTP 404'
    },
    { bookmarkId: 'b2', title: 'Unverifiable', url: 'https://blocked.example.com', linkStatus: 'unknown', alive: false },
    { bookmarkId: 'b3', title: 'Fine', url: 'https://ok.example.com', linkStatus: 'alive', alive: true }
  ]
};

const batchMoveState = { folderQuery: '', targetParentId: 't2', moving: false };
const targets = [
  { id: 't1', title: 'Reading' },
  { id: 't2', title: 'Work' }
];

function panel(role = 'dialog') {
  return document.querySelector(`[role="${role}"]`);
}

function renderDeadLinks(props = {}) {
  return render(
    <DeadLinkModal deadLinkState={deadLinkState} onDeleteBookmark={vi.fn()} onClose={vi.fn()} {...props} />
  );
}

function renderBatchMove(props = {}) {
  return render(
    <BatchMoveModal
      batchMoveState={batchMoveState}
      setBatchMoveState={vi.fn()}
      filteredTargets={targets}
      selectedCount={2}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

const surfaces = [
  ['DeadLinkModal', () => renderDeadLinks(), 'dialog'],
  ['BatchMoveModal', () => renderBatchMove(), 'dialog'],
  ['PromptModal', () => render(<PromptModal open title="重命名" onConfirm={vi.fn()} onCancel={vi.fn()} />), 'dialog'],
  [
    'ConfirmModal',
    () => render(<ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />),
    'alertdialog'
  ]
];

describe('P6b — the five surfaces carry no inline colour', () => {
  it.each(surfaces)('%s renders no element with a var() in its style attribute', async (_name, mount, role) => {
    mount();
    await tick();

    const content = panel(role);
    expect(content).not.toBeNull();
    const styled = [content, ...content.querySelectorAll('*')]
      .map((el) => el.getAttribute('style'))
      .filter((value) => value && value.includes('var(--'));
    expect(styled).toEqual([]);
  });

  it('DialogShell paints its panel with token classes, not an inline style', async () => {
    render(
      <DialogShell open onClose={vi.fn()} title="Shell">
        <div>body</div>
      </DialogShell>
    );
    await tick();

    const content = panel();
    // The surface the other eight dialogs inherit from this one.
    expect(content.className).toContain('bg-card');
    expect(content.className).toContain('border-border');
    // `shadow-panel` is a project scale; it only survives tailwind-merge because
    // src/lib/cn.js registers it (mechanism C in the migration doc).
    expect(content.className).toContain('shadow-panel');
    // The radius the contract's table assigns to a dialog panel, unprefixed —
    // this element is a raw Radix Content, so no `sm:rounded-lg` can outrank it.
    expect(content.className).toContain('rounded-lg');
    expect(content.className).not.toContain('sm:rounded-lg');
    // Nothing about the surface is inline any more. (Radix writes its own
    // `pointer-events: auto` here, so this checks the three properties the old
    // PANEL_STYLE set rather than the whole attribute.)
    expect(content.style.background).toBe('');
    expect(content.style.borderColor).toBe('');
    expect(content.style.boxShadow).toBe('');
  });

  it('DialogShell lets a caller keep its own width without losing the surface', async () => {
    render(
      <DialogShell open onClose={vi.fn()} title="Shell" className="max-w-xl">
        <div>body</div>
      </DialogShell>
    );
    await tick();

    // `max-w-*` is a different merge group, so the caller's class and the panel
    // surface coexist. All nine callers pass nothing but a width.
    const content = panel();
    expect(content.className).toContain('max-w-xl');
    expect(content.className).toContain('bg-card');
    expect(content.className).toContain('shadow-panel');
  });
});

describe('P6b — merged class strings (the hazards that are silent in source)', () => {
  it('the prompt field states its size at every breakpoint', async () => {
    render(<PromptModal open title="重命名" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    await tick();

    const field = panel().querySelector('input');
    // shadcn's Input ships `text-base md:text-sm`. An unprefixed override removes
    // only `text-base`; the responsive one is its own merge group and survives to
    // win from 768px up — which is how the toolbar search rendered 14px instead of
    // 12.5px. So: no `text-base` leftover, and every font size still in the
    // resolved string agrees, whatever breakpoint it is keyed to. Asserting merely
    // that `md:text-sm` is PRESENT would prove nothing — the vendored base
    // supplies it whether or not this file restates it. This fails the moment the
    // two disagree, which is the actual bug shape.
    expect(field.className).not.toContain('text-base');
    const sizes = [...field.className.matchAll(/(?:^|\s)(?:md:)?(text-(?:xs|sm|base|lg|\[[^\]]+\]))/g)].map(
      (m) => m[1]
    );
    expect(sizes.length).toBeGreaterThan(1);
    expect(new Set(sizes).size).toBe(1);
    // The accent ring is width + colour, two groups — not the arbitrary
    // colour/opacity pair that resolved to the opacity alone in P3.
    expect(field.className).toContain('focus-visible:ring-2');
    expect(field.className).toContain('focus-visible:ring-primary');
    expect(field.className).not.toContain('focus-visible:ring-1');
  });

  it('the selected batch-move target keeps its tint on hover', async () => {
    renderBatchMove();
    await tick();

    const selected = screen.getByRole('button', { name: 'Work' });
    const idle = screen.getByRole('button', { name: 'Reading' });

    expect(selected.className).toContain('bg-primary/10');
    expect(selected.className).toContain('text-primary');
    // `hover:*` is its own merge group: without the restated hover pair the ghost
    // variant's `hover:bg-accent hover:text-accent-foreground` would survive and
    // repaint the selected row the moment the pointer touched it.
    expect(selected.className).toContain('hover:bg-primary/10');
    expect(selected.className).toContain('hover:text-primary');
    expect(selected.className).not.toContain('hover:bg-accent');
    expect(selected.getAttribute('aria-pressed')).toBe('true');

    // The unselected row is the opposite: it keeps the ghost hover surface.
    expect(idle.className).toContain('hover:bg-accent');
    expect(idle.className).not.toContain('bg-primary/10');
    expect(idle.getAttribute('aria-pressed')).toBe('false');
  });

  it('the confirm action is destructive only when the caller asks for it', async () => {
    const { rerender } = render(
      <ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    await tick();

    let confirm = screen.getByRole('button', { name: t('confirm') });
    expect(confirm.className).toContain('bg-primary');
    expect(confirm.className).not.toContain('bg-destructive');

    rerender(<ConfirmModal open danger title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    confirm = screen.getByRole('button', { name: t('confirm') });
    expect(confirm.className).toContain('bg-destructive');
    expect(confirm.className).toContain('text-destructive-foreground');
  });

  it('the confirm Cancel is a Button slotted into Radix, with no stacked-footer margin', async () => {
    render(<ConfirmModal open title="删除" message="确认删除？" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    await tick();

    const cancel = screen.getByRole('button', { name: t('cancel') });
    // The `outline` variant, via asChild — not shadcn's AlertDialogCancel, which
    // ships `mt-2 sm:mt-0` for a stacked footer this dialog does not have. An
    // unprefixed `mt-0` would not have removed the `sm:` half of that pair.
    expect(cancel.className).toContain('border-input');
    expect(cancel.className).not.toContain('mt-2');
    expect(cancel.className).not.toContain('sm:mt-0');
  });

  it('the dead-link row button carries the dense glyph class', async () => {
    renderDeadLinks();
    await tick();

    const remove = screen.getAllByRole('button', { name: t('deadLinkDeleteTitle') })[0];
    // 12px inside a 28px row, per the control-relative icon table. It has to be a
    // class: the cva's `[&_svg]:size-4` beats the svg's width/height attributes.
    expect(remove.className).toContain('[&_svg]:size-3');
    expect(remove.className).not.toContain('[&_svg]:size-4');
    expect(remove.className).toContain('text-destructive');
  });
});

describe('P6b — behaviour survived the conversion', () => {
  it('DeadLinkModal keeps the scroll region, the split and the delete callback', async () => {
    const onDeleteBookmark = vi.fn();
    renderDeadLinks({ onDeleteBookmark });
    await tick();

    const content = panel();
    // The body scrolls, not the panel: the header and footer sit outside it.
    const scroller = content.querySelector('.max-h-\\[60vh\\]');
    expect(scroller).not.toBeNull();
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller.getAttribute('style')).toBeNull();

    // One confirmed and one unverifiable, from the same results array.
    expect(screen.getByText(`${t('deadLinkConfirmed')} (1)`)).toBeInTheDocument();
    expect(screen.getByText(`${t('deadLinkUnknown')} (1)`)).toBeInTheDocument();
    expect(screen.getByText('Dead one')).toBeInTheDocument();
    expect(screen.getByText('Unverifiable')).toBeInTheDocument();
    // The alive one is counted, never listed.
    expect(screen.queryByText('Fine')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: t('deadLinkDeleteTitle') })[0]);
    expect(onDeleteBookmark).toHaveBeenCalledWith('b1', 'Dead one');
  });

  it('every icon-only control in the two picker dialogs has an accessible name', async () => {
    renderDeadLinks();
    await tick();
    expect(screen.getAllByRole('button', { name: t('close') }).length).toBeGreaterThan(0);
    // One per problem row: the confirmed dead link and the unverifiable one.
    expect(screen.getAllByRole('button', { name: t('deadLinkDeleteTitle') })).toHaveLength(2);

    renderBatchMove();
    await tick();
    // The header X of the batch-move dialog, which shows no text of its own.
    const closers = screen.getAllByRole('button', { name: t('close') });
    expect(closers.some((el) => el.textContent.trim() === '')).toBe(true);
  });

  it('BatchMoveModal still drives its target picker and its save button', async () => {
    const setBatchMoveState = vi.fn();
    const onSave = vi.fn();
    renderBatchMove({ setBatchMoveState, onSave });
    await tick();

    fireEvent.click(screen.getByRole('button', { name: 'Reading' }));
    expect(setBatchMoveState).toHaveBeenCalledTimes(1);
    expect(setBatchMoveState.mock.calls[0][0](batchMoveState)).toEqual({ ...batchMoveState, targetParentId: 't1' });

    fireEvent.click(screen.getByRole('button', { name: t('batchMove') }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('BatchMoveModal disables Save until a target is chosen', async () => {
    renderBatchMove({ batchMoveState: { folderQuery: '', targetParentId: null, moving: false } });
    await tick();

    expect(screen.getByRole('button', { name: t('batchMove') })).toBeDisabled();
  });

  it('PromptModal still submits on Enter and refuses an empty value', async () => {
    const onConfirm = vi.fn();
    render(<PromptModal open title="重命名" defaultValue="folder" onConfirm={onConfirm} onCancel={vi.fn()} />);
    await tick();

    const field = panel().querySelector('input');
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledWith('folder');

    fireEvent.change(field, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: t('confirm') })).toBeDisabled();
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
