import React from 'react';

interface LaserScanOverlayProps {
  isScanning: boolean;
  reducedMotion?: boolean;
}

export const LaserScanOverlay: React.FC<LaserScanOverlayProps> = ({ isScanning, reducedMotion = false }) => {
  if (!isScanning) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-sm select-none"
    >
      {/* Semi-transparent dark wash during scan */}
      <div className="absolute inset-0 bg-teal-950/20 backdrop-brightness-95" />

      {/* Faint precision grid overlay */}
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="laser-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="#34ad9f"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#laser-grid)" />
      </svg>

      {/* Thin sweeping laser line with trailing beam - animated purely via transform */}
      {!reducedMotion && (
        <div className="laser-sweep-carrier absolute top-0 left-0 right-0 h-full pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-teal-500/15 via-teal-500/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-400 shadow-[0_0_8px_#34ad9f,0_0_20px_#075c56,0_0_35px_rgba(52,173,159,0.7)]" />
        </div>
      )}

      {/* HUD Scanner readout pill in bottom corner */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-teal-500/40 bg-neutral-950/85 px-2.5 py-1 text-[10px] font-mono font-medium text-teal-300 shadow-lg backdrop-blur-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-ping" />
        <span>Laser grid scan… 1.5s</span>
      </div>
    </div>
  );
};
