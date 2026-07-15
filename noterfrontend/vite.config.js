import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path' // 1. Import path module

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // 2. Add path alias support for Chakra UI snippets
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
