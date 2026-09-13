import React from 'react';
import { Label, Input, Switch } from 'tabhub';

export const FieldLabel = () => (
  <div style={{ display: 'grid', gap: 6, width: 280 }}>
    <Label htmlFor="title">标题</Label>
    <Input id="title" defaultValue="React 官方文档" />
  </div>
);

export const InlineWithSwitch = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <Switch id="autotag" defaultChecked />
    <Label htmlFor="autotag">保存时自动打标签</Label>
  </div>
);
