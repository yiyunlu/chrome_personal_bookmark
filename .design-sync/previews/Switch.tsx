import React from 'react';
import { Switch, Label } from 'tabhub';

export const States = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Switch aria-label="关闭" />
    <Switch aria-label="开启" defaultChecked />
    <Switch aria-label="禁用" disabled />
    <Switch aria-label="禁用且开启" disabled defaultChecked />
  </div>
);

export const SettingRow = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: 320 }}>
    <div>
      <Label htmlFor="sync">跟随系统主题</Label>
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>随系统日夜切换外观</div>
    </div>
    <Switch id="sync" defaultChecked />
  </div>
);
