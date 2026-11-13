import { useEffect, useRef, useState } from 'react';
import type { AnalyzeResult } from '../api/types';

export function analyzeRevealTiming(points: number, words: number) {
  const numbers = Array.from({ length: points }, (_, index) => 900 + index * 250);
  const lines = numbers.slice(1).map(time => time - 100);
  const pause = points ? numbers[points - 1] + 250 : 900;
  const typing = pause + 1000;
  // shortcut: long summaries extend the reveal; shorten source copy if a hard 6 s cap is required.
  const typingEnd = typing + words * 35;
  const cards = Array.from({ length: 4 }, (_, index) => typingEnd + index * 250);
  return { numbers, lines, pause, typing, typingEnd, cards, end: cards[3] + 250 };
}

export function useAnalyzeReveal(image: string, result: AnalyzeResult | null, summary: string, busy: boolean, reducedMotion: boolean) {
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced = reducedMotion || systemReduced;
  const [elapsed, setElapsed] = useState(-1);
  const run = useRef<{
    image: string; result: AnalyzeResult; summary: string; started: number;
    timing: ReturnType<typeof analyzeRevealTiming>; complete: boolean;
  } | null>(null);
  const skip = useRef(() => {});

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    skip.current = () => {};
    if (!image) run.current = null;
    if (!image || !result || busy) {
      if (run.current?.image === image) run.current.complete = true;
      setElapsed(-1);
      return;
    }
    if (run.current?.image !== image) {
      run.current = { image, result, summary, started: performance.now(), complete: false,
        timing: analyzeRevealTiming(result.scanpath.length, summary.trim().split(/\s+/).length) };
    }
    const current = run.current;
    if (reduced || current.complete || current.result !== result || current.summary !== summary) {
      current.complete = true;
      setElapsed(Infinity);
      return;
    }
    const { timing } = current;
    const deadlines = [600, ...timing.numbers, ...timing.lines, timing.pause, timing.typing,
      ...summary.trim().split(/\s+/).map((_, index) => timing.typing + (index + 1) * 35),
      ...timing.cards, timing.end].sort((a, b) => a - b);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      clearTimeout(timer);
      const now = performance.now() - current.started;
      setElapsed(now);
      const next = deadlines.find(time => time > now);
      if (next !== undefined) timer = setTimeout(tick, next - now);
      else current.complete = true;
    };
    const skipTyping = () => {
      const now = performance.now() - current.started;
      if (now >= timing.typing && now < timing.typingEnd) {
        current.started = performance.now() - timing.typingEnd;
        tick();
      }
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') skipTyping(); };
    skip.current = skipTyping;
    window.addEventListener('keydown', onKey);
    tick();
    return () => {
      clearTimeout(timer);
      skip.current = () => {};
      window.removeEventListener('keydown', onKey);
    };
  }, [image, result, summary, busy, reduced]);

  return { elapsed: !image || !result || busy ? -1 : elapsed, timing: run.current?.timing,
    reduced, skipTyping: () => skip.current() };
}
