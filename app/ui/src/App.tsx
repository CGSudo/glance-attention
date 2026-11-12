import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Layout, ScreenId } from './components/Layout';
import { OnboardingModal } from './components/OnboardingModal';
import { Home } from './screens/Home';
import { Analyze } from './screens/Analyze';
import { Compare } from './screens/Compare';
import { Models } from './screens/Models';
import { Settings } from './screens/Settings';
import { getTransport, isWeb, pngDataUrl } from './api';
import { ModelInfo, AnalyzeResult, Aoi, ContentType, InstallProgress, SystemInfo } from './api/types';
import { ColorRampType } from './utils/colorRamps';

const Video = lazy(() => import('./screens/Video').then(module => ({ default: module.Video })));
const Batch = lazy(() => import('./screens/Batch').then(module => ({ default: module.Batch })));
const Learn = lazy(() => import('./screens/Learn').then(module => ({ default: module.Learn })));

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [activeModelId, setActiveModelId] = useState<string>('unisal');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>('natural');
  const [installing, setInstalling] = useState<Record<string, InstallProgress>>({});
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [colorRamp, setColorRamp] = useState<ColorRampType>('inferno');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Analysis State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [webStatus, setWebStatus] = useState('Preparing browser engine…');
  const [aois, setAois] = useState<Aoi[]>([]);
  const analysisRequest = useRef(0);
  const [recentItems, setRecentItems] = useState<
    { id: string; name: string; timestamp: string; clarity: number; thumbnail: string }[]
  >([]);

  const refreshModels = useCallback(async () => {
    try {
      const transport = getTransport();
      const [list, info, config] = await Promise.all([transport.getModels(), transport.getSystemInfo(), transport.getConfig()]);
      setModels(list);
      setSystemInfo(info);
      setActiveModelId(config.default_model || info.recommended_model);
      setStartupError(null);
    } catch (error) {
      setStartupError(String(error));
    }
  }, []);

  useEffect(() => {
    const update = (event: Event) => setWebStatus((event as CustomEvent<string>).detail);
    window.addEventListener('glance-web-status', update);
    return () => window.removeEventListener('glance-web-status', update);
  }, []);

  useEffect(() => {
    if (isWeb && currentScreen === 'settings') getTransport().getSystemInfo().then(setSystemInfo).catch(error => setStartupError(String(error)));
  }, [currentScreen]);

  // Load models on mount
  useEffect(() => {
    refreshModels();

    // Check first-run onboarding
    const completed = localStorage.getItem('glance_onboarding_completed');
    if (!completed && !window.location.hash) {
      setIsOnboardingOpen(true);
    }

    // Read initial hash if present
    const hash = window.location.hash.replace('#', '') as ScreenId;
    const validScreens: ScreenId[] = [
      'home',
      'analyze',
      'compare',
      'video',
      'models',
      'batch',
      'learn',
      'settings',
    ];
    if (validScreens.includes(hash)) {
      setCurrentScreen(hash);
    }

    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '') as ScreenId;
      if (validScreens.includes(h)) {
        setCurrentScreen(h);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [refreshModels]);

  // Sync theme to document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Sync reduced motion
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [reducedMotion]);

  // Run analysis helper
  const executeAnalysis = useCallback(
    async (file: File, modelId: string, currentAois: Aoi[], currentContentType = contentType) => {
      const request = ++analysisRequest.current;
      setIsAnalyzing(true);
      setAnalyzeError(null);
      try {
        const transport = getTransport();
        const res = await transport.analyze(file, modelId, currentAois, currentContentType, 'squint');
        const info = await transport.getSystemInfo();
        if (request !== analysisRequest.current) return;
        setResult(res);
        setSystemInfo(info);

        // Update recents
        setRecentItems((prev) => {
          const newItem = {
            id: `recent-${Date.now()}`,
            name: file.name,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            clarity: res.metrics.clarity,
            thumbnail: pngDataUrl(res.overlay_png_b64),
          };
          const filtered = prev.filter((p) => p.name !== file.name);
          return [newItem, ...filtered].slice(0, 6);
        });
      } catch (err) {
        if (request === analysisRequest.current) setAnalyzeError(String(err));
      } finally {
        if (request === analysisRequest.current) setIsAnalyzing(false);
      }
    },
    [contentType]
  );

  const handleSelectImage = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCurrentScreen('analyze');
    setAois([]);
    executeAnalysis(file, activeModelId, []);
  };

  const handleReanalyze = (updatedAois: Aoi[]) => {
    if (imageFile) {
      executeAnalysis(imageFile, activeModelId, updatedAois);
    }
  };

  const handleSelectModel = (id: string) => {
    setActiveModelId(id);
    getTransport().setConfig({ default_model: id }).catch(error => setModelError(String(error)));
    if (imageFile && currentScreen === 'analyze') {
      executeAnalysis(imageFile, id, aois);
    }
  };

  const handleInstallModel = async (id: string) => {
    if (installing[id]) return;
    setModelError(null);
    setInstalling(previous => ({ ...previous, [id]: { id, downloaded: 0, total: null } }));
    try {
      const transport = getTransport();
      await transport.installModel(id, progress => setInstalling(previous => ({ ...previous, [id]: progress })));
      const updated = await transport.getModels();
      setModels(updated);
    } catch (err) {
      setModelError(String(err));
    } finally {
      setInstalling(previous => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    }
  };

  const handleImportModel = async () => {
    setModelError(null);
    try {
      const transport = getTransport();
      const imported = await transport.importModel?.();
      if (imported?.ok) setModels(await transport.getModels());
    } catch (error) {
      setModelError(String(error));
    }
  };

  const handleOpenRecent = (item: { id: string; name: string; thumbnail: string }) => {
    setImageSrc(item.thumbnail);
    setCurrentScreen('analyze');
    window.location.hash = 'analyze';
  };

  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
    window.location.hash = screen;
  };

  // If navigate to analyze without image, auto-generate sample so analysis is visible
  useEffect(() => {
    if (currentScreen === 'analyze' && !imageSrc) {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 800, 50);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(40, 15, 24, 20);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(80, 140, 480, 32);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(80, 190, 360, 16);
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(80, 240, 160, 44);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(480, 180, 260, 280);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(510, 220, 200, 120);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'sample-hero.png', { type: 'image/png' });
          setImageFile(file);
          setImageSrc(canvas.toDataURL());
          const initialAois: Aoi[] = [
            { id: 'cta-btn', name: 'Primary CTA Button', x: 10, y: 40, width: 20, height: 8, color: '#14b8a6' },
            { id: 'hero-headline', name: 'Hero Headline', x: 10, y: 23, width: 60, height: 6, color: '#f59e0b' },
          ];
          setAois(initialAois);
          executeAnalysis(file, activeModelId, initialAois);
        }
      });
    }
  }, [currentScreen, imageSrc, activeModelId, executeAnalysis]);

  return (
    <Layout
      currentScreen={currentScreen}
      onNavigate={handleNavigate}
      models={models}
      activeModelId={activeModelId}
      onSelectModel={handleSelectModel}
      isDark={isDark}
      onToggleTheme={() => setIsDark(!isDark)}
      onOpenHelp={() => setIsOnboardingOpen(true)}
      systemInfo={systemInfo}
      contentType={contentType}
      onChangeContentType={value => {
        setContentType(value);
        if (imageFile && currentScreen === 'analyze') executeAnalysis(imageFile, activeModelId, aois, value);
      }}
    >
      {startupError && <p role="alert" className="px-6 py-3 text-sm text-amber-300">{startupError}. Open Settings to configure your connection.</p>}
      <Suspense fallback={<p role="status" className="p-6 text-sm text-neutral-400">Loading screen…</p>}>
      {currentScreen === 'home' && (
        <Home
          onSelectImage={handleSelectImage}
          onNavigate={handleNavigate}
          recentItems={recentItems}
          onOpenRecent={handleOpenRecent}
        />
      )}

      {currentScreen === 'analyze' && (
        <Analyze
          imageFile={imageFile}
          imageSrc={imageSrc}
          result={result}
          isLoading={isAnalyzing}
          loadingText={isWeb ? webStatus : undefined}
          error={analyzeError}
          aois={aois}
          onUpdateAois={setAois}
          onReanalyze={handleReanalyze}
        />
      )}

      {currentScreen === 'compare' && <Compare activeModelId={activeModelId} contentType={contentType} />}

      {currentScreen === 'video' && !isWeb && <Video />}
      {isWeb && (currentScreen === 'video' || currentScreen === 'batch') && <p className="p-6"><a className="text-teal-300 underline" href="https://cgsudo.github.io/glance-attention/download.html">Get the desktop app for SUM, TranSalNet, video, batch</a></p>}

      {currentScreen === 'models' && (
        <Models
          models={models}
          activeModelId={activeModelId}
          onSelectModel={handleSelectModel}
          onInstallModel={handleInstallModel}
          onImportModel={getTransport().importModel ? handleImportModel : undefined}
          installing={installing}
          error={modelError}
        />
      )}

      {currentScreen === 'batch' && !isWeb && <Batch activeModelId={activeModelId} contentType={contentType} />}

      {currentScreen === 'learn' && <Learn />}

      {currentScreen === 'settings' && (
        <Settings
          colorRamp={colorRamp}
          onChangeColorRamp={setColorRamp}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
          onResetOnboarding={() => setIsOnboardingOpen(true)}
          systemInfo={systemInfo}
          onTransportChange={refreshModels}
        />
      )}
      </Suspense>

      {/* 3-step skippable onboarding modal */}
      <OnboardingModal open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </Layout>
  );
};
