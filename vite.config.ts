import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { ayalaApiVitePlugin } from './server/devPlugin.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load server-only env vars into Node process for /api dev middleware only; never forward secrets into client define.
  const serverEnv = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(serverEnv)) {
    if (!process.env[k] && v !== undefined) {
      process.env[k] = v
    }
  }

  return {
    envPrefix: 'AYALA_PUBLIC_',
    plugins: [react(), ayalaApiVitePlugin()],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-icons': ['lucide-react'],
            'vendor-state': ['zustand'],
          }
        }
      }
    }
  }
})
