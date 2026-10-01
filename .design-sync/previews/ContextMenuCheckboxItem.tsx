import React, { useEffect, useRef } from 'react';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup } from 'tabhub';

// ContextMenuCheckboxItem is one part of the ContextMenu composition. Radix ContextMenu has no
// controlled `open`, so the story opens itself by firing a real contextmenu
// event on its trigger once mounted - the only way this render is true.
export const BookmarkMenu = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const id = setTimeout(() => el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 20, button: 2 })), 50);
    return () => clearTimeout(id);
  }, []);
  return (
    <div style={{ minHeight: 400 }}>
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <div ref={ref} style={{ width: 240, padding: 11, border: "1px dashed hsl(var(--ui-border))", borderRadius: 9, fontSize: 13, color: "hsl(var(--ui-muted-foreground))" }}>
          右键点击书签卡片
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <ContextMenuLabel>Vite 配置参考</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem>在新标签页打开 <ContextMenuShortcut>⏎</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem>编辑… <ContextMenuShortcut>E</ContextMenuShortcut></ContextMenuItem>
          <ContextMenuItem>复制链接</ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>置顶</ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>移动到</ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent>
              <ContextMenuItem>前端开发</ContextMenuItem>
              <ContextMenuItem>设计资源</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
        <ContextMenuRadioGroup value="grid">
          <ContextMenuLabel>视图</ContextMenuLabel>
          <ContextMenuRadioItem value="grid">网格</ContextMenuRadioItem>
          <ContextMenuRadioItem value="list">列表</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem style={{ color: "hsl(var(--ui-destructive))" }}>移到回收站 <ContextMenuShortcut>⌫</ContextMenuShortcut></ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    </div>
  );
};
