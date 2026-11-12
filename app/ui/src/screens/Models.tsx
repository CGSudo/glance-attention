import React from 'react';
import { Box, Upload, ShieldCheck, Info } from 'lucide-react';
import { InstallProgress, ModelInfo } from '../api/types';
import { AccuracyCard } from '../components/AccuracyCard';
import { isWeb } from '../api';

interface ModelsProps {
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  onInstallModel: (id: string) => void;
  onImportModel?: () => void;
  installing: Record<string, InstallProgress>;
  error: string | null;
}

export const Models: React.FC<ModelsProps> = ({
  models,
  activeModelId,
  onSelectModel,
  onInstallModel,
  onImportModel,
  installing,
  error,
}) => {

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium mb-1">
            <Box className="h-3.5 w-3.5" />
            <span>Saliency Model Catalog & Benchmarks</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">Attention Prediction Models</h1>
          <p className="text-xs text-neutral-400">
            Open-source and redistributable ONNX models. Evaluated on the MIT300 benchmark against human ceiling.
          </p>
        </div>

        {/* Bring Your Own Model Button */}
        {onImportModel && <div>
          <button type="button" onClick={onImportModel} className="inline-flex items-center gap-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors border border-neutral-700">
            <Upload className="h-3.5 w-3.5 text-teal-400" />
            <span>Import .onnx model</span>
          </button>
        </div>}
      </div>

      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      {isWeb && <a className="inline-block rounded bg-teal-600 px-4 py-3 text-sm text-white" href="https://cgsudo.github.io/glance-attention/download.html">Get the desktop app for SUM, TranSalNet, video, batch</a>}

      {/* Licensing & Honesty Banner */}
      <div className="rounded-lg bg-neutral-900/60 border border-neutral-800 p-4 text-xs text-neutral-300 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-neutral-100">Redistribution & License Policy</span>
          <p className="text-neutral-400 leading-relaxed">
            Glance only bundles and downloads assets under permissive open-source licenses (MIT, Apache-2.0).
            Academic models without redistribution rights (e.g. EyeFormer, DeepGaze IIE) require bringing your own
            exported ONNX checkpoint.
          </p>
        </div>
      </div>

      {/* Models Grid with Accuracy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model) => (
          <AccuracyCard
            key={model.id}
            model={model}
            isActive={model.id === activeModelId}
            onSelect={() => onSelectModel(model.id)}
            onInstall={() => onInstallModel(model.id)}
            installProgress={installing[model.id]}
          />
        ))}
      </div>

      {/* Human Benchmark Reference Info Box */}
      <div className="rounded-lg bg-neutral-900/40 border border-neutral-800 p-4 text-xs text-neutral-400 space-y-2">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold">
          <Info className="h-4 w-4 text-teal-400" />
          <span>About Human Ceiling Baselines (MIT300)</span>
        </div>
        <p className="leading-relaxed">
          The human ceiling represents the consistency between split halves of real human eye-tracking subject pools.
          On MIT300, human consistency reaches an AUC of <strong>0.934</strong> and Correlation Coefficient (CC) of <strong>0.983</strong>.
          Glance models operate within 88-94% of this physical human ceiling without requiring cameras or gaze tracking hardware.
        </p>
      </div>
    </div>
  );
};
