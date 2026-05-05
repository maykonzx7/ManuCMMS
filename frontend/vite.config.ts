import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function resolvePublicAppHost(publicAppUrl?: string) {
  if (!publicAppUrl) {
    return undefined;
  }

  try {
    return new URL(publicAppUrl).hostname;
  } catch {
    return undefined;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicAppUrl = env.VITE_PUBLIC_APP_URL?.trim();
  const publicAppHost = resolvePublicAppHost(publicAppUrl);
  const backendProxyTarget = env.VITE_BACKEND_PROXY_TARGET?.trim() || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: true,
      allowedHosts: publicAppHost ? [publicAppHost] : true,
      port: 5173,
      strictPort: true,
      hmr: publicAppHost
        ? {
            host: publicAppHost,
            protocol: 'wss',
            clientPort: 443,
          }
        : undefined,
      proxy: {
        '/api': {
          target: backendProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor';
            }

            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }

            if (
              id.includes('/antd/') ||
              id.includes('/@ant-design/') ||
              id.includes('/rc-')
            ) {
              return 'antd-vendor';
            }

            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }

            return undefined;
          },
        },
      },
    },
  };
});
