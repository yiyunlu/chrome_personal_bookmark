import React from 'react';
import { Textarea, Label } from 'tabhub';

export const Default = () => <Textarea placeholder="告诉助手你想做什么，例如：把所有 GitHub 链接移到「开发」" style={{ width: 360 }} />;

export const WithLabel = () => (
  <div style={{ display: 'grid', gap: 6, width: 360 }}>
    <Label htmlFor="note">备注</Label>
    <Textarea id="note" defaultValue="Hooks 章节要重读一遍，特别是 useEffect 的依赖数组。" />
  </div>
);
