import React from 'react';

export function BatchMoveModal({ batchMoveState, setBatchMoveState, filteredTargets, selectedCount, onSave, onClose }) {
  if (!batchMoveState) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">批量移动书签（{selectedCount} 项）</div>
        <div className="modal-body">
          <label className="control-label">搜索目标文件夹</label>
          <input
            className="input-control"
            placeholder="搜索文件夹..."
            value={batchMoveState.folderQuery}
            onChange={(e) =>
              setBatchMoveState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
            }
          />
          <div className="folder-list">
            {filteredTargets.map((collection) => (
              <button
                type="button"
                key={collection.id}
                className={`folder-item ${batchMoveState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
                onClick={() =>
                  setBatchMoveState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
                }
              >
                {collection.title}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={onSave}
            disabled={batchMoveState.moving || !batchMoveState.targetParentId || selectedCount === 0}
          >
            {batchMoveState.moving ? '移动中...' : '批量移动'}
          </button>
        </div>
      </div>
    </div>
  );
}
