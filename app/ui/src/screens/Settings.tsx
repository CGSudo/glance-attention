import React, { useState } from 'react';
import { Settings as SettingsIcon, Server, Palette, Sun, Moon, Check, RefreshCw } from 'lucide-react';
import { isMockMode, isTauri, setTransport, HttpTransport, MockTransport, TauriTransport, SystemInfo } from '../api';
import { ColorRampType } from '../utils/colorRamps';

interface SettingsProps {
  colorRamp: ColorRampType;
  onChangeColorRamp: (ramp: ColorRampType) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onResetOnboarding: () => void;
  systemInfo: SystemInfo | null;
  onTransportChange: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  colorRamp,
  onChangeColorRamp,
  isDark,
  onToggleTheme,
  reducedMotion,
  onToggleReducedMotion,
  onResetOnboarding,
  systemInfo,
  onTransportChange,
}) => {
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:7878');
  const [token, setToken] = useState('');
  const [mockActive, setMockActive] = useState(isMockMode());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveApi = () => {
    if (mockActive) {
      setTransport(new MockTransport());
    } else {
      setTransport(isTauri ? new TauriTransport() : new HttpTransport(apiUrl, token));
    }
    setSavedNotice(true);
    onTransportChange();
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleToggleMock = (checked: boolean) => {
    setMockActive(checked);
    if (checked) {
      setTransport(new MockTransport());
    } else {
      setTransport(isTauri ? new TauriTransport() : new HttpTransport(apiUrl, token));
    }
    onTransportChange();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1 border-b border-neutral-800 pb-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium">
          <SettingsIcon className="h-4 w-4" />
          <span>System & Preferences</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-100">Application Settings</h1>
        <p className="text-xs text-neutral-400">
          Configure local API transport, visual color ramps, theme, and accessibility controls.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-lg bg-teal-950/60 border border-teal-800/40 p-3 text-xs text-teal-200 flex items-center gap-2">
          <Check className="h-4 w-4 text-teal-400 shrink-0" />
          <span>Settings successfully saved and applied.</span>
        </div>
      )}

      {/* 1. Local API Transport & Mock Switch */}
      {systemInfo && <p className="text-sm text-neutral-300">Provider {systemInfo.provider} · Recommended {systemInfo.recommended_model} · {systemInfo.cpu}{systemInfo.gpu_name && ` · ${systemInfo.gpu_name}`}</p>}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-teal-400" />
            <h3 className="font-semibold text-sm text-neutral-100">Local API Transport</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-neutral-300">Mock Mode (VITE_GLANCE_MOCK)</span>
            <input
              type="checkbox"
              checked={mockActive}
              onChange={(e) => handleToggleMock(e.target.checked)}
              className="accent-teal-500 h-4 w-4 rounded cursor-pointer"
            />
          </label>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          {isTauri ? 'Desktop uses the local Rust engine. Enable “Open in background server” in the Glance menu for integrations.' : 'Start glance serve on 127.0.0.1:7878. Paste the token from your config directory, glance/token.'}
        </p>

        {!isTauri && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Server Endpoint</label>
            <input
              type="text"
              disabled={mockActive}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 focus:border-teal-500 focus:outline-none disabled:opacity-40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Bearer Token</label>
            <input
              type="password"
              disabled={mockActive}
              placeholder="~/.glance/token value"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200 focus:border-teal-500 focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveApi}
            className="rounded-md bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 text-xs font-medium transition-colors"
          >
            Apply Transport Configuration
          </button>
        </div>
      </div>

      {/* 2. Visual & Accessibility Settings */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
          <Palette className="h-4 w-4 text-teal-400" />
          <h3 className="font-semibold text-sm text-neutral-100">Visuals & Accessibility</h3>
        </div>

        {/* Heatmap Color Ramp */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-200 block">
            Heatmap Color Ramp
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeColorRamp('inferno')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                colorRamp === 'inferno'
                  ? 'border-teal-500 bg-teal-950/30'
                  : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-neutral-100">Inferno (Standard)</span>
                {colorRamp === 'inferno' && <Check className="h-3.5 w-3.5 text-teal-400" />}
              </div>
              <div className="h-2 w-full rounded bg-gradient-to-r from-neutral-950 via-purple-700 via-orange-500 to-yellow-300" />
              <p className="text-[11px] text-neutral-400 mt-2">
                Perceptually uniform brightness gradient for standard screens.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onChangeColorRamp('viridis')}
              className={`rounded-lg border p-3 text-left transition-colors ${
                colorRamp === 'viridis'
                  ? 'border-teal-500 bg-teal-950/30'
                  : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-neutral-100">Viridis (Colorblind-Safe)</span>
                {colorRamp === 'viridis' && <Check className="h-3.5 w-3.5 text-teal-400" />}
              </div>
              <div className="h-2 w-full rounded bg-gradient-to-r from-purple-900 via-teal-600 via-green-500 to-yellow-300" />
              <p className="text-[11px] text-neutral-400 mt-2">
                Accessible for red-green deuteranopia/protanopia and grayscale printing.
              </p>
            </button>
          </div>
        </div>

        {/* Theme and Reduced Motion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-800">
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-medium text-neutral-200">Theme Mode</div>
              <div className="text-[11px] text-neutral-400">
                Current: {isDark ? 'Dark (Calm Gray)' : 'Light (Clean Paper)'}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="rounded-md bg-neutral-800 hover:bg-neutral-700 p-2 text-neutral-200 transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-medium text-neutral-200">Reduced Motion</div>
              <div className="text-[11px] text-neutral-400">
                {reducedMotion ? 'Animations Disabled' : 'Smooth Transitions'}
              </div>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={onToggleReducedMotion}
              className="accent-teal-500 h-4 w-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Onboarding & Reset */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-neutral-200">First-Run Onboarding</h4>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Re-open the 3-step introduction guide covering core attention principles.
          </p>
        </div>
        <button
          type="button"
          onClick={onResetOnboarding}
          className="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 text-xs font-medium border border-neutral-700 transition-colors"
        >
          <RefreshCw className="h-3 w-3 text-teal-400" />
          <span>Launch Onboarding</span>
        </button>
      </div>
    </div>
  );
};
