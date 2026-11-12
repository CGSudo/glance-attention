import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Layout, ScreenId } from './components/Layout';
import { OnboardingModal } from './components/OnboardingModal';
import { ClientGuideModal } from './components/ClientGuideModal';
import { Home } from './screens/Home';
import { Analyze } from './screens/Analyze';
import { Compare } from './screens/Compare';
import { Models } from './screens/Models';
import { Settings } from './screens/Settings';
import { getTransport, isWeb, loadImageFromHandoff } from './api';
import { ModelInfo, AnalyzeResult, Aoi, ContentType, InstallProgress, SystemInfo } from './api/types';
import { ColorRampType } from './utils/colorRamps';
import {
  StoredRecentImage,
  getStoredRecentImages,
  saveRecentImage,
  deleteRecentImage,
  clearAllRecentImages,
} from './utils/recentImages';
import { createSampleImageBlob, SampleType } from './utils/samples';
import { isTallImage, getImageDimensions, analyzeFullPage } from './utils/fullPageAnalysis';

const Video = lazy(() => import('./screens/Video').then(module => ({ default: module.Video })));
const Batch = lazy(() => import('./screens/Batch').then(module => ({ default: module.Batch })));
const Learn = lazy(() => import('./screens/Learn').then(module => ({ default: module.Learn })));

const VALID_SCREENS: ScreenId[] = [
  'home',
  'analyze',
  'compare',
  'video',
  'models',
  'batch',
  'learn',
  'settings',
];

