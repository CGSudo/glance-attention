import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Video as VideoIcon, Play, Pause, Upload, Percent } from 'lucide-react';
import { getTransport, isMockMode, pngDataUrl } from '../api';
import { VideoResult, Aoi } from '../api/types';

export const Video: React.FC = () => {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const sampleAois: Aoi[] = useMemo(
    () => [
      { id: 'logo', name: 'Brand Logo', x: 5, y: 5, width: 20, height: 15, color: '#14b8a6' },
      { id: 'actor', name: 'Main Subject / Face', x: 35, y: 25, width: 30, height: 45, color: '#f59e0b' },
    ],
    []
  );

  const processVideoFile = useCallback(async (file: File | Blob) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const transport = getTransport();
      const res = await transport.analyzeVideo(file, sampleAois, (pct) => {
        setProgress(pct);
      });
      setVideoResult(res);
      setCurrentFrameIdx(0);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  }, [sampleAois]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      processVideoFile(file);
    }
  };

  // Generate synthetic sample video animation in canvas
  const loadSyntheticSample = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 360);
    // Draw moving subject
    ctx.fillStyle = '#14b8a6';
    ctx.beginPath();
    ctx.arc(320, 180, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 30, 140, 24);

    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    const dummyFile = new File([blob], 'sample-frame.png', { type: 'image/png' });
    setVideoSrc(canvas.toDataURL());
    await processVideoFile(dummyFile);
  }, [processVideoFile]);

  useEffect(() => {
    if (isMockMode()) loadSyntheticSample();
  }, [loadSyntheticSample]);

  // Playback timer
  useEffect(() => {
    if (isPlaying && videoResult && videoResult.frames.length > 0) {
      playTimerRef.current = window.setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= videoResult.frames.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / videoResult.fps);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, videoResult]);

  const currentFrame = videoResult?.frames[currentFrameIdx];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium mb-1">
            <VideoIcon className="h-3.5 w-3.5" />
            <span>Video Attention Modeling (5 FPS UNISAL)</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">Video Attention Over Time</h1>
          <p className="text-xs text-neutral-400">
            Samples frames at 5 fps to trace look order and measure attention in areas you marked over time.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSyntheticSample}
          className="min-h-[44px] rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 text-xs font-medium transition-colors"
        >
          Load Sample Video Sequence
        </button>
      </div>

      {/* Main Video & Attention Preview */}
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-4">
        <div className="relative aspect-16/9 w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
          {videoSrc ? (
            <div className="relative h-full w-full flex items-center justify-center">
              {/* If real video file, show video element */}
              {videoSrc.startsWith('blob:') ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="h-full w-full object-contain"
                  playsInline
                  muted
                />
              ) : (
                <img src={videoSrc} alt="Sample frame" className="h-full w-full object-contain" />
              )}

              {/* Heatmap Overlay for Current Frame */}
              {currentFrame && (
                <img
                src={pngDataUrl(currentFrame.heatmap_png_b64)}
                  alt={`Heatmap frame ${currentFrameIdx}`}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none opacity-70"
                />
              )}

              {/* Active Time Badge */}
              {currentFrame && (
                <div className="absolute top-3 left-3 rounded bg-black/70 px-2 py-1 text-[11px] font-mono text-teal-300 border border-neutral-800">
                  t = {currentFrame.t.toFixed(2)}s | Frame {currentFrameIdx + 1}/
                  {videoResult?.frames.length}
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:text-teal-400">
              <Upload className="h-10 w-10 text-neutral-600 mb-2" />
              <span className="text-sm font-semibold text-neutral-200">
                Upload MP4 / WebM video file
              </span>
              <span className="text-xs text-neutral-400 mt-1">
                Will be sampled at 5 FPS locally via HTML5 canvas
              </span>
              <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
            </label>
          )}

          {isProcessing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs text-center p-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mb-3" />
              <span className="text-sm font-semibold text-neutral-200">
                Sampling and inferring video saliency...
              </span>
              <div className="w-64 mt-3 bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-500 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-teal-400 mt-1">{progress}%</span>
            </div>
          )}
        </div>

        {/* Scrubber Bar and Controls */}
        {videoResult && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause video playback' : 'Play video playback'}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-500 transition-colors"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>

              {/* Scrubber Slider */}
              <input
                type="range"
                min={0}
                max={videoResult.frames.length - 1}
                value={currentFrameIdx}
                aria-label="Video frame timeline scrubber"
                onChange={(e) => {
                  setCurrentFrameIdx(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="flex-1 accent-teal-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
              />

              <span className="font-mono text-xs text-neutral-300 min-w-16 text-right">
                {currentFrame ? `${currentFrame.t.toFixed(2)}s` : '0.00s'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* AOI Share Line Chart Over Time (Pure Inline SVG - No Chart Lib!) */}
      {videoResult && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-teal-400" />
              <h3 className="font-semibold text-sm text-neutral-100">
                Attention on Areas You Marked Over Time
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {sampleAois.map((aoi) => (
                <div key={aoi.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: aoi.color }} />
                  <span className="text-neutral-300">{aoi.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-48 bg-neutral-950 rounded-lg p-3 relative border border-neutral-800/80">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 120"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#262626" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#262626" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#262626" strokeDasharray="3 3" />

              {/* Current time scrubber needle in chart */}
              {videoResult.frames.length > 1 && (
                <line
                  x1={(currentFrameIdx / (videoResult.frames.length - 1)) * 500}
                  y1="0"
                  x2={(currentFrameIdx / (videoResult.frames.length - 1)) * 500}
                  y2="120"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              )}

              {/* Lines for each AOI */}
              {sampleAois.map((aoi) => {
                const total = videoResult.frames.length;
                const points = videoResult.frames
                  .map((f, idx) => {
                    const x = (idx / (total - 1 || 1)) * 500;
                    const share = f.aoi_share.find((s) => s.id === aoi.id)?.share ?? 15;
                    // Max height 100% -> y=0, 0% -> y=110
                    const y = 110 - (share / 100) * 100;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');

                return (
                  <polyline
                    key={aoi.id}
                    fill="none"
                    stroke={aoi.color || '#14b8a6'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                );
              })}
            </svg>

            {/* Time labels below chart */}
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1">
              <span>0.0s</span>
              <span>
                {((videoResult.frames.length - 1) / videoResult.fps).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
