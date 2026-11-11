import React, { useState, useRef, useEffect } from 'react';
import { Layers, Upload, Download, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getTransport, isMockMode } from '../api';
import { AnalyzeResult, ContentType } from '../api/types';
import { saveFile } from '../utils/saveFile';

interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: AnalyzeResult;
  thumbnail?: string;
  error?: string;
}

interface BatchProps {
  activeModelId: string;
  contentType: ContentType;
}

export const Batch: React.FC<BatchProps> = ({ activeModelId, contentType }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMockMode()) return;
    const initSamples = async () => {
      const createBatchSample = (name: string, color: string): Promise<BatchItem> => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(200, 150, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, 30, 120, 16);
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            const f = new File([blob!], name, { type: 'image/png' });
            resolve({
              id: `sample-${name}`,
              file: f,
              name,
              size: 24000,
              status: 'pending',
              thumbnail: canvas.toDataURL(),
            });
          });
        });
      };

      const [s1, s2, s3] = await Promise.all([
        createBatchSample('landing-hero.png', '#14b8a6'),
        createBatchSample('pricing-card.png', '#f59e0b'),
        createBatchSample('checkout-modal.png', '#38bdf8'),
      ]);

      setItems([s1, s2, s3]);

      // Process samples
      const transport = getTransport();
      const r1 = await transport.analyze(s1.file, activeModelId, [], contentType);
      const r2 = await transport.analyze(s2.file, activeModelId, [], contentType);
      const r3 = await transport.analyze(s3.file, activeModelId, [], contentType);

      setItems([
        { ...s1, status: 'done', result: r1 },
        { ...s2, status: 'done', result: r2 },
        { ...s3, status: 'done', result: r3 },
      ]);
    };

    initSamples();
  }, [activeModelId, contentType]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: BatchItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `batch-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        thumbnail: URL.createObjectURL(file),
      }));

    setItems((prev) => [...prev, ...newItems]);
  };

  const runBatchProcessing = async () => {
    if (items.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const transport = getTransport();

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'done') continue;

      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item))
      );

      try {
        const res = await transport.analyze(items[i].file, activeModelId, [], contentType);
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'done', result: res } : item
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Processing error',
                }
              : item
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const exportCsv = async () => {
    const completed = items.filter((i) => i.status === 'done' && i.result);
    if (completed.length === 0) return;

    const headers = [
      'Filename',
      'Model',
      'Width',
      'Height',
      'ClarityScore',
      'Scanpath_1st_X',
      'Scanpath_1st_Y',
      'ProcessedAt',
    ];
    const rows = completed.map((item) => {
      const res = item.result!;
      const firstFix = res.scanpath[0] || { x: 0, y: 0 };
      return [
        `"${item.name}"`,
        `"${res.model}"`,
        res.width,
        res.height,
        res.metrics.clarity.toFixed(1),
        firstFix.x.toFixed(1),
        firstFix.y.toFixed(1),
        `"${new Date().toISOString()}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    await saveFile(`glance-batch-results-${Date.now()}.csv`, blob);
  };

  const exportPdfReport = async () => {
    const completed = items.filter((i) => i.status === 'done' && i.result);
    if (completed.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 118, 110);
    doc.text('Glance — Batch Attention Analysis Report', 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} | Model: ${activeModelId.toUpperCase()}`, 20, 28);

    let y = 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Filename', 20, y);
    doc.text('Dimensions', 100, y);
    doc.text('Clarity Score', 150, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    completed.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.name.substring(0, 35), 20, y);
      doc.text(`${item.result?.width}x${item.result?.height}`, 100, y);
      doc.text(`${item.result?.metrics.clarity.toFixed(1)} / 100`, 150, y);
      y += 8;
    });

    await saveFile(`glance-batch-summary-${Date.now()}.pdf`, doc.output('blob'));
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium mb-1">
            <Layers className="h-3.5 w-3.5" />
            <span>High-Throughput Batch Processing</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">Batch Image Processing</h1>
          <p className="text-xs text-neutral-400">
            Process entire folders of design screens or e-commerce products. Export aggregated clarity metrics to CSV or PDF.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors border border-neutral-700 flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Select Files</span>
          </button>

          <button
            type="button"
            disabled={items.length === 0 || isProcessing}
            onClick={runBatchProcessing}
            className="rounded-md bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors"
          >
            {isProcessing ? 'Processing Batch...' : 'Run All'}
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Upload className="h-10 w-10 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-semibold text-neutral-300">No batch items selected</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Select multiple files or screenshots to queue them for automated attention scoring.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            <div className="bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span className="w-1/2">File & Dimensions</span>
              <span className="w-1/4 text-center">Status</span>
              <span className="w-1/4 text-right">Clarity Score</span>
            </div>

            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between text-xs hover:bg-neutral-900/40">
                <div className="flex items-center gap-3 w-1/2">
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="h-10 w-10 rounded object-cover border border-neutral-800 bg-neutral-950 shrink-0"
                  />
                  <div className="truncate">
                    <div className="font-medium text-neutral-200 truncate">{item.name}</div>
                    <div className="text-[10px] text-neutral-400">
                      {(item.size / 1024).toFixed(0)} KB {item.result ? `• ${item.result.width}×${item.result.height}px` : ''}
                    </div>
                  </div>
                </div>

                <div className="w-1/4 flex items-center justify-center">
                  {item.status === 'done' && (
                    <span className="inline-flex items-center gap-1 rounded bg-teal-950/60 text-teal-400 border border-teal-800/40 px-2 py-0.5 text-[11px]">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Complete</span>
                    </span>
                  )}
                  {item.status === 'processing' && (
                    <span className="inline-flex items-center gap-1 text-teal-400 text-[11px]">
                      <div className="h-3 w-3 animate-spin rounded-full border border-teal-400 border-t-transparent" />
                      <span>Inferring...</span>
                    </span>
                  )}
                  {item.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-neutral-400 text-[11px]">
                      <Clock className="h-3 w-3" />
                      <span>Queued</span>
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-red-400 text-[11px]">
                      <AlertCircle className="h-3 w-3" />
                      <span>Failed</span>
                    </span>
                  )}
                </div>

                <div className="w-1/4 text-right font-mono font-semibold text-neutral-200">
                  {item.result ? `${item.result.metrics.clarity.toFixed(1)} / 100` : '--'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export Options */}
      {items.some((i) => i.status === 'done') && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3.5 py-2 text-xs font-medium border border-neutral-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-teal-400" />
            <span>Export to CSV</span>
          </button>

          <button
            type="button"
            onClick={exportPdfReport}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3.5 py-2 text-xs font-medium border border-neutral-700 transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-teal-400" />
            <span>Export Summary PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
