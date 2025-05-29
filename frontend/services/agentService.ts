import { API_ENDPOINTS } from './api';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'AgentFrontEnd/1.0',
  };
};

export const agentService = {
  // Run Agent and return ReadableStream
  async run(params: {
    query: string;
    conversation_id: number;
    is_set: boolean;
    history: Array<{ role: 'user' | 'assistant'; content: string; }>;
    minio_files?: Array<{
      object_name: string;
      name: string;
      type: string;
      size: number;
      url?: string;
      description?: string;
    }>;
  }): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(API_ENDPOINTS.agent.run, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  },
}; 