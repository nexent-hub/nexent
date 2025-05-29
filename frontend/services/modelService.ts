"use client"

import { ModelOption, ModelType, SingleModelConfig, ModelConnectStatus } from '../types/config'
import { API_ENDPOINTS } from './api'

// API响应类型
interface ApiResponse<T = any> {
  code: number
  message?: string
  data?: T
}

// 错误类
export class ModelError extends Error {
  constructor(message: string, public code?: number) {
    super(message)
    this.name = 'ModelError'
    // Override the stack property to only return the message
    Object.defineProperty(this, 'stack', {
      get: function() {
        return this.message
      }
    })
  }

  // Override the toString method to only return the message
  toString() {
    return this.message
  }
}

// Helper function to get authorization headers
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Model service
export const modelService = {
  // Get official model list
  getOfficialModels: async (): Promise<ModelOption[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.modelEngine.officialModelList, {
        headers: getHeaders()
      })
      const result: ApiResponse<any[]> = await response.json()
      
      if (result.code === 200 && result.data) {
        const modelOptions: ModelOption[] = []
        const typeMap: Record<string, ModelType> = {
          embed: "embedding",
          chat: "llm",
          asr: "stt",
          tts: "tts",
          rerank: "rerank",
          vlm: "vlm"
        }

        for (const model of result.data) {
          if (typeMap[model.type]) {
            modelOptions.push({
              name: model.id,
              type: typeMap[model.type],
              maxTokens: 0,
              source: "official",
              apiKey: model.api_key,
              apiUrl: model.base_url,
              displayName: model.id
            })
          }
        }

        return modelOptions
      }
      // If API call was not successful, return empty array
      return []
    } catch (error) {
      // In case of any error, return empty array
      console.warn('Failed to load official models:', error)
      return []
    }
  },

  // Get custom model list
  getCustomModels: async (): Promise<ModelOption[]> => {
    try {
      const response = await fetch(API_ENDPOINTS.modelEngine.customModelList, {
        headers: getHeaders()
      })
      const result: ApiResponse<any[]> = await response.json()
      
      if (result.code === 200 && result.data) {
        return result.data.map(model => ({
          name: model.model_name,
          type: model.model_type as ModelType,
          maxTokens: model.max_tokens || 0,
          source: "custom",
          apiKey: model.api_key,
          apiUrl: model.base_url,
          displayName: model.display_name || model.model_name,
          connect_status: model.connect_status as ModelConnectStatus || "未检测"
        }))
      }
      // If API call was not successful, return empty array
      console.warn('Failed to load custom models:', result.message || 'Unknown error')
      return []
    } catch (error) {
      // In case of any error, return empty array
      console.warn('Failed to load custom models:', error)
      return []
    }
  },

  // Add custom model
  addCustomModel: async (model: {
    name: string
    type: ModelType
    url: string
    apiKey?: string
    maxTokens: number
    displayName?: string
  }): Promise<void> => {
    try {
      const response = await fetch(API_ENDPOINTS.modelEngine.customModelCreate, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          model_repo: "",
          model_name: model.name,
          model_type: model.type,
          base_url: model.url,
          api_key: model.apiKey,
          max_tokens: model.maxTokens,
          display_name: model.displayName
        })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.code !== 200) {
        throw new ModelError(result.message || '添加自定义模型失败', result.code)
      }
    } catch (error) {
      if (error instanceof ModelError) throw error
      throw new ModelError('添加自定义模型失败', 500)
    }
  },

  // Delete custom model
  deleteCustomModel: async (modelName: string): Promise<void> => {
    try {
      // Get local session information
      const response = await fetch(API_ENDPOINTS.modelEngine.customModelDelete, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          model_name: modelName
        })
      })
      
      const result: ApiResponse = await response.json()
      
      if (result.code !== 200) {
        throw new ModelError(result.message || '删除自定义模型失败', result.code)
      }
    } catch (error) {
      if (error instanceof ModelError) throw error
      throw new ModelError('删除自定义模型失败', 500)
    }
  },

  // Verify model connection status
  verifyModel: async (modelConfig: SingleModelConfig): Promise<boolean> => {
    try {
      if (!modelConfig.modelName) return false

      // Get official and custom model lists first
      const [officialModels, customModels] = await Promise.all([
        modelService.getOfficialModels(),
        modelService.getCustomModels()
      ])

      // Determine if the model is in the official model list
      const isOfficialModel = officialModels.some(model => model.name === modelConfig.modelName)

      // Select different verification interfaces based on the model source
      const endpoint = isOfficialModel 
        ? API_ENDPOINTS.modelEngine.officialModelHealthcheck(modelConfig.modelName, 2)
        : API_ENDPOINTS.modelEngine.customModelHealthcheck(modelConfig.modelName)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          ...(modelConfig.apiConfig?.apiKey && { 'X-API-KEY': modelConfig.apiConfig.apiKey })
        },
        body: modelConfig.apiConfig ? JSON.stringify({
          model_url: modelConfig.apiConfig.modelUrl
        }) : undefined
      })
      
      const result: ApiResponse<{connectivity: boolean}> = await response.json()
      
      if (result.code === 200 && result.data) {
        return result.data.connectivity
      }
      return false
    } catch (error) {
      return false
    }
  },

  // Verify custom model connection
  verifyCustomModel: async (modelName: string, signal?: AbortSignal): Promise<boolean> => {
    try {
      if (!modelName) return false

      // Call the health check API
      const response = await fetch(API_ENDPOINTS.modelEngine.customModelHealthcheck(modelName), {
        method: "GET",
        headers: getHeaders(),
        signal // Use AbortSignal if provided
      })
      
      const result: ApiResponse<{connectivity: boolean}> = await response.json()
      
      if (result.code === 200 && result.data) {
        return result.data.connectivity
      }
      return false
    } catch (error) {
      // Check if the error is due to the request being canceled
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`验证模型 ${modelName} 连接被取消`);
        // Re-throw the abort error so the caller knows the request was canceled
        throw error;
      }
      console.error(`验证模型 ${modelName} 连接失败:`, error)
      return false
    }
  },

  // Update model status to backend
  updateModelStatus: async (modelName: string, status: string): Promise<boolean> => {
    try {
      if (!modelName) {
        console.error('尝试更新状态时模型名为空');
        return false;
      }
      
      const response = await fetch(API_ENDPOINTS.modelEngine.updateConnectStatus, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          model_name: modelName,
          connect_status: status
        })
      });
      
      // Check HTTP status code
      if (!response.ok) {
        console.error(`更新模型状态HTTP错误，状态码: ${response.status}`);
        return false;
      }
      
      const result: ApiResponse = await response.json();
      
      if (result.code !== 200) {
        console.error('同步模型状态到数据库失败:', result.message);
        return false;
      } else {
        return true;
      }
    } catch (error) {
      console.error('同步模型状态到数据库出错:', error);
      return false;
    }
  },

  // Sync model list
  syncModels: async (): Promise<void> => {
    try {
      // Try to sync official models, but do not interrupt the process if it fails
      try {
        const officialResponse = await fetch(API_ENDPOINTS.modelEngine.officialModelList, {
          method: 'GET',
          headers: getHeaders()
        });
        
        const officialResult: ApiResponse = await officialResponse.json();
        
        if (officialResult.code !== 200) {
          console.error('同步ModelEngine模型失败:', officialResult.message || '未知错误');
        }
      } catch (officialError) {
        console.error('同步ModelEngine模型时发生错误:', officialError);
      }
      
      // Sync custom models, must succeed, otherwise throw an error
      const customResponse = await fetch(API_ENDPOINTS.modelEngine.customModelList, {
        method: 'GET',
        headers: getHeaders()
      });
      
      const customResult: ApiResponse = await customResponse.json();
      
      if (customResult.code !== 200) {
        throw new ModelError(customResult.message || '同步自定义模型失败', customResult.code);
      }
      
    } catch (error) {
      if (error instanceof ModelError) throw error;
      throw new ModelError('同步模型失败', 500);
    }
  },

  // Convert ModelOption to SingleModelConfig
  convertToSingleModelConfig: (modelOption: ModelOption): SingleModelConfig => {
    const config: SingleModelConfig = {
      modelName: modelOption.name,
      displayName: modelOption.displayName || modelOption.name,
      apiConfig: modelOption.apiKey ? {
        apiKey: modelOption.apiKey,
        modelUrl: modelOption.apiUrl || '',
      } : undefined
    };
    
    // For embedding models, copy maxTokens to dimension
    if (modelOption.type === 'embedding' || modelOption.type === 'multi_embedding') {
      config.dimension = modelOption.maxTokens;
    }
    
    return config;
  }
} 