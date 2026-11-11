import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Sparkles, ArrowRight, Clock, GitCompare, Video, Layers } from 'lucide-react';
import { ScreenId } from '../components/Layout';

interface HomeProps {
  onSelectImage: (file: File) => void;
  onNavigate: (screen: ScreenId) => void;
  recentItems: { id: string; name: string; timestamp: string; clarity: number; thumbnail: string }[];
  onOpenRecent: (item: { id: string; name: string; thumbnail: string }) => void;
}

// Generate deterministic sample image canvases
function createSampleImageBlob(type: 'hero' | 'mobile' | 'product'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  if (type === 'hero') {
    // SaaS Landing Page Hero
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 600);
    // Header bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 800, 50);
    ctx.fillStyle = '#14b8a6';
    ctx.fillRect(40, 15, 24, 20);
    // Headline
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(80, 140, 480, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(80, 190, 360, 16);
    // Big CTA Button (High salience)
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(80, 240, 160, 44);
    // Hero preview card
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(480, 180, 260, 280);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(510, 220, 200, 120);
  } else if (type === 'mobile') {
    // Mobile App Screen
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 800, 600);
    // Phone container
    ctx.fillStyle = '#18181b';
    ctx.roundRect(260, 40, 280, 520, 24);
    ctx.fill();
    // Avatar face (high salience)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(320, 100, 22, 0, Math.PI * 2);
    ctx.fill();
    // User greeting
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(360, 92, 120, 16);
    // Metric card
    ctx.fillStyle = '#27272a';
    ctx.roundRect(280, 150, 240, 120, 12);
    ctx.fill();
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(300, 175, 90, 24);
    // Action button
    ctx.fillStyle = '#0d9488';
    ctx.roundRect(280, 480, 240, 44, 8);
    ctx.fill();
  } else {
    // E-commerce Product Page
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    // Product Photo (High contrast)
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(60, 80, 340, 420);
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(230, 290, 80, 0, Math.PI * 2);
    ctx.fill();
    // Title
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(440, 100, 260, 28);
    // Rating stars
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(440, 145, 110, 14);
    // Price
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(440, 185, 90, 28);
    // Add to Cart Button (Primary target)
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(440, 320, 280, 48);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob!], `sample-${type}.png`, { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}

export const Home: React.FC<HomeProps> = ({
  onSelectImage,
  onNavigate,
  recentItems,
  onOpenRecent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onSelectImage(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectImage(e.target.files[0]);
    }
  };

  const loadSample = async (type: 'hero' | 'mobile' | 'product') => {
    const file = await createSampleImageBlob(type);
    onSelectImage(file);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      {/* Summary First (ADHD Rule) */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-teal-950/60 border border-teal-800/40 px-3 py-1 text-xs font-medium text-teal-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Peer-Reviewed Visual Attention Prediction</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-100 sm:text-4xl">
          Where do people look in the first 3 seconds?
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
          Glance estimates early visual fixations offline using deep saliency models.
          Every score shows its exact mathematical formula and benchmark backing.
        </p>
      </div>

      {/* Primary Action: Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-teal-400 bg-teal-950/30'
            : 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-500 hover:bg-neutral-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800 text-teal-400 mb-4 border border-neutral-700">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-neutral-100">
          Drop an image here, or browse files
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Supports PNG, JPEG, WebP, SVG screenshots. Processed locally on your GPU/CPU.
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
        >
          <span>Select Image to Analyze</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Preset Samples: 1-click test */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Or try with sample designs
          </h2>
          <span className="text-[11px] text-neutral-400">Instant test in mock mode</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => loadSample('hero')}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3.5 text-left hover:border-neutral-700 hover:bg-neutral-900 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-800 text-teal-400 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-200">SaaS Landing Page</div>
              <div className="text-[11px] text-neutral-400">Headline, CTA button, card</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => loadSample('mobile')}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3.5 text-left hover:border-neutral-700 hover:bg-neutral-900 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-800 text-teal-400 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-200">Mobile Dashboard</div>
              <div className="text-[11px] text-neutral-400">Avatar face, metric cards</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => loadSample('product')}
            className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3.5 text-left hover:border-neutral-700 hover:bg-neutral-900 transition-all group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-neutral-800 text-teal-400 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-200">E-Commerce Product</div>
              <div className="text-[11px] text-neutral-400">Photo, pricing, Buy button</div>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Launchers to Other Modes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
        <button
          onClick={() => onNavigate('compare')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <GitCompare className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Compare A/B</div>
              <div className="text-[11px] text-neutral-400">Test design variants</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <button
          onClick={() => onNavigate('video')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Video className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Video Attention</div>
              <div className="text-[11px] text-neutral-400">Frame-by-frame 5fps</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        <button
          onClick={() => onNavigate('batch')}
          className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:bg-neutral-900 hover:border-neutral-700 text-left transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs font-medium text-neutral-200">Batch Processing</div>
              <div className="text-[11px] text-neutral-400">Folder to CSV/PDF</div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Recent Analyses List */}
      <div className="space-y-3 pt-2 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-400" />
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Recent Analyses
          </h2>
        </div>

        {recentItems.length === 0 ? (
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/20 p-6 text-center text-xs text-neutral-400">
            No recent analyses yet. Upload an image above to start your first session.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onOpenRecent(item)}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-2.5 hover:border-neutral-700 hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="h-10 w-10 rounded object-cover bg-neutral-950 border border-neutral-800"
                  />
                  <div>
                    <div className="text-xs font-medium text-neutral-200">{item.name}</div>
                    <div className="text-[11px] text-neutral-400">{item.timestamp}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-teal-400">
                    Clarity: {item.clarity.toFixed(1)}
                  </div>
                  <span className="text-[10px] text-neutral-400">Open &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
