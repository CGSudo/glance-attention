import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check, Cpu, ExternalLink } from 'lucide-react';
import { ContentType, ModelInfo } from '../api/types';
import { isWeb } from '../api';

export const MODEL_STRENGTHS: Record<string, { strength: string; limit: string }> = {
  unisal: {
    strength: 'Fast and light. Good first check for any image.',
    limit: 'Small model (12 MB)',
  },
  transalnet: {
    strength: 'Sees the whole layout. Better on busy pages where context matters.',
    limit: 'Large model',
  },
  sum: {
    strength: 'Tuned per content type: web pages, ads, e-commerce, photos.',
    limit: 'Large model',
  },
};

interface ModelSwitcherProps {
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  contentType: ContentType;
  onChangeContentType: (value: ContentType) => void;
  className?: string;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  activeModelId,
  onSelectModel,
  contentType,
  onChangeContentType,
  className = '',
}) => {
  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Switch active attention prediction model"
          className={`flex min-w-0 items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 max-lg:py-3 text-xs font-medium text-neutral-200 hover:bg-neutral-700/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors ${className}`}
        >
          <Cpu className="h-3.5 w-3.5 text-teal-400 shrink-0" />
          <span className="font-semibold truncate">{activeModel?.name ?? 'UNISAL'}</span>
          {isWeb ? (
            <span className="rounded bg-teal-950/80 border border-teal-800/50 px-1.5 py-0.5 text-[10px] text-teal-300 font-mono shrink-0 whitespace-nowrap">
              {activeModel?.size_bytes ? `${Math.ceil(activeModel.size_bytes / 1_000_000)} MB` : ''}
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
          className="z-50 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl text-xs text-neutral-200 outline-none space-y-1"
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
                <Popover.Close key={model.id} asChild><button
                  type="button"
                  disabled={!isWeb && !model.installed}
                  onClick={() => {
                    if (isWeb && !model.installed) window.location.hash = 'models';
                    else onSelectModel(model.id);
                  }}
                  className={`flex w-full items-start justify-between rounded-md p-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-teal-950/40 text-teal-200 border border-teal-800/40'
                      : model.installed || isWeb
                      ? 'hover:bg-neutral-800 text-neutral-300'
                      : 'opacity-40 cursor-not-allowed text-neutral-500'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-neutral-100">{model.name}</span>
                      {model.id === 'unisal' && isWeb && (
                        <span className="rounded bg-teal-900/60 px-1.5 py-0.5 text-[10px] font-mono text-teal-300">
                          {Math.ceil((model.size_bytes ?? 0) / 1_000_000)} MB
                        </span>
                      )}
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                        {model.license}
                      </span>
                    </div>
                    {isWeb && model.id !== 'unisal' && <p className="text-[11px] text-teal-300">
                      {model.installed ? 'Stored in this browser' : `Download once (${Math.ceil((model.size_bytes ?? 0) / 1_000_000)} MB)`}
                    </p>}
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
                </button></Popover.Close>
              );
            })}
          </div>

          {!!(activeModel?.conditions?.length || activeModel?.condition) && <label className="block px-2 py-2 sm:hidden">
            Content type
            <select value={contentType} onChange={event => onChangeContentType(event.target.value as ContentType)} className="ml-2 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs">
              <option value="natural">Natural</option>
              <option value="ecommerce">E-commerce</option>
              <option value="ui">UI</option>
            </select>
          </label>}

          {isWeb && <a
            href="https://cgsudo.github.io/glance-attention/download.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 border-t border-neutral-800 px-2 py-2 text-teal-400 underline"
          >
            Faster desktop app with video and batch <ExternalLink className="h-3 w-3 shrink-0" />
          </a>}

        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
