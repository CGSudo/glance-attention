import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { GraduationCap, ShieldCheck, GitBranch, AlertCircle, ExternalLink, ArrowRight } from 'lucide-react';

interface BadgeConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sentence: string;
  linkLabel: string;
  linkHref: string;
  accentColor?: string;
}

const BADGES: BadgeConfig[] = [
  {
    id: 'research',
    label: 'Research-backed',
    icon: GraduationCap,
    sentence: 'Built on peer-reviewed saliency models evaluated on the MIT Saliency Benchmark.',
    linkLabel: 'About the research papers',
    linkHref: '#learn',
  },
  {
    id: 'privacy',
    label: 'Private by design',
    icon: ShieldCheck,
    sentence: 'Runs on your device. Safe for work under NDA.',
    linkLabel: 'How privacy works',
    linkHref: 'https://cgsudo.github.io/glance-attention/how-it-works.html',
  },
  {
    id: 'opensource',
    label: 'Open source',
    icon: GitBranch,
    sentence: 'Inspect code and verify offline execution.',
    linkLabel: 'GitHub repository',
    linkHref: 'https://github.com/CGSudo/glance-attention',
  },
  {
    id: 'limits',
    label: 'Honest limits',
    icon: AlertCircle,
    sentence: 'A prediction, not eye tracking.',
    linkLabel: 'Science & score meaning',
    linkHref: 'https://cgsudo.github.io/glance-attention/science.html',
    accentColor: 'text-amber-400',
  },
];

interface TrustBadgesProps {
  className?: string;
  compact?: boolean;
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ className = '', compact = false }) => {
  return (
    <div
      role="region"
      aria-label="Trust and privacy disclosures"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {BADGES.map((b) => {
        const Icon = b.icon;
        return (
          <Popover.Root key={b.id}>
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={`${b.label}: ${b.sentence}`}
                className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-teal-700/60 hover:text-white hover:bg-neutral-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 select-none ${
                  compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                }`}
              >
                <Icon className={`shrink-0 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${b.accentColor || 'text-teal-400'}`} />
                <span className="font-medium">{b.label}</span>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={6}
                align="center"
                className="z-50 max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs text-neutral-200 shadow-xl outline-none space-y-2 animate-in fade-in-50 zoom-in-95 duration-100"
              >
                <div className="flex items-center gap-1.5 font-semibold text-neutral-100">
                  <Icon className={`h-4 w-4 ${b.accentColor || 'text-teal-400'}`} />
                  <span>{b.label}</span>
                </div>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  {b.sentence}
                </p>
                <div className="pt-1 border-t border-neutral-800">
                  <a
                    href={b.linkHref}
                    target={b.linkHref.startsWith('#') ? undefined : '_blank'}
                    rel={b.linkHref.startsWith('#') ? undefined : 'noopener noreferrer'}
                    onClick={(e) => {
                      if (b.linkHref.startsWith('#')) {
                        e.preventDefault();
                        window.location.hash = b.linkHref.replace('#', '');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-medium underline underline-offset-2"
                  >
                    <span>{b.linkLabel}</span>
                    {b.linkHref.startsWith('#') ? <ArrowRight className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                  </a>
                </div>
                <Popover.Arrow className="fill-neutral-700" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        );
      })}
    </div>
  );
};
