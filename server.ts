import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './src/lib/db.js';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import WebSocket, { WebSocketServer } from 'ws';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { model, contents, systemInstruction, responseMimeType, temperature } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing on the server' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction,
          responseMimeType,
          temperature,
        }
      });
      
      res.json({ text: result.text, usageMetadata: result.usageMetadata, candidates: result.candidates });
    } catch (error: any) {
      console.error('[Server] Gemini generateContent failed:', error);
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  });

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
      inputTokens, outputTokens, requestId, durationSeconds
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
      const inputPricePerMin = pricing?.input_price_usd_per_minute ?? 0.005;
      const outputPricePerMin = pricing?.output_price_usd_per_minute ?? 0.018;

      // Get Exchange Rate
      const rateSetting = db.prepare('SELECT value FROM ai_billing_settings WHERE key = ?').get('usd_to_idr_rate') as any;
      const rate = parseFloat(rateSetting?.value || '16000');

      let costUsd = 0;
      if (durationSeconds) {
        const durationMin = durationSeconds / 60;
        costUsd = (durationMin * inputPricePerMin) + (durationMin * outputPricePerMin);
      } else {
        costUsd = (inputTokens * inputPrice / 1000000) + (outputTokens * outputPrice / 1000000);
      }
      
      const costIdr = costUsd * rate;

      const stmt = db.prepare(`
        INSERT INTO ai_usage_logs (
          user_id, provider, model_id, module, action, 
          input_tokens, output_tokens, total_tokens, 
          input_price_usd_per_million, output_price_usd_per_million, 
          usd_to_idr_rate, estimated_cost_usd, estimated_cost_idr, 
          duration_seconds, request_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId, provider, normalizedModelId, module, action,
        inputTokens || 0, outputTokens || 0, (inputTokens || 0) + (outputTokens || 0),
        inputPrice, outputPrice,
        rate, costUsd, costIdr,
        durationSeconds || null, requestId
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

  // App Settings Routes
  app.get('/api/settings/:module/:userId', (req, res) => {
    const { module, userId } = req.params;
    try {
      const row = db.prepare('SELECT settings_json FROM app_settings WHERE module = ? AND user_id = ?').get(module, userId) as any;
      if (row) {
        res.json(JSON.parse(row.settings_json));
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings/:module/:userId', (req, res) => {
    const { module, userId } = req.params;
    const settings = req.body;
    try {
      const settingsJson = JSON.stringify(settings);
      db.prepare(`
        INSERT OR REPLACE INTO app_settings (user_id, module, settings_json, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(userId, module, settingsJson);
      res.json({ success: true });
    } catch (error) {
      console.error('[Server] Failed to save settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Removed /api/config/api-key route for security
  
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    if (request.url?.startsWith('/api/gemini/live-ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          ws.close(1008, "API Key missing on server");
          return;
        }

        const urlParams = new URLSearchParams(request.url?.split('?')[1] || "");
        const modelParam = urlParams.get('model') || 'gemini-3.1-flash-live-preview';
        
        const targetUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        const targetWs = new WebSocket(targetUrl);
        const messageQueue: { msg: any; isBinary: boolean }[] = [];

        targetWs.on('open', () => {
          console.log('[WSS] Connected to Google Gemini Live API. Flushing queued messages:', messageQueue.length);
          while (messageQueue.length > 0) {
            const item = messageQueue.shift();
            if (item) {
              targetWs.send(item.msg, { binary: item.isBinary });
            }
          }
        });

        ws.on('message', (msg, isBinary) => {
          let finalData = msg;
          if (!isBinary) {
            try {
              const text = msg.toString();
              if (text.trim().startsWith('{')) {
                const parsed = JSON.parse(text);
                if (parsed.setup && parsed.setup.model) {
                  const originalModel = parsed.setup.model;
                  // Support newer models and only remap discontinued/deprecated models like gemini-2.0-flash-exp
                  if (originalModel.includes('gemini-2.0-flash-exp') || originalModel.includes('gemini-1.5')) {
                    parsed.setup.model = 'models/gemini-3.1-flash-live-preview';
                    console.log(`[WSS] Intercepted setup message. Remapped discontinued model from "${originalModel}" to "models/gemini-3.1-flash-live-preview"`);
                  } else {
                    console.log(`[WSS] Client requested model: "${originalModel}". Keeping it.`);
                  }
                  finalData = JSON.stringify(parsed);
                }
              }
            } catch (err) {
              console.error('[WSS] Failed to parse setup message for intercept:', err);
            }
          }

          if (targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(finalData, { binary: isBinary });
          } else {
            messageQueue.push({ msg: finalData, isBinary });
          }
        });

        targetWs.on('message', (msg, isBinary) => {
           if (ws.readyState === ws.OPEN) ws.send(msg, { binary: isBinary });
        });

        ws.on('close', () => {
           if (targetWs.readyState === targetWs.OPEN) targetWs.close();
        });
        targetWs.on('close', (code, reason) => {
           console.log(`[WSS] Google GenAI connection closed with code ${code}, reason: ${reason}`);
           if (ws.readyState === ws.OPEN) ws.close(code, reason);
        });
        
        targetWs.on('error', (err) => {
          console.error('[WSS] Target Google GenAI error:', err);
        });
      });
    }
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
