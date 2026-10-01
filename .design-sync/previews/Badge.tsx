import React from 'react';
import { Badge } from 'tabhub';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge>开发</Badge>
    <Badge variant="secondary">设计</Badge>
    <Badge variant="outline">12 项</Badge>
    <Badge variant="destructive">失效链接</Badge>
  </div>
);

export const TagRow = () => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
    <Badge variant="secondary">github</Badge>
    <Badge variant="secondary">docs</Badge>
    <Badge variant="secondary">react</Badge>
    <Badge variant="secondary">工具</Badge>
  </div>
);
