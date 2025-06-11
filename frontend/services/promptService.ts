import { API_ENDPOINTS } from './api';

/**
 * Prompt Generation Request Parameters
 */
export interface GeneratePromptParams {
  agent_id: number;
  task_description: string;
}

/**
 * Fine-tuning Prompt Request Parameters
 */
export interface FineTunePromptParams {
  agent_id: number;
  system_prompt: string;
  command: string;
}

/**
 * Save Prompt Request Parameters (using agent/update)
 */
export interface SavePromptParams {
  agent_id: number;
  prompt: string;
}

/**
 * Get Request Headers
 */
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'AgentFrontEnd/1.0',
  };
};

export const generatePromptStream = async (
  params: GeneratePromptParams,
  onData: (data: string) => void,
  onError?: (err: any) => void,
  onComplete?: () => void
) => {
  try {
    const response = await fetch(API_ENDPOINTS.prompt.generate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AgentFrontEnd/1.0',
      },
      body: JSON.stringify(params),
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.replace('data: ', ''));
            if (json.success) {
              onData(json.data);
            }
          } catch (e) {
            if (onError) onError(e);
          }
        }
      }
    }
    if (onComplete) onComplete();
  } catch (err) {
    if (onError) onError(err);
    if (onComplete) onComplete();
  }
};

/**
 * Fine-tuning System Prompt
 * @param params
 * @returns
 */
export const fineTunePrompt = async (params: FineTunePromptParams): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.prompt.fineTune, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '微调提示词失败');
    }

    const data = await response.json();
    return data.data || '';
  } catch (error) {
    console.error('微调提示词失败:', error);
    throw error;
  }
};

/**
 * Save System Prompt (using agent/update endpoint)
 * @param params
 * @returns
 */
export const savePrompt = async (params: SavePromptParams): Promise<any> => {
  try {
    const response = await fetch(API_ENDPOINTS.agent.update, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        agent_id: params.agent_id,
        prompt: params.prompt
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '保存提示词失败');
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('保存提示词失败:', error);
    throw error;
  }
}; 