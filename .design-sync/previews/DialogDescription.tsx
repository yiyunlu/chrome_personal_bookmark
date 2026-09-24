import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, Button, Input, Label } from 'tabhub';

// DialogDescription is one part of the Dialog composition; shown open, in place.
export const EditBookmark = () => (
  <div style={{ height: 440 }}>
    <Dialog open>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>编辑书签</DialogTitle>
          <DialogDescription>修改标题和网址，标签用逗号分隔。</DialogDescription>
        </DialogHeader>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <Label htmlFor="t">标题</Label>
            <Input id="t" defaultValue="React 官方文档" />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <Label htmlFor="u">网址</Label>
            <Input id="u" defaultValue="https://react.dev" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">取消</Button>
          <Button>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
