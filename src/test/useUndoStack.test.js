import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoStack } from '../hooks/useUndoStack';

describe('useUndoStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no undo toast', () => {
    const { result } = renderHook(() => useUndoStack());
    expect(result.current.undoToast).toBeNull();
  });

  describe('showUndo', () => {
    it('sets the undo toast with message and undo callback', () => {
      const { result } = renderHook(() => useUndoStack());
      const undoFn = vi.fn();

      act(() => {
        result.current.showUndo('Deleted 3 items', undoFn);
      });

      expect(result.current.undoToast).not.toBeNull();
      expect(result.current.undoToast.message).toBe('Deleted 3 items');
      expect(result.current.undoToast.undo).toBe(undoFn);
      expect(result.current.undoToast.pending).toBe(false);
      expect(result.current.undoToast.id).toEqual(expect.any(Number));
    });

    it('replaces a previous toast when called again', () => {
      const { result } = renderHook(() => useUndoStack());

      act(() => {
        result.current.showUndo('First', vi.fn());
      });
      const firstId = result.current.undoToast.id;

      // Advance time slightly so Date.now() changes
      vi.advanceTimersByTime(100);

      act(() => {
        result.current.showUndo('Second', vi.fn());
      });

      expect(result.current.undoToast.message).toBe('Second');
      expect(result.current.undoToast.id).not.toBe(firstId);
    });
  });

  describe('auto-dismiss', () => {
    it('clears the toast after 8 seconds', () => {
      const { result } = renderHook(() => useUndoStack());

      act(() => {
        result.current.showUndo('Will disappear', vi.fn());
      });
      expect(result.current.undoToast).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(result.current.undoToast).toBeNull();
    });

    it('does not clear the toast before 8 seconds', () => {
      const { result } = renderHook(() => useUndoStack());

      act(() => {
        result.current.showUndo('Still here', vi.fn());
      });

      act(() => {
        vi.advanceTimersByTime(7999);
      });

      expect(result.current.undoToast).not.toBeNull();
    });

    it('resets the auto-dismiss timer when a new toast is shown', () => {
      const { result } = renderHook(() => useUndoStack());

      act(() => {
        result.current.showUndo('First', vi.fn());
      });

      // Advance 5 seconds, then show new toast
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        result.current.showUndo('Second', vi.fn());
      });

      // Advance another 5 seconds (10 seconds total, but only 5 since the new toast)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should still be visible — the second toast's 8s timer hasn't expired yet
      expect(result.current.undoToast).not.toBeNull();
      expect(result.current.undoToast.message).toBe('Second');

      // Advance the remaining 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.undoToast).toBeNull();
    });
  });

  describe('handleUndo', () => {
    it('calls the undo callback and clears the toast', async () => {
      const { result } = renderHook(() => useUndoStack());
      const undoFn = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.showUndo('Undo me', undoFn);
      });

      await act(async () => {
        await result.current.handleUndo();
      });

      expect(undoFn).toHaveBeenCalledTimes(1);
      expect(result.current.undoToast).toBeNull();
    });

    it('calls the onAfterUndo callback after undo', async () => {
      const { result } = renderHook(() => useUndoStack());
      const undoFn = vi.fn().mockResolvedValue(undefined);
      const afterUndo = vi.fn().mockResolvedValue(undefined);

      act(() => {
        result.current.showUndo('Undo me', undoFn);
      });

      await act(async () => {
        await result.current.handleUndo(afterUndo);
      });

      expect(undoFn).toHaveBeenCalledTimes(1);
      expect(afterUndo).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no toast is active', async () => {
      const { result } = renderHook(() => useUndoStack());

      await act(async () => {
        await result.current.handleUndo();
      });

      // No error, toast stays null
      expect(result.current.undoToast).toBeNull();
    });

    it('does nothing when toast is already pending', async () => {
      const { result } = renderHook(() => useUndoStack());
      // Create a slow undo that we can control
      let resolveUndo;
      const undoFn = vi.fn(() => new Promise((resolve) => { resolveUndo = resolve; }));

      act(() => {
        result.current.showUndo('Slow undo', undoFn);
      });

      // Start the undo — sets pending: true
      let firstUndoPromise;
      act(() => {
        firstUndoPromise = result.current.handleUndo();
      });

      // The toast should be pending now
      expect(result.current.undoToast.pending).toBe(true);

      // A second call should be a no-op
      await act(async () => {
        await result.current.handleUndo();
      });

      // The undo function should only have been called once
      expect(undoFn).toHaveBeenCalledTimes(1);

      // Resolve the first undo to clean up
      await act(async () => {
        resolveUndo();
        await firstUndoPromise;
      });
    });

    it('clears toast even if undo callback throws', async () => {
      const { result } = renderHook(() => useUndoStack());
      const undoFn = vi.fn().mockRejectedValue(new Error('fail'));

      act(() => {
        result.current.showUndo('Will fail', undoFn);
      });

      await act(async () => {
        try {
          await result.current.handleUndo();
        } catch {
          // expected
        }
      });

      expect(result.current.undoToast).toBeNull();
    });
  });
});
