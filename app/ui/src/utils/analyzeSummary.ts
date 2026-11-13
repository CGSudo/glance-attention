import type { Aoi, AnalyzeResult } from '../api/types';

export function getPositionLabel(point: { x: number; y: number }): string {
  if (point.y < 35) {
    if (point.x < 35) return 'top left';
    if (point.x > 65) return 'top right';
    return 'top center';
  }
  if (point.y <= 65) {
    if (point.x < 35) return 'left side';
    if (point.x > 65) return 'right side';
    return 'center';
  }
  if (point.x < 50) return 'bottom left';
  return 'bottom right';
}

function getTopLookedAtAreas(res: AnalyzeResult, markedAois: Aoi[]): string[] {
  return res.scanpath.slice(0, 3).map((point) => {
    const matching = markedAois.find(
      (a) =>
        point.x >= a.x &&
        point.x <= a.x + a.width &&
        point.y >= a.y &&
        point.y <= a.y + a.height
    );
    if (matching) return `"${matching.name}"`;
    return `the ${getPositionLabel(point)}`;
  });
}

export function buildAnalyzeSummary(result: AnalyzeResult, markedAois: Aoi[]): string {
  const clarity = result.metrics.clarity;
  const count = result.scanpath.length;
  const sentences = [
    `Clarity score: ${clarity.toFixed(1)}. Higher means eyes settle on fewer places.`,
    `The look order has ${count} attention ${count === 1 ? 'spot' : 'spots'}.`,
  ];
  const top = getTopLookedAtAreas(result, markedAois);
  if (top.length) {
    sentences.push(`People may look at ${top[0]} first${top.slice(1).map(area => `, then ${area}`).join('')}.`);
  }
  const shares = result.metrics.aoi_share
    .filter(area => markedAois.some(marked => marked.id === area.id))
    .sort((a, b) => b.share - a.share);
  if (shares.length) {
    const best = shares[0];
    const worst = shares[shares.length - 1];
    const bestName = markedAois.find(area => area.id === best.id)?.name;
    const worstName = markedAois.find(area => area.id === worst.id)?.name;
    sentences.push(shares.length === 1
      ? `Your "${bestName}" area gets ${best.share.toFixed(1)}% of attention.`
      : `Of your marked areas, "${bestName}" gets the most attention (${best.share.toFixed(1)}%), and "${worstName}" gets the least (${worst.share.toFixed(1)}%).`);
  }
  return sentences.join(' ');
}
