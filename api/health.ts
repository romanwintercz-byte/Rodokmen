import { getConfiguredApiKey } from '../lib/archiveAi.ts';

export default function handler(_req: any, res: any) {
  res.status(200).json({
    ok: true,
    platform: 'vercel',
    hasApiKey: Boolean(getConfiguredApiKey()),
  });
}
