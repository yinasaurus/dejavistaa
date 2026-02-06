import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env file
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.html'),
          background: resolve(__dirname, 'src/background/background.js'),
          'content/gaze-tracker': resolve(__dirname, 'src/content/gaze-tracker.js'),
          'content/intent-scorer': resolve(__dirname, 'src/content/intent-scorer.js'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') return 'background/background.js';
            if (chunkInfo.name.includes('content/')) {
              return chunkInfo.name + '.js';
            }
            if (chunkInfo.name === 'sidepanel') {
              return 'sidepanel/[name].js';
            }
            return '[name].js';
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'sidepanel.html') {
              return 'sidepanel.html';
            }
            if (assetInfo.name && assetInfo.name.endsWith('.html')) {
              return '[name].[ext]';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
      copyPublicDir: true,
    },
    // Define environment variables for build-time replacement
    // Vite automatically exposes VITE_* variables via import.meta.env,
    // but we also define them explicitly to ensure they're available
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_VERCEL_API_URL': JSON.stringify(env.VITE_VERCEL_API_URL || 'https://dejavista.vercel.app'),
      'import.meta.env.DEV': JSON.stringify(mode === 'development'),
      'import.meta.env.PROD': JSON.stringify(mode === 'production'),
      'import.meta.env.MODE': JSON.stringify(mode),
    },
  };
});
