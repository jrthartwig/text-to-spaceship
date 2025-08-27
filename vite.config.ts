import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure modern build target aligned with Node 20 during SSR transforms used in asset hashing
  build: {
    target: 'es2022',
    assetsDir: 'assets'
  },
})
