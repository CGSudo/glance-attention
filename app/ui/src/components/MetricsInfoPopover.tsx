import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

interface MetricsInfoPopoverProps {
  title: string;
  formula: string;
  source: string;
  explanation: string;
}

export const MetricsInfoPopover: React.FC<MetricsInfoPopoverProps> = ({
  title,
  formula,
  source,
  explanation,
}) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Formula and research source for ${title}`}
          className="inline-flex items-center justify-center rounded p-1 text-neutral-400 hover:text-teal-400 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-xl text-xs text-neutral-200 outline-none animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={5}
        >
          <div className="space-y-2.5">
            <h4 className="font-semibold text-neutral-100 text-sm border-b border-neutral-800 pb-1.5 flex items-center justify-between">
              <span>{title}</span>
              <span className="text-[10px] font-mono text-teal-400 bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">
                Verified Metric
              </span>
            </h4>

            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Formula
              </span>
              <code className="block rounded bg-neutral-950 p-2 font-mono text-[11px] text-teal-300 break-words border border-neutral-800">
                {formula}
              </code>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                How it works
              </span>
              <p className="text-neutral-300 leading-relaxed">{explanation}</p>
            </div>

            <div className="border-t border-neutral-800 pt-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-0.5">
                Scientific Source
              </span>
              <p className="text-neutral-400 text-[11px] italic leading-tight">{source}</p>
            </div>
          </div>
          <Popover.Arrow className="fill-neutral-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
