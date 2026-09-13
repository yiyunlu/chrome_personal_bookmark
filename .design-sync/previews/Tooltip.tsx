import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, Button } from 'tabhub';

export const Open = () => (
  <div style={{ padding: '40px 24px 8px' }}>
    <Tooltip open>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="接受建议">✓</Button>
      </TooltipTrigger>
      <TooltipContent>接受建议</TooltipContent>
    </Tooltip>
  </div>
);

export const Side = () => (
  <div style={{ display: 'flex', gap: 48, padding: '12px 60px' }}>
    <Tooltip open>
      <TooltipTrigger asChild><Button variant="outline">下方</Button></TooltipTrigger>
      <TooltipContent side="bottom">保存标签页 (S)</TooltipContent>
    </Tooltip>
    <Tooltip open>
      <TooltipTrigger asChild><Button variant="outline">右侧</Button></TooltipTrigger>
      <TooltipContent side="right">管理 (M)</TooltipContent>
    </Tooltip>
  </div>
);
