import React from 'react';
import { InstallProgress, ModelInfo } from '../api/types';

interface AccuracyCardProps {
  model: ModelInfo;
  isActive?: boolean;
  onSelect?: () => void;
  onInstall?: () => void;
  installProgress?: InstallProgress;
}

const HUMAN_CEILING_AUC = 0.934;
const HUMAN_CEILING_CC = 0.983;

export const AccuracyCard: React.FC<AccuracyCardProps> = ({
  model,
  isActive,
  onSelect,
  onInstall,
  installProgress,
}) => {
  const auc = model.benchmark?.AUC ?? null;
  const cc = model.benchmark?.CC ?? null;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isActive
          ? 'border-teal-500 bg-teal-950/20 shadow-sm'
          : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-neutral-100 text-sm">{model.name}</h3>
            {isActive && (
              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[11px] font-medium text-teal-400 border border-teal-500/20">
                Active
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                model.license.includes('MIT') || model.license.includes('Apache')
                  ? 'bg-neutral-800 text-neutral-300'
                  : 'bg-amber-900/40 text-amber-300 border border-amber-700/30'
              }`}
            >
              {model.license}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
            {model.citation || 'Scientific attention prediction model'}
          </p>
        </div>

        {model.installed ? (
          onSelect && (
            <button
              onClick={onSelect}
              disabled={isActive}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-neutral-400 cursor-default'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              }`}
            >
              {isActive ? 'In Use' : 'Use'}
            </button>
          )
        ) : (
          onInstall && (
            <button
              onClick={onInstall}
              disabled={!!installProgress}
              className="rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-500 transition-colors"
            >
              {installProgress ? 'Installing…' : 'Install'}
            </button>
          )
        )}
      </div>

      {installProgress && <div role="status" className="mb-3 text-xs text-teal-300">
        <span>{installProgress.total ? `${Math.min(100, Math.floor(installProgress.downloaded * 100 / installProgress.total))}% downloaded · Verifying before install` : 'Downloading and verifying model…'}</span>
        <progress aria-label={`${model.name} download`} value={installProgress.total ? installProgress.downloaded : undefined} max={installProgress.total || 1} className="mt-1 block w-full accent-teal-500" />
      </div>}

      <div className="space-y-3 pt-2 border-t border-neutral-800">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">AUC (Area Under ROC Curve)</span>
            <span className="font-mono text-neutral-200">
              {auc !== null ? `${auc.toFixed(3)} / ${HUMAN_CEILING_AUC}` : 'not benchmarked'}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden relative">
            {auc !== null ? (
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (auc / HUMAN_CEILING_AUC) * 100)}%` }}
              />
            ) : (
              <div className="h-full w-full bg-neutral-800" />
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-neutral-400">CC (Correlation Coefficient)</span>
            <span className="font-mono text-neutral-200">
              {cc !== null ? `${cc.toFixed(3)} / ${HUMAN_CEILING_CC}` : 'not benchmarked'}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden relative">
            {cc !== null ? (
              <div
                className="h-full bg-teal-600 rounded-full transition-all"
                style={{ width: `${Math.min(100, (cc / HUMAN_CEILING_CC) * 100)}%` }}
              />
            ) : (
              <div className="h-full w-full bg-neutral-800" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/60">
        <span>Benchmark: {model.benchmark?.dataset || 'N/A'}</span>
        <span>Human ceiling: AUC 0.934 | CC 0.983</span>
      </div>
    </div>
  );
};
