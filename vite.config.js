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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.js'],
    css: false,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
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
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion')) {
            return 'vendor-mui';
          }
          if (id.includes('node_modules/@dnd-kit')) {
            return 'vendor-dnd';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
        },
      },
    },
  },
  // Tauri ile uyumluluk
  clearScreen: false,
  envPrefix: ['VITE_', 'REACT_APP_'],
  // CRA uyumluluğu: process.env.REACT_APP_* → import.meta.env.REACT_APP_*
  // Vitest bu değerleri global olarak eval ettiği için 'import.meta' orada hata verir.
  define: process.env.VITEST ? {} : {
    'process.env.REACT_APP_DEBUG': 'import.meta.env.REACT_APP_DEBUG',
    'process.env.REACT_APP_API_URL': 'import.meta.env.REACT_APP_API_URL',
    'process.env.REACT_APP_WS_URL': 'import.meta.env.REACT_APP_WS_URL',
    'process.env.REACT_APP_VERSION': 'import.meta.env.REACT_APP_VERSION',
    'process.env.REACT_APP_BUILD_DATE': 'import.meta.env.REACT_APP_BUILD_DATE',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  // .js dosyalarını JSX olarak işle (CRA projeleri için)
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.js$/,
    exclude: [],
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});