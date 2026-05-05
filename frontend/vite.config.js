import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
function resolvePublicAppHost(publicAppUrl) {
    if (!publicAppUrl) {
        return undefined;
    }
    try {
        return new URL(publicAppUrl).hostname;
    }
    catch (_a) {
        return undefined;
    }
}
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var publicAppUrl = (_b = env.VITE_PUBLIC_APP_URL) === null || _b === void 0 ? void 0 : _b.trim();
    var publicAppHost = resolvePublicAppHost(publicAppUrl);
    var backendProxyTarget = ((_c = env.VITE_BACKEND_PROXY_TARGET) === null || _c === void 0 ? void 0 : _c.trim()) || 'http://localhost:3000';
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
                    rewrite: function (path) { return path.replace(/^\/api/, ''); },
                },
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (!id.includes('node_modules')) {
                            return undefined;
                        }
                        if (id.includes('react-dom') || id.includes('/react/')) {
                            return 'react-vendor';
                        }
                        if (id.includes('@supabase')) {
                            return 'supabase-vendor';
                        }
                        if (id.includes('/antd/') ||
                            id.includes('/@ant-design/') ||
                            id.includes('/rc-')) {
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
