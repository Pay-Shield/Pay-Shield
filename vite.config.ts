import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      watch: {
        // Every /api/transactions/analyze call appends to these audit-log
        // files in the project root. Without this, Vite's file watcher sees
        // each write and force-reloads the browser page mid-request, which
        // looks like the app "dying" the instant you submit a transaction.
        ignored: ['**/audit_chain*.jsonl', '**/legacy_audit_log*.jsonl'],
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});
