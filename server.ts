import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  formatGeminiError,
  runAnalyzeRecord,
  runAdvisor,
  runAiSearch,
} from './lib/archiveAi.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/archives/analyze-record', async (req, res) => {
  try {
    const parsed = await runAnalyzeRecord(req.body);
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error analyzing parish record:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error),
    });
  }
});

app.post('/api/archives/advisor', async (req, res) => {
  try {
    const result = await runAdvisor(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error in advisor endpoint:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error),
    });
  }
});

app.post('/api/archives/ai-search', async (req, res) => {
  try {
    const result = await runAiSearch(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error in ai-search endpoint:', error);
    res.status(500).json({
      success: false,
      error: formatGeminiError(error),
    });
  }
});

// Mount Vite or serve static files
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Rodokmen server běží na http://0.0.0.0:${PORT}`);
});
