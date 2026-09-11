import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import Button from './Button.jsx';

/**
 * Real frontend file selection. We keep only metadata (name, size, type)
 * in state — no backend upload happens.
 */
export default function FileUpload({
  onFile,
  accept = '.pdf,.doc,.docx',
  file,
  onReplace,
  compact,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList) => {
    const f = fileList?.[0];
    if (!f) return;
    onFile({ name: f.name, size: f.size, type: f.type, uploadedAt: new Date().toISOString() });
  };

  if (file) {
    return (
      <div className="file-item">
        <span className="file-item__icon">
          <Icon name="FileText" size={18} />
        </span>
        <div className="grow">
          <div className="strong text-small">{file.name}</div>
          <div className="text-xs text-secondary">
            {file.size ? `${Math.round(file.size / 1024)} KB · ` : ''}Uploaded successfully
          </div>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => {
            if (onReplace) onReplace();
            inputRef.current?.click();
          }}
        >
          Replace
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <Button variant="secondary" size="sm" icon="Upload" onClick={() => inputRef.current?.click()}>
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </>
    );
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <div className="dropzone__icon">
        <Icon name="UploadCloud" size={28} />
      </div>
      <div className="strong">Drag &amp; drop your file here</div>
      <div className="text-small text-secondary">or</div>
      <div className="mt-2">
        <span className="btn btn--secondary btn--sm">Choose File</span>
      </div>
      <div className="text-xs text-secondary mt-2">Supported: PDF, DOC, DOCX</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
