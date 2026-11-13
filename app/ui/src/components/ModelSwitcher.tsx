import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check, Cpu, AlertTriangle, ExternalLink } from 'lucide-react';
import { ModelInfo } from '../api/types';
import { isWeb } from '../api';

export const MODEL_STRENGTHS: Record<string, { strength: string; limit: string }> = {
  unisal: {
    strength: 'Fast and light. Good first check for any image.',
    limit: 'Small model (12 MB)',
  },
  transalnet: {
    strength: 'Sees the whole layout. Better on busy pages where context matters.',
    limit: 'Desktop app only (293 MB)',
  },
  sum: {
    strength: 'Tuned per content type: web pages, ads, e-commerce, photos.',
    limit: 'Desktop app only (222 MB)',
  },
};

interface ModelSwitcherProps {
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  className?: string;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  activeModelId,
  onSelectModel,
  className = '',
}) => {
  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  const browserDisabledModels = [
    {
      id: 'transalnet',
      name: 'TranSalNet Dense',
      size: '293 MB',
      license: 'MIT',
      strength: 'Sees the whole layout. Better on busy pages where context matters.',
    },
    {
      id: 'sum',
      name: 'SUM',
      size: '222 MB',
      license: 'MIT',
      strength: 'Tuned per content type: web pages, ads, e-commerce, photos.',
    },
  ];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Switch active attention prediction model"
          className={`flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 max-lg:py-3 text-xs font-medium text-neutral-200 hover:bg-neutral-700/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors shrink-0 ${className}`}
        >
          <Cpu className="h-3.5 w-3.5 text-teal-400 shrink-0" />
          <span className="font-semibold truncate">{activeModel?.name ?? 'UNISAL'}</span>
          {isWeb ? (
            <span className="rounded bg-teal-950/80 border border-teal-800/50 px-1.5 py-0.5 text-[10px] text-teal-300 font-mono shrink-0 whitespace-nowrap">
              Fast, 12 MB
            </span>
          ) : (
            <span className="text-[10px] text-neutral-400 font-mono shrink-0 whitespace-nowrap">
              {activeModel?.benchmark?.AUC ? `AUC ${activeModel.benchmark.AUC}` : ''}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl text-xs text-neutral-200 outline-none space-y-1"
          sideOffset={6}
          align="start"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 mb-1">
            Active Model Selection
          </div>

          {/* Available / Installed Models */}
          <div className="space-y-1">
            {models.map((model) => {
              const isSelected = model.id === activeModelId;
              const strength = MODEL_STRENGTHS[model.id]?.strength;
              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={!model.installed}
                  onClick={() => onSelectModel(model.id)}
                  className={`flex w-full items-start justify-between rounded-md p-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-teal-950/40 text-teal-200 border border-teal-800/40'
                      : model.installed
                      ? 'hover:bg-neutral-800 text-neutral-300'
                      : 'opacity-40 cursor-not-allowed text-neutral-500'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-neutral-100">{model.name}</span>
                      {model.id === 'unisal' && isWeb && (
                        <span className="rounded bg-teal-900/60 px-1.5 py-0.5 text-[10px] font-mono text-teal-300">
                          Fast, 12 MB
                        </span>
                      )}
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                        {model.license}
                      </span>
                    </div>
                    {strength && (
                      <p className="text-[11px] text-neutral-200 leading-snug">{strength}</p>
                    )}
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {model.benchmark?.AUC ? (
                        <span>AUC: {model.benchmark.AUC} | CC: {model.benchmark.CC}</span>
                      ) : (
                        <span>Not benchmarked</span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Browser Build: Listed but disabled heavy models */}
          {isWeb && (
            <div className="pt-2 border-t border-neutral-800 space-y-1.5">
              <div className="px-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Desktop Models (Unavailable in Browser)
              </div>
              {browserDisabledModels.map((bm) => (
                <div
                  key={bm.id}
                  className="rounded-md border border-neutral-800 bg-neutral-950/70 p-2 text-left"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="font-medium text-neutral-100">{bm.name}</span>
                      <span className="font-mono text-[10px] text-neutral-400">({bm.size})</span>
                    </div>
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                      {bm.license}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-100 font-medium leading-snug">{bm.strength}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Desktop app only (293 MB / 222 MB)</span>
                    <a
                      href="https://cgsudo.github.io/glance-attention/download.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-teal-400 hover:text-teal-300 underline font-medium"
                    >
                      <span>Download</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
