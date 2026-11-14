import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handlePublicAiMenu } from '../../server/handlers/publicHandlers.js';
import { withRuntimeHandler } from '../../server/runtime.js';

const handler = withRuntimeHandler(handlePublicAiMenu);
export default async function (req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
