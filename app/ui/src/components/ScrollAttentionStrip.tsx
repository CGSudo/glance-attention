import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HelpCircle, Layers, ArrowDown } from 'lucide-react';
import { ViewportSliceMeta } from '../utils/fullPageAnalysis';

interface ScrollAttentionStripProps {
  slices: ViewportSliceMeta[];
  activeSliceIndex?: number;
  onSelectSlice?: (sliceIndex: number) => void;
  className?: string;
}

export const ScrollAttentionStrip: React.FC<ScrollAttentionStripProps> = ({
  slices,
  activeSliceIndex,
  onSelectSlice,
  className = '',
}) => {
  if (!slices || slices.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Scroll attention by viewport fold"
      className={`flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/90 p-3 text-xs space-y-2.5 ${className}`}
    >
      {/* Header with Title + Screenshot Guide */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
          <Layers className="h-3.5 w-3.5 text-teal-400" />
          <span>Scroll Attention</span>
          <span className="text-[10px] font-mono text-neutral-400">({slices.length} folds)</span>
        </div>

        {/* Screenshot Guide Popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="How to capture full-page screenshots"
              className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-400 rounded px-1"
            >
              <HelpCircle className="h-3 w-3" />
              <span>Guide</span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={6}
              align="end"
              className="z-50 w-72 rounded-lg border border-neutral-700 bg-neutral-900 p-3 shadow-xl text-xs text-neutral-200 outline-none space-y-2.5"
            >
              <div className="font-semibold text-neutral-100 flex items-center gap-1.5 border-b border-neutral-800 pb-1.5">
                <span>How to capture full-page screenshot</span>
              </div>
              <div className="space-y-2 text-[11px] text-neutral-300 leading-relaxed">
                <div>
                  <span className="font-semibold text-teal-300">1. Chrome DevTools (Native):</span>
                  <p className="text-neutral-400 mt-0.5">
                    Press <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px]">F12</kbd>, then <kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px]">Ctrl+Shift+P</kbd> (<kbd className="px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px]">⌘+Shift+P</kbd> on Mac). Type <span className="text-white font-mono">&quot;Capture full size screenshot&quot;</span> and press Enter.
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-teal-300">2. Glance Browser Extension:</span>
                  <p className="text-neutral-400 mt-0.5">
                    Click the Glance extension icon in your browser toolbar and click <span className="text-white">&quot;Capture full page&quot;</span>.
                  </p>
                </div>
              </div>
              <Popover.Arrow className="fill-neutral-700" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <p className="text-[11px] text-neutral-400 leading-tight">
        Slices tall pages into 16:10 viewports to measure attention drop-off as users scroll down:
      </p>

      {/* Slices Vertical Strip */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {slices.map((slice) => {
          const isActive = activeSliceIndex === slice.index;
          return (
            <button
              key={slice.index}
              type="button"
              onClick={() => onSelectSlice?.(slice.index)}
              className={`w-full text-left rounded p-1.5 border transition-all ${
                isActive
                  ? 'border-teal-500/80 bg-teal-950/40'
                  : 'border-neutral-800/80 bg-neutral-950/60 hover:bg-neutral-800/60 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-neutral-300">
                  Fold #{slice.index} {slice.index === 1 ? '(Above Fold)' : ''}
                </span>
                <span className="font-mono font-bold text-teal-400">
                  {slice.attentionPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, slice.attentionPercent * 2)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60">
        <span className="flex items-center gap-1">
          <ArrowDown className="h-3 w-3 text-neutral-400" />
          <span>Scroll drop-off</span>
        </span>
        <span className="font-mono">Top to bottom</span>
      </div>
    </div>
  );
};
