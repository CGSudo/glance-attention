import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Eye, Layers, BookOpen, X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ open, onOpenChange }) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: 'Welcome to Glance',
      badge: 'Step 1 of 3: Core Premise',
      icon: Eye,
      description:
        'Glance predicts where human crowds look during the first ~3 seconds of free viewing. It runs completely offline on your device, with zero cloud dependency and strict privacy.',
      highlights: [
        'Predicts initial bottom-up visual attention',
        'Operates 100% locally on your machine',
        'Immediate visual feedback without eye-tracking hardware',
      ],
    },
    {
      title: 'Layers & Areas of Interest',
      badge: 'Step 2 of 3: Analysis Tools',
      icon: Layers,
      description:
        'Analyze any interface, graphic, or video. Inspect the attention distribution with rich layer overlays and quantifiable AOIs.',
      highlights: [
        'Heatmap: Continuous probability of fixation',
        'Gaze Order: First 7 fixations with Inhibition-of-Return (IOR)',
        'Fog: Highlights what gets ignored by viewers',
        'AOI Rectangles: Measure exact percentage of visual attention share',
      ],
    },
    {
      title: 'Honest, Peer-Reviewed Science',
      badge: 'Step 3 of 3: Verification',
      icon: BookOpen,
      description:
        'No pseudoscientific "memory" or "emotion" scores. Every metric shows its explicit mathematical formula and peer-reviewed benchmark source against human ceilings.',
      highlights: [
        'Clarity: Shannon entropy on fixation distribution',
        'Benchmark comparisons against MIT300 human ceiling',
        'Raw AUC & CC metrics without inflated marketing scores',
      ],
    },
  ];

  const current = steps[step - 1];
  const IconComponent = current.icon;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onOpenChange(false);
      localStorage.setItem('glance_onboarding_completed', 'true');
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    localStorage.setItem('glance_onboarding_completed', 'true');
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <span className="text-xs font-medium text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
              {current.badge}
            </span>
            <button
              onClick={handleSkip}
              className="rounded p-1 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              aria-label="Skip onboarding"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="py-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-950 border border-teal-700/50 text-teal-400">
                <IconComponent className="h-5 w-5" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-neutral-100">
                {current.title}
              </Dialog.Title>
            </div>

            <Dialog.Description className="text-sm text-neutral-300 leading-relaxed">
              {current.description}
            </Dialog.Description>

            <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-2">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stepper dots & action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? 'w-6 bg-teal-500' : 'w-1.5 bg-neutral-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                {step === 3 ? (
                  <>
                    <span>Get Started</span>
                    <Check className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
