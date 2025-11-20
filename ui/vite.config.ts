import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Use relative paths for file:// protocol
    build: {
        assetsInlineLimit: 100000000, // Inline all assets to avoid CORS issues with file://
        rollupOptions: {
            output: {
                inlineDynamicImports: true, // Inline all dynamic imports
            }
        }
    }
})
