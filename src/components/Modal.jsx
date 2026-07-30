import React, { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, className, children }) {
  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap: capture previous focus, focus first element, restore on close
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;

    // Small delay to let the panel render
    const raf = requestAnimationFrame(() => {
      const panel = overlayRef.current?.querySelector('[data-modal-panel]');
      if (!panel) return;
      const first = panel.querySelector(FOCUSABLE_SELECTOR);
      if (first) first.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      // Restore focus on unmount
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  // Tab trap
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Tab') return;
      const panel = overlayRef.current?.querySelector('[data-modal-panel]');
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  if (!open) return null;

  const titleId = title ? 'modal-title-' + title.replace(/\s+/g, '-').toLowerCase() : undefined;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15, 23, 42, 0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        data-modal-panel
        className={
          'w-full rounded-2xl border overflow-hidden animate-slide-up' +
          (className ? ' ' + className : ' max-w-lg')
        }
        style={{
          background: 'var(--panel-bg)',
          borderColor: 'var(--panel-border)',
          boxShadow: 'var(--shadow)'
        }}
      >
        {title && <span id={titleId} className="sr-only">{title}</span>}
        {children}
      </div>
    </div>
  );
}
