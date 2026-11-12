import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const web = mode === 'web' || loadEnv(mode, process.cwd()).VITE_GLANCE_TARGET === 'web' || process.env.VITE_GLANCE_TARGET === 'web';
  return {
  plugins: [react(), {
    name: 'web-metadata',
    transformIndexHtml: html => !web ? html : html.replace(/<title>.*?<\/title>/, `<title>Free AI attention heatmap — try in your browser | Glance</title>
    <meta name="description" content="Create free AI attention heatmaps in your browser with UNISAL. Compare designs, inspect gaze order, and try the squint test. Images stay on your device.">
    <link rel="canonical" href="https://cgsudo.github.io/glance-attention/app/">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Glance","url":"https://cgsudo.github.io/glance-attention/app/","applicationCategory":"DesignApplication","operatingSystem":"Web browser","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}</script>`),
  }],
  base: web ? '/glance-attention/app/' : '/',
  define: web ? { 'import.meta.env.VITE_GLANCE_TARGET': JSON.stringify('web') } : {},
  build: web ? { outDir: '../../docs/app', emptyOutDir: true } : {},
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm'],
    alias: { '@glance/web': fileURLToPath(new URL(web ? './src/api/web.ts' : './src/api/browser-disabled.ts', import.meta.url)) },
  },
  worker: { format: 'es' },
  server: {
    port: 5173,
    host: true,
  },
};
});
