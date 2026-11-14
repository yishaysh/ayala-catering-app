// Vite dev-server API middleware so local dev & E2E tests execute exact serverless handlers under /api/*.

import type { Plugin, ViteDevServer } from 'vite';
import {
  handleAdminAuth,
  handleAdminCatalog,
  handleAdminOrders,
  handleAdminSettings,
  handleAdminUploadSignature,
} from './handlers/adminHandlers.js';
import {
  handleCouponCheck,
  handlePublicAiMenu,
  handlePublicBootstrap,
  handlePublicQuoteEndpoint,
  handlePublicReviewsEndpoint,
  handlePublicTelemetry,
  type HandlerDeps,
} from './handlers/publicHandlers.js';
import { sendJson, type ApiRequestLike, type ApiResponseLike } from './http.js';
import { getRuntimeDeps } from './runtime.js';

type RouteFn = (req: ApiRequestLike, res: ApiResponseLike, deps: HandlerDeps) => Promise<void>;

export const API_ROUTES: Record<string, RouteFn> = {
  '/api/public/bootstrap': handlePublicBootstrap,
  '/api/public/coupon': handleCouponCheck,
  '/api/public/quote': handlePublicQuoteEndpoint,
  '/api/public/reviews': handlePublicReviewsEndpoint,
  '/api/public/ai-menu': handlePublicAiMenu,
  '/api/public/telemetry': handlePublicTelemetry,
  '/api/admin/auth': handleAdminAuth,
  '/api/admin/orders': handleAdminOrders,
  '/api/admin/catalog': handleAdminCatalog,
  '/api/admin/settings': handleAdminSettings,
  '/api/admin/upload-signature': handleAdminUploadSignature,
};

export function createApiRouterMiddleware(depsProvider: () => HandlerDeps) {
  return async (req: ApiRequestLike, res: ApiResponseLike, next: () => void) => {
    const rawUrl = req.url || '';
    const pathname = rawUrl.split('?')[0];
    const handler = API_ROUTES[pathname];
    if (!handler) {
      next();
      return;
    }
    try {
      const deps = depsProvider();
      await handler(req, res, deps);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server configuration error';
      sendJson(res, 500, { ok: false, code: 'SERVER_CONFIG_ERROR', error: message });
    }
  };
}

export function ayalaApiVitePlugin(overrideDeps?: () => HandlerDeps): Plugin {
  return {
    name: 'ayala-api-middleware',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        createApiRouterMiddleware(overrideDeps ?? (() => getRuntimeDeps(process.env)))
      );
    },
  };
}
