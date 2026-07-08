import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss()
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // Keep HMR enabled unless disabled explicitly
      hmr: process.env.DISABLE_HMR !== 'true',

      // Ignore backend/runtime files so Vite does not reload
      // when db.json changes
      watch: {
        ignored: [
          '**/data/**',
          '**/data/db.json',
          '**/server-data/**'
        ]
      },
    },
  };
});