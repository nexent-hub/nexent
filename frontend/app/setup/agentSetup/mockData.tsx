"use client";
import { Tool, Agent } from './ConstInterface';

// 模拟工具数据
export const mockTools: Tool[] = [
  {
    id: '1',
    name: '网络搜索',
    description: '搜索互联网获取最新信息',
    source: 'mcp',
    initParams: [
      { name: 'search_engine', type: 'string', required: true, value: 'google', description: '搜索引擎' },
      { name: 'max_results', type: 'number', required: false, value: 5, description: '最大结果数' },
      { name: 'include_images', type: 'number', required: false, value: 0.5, description: '图片比例' },
      { name: 'include_news', type: 'object', required: false, value: {
        "include_news": true,
        "include_videos": false,
        "include_images": false
      } ,description: '新闻比例'},
      { name: 'include_videos', type: 'array', required: false, value: [
        {
          "include_videos": true,
          "include_news": false,
          "include_images": false
        }
      ] ,description: '视频比例'},
    ]
  },
  {
    id: '2',
    name: '文件读写',
    description: '读取和写入本地文件',
    source: 'local',
    initParams: [
      { name: 'base_dir', type: 'string', required: true, value: '/tmp' },
      { name: 'encoding', type: 'string', required: false, value: 'utf-8' }
    ]
  },
  {
    id: '3',
    name: '代码执行',
    description: '执行代码片段并返回结果',
    source: 'local',
    initParams: [
      { name: 'language', type: 'string', required: true, value: 'python' },
      { name: 'timeout', type: 'number', required: false, value: 30 },
      { name: 'memory_limit', type: 'number', required: false, value: 512 }
    ]
  },
  {
    id: '4',
    name: 'API调用',
    description: '调用外部API服务获取数据',
    source: 'mcp',
    initParams: [
      { name: 'api_key', type: 'string', required: true },
      { name: 'base_url', type: 'string', required: true },
      { name: 'headers', type: 'object', required: false },
      { name: 'timeout', type: 'number', required: false, value: 10 }
    ]
  },
  {
    id: '5',
    name: '数据分析',
    description: '分析和处理数据集',
    source: 'local',
    initParams: [
      { name: 'data_format', type: 'string', required: true, value: 'csv' },
      { name: 'column_types', type: 'object', required: false },
      { name: 'sample_size', type: 'number', required: false, value: 1000 }
    ]
  },
  {
    id: '6',
    name: '图像生成',
    description: '根据描述生成图像',
    source: 'mcp',
    initParams: [
      { name: 'model', type: 'string', required: true, value: 'dall-e-3' },
      { name: 'size', type: 'string', required: false, value: '1024x1024' },
      { name: 'quality', type: 'string', required: false, value: 'standard' },
      { name: 'style', type: 'string', required: false, value: 'vivid' }
    ]
  },
  {
    id: '7',
    name: '文档处理',
    description: '处理和解析文档文件',
    source: 'local',
    initParams: [
      { name: 'document_type', type: 'string', required: true, value: 'pdf' },
      { name: 'extract_images', type: 'boolean', required: false, value: true },
      { name: 'extract_tables', type: 'boolean', required: false, value: true }
    ]
  },
  {
    id: '8',
    name: '向量数据库',
    description: '存储和检索嵌入向量',
    source: 'local',
    initParams: [
      { name: 'db_name', type: 'string', required: true, value: 'embeddings' },
      { name: 'embedding_model', type: 'string', required: true, value: 'text-embedding-ada-002' },
      { name: 'dimensions', type: 'number', required: false, value: 1536 }
    ]
  },
  {
    id: '9',
    name: '自然语言处理',
    description: '执行NLP任务如情感分析、实体识别等',
    source: 'mcp',
    initParams: [
      { name: 'task', type: 'string', required: true, value: 'sentiment' },
      { name: 'language', type: 'string', required: false, value: 'zh' },
      { name: 'model', type: 'string', required: false, value: 'default' }
    ]
  },
  {
    id: '10',
    name: '语音转文本',
    description: '将语音转换为文本',
    source: 'mcp',
    initParams: [
      { name: 'language', type: 'string', required: false, value: 'zh' },
      { name: 'audio_format', type: 'string', required: false, value: 'mp3' },
      { name: 'quality', type: 'string', required: false, value: 'high' }
    ]
  },
  {
    id: '11',
    name: '文本转语音',
    description: '将文本转换为语音',
    source: 'mcp',
    initParams: [
      { name: 'voice', type: 'string', required: true, value: 'alloy' },
      { name: 'language', type: 'string', required: false, value: 'zh' },
      { name: 'speed', type: 'number', required: false, value: 1.0 }
    ]
  }
];
// 模拟子代理数据
export const mockAgents: Agent[] = [
  {
    id: '1',
    name: '客服代理',
    description: '处理客户服务和支持请求处理客户服务和支持请求处理客户服务和支持请求处理客户服务和支持请求处理客户服务和支持请求处理客户服务和支持请求',
    model: 'gpt-4-1106-preview',
    max_step: 10,
    provide_run_summary: true,
    tools: mockTools.slice(0, 3),
    prompt: '你是一个专业的客服代理，负责回答用户问题并提供支持。'
  },
  {
    id: '2',
    name: '销售代理',
    description: '处理产品销售和市场营销',
    model: 'gpt-4-0125-preview',
    max_step: 8,
    provide_run_summary: true,
    tools: mockTools.slice(3, 5),
    prompt: '你是一个专业的销售代理，负责推广产品和服务。'
  },
  {
    id: '3',
    name: '研究代理',
    description: '进行数据分析和研究',
    model: 'claude-3-opus-20240229',
    max_step: 15,
    provide_run_summary: false,
    tools: mockTools.slice(4, 7),
    prompt: '你是一个研究代理，需要进行深入的数据分析和研究工作。'
  },
  {
    id: '4',
    name: '技术支持代理',
    description: '提供技术问题解决方案',
    model: 'gpt-4-turbo',
    max_step: 12,
    provide_run_summary: true,
    tools: mockTools.slice(1, 4),
    prompt: '你是一个技术支持代理，负责解决用户遇到的技术问题。'
  }
];
