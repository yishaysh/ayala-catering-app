import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePublicTelemetry } from '../../server/handlers/publicHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handlePublicTelemetry);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
