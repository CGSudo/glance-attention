import React, { useRef, useState, useEffect } from 'react';
import { Upload, Clipboard, Image as ImageIcon, Clock } from 'lucide-react';
import { StoredRecentImage } from '../utils/recentImages';
import { SAMPLES, SampleType } from '../utils/samples';

interface DesignUploaderProps {
  onSelectImage: (file: File) => void;
  onSelectSample?: (sampleType: SampleType) => void;
  recentImages?: StoredRecentImage[];
  onSelectRecent?: (item: StoredRecentImage) => void;
  onDeleteRecent?: (id: string) => void;
  onClearRecent?: () => void;
  compact?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const DesignUploader: React.FC<DesignUploaderProps> = ({
  onSelectImage,
  onSelectSample,
  recentImages = [],
  onSelectRecent,
  onDeleteRecent,
  onClearRecent,
  compact = false,
  label = 'Use your own design',
  sublabel = 'Drag & drop, browse files, or paste from clipboard',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onSelectImage(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectImage(e.target.files[0]);
    }
  };

  const handlePasteFromClipboard = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (!navigator.clipboard?.read) {
        setPasteNotice('Press Ctrl+V (⌘+V on Mac) to paste an image');
        setTimeout(() => setPasteNotice(null), 3000);
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard-${Date.now()}.png`, { type: imageType });
          onSelectImage(file);
          return;
        }
      }
      setPasteNotice('No image found in clipboard');
      setTimeout(() => setPasteNotice(null), 3000);
    } catch {
      setPasteNotice('Press Ctrl+V (⌘+V on Mac) to paste image');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  // Window paste listener when this uploader is active
  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const file = e.clipboardData.files[i];
          if (file.type.startsWith('image/')) {
            onSelectImage(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [onSelectImage]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
          compact ? 'p-4' : 'p-6'
        } ${
          isDragging
            ? 'border-teal-400 bg-teal-950/40 shadow-lg shadow-teal-950/20'
            : 'border-neutral-700/80 bg-neutral-900/60 hover:border-teal-600/70 hover:bg-neutral-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center rounded-full bg-neutral-800 text-teal-400 border border-neutral-700 ${
              compact ? 'h-8 w-8' : 'h-10 w-10'
            }`}
          >
            <Upload className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
          <div className="text-left">
            <h4 className={`font-semibold text-neutral-100 ${compact ? 'text-xs' : 'text-sm'}`}>
              {label}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {sublabel}
            </p>
          </div>
        </div>

        {/* Action Buttons: Browse + Paste */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Browse</span>
          </button>

          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          >
            <Clipboard className="h-3.5 w-3.5 text-teal-400" />
            <span>Paste clipboard</span>
          </button>
        </div>

        {pasteNotice && (
          <p role="status" className="mt-2 text-[11px] text-teal-300 font-medium">
            {pasteNotice}
          </p>
        )}
      </div>

      {/* Preset Samples Selector */}
      {onSelectSample && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-neutral-300">
              Or try a sample design:
            </span>
            <span className="text-[10px] text-teal-400 font-mono">1.5s laser scan test</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSelectSample(sample.id)}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-2 text-left hover:border-teal-700/60 hover:bg-neutral-900 transition-all group"
              >
                <img
                  src={sample.thumbnail}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded border border-neutral-700/80 object-cover bg-neutral-950 group-hover:scale-105 transition-transform"
                />
                <span className="text-xs font-medium text-neutral-200 leading-tight">
                  {sample.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Images Strip */}
      {recentImages.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
              <Clock className="h-3.5 w-3.5 text-neutral-400" />
              <span>Recent Images</span>
              <span className="font-mono text-[10px] text-neutral-400">({recentImages.length}/12)</span>
            </div>
            {onClearRecent && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all recent images from this device?')) {
                    onClearRecent();
                  }
                }}
                className="text-[11px] font-medium text-neutral-400 hover:text-red-400 transition-colors py-1 px-1.5"
                aria-label="Clear all recent images"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
            {recentImages.map((item) => (
              <div
                key={item.id}
                className="group relative flex-none rounded-lg border border-neutral-800 bg-neutral-900/80 p-1 hover:border-teal-700/60 hover:bg-neutral-800 transition-all cursor-pointer"
                onClick={() => onSelectRecent?.(item)}
              >
                <div className="relative h-12 w-16 overflow-hidden rounded bg-neutral-950 flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-neutral-600" />
                  )}
                  {/* Delete button per item - visible on touch, not hover-only */}
                  {onDeleteRecent && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRecent(item.id);
                      }}
                      className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-neutral-900/90 text-neutral-300 hover:bg-red-950 hover:text-red-200 border border-neutral-700 flex items-center justify-center shadow"
                    >
                      <span className="text-[9px] font-bold leading-none">✕</span>
                    </button>
                  )}
                </div>
                <div className="mt-1 w-16 truncate text-[10px] text-neutral-300 text-center">
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
