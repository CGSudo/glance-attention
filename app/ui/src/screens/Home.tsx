import React from 'react';
import { Sparkles, ArrowRight, GitCompare, Video, Layers } from 'lucide-react';
import { ScreenId } from '../components/Layout';
import { DesignUploader } from '../components/DesignUploader';
import { TrustBadges } from '../components/TrustBadges';
import { StoredRecentImage } from '../utils/recentImages';
import { SampleType } from '../utils/samples';
import { isWeb } from '../api';

interface HomeProps {
  onSelectImage: (file: File) => void;
  onSelectSample: (type: SampleType) => void;
  onNavigate: (screen: ScreenId) => void;
  recentImages: StoredRecentImage[];
  onSelectRecent: (item: StoredRecentImage) => void;
  onDeleteRecent: (id: string) => void;
  onClearRecent: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onSelectImage,
  onSelectSample,
  onNavigate,
  recentImages,
  onSelectRecent,
  onDeleteRecent,
  onClearRecent,
}) => {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      {/* Summary First (ADHD Rule) */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-950/60 border border-teal-800/40 px-3 py-1 text-xs font-medium text-teal-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Peer-Reviewed Visual Attention Prediction</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100 sm:text-4xl">
          Where do people look in the first 3 seconds?
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Add a screenshot or try a sample to see what may catch attention first.
          Images stay on your device. Scores explain how they work and link to research.
        </p>
      </div>

      {/* Primary Action: Design Uploader with Drag & Drop, Browse, Clipboard, Samples, Recents */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
        <DesignUploader
          onSelectImage={onSelectImage}
          onSelectSample={onSelectSample}
          recentImages={recentImages}
          onSelectRecent={onSelectRecent}
          onDeleteRecent={onDeleteRecent}
          onClearRecent={onClearRecent}
          label="Use your own design"
          sublabel="Drag & drop, browse files, or paste from clipboard"
        />

        {/* Trust badges near drop zone (Req 4) */}
        <div className="pt-3 border-t border-neutral-800/80">
          <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Verified Research &amp; Privacy Protections
          </div>
          <TrustBadges />
        </div>
      </div>

      {/* Quick Launchers to Other Modes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
        <button
          type="button"
          onClick={() => onNavigate('compare')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <GitCompare className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Compare A/B</div>
              <div className="text-[11px] text-neutral-400">Test design variants side-by-side</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <button
          type="button"
          onClick={() => isWeb ? window.location.assign('https://cgsudo.github.io/glance-attention/download.html') : onNavigate('video')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Video className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Video Attention{isWeb && <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">Desktop app</span>}</div>
              <div className="text-[11px] text-neutral-400">{isWeb ? 'Analyze video in the desktop app' : 'Frame-by-frame 5fps sequence'}</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <button
          type="button"
          onClick={() => isWeb ? window.location.assign('https://cgsudo.github.io/glance-attention/download.html') : onNavigate('batch')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Batch Processing{isWeb && <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">Desktop app</span>}</div>
              <div className="text-[11px] text-neutral-400">{isWeb ? 'Process a folder in the desktop app' : 'Folder to CSV/PDF export'}</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </div>
    </div>
  );
};
