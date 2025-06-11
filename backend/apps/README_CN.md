# Nexent Community API 文档

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) 
[![简体中文](https://img.shields.io/badge/lang-简体中文-red.svg)](README_CN.md)

本文档提供了 Nexent Community 后端所有 API 端点的全面概述。

## 目录
1. [基础应用](#基础应用)
2. [代理应用](#代理应用)
3. [配置同步应用](#配置同步应用)
4. [会话管理应用](#会话管理应用)
5. [数据处理应用](#数据处理应用)
6. [Elasticsearch 应用](#elasticsearch-应用)
7. [ME 模型管理应用](#me-模型管理应用)
8. [模型管理应用](#模型管理应用)
9. [代理应用](#代理应用)
10. [文件管理应用](#文件管理应用)
11. [语音应用](#语音应用)

## 基础应用

基础应用作为主要的 FastAPI 应用程序，包含所有其他路由器并提供全局异常处理。

### 全局异常处理器
- `HTTPException`: 返回带有错误消息的 JSON 响应
- `Exception`: 返回通用 500 错误响应

## 代理应用

### 端点

#### POST /api/agent/run
执行代理并处理提供的请求。

**请求体：**
```json
{
    "query": "string",
    "history": "array",
    "minio_files": "array"
}
```

**响应：**
- 使用 SSE（服务器发送事件）的流式响应
- 实时返回代理的响应

#### POST /api/agent/reload_config
手动触发配置重新加载。

**响应：**
- 成功/失败状态

## 配置同步应用

### 端点

#### POST /api/config/save_config
将配置保存到环境变量。

**请求体：**
```json
{
    "app": {
        "name": "string",
        "description": "string",
        "icon": {
            "type": "string",
            "avatarUri": "string",
            "customUrl": "string"
        }
    },
    "models": {
        "llm": {
            "name": "string",
            "displayName": "string",
            "apiConfig": {
                "apiKey": "string",
                "modelUrl": "string"
            }
        }
        // ... 其他模型配置
    },
    "data": {
        "selectedKbNames": "array",
        "selectedKbModels": "array",
        "selectedKbSources": "array"
    }
}
```

**响应：**
```json
{
    "message": "配置保存成功",
    "status": "saved"
}
```

#### GET /api/config/load_config
从环境变量加载配置。

**响应：**
```json
{
    "config": {
        "app": {
            "name": "string",
            "description": "string",
            "icon": {
                "type": "string",
                "avatarUri": "string",
                "customUrl": "string"
            }
        },
        "models": {
            "llm": {
                "name": "string",
                "displayName": "string",
                "apiConfig": {
                    "apiKey": "string",
                    "modelUrl": "string"
                }
            }
            // ... 其他模型配置
        },
        "data": {
            "selectedKbNames": ["string"],
            "selectedKbModels": ["string"],
            "selectedKbSources": ["string"]
        }
    }
}
```

## 会话管理应用

### 端点

#### PUT /api/conversation/create
创建新会话。

**请求体：**
```json
{
    "title": "string"
}
```

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "conversation_id": "string",
        "conversation_title": "string",
        "create_time": "number",
        "update_time": "number"
    }
}
```

#### GET /api/conversation/list
获取所有会话。

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": [
        {
            "conversation_id": "string",
            "conversation_title": "string",
            "create_time": "number",
            "update_time": "number"
        }
    ]
}
```

#### POST /api/conversation/rename
重命名会话。

**请求体：**
```json
{
    "conversation_id": "number",
    "name": "string"
}
```

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

#### DELETE /api/conversation/{conversation_id}
删除会话。

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

#### GET /api/conversation/{conversation_id}
获取会话历史。

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "conversation_id": "string",
        "create_time": "number",
        "message": [
            {
                "role": "string",
                "message": "array",
                "message_id": "string",
                "opinion_flag": "string",
                "picture": "array",
                "search": "array"
            }
        ]
    }
}
```

#### POST /api/conversation/sources
获取消息源信息。

**请求体：**
```json
{
    "conversation_id": "number",
    "message_id": "string",
    "type": "string"
}
```

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "searches": [
            {
                "title": "string",
                "text": "string",
                "source_type": "string",
                "url": "string",
                "filename": "string",
                "published_date": "string",
                "score": "number",
                "score_details": {
                    "accuracy": "number",
                    "semantic": "number"
                }
            }
        ],
        "images": ["string"]
    }
}
```

#### POST /api/conversation/generate_title
生成会话标题。

**请求体：**
```json
{
    "conversation_id": "number",
    "history": [
        {
            "role": "string",
            "content": "string"
        }
    ]
}
```

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": "string"
}
```

#### POST /api/conversation/message/update_opinion
更新消息点赞/踩状态。

**请求体：**
```json
{
    "message_id": "string",
    "opinion": "string"
}
```

**响应：**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

## 数据处理应用

### 端点

#### POST /api/tasks
创建新的数据处理任务。

**请求体：**
```json
{
    "source": "string",
    "source_type": "string",
    "chunking_strategy": "string",
    "index_name": "string",
    "additional_params": {
        "key": "value"
    }
}
```

**响应：**
```json
{
    "task_id": "string"
}
```

#### POST /api/tasks/batch
创建批量数据处理任务。

**请求体：**
```json
{
    "sources": [
        {
            "source": "string",
            "source_type": "string",
            "chunking_strategy": "string",
            "index_name": "string",
            "additional_params": {
                "key": "value"
            }
        }
    ]
}
```

**响应：**
```json
{
    "task_ids": ["string"]
}
```

#### GET /api/tasks/{task_id}
获取任务状态。

**响应：**
```json
{
    "id": "string",
    "status": "string",
    "created_at": "string",
    "updated_at": "string",
    "error": "string"
}
```

#### GET /api/tasks
列出所有任务。

**响应：**
```json
{
    "tasks": [
        {
            "id": "string",
            "status": "string",
            "created_at": "string",
            "updated_at": "string",
            "error": "string"
        }
    ]
}
```

#### GET /api/tasks/indices/{index_name}/tasks
获取特定索引的所有活动任务。

**响应：**
```json
{
    "index_name": "string",
    "files": [
        {
            "path_or_url": "string",
            "status": "string"
        }
    ]
}
```

#### GET /api/tasks/{task_id}/details
获取任务状态和结果。

**响应：**
```json
{
    "id": "string",
    "status": "string",
    "created_at": "string",
    "updated_at": "string",
    "error": "string",
    "results": "object"
}
```

## Elasticsearch 应用

### 端点

#### POST /api/indices/{index_name}
创建新的向量索引。

**参数：**
- `index_name`: 索引名称
- `embedding_dim`: 可选的嵌入向量维度

**响应：**
```json
{
    "status": "success",
    "message": "string",
    "embedding_dim": "number"
}
```

#### DELETE /api/indices/{index_name}
删除索引。

**响应：**
```json
{
    "status": "success",
    "message": "string"
}
```

#### GET /api/indices
列出所有索引。

**参数：**
- `pattern`: 匹配索引名称的模式
- `include_stats`: 是否包含索引统计信息

**响应：**
```json
{
    "indices": ["string"],
    "count": "number",
    "indices_info": [
        {
            "name": "string",
            "stats": {
                "docs": "number",
                "size": "string"
            }
        }
    ]
}
```

#### GET /api/indices/{index_name}/info
获取索引信息。

**参数：**
- `include_files`: 是否包含文件列表
- `include_chunks`: 是否包含文本块

**响应：**
```json
{
    "base_info": {
        "docs": "number",
        "size": "string"
    },
    "search_performance": {
        "query_time": "number",
        "hits": "number"
    },
    "fields": {
        "field_name": {
            "type": "string"
        }
    },
    "files": [
        {
            "path_or_url": "string",
            "file": "string",
            "file_size": "number",
            "create_time": "string",
            "status": "string",
            "chunks": [
                {
                    "id": "string",
                    "title": "string",
                    "content": "string",
                    "create_time": "string"
                }
            ],
            "chunks_count": "number"
        }
    ]
}
```

#### POST /api/indices/{index_name}/documents
索引文档。

**请求体：**
```json
{
    "task_id": "string",
    "results": [
        {
            "metadata": {
                "filename": "string",
                "title": "string",
                "languages": ["string"],
                "author": "string",
                "date": "string",
                "file_size": "number",
                "creation_date": "string"
            },
            "source": "string",
            "text": "string",
            "source_type": "string"
        }
    ]
}
```

**响应：**
```json
{
    "success": true,
    "message": "string",
    "total_indexed": "number",
    "total_submitted": "number"
}
```

#### DELETE /api/indices/{index_name}/documents
删除文档。

**请求体：**
```json
{
    "path_or_url": "string"
}
```

**响应：**
```json
{
    "status": "success",
    "deleted_count": "number"
}
```

#### POST /api/indices/search/accurate
执行精确搜索。

**请求体：**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number"
}
```

**响应：**
```json
{
    "results": [
        {
            "id": "string",
            "title": "string",
            "content": "string",
            "score": "number",
            "index": "string"
        }
    ],
    "total": "number",
    "query_time_ms": "number"
}
```

#### POST /api/indices/search/semantic
执行语义搜索。

**请求体：**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number"
}
```

**响应：**
```json
{
    "results": [
        {
            "id": "string",
            "title": "string",
            "content": "string",
            "score": "number",
            "index": "string"
        }
    ],
    "total": "number",
    "query_time_ms": "number"
}
```

#### POST /api/indices/search/hybrid
执行混合搜索。

**请求体：**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number",
    "weight_accurate": "number"
}
```

**响应：**
```json
{
    "results": [
        {
            "id": "string",
            "title": "string",
            "content": "string",
            "score": "number",
            "index": "string",
            "score_details": {
                "accurate": "number",
                "semantic": "number"
            }
        }
    ],
    "total": "number",
    "query_time_ms": "number"
}
```

#### GET /api/indices/health
检查 API 和 Elasticsearch 健康状态。

**响应：**
```json
{
    "status": "healthy",
    "elasticsearch": "connected",
    "indices_count": "number"
}
```

## ME 模型管理应用

### 端点

#### GET /api/me/model/list
获取 ME 模型列表。

**请求体：**
```json
{
    "type": "string",
    "timeout": "number"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Successfully retrieved",
    "data": [
        {
            "id": "string",
            "name": "string",
            "type": "string",
            "description": "string"
        }
    ]
}
```

#### GET /api/me/healthcheck
检查 ME 模型连接性。

**请求体：**
```json
{
    "timeout": "number"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Connection successful",
    "data": {
        "status": "Connected",
        "desc": "Connection successful",
        "connect_status": "AVAILABLE"
    }
}
```

#### GET /api/me/model/healthcheck
检查特定模型健康状态。

**请求体：**
```json
{
    "model_name": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Model health check successful",
    "data": {
        "status": "string",
        "desc": "string",
        "connect_status": "string"
    }
}
```

## 模型管理应用

### 端点

#### POST /api/model/create
创建新模型。

**请求体：**
```json
{
    "model_name": "string",
    "display_name": "string",
    "connect_status": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Model created successfully",
    "data": null
}
```

#### POST /api/model/update
更新模型。

**请求体：**
```json
{
    "model_name": "string",
    "display_name": "string",
    "connect_status": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Model updated successfully",
    "data": {
        "model_name": "string"
    }
}
```

#### POST /api/model/delete
删除模型。

**请求体：**
```json
{
    "model_name": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Model deleted successfully",
    "data": {
        "model_name": "string"
    }
}
```

#### GET /api/model/list
获取所有模型。

**响应：**
```json
{
    "code": 200,
    "message": "Successfully retrieved model list",
    "data": [
        {
            "model_id": "string",
            "model_name": "string",
            "model_repo": "string",
            "display_name": "string",
            "connect_status": "string"
        }
    ]
}
```

#### GET /api/model/healthcheck
检查模型健康状态。

**请求体：**
```json
{
    "model_name": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Model health check successful",
    "data": {
        "status": "string",
        "desc": "string",
        "connect_status": "string"
    }
}
```

#### GET /api/model/get_connect_status
获取模型连接状态。

**请求体：**
```json
{
    "model_name": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Successfully retrieved connection status",
    "data": {
        "model_name": "string",
        "connect_status": "string"
    }
}
```

#### POST /api/model/update_connect_status
更新模型连接状态。

**请求体：**
```json
{
    "model_name": "string",
    "connect_status": "string"
}
```

**响应：**
```json
{
    "code": 200,
    "message": "Successfully updated connection status",
    "data": {
        "model_name": "string",
        "connect_status": "string"
    }
}
```

## 代理应用

### 端点

#### GET /api/proxy/image
代理远程图片。

**请求体：**
```json
{
    "url": "string"
}
```

**响应：**
```json
{
    "success": true,
    "base64": "string",
    "content_type": "string"
}
```

## 文件管理应用

### 端点

#### POST /api/file/upload
上传文件。

**请求体：**
```json
{
    "file": ["file"],
    "chunking_strategy": "string",
    "index_name": "string"
}
```

**响应：**
```json
{
    "message": "string",
    "uploaded_files": ["string"],
    "process_tasks": {
        "task_id": "string"
    }
}
```

#### POST /api/file/storage
上传文件到存储。

**请求体：**
```json
{
    "files": ["file"],
    "folder": "string"
}
```

**响应：**
```json
{
    "message": "string",
    "success_count": "number",
    "failed_count": "number",
    "results": [
        {
            "success": true,
            "file_name": "string",
            "url": "string"
        }
    ]
}
```

#### GET /api/file/storage
获取存储文件。

**请求体：**
```json
{
    "prefix": "string",
    "limit": "number",
    "include_urls": true
}
```

**响应：**
```json
{
    "total": "number",
    "files": [
        {
            "name": "string",
            "size": "number",
            "url": "string"
        }
    ]
}
```

#### GET /api/file/storage/{object_name}
获取存储文件。

**请求体：**
```json
{
    "download": true,
    "expires": "number"
}
```

**响应：**
```json
{
    "success": true,
    "url": "string",
    "expires": "string"
}
```

#### DELETE /api/file/storage/{object_name}
删除存储文件。

**响应：**
```json
{
    "success": true,
    "message": "string"
}
```

#### POST /api/file/storage/batch-urls
获取批量文件 URL。

**请求体：**
```json
{
    "object_names": ["string"],
    "expires": "number"
}
```

**响应：**
```json
{
    "urls": [
        {
            "object_name": "string",
            "success": true,
            "url": "string"
        }
    ]
}
```

#### POST /api/file/preprocess
预处理代理文件。

**请求体：**
```json
{
    "query": "string",
    "files": ["file"]
}
```

**响应：**
- 使用 SSE（服务器发送事件）的流式响应
- 实时返回处理的内容

## 语音应用

### 端点

#### WebSocket /api/voice/stt/ws
实时语音转文字流。

**输入：**
- 音频流

**输出：**
- 文字流

#### WebSocket /api/voice/tts/ws
实时文字转语音流。

**输入：**
```json
{
    "text": "string"
}
```

**输出：**
- 音频流

## 依赖项

应用程序具有以下依赖项：

1. 基础应用：
   - 所有其他应用路由器

2. 代理应用：
   - 代理工具
   - 会话管理服务

3. 配置同步应用：
   - python-dotenv
   - 配置工具

4. 会话管理应用：
   - 会话数据库
   - 会话管理工具

5. 数据处理应用：
   - 数据处理核心
   - 任务状态工具

6. Elasticsearch 应用：
   - Elasticsearch 核心
   - 嵌入模型
   - 数据处理服务

7. ME 模型管理应用：
   - Requests
   - 模型健康服务

8. 模型管理应用：
   - 模型管理数据库
   - 模型健康服务
   - 模型名称工具

9. 代理应用：
   - aiohttp
   - 图像过滤工具

10. 文件管理应用：
    - 文件管理工具
    - 附件数据库
    - 数据处理服务

11. 语音应用：
    - STT 模型
    - TTS 模型
    - WebSocket 支持 