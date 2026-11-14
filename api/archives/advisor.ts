import { formatGeminiError, runAdvisor } from '../../lib/archiveAi.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const result = await runAdvisor(body);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in Vercel advisor endpoint:', error);
    return res.status(500).json({
      success: false,
      error: formatGeminiError(error),
    });
  }
}
