import React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, Button } from 'tabhub';

// DropdownMenuCheckboxItem is one part of the DropdownMenu composition; shown open, in place.
export const BookmarkMenu = () => (
  <div style={{ minHeight: 380 }}>
    <DropdownMenu open modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">更多操作</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>React 官方文档</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>在新标签页打开 <DropdownMenuShortcut>⏎</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>编辑… <DropdownMenuShortcut>E</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem>复制链接</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>置顶</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>移动到</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem>前端开发</DropdownMenuItem>
              <DropdownMenuItem>设计资源</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuRadioGroup value="grid">
          <DropdownMenuLabel>视图</DropdownMenuLabel>
          <DropdownMenuRadioItem value="grid">网格</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="list">列表</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem style={{ color: "hsl(var(--ui-destructive))" }}>移到回收站 <DropdownMenuShortcut>⌫</DropdownMenuShortcut></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
