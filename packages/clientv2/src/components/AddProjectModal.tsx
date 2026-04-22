import { CloseIcon } from "./icons";

interface AddProjectModalProps {
  isOpen: boolean;
  pathDraft: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  pickerHint: string | null;
  onPathChange: (value: string) => void;
  onPickFolder: () => Promise<void>;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export function AddProjectModal({
  isOpen,
  pathDraft,
  errorMessage,
  isSubmitting,
  pickerHint,
  onPathChange,
  onPickFolder,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-project-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Add Project</p>
            <h2 id="add-project-title">添加一个本地项目</h2>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <CloseIcon className="ui-icon ui-icon--close" />
          </button>
        </div>

        <p className="modal-copy">
          填一个绝对路径，比如 <code>D:\dev\github\yepanywhere</code>。后端已经支持
          `POST /api/projects`，这里会直接调用那条接口。
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void onPickFolder();
            }}
          >
            选择文件夹
          </button>
          <span className="helper-text">
            {pickerHint ??
              "浏览器通常拿不到绝对路径，选择后可以继续手动补全或编辑路径。"}
          </span>
        </div>

        <label className="field">
          <span className="field__label">项目路径</span>
          <input
            autoFocus
            type="text"
            value={pathDraft}
            placeholder="D:\\dev\\github\\your-project"
            onChange={(event) => onPathChange(event.target.value)}
          />
        </label>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

        <div className="modal-footer">
          <button type="button" className="ghost-button" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isSubmitting || pathDraft.trim().length === 0}
            onClick={() => {
              void onSubmit();
            }}
          >
            {isSubmitting ? "添加中..." : "添加项目"}
          </button>
        </div>
      </section>
    </div>
  );
}
