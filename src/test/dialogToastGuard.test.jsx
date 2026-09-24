import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DismissableLayerBranch } from '@radix-ui/react-dismissable-layer';
import { DialogShell } from '../components/DialogShell';

/**
 * Regression guard for the collateral the P4 review found: the undo toast lives
 * outside the dialog's portal on purpose, so Radix counts a click on it as an
 * outside interaction and dismisses the dialog. Delete a card, press `S`, click
 * Undo, and SaveTabsModal's tab selection was silently discarded.
 *
 * jsdom cannot reproduce the original report via `fireEvent.click` (it dispatches
 * no pointerdown, and Radix defers the decision to a document-level click), so
 * these tests drive both events explicitly, which is what a browser does.
 */
function Harness({ onClose }) {
  return (
    <>
      {/* Stand-in for the Undo toast. aria-live keeps hideOthers() from marking
          it; data-sonner-toaster matches DialogShell's ignoreToastInteractions;
          DismissableLayerBranch mirrors production so Radix branches skip
          outside-dismiss when the toast is clicked. */}
      <DismissableLayerBranch asChild>
        <section aria-live="polite" data-sonner-toaster="">
          <button type="button">Undo</button>
        </section>
      </DismissableLayerBranch>
      <button type="button" data-testid="page-button">unrelated page button</button>
      <DialogShell open onClose={onClose} title="Save tabs">
        <div>
          <input aria-label="folder name" />
        </div>
      </DialogShell>
    </>
  );
}

const pointerInteract = (el) => {
  fireEvent.pointerDown(el, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(el, { button: 0 });
};

describe('DialogShell vs. the undo toast', () => {
  it('does not dismiss when the toast outside its portal is clicked', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await screen.findByRole('dialog');

    pointerInteract(screen.getByRole('button', { name: 'Undo' }));

    // Give Radix's deferred document-level click listener a turn.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('still dismisses when something genuinely outside is clicked', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await screen.findByRole('dialog');

    // Queried by test id, not by role+name: while the dialog is open this button
    // is aria-hidden, which strips its accessible name entirely. The toast's Undo
    // button above keeps its name, which is the aria-live exemption in action.
    pointerInteract(screen.getByTestId('page-button'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
