import React from 'react';

export function EditBookmarkModal({ editorState, setEditorState, filteredTargets, onSave, onClose }) {
  if (!editorState) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">编辑书签</div>
        <div className="modal-body">
          <label className="control-label">标题</label>
          <input
            className="input-control"
            value={editorState.title}
            onChange={(e) =>
              setEditorState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
            }
          />
          <label className="control-label mt-3">URL</label>
          <input
            className="input-control"
            value={editorState.url}
            onChange={(e) =>
              setEditorState((prev) => (prev ? { ...prev, url: e.target.value } : prev))
            }
          />
          <label className="control-label mt-3">移动到文件夹</label>
          <input
            className="input-control"
            placeholder="搜索文件夹..."
            value={editorState.folderQuery}
            onChange={(e) =>
              setEditorState((prev) => (prev ? { ...prev, folderQuery: e.target.value } : prev))
            }
          />
          <div className="folder-list">
            {filteredTargets.map((collection) => (
              <button
                type="button"
                key={collection.id}
                className={`folder-item ${editorState.targetParentId === collection.id ? 'folder-item-active' : ''}`}
                onClick={() =>
                  setEditorState((prev) => (prev ? { ...prev, targetParentId: collection.id } : prev))
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
            disabled={editorState.saving}
          >
            {editorState.saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
