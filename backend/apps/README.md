# Nexent Community API Documentation

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.md) 
[![简体中文](https://img.shields.io/badge/lang-简体中文-red.svg)](README_CN.md)

This document provides a comprehensive overview of all API endpoints available in the Nexent Community backend.

## Table of Contents
1. [Base App](#base-app)
2. [Agent App](#agent-app)
3. [Config Sync App](#config-sync-app)
4. [Conversation Management App](#conversation-management-app)
5. [Data Process App](#data-process-app)
6. [Elasticsearch App](#elasticsearch-app)
7. [ME Model Management App](#me-model-management-app)
8. [Model Management App](#model-management-app)
9. [Proxy App](#proxy-app)
10. [File Management App](#file-management-app)
11. [Voice App](#voice-app)

## Base App

The base app serves as the main FastAPI application that includes all other routers and provides global exception handling.

### Global Exception Handlers
- `HTTPException`: Returns JSON response with error message
- `Exception`: Returns generic 500 error response

## Agent App

### Endpoints

#### POST /api/agent/run
Executes an agent with the provided request.

**Request Body:**
```json
{
    "query": "string",
    "history": "array",
    "minio_files": "array"
}
```

**Response:**
- Streaming response with SSE (Server-Sent Events)
- Returns agent's responses in real-time

#### POST /api/agent/reload_config
Manually triggers configuration reload.

**Response:**
- Success/failure status

## Config Sync App

### Endpoints

#### POST /api/config/save_config
Saves configuration to environment variables.

**Request Body:**
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
        },
        // ... other model configurations
    },
    "data": {
        "selectedKbNames": "array",
        "selectedKbModels": "array",
        "selectedKbSources": "array"
    }
}
```

**Response:**
```json
{
    "message": "Configuration saved successfully",
    "status": "saved"
}
```

#### GET /api/config/load_config
Loads configuration from environment variables.

**Response:**
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
            },
            // ... other model configurations
        },
        "data": {
            "selectedKbNames": ["string"],
            "selectedKbModels": ["string"],
            "selectedKbSources": ["string"]
        }
    }
}
```

## Conversation Management App

### Endpoints

#### PUT /api/conversation/create
Creates a new conversation.

**Request Body:**
```json
{
    "title": "string"
}
```

**Response:**
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
Gets all conversations.

**Response:**
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
Renames a conversation.

**Request Body:**
```json
{
    "conversation_id": "number",
    "name": "string"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

#### DELETE /api/conversation/{conversation_id}
Deletes a conversation.

**Response:**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

#### GET /api/conversation/{conversation_id}
Gets conversation history.

**Response:**
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
Gets message source information.

**Request Body:**
```json
{
    "conversation_id": "number",
    "message_id": "string",
    "type": "string"
}
```

**Response:**
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
Generates conversation title.

**Request Body:**
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

**Response:**
```json
{
    "code": 0,
    "message": "success",
    "data": "string"
}
```

#### POST /api/conversation/message/update_opinion
Updates message like/dislike status.

**Request Body:**
```json
{
    "message_id": "string",
    "opinion": "string"
}
```

**Response:**
```json
{
    "code": 0,
    "message": "success",
    "data": true
}
```

## Data Process App

### Endpoints

#### POST /api/tasks
Creates a new data processing task.

**Request Body:**
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

**Response:**
```json
{
    "task_id": "string"
}
```

#### POST /api/tasks/batch
Creates a batch of data processing tasks.

**Request Body:**
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

**Response:**
```json
{
    "task_ids": ["string"]
}
```

#### GET /api/tasks/{task_id}
Gets task status.

**Response:**
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
Lists all tasks.

**Response:**
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
Gets all active tasks for a specific index.

**Response:**
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
Gets task status and results.

**Response:**
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

## Elasticsearch App

### Endpoints

#### POST /api/indices/{index_name}
Creates a new vector index.

**Parameters:**
- `index_name`: Name of the index
- `embedding_dim`: Optional dimension of embedding vectors

**Response:**
```json
{
    "status": "success",
    "message": "string",
    "embedding_dim": "number"
}
```

#### DELETE /api/indices/{index_name}
Deletes an index.

**Response:**
```json
{
    "status": "success",
    "message": "string"
}
```

#### GET /api/indices
Lists all indices.

**Parameters:**
- `pattern`: Pattern to match index names
- `include_stats`: Whether to include index stats

**Response:**
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
Gets index information.

**Parameters:**
- `include_files`: Whether to include file list
- `include_chunks`: Whether to include text chunks

**Response:**
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
Indexes documents.

**Request Body:**
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

**Response:**
```json
{
    "success": true,
    "message": "string",
    "total_indexed": "number",
    "total_submitted": "number"
}
```

#### DELETE /api/indices/{index_name}/documents
Deletes documents.

**Request Body:**
```json
{
    "path_or_url": "string"
}
```

**Response:**
```json
{
    "status": "success",
    "deleted_count": "number"
}
```

#### POST /api/indices/search/accurate
Performs accurate search.

**Request Body:**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number"
}
```

**Response:**
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
Performs semantic search.

**Request Body:**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number"
}
```

**Response:**
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
Performs hybrid search.

**Request Body:**
```json
{
    "query": "string",
    "index_names": ["string"],
    "top_k": "number",
    "weight_accurate": "number"
}
```

**Response:**
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
Checks API and Elasticsearch health.

**Response:**
```json
{
    "status": "healthy",
    "elasticsearch": "connected",
    "indices_count": "number"
}
```

## ME Model Management App

### Endpoints

#### GET /api/me/model/list
Gets list of ME models.

**Request Body:**
```json
{
    "type": "string",
    "timeout": "number"
}
```

**Response:**
```json
{
    "code": 200,
    "message": "Successfully retrieved",
    "data": [
        {
            // TODO: Definition
            "id": "string",
            "name": "string",
            "type": "string",
            "description": "string"
        }
    ]
}
```

#### GET /api/me/healthcheck
Checks ME model connectivity.

**Request Body:**
```json
{
    "timeout": "number"
}
```

**Response:**
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
Checks specific model health.

**Request Body:**
```json
{
    "model_name": "string"
}
```

**Response:**
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

## Model Management App

### Endpoints

#### POST /api/model/create
Creates a new model.

**Request Body:**
```json
{
    "model_name": "string",
    "display_name": "string",
    "connect_status": "string"
}
```

**Response:**
```json
{
    "code": 200,
    "message": "Model created successfully",
    "data": null
}
```

#### POST /api/model/update
Updates a model.

**Request Body:**
```json
{
    "model_name": "string",
    "display_name": "string",
    "connect_status": "string"
}
```

**Response:**
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
Deletes a model.

**Request Body:**
```json
{
    "model_name": "string"
}
```

**Response:**
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
Gets all models.

**Response:**
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
Checks model health.

**Request Body:**
```json
{
    "model_name": "string"
}
```

**Response:**
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
Gets model connection status.

**Request Body:**
```json
{
    "model_name": "string"
}
```

**Response:**
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
Updates model connection status.

**Request Body:**
```json
{
    "model_name": "string",
    "connect_status": "string"
}
```

**Response:**
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

## Proxy App

### Endpoints

#### GET /api/proxy/image
Proxies remote images.

**Request Body:**
```json
{
    "url": "string"
}
```

**Response:**
```json
{
    "success": true,
    "base64": "string",
    "content_type": "string"
}
```

## File Management App

### Endpoints

#### POST /api/file/upload
Uploads files.

**Request Body:**
```json
{
    "file": ["file"],
    "chunking_strategy": "string",
    "index_name": "string"
}
```

**Response:**
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
Uploads files to storage.

**Request Body:**
```json
{
    "files": ["file"],
    "folder": "string"
}
```

**Response:**
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
Gets storage files.

**Request Body:**
```json
{
    "prefix": "string",
    "limit": "number",
    "include_urls": true
}
```

**Response:**
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
Gets storage file.

**Request Body:**
```json
{
    "download": true,
    "expires": "number"
}
```

**Response:**
```json
{
    "success": true,
    "url": "string",
    "expires": "string"
}
```

#### DELETE /api/file/storage/{object_name}
Deletes storage file.

**Response:**
```json
{
    "success": true,
    "message": "string"
}
```

#### POST /api/file/storage/batch-urls
Gets batch file URLs.

**Request Body:**
```json
{
    "object_names": ["string"],
    "expires": "number"
}
```

**Response:**
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
Preprocesses files for agent.

**Request Body:**
```json
{
    "query": "string",
    "files": ["file"]
}
```

**Response:**
- Streaming response with SSE (Server-Sent Events)
- Returns processed content in real-time

## Voice App

### Endpoints

#### WebSocket /api/voice/stt/ws
Real-time speech-to-text streaming.

**Input:**
- Audio stream

**Output:**
- Text stream

#### WebSocket /api/voice/tts/ws
Real-time text-to-speech streaming.

**Input:**
```json
{
    "text": "string"
}
```

**Output:**
- Audio stream

## Dependencies

The apps have the following dependencies:

1. Base App:
   - All other app routers

2. Agent App:
   - Agent utilities
   - Conversation management service

3. Config Sync App:
   - python-dotenv
   - Configuration utilities

4. Conversation Management App:
   - Conversation database
   - Conversation management utilities

5. Data Process App:
   - Data process core
   - Task status utilities

6. Elasticsearch App:
   - Elasticsearch core
   - Embedding model
   - Data process service

7. ME Model Management App:
   - Requests
   - Model health service

8. Model Management App:
   - Model management database
   - Model health service
   - Model name utilities

9. Proxy App:
   - aiohttp
   - Image filter utilities

10. File Management App:
    - File management utilities
    - Attachment database
    - Data process service

11. Voice App:
    - STT model
    - TTS model
    - WebSocket support
