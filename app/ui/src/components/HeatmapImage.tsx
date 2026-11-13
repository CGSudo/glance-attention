import React, { useEffect, useRef } from 'react';
import { pngDataUrl } from '../api';
import { ColorRampType, recolorHeatmap } from '../utils/colorRamps';

interface HeatmapImageProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  png: string;
  colorRamp: ColorRampType;
  alt: string;
}

export const HeatmapImage: React.FC<HeatmapImageProps> = ({ png, colorRamp, alt, ...props }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !context) return;
    const image = new Image();
    image.onload = () => {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      recolorHeatmap(pixels.data, colorRamp);
      context.putImageData(pixels, 0, 0);
    };
    image.src = pngDataUrl(png);
    return () => { image.onload = null; };
  }, [png, colorRamp]);
  return <canvas ref={canvasRef} role="img" aria-label={alt} {...props} />;
};
