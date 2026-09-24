import React from 'react';
import { ScrollArea, Separator } from 'tabhub';

const tags = ['github', 'docs', 'react', 'vite', 'tailwind', 'radix', 'shadcn', 'chrome-extension', 'typescript', 'eslint', 'vitest', 'playwright', 'design', 'figma', 'i18n'];

export const TagList = () => (
  <ScrollArea style={{ height: 180, width: 220, border: '1px solid hsl(var(--ui-border))', borderRadius: 8 }}>
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>标签</div>
      {tags.map((t) => (
        <React.Fragment key={t}>
          <div style={{ fontSize: 13, padding: '4px 0' }}>{t}</div>
          <Separator />
        </React.Fragment>
      ))}
    </div>
  </ScrollArea>
);
