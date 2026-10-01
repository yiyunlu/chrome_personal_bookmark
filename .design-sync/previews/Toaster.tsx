import React, { useEffect } from 'react';
import { Toaster, Button, toast } from 'tabhub';
// `toast` is sonner's store, merged onto the package global from .design-sync/entries/toast.js -
// the same sonner instance this Toaster listens to (a second copy would never show anything).

export const UndoToast = () => {
  useEffect(() => {
    const id = toast.custom(
      () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 9, border: '1px solid hsl(var(--ui-border))', background: 'hsl(var(--ui-card))', color: 'hsl(var(--ui-card-foreground))', boxShadow: 'var(--shadow)', fontSize: 13 }}>
          <span>已移到回收站 3 个书签</span>
          <Button variant="ghost" size="sm" style={{ height: 'auto', padding: '4px 10px', fontSize: 12, background: 'hsl(var(--ui-primary) / 0.1)', color: 'hsl(var(--ui-primary))' }}>撤销</Button>
        </div>
      ),
      { duration: Infinity, dismissible: false }
    );
    return () => toast.dismiss(id);
  }, []);
  return (
    <div style={{ height: 120, position: 'relative' }}>
      <Toaster theme="light" position="bottom-right" offset={16} />
    </div>
  );
};
