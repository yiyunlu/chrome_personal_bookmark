import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator } from 'tabhub';

// SelectContent is one part of the Select composition; shown open, in place.
export const InSelect = () => (
  <div style={{ height: 260 }}>
    <Select defaultValue="dev" open>
      <SelectTrigger style={{ width: 240 }} aria-label="目标收藏夹">
        <SelectValue placeholder="选择收藏夹" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>收藏夹</SelectLabel>
          <SelectItem value="dev">前端开发</SelectItem>
          <SelectItem value="design">设计资源</SelectItem>
          <SelectItem value="read">阅读清单</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="new">＋ 新建收藏夹…</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
