import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './src/lib/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/billing/usage', (req, res) => {
    const { userId, month, year, module } = req.query;
    
    // Default to current month/year in WIB if not provided
    // For now we use UTC as proxy, but in reality we should handle offset
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);
    
    const monthStr = String(currentMonth).padStart(2, '0');
    const prefix = `${currentYear}-${monthStr}`;

    let query = 'SELECT * FROM ai_usage_logs WHERE created_at LIKE ?';
    const params = [`${prefix}%`];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId as string);
    }

    if (module) {
      query += ' AND module = ?';
      params.push(module as string);
    }

    try {
      const logs = db.prepare(query).all(...params);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch usage logs' });
    }
  });

  app.post('/api/billing/log-usage', (req, res) => {
    const { 
      userId, provider, modelId, module, action, 
      inputTokens, outputTokens, requestId 
    } = req.body;

    if (!userId || !modelId || !requestId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Normalize Model ID
      const normalizedModelId = normalizeModelId(modelId);

      // Get Pricing
      const pricing = db.prepare('SELECT * FROM ai_pricing_settings WHERE model_id = ?').get(normalizedModelId) as any;
      
      const inputPrice = pricing?.input_price_usd_per_million || 0;
      const outputPrice = pricing?.output_price_usd_per_million || 0;

      // Get Exchange Rate
      const rateSetting = db.prepare('SELECT value FROM ai_billing_settings WHERE key = ?').get('usd_to_idr_rate') as any;
      const rate = parseFloat(rateSetting?.value || '16000');

      const totalTokens = inputTokens + outputTokens;
      const costUsd = (inputTokens * inputPrice / 1000000) + (outputTokens * outputPrice / 1000000);
      const costIdr = costUsd * rate;

      const stmt = db.prepare(`
        INSERT INTO ai_usage_logs (
          user_id, provider, model_id, module, action, 
          input_tokens, output_tokens, total_tokens, 
          input_price_usd_per_million, output_price_usd_per_million, 
          usd_to_idr_rate, estimated_cost_usd, estimated_cost_idr, 
          request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId, provider, normalizedModelId, module, action,
        inputTokens, outputTokens, totalTokens,
        inputPrice, outputPrice,
        rate, costUsd, costIdr,
        requestId
      );

      res.status(201).json({ success: true, costIdr });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Duplicate request' });
      }
      res.status(500).json({ error: 'Failed to log usage' });
    }
  });

  app.get('/api/billing/settings', (req, res) => {
    try {
      const pricing = db.prepare('SELECT * FROM ai_pricing_settings').all();
      const billing = db.prepare('SELECT * FROM ai_billing_settings').all();
      res.json({ pricing, billing });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/billing/settings/pricing', (req, res) => {
    const { modelId, inputPrice, outputPrice } = req.body;
    try {
      db.prepare(`
        INSERT OR REPLACE INTO ai_pricing_settings (model_id, input_price_usd_per_million, output_price_usd_per_million, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(modelId, inputPrice, outputPrice);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  });

  app.post('/api/billing/settings/rate', (req, res) => {
    const { rate } = req.body;
    try {
      db.prepare(`
        INSERT OR REPLACE INTO ai_billing_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run('usd_to_idr_rate', String(rate));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update rate' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function normalizeModelId(id: string): string {
  const model = id.toLowerCase();
  if (model.includes('gemini-3.1-flash')) return 'gemini-3.1-flash-live-preview';
  if (model.includes('gemini-3-flash')) return 'gemini-3-flash-preview';
  if (model.includes('gemini-1.5-flash') || model.includes('gemini-2.0-flash')) return 'gemini-1.5-flash';
  if (model.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
  if (model.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (model.includes('gpt-4o')) return 'gpt-4o';
  return model;
}

startServer();
