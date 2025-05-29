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
 * Save Prompt Request Parameters
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

/**
 * Generate System Prompt
 * @param params
 * @param savePrompt
 * @returns
 */
export const generatePrompt = async (params: GeneratePromptParams, savePrompt: boolean = false): Promise<string> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.prompt.generate}?save_prompt=${savePrompt}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '生成提示词失败');
    }

    const data = await response.json();
    return data.data || '';
  } catch (error) {
    console.error('生成提示词失败:', error);
    throw error;
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
 * Save System Prompt
 * @param params
 * @returns
 */
export const savePrompt = async (params: SavePromptParams): Promise<any> => {
  try {
    const response = await fetch(API_ENDPOINTS.prompt.save, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
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