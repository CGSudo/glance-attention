import React from 'react';
import { ModelSwitcher } from './ModelSwitcher';
import { ContentType, ModelInfo, SystemInfo } from '../api/types';
import {
  Home,
  Scan,
  GitCompare,
  Video,
  Box,
  Layers,
  GraduationCap,
  Settings,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';

export type ScreenId =
  | 'home'
  | 'analyze'
  | 'compare'
  | 'video'
  | 'models'
  | 'batch'
  | 'learn'
  | 'settings';

interface LayoutProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  models: ModelInfo[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
  children: React.ReactNode;
  systemInfo: SystemInfo | null;
  contentType: ContentType;
  onChangeContentType: (value: ContentType) => void;
}

const NAV_ITEMS: { id: ScreenId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'analyze', label: 'Analyze', icon: Scan },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'models', label: 'Models', icon: Box },
  { id: 'batch', label: 'Batch', icon: Layers },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({
  currentScreen,
  onNavigate,
  models,
  activeModelId,
  onSelectModel,
  isDark,
  onToggleTheme,
  onOpenHelp,
  children,
  systemInfo,
  contentType,
  onChangeContentType,
}) => {
  const activeModel = models.find(model => model.id === activeModelId);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100 select-none">
      {/* Top Application Toolbar */}
      <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4">
        {/* Left: Brand + Model Switcher */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 group text-left focus:outline-none"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-600 text-white font-bold text-xs tracking-wider shadow-sm group-hover:bg-teal-500 transition-colors">
              G
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-neutral-100">Glance</span>
              <span className="text-[10px] text-teal-400 font-mono">v0.1.0</span>
            </div>
          </button>

          <div className="h-4 w-px bg-neutral-800" />

          {/* Model Switcher always visible in top toolbar */}
          <ModelSwitcher
            models={models}
            activeModelId={activeModelId}
            onSelectModel={onSelectModel}
          />
          {!!(activeModel?.conditions?.length || activeModel?.condition) && (
            <select aria-label="Content type" value={contentType} onChange={event => onChangeContentType(event.target.value as ContentType)} className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs">
              <option value="natural">Natural</option>
              <option value="ecommerce">E-commerce</option>
              <option value="ui">UI</option>
            </select>
          )}

          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 text-[10px] font-medium text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>{systemInfo ? `${systemInfo.provider} · ${systemInfo.recommended_model} recommended` : 'Local engine'}</span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center space-x-1" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  isActive
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-teal-400' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Open Onboarding Guide"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle Theme (Light / Dark)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Screen Content Area */}
      <main className="flex-1 overflow-auto bg-neutral-950">
        {children}
      </main>
    </div>
  );
};
