import React from 'react';
import { Input, Label } from 'tabhub';

export const Default = () => <Input placeholder="搜索书签…" style={{ width: 280 }} />;

export const WithValue = () => (
  <div style={{ display: 'grid', gap: 6, width: 280 }}>
    <Label htmlFor="url">网址</Label>
    <Input id="url" defaultValue="https://react.dev/learn" />
  </div>
);

export const Disabled = () => <Input disabled defaultValue="sk-ant-…（已保存）" style={{ width: 280 }} />;
