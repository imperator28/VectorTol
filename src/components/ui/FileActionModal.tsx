import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VtolMetadata } from '../../types/project';
import { Icon } from './Icon';

export interface FileActionReviewValues {
  projectName: string;
  author: string;
  updatedAt: string;
}

interface Props {
  actionLabel: string;
  fileLabel: string;
  metadata: VtolMetadata;
  getFileName: (projectName: string) => string;
  onCancel: () => void;
  onConfirm: (values: FileActionReviewValues) => void;
}

function toLocalDateTimeValue(iso: string): string {
  const date = iso ? new Date(iso) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(safeDate.getDate())}T${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}`;
}

function fromLocalDateTimeValue(value: string): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function FileActionModal({
  actionLabel,
  fileLabel,
  metadata,
  getFileName,
  onCancel,
  onConfirm,
}: Props) {
  const [projectName, setProjectName] = useState(metadata.projectName);
  const [author, setAuthor] = useState(metadata.author);
  const [updatedAtLocal, setUpdatedAtLocal] = useState(toLocalDateTimeValue(metadata.updatedAt));

  useEffect(() => {
    setProjectName(metadata.projectName);
    setAuthor(metadata.author);
    setUpdatedAtLocal(toLocalDateTimeValue(metadata.updatedAt));
  }, [metadata.author, metadata.projectName, metadata.updatedAt]);

  const handleConfirm = () => {
    onConfirm({
      projectName: projectName.trim(),
      author: author.trim(),
      updatedAt: fromLocalDateTimeValue(updatedAtLocal),
    });
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleConfirm();
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleConfirm, onCancel]);

  const fileName = getFileName(projectName);

  return createPortal(
    <div className="file-review-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-label={`${actionLabel} review`}>
      <div className="file-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="file-review-header">
          <div>
            <div className="file-review-label">{actionLabel}</div>
            <h2 className="file-review-title">{fileLabel}</h2>
          </div>
          <button className="file-review-close" onClick={onCancel} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="file-review-body">
          <div className="file-review-grid">
            <div className="file-review-item">
              <label className="file-review-item-label" htmlFor="file-review-title">Title</label>
              <input
                id="file-review-title"
                className="file-review-input"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Untitled"
              />
            </div>
            <div className="file-review-item">
              <label className="file-review-item-label" htmlFor="file-review-author">Author</label>
              <input
                id="file-review-author"
                className="file-review-input"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author"
              />
            </div>
            <div className="file-review-item">
              <label className="file-review-item-label" htmlFor="file-review-date">Date</label>
              <input
                id="file-review-date"
                className="file-review-input"
                type="datetime-local"
                value={updatedAtLocal}
                onChange={(e) => setUpdatedAtLocal(e.target.value)}
              />
            </div>
            <div className="file-review-item">
              <span className="file-review-item-label">File</span>
              <strong className="file-review-file-name">{fileName}</strong>
            </div>
          </div>
          <p className="file-review-note">
            Edits here update the metadata used for this save or export, so you can make a final pass without leaving the prompt.
          </p>
        </div>

        <div className="file-review-actions">
          <button className="tour-btn tour-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="tour-btn tour-btn-primary" onClick={handleConfirm}>{actionLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
