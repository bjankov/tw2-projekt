import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// One config for both Vite (dev/build/preview) and Vitest (unit tests).
export default defineConfig({
  plugins: [react()],
  test: {
    // Tests cover pure functions in src/logic, so no browser environment is needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
