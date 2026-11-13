import React, { useState } from 'react';
import { GraduationCap, ArrowRight, ArrowLeft, AlertTriangle, ExternalLink, BookOpen, ShieldCheck } from 'lucide-react';
import { WalkthroughGuide } from '../components/WalkthroughGuide';

export const Learn: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const [activeStep, setActiveStep] = useState(1);

  const RESEARCH_PAPERS = [
    {
      id: 'unisal',
      title: 'Unified Image and Video Saliency Modeling (UNISAL)',
      authors: 'Richard Droste, Jianbo Jiao, J. Alison Noble',
      institution: 'University of Oxford',
      venue: 'ECCV 2020',
      year: 2020,
      link: 'https://arxiv.org/abs/2003.05477',
      license: 'Apache-2.0',
      description: 'Unified lightweight image and video saliency prediction with domain-specific subnets.',
    },
    {
      id: 'transalnet',
      title: 'TranSalNet: Towards perceptually relevant visual saliency prediction',
      authors: 'Lou et al.',
      institution: 'Cardiff University',
      venue: 'Neurocomputing 2022',
      year: 2022,
      link: 'https://doi.org/10.1016/j.neucom.2022.04.080',
      license: 'MIT',
      description: 'Combines multi-scale CNN features with transformer attention to capture global visual context.',
    },
    {
      id: 'sum',
      title: 'SUM: Saliency Unification through Mamba for Visual Attention Modeling',
      authors: 'Alireza Hosseini, Amirhossein Kazerouni, Saeed Akhavan, Michael Brudno, Babak Taati',
      institution: 'University of Tehran; University of Toronto; Vector Institute',
      venue: 'WACV 2025',
      year: 2025,
      link: 'https://arxiv.org/abs/2406.17815',
      license: 'MIT',
      description: 'Selective-state space modeling (Mamba) to unify saliency across varied visual domains.',
    },
    {
      id: 'itti',
      title: 'A Model of Saliency-Based Visual Attention for Rapid Scene Analysis',
      authors: 'Laurent Itti, Christof Koch, Ernst Niebur',
      institution: 'Caltech',
      venue: 'IEEE PAMI 1998',
      year: 1998,
      link: 'https://doi.org/10.1109/34.730558',
      license: 'Academic Reference',
      description: 'Seminal biological attention model introducing bottom-up feature maps and inhibition of return.',
    },
    {
      id: 'metrics',
      title: 'What do different evaluation metrics tell us about saliency models?',
      authors: 'Zoya Bylinskii, Tilke Judd, Aude Oliva, Antonio Torralba, Frédo Durand',
      institution: 'MIT',
      venue: 'IEEE PAMI 2019 / arXiv 2016',
      year: 2019,
      link: 'https://arxiv.org/abs/1604.03605',
      license: 'Academic Reference',
      description: 'Foundational analysis of saliency metrics: AUC, Correlation Coefficient (CC), and NSS.',
    },
    {
      id: 'benchmark',
      title: 'MIT/Tübingen Saliency Benchmark (MIT300)',
      authors: 'MIT & University of Tübingen',
      institution: 'MIT / Tübingen',
      venue: 'Benchmark Website',
      year: 2018,
      link: 'https://saliency.tuebingen.ai/',
      license: 'Benchmark Reference',
      description: 'Standard independent leaderboard comparing saliency models against split-half human ceilings.',
    },
  ];

  const steps = [
    {
      id: 1,
      title: 'Your eye has a tiny sharp spot',
      summary: 'Only the very center of what you look at is in high definition.',
      explanation:
        'Your eye is not a uniform digital camera. The center of your retina (the fovea) is tiny — about the size of a thumbnail at arm’s length — but it contains almost all your sharp color sensors. Everything outside this tiny circle is blurry peripheral vision.',
      svg: (
        <svg viewBox="0 0 320 200" className="h-44 w-full">
          {/* Eyeball outline */}
          <ellipse cx="160" cy="100" rx="90" ry="70" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
          {/* Iris */}
          <circle cx="160" cy="100" r="38" fill="#0f766e" stroke="#14b8a6" strokeWidth="2" />
          {/* Pupil */}
          <circle cx="160" cy="100" r="16" fill="#09090b" />
          {/* Tiny sharp spot indicator (fovea center ray) */}
          <circle cx="160" cy="100" r="6" fill="#2dd4bf" className="animate-pulse" />
          {/* Callout */}
          <line x1="160" y1="94" x2="240" y2="40" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="230" y="25" width="80" height="22" rx="4" fill="#042f2e" stroke="#14b8a6" strokeWidth="1" />
          <text x="270" y="39" textAnchor="middle" fill="#2dd4bf" fontSize="9" fontWeight="bold">
            Sharp Spot (Fovea)
          </text>
        </svg>
      ),
    },
    {
      id: 2,
      title: 'Your eye jumps 3 to 4 times every second',
      summary: 'You never stare smoothly; your eyes dart around in rapid jumps called saccades.',
      explanation:
        'Because only the tiny fovea sees sharply, your brain constantly redirects your eye 3 to 4 times per second. You don’t notice it because your brain briefly turns off perception during each jump (saccadic suppression).',
      svg: (
        <svg viewBox="0 0 320 200" className="h-44 w-full">
          {/* Target points */}
          <circle cx="60" cy="120" r="14" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <text x="60" y="124" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">1</text>

          <circle cx="160" cy="60" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
          <text x="160" y="64" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">2</text>

          <circle cx="260" cy="130" r="14" fill="#1e293b" stroke="#14b8a6" strokeWidth="2" />
          <text x="260" y="134" textAnchor="middle" fill="#14b8a6" fontSize="10" fontWeight="bold">3</text>

          {/* Jumps / arrows */}
          <path d="M 74 112 Q 110 70 146 64" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M 174 65 Q 210 80 246 122" fill="none" stroke="#14b8a6" strokeWidth="2" strokeDasharray="4 3" />

          <text x="160" y="175" textAnchor="middle" fill="#a1a1aa" fontSize="10">
            Rapid Saccadic Jumps (~250ms each)
          </text>
        </svg>
      ),
    },
    {
      id: 3,
      title: 'Bright spots, contrast, faces & text pull your eye',
      summary: 'Before conscious thought kicks in, automatic reflexes steer your initial glance.',
      explanation:
        'Your visual cortex has specialized neural hardware hardwired for high contrast, vibrant saturated spots, human faces, and readable text blocks. These elements naturally "stick out" and claim your first involuntary glances.',
      svg: (
        <svg viewBox="0 0 320 200" className="h-44 w-full">
          {/* High contrast bright element */}
          <rect x="40" y="50" width="60" height="60" rx="8" fill="#f59e0b" />
          <text x="70" y="130" textAnchor="middle" fill="#a1a1aa" fontSize="9">Contrast</text>

          {/* Face element */}
          <circle cx="160" cy="80" r="28" fill="#0f766e" stroke="#2dd4bf" strokeWidth="2" />
          <circle cx="150" cy="74" r="3" fill="#ffffff" />
          <circle cx="170" cy="74" r="3" fill="#ffffff" />
          <path d="M 152 90 Q 160 96 168 90" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
          <text x="160" y="130" textAnchor="middle" fill="#a1a1aa" fontSize="9">Faces</text>

          {/* Text block */}
          <rect x="220" y="55" width="65" height="10" rx="2" fill="#38bdf8" />
          <rect x="220" y="72" width="55" height="10" rx="2" fill="#38bdf8" />
          <rect x="220" y="89" width="45" height="10" rx="2" fill="#38bdf8" />
          <text x="250" y="130" textAnchor="middle" fill="#a1a1aa" fontSize="9">Text</text>
        </svg>
      ),
    },
    {
      id: 4,
      title: 'Computers learned from thousands of real eye-tracking recordings',
      summary: 'Scientists put thousands of people in lab eye-trackers to study universal viewing patterns.',
      explanation:
        'In universities around the world (like MIT and Tuebingen), researchers recorded thousands of volunteers looking freely at thousands of images. Neural networks analyzed this data to discover the mathematical laws of human visual attention.',
      svg: (
        <svg viewBox="0 0 320 200" className="h-44 w-full">
          {/* Subject with eye tracker */}
          <rect x="50" y="60" width="80" height="70" rx="8" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
          <line x1="90" y1="95" x2="160" y2="95" stroke="#14b8a6" strokeWidth="2" strokeDasharray="3 2" />
          <text x="90" y="150" textAnchor="middle" fill="#a1a1aa" fontSize="9">Real Human Subjects</text>

          {/* Model brain */}
          <circle cx="230" cy="95" r="40" fill="#042f2e" stroke="#14b8a6" strokeWidth="2" />
          <text x="230" y="92" textAnchor="middle" fill="#2dd4bf" fontSize="10" fontWeight="bold">Deep Saliency</text>
          <text x="230" y="106" textAnchor="middle" fill="#99f6e4" fontSize="8 font-mono">ONNX Model</text>
          <text x="230" y="150" textAnchor="middle" fill="#a1a1aa" fontSize="9">Trained on MIT300</text>
        </svg>
      ),
    },
    {
      id: 5,
      title: 'A heatmap is a guess of where a crowd looks first',
      summary: 'Not an individual mind-reader, but a statistical map of crowd fixations in ~3 seconds.',
      explanation:
        'The resulting heatmap shows the statistical distribution of where 100 people would look in their initial 3 seconds of viewing. Bright warm zones indicate high probability of fixation; dark fogged areas receive very few glances.',
      svg: (
        <svg viewBox="0 0 320 200" className="h-44 w-full">
          <defs>
            <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="40" y="30" width="240" height="130" rx="8" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
          <circle cx="120" cy="90" r="50" fill="url(#heatGrad)" />
          <circle cx="210" cy="110" r="35" fill="url(#heatGrad)" />
          <text x="160" y="180" textAnchor="middle" fill="#2dd4bf" fontSize="10" fontWeight="bold">
            Probability Distribution of Fixations
          </text>
        </svg>
      ),
    },
  ];

  const current = steps[activeStep - 1];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-2 border-b border-neutral-800 pb-5">
        <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium">
          <GraduationCap className="h-4 w-4" />
          <span>Interactive Science Guide</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-100">
          How Visual Attention Actually Works
        </h1>
        <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
          A clear, plain-English explainer of the neurobiology and computer vision behind Glance.
        </p>
      </div>

      {/* Walkthrough Guide: "How Glance judges a design" (Brief A-3 Item 14) */}
      <WalkthroughGuide reducedMotion={reducedMotion} />

      {/* Stepper Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 overflow-x-auto">
        {steps.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveStep(s.id)}
            className={`flex items-center gap-2 pb-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap px-2 ${
              activeStep === s.id
                ? 'border-teal-500 text-teal-300 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                activeStep === s.id ? 'bg-teal-500 text-neutral-950 font-bold' : 'bg-neutral-800'
              }`}
            >
              {s.id}
            </span>
            <span>Step {s.id}</span>
          </button>
        ))}
      </div>

      {/* Active Step Presentation */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* SVG Illustration */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex items-center justify-center">
            {current.svg}
          </div>

          {/* Text Explanation */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
              Step {current.id} of 5
            </span>
            <h2 className="text-xl font-bold text-neutral-100 leading-snug">
              {current.title}
            </h2>
            <p className="text-xs font-medium text-teal-200 bg-teal-950/40 border border-teal-800/40 p-2.5 rounded-lg">
              {current.summary}
            </p>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {current.explanation}
            </p>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          <button
            type="button"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === activeStep ? 'w-5 bg-teal-500' : 'w-1.5 bg-neutral-700'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={activeStep === 5}
            onClick={() => setActiveStep((s) => s + 1)}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 hover:bg-teal-800 disabled:opacity-30 text-white px-3.5 py-1.5 text-xs font-medium transition-colors"
          >
            <span>Next</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Critical Section: "What It Can't Know" */}
      <div className="rounded-2xl border border-amber-900/40 bg-neutral-900/60 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
          <AlertTriangle className="h-5 w-5" />
          <span>What Attention Models Cannot Know</span>
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Glance estimates <strong>bottom-up visual salience</strong> (involuntary, reflex-driven fixation during the first ~3 seconds).
          Honest software is transparent about boundaries:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-neutral-950 p-3.5 border border-neutral-800 space-y-1.5">
            <h4 className="text-xs font-semibold text-neutral-200">1. Your Specific Goal</h4>
            <p className="text-[11px] text-neutral-400 leading-snug">
              If a user is searching for a specific &quot;Log In&quot; link or pricing table, top-down cognitive goals override natural salience.
            </p>
          </div>

          <div className="rounded-lg bg-neutral-950 p-3.5 border border-neutral-800 space-y-1.5">
            <h4 className="text-xs font-semibold text-neutral-200">2. Reading & Comprehension</h4>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Glance predicts that an eye will jump to a headline, but cannot guarantee whether the reader understands or agrees with the text.
            </p>
          </div>

          <div className="rounded-lg bg-neutral-950 p-3.5 border border-neutral-800 space-y-1.5">
            <h4 className="text-xs font-semibold text-neutral-200">3. Purchase Intent & Emotion</h4>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Beware of tools claiming &quot;95% purchase intent&quot; or &quot;emotional resonance&quot;. No camera or visual model can measure that from pixels alone.
            </p>
          </div>
        </div>
      </div>

      {/* About / Research Panel (Brief A-3 Item 16) */}
      <section
        id="research"
        aria-label="About and Peer-Reviewed Research Papers"
        className="rounded-2xl border border-teal-800/60 bg-neutral-900/70 p-6 md:p-8 space-y-6 scroll-mt-6"
      >
        <div className="space-y-2 border-b border-neutral-800 pb-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Peer-Reviewed Science</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100">
            Backed by Peer-Reviewed Research
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
            Glance models are built on published scientific literature and validated against standard benchmarks.
            Attention predictions estimate where human viewers tend to look in the first ~3 seconds of free viewing;
            they are statistical estimates, not guarantees of individual human behavior or conversion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RESEARCH_PAPERS.map((paper) => (
            <div
              key={paper.id}
              className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-teal-950 border border-teal-800/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-teal-300">
                    {paper.venue}
                  </span>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
                    {paper.license}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-neutral-100 leading-snug">
                  {paper.title}
                </h3>
                <p className="text-[11px] text-teal-400/90 font-medium">
                  {paper.authors} ({paper.institution})
                </p>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {paper.description}
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800/80">
                <a
                  href={paper.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>Read publication ({paper.year})</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-teal-950/30 border border-teal-800/40 p-3 text-xs text-neutral-300 flex items-start gap-2.5">
          <GraduationCap className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            Benchmark datasets (MIT300, CAT2000, UEyes) are linked directly and never redistributed.
            Learn more in our full{' '}
            <a
              href="https://cgsudo.github.io/glance-attention/citations.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 underline font-medium"
            >
              CITATIONS.md research credits
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
};