export const App: React.FC = () => {
  // First load: default to analyze screen where default sample is analysed
  const initialHash = typeof window !== 'undefined' ? (window.location.hash.replace('#', '') as ScreenId) : 'analyze';
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(VALID_SCREENS.includes(initialHash) ? initialHash : 'analyze');

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
  const [showHintBar, setShowHintBar] = useState<boolean>(false);
  const [showClientGuideCard, setShowClientGuideCard] = useState<boolean>(false);
  const [isClientGuideModalOpen, setIsClientGuideModalOpen] = useState<boolean>(false);
  const initialSampleLoaded = useRef<boolean>(false);

  // Analysis State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [webStatus, setWebStatus] = useState('Preparing browser engine…');
  const [aois, setAois] = useState<Aoi[]>([]);
  const analysisRequest = useRef(0);

  // IndexedDB Stored Recent Images
  const [recentImages, setRecentImages] = useState<StoredRecentImage[]>([]);

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

  // Load models, onboarding status, recent images, and check handoff on mount
  useEffect(() => {
    refreshModels();

    // Check first-run hint bar (replaces blocking modal on first view)
    const hintDismissed = localStorage.getItem('glance_hint_dismissed');
    if (!hintDismissed) {
      setShowHintBar(true);
    }

    const count = parseInt(localStorage.getItem('glance_user_analyses_count') || '0', 10);
    const clientGuideSeen = localStorage.getItem('glance_client_guide_seen');
    if (count >= 2 && !clientGuideSeen) {
      setShowClientGuideCard(true);
    }

    // Load recent images from IndexedDB
    getStoredRecentImages().then(setRecentImages);

    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '') as ScreenId;
      if (VALID_SCREENS.includes(h)) {
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

  // Run analysis helper (supporting tall image slicing and laser grid scan)
  const executeAnalysis = useCallback(
    async (file: File, modelId: string, currentAois: Aoi[], currentContentType = contentType, isSample = false) => {
      const request = ++analysisRequest.current;
      setIsAnalyzing(true);
      setAnalyzeError(null);

      const isReduced = reducedMotion || (typeof window !== 'undefined' && (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('reduced-motion')
      ));

      if (isSample && !isReduced) {
        setIsScanning(true);
      } else {
        setIsScanning(false);
      }

      try {
        const scanTimer = (isSample && !isReduced)
          ? new Promise(resolve => setTimeout(resolve, 1500))
          : Promise.resolve();

        const transport = getTransport();

        // Check if image is tall for full-page mode (height > 2x width)
        const dims = await getImageDimensions(file).catch(() => ({ width: 800, height: 600 }));
        let analysisPromise: Promise<AnalyzeResult>;
        if (isTallImage(dims.width, dims.height)) {
          analysisPromise = analyzeFullPage(file, modelId, currentAois, currentContentType, transport);
        } else {
          analysisPromise = transport.analyze(file, modelId, currentAois, currentContentType, 'squint');
        }

        const [res] = await Promise.all([analysisPromise, scanTimer]);
        const info = await transport.getSystemInfo();

        if (request !== analysisRequest.current) return;
        setResult(res);
        setSystemInfo(info);

        // Store user upload in IndexedDB (max 12, newest first)
        if (!isSample) {
          saveRecentImage(file).then((saved) => {
            if (saved) {
              setRecentImages((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)].slice(0, 12));
            }
          });
          try {
            const nextCount = parseInt(localStorage.getItem('glance_user_analyses_count') || '0', 10) + 1;
            localStorage.setItem('glance_user_analyses_count', String(nextCount));
            if (nextCount >= 2 && !localStorage.getItem('glance_client_guide_seen')) {
              setShowClientGuideCard(true);
            }
          } catch {
            // ignore storage error
          }
        }
      } catch (err) {
        if (request === analysisRequest.current) setAnalyzeError(String(err));
      } finally {
        if (request === analysisRequest.current) {
          setIsAnalyzing(false);
          setIsScanning(false);
        }
      }
    },
    [contentType, reducedMotion]
  );

  const handleSelectImage = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCurrentScreen('analyze');
    window.location.hash = 'analyze';
    setAois([]);
    executeAnalysis(file, activeModelId, [], contentType, false);
  }, [activeModelId, contentType, executeAnalysis]);

  // Extension handoff check (Req 7)
  useEffect(() => {
    loadImageFromHandoff().then((handoffFile) => {
      if (handoffFile) {
        handleSelectImage(handoffFile);
      }
    });
  }, [handleSelectImage]);

  const handleSelectSample = useCallback(
    async (sampleType: SampleType) => {
      const file = await createSampleImageBlob(sampleType);
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setCurrentScreen('analyze');
      window.location.hash = 'analyze';
      const initialAois: Aoi[] = sampleType === 'hero' ? [
        { id: 'cta-btn', name: 'Primary CTA Button', x: 4.5, y: 51.5, width: 23, height: 9, color: '#14b8a6' },
        { id: 'hero-headline', name: 'Hero Headline', x: 4.5, y: 24, width: 44, height: 14, color: '#f59e0b' },
      ] : sampleType === 'product' ? [
        { id: 'add-cart', name: 'Add to Cart', x: 53.5, y: 63, width: 26.5, height: 10, color: '#14b8a6' },
        { id: 'product-photo', name: 'Headphones', x: 4.5, y: 19, width: 45, height: 74, color: '#f59e0b' },
      ] : sampleType === 'mobile' ? [
        { id: 'workout-btn', name: 'Start Workout', x: 34.5, y: 71, width: 31, height: 10.5, color: '#14b8a6' },
        { id: 'activity-rings', name: 'Activity Rings', x: 34.5, y: 23, width: 31, height: 29, color: '#f59e0b' },
      ] : sampleType === 'ad' ? [
        { id: 'claim-cta', name: 'Claim 30% Off', x: 51, y: 63, width: 28, height: 10, color: '#14b8a6' },
        { id: 'model-face', name: 'Model Face', x: 7.5, y: 10, width: 34, height: 76, color: '#f59e0b' },
      ] : [];
      setAois(initialAois);
      executeAnalysis(file, activeModelId, initialAois, contentType, true);
    },
    [activeModelId, contentType, executeAnalysis]
  );

  const handleSelectRecent = (item: StoredRecentImage) => {
    const file = new File([item.blob], item.name, { type: 'image/png' });
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCurrentScreen('analyze');
    window.location.hash = 'analyze';
    setAois([]);
    executeAnalysis(file, activeModelId, [], contentType, false);
  };

  const handleDeleteRecent = async (id: string) => {
    await deleteRecentImage(id);
    setRecentImages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearRecents = async () => {
    await clearAllRecentImages();
    setRecentImages([]);
  };

  const handleReanalyze = (updatedAois: Aoi[]) => {
    if (imageFile) {
      executeAnalysis(imageFile, activeModelId, updatedAois, contentType, false);
    }
  };

  const handleSelectModel = (id: string) => {
    setActiveModelId(id);
    getTransport().setConfig({ default_model: id }).catch(error => setModelError(String(error)));
    if (imageFile && currentScreen === 'analyze') {
      executeAnalysis(imageFile, id, aois, contentType, false);
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

  const handleNavigate = (screen: ScreenId) => {
    setCurrentScreen(screen);
    window.location.hash = screen;
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageSrc('');
    setResult(null);
    setAois([]);
  };

  // First load: auto-generate default sample in Analyze so it is already analysed
  useEffect(() => {
    if (currentScreen === 'analyze' && !imageSrc && !initialSampleLoaded.current) {
      initialSampleLoaded.current = true;
      createSampleImageBlob('hero').then((file) => {
        setImageFile(file);
        setImageSrc(URL.createObjectURL(file));
        const initialAois: Aoi[] = [
          { id: 'cta-btn', name: 'Primary CTA Button', x: 4.5, y: 51.5, width: 23, height: 9, color: '#14b8a6' },
          { id: 'hero-headline', name: 'Hero Headline', x: 4.5, y: 24, width: 44, height: 14, color: '#f59e0b' },
        ];
        setAois(initialAois);
        executeAnalysis(file, activeModelId, initialAois, contentType, true);
      });
    }
  }, [currentScreen, imageSrc, activeModelId, executeAnalysis, contentType]);

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
        if (imageFile && currentScreen === 'analyze') executeAnalysis(imageFile, activeModelId, aois, value, false);
      }}
    >
      {startupError && <p role="alert" className="px-6 py-3 text-sm text-amber-300">{startupError}. Open Settings to configure your connection.</p>}
      <Suspense fallback={<p role="status" className="p-6 text-sm text-neutral-400">Loading screen…</p>}>
      {currentScreen === 'home' && (
        <Home
          onSelectImage={handleSelectImage}
          onSelectSample={handleSelectSample}
          onNavigate={handleNavigate}
          recentImages={recentImages}
          onSelectRecent={handleSelectRecent}
          onDeleteRecent={handleDeleteRecent}
          onClearRecent={handleClearRecents}
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
          models={models}
          activeModelId={activeModelId}
          onSelectModel={handleSelectModel}
          onSelectImage={handleSelectImage}
          onSelectSample={handleSelectSample}
          recentImages={recentImages}
          onSelectRecent={handleSelectRecent}
          onDeleteRecent={handleDeleteRecent}
          onClearRecent={handleClearRecents}
          isScanning={isScanning}
          reducedMotion={reducedMotion}
          onRemoveImage={handleRemoveImage}
          onNavigate={handleNavigate}
          showHintBar={showHintBar}
          onDismissHint={() => {
            try { localStorage.setItem('glance_hint_dismissed', 'true'); } catch (_err) { void _err; }
            setShowHintBar(false);
          }}
          showClientGuideCard={showClientGuideCard}
          onOpenClientGuide={() => setIsClientGuideModalOpen(true)}
          onDismissClientGuideCard={() => {
            try { localStorage.setItem('glance_client_guide_seen', 'true'); } catch (_err) { void _err; }
            setShowClientGuideCard(false);
          }}
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

      {/* 1-minute client guide modal */}
      <ClientGuideModal open={isClientGuideModalOpen} onOpenChange={setIsClientGuideModalOpen} />
    </Layout>
  );
};
