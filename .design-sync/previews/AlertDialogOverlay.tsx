import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from 'tabhub';

// AlertDialogOverlay is one part of the AlertDialog composition; shown open, in place.
export const ConfirmDelete = () => (
  <div style={{ height: 320 }}>
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除收藏夹「阅读清单」？</AlertDialogTitle>
          <AlertDialogDescription>其中 8 个书签会移到回收站，8 秒内可以撤销。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
