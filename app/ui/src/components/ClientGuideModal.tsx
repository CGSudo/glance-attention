import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sparkles, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';

interface ClientGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  {
    title: '1. Pick or drop your design',
    tip: 'Drop any screenshot, mockup, or social post. Glance works 100% on your device, so client work stays safe and private under NDA.',
  },
  {
    title: '2. Read the heatmap',
    tip: 'Warm yellow and red spots show where viewers look first in the first 3 seconds. Dark or fogged areas get little or no attention.',
  },
  {
    title: '3. Follow likely look order',
    tip: 'Numbered dots (1→7) show the predicted path of eye fixations. Check if visitors look at your value proposition before scrolling.',
  },
  {
    title: '4. Check a part',
    tip: 'Draw a box around your call-to-action button, headline, or logo to see its exact percentage share of visual attention.',
  },
  {
    title: '5. Compare variants & export report',
    tip: 'Use Compare to test design iteration A against B, then export a PDF report with clear numbers to share with clients.',
  },
];

export const ClientGuideModal: React.FC<ClientGuideModalProps> = ({ open, onOpenChange }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const handleClose = () => {
    try {
      localStorage.setItem('glance_client_guide_seen', 'true');
    } catch {
      // ignore storage error
    }
    onOpenChange(false);
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  const current = STEPS[stepIndex];

  return (
    <Dialog.Root open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-neutral-100 outline-none space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>1-Minute Client Guide</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close guide"
              className="rounded p-1 text-neutral-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <h3 className="text-base font-bold text-neutral-100">
              {current.title}
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5">
              {current.tip}
            </p>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((s) => s - 1)}
              className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-20 transition-colors min-h-[44px]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === stepIndex ? 'w-4 bg-teal-400' : 'w-1.5 bg-neutral-700'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-1.5 text-xs font-medium transition-colors min-h-[44px]"
            >
              <span>{stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}</span>
              {stepIndex === STEPS.length - 1 ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
