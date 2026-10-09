/** Selectors shared with DialogShell's outside-click guard. */
export const UNDO_TOAST_ROOT_SELECTOR = '[data-tabhub-undo-toast]';

export function getOpenDialogEl() {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (let i = dialogs.length - 1; i >= 0; i -= 1) {
    const dialog = dialogs[i];
    const state = dialog.getAttribute('data-state');
    if (!state || state === 'open') return dialog;
  }
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

export function getTabbables(root) {
  if (!root) return [];
  const nodes = root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(nodes).filter((el) => {
    if (el.hasAttribute('data-radix-focus-guard')) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  });
}

export function getUndoToastButton() {
  const root = document.querySelector(UNDO_TOAST_ROOT_SELECTOR);
  return root?.querySelector('button[type="button"]') ?? null;
}

/**
 * Extend Radix Dialog's FocusScope tab loop to include the body-mounted undo chip
 * while a modal is open. Called from document keydown (capture).
 */
export function handleUndoDialogTabKey(event) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;

  const undoBtn = getUndoToastButton();
  if (!undoBtn) return;

  const dialog = getOpenDialogEl();
  if (!dialog) return;

  const tabbables = getTabbables(dialog);
  if (!tabbables.length) return;

  const active = document.activeElement;
  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    undoBtn.focus({ preventScroll: true });
    return;
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    undoBtn.focus({ preventScroll: true });
    return;
  }
  if (!event.shiftKey && active === undoBtn) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return;
  }
  if (event.shiftKey && active === undoBtn) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  }
}

/** Keep Radix FocusScope from yanking focus off the undo button (bubble-phase trap). */
export function blockFocusTrapOnUndoToast(event) {
  const root = document.querySelector(UNDO_TOAST_ROOT_SELECTOR);
  if (root?.contains(event.target)) {
    event.stopImmediatePropagation();
  }
}

export function installUndoDialogFocusBridge() {
  const onKeyDown = (event) => handleUndoDialogTabKey(event);
  const onFocusIn = (event) => blockFocusTrapOnUndoToast(event);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocusIn, true);
  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focusin', onFocusIn, true);
  };
}
