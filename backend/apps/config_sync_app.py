import json
import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from consts.model import GlobalConfig
from utils.config_utils import config_manager, get_env_key, safe_value, safe_list

router = APIRouter(prefix="/config")

# Get logger instance
logger = logging.getLogger("app config")

@router.post("/save_config")
async def save_config(config: GlobalConfig):
    try:
        config_dict = config.model_dump(exclude_none=False)
        env_config = {}

        # Process app configuration - use key names directly without prefix
        for key, value in config_dict.get("app", {}).items():
            env_key = get_env_key(key)
            env_config[env_key] = safe_value(value)

        # Process model configuration
        for model_type, model_config in config_dict.get("models", {}).items():
            if not model_config:
                continue

            model_prefix = get_env_key(model_type)

            # Process basic model attributes
            for key, value in model_config.items():
                if key == "apiConfig":
                    # Process API configuration - use model name as prefix directly, without API_
                    api_config = value or {}
                    if api_config:
                        for api_key, api_value in api_config.items():
                            env_key = f"{model_prefix}_{get_env_key(api_key)}"
                            env_config[env_key] = safe_value(api_value)
                    else:
                        # Set default empty values
                        env_config[f"{model_prefix}_API_KEY"] = ""
                        env_config[f"{model_prefix}_MODEL_URL"] = ""
                else:
                    env_key = f"{model_prefix}_{get_env_key(key)}"
                    env_config[env_key] = safe_value(value)
            
            # Only store dimension for embedding or multiEmbedding models
            if model_type in ["embedding", "multiEmbedding"] and model_config.get("dimension") is not None:
                env_key = f"{model_prefix}_DIMENSION"
                env_config[env_key] = safe_value(model_config.get("dimension"))

        # Process knowledge base configuration - use key names directly without prefix, store lists in JSON format
        for key, value in config_dict.get("data", {}).items():
            env_key = get_env_key(key)
            if isinstance(value, list):
                env_config[env_key] = safe_list(value)
            else:
                env_config[env_key] = safe_value(value)

        # Batch update environment variables
        for key, value in env_config.items():
            config_manager.set_config(key, value)

        logger.info("Configuration saved successfully")
        return JSONResponse(
            status_code=200,
            content={"message": "Configuration saved successfully", "status": "saved"}
        )
    except Exception as e:
        logger.error(f"Failed to save configuration: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"message": f"Failed to save configuration: {str(e)}", "status": "unsaved"}
        )


@router.get("/load_config")
async def load_config():
    """
    Load configuration from environment variables
    
    Returns:
        JSONResponse: JSON object containing configuration content
    """
    try:
        # Build configuration object
        # TODO: Clean up the default values
        config = {
            "app": {
                "name": config_manager.get_config("APP_NAME", "Nexent 智能体"),
                "description": config_manager.get_config("APP_DESCRIPTION", "Nexent 是一个开源智能体SDK和平台，能够将单一提示词转化为完整的多模态服务 —— 无需编排，无需复杂拖拉拽。基于 MCP 工具生态系统构建，Nexent 提供灵活的模型集成、可扩展的数据处理和强大的知识库管理。我们的目标很简单：将数据、模型和工具整合到一个智能中心中，让任何人都能轻松地将 Nexent 集成到项目中，使日常工作流程更智能、更互联。"),
                "icon": {
                    "type": config_manager.get_config("ICON_TYPE", "preset"),
                    "avatarUri": config_manager.get_config("AVATAR_URI", ""),
                    "customUrl": config_manager.get_config("CUSTOM_ICON_URL", "")
                }
            },
            "models": {
                "llm": {
                    "name": config_manager.get_config("LLM_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("LLM_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("LLM_API_KEY", ""),
                        "modelUrl": config_manager.get_config("LLM_MODEL_URL", "")
                    }
                },
                "llmSecondary": {
                    "name": config_manager.get_config("LLM_SECONDARY_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("LLM_SECONDARY_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("LLM_SECONDARY_API_KEY", ""),
                        "modelUrl": config_manager.get_config("LLM_SECONDARY_MODEL_URL", "")
                    }
                },
                "embedding": {
                    "name": config_manager.get_config("EMBEDDING_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("EMBEDDING_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("EMBEDDING_API_KEY", ""),
                        "modelUrl": config_manager.get_config("EMBEDDING_MODEL_URL", "")
                    },
                    "dimension": int(config_manager.get_config("EMBEDDING_DIMENSION", "0")) or None
                },
                "multiEmbedding": {
                    "name": config_manager.get_config("MULTI_EMBEDDING_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("MULTI_EMBEDDING_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("MULTI_EMBEDDING_API_KEY", ""),
                        "modelUrl": config_manager.get_config("MULTI_EMBEDDING_MODEL_URL", "")
                    },
                    "dimension": int(config_manager.get_config("MULTI_EMBEDDING_DIMENSION", "0")) or None
                },
                "rerank": {
                    "name": config_manager.get_config("RERANK_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("RERANK_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("RERANK_API_KEY", ""),
                        "modelUrl": config_manager.get_config("RERANK_MODEL_URL", "")
                    }
                },
                "vlm": {
                    "name": config_manager.get_config("VLM_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("VLM_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("VLM_API_KEY", ""),
                        "modelUrl": config_manager.get_config("VLM_MODEL_URL", "")
                    }
                },
                "stt": {
                    "name": config_manager.get_config("STT_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("STT_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("STT_API_KEY", ""),
                        "modelUrl": config_manager.get_config("STT_MODEL_URL", "")
                    }
                },
                "tts": {
                    "name": config_manager.get_config("TTS_MODEL_NAME", ""),
                    "displayName": config_manager.get_config("TTS_DISPLAY_NAME", ""),
                    "apiConfig": {
                        "apiKey": config_manager.get_config("TTS_API_KEY", ""),
                        "modelUrl": config_manager.get_config("TTS_MODEL_URL", "")
                    }
                }
            },
            "data": {
                "selectedKbNames": json.loads(config_manager.get_config("SELECTED_KB_NAMES", "[]")),
                "selectedKbModels": json.loads(config_manager.get_config("SELECTED_KB_MODELS", "[]")),
                "selectedKbSources": json.loads(config_manager.get_config("SELECTED_KB_SOURCES", "[]"))
            }
        }

        return JSONResponse(
            status_code=200,
            content={"config": config}
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"message": f"Failed to load configuration: {str(e)}", "status": "error"}
        )

