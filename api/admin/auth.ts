import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAdminAuth } from '../../server/handlers/adminHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handleAdminAuth);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
