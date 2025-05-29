// 重构：状态可以整合
// 模型状态类型
export type ModelStatus = "未校验" | "可用" | "不可用" | "可跳过"

// 模型连接状态类型
export type ModelConnectStatus = "未检测" | "检测中" | "可用" | "不可用"

// 模型来源类型
export type ModelSource = "official" | "custom"

// 模型类型
export type ModelType = "llm" | "embedding" | "rerank" | "stt" | "tts" | "vlm" | "multi_embedding"

// 配置存储键名
export const APP_CONFIG_KEY = 'app';
export const MODEL_CONFIG_KEY = 'model';
export const DATA_CONFIG_KEY = 'data';

// 默认配置
export const defaultConfig: GlobalConfig = {
  app: {
    appName: "智能问答",
    appDescription: "定制化智能问答助手，基于理解复杂问题并提供精准解答。支持知识检索、Agent配置，为您提供专业、高效的信息服务和决策支持。",
    iconType: "preset",
    customIconUrl: null,
    avatarUri: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20shape-rendering%3D%22auto%22%20width%3D%2230%22%20height%3D%2230%22%3E%3Cmetadata%20xmlns%3Ardf%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%22%20xmlns%3Axsi%3D%22http%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema-instance%22%20xmlns%3Adc%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%22%20xmlns%3Adcterms%3D%22http%3A%2F%2Fpurl.org%2Fdc%2Fterms%2F%22%3E%3Crdf%3ARDF%3E%3Crdf%3ADescription%3E%3Cdc%3Atitle%3EBootstrap%20Icons%3C%2Fdc%3Atitle%3E%3Cdc%3Acreator%3EThe%20Bootstrap%20Authors%3C%2Fdc%3Acreator%3E%3Cdc%3Asource%20xsi%3Atype%3D%22dcterms%3AURI%22%3Ehttps%3A%2F%2Fgithub.com%2Ftwbs%2Ficons%3C%2Fdc%3Asource%3E%3Cdcterms%3Alicense%20xsi%3Atype%3D%22dcterms%3AURI%22%3Ehttps%3A%2F%2Fgithub.com%2Ftwbs%2Ficons%2Fblob%2Fmain%2FLICENSE%3C%2Fdcterms%3Alicense%3E%3Cdc%3Arights%3E%E2%80%9EBootstrap%20Icons%E2%80%9D%20(https%3A%2F%2Fgithub.com%2Ftwbs%2Ficons)%20by%20%E2%80%9EThe%20Bootstrap%20Authors%E2%80%9D%2C%20licensed%20under%20%E2%80%9EMIT%E2%80%9D%20(https%3A%2F%2Fgithub.com%2Ftwbs%2Ficons%2Fblob%2Fmain%2FLICENSE)%3C%2Fdc%3Arights%3E%3C%2Frdf%3ADescription%3E%3C%2Frdf%3ARDF%3E%3C%2Fmetadata%3E%3Cmask%20id%3D%22viewboxMask%22%3E%3Crect%20width%3D%2224%22%20height%3D%2224%22%20rx%3D%2212%22%20ry%3D%2212%22%20x%3D%220%22%20y%3D%220%22%20fill%3D%22%23fff%22%20%2F%3E%3C%2Fmask%3E%3Cg%20mask%3D%22url(%23viewboxMask)%22%3E%3Crect%20fill%3D%22url(%23backgroundLinear)%22%20width%3D%2224%22%20height%3D%2224%22%20x%3D%220%22%20y%3D%220%22%20%2F%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22backgroundLinear%22%20gradientTransform%3D%22rotate(196%200.5%200.5)%22%3E%3Cstop%20stop-color%3D%22%232689cb%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%234226cb%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3Cg%20transform%3D%22translate(2.4000000000000004%202.4000000000000004)%20scale(0.8)%22%3E%3Cg%20transform%3D%22translate(4%204)%22%3E%3Cpath%20d%3D%22M11.742%2010.344a6.5%206.5%200%201%200-1.397%201.398h-.001c.03.04.062.078.098.115l3.85%203.85a1%201%200%200%200%201.415-1.414l-3.85-3.85a1.012%201.012%200%200%200-.115-.1v.001ZM12%206.5a5.5%205.5%200%201%201-11%200%205.5%205.5%200%200%201%2011%200Z%22%20fill%3D%22%23fff%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E"
  },
  models: {
    llm: {
      modelName: "",
      displayName: "",
      apiConfig: {
        apiKey: "",
        modelUrl: ""
      }
    },
    llmSecondary: {
      modelName: "",
      displayName: "",
      apiConfig: {
        apiKey: "",
        modelUrl: ""
      }
    },
    embedding: {
      modelName: "",
      displayName: "",
      apiConfig: {
        apiKey: "",
        modelUrl: "",
      },
      dimension: 0
    },
    multiEmbedding: {
      modelName: "",
      displayName: "",
      apiConfig: {
        apiKey: "",
        modelUrl: "",
      },
      dimension: 0
    },
    rerank: {
      modelName: "",
      displayName: ""
    },
    vlm: {
      modelName: "",
      displayName: "",
      apiConfig: {
        apiKey: "",
        modelUrl: ""
      }
    },
    stt: {
      modelName: "",
      displayName: ""
    },
    tts: {
      modelName: "",
      displayName: ""
    }
  },
  data: {
    selectedKbNames: [],
    selectedKbModels: [],
    selectedKbSources: []
  }
};

// 模型选项接口
export interface ModelOption {
  name: string
  type: ModelType
  maxTokens: number
  source: ModelSource
  apiKey?: string
  apiUrl?: string
  displayName?: string
  connect_status?: ModelConnectStatus
}

// 应用配置接口
export interface AppConfig {
  appName: string
  appDescription: string
  iconType: "preset" | "custom"
  customIconUrl: string | null
  avatarUri: string | null
}

// 重构：整合一下
// 模型API配置接口
export interface ModelApiConfig {
  apiKey: string
  modelUrl: string
}

// 单个模型配置接口
export interface SingleModelConfig {
  modelName: string
  displayName: string
  apiConfig?: ModelApiConfig
  dimension?: number  // 只用于 embedding 和 multiEmbedding 模型
}

// 模型配置接口
export interface ModelConfig {
  llm: SingleModelConfig
  llmSecondary: SingleModelConfig
  embedding: SingleModelConfig
  multiEmbedding: SingleModelConfig
  rerank: SingleModelConfig
  vlm: SingleModelConfig
  stt: SingleModelConfig
  tts: SingleModelConfig
}

// 知识库配置接口
export interface KnowledgeBaseConfig {
  selectedKbNames: string[]
  selectedKbModels: string[]
  selectedKbSources: string[]
}

// 全局配置接口
export interface GlobalConfig {
  app: AppConfig
  models: ModelConfig
  data: KnowledgeBaseConfig
} 
