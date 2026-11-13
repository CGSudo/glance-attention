import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface WalkthroughGuideProps {
  reducedMotion?: boolean;
}

interface WalkthroughStep {
  id: number;
  phase: 'open' | 'scan' | 'heatmap' | 'gaze' | 'clarity' | 'aoi';
  stepBadge: string;
  title: string;
  explanation: string;
  targetCallout: string;
}

const STEPS: WalkthroughStep[] = [
  {
    id: 1,
    phase: 'open',
    stepBadge: '1. Load Design',
    title: 'Image loaded in workspace',
    explanation: 'Glance loads your design directly in memory. Images stay private on your device without cloud uploads.',
    targetCallout: 'Canvas: Design loaded at 100% zoom',
  },
  {
    id: 2,
    phase: 'scan',
    stepBadge: '2. Laser Scan',
    title: 'Scanning visual contrast',
    explanation: 'The neural network scans edges, bright contrast, saturation, and layout structure in milliseconds.',
    targetCallout: 'Laser scan: Extracting low-level and high-level visual features',
  },
  {
    id: 3,
    phase: 'heatmap',
    stepBadge: '3. Heatmap',
    title: 'Predicted attention density',
    explanation: 'Warm, bright zones show where most people look first during the first 3 seconds of viewing.',
    targetCallout: 'Heatmap: Concentration on headline & primary CTA',
  },
  {
    id: 4,
    phase: 'gaze',
    stepBadge: '4. Look Order',
    title: 'Likely look order trajectory',
    explanation: 'Likely look order: numbers 1 to 5 estimate where viewers tend to look first, second, and third.',
    targetCallout: 'Look order: Gaze jump sequence across the layout',
  },
  {
    id: 5,
    phase: 'clarity',
    stepBadge: '5. Visual Clarity',
    title: 'Visual clarity score',
    explanation: 'Visual clarity: how focused attention is. Higher = people look at fewer things.',
    targetCallout: 'Result panel: Visual clarity score calculated from map entropy',
  },
  {
    id: 6,
    phase: 'aoi',
    stepBadge: '6. Check a Part',
    title: 'Measuring critical areas',
    explanation: 'Check a part: draws a box around your button or logo to see how much attention it gets.',
    targetCallout: 'Check a part: your button gets a small share of attention',
  },
];

