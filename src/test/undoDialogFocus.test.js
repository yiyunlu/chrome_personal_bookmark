import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTabbables,
  handleUndoDialogTabKey,
  installUndoDialogFocusBridge
} from '../lib/undoDialogFocus';

describe('undoDialogFocus', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  it('moves focus from the last dialog tab stop to the undo button on Tab', () => {
    container.innerHTML = `
      <div role="dialog" data-state="open">
        <input aria-label="first" />
        <button type="button" id="last">last in dialog</button>
      </div>
      <div data-tabhub-undo-toast="">
        <button type="button" id="undo">Undo</button>
      </div>
    `;
    const last = container.querySelector('#last');
    const undo = container.querySelector('#undo');
    last.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    handleUndoDialogTabKey(event);

    expect(document.activeElement).toBe(undo);
    expect(event.defaultPrevented).toBe(true);
  });

  it('returns focus to the first dialog tab stop when Tab leaves the undo button', () => {
    container.innerHTML = `
      <div role="dialog" data-state="open">
        <input aria-label="first" id="first" />
        <button type="button">last</button>
      </div>
      <div data-tabhub-undo-toast="">
        <button type="button" id="undo">Undo</button>
      </div>
    `;
    const first = container.querySelector('#first');
    const undo = container.querySelector('#undo');
    undo.focus();

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    handleUndoDialogTabKey(event);

    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBe(true);
  });

  it('installs and removes document listeners', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const cleanup = installUndoDialogFocusBridge();
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('focusin', expect.any(Function), true);
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('focusin', expect.any(Function), true);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('skips radix focus guards when collecting tab stops', () => {
    container.innerHTML = `
      <div role="dialog">
        <span data-radix-focus-guard="" tabindex="0"></span>
        <button type="button" id="real">ok</button>
      </div>
    `;
    const tabbables = getTabbables(container.querySelector('[role="dialog"]'));
    expect(tabbables).toHaveLength(1);
    expect(tabbables[0].id).toBe('real');
  });
});
