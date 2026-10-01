import { act, fireEvent } from '@testing-library/react';

/**
 * Helpers for the portal-rendered Radix dialogs (P1 of the shadcn migration).
 *
 * The panels live in a portal under document.body, not inside RTL's container,
 * so assertions go through `screen` / `document` rather than
 * `container.firstChild`.
 */

/** Flush one macrotask. Radix defers several listeners with setTimeout(…, 0). */
export async function tick() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The overlay (backdrop) of the topmost open dialog. */
export function getOverlay() {
  const overlays = document.querySelectorAll('[data-dialog-overlay]');
  return overlays[overlays.length - 1] || null;
}

/**
 * Click the backdrop the way a user does.
 *
 * Radix dismisses on an outside interaction, not on a React `onClick`: it
 * registers its `pointerdown` listener a macrotask after mount, and for a
 * primary-button press it defers the dismissal to the following `click`.
 */
export async function clickOverlay() {
  await tick();
  const overlay = getOverlay();
  if (!overlay) throw new Error('no dialog overlay is rendered');
  fireEvent.pointerDown(overlay, { button: 0 });
  fireEvent.click(overlay, { button: 0 });
  await tick();
  return overlay;
}

/** Numeric value of an element's Tailwind z-index utility, bracketed or not. */
export function zIndexOf(element) {
  const match = /(?:^|\s)z-\[?(\d+)\]?(?:\s|$)/.exec(element.className);
  return match ? Number(match[1]) : null;
}
