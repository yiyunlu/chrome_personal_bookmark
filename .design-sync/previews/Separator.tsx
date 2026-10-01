import React from 'react';
import { Separator } from 'tabhub';

export const Horizontal = () => (
  <div style={{ width: 320, fontSize: 13 }}>
    <div>全部收藏</div>
    <Separator style={{ margin: '10px 0' }} />
    <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', opacity: 0.55 }}>分类</div>
  </div>
);

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 20, fontSize: 13 }}>
    <span>网格</span>
    <Separator orientation="vertical" />
    <span>列表</span>
    <Separator orientation="vertical" />
    <span>管理</span>
  </div>
);
