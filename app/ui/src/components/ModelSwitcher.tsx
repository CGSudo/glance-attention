import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check, Cpu } from 'lucide-react';
import { ModelInfo } from '../api/types';

interface ModelSwitcherProps {
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({
  models,
  activeModelId,
  onSelectModel,
}) => {
  const activeModel = models.find((m) => m.id === activeModelId) || models[0];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Switch active attention prediction model"
          className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/80 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
        >
          <Cpu className="h-3.5 w-3.5 text-teal-400" />
          <span className="font-semibold">{activeModel?.name ?? 'Model'}</span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {activeModel?.benchmark?.AUC ? `AUC ${activeModel.benchmark.AUC}` : ''}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl text-xs text-neutral-200 outline-none"
          sideOffset={6}
          align="start"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 mb-1">
            Active Model Selection
          </div>
          <div className="space-y-1">
            {models.map((model) => {
              const isSelected = model.id === activeModelId;
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
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs">{model.name}</span>
                      <span className="rounded bg-neutral-800 px-1 py-0.2 text-[10px] text-neutral-400">
                        {model.license}
                      </span>
                      {!model.installed && (
                        <span className="text-[10px] text-amber-500 font-medium">Uninstalled</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400">
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
