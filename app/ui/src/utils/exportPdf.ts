import { pngDataUrl } from '../api/transport';
import { saveFile } from './saveFile';
import { AnalyzeResult, Aoi } from '../api/types';

export async function exportAnalysisPdf(
  result: AnalyzeResult,
  imageSrc: string,
  aois: Aoi[] = [],
  filename = 'glance-attention-report.pdf'
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Title & Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110); // deep teal
  doc.text('Glance — Visual Attention Report', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on ${new Date().toLocaleString()} | Model: ${result.model.toUpperCase()} | Resolution: ${result.width}×${result.height}`,
    margin,
    y
  );
  y += 20;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Render Image & Heatmap preview side by side
  const imgWidth = 240;
  const imgHeight = Math.min(180, Math.round((imgWidth / (result.width || 800)) * (result.height || 600)));

  try {
    doc.addImage(imageSrc, 'PNG', margin, y, imgWidth, imgHeight);
  doc.addImage(pngDataUrl(result.overlay_png_b64), 'PNG', margin + imgWidth + 15, y, imgWidth, imgHeight);
  } catch {
    // If image format fails, add fallback text
    doc.rect(margin, y, imgWidth, imgHeight);
    doc.text('Original Image', margin + 20, y + 30);
    doc.rect(margin + imgWidth + 15, y, imgWidth, imgHeight);
    doc.text('Attention Heatmap Overlay', margin + imgWidth + 35, y + 30);
  }

  y += imgHeight + 25;

  // Metrics Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Attention Metrics & Scientific Scores', margin, y);
  y += 18;

  // Clarity score box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, pageWidth - 2 * margin, 42, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Clarity Score: ${result.metrics.clarity.toFixed(1)} / 100`, margin + 12, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Formula: 1 - H(heatmap)/log(N_pixels) on 64x64 downsample. High score = focused attention; low = dispersed.',
    margin + 12,
    y + 32
  );
  y += 54;

  // AOI Table if any
  if (aois.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Area of Interest (AOI) Attention Shares', margin, y);
    y += 16;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - 2 * margin, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('AOI Name', margin + 10, y + 14);
    doc.text('Attention Share (%)', margin + 220, y + 14);
    doc.text('First Glance Fixation', margin + 370, y + 14);
    y += 20;

    doc.setFont('helvetica', 'normal');
    for (const aoi of aois) {
      const share = result.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
      // Find earliest fixation inside AOI
      const fix = result.scanpath.find(
        (p) =>
          p.x >= aoi.x &&
          p.x <= aoi.x + aoi.width &&
          p.y >= aoi.y &&
          p.y <= aoi.y + aoi.height
      );
      const fixText = fix ? `Rank #${fix.order}` : 'After 7th fixation';

      doc.text(aoi.name, margin + 10, y + 14);
      doc.text(`${share.toFixed(1)}%`, margin + 220, y + 14);
      doc.text(fixText, margin + 370, y + 14);
      y += 18;
    }
    y += 15;
  }

  // Scanpath Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('First 7 Fixations (Scanpath Sequence)', margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Greedy peak picking with Inhibition-of-Return (Gaussian suppression, sigma ~4% image width, Itti & Koch 1998).',
    margin,
    y
  );
  y += 16;

  const scanpathStr = result.scanpath
    .map((p) => `#${p.order}: (${p.x.toFixed(1)}%, ${p.y.toFixed(1)}%)`)
    .join('  ->  ');
  doc.setTextColor(51, 65, 85);
  doc.text(scanpathStr, margin, y);
  y += 30;

  // Scientific citation footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Glance is open-source attention prediction software. Benchmarked on MIT300. Offline and private.',
    margin,
    y
  );

  await saveFile(filename, doc.output('blob'));
}