export const WalkthroughGuide: React.FC<WalkthroughGuideProps> = ({ reducedMotion: appReducedMotion = false }) => {
  const [osReducedMotion, setOsReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reducedMotion = appReducedMotion || osReducedMotion;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(!reducedMotion);
  const timerRef = useRef<number | null>(null);

  const step = STEPS[currentStepIndex];

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOsReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setIsPlaying(false);
    }
  }, [reducedMotion]);

  useEffect(() => {
    if (!isPlaying || reducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 3200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, reducedMotion]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => (prev + 1) % STEPS.length);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => (prev - 1 + STEPS.length) % STEPS.length);
  };

  const handleReplay = () => {
    setCurrentStepIndex(0);
    if (!reducedMotion) setIsPlaying(true);
  };

  return (
    <div
      role="region"
      aria-label="How Glance judges a design interactive guide"
      className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 md:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Walkthrough</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100">How Glance Judges a Design</h2>
          <p className="text-xs text-neutral-400">
            Driven by real app components on a sample design. No recorded video.
          </p>
        </div>

        {/* Walkthrough Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {!reducedMotion && <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause walkthrough' : 'Play walkthrough'}
            className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 text-xs font-medium transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Play</span>
              </>
            )}
          </button>}

          <button
            type="button"
            onClick={handleReplay}
            aria-label="Replay walkthrough from beginning"
            className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-2 text-xs font-medium transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Replay</span>
          </button>

          <div className="flex items-center border-l border-neutral-700 pl-1.5 ml-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous step"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next step"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Walkthrough Simulation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Canvas Simulation (8 cols) */}
        <div className="lg:col-span-8 relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden min-h-[280px] sm:min-h-[320px] flex items-center justify-center">
          {/* Base Mock Layout (ApexFlow Hero) */}
          <div className="relative w-full max-w-[500px] aspect-[16/10] bg-[#070b14] rounded-lg border border-neutral-800 p-4 flex flex-col justify-between select-none shadow-2xl">
            {/* Nav */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-teal-500" />
                <span className="text-xs font-bold text-white tracking-wide">ApexFlow</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-neutral-400">
                <span>Features</span>
                <span>Pricing</span>
                <span className="rounded bg-teal-900/60 text-teal-300 px-1.5 py-0.5">Sign in</span>
              </div>
            </div>

            {/* Hero Content */}
            <div className="grid grid-cols-2 gap-3 items-center py-2">
              <div className="space-y-2">
                <span className="inline-block text-[9px] uppercase font-mono tracking-wider text-teal-400">Next-gen analytics</span>
                <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                  Clarity for your web workflows
                </h3>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  See where attention flows before shipping.
                </p>
                <div className="pt-1">
                  <div className={`inline-flex items-center justify-center rounded px-3 py-1.5 text-xs font-bold transition-all ${
                    step.phase === 'aoi'
                      ? 'bg-teal-500 text-neutral-950 ring-4 ring-teal-400/80 ring-offset-2 ring-offset-neutral-900 scale-105 shadow-lg'
                      : 'bg-teal-500 text-neutral-950 shadow-md'
                  }`}>
                    Start Free Trial
                  </div>
                </div>
              </div>

              {/* Graphic Chart */}
              <div className="rounded border border-neutral-800 bg-neutral-900/60 p-2 space-y-1.5">
                <div className="flex justify-between text-[9px] text-neutral-400 font-mono">
                  <span>Attention Flow</span>
                </div>
                <div className="h-14 flex items-end gap-1 pt-2">
                  <div className="w-1/5 h-40% bg-teal-800/60 rounded-t" />
                  <div className="w-1/5 h-65% bg-teal-700/60 rounded-t" />
                  <div className="w-1/5 h-50% bg-teal-600/70 rounded-t" />
                  <div className="w-1/5 h-85% bg-teal-500/80 rounded-t" />
                  <div className="w-1/5 h-100% bg-teal-400 rounded-t" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-[9px] text-neutral-500 flex justify-end border-t border-neutral-800/60 pt-1.5">
              <span>100% On-device</span>
            </div>

            {/* Step 2: Laser Scan Effect */}
            {step.phase === 'scan' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-300 to-transparent shadow-[0_0_15px_#2dd4bf] animate-[bounce_2s_infinite]" />
                <div className="absolute inset-0 bg-teal-500/10 backdrop-blur-[0.5px]" />
              </div>
            )}

            {/* Step 3+: Heatmap Layer */}
            {(step.phase === 'heatmap' || step.phase === 'gaze' || step.phase === 'clarity' || step.phase === 'aoi') && (
              <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden animate-heatmap-fade">
                {/* Hotspot 1: Headline */}
                <div className="absolute left-[20%] top-[38%] -translate-x-1/2 -translate-y-1/2 w-28 h-20 rounded-full bg-gradient-to-r from-red-500/70 via-amber-400/60 to-transparent blur-md" />
                {/* Hotspot 2: Primary Button */}
                <div className="absolute left-[26%] top-[65%] -translate-x-1/2 -translate-y-1/2 w-24 h-16 rounded-full bg-gradient-to-r from-red-600/80 via-yellow-400/70 to-transparent blur-sm" />
                {/* Hotspot 3: Graphic Chart */}
                <div className="absolute left-[78%] top-[50%] -translate-x-1/2 -translate-y-1/2 w-24 h-20 rounded-full bg-gradient-to-r from-amber-500/50 via-teal-400/40 to-transparent blur-md" />
              </div>
            )}

            {/* Step 4+: Likely Look Order Numbers + Path */}
            {(step.phase === 'gaze' || step.phase === 'clarity' || step.phase === 'aoi') && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                <line x1="20%" y1="38%" x2="26%" y2="65%" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="26%" y1="65%" x2="78%" y2="50%" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
                {/* Point 1 */}
                <g className="animate-gaze-pop">
                  <circle cx="20%" cy="38%" r="11" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                  <text x="20%" y="38%" dy="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">1</text>
                </g>
                {/* Point 2 */}
                <g className="animate-gaze-pop" style={{ animationDelay: '120ms' }}>
                  <circle cx="26%" cy="65%" r="11" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                  <text x="26%" y="65%" dy="4" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="bold">2</text>
                </g>
                {/* Point 3 */}
                <g className="animate-gaze-pop" style={{ animationDelay: '240ms' }}>
                  <circle cx="78%" cy="50%" r="11" fill="#14b8a6" stroke="#ffffff" strokeWidth="2" />
                  <text x="78%" y="50%" dy="4" textAnchor="middle" fill="#000000" fontSize="11" fontWeight="bold">3</text>
                </g>
              </svg>
            )}

            {/* Step 6: Marked Area Bounding Box */}
            {step.phase === 'aoi' && (
              <div className="absolute left-[13%] top-[56%] w-[27%] h-[20%] border-2 border-teal-400 bg-teal-400/20 rounded pointer-events-none z-30 flex items-start justify-end p-1">
                <span className="bg-teal-500 text-neutral-950 font-bold text-[9px] px-1 rounded shadow">
                  CTA Button (example)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Step Explanation & Highlight Card (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-teal-950 border border-teal-800/60 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                {step.stepBadge}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Step {currentStepIndex + 1} of {STEPS.length}
              </span>
            </div>

            <h3 className="text-base font-bold text-neutral-100 leading-snug">
              {step.title}
            </h3>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {step.explanation}
            </p>

            {/* Active Result Highlights */}
            <div className={`mt-3 rounded-lg border p-3 transition-all ${
              step.phase === 'clarity'
                ? 'border-teal-400 bg-teal-950/50 shadow-md ring-2 ring-teal-500/40'
                : step.phase === 'aoi'
                ? 'border-teal-400 bg-teal-950/50 shadow-md ring-2 ring-teal-500/40'
                : 'border-neutral-800 bg-neutral-900/60'
            }`}>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-teal-400" />
                <span>Active Metric Output</span>
              </div>

              {step.phase === 'clarity' ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-teal-300">Visual Clarity</span>
                    <span className="font-mono text-white text-sm">74 / 100 (example)</span>
                  </div>
                  <p className="text-[11px] text-teal-200/90 leading-snug">
                    Attention is tightly focused on your core value proposition and call to action.
                  </p>
                </div>
              ) : step.phase === 'aoi' ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-teal-300">Marked Part: &quot;Start Free Trial&quot;</span>
                    <span className="font-mono text-white text-sm">example</span>
                  </div>
                  <p className="text-[11px] text-teal-200/90 leading-snug">
                    Shows the share of predicted attention that lands inside this button area.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-neutral-300 leading-snug">
                  {step.targetCallout}
                </div>
              )}
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 pt-3 border-t border-neutral-800/80">
            {STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStepIndex(idx);
                }}
                aria-label={`Jump to ${s.title}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex ? 'w-6 bg-teal-400' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
