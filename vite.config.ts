import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/graphql': {
        target: 'https://api.santiment.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/graphql/, '/graphql'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/.netlify/functions/santiment-proxy': {
        target: 'https://api.santiment.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/.netlify\/functions\/santiment-proxy/, '/graphql'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('santiment-proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Santiment:', req.method, req.url);
            // Add API key header if available in environment
            if (process.env.VITE_SANTIMENT_API_KEY) {
              proxyReq.setHeader('Authorization', `Apikey ${process.env.VITE_SANTIMENT_API_KEY}`);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Santiment:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
