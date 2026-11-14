import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAdminCatalog } from '../../server/handlers/adminHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handleAdminCatalog);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
