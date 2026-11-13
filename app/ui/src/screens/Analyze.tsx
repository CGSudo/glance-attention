import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import {
  Layers,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Trash2,
  Download,
  Flame,
  CloudFog,
  Crosshair,
  Percent,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { Aoi, AnalyzeResult, ModelInfo } from '../api/types';
import { ScreenId } from '../components/Layout';
import { MetricsInfoPopover } from '../components/MetricsInfoPopover';
import { TrustBadges } from '../components/TrustBadges';
import { LaserScanOverlay } from '../components/LaserScanOverlay';
import { DesignUploader, useDesignUpload } from '../components/DesignUploader';
import { ScrollAttentionStrip } from '../components/ScrollAttentionStrip';
import { FullPageAnalysisResult } from '../utils/fullPageAnalysis';
import { StoredRecentImage } from '../utils/recentImages';
import { SampleType } from '../utils/samples';
import { pngDataUrl } from '../api';
import { saveFile } from '../utils/saveFile';
import { buildAnalyzeSummary, getPositionLabel } from '../utils/analyzeSummary';
import { HeatmapImage } from '../components/HeatmapImage';
import { ColorRampType } from '../utils/colorRamps';

interface AnalyzeProps {
  imageFile: File | null;
  imageSrc: string;
  result: AnalyzeResult | null;
  isLoading: boolean;
  loadingText?: string;
  error: string | null;
  aois: Aoi[];
  onUpdateAois: (aois: Aoi[]) => void;
  onReanalyze: (aois: Aoi[]) => void;
  // Model picker in Analyze header
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  // Uploader and samples
  onSelectImage: (file: File) => void;
  onSelectSample: (type: SampleType) => void;
  // Recent images
  recentImages: StoredRecentImage[];
  onSelectRecent: (item: StoredRecentImage) => void;
  onDeleteRecent: (id: string) => void;
  onClearRecent: () => void;
  // Laser scan
  isScanning: boolean;
  reducedMotion: boolean;
  colorRamp: ColorRampType;
  // Navigation & Reset (Brief A-3)
  onRemoveImage?: () => void;
  onNavigate?: (screen: ScreenId) => void;
  showHintBar?: boolean;
  onDismissHint?: () => void;
  showClientGuideCard?: boolean;
  onOpenClientGuide?: () => void;
  onDismissClientGuideCard?: () => void;
}

export const Analyze: React.FC<AnalyzeProps> = ({
  imageFile: _imageFile,
  imageSrc,
  result,
  isLoading,
  loadingText,
  error,
  aois,
  onUpdateAois,
  onReanalyze,
  onSelectImage,
  onSelectSample,
  recentImages,
  onSelectRecent,
  onDeleteRecent,
  onClearRecent,
  isScanning,
  reducedMotion,
  colorRamp,
  onRemoveImage,
  onNavigate,
  showHintBar,
  onDismissHint,
  showClientGuideCard,
  onOpenClientGuide,
  onDismissClientGuideCard,
}) => {
  // Layer states
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGazeOrder, setShowGazeOrder] = useState(true);
  const [showFog, setShowFog] = useState(false);
  const [showUncertainty, setShowUncertainty] = useState(false);
  const [showSquint, setShowSquint] = useState(false);
  const [opacity, setOpacity] = useState(70);

  // Uploader panel docked beside canvas
  const [showUploader, setShowUploader] = useState(true);

  // Hidden file input for "New image"
  const { fileInputRef: hiddenFileInputRef, isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileChange } = useDesignUpload(onSelectImage);

  // Full-page active fold state
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | undefined>(undefined);

  // Zoom and Pan states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // AOI drawing state
  const [isDrawingAoi, setIsDrawingAoi] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Clarity count-up animation
  const [displayClarity, setDisplayClarity] = useState<number | null>(null);

  useEffect(() => {
    if (!result) {
      setDisplayClarity(null);
      return;
    }
    const target = result.metrics.clarity;
    if (reducedMotion) {
      setDisplayClarity(target);
      return;
    }
    let startTimestamp: number | null = null;
    const duration = 400;
    let animId: number;

    const step = (now: number) => {
      if (!startTimestamp) startTimestamp = now;
      const progress = Math.min((now - startTimestamp) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayClarity(parseFloat((target * eased).toFixed(1)));
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [result, reducedMotion]);

  const fullPageResult = (result && 'isFullPage' in result && result.isFullPage)
    ? (result as FullPageAnalysisResult)
    : null;

  // Reset view on new image
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActiveSliceIndex(undefined);
    setIsDrawingAoi(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [imageSrc]);

  // Handle pan - only when zoomed in (Brief A-3 item 9)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingAoi) {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    } else if (zoom > 1.05) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingAoi && drawStart && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setDrawCurrent({ x, y });
    } else if (isPanning && zoom > 1.05) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = useCallback(() => {
    if (isDrawingAoi && drawStart && drawCurrent) {
      const minX = Math.min(drawStart.x, drawCurrent.x);
      const minY = Math.min(drawStart.y, drawCurrent.y);
      const width = Math.abs(drawCurrent.x - drawStart.x);
      const height = Math.abs(drawCurrent.y - drawStart.y);

      // Only add if minimum size > 2%
      if (width > 2 && height > 2) {
        const newAoi: Aoi = {
          id: `aoi-${Date.now()}`,
          name: `Part ${aois.length + 1}`,
          x: Math.round(minX * 10) / 10,
          y: Math.round(minY * 10) / 10,
          width: Math.round(width * 10) / 10,
          height: Math.round(height * 10) / 10,
          color: ['#14b8a6', '#f59e0b', '#38bdf8', '#a855f7', '#ec4899'][
            aois.length % 5
          ],
        };
        const updated = [...aois, newAoi];
        onUpdateAois(updated);
        onReanalyze(updated);
        setSelectedAoiId(newAoi.id);
      }
      setDrawStart(null);
      setDrawCurrent(null);
      setIsDrawingAoi(false);
    }
    setIsPanning(false);
  }, [isDrawingAoi, drawStart, drawCurrent, aois, onUpdateAois, onReanalyze]);

  // Touch handlers for panning when zoomed in
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1.05 && e.touches.length >= 2) {
      setIsPanning(true);
      panStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && zoom > 1.05 && e.touches.length >= 2) {
      setPan({
        x: e.touches[0].clientX - panStartRef.current.x,
        y: e.touches[0].clientY - panStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const handleDeleteAoi = (id: string) => {
    const updated = aois.filter((a) => a.id !== id);
    onUpdateAois(updated);
    onReanalyze(updated);
    if (selectedAoiId === id) setSelectedAoiId(null);
  };

  const handleRenameAoi = (id: string, name: string) => {
    const updated = aois.map((a) => (a.id === id ? { ...a, name } : a));
    onUpdateAois(updated);
  };

  // Jump to full-page slice
  const handleSelectSlice = (sliceIndex: number) => {
    if (!fullPageResult) return;
    setActiveSliceIndex(sliceIndex);
    const targetSlice = fullPageResult.slices.find((s) => s.index === sliceIndex);
    if (targetSlice && imageRef.current && zoom > 1.05) {
      const totalH = fullPageResult.originalHeight;
      const targetRatio = targetSlice.y / totalH;
      const renderedH = imageRef.current.clientHeight || 600;
      setPan({ x: 0, y: -(targetRatio * renderedH * zoom) + (renderedH * 0.2) });
    }
  };

  // Export handlers
  const handleExportPng = async () => {
    if (!result) return;
    const data = pngDataUrl(showSquint && result.squint_png_b64 ? result.squint_png_b64 : showFog ? result.fog_png_b64 : result.overlay_png_b64).split(',')[1];
    const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
    await saveFile(`glance-attention-${Date.now()}.png`, new Blob([bytes], { type: 'image/png' }));
  };

  const handleExportJson = async () => {
    if (!result) return;
    const data = {
      model: result.model,
      width: result.width,
      height: result.height,
      metrics: result.metrics,
      scanpath: result.scanpath,
      aois,
      isFullPage: fullPageResult ? true : false,
      slices: fullPageResult?.slices,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    await saveFile(`glance-analysis-${Date.now()}.json`, blob);
  };

  const handleExportPdf = async () => {
    if (!result || !imageSrc) return;
    const { exportAnalysisPdf } = await import('../utils/exportPdf');
    await exportAnalysisPdf(result, imageSrc, aois);
  };

  return (
    <div className="flex min-h-full w-full flex-col lg:flex-row lg:h-full lg:overflow-hidden">
      {/* Recents and samples follow results below 1024px. */}
        <div className={`${showUploader ? '' : 'lg:hidden'} order-last lg:order-none w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-r border-neutral-800 bg-neutral-900/85 p-3.5 overflow-y-auto space-y-3 z-10 shadow-xl`}>
          <div className="hidden lg:flex items-center justify-end pb-2 border-b border-neutral-800">
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="flex items-center gap-0.5 text-neutral-400 hover:text-neutral-200 text-xs px-1 py-1 rounded hover:bg-neutral-800"
              aria-label="Hide"
              title="Hide design input panel"
              aria-expanded={showUploader}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Hide
            </button>
          </div>

          <DesignUploader
            compact
            libraryOnly
            onSelectImage={onSelectImage}
            onSelectSample={onSelectSample}
            recentImages={recentImages}
            onSelectRecent={onSelectRecent}
            onDeleteRecent={onDeleteRecent}
            onClearRecent={onClearRecent}
          />

          <div className="pt-2 border-t border-neutral-800/80">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Trust and privacy
            </div>
            <TrustBadges />
          </div>
        </div>

      {/* Center: Interactive Canvas Area */}
      <div className="relative w-full flex flex-col bg-neutral-950 lg:flex-1 lg:overflow-hidden lg:min-h-0 lg:min-w-0">
        {/* Mobile Compact Uploader Bar (< 1024px) */}
        <div className="lg:hidden shrink-0 border-b border-neutral-800 bg-neutral-900/95 px-3 py-0.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => hiddenFileInputRef.current?.click()}
            aria-label="Select new image"
            className="flex items-center gap-1 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors min-h-[44px]"
          >
            <Upload className="h-3.5 w-3.5 text-teal-400" />
            <span>New image</span>
          </button>

        </div>
        {/* Dismissible Hint Bar above Canvas (Desktop >= 1024px) */}
        {showHintBar && (
          <div className="hidden lg:flex items-center justify-between bg-teal-950/90 border-b border-teal-800/70 px-4 py-2.5 text-xs text-teal-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-teal-300">Quick tip:</span>
              <span>Pick a sample or add your design. Results stay on your device.</span>
            </div>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Dismiss hint"
              className="shrink-0 rounded text-teal-300 hover:text-white p-1 ml-4 text-xs font-bold"
            >
              Got it
            </button>
          </div>
        )}

        {/* Dismissible Guided Tutorial Prompt (Desktop >= 1024px) */}
        {showClientGuideCard && (
          <div className="hidden lg:flex items-center justify-between bg-neutral-900 border-b border-neutral-800 px-4 py-2 text-xs text-neutral-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-teal-400 font-bold">✨ Using Glance for clients?</span>
              <span className="hidden sm:inline">See the 1-minute guide to get the most from reports.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenClientGuide}
                className="rounded bg-teal-700 hover:bg-teal-800 text-white px-2.5 py-1 text-xs font-medium transition-colors"
              >
                See the 1-minute guide
              </button>
              <button
                type="button"
                onClick={onDismissClientGuideCard}
                aria-label="Dismiss client guide suggestion"
                className="shrink-0 rounded text-neutral-400 hover:text-white p-1 text-xs font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Canvas Toolbar (Desktop >= 1024px) */}
        <div className="hidden lg:flex items-center justify-between shrink-0 overflow-x-auto whitespace-nowrap border-b border-neutral-800 bg-neutral-900/90 px-2 py-1 text-xs gap-1 [&>div]:shrink-0">
          {/* Image selection and layers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => hiddenFileInputRef.current?.click()}
              aria-label="Select new image"
              className="flex h-7 items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-teal-400" />
              <span>New image</span>
            </button>
            <input
              ref={hiddenFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(event) => { event.currentTarget.value = ''; }}
              onChange={handleFileChange}
            />

            {!showUploader && (
              <button
                type="button"
                onClick={() => setShowUploader(true)}
                className="flex h-7 w-7 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors"
                aria-label="Show design input panel"
                title="Show design input panel"
                aria-expanded={showUploader}
              >
                <Upload className="h-3.5 w-3.5 text-teal-400" />
              </button>
            )}

            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              disabled={!result}
              title="Heatmap: warm spots show where viewers look first"
              aria-label="Toggle Heatmap"
              aria-pressed={showHeatmap}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                showHeatmap
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60 font-medium'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowGazeOrder(!showGazeOrder)}
              disabled={!result}
              title="Likely look order: numbered sequence of first eye jumps"
              aria-label="Toggle Likely Look Order"
              aria-pressed={showGazeOrder}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                showGazeOrder
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60 font-medium'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFog(!showFog);
                if (!showFog) setShowUncertainty(false);
              }}
              title="Hide low attention: dims areas receiving little or no glances"
              disabled={!result}
              aria-label="Toggle Hide Low Attention"
              aria-pressed={showFog}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                showFog
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60 font-medium'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CloudFog className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUncertainty(!showUncertainty);
                if (!showUncertainty) setShowFog(false);
              }}
              title="Model confidence: highlights where prediction is confident vs ambiguous"
              disabled={!result}
              aria-label="Toggle Model Confidence"
              aria-pressed={showUncertainty}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                showUncertainty
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60 font-medium'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Opacity Slider */}
          {result?.squint_png_b64 && (
            <div className="flex items-center">
              <button
                type="button"
                aria-pressed={showSquint}
                onClick={() => setShowSquint(!showSquint)}
                title="Squint test: grayscale blur reveals basic brightness contrast"
                aria-label="Toggle Squint Test"
                className={`flex h-7 w-7 items-center justify-center rounded ${
                  showSquint ? 'bg-teal-950 text-teal-300 font-medium' : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5 blur-[0.5px]" />
              </button>
              <MetricsInfoPopover
                badge="Visual check"
                title="Squint test"
                formula="Rec.709 luma → Gaussian blur (σ = 2% of width) → normalize"
                source="Painter’s value study; Rec.709 luma coefficients"
                explanation="The painter's value study: grayscale + blur shows where brightness contrast pulls the eye. It cannot see faces or text — compare with the model heatmap."
              />
            </div>
          )}

          <div className="flex items-center gap-1">
            <span className="text-neutral-400 text-[11px]">Opacity:</span>
            <div className="w-12">
              <Slider.Root
                value={[opacity]}
                onValueChange={(val) => setOpacity(val[0])}
                disabled={!result}
                max={100}
                min={10}
                step={5}
                aria-label="Heatmap opacity"
                className="relative flex items-center select-none touch-none w-full h-4"
              >
                <Slider.Track className="bg-neutral-800 relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-teal-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-3.5 h-3.5 bg-white rounded-full shadow focus:outline-none focus:ring-1 focus:ring-teal-400" />
              </Slider.Root>
            </div>
            <span className="w-7 text-right font-mono text-[11px] text-neutral-300">
              {opacity}%
            </span>
          </div>

          {/* Drawing & Navigation controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsDrawingAoi(!isDrawingAoi)}
              disabled={!result}
              title="Draw a box around your button or logo to see how much attention it gets"
              aria-label="Check a part"
              aria-pressed={isDrawingAoi}
              className={`flex h-7 w-7 items-center justify-center rounded font-medium transition-colors ${
                isDrawingAoi
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              disabled={!imageSrc}
              aria-label="Zoom Out"
              title="Zoom Out"
              className="rounded h-7 w-7 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] text-neutral-400 min-w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              disabled={!imageSrc}
              aria-label="Zoom In"
              title="Zoom In"
              className="rounded h-7 w-7 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setActiveSliceIndex(undefined);
              }}
              aria-label="Reset View to 100%"
              disabled={!imageSrc}
              title="Reset View"
              className="rounded h-7 w-7 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            {/* Export buttons with visible text */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!result}
              title="Download PDF attention report"
              aria-label="Download report"
              className="flex h-7 items-center gap-1 rounded bg-teal-700 hover:bg-teal-800 text-white px-2 py-1 text-xs font-medium transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download report</span>
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              disabled={!result}
              title="Download PNG overlay image"
              aria-label="Download PNG image"
              className="flex h-7 items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-xs font-medium transition-colors"
            >
              <span>PNG</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={!result}
              title="Download JSON analysis data"
              aria-label="Download JSON data"
              className="flex h-7 items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 text-xs font-medium transition-colors"
            >
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Viewport canvas container with optional Scroll Attention Strip for Full-Page mode */}
        <div className="relative w-full flex lg:flex-1 overflow-hidden lg:min-h-0 lg:[container-type:size]">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: zoom > 1.05 ? 'none' : 'pan-y' }}
            className={`relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 lg:p-6 select-none ${
              isDrawingAoi
                ? 'cursor-crosshair'
                : isPanning
                ? 'cursor-grabbing'
                : zoom > 1.05
                ? 'cursor-grab'
                : 'cursor-default'
            }`}
          >
            {isLoading && !isScanning && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                <p className="mt-3 text-xs font-medium text-teal-300">
                  {loadingText || 'Running saliency inference...'}
                </p>
              </div>
            )}

            {error && (
              <div className="absolute top-4 left-4 z-30 rounded bg-red-950/80 border border-red-800 p-3 text-xs text-red-200">
                Error during analysis: {error}
              </div>
            )}

            {!imageSrc ? (
              <div
                role="button"
                tabIndex={0}
                aria-label="Choose image"
                onClick={() => hiddenFileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    hiddenFileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-64 w-full self-stretch flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${isDragging ? 'border-teal-400 bg-teal-950/40' : 'border-neutral-700/80 bg-neutral-900/60'}`}
              >
                <Upload className="h-8 w-8 text-teal-400 mb-3" aria-hidden="true" />
                <p className="text-sm font-semibold text-neutral-100">Choose image</p>
                <p className="mt-1 text-xs text-neutral-400">Drop image here or paste (Ctrl+V)</p>
              </div>
            ) : (
            /* Pin removal to the image at 100% and the canvas while zoomed. */
            <div className={zoom === 1 ? 'relative min-w-0 max-h-full' : 'contents'}>
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onClick={() => onRemoveImage?.()}
                aria-label="Remove image"
                title="Remove image"
                className="absolute right-2 top-2 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900/95 text-sm text-white shadow hover:bg-red-950 hover:border-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:content-['']"
              >
                <span aria-hidden="true">✕</span>
              </button>
              {/* Scalable Image Canvas Frame */}
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                }}
                className="relative shadow-2xl rounded-sm overflow-hidden"
              >
                {/* Base Image */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Analyzed subject"
                  className="max-h-[60vh] lg:max-h-[calc(100cqh-3rem)] w-auto max-w-full object-contain block"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />

                {/* Laser Grid Scan Overlay (Req 1) */}
                <LaserScanOverlay isScanning={isScanning} reducedMotion={reducedMotion} />

                {/* Fog of attention Layer - fades in after scan completes */}
                {result && !isScanning && showFog && (
                  <img
                    src={pngDataUrl(result.fog_png_b64)}
                    alt="Hide low attention"
                    style={{ opacity: opacity / 100 }}
                    className={`absolute inset-0 h-full w-full object-contain ${
                      reducedMotion ? '' : 'animate-result-fade'
                    }`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}

                {/* Heatmap Layer - fades in ~400ms after scan completes */}
                {result && !isScanning && showHeatmap && !showFog && (
                  <HeatmapImage
                    png={result.heatmap_png_b64}
                    colorRamp={colorRamp}
                    alt="Attention Heatmap"
                    style={{ opacity: opacity / 100, '--heatmap-opacity': opacity / 100 } as React.CSSProperties}
                    className={`absolute inset-0 h-full w-full object-contain ${
                      reducedMotion ? '' : 'animate-heatmap-fade'
                    }`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}

                {/* Uncertainty Map Layer */}
                {result && !isScanning && showUncertainty && result.metrics.agreement?.uncertainty_png_b64 && (
                  <img
                    src={pngDataUrl(result.metrics.agreement.uncertainty_png_b64)}
                    alt="Model confidence map"
                    style={{ opacity: opacity / 100 }}
                    className={`absolute inset-0 h-full w-full object-contain ${
                      reducedMotion ? '' : 'animate-result-fade'
                    }`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}

                {/* Squint Test Layer */}
                {result?.squint_png_b64 && !isScanning && showSquint && (
                  <img
                    src={pngDataUrl(result.squint_png_b64)}
                    alt="Squint test: blurred grayscale values"
                    className={`absolute inset-0 h-full w-full object-contain ${
                      reducedMotion ? '' : 'animate-result-fade'
                    }`}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                )}

                {/* Scanpath Layer: Numbered dots 1-7 + connecting lines */}
                {result && !isScanning && showGazeOrder && (
                  <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    {/* Connecting lines */}
                    {result.scanpath.map((point, idx) => {
                      if (idx === 0) return null;
                      const prev = result.scanpath[idx - 1];
                      return (
                        <line
                          key={`line-${idx}`}
                          x1={`${prev.x}%`}
                          y1={`${prev.y}%`}
                          x2={`${point.x}%`}
                          y2={`${point.y}%`}
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          strokeOpacity="0.85"
                          className={reducedMotion ? '' : 'animate-line-reveal'}
                          style={reducedMotion ? undefined : { animationDelay: `${250 + (idx - 1) * 120}ms` }}
                        />
                      );
                    })}

                    {/* Numbered Dots */}
                    {result.scanpath.map((point, idx) => (
                      <g
                        key={`point-${point.order}`}
                        className={reducedMotion ? '' : 'animate-gaze-pop'}
                        style={reducedMotion ? undefined : {
                          animationDelay: `${250 + idx * 120}ms`,
                          transformOrigin: `${point.x}% ${point.y}%`,
                        }}
                      >
                        <circle
                          cx={`${point.x}%`}
                          cy={`${point.y}%`}
                          r="12"
                          fill={point.order === 1 ? '#0d9488' : '#1e293b'}
                          stroke="#f59e0b"
                          strokeWidth="2"
                        />
                        <text
                          x={`${point.x}%`}
                          y={`${point.y}%`}
                          textAnchor="middle"
                          dy="4"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {point.order}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}

                {/* Marked Areas Overlays */}
                {aois.map((aoi) => {
                  const isSelected = aoi.id === selectedAoiId;
                  const share = result?.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
                  return (
                    <div
                      key={aoi.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAoiId(aoi.id);
                      }}
                      style={{
                        left: `${aoi.x}%`,
                        top: `${aoi.y}%`,
                        width: `${aoi.width}%`,
                        height: `${aoi.height}%`,
                        borderColor: aoi.color || '#14b8a6',
                      }}
                      className={`absolute border-2 bg-teal-500/10 cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-white ring-offset-1 shadow-lg' : ''
                      }`}
                    >
                      <div
                        style={{ backgroundColor: aoi.color || '#14b8a6' }}
                        className="absolute -top-5 left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-neutral-950 shadow"
                      >
                        <span>{aoi.name}</span>
                        <span className="font-mono bg-white/20 px-1 rounded">{share.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}

                {/* In-progress drawing rectangle */}
                {isDrawingAoi && drawStart && drawCurrent && (
                  <div
                    style={{
                      left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                      top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                      width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                      height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                    }}
                    className="absolute border-2 border-dashed border-amber-400 bg-amber-500/20 pointer-events-none"
                  />
                )}
              </div>
            </div>
            )}
          </div>

        </div>
          {imageSrc && (
            <div role="group" aria-label="Image controls" className="lg:hidden flex items-center gap-2 border-t border-neutral-800 bg-neutral-900 px-3 py-1 text-xs">
              <button
                type="button"
                onClick={() => setShowHeatmap(!showHeatmap)}
                disabled={!result}
                aria-pressed={showHeatmap}
                className={`min-h-[44px] min-w-[44px] rounded px-2 ${showHeatmap ? 'bg-teal-950 text-teal-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => setShowGazeOrder(!showGazeOrder)}
                disabled={!result}
                aria-pressed={showGazeOrder}
                className={`min-h-[44px] min-w-[44px] rounded px-2 ${showGazeOrder ? 'bg-teal-950 text-teal-300' : 'bg-neutral-800 text-neutral-400'}`}
              >
                Look order
              </button>
              <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-neutral-300">
                Opacity
                <input type="range" aria-label="Heatmap opacity" min={10} max={100} step={5} value={opacity} disabled={!result} onChange={event => setOpacity(Number(event.target.value))} className="h-11 min-w-[44px] w-full accent-teal-500" />
              </label>
            </div>
          )}
      </div>

      {/* Right: Metrics Side Panel */}
      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-900/70 p-4 lg:overflow-y-auto space-y-4">
        {!result && <p className="text-xs text-neutral-400">Results appear after you add an image.</p>}

        {/* What to look at line + Next Actions (Brief A-3 Item 4) */}
        {result && (
          <div className="rounded-xl border border-teal-800/60 bg-teal-950/30 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>What to look at first</span>
            </div>
            <p className="text-xs text-neutral-200 leading-relaxed">{buildAnalyzeSummary(result, aois)}</p>
            <div className="pt-2 border-t border-teal-800/40 flex flex-wrap gap-1.5 text-xs">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('compare')}
                  className="rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2 py-1 max-lg:py-3.5 font-medium transition-colors"
                >
                  Compare two designs
                </button>
              )}
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('learn')}
                  className="rounded bg-neutral-800 hover:bg-neutral-700 text-teal-300 px-2 py-1 max-lg:py-3.5 font-medium transition-colors"
                >
                  How Glance judges a design
                </button>
              )}
              <button
                type="button"
                onClick={handleExportPdf}
                className="rounded bg-teal-700 hover:bg-teal-800 text-white px-2 py-1 max-lg:py-3.5 font-medium transition-colors ml-auto"
              >
                Download report
              </button>
            </div>
          </div>
        )}

        {result && <>
        <div className="hidden lg:flex items-center justify-between border-b border-neutral-800 pb-2">
          <h3 className="font-semibold text-neutral-100 text-sm">Attention Metrics</h3>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800/40">
            {result.model.toUpperCase()}
          </span>
        </div>

        {/* Full page fold mode banner */}
        {fullPageResult && (
          <div className="rounded-lg border border-teal-800/60 bg-teal-950/30 p-2.5 text-xs text-teal-300 flex items-center justify-between">
            <div>
              <div className="font-semibold">Full-Page Viewport Mode</div>
              <div className="text-[10px] text-teal-400/80">Sliced into {fullPageResult.slices.length} × 16:10 viewports</div>
            </div>
            <span className="font-mono text-xs bg-teal-900/80 px-1.5 py-0.5 rounded">16:10</span>
          </div>
        )}

        {/* Full-Page Scroll Attention Strip */}
        {fullPageResult && (
          <ScrollAttentionStrip
            slices={fullPageResult.slices}
            activeSliceIndex={activeSliceIndex}
            onSelectSlice={handleSelectSlice}
          />
        )}

        {/* 1. Clarity Score */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-neutral-300 block">Visual Clarity</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold text-teal-400">
                {displayClarity !== null ? displayClarity.toFixed(1) : (result?.metrics.clarity.toFixed(1) ?? '--')}
              </span>
              <MetricsInfoPopover
                title="Visual Clarity Score"
                formula="1 − H(heatmap)/log(N_pixels) on 64×64 downsample"
                source="Shannon entropy (1948) applied to spatial fixation distributions."
                explanation="How focused attention is. Higher score means viewers quickly lock onto clear focal points rather than wandering across clutter."
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            Higher means eyes settle on fewer places.
          </p>
        </div>

        {/* 2. Marked Areas (Check a part) */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-teal-400" />
              <div>
                <span className="text-xs font-medium text-neutral-300 block">Areas you marked</span>
                <span className="text-[10px] text-neutral-400">Attention captured by your boxes</span>
              </div>
            </div>
            <MetricsInfoPopover
              title="Marked Areas (AOI) Attention Share"
              formula="sum(heatmap[AOI]) / sum(heatmap) * 100%"
              source="Holmqvist et al. (2011). Eye Tracking: A comprehensive guide."
              explanation="Calculates the percentage of visual attention inside each marked box. Ideal for measuring buttons, headlines, and logos."
            />
          </div>

          {aois.length === 0 ? (
            <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80 text-center">
              No parts marked yet. Click &quot;+ Check a part&quot; above to measure a button or logo.
            </div>
          ) : (
            <div className="space-y-2">
              {aois.map((aoi) => {
                const share = result?.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
                const fix = result?.scanpath.find(
                  (p) =>
                    p.x >= aoi.x &&
                    p.x <= aoi.x + aoi.width &&
                    p.y >= aoi.y &&
                    p.y <= aoi.y + aoi.height
                );
                return (
                  <div
                    key={aoi.id}
                    className="rounded bg-neutral-950/80 p-2 border border-neutral-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: aoi.color }}
                        />
                        <input
                          type="text"
                          aria-label="Area name"
                          value={aoi.name}
                          onChange={(e) => handleRenameAoi(aoi.id, e.target.value)}
                          className="bg-transparent text-xs text-neutral-200 focus:outline-none focus:border-b border-teal-500 w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAoi(aoi.id)}
                        aria-label={`Delete area ${aoi.name}`}
                        className="text-neutral-400 hover:text-red-400 p-4 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Attention Share:</span>
                      <span className="font-mono font-semibold text-neutral-200">{share.toFixed(1)}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>First Glance:</span>
                      <span className="font-mono text-teal-400">
                        {fix ? `Look ${fix.order}` : 'After 7th'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Likely Look Order */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-teal-400" />
              <div>
                <span className="text-xs font-medium text-neutral-300 block">Likely look order</span>
                <span className="text-[10px] text-neutral-400">First 7 stops people make</span>
              </div>
            </div>
            <MetricsInfoPopover
              title="Likely Look Order"
              formula="Greedy peak picking with Inhibition-of-Return (IOR, sigma ≈ 4% width)"
              source="Itti & Koch (1998). Computational modeling of visual attention."
              explanation="Estimates the sequence of initial eye jumps in the first 3 seconds. The eye hits peak attention first, then jumps to secondary highlights."
            />
          </div>

          <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[10px]">
            {result?.scanpath.map((p) => (
              <div
                key={p.order}
                className="rounded bg-neutral-950 p-1.5 text-center border border-neutral-800"
              >
                <div className="font-bold text-teal-400">Look {p.order}</div>
                <div className="text-neutral-400 text-[9px]">{getPositionLabel(p)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Advanced (for researchers) - Collapsed by default (Brief A-3 Item 2) */}
        <details className="group rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <summary className="cursor-pointer text-xs font-medium text-neutral-400 hover:text-neutral-200 flex items-center justify-between select-none">
            <span>Advanced (for researchers)</span>
            <ChevronDown className="h-3.5 w-3.5 text-neutral-500 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="pt-2.5 border-t border-neutral-800/60 space-y-2 text-xs">
            <div className="flex items-center justify-between text-neutral-400">
              <span>Ensemble Mean CC:</span>
              <span className="font-mono text-neutral-200">
                {result?.metrics.agreement?.mean_cc?.toFixed(3) ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Human Ceiling CC:</span>
              <span className="font-mono text-neutral-300">0.983</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/40">
              <span>Benchmark (MIT300):</span>
              <a
                href="https://saliency.tuebingen.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline"
              >
                saliency.tuebingen.ai
              </a>
            </div>
          </div>
        </details>

        </>}
      </div>
    </div>
  );
};
