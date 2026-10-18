import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createSummaryHandler } from './server/summary.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const summary = createSummaryHandler(env.ASSEMBLYAI_API_KEY || '', env.ASSEMBLYAI_MODEL || 'claude-sonnet-4-6')
  return {
    server: {
      allowedHosts: ['jobs-thorough-dave-metabolism.trycloudflare.com'],
    },
    plugins: [react(), {
      name: 'presentation-coaching',
      configureServer(server) { server.middlewares.use(summary) },
      configurePreviewServer(server) { server.middlewares.use(summary) },
    }],
  }
})
