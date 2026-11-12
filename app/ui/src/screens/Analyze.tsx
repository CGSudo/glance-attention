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
  FileText,
  FileCode,
  Image as ImageIcon,
  Flame,
  CloudFog,
  Crosshair,
  Percent,
} from 'lucide-react';
import { Aoi, AnalyzeResult } from '../api/types';
import { MetricsInfoPopover } from '../components/MetricsInfoPopover';
import { pngDataUrl } from '../api';
import { saveFile } from '../utils/saveFile';

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
}) => {
  // Layer states
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showGazeOrder, setShowGazeOrder] = useState(true);
  const [showFog, setShowFog] = useState(false);
  const [showUncertainty, setShowUncertainty] = useState(false);
  const [showSquint, setShowSquint] = useState(false);
  const [opacity, setOpacity] = useState(70);

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

  // Reset view on new image
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawingAoi) {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    } else {
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
    } else if (isPanning) {
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
          name: `AOI ${aois.length + 1}`,
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

  if (!imageSrc) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-neutral-400">
        <ImageIcon className="h-12 w-12 text-neutral-600 mb-3" />
        <h3 className="text-base font-semibold text-neutral-200">No image loaded for analysis</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          Return to the Home screen and drop an image or select a sample design to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col lg:flex-row overflow-hidden">
      {/* Center / Left: Interactive Canvas Area */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-neutral-950">
        {/* Canvas Toolbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-3 py-2 text-xs">
          {/* Layer toggles */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">
              Layers:
            </span>

            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                showHeatmap
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Heatmap</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGazeOrder(!showGazeOrder)}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                showGazeOrder
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Gaze Order</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFog(!showFog);
                if (!showFog) setShowUncertainty(false);
              }}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                showFog
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CloudFog className="h-3.5 w-3.5" />
              <span>Fog (P25)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowUncertainty(!showUncertainty);
                if (!showUncertainty) setShowFog(false);
              }}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
                showUncertainty
                  ? 'bg-teal-950 text-teal-300 border border-teal-800/60'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Uncertainty</span>
            </button>
          </div>

          {/* Opacity Slider */}
          {result?.squint_png_b64 && <div className="flex items-center">
            <button type="button" aria-pressed={showSquint} onClick={() => setShowSquint(!showSquint)} className={`rounded px-2 py-1 ${showSquint ? 'bg-teal-950 text-teal-300' : 'bg-neutral-800 text-neutral-300'}`}>Squint test</button>
            <MetricsInfoPopover badge="Visual check" title="Squint test" formula="Rec.709 luma → Gaussian blur (σ = 2% of width) → normalize" source="Painter’s value study; Rec.709 luma coefficients" explanation="The painter's value study: grayscale + blur shows where brightness contrast pulls the eye. It cannot see faces or text — compare with the model heatmap." />
          </div>}
          <div className="flex items-center gap-2 pl-2">
            <span className="text-neutral-400 text-[11px]">Opacity:</span>
            <div className="w-20">
              <Slider.Root
                value={[opacity]}
                onValueChange={(val) => setOpacity(val[0])}
                max={100}
                min={10}
                step={5}
                aria-label="Heatmap opacity"
                className="relative flex items-center select-none touch-none w-full h-4"
              >
                <Slider.Track className="bg-neutral-800 relative grow rounded-full h-1">
                  <Slider.Range className="absolute bg-teal-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow focus:outline-none focus:ring-1 focus:ring-teal-400" />
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
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                isDrawingAoi
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Square className="h-3.5 w-3.5" />
              <span>{isDrawingAoi ? 'Drawing AOI...' : '+ Draw AOI'}</span>
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
              aria-label="Zoom Out"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] text-neutral-400 min-w-8 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              aria-label="Zoom In"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              aria-label="Reset View"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-neutral-800 mx-1" />

            {/* Export Menu buttons */}
            <button
              type="button"
              onClick={handleExportPng}
              title="Export PNG overlay"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-teal-400"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              title="Export PDF Report"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-teal-400"
            >
              <FileText className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              title="Export Raw JSON"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-teal-400"
            >
              <FileCode className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Viewport canvas container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`relative flex flex-1 items-center justify-center overflow-hidden p-6 select-none ${
            isDrawingAoi ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {isLoading && (
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
              className="max-h-[75vh] max-w-[70vw] object-contain block pointer-events-none"
              draggable={false}
            />

            {/* Fog of attention Layer */}
            {result && showFog && (
              <img
                src={pngDataUrl(result.fog_png_b64)}
                alt="Fog of attention"
                style={{ opacity: opacity / 100 }}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                draggable={false}
              />
            )}

            {/* Heatmap Layer */}
            {result && showHeatmap && !showFog && (
              <img
                src={pngDataUrl(result.heatmap_png_b64)}
                alt="Attention Heatmap"
                style={{ opacity: opacity / 100 }}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                draggable={false}
              />
            )}

            {/* Uncertainty Map Layer */}
            {result && showUncertainty && result.metrics.agreement?.uncertainty_png_b64 && (
              <img
                src={pngDataUrl(result.metrics.agreement.uncertainty_png_b64)}
                alt="Uncertainty map"
                style={{ opacity: opacity / 100 }}
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                draggable={false}
              />
            )}

            {/* Scanpath Layer: Numbered dots 1-7 + connecting lines */}
            {result?.squint_png_b64 && showSquint && <img src={pngDataUrl(result.squint_png_b64)} alt="Squint test: blurred grayscale values" className="absolute inset-0 h-full w-full object-contain pointer-events-none" draggable={false} />}
            {result && showGazeOrder && (
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
                    />
                  );
                })}

                {/* Numbered Dots */}
                {result.scanpath.map((point) => (
                  <g key={`point-${point.order}`} transform={`translate(0, 0)`}>
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

            {/* AOI Overlays */}
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
                    className="absolute -top-5 left-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                  >
                    <span>{aoi.name}</span>
                    <span className="font-mono bg-black/40 px-1 rounded">{share}%</span>
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
      </div>

      {/* Right: Metrics Side Panel */}
      <div className="w-full lg:w-80 shrink-0 border-l border-neutral-800 bg-neutral-900/70 p-4 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <h3 className="font-semibold text-neutral-100 text-sm">Attention Metrics</h3>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800/40">
            {result?.model.toUpperCase() || 'SUM'}
          </span>
        </div>

        {/* 1. Clarity Score */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">Visual Clarity</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold text-teal-400">
                {result?.metrics.clarity.toFixed(1) ?? '--'}
              </span>
              <span className="text-xs text-neutral-400">/ 100</span>
              <MetricsInfoPopover
                title="Visual Clarity Score"
                formula="1 − H(heatmap)/log(N_pixels) on 64×64 downsample"
                source="Shannon entropy (1948) applied to spatial fixation distributions."
                explanation="Measures how focused the visual hierarchy is. High clarity (>65) means viewers quickly lock onto clear focal points. Low clarity means attention is scattered or diluted."
              />
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, result?.metrics.clarity ?? 0)}%` }}
            />
          </div>

          <p className="text-[11px] text-neutral-400 leading-snug">
            {result && result.metrics.clarity > 65
              ? 'Strong visual focal point with minimal clutter.'
              : result && result.metrics.clarity > 40
              ? 'Moderate focus distribution across multiple elements.'
              : 'Dispersed attention distribution across the scene.'}
          </p>
        </div>

        {/* 2. Areas of Interest (AOIs) */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs font-medium text-neutral-300">AOI Attention Share</span>
            </div>
            <MetricsInfoPopover
              title="AOI Share of Attention"
              formula="sum(heatmap[AOI]) / sum(heatmap) * 100%"
              source="Holmqvist et al. (2011). Eye Tracking: A comprehensive guide."
              explanation="Calculates the percentage of total fixation probability mass captured inside each user-drawn rectangle. Essential for measuring CTA buttons, hero headlines, and packaging logos."
            />
          </div>

          {aois.length === 0 ? (
            <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80 text-center">
              No AOIs defined yet. Click &quot;+ Draw AOI&quot; above to measure specific elements.
            </div>
          ) : (
            <div className="space-y-2">
              {aois.map((aoi) => {
                const share = result?.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
                // Check if any fixation falls inside
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
                          value={aoi.name}
                          onChange={(e) => handleRenameAoi(aoi.id, e.target.value)}
                          className="bg-transparent text-xs text-neutral-200 focus:outline-none focus:border-b border-teal-500 w-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAoi(aoi.id)}
                        className="text-neutral-400 hover:text-red-400 p-0.5 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Attention Share:</span>
                      <span className="font-mono font-semibold text-neutral-200">{share}%</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400">
                      <span>First Glance:</span>
                      <span className="font-mono text-teal-400">
                        {fix ? `Fixation #${fix.order}` : 'After 7th'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Scanpath Fixation Order */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-xs font-medium text-neutral-300">Scanpath (First 7 Fixations)</span>
            </div>
            <MetricsInfoPopover
              title="Scanpath Fixation Order"
              formula="Greedy peak picking with Inhibition-of-Return (IOR, sigma ≈ 4% width)"
              source="Itti & Koch (1998). Computational modeling of visual attention."
              explanation="Estimates the sequence of initial eye jumps (saccades). Peak attention is identified, followed by inhibitory suppression to predict subsequent fixation targets."
            />
          </div>

          <p className="text-[11px] text-neutral-400">
            Labeled: <span className="italic text-neutral-300">approximation (Itti & Koch 1998 IOR)</span>
          </p>

          <div className="grid grid-cols-4 gap-1 pt-1 font-mono text-[10px]">
            {result?.scanpath.map((p) => (
              <div
                key={p.order}
                className="rounded bg-neutral-950 p-1.5 text-center border border-neutral-800"
              >
                <div className="font-bold text-teal-400">#{p.order}</div>
                <div className="text-neutral-400 text-[9px]">{p.x.toFixed(0)}%,{p.y.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Model Agreement & Benchmarks */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300">Model Agreement</span>
            <MetricsInfoPopover
              title="Ensemble Agreement & Uncertainty"
              formula="CC(P, Q) = cov(P, Q) / (std(P) * std(Q))"
              source="Bylinskii et al. (2018), MIT Saliency Benchmark."
              explanation="Measures consistency across model predictions. Mean correlation coefficient represents agreement between architectural ensembles."
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Ensemble Mean CC</span>
            <span className="font-mono text-neutral-200">
              {result?.metrics.agreement?.mean_cc?.toFixed(3) ?? '—'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60">
            <span>Human Ceiling CC:</span>
            <span className="font-mono text-neutral-300">0.983</span>
          </div>
        </div>
      </div>
    </div>
  );
};
