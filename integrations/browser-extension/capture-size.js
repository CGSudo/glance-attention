export const MAX_CAPTURE_SIZE = 8 * 1024 * 1024;

export async function fitCapture(width, height, estimateSize) {
  const originalWidth = width;
  const originalHeight = height;
  const minWidth = Math.min(width, 800);
  while (await estimateSize(width, height) > MAX_CAPTURE_SIZE) {
    if (width > minWidth) {
      width = Math.max(minWidth, Math.floor(width * 0.8));
      height = Math.max(1, Math.round(originalHeight * width / originalWidth));
    } else {
      if (height === 1) throw new Error('Capture cannot fit session storage. Try a smaller page.');
      height = Math.max(1, Math.floor(height * 0.8));
    }
  }
  return { width, height, cropped: height < Math.max(1, Math.round(originalHeight * width / originalWidth)) };
}
