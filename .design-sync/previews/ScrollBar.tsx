import React from 'react';
import { ScrollArea, ScrollBar } from 'tabhub';

// ScrollBar is only ever a child of ScrollArea; horizontal is the one the default ScrollArea doesn't add.
export const Horizontal = () => (
  <ScrollArea style={{ width: 320, whiteSpace: 'nowrap', border: '1px solid hsl(var(--ui-border))', borderRadius: 8 }}>
    <div style={{ display: 'flex', gap: 8, padding: 12 }}>
      {['前端开发', '设计资源', '阅读清单', '工具箱', '学习', '工作', '未分类'].map((c) => (
        <div key={c} style={{ flex: '0 0 auto', padding: '6px 10px', borderRadius: 6, background: 'hsl(var(--ui-secondary))', fontSize: 13 }}>{c}</div>
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);
