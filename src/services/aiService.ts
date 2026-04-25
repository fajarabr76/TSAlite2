import { GoogleGenAI } from '@google/genai';
import { logAiUsage, UsageContext } from './usageService';

interface GeminiCallParams {
  apiKey: string;
  model: string;
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  userId?: string;
  usageContext: UsageContext;
}

export const generateGeminiContent = async (params: GeminiCallParams) => {
  const { apiKey, model, contents, systemInstruction, responseMimeType, temperature, userId, usageContext } = params;
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType,
        temperature,
      }
    });
    const { text, usageMetadata } = result;
    
    // Log Usage
    let usageResult = null;
    if (usageMetadata && userId) {
      usageResult = await logAiUsage(
        userId,
        'gemini',
        model,
        usageContext,
        {
          input: usageMetadata.promptTokenCount,
          output: usageMetadata.candidatesTokenCount
        },
        `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );
    }

    return { response: result, usageResult };
  } catch (error) {
    console.error('[AiService] Gemini generateContent failed:', error);
    throw error;
  }
};

interface OpenRouterCallParams {
  apiKey: string;
  model: string;
  messages: any[];
  max_tokens?: number;
  userId?: string;
  usageContext: UsageContext;
}

export const generateOpenRouterContent = async (params: OpenRouterCallParams) => {
  const { apiKey, model, messages, max_tokens, userId, usageContext } = params;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
      }),
    });

    const data = await response.json();
    
    // Log Usage
    let usageResult = null;
    if (data.usage && userId) {
      usageResult = await logAiUsage(
        userId,
        'openrouter',
        model,
        usageContext,
        {
          input: data.usage.prompt_tokens,
          output: data.usage.completion_tokens
        },
        data.id || `or-${Date.now()}`
      );
    }

    return { data, usageResult };
  } catch (error) {
    console.error('[AiService] OpenRouter call failed:', error);
    throw error;
  }
};
