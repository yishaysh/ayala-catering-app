import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAdminUploadSignature } from '../../server/handlers/adminHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handleAdminUploadSignature);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
