import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Projedeki .js dosyaları JSX içeriyor (CRA'dan kalma)
      include: '**/*.js',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-xlsx': ['xlsx'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', 'react-dnd', 'react-dnd-html5-backend'],
        },
      },
    },
  },
  // Tauri ile uyumluluk
  clearScreen: false,
  envPrefix: ['VITE_', 'REACT_APP_'],
  // CRA uyumluluğu: process.env.REACT_APP_* → import.meta.env.REACT_APP_*
  define: {
    'process.env.REACT_APP_DEBUG': 'import.meta.env.REACT_APP_DEBUG',
    'process.env.REACT_APP_API_URL': 'import.meta.env.REACT_APP_API_URL',
    'process.env.REACT_APP_WS_URL': 'import.meta.env.REACT_APP_WS_URL',
    'process.env.REACT_APP_VERSION': 'import.meta.env.REACT_APP_VERSION',
    'process.env.REACT_APP_BUILD_DATE': 'import.meta.env.REACT_APP_BUILD_DATE',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // .js dosyalarını JSX olarak işle (CRA projeleri için)
  esbuild: {
    include: /\.js$/,
    exclude: /node_modules/,
    loader: 'jsx',
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});