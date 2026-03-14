import React from 'react';

export function ContextMenu({ contextMenu, onEditCard, onDeleteCard, onRenameCollection, onDeleteCollection }) {
  if (!contextMenu) return null;

  return (
    <div
      className="context-menu"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.kind === 'card' && (
        <>
          <button type="button" className="context-item" onClick={onEditCard}>
            编辑书签（含目录）
          </button>
          <button type="button" className="context-item context-item-danger" onClick={onDeleteCard}>
            删除到回收站
          </button>
        </>
      )}
      {contextMenu.kind === 'collection' && (
        <>
          <button type="button" className="context-item" onClick={onRenameCollection}>
            重命名目录
          </button>
          <button type="button" className="context-item context-item-danger" onClick={onDeleteCollection}>
            删除目录
          </button>
        </>
      )}
    </div>
  );
}
