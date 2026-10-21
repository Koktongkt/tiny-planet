// Smoke suite: headless Chromium on SwiftShader (no GPU), so everything is slow and timeouts are generous.
// npm run build && npm run test:smoke      (or BASE_URL=http://host:port/ to test an already-served build)
import { defineConfig, devices } from '@playwright/test'
const BASE = process.env.BASE_URL || 'http://localhost:4173/'
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
export default defineConfig({
  testDir: 'tests/smoke', timeout: 240_000, expect: { timeout: 60_000 }, workers: 1, fullyParallel: false,
  retries: process.env.CI ? 1 : 0, reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE, launchOptions: { args: GL }, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' }, testMatch: /mobile\.spec/ },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: 'npx vite preview --port 4173 --strictPort', url: BASE, reuseExistingServer: !process.env.CI, timeout: 60_000 },
})
