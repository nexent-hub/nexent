import { API_ENDPOINTS, ApiError } from './api';
import type { 
  ConversationListResponse, 
  ConversationListItem,
  ApiConversationResponse
} from '@/types/conversation';

export interface STTResponse {
  result?: {
    text: string;
  };
  text?: string;
}

// Obtain the auxiliary functions and abnormal function functions of the authorization header for adaptation
export const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'AgentFrontEnd/1.0'
  };
};


export const conversationService = {
  // Get conversation list
  async getList(): Promise<ConversationListItem[]> {
    const response = await fetch(API_ENDPOINTS.conversation.list, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json() as ConversationListResponse;
    
    if (data.code === 0) {
      return data.data || [];
    }
    
    throw new ApiError(data.code, data.message);
  },

  // Create new conversation
  async create() {
    const response = await fetch(API_ENDPOINTS.conversation.create, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return data.data;
    }
    
    throw new ApiError(data.code, data.message);
  },

  // Rename conversation
  async rename(conversationId: number, name: string) {
    const response = await fetch(API_ENDPOINTS.conversation.rename, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        conversation_id: conversationId,
        name,
      }),
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return data.data;
    }
    
    throw new ApiError(data.code, data.message);
  },

  // Get conversation details
  async getDetail(conversationId: number, signal?: AbortSignal): Promise<ApiConversationResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.conversation.detail(conversationId), {
        method: 'GET',
        headers: getAuthHeaders(),
        signal,
      });

      // If the signal is aborted before the request returns, return early
      if (signal?.aborted) {
        return { code: -1, message: "请求已取消", data: [] };
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code === 0) {
        return data;
      }
      
      throw new ApiError(data.code, data.message);
    } catch (error: any) {
      // If the error is caused by canceling the request, return a specific response instead of throwing an error
      if (error instanceof Error && error.name === 'AbortError' || signal?.aborted) {
        return { code: -1, message: "请求已取消", data: [] };
      }
      throw error;
    }
  },

  // Delete conversation
  async delete(conversationId: number) {
    const response = await fetch(API_ENDPOINTS.conversation.delete(conversationId), {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return true;
    }
    
    throw new ApiError(data.code, data.message);
  },

  // STT related functionality
  stt: {
    // Create WebSocket connection
    createWebSocket(): WebSocket {
      return new WebSocket(API_ENDPOINTS.stt.ws);
    },

    // Process audio data
    processAudioData(inputData: Float32Array): Int16Array {
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      return pcmData;
    },

    // Get audio configuration
    getAudioConstraints() {
      return {
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      };
    },

    // Get audio context configuration
    getAudioContextOptions() {
      return {
        sampleRate: 16000,
      };
    }
  },

  // Add TTS related functionality
  tts: {
    // Create WebSocket connection
    createWebSocket(): WebSocket {
      return new WebSocket(API_ENDPOINTS.tts.ws);
    },
  },

  // Add file preprocess method
  async preprocessFiles(query: string, files: File[], signal?: AbortSignal): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    try {
      // Use FormData to handle file upload
      const formData = new FormData();
      formData.append('query', query);

      // Add files
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await fetch(API_ENDPOINTS.storage.preprocess, {
        method: 'POST',
        body: formData,
        signal,
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      return response.body.getReader();
    } catch (error) {
      // If the error is caused by canceling the request, return a specific response instead of throwing an error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('文件预处理请求已被取消');
        throw new Error('请求已被取消');
      }
      // Other errors are thrown normally
      throw error;
    }
  },

  // Add run agent method
  async runAgent(params: {
    query: string;
    conversation_id: number;
    is_set: boolean;
    history: Array<{ role: string; content: string; }>;
    files?: File[];  // Add optional files parameter
    minio_files?: Array<{
      object_name: string;
      name: string;
      type: string;
      size: number;
      url?: string;
      description?: string; // Add file description field
    }>; // Update to complete attachment information object array
    agent_id?: number; // Add agent_id parameter
    is_debug?: boolean; // Add debug mode parameter
  }, signal?: AbortSignal) {
    try {
      // Construct request parameters
      const requestParams: any = {
        query: params.query,
        conversation_id: params.conversation_id,
        is_set: params.is_set,
        history: params.history,
        minio_files: params.minio_files || null,
        is_debug: params.is_debug || false,
      };
      
      // Only include agent_id if it has a value
      if (params.agent_id !== undefined && params.agent_id !== null) {
        requestParams.agent_id = params.agent_id;
      }

      const response = await fetch(API_ENDPOINTS.agent.run, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestParams),
        signal,
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      return response.body.getReader();
    } catch (error: any) {
      // If the error is caused by canceling the request, return a specific response instead of throwing an error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Agent请求已被取消');
        throw new Error('请求已被取消');
      }
      // Other errors are thrown normally
      throw error;
    }
  },

  // Get message source (image and search)
  async getSources(params: {
    conversation_id?: number;
    message_id?: number;
    type?: 'all' | 'image' | 'search';
  }) {
    try {
      const response = await fetch(API_ENDPOINTS.conversation.sources, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data.code === 0) {
        return data.data;
      }

      throw new ApiError(data.code, data.message);
    } catch (error: any) {
      console.error('获取消息来源失败:', error);
      throw error;
    }
  },

  // Generate conversation title
  async generateTitle(params: {
    conversation_id: number;
    history: Array<{ role: 'user' | 'assistant'; content: string; }>;
  }) {
    const response = await fetch(API_ENDPOINTS.conversation.generateTitle, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (data.code === 0) {
      return data.data;
    }

    throw new ApiError(data.code, data.message);
  },

  // Save message
  async saveMessage(params: {
    conversation_id: number;
    message_idx: string;
    role: "user" | "assistant";
    message: any[];
    minio_files?: Array<{
      object_name: string;
      name: string;
      type: string;
      size: number;
      url?: string;
    }>;
  }) {
    const response = await fetch(API_ENDPOINTS.conversation.save, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return data.data;
    }
    
    throw new ApiError(data.code, data.message);
  },

  // Like/dislike message
  async updateOpinion(params: { message_id: number; opinion: 'Y' | 'N' | null }) {
    const response = await fetch(API_ENDPOINTS.conversation.opinion, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await response.json();
    if (data.code === 0) {
      return true;
    }
    throw new ApiError(data.code, data.message);
  },

  // Get message_id by conversationId and messageIndex
  async getMessageId(conversationId: number, messageIndex: number) {
    const response = await fetch(API_ENDPOINTS.conversation.messageId, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message_index: messageIndex
      })
    });

    const data = await response.json();
    
    if (data.code === 0) {
      return data.data;
    }
    
    throw new ApiError(data.code, data.message);
  },
}; 