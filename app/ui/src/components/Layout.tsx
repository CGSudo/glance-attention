import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ModelSwitcher } from './ModelSwitcher';
import { isWeb } from '../api';
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
  HelpCircle,
  Menu,
  X,
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
  onOpenHelp,
  children,
  systemInfo,
  contentType,
  onChangeContentType,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeModel = models.find(model => model.id === activeModelId);
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100 select-none">
      {/* Top Application Toolbar */}
      <header className="flex h-12 w-full shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3 sm:px-4">
        {/* Left: Brand + Model Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 shrink min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 sm:gap-2 group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 shrink-0"
          >
            <svg viewBox="0 0 32 32" className="h-6 w-6 shrink-0" fill="none" role="img" aria-label="Glance Logo">
              <path d="M 3.5 16 C 8.5 7.5 23.5 7.5 28.5 16 C 23.5 24.5 8.5 24.5 3.5 16 Z" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="18.5" cy="14" r="4.25" fill="#2dd4bf"/>
            </svg>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-neutral-100">Glance</span>
              <span className="text-[10px] text-teal-400 font-mono hidden sm:inline">v0.1.0</span>
            </div>
          </button>

          <div className="hidden sm:block h-4 w-px bg-neutral-800" />

          {/* Model Switcher always visible in top toolbar */}
          <ModelSwitcher
            models={models}
            activeModelId={activeModelId}
            onSelectModel={onSelectModel}
          />
          {!!(activeModel?.conditions?.length || activeModel?.condition) && (
            <select aria-label="Content type" value={contentType} onChange={event => onChangeContentType(event.target.value as ContentType)} className="hidden sm:inline-block rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs">
              <option value="natural">Natural</option>
              <option value="ecommerce">E-commerce</option>
              <option value="ui">UI</option>
            </select>
          )}

          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 text-[10px] font-medium text-teal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            <span>{systemInfo ? `${systemInfo.provider} · ${systemInfo.recommended_model} recommended` : 'Local engine'}</span>
          </div>
        </div>

        {/* Center: Navigation Tabs (Desktop >= 1024px) */}
        <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
          {NAV_ITEMS.filter(item => !isWeb || (item.id !== 'video' && item.id !== 'batch')).map((item) => {
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

        {/* Right: Quick Controls (Desktop >= 1024px) */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Open Onboarding Guide"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Menu Button (< 1024px) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          className="flex lg:hidden items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-3.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors shrink-0"
        >
          <Menu className="h-4 w-4 text-teal-400" />
          <span>Menu</span>
        </button>
      </header>

      {/* Mobile Navigation Sheet (< 1024px) */}
      <Dialog.Root open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs animate-fade" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-neutral-900 border-l border-neutral-800 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto outline-none"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <Dialog.Title className="flex items-center gap-2">
                  <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0" fill="none" role="img" aria-label="Glance Logo">
                    <path d="M 3.5 16 C 8.5 7.5 23.5 7.5 28.5 16 C 23.5 24.5 8.5 24.5 3.5 16 Z" stroke="#2dd4bf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="18.5" cy="14" r="4.25" fill="#2dd4bf"/>
                  </svg>
                  <span className="font-semibold text-sm text-neutral-100">Navigation</span>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close navigation menu"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Navigation items list */}
              <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
                {NAV_ITEMS.filter(item => !isWeb || (item.id !== 'video' && item.id !== 'batch')).map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60 shadow-sm'
                          : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-neutral-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick controls in sheet footer: Help */}
            <div className="pt-4 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1 pb-1">
                <span>Preferences</span>
                <span className="font-mono text-[10px] text-teal-400">v0.1.0</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenHelp();
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors min-h-[44px]"
                >
                  <HelpCircle className="h-4 w-4 text-teal-400" />
                  <span>Guide</span>
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {isWeb && <p className="border-b border-neutral-800 px-4 py-2 text-xs text-teal-300">Runs in your browser. Images never leave your device.</p>}

      {/* Main Screen Content Area */}
      <main className="flex-1 overflow-auto bg-neutral-950">
        {children}
      </main>
    </div>
  );
};
