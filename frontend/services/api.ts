const API_BASE_URL = '/api';
const UPLOAD_SERVICE_URL = '/api/file';

export const API_ENDPOINTS = {
  conversation: {
    list: `${API_BASE_URL}/conversation/list`,
    create: `${API_BASE_URL}/conversation/create`,
    save: `${API_BASE_URL}/conversation/save`,
    rename: `${API_BASE_URL}/conversation/rename`,
    detail: (id: number) => `${API_BASE_URL}/conversation/${id}`,
    delete: (id: number) => `${API_BASE_URL}/conversation/${id}`,
    generateTitle: `${API_BASE_URL}/conversation/generate_title`,
    sources: `${API_BASE_URL}/conversation/sources`,
    opinion: `${API_BASE_URL}/conversation/message/update_opinion`,
    messageId: `${API_BASE_URL}/conversation/message/id`,
  },
  agent: {
    run: `${API_BASE_URL}/agent/run`,
  },
  prompt: {
    generate: `${API_BASE_URL}/prompt/generate`,
    fineTune: `${API_BASE_URL}/prompt/fine_tune`,
    save: `${API_BASE_URL}/prompt/save`,
  },
  stt: {
    ws: `/api/voice/stt/ws`,
  },
  tts: {
    ws: `/api/voice/tts/ws`,
  },
  storage: {
    upload: `${UPLOAD_SERVICE_URL}/storage`,
    files: `${UPLOAD_SERVICE_URL}/storage`,
    file: (objectName: string) => `${UPLOAD_SERVICE_URL}/storage/${objectName}`,
    delete: (objectName: string) => `${UPLOAD_SERVICE_URL}/storage/${objectName}`,
    preprocess: `${UPLOAD_SERVICE_URL}/preprocess`,
  },
  proxy: {
    image: (url: string) => `${API_BASE_URL}/image?url=${encodeURIComponent(url)}`,
  },
  modelEngine: {
    // Basic health check
    healthcheck: `${API_BASE_URL}/me/healthcheck`,
    
    // Official model service
    officialModelList: `${API_BASE_URL}/me/model/list`,
    officialModelHealthcheck: (modelName: string, timeout: number = 2) => 
      `${API_BASE_URL}/me/model/healthcheck?model_name=${encodeURIComponent(modelName)}&timeout=${timeout}`,
      
    // Custom model service
    customModelList: `${API_BASE_URL}/model/list`,
    customModelCreate: `${API_BASE_URL}/model/create`,
    customModelDelete: `${API_BASE_URL}/model/delete`,
    customModelHealthcheck: (modelName: string) => 
      `${API_BASE_URL}/model/healthcheck?model_name=${encodeURIComponent(modelName)}`,
    updateConnectStatus: `${API_BASE_URL}/model/update_connect_status`,
  },
  knowledgeBase: {
    // Elasticsearch service
    health: `${API_BASE_URL}/indices/health`,
    indices: `${API_BASE_URL}/indices`,
    indexInfo: (indexName: string) => `${API_BASE_URL}/indices/${indexName}/info`,
    indexDetail: (indexName: string) => `${API_BASE_URL}/indices/${indexName}`,
    summary: (indexName: string) => `${API_BASE_URL}/summary/${indexName}/auto_summary`,
    changeSummary: (indexName: string) => `${API_BASE_URL}/summary/${indexName}/summary`,
    getSummary: (indexName: string) => `${API_BASE_URL}/summary/${indexName}/summary`,
    
    // File upload service
    upload: `${UPLOAD_SERVICE_URL}/upload`,
  },
  config: {
    save: `${API_BASE_URL}/config/save_config`,
    load: `${API_BASE_URL}/config/load_config`,
  }
};

// Common error handling
export class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Add global interface extensions for TypeScript
declare global {
  interface Window {
    __isHandlingSessionExpired?: boolean;
  }
}