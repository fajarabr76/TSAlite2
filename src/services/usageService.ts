import { useAuth } from '../context/AuthContext';

export interface UsageContext {
  module: 'ketik' | 'pdkt' | 'telefun' | 'qa-analyzer';
  action: string;
}

export const logAiUsage = async (
  userId: string,
  provider: 'gemini' | 'openrouter',
  modelId: string,
  usageContext: UsageContext,
  tokens: { input: number; output: number },
  requestId: string
) => {
  try {
    const response = await fetch('/api/billing/log-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        provider,
        modelId,
        module: usageContext.module,
        action: usageContext.action,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        requestId,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('[UsageService] Failed to log usage:', error);
    return null;
  }
};

export const getUsageBulanIni = async (userId: string, module?: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  const url = `/api/billing/usage?userId=${userId}&month=${month}&year=${year}${module ? `&module=${module}` : ''}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Aggregate data
    const summary = data.reduce((acc: any, curr: any) => {
      acc.inputTokens += curr.input_tokens;
      acc.outputTokens += curr.output_tokens;
      acc.totalTokens += curr.total_tokens;
      acc.totalCostIdr += curr.estimated_cost_idr;
      acc.successCalls += 1;
      return acc;
    }, {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCostIdr: 0,
      successCalls: 0
    });
    
    return summary;
  } catch (error) {
    console.error('[UsageService] Failed to fetch monthly usage:', error);
    return null;
  }
};
