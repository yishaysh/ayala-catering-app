import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAdminOrders } from '../../server/handlers/adminHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handleAdminOrders);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
